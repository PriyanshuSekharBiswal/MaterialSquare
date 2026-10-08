import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './admin.css';
import { confirmAdminAction } from './components/confirmAdminAction';

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
  if (path.endsWith("/auth/staff/login") || requestUrl.searchParams.get("mode") === "autosave")
    return null;
  // These actions already show a detailed confirmation with the affected record name.
  if (
    (method === "DELETE" && (/\/admin\/staff\/[^/]+$/.test(path) || /\/products\/catalogue\/[^/]+$/.test(path) || /\/suppliers\/[^/]+$/.test(path) || /\/suppliers\/[^/]+\/products\/[^/]+$/.test(path))) ||
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
      "This marks the full order total as paid after staff has received payment outside this website. No payment is collected or verified here.";
    confirmLabel = "Mark order paid";
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

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const confirmation = adminMutationConfirmation(input, init);
  if (confirmation && !(await confirmAdminAction(confirmation)))
    throw new DOMException("No changes were made.", "AbortError");
  return originalFetch(input, init);
}) as typeof window.fetch;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
