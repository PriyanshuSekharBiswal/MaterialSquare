import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './admin.css';
import { confirmAdminAction } from './components/confirmAdminAction';
import { installScrollPositionPersistence, restoreInitialScrollPosition } from './scroll-position';
import { installUnsavedChangesGuard, runAdminAction } from './unsaved-changes';
import { AdminAuthProvider } from './context/AdminAuthContext';

const apiUrl = new URL(import.meta.env.VITE_API_URL || "/api", window.location.href);
const apiBasePath = apiUrl.pathname.replace(/\/$/, "");
const originalFetch = window.fetch.bind(window);

function adminMutationConfirmation(input: RequestInfo | URL, init?: RequestInit) {
  const requestUrl = new URL(
    typeof input === "string" || input instanceof URL ? input.toString() : input.url,
    window.location.href,
  );
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method) || requestUrl.origin !== apiUrl.origin)
    return null;
  if (apiBasePath && !requestUrl.pathname.startsWith(`${apiBasePath}/`) && requestUrl.pathname !== apiBasePath)
    return null;

  const path = requestUrl.pathname;
  if (
    path.endsWith("/auth/staff/login") ||
    path.endsWith("/auth/staff/logout") ||
    requestUrl.searchParams.get("mode") === "autosave"
  )
    return null;
  // The website editor presents a focused confirmation before publish/discard.
  // Avoid stacking the generic workspace confirmation on top of those dialogs.
  if (
    (method === "POST" && /\/admin\/site-content\/publish$/.test(path)) ||
    (method === "DELETE" && /\/admin\/site-content\/draft$/.test(path))
  ) return null;
  // These actions already show a detailed confirmation with the affected record name.
  if (
    (method === "DELETE" && (/\/admin\/staff\/[^/]+$/.test(path) || /\/products\/catalogue\/[^/]+$/.test(path) || /\/suppliers\/[^/]+$/.test(path) || /\/suppliers\/[^/]+\/products\/[^/]+$/.test(path))) ||
    (method === "DELETE" && /\/discount-rules\/[^/]+$/.test(path)) ||
    (method === "POST" && /\/admin\/recently-deleted\/[^/]+\/restore$/.test(path)) ||
    /\/admin\/staff\/[^/]+\/password$/.test(path)
  ) return null;

  let title = "Review this change";
  let message = "Confirm that you want to save this change to the admin workspace.";
  let confirmLabel = "Save changes";
  let tone: "default" | "danger" = "default";
  if (path.endsWith("/auth/staff/me/password")) {
    title = "Change your password?";
    message = "Your other active sessions will be signed out. This browser will stay signed in.";
    confirmLabel = "Change password";
  } else if (/\/admin\/staff\/?$/.test(path) && method === "POST") {
    title = "Create this staff account?";
    message = "The new account will be able to sign in with the details you entered.";
    confirmLabel = "Create account";
  } else if (/\/site-content\/publish$/.test(path)) {
    title = "Publish these website changes?";
    message = "Visitors will see the updated content on the live website.";
    confirmLabel = "Publish changes";
  } else if (/\/site-content\/draft(?:\/restore\/[^/]+)?$/.test(path)) {
    title = "Save this website draft?";
    message = "This saves the draft in the editor. It will not publish it to visitors.";
    confirmLabel = "Save draft";
  } else if (/\/storage\/images$/.test(path)) {
    title = "Upload this image?";
    message = "The image will be added to the website media library.";
    confirmLabel = "Upload image";
  } else if (
    method === "PATCH" &&
    /\/orders\/[^/]+\/manual-payment$/.test(path)
  ) {
    title = "Record this offline payment?";
    message =
      "This records an amount that staff has received outside this website. No payment is collected or verified here.";
    confirmLabel = "Record payment";
  } else if (method === "DELETE") {
    title = "Delete this item?";
    message = "You can review this action before it is completed.";
    confirmLabel = "Continue";
    tone = "danger";
  } else if (/\/restore$/.test(path)) {
    title = "Restore this item?";
    message = "The item will become available in the workspace again.";
    confirmLabel = "Restore item";
  } else if (method === "POST") {
    title = "Apply this change?";
    message = "Review the action before it is saved to the workspace.";
    confirmLabel = "Continue";
  } else if (method === "PATCH" || method === "PUT") {
    title = "Save these changes?";
    message = "Your updates will be saved to the admin workspace.";
    confirmLabel = "Save changes";
  }
  return { title, message, confirmLabel, tone };
}

function fetchAdminRequest(input: RequestInfo | URL, init?: RequestInit) {
  const requestUrl = new URL(
    typeof input === "string" || input instanceof URL ? input.toString() : input.url,
    window.location.href,
  );
  const isApiRequest =
    requestUrl.origin === apiUrl.origin &&
    (!apiBasePath ||
      requestUrl.pathname === apiBasePath ||
      requestUrl.pathname.startsWith(`${apiBasePath}/`));
  if (!isApiRequest) return originalFetch(input, init);

  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
  // Staff credentials are HttpOnly cookies. Legacy feature components still
  // pass a token-shaped UI marker; never send it as a bearer credential.
  headers.delete("Authorization");
  return originalFetch(
    input,
    { ...init, headers, credentials: init?.credentials || "include" },
  );
}

installScrollPositionPersistence();
installUnsavedChangesGuard();

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  const form = isMutation && document.activeElement instanceof Element
    ? document.activeElement.closest("form")
    : null;
  const confirmation = adminMutationConfirmation(input, init);
  if (confirmation && !(await confirmAdminAction(confirmation)))
    throw new DOMException("No changes were made.", "AbortError");
  const apiRequest = () => fetchAdminRequest(input, init);
  if (!isMutation) return apiRequest();
  return runAdminAction(
    form,
    apiRequest,
    (response) => response instanceof Response && response.ok,
  );
}) as typeof window.fetch;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AdminAuthProvider>
      <App />
    </AdminAuthProvider>
  </React.StrictMode>
);
restoreInitialScrollPosition();
