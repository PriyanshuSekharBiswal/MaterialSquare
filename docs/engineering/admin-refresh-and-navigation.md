# Admin refresh and navigation behavior

Admin screens should preserve the view a staff member is using and protect active work from accidental refreshes.

## Navigation and scroll position

- Put the active top-level workspace and any selected sub-section in the URL so a reload can render the same page.
- If a screen has an open detail or editor view, include its stable record identifier and view mode in the URL (or another reload-safe state store).
- Keep meaningful filters, selections, and tabs in query parameters when refreshing should retain them.
- When a screen loads data for a selected sub-section, report readiness to the shared scroll-restoration gate. Restore the saved viewport only after that screen's content has loaded and layout has settled.
- Keep URL state synchronized on browser Back/Forward as well as on clicks; a URL that changes only after a refresh is not sufficient.
- Let the shared scroll-position persistence restore the viewport after the page data and layout are ready. Do not add page-specific `scrollTo(0)` behavior for query-only changes.

## Unsaved work

- Normal form edits are tracked centrally by the admin app. The browser's native refresh/close confirmation appears when a form has unsaved edits or an admin mutation is still in progress.
- Add `data-admin-unsaved-form` to a form that represents an active add/edit/draft session. This also protects a newly opened editor before its first field changes.
- For custom editors that do not use a `<form>`, integrate them with the shared unsaved-change guard before shipping. Do not create a page-specific refresh dialog.
- Successful API saves clear the active form's guard. Failed saves leave the warning active.
- Browsers control the wording and buttons in a `beforeunload` confirmation. Keep the message generic in code; do not rely on custom text being displayed.

## Storefront interactions

- Query-only changes for in-page choices, such as product variants, must not reset scroll position.
- Route changes may start at the top, while browser refreshes restore the prior scroll position after page content is ready.
