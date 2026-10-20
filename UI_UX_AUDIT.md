# Application-Wide UI/UX Audit

## Scope

This is a source-based audit of the storefront, customer account, admin workspace, nested work areas, shared UI and their styles. Findings are tied to implemented component/style patterns. Implementation is approved and underway. Runtime visual checks at 320, 375, 768, 1024, 1280, 1440 and 1920 px are recorded incrementally; this report does not claim every route or state has been verified.

Severity reflects user impact and breadth: **Critical** blocks core use or causes serious data risk; **High** affects accessibility or a core workflow across multiple pages; **Medium** creates meaningful inconsistency or friction; **Low** is a localized polish or clarity issue.

## Findings

### 1. Brand orange needs consistent use and readable button text

- **Severity:** High
- **Area:** Shared
- **Page/component:** Storefront and admin primary buttons, account primary actions, active controls
- **Problem:** Storefront colors had diverged from the supplied logo orange, active tab labels were inconsistent, and the hero/section color treatment needed a coherent brand pass.
- **Current behavior:** Shared storefront, account, product and admin action tokens use `#ea580c` with `#c2410c` hover. Filled controls audited so far retain white foregrounds; remaining module-specific states are tracked as they are reviewed. The homepage uses a deep navy surface, white headline, brighter supporting copy and restrained orange glow. Its conversion banner uses navy with an orange action.
- **Expected behavior:** Every orange-filled control in the storefront and admin has a white label, including buttons, active tabs, filters, navigation actions and count labels. Orange uses `#ea580c`; hover uses `#c2410c` and keeps white labels. Hero text remains readable with the specified orange highlight; section surfaces use a consistent navy, white, slate and orange palette with restrained accent use.
- **Recommended solution:** Use white labels across orange-filled controls on `#ea580c`; use `#c2410c` with white labels for hover. Apply the same rule in storefront, customer account and admin, including legacy module-specific controls. Use deep logo navy for hero surfaces and increase supporting-copy contrast. Keep the canvas animation and direction map animation/design unchanged.
- **Reusable component affected:** Button, IconButton, form controls, navigation active states, StatusBadge.
- **Evidence:** `apps/web/src/index.css`, `apps/admin/src/admin.css`, `apps/web/src/customer-portal.css`.
- **Implementation status:** The admin root `--ms-primary` token had still been set to the hover orange, which made token-based admin controls darker than requested; it now maps to `#ea580c`, with `--ms-primary-hover` set to `#c2410c`. Remaining RFQ tab hovers, secondary action fallbacks, search suggestions and supplier/staff search hovers now use the specified hover orange. The identified filled orange controls across storefront, customer account, shared product surfaces and admin modules use white labels/icons on `#ea580c`, with white foreground retained on `#c2410c` hover. White on `#ea580c` is approximately 3.6:1 for normal text, so the requested brand treatment is documented as an exception to the 4.5:1 text contrast target. Blank published contact fields fall back to the approved public contact details, restoring footer contacts, WhatsApp actions and the Delhi NCR service-area header. The hero surface/text and conversion section follow the logo palette. The home and admin previews were visually reviewed; the hero canvas animation and direction map animation/design remain unchanged. The broader application audit and remaining implementation stages continue separately.

### 2. Admin styling has repeated overrides and multiple competing token layers

- **Severity:** High
- **Area:** Admin / Shared
- **Page/component:** `admin.css`, workspace navigation, forms, buttons, component styles
- **Problem:** The admin stylesheet has accumulated repeated and overlapping rules, making the effective design dependent on source order and raising the chance that a fix to one workspace breaks another.
- **Current behavior:** `apps/admin/src/admin.css` still contains intentional layered declarations for navigation, brand links, admin input states, and responsive layout. A selector-and-media-context scan found 17 groups with 26 older exact copies whose selectors, declarations and responsive contexts matched later rules; those redundant copies are removed. Feature modules add their own CSS files, and business, sales, report, catalogue and staff styles extend those rules.
- **Expected behavior:** A small token layer and a predictable set of shared component rules own common behaviors; feature styles only describe true exceptions.
- **Recommended solution:** During implementation, inventory effective selectors, consolidate duplicate overrides by component, and remove superseded declarations only after comparing their intended behavior. Keep page-specific styles local.
- **Reusable component affected:** Admin shell, navigation, buttons, inputs, tables, focus treatments.
- **Evidence:** `apps/admin/src/admin.css`; `apps/admin/src/features/business/business-console.css`; `apps/admin/src/features/sales/sales-operations.css`; `apps/admin/src/features/catalogue/catalogue-manager.css`.
- **Implementation status:** Removed exact duplicate top-level `.admin-main :focus-visible`, `.admin-main button:not(:disabled):active`, and admin input/select/textarea focus-halo blocks, and duplicate admin-brand focus declarations after confirming later shared rules own their effective states. A selector/context scan found seven root-scope `.nav-item:hover` rules; the six superseded hover blocks were removed while preserving one canonical subtle dark hover with no horizontal motion. Five obsolete `.nav-item.active .nav-item-icon` orange-color declarations were also removed; the final selected state remains white on orange. A follow-up selector-and-media-context scan removed 26 redundant earlier rules from 17 exact-duplicate groups while preserving the final copies; a repeat scan reports no remaining exact duplicate selector/context groups. The brand link on the dark sidebar now uses the shared light-orange 3 px focus outline. Catalogue preview mode/device toggles now rely on one final orange/white selected-state rule; repeated intermediate active-fill overrides were removed. Live preview confirmed the selected Marketplace card and Desktop controls remain orange with white labels, and keyboard focus on the admin brand link is clearly visible. Remaining navigation, form-state, and responsive cascade review continues; module-specific rules will be preserved unless their replacement behavior is verified.

### 3. Shared foundations diverge between storefront, admin, and customer account

- **Severity:** Medium
- **Area:** Shared / Customer / Admin
- **Page/component:** Buttons, inputs, cards, focus rings, customer account shell
- **Problem:** Similar controls have separate token values, so visual corrections and accessibility fixes need parallel edits and can drift.
- **Current behavior:** Storefront radii use 4/8/12/16 px, admin uses 6/10/14/18 px, and the account portal defines a separate palette (`--ca-*`) and orange accent. Admin and storefront declare similar but not identical shadows and focus rules. Some components reference global tokens while others use literal hex values.
- **Expected behavior:** Shared controls follow common typography, spacing, radius, border, focus, and semantic color foundations, while storefront and admin retain distinct layout and density.
- **Recommended solution:** Establish one named shared foundation for type, spacing, radius, focus, neutral palette, and semantic status colors. Let storefront and admin define separate surface/layout tokens. Replace literal repeated colors where equivalent roles exist.
- **Reusable component affected:** Button, Input, Select, Badge, Card, FormSection, navigation states.
- **Evidence:** `apps/web/src/index.css`; `apps/admin/src/admin.css`; `apps/web/src/customer-portal.css`.
- **Implementation status:** Storefront/admin now share primary, hover, semantic status, focus-ring, and spacing tokens; admin radius tokens now align more closely with the storefront scale. The account keeps surface-specific tokens while sharing the same accent role.

### 4. Equivalent admin list and create workflows do not share one visible pattern

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Products & pricing, suppliers, staff, blogs, experts, procurement, reports, sales
- **Problem:** Users move between operational modules and encounter different page-title, action, filter, table/card, and edit placement conventions.
- **Current behavior:** `AdminWorkspaceLayout` provides a common top-level heading, but feature screens add nested headings/actions and use multiple visual families (`btn-primary`, `btn-sm`, `bc-primary`, module-specific controls). Suppliers, catalogue, staff, content, procurement, sales and reports each compose their own list/form patterns. In several areas the page header action and list-level action are both present or actions live inside a local subview.
- **Expected behavior:** Each admin list starts with a consistent title/description and primary action, followed by a filter/action row, a data region, and predictable pagination/empty/loading states. Detail/edit screens expose consistent back and save/cancel actions.
- **Recommended solution:** Define the canonical admin list/detail/form patterns in `UI_DESIGN_SYSTEM.md`, then adopt them module by module. Preserve workflow-specific fields and steps while normalizing action placement, labels and hierarchy.
- **Reusable component affected:** `PageHeader`, `ActionBar`, `FilterBar`, `DataTable`, `FormActions`, `DetailSection`.
- **Evidence:** `apps/admin/src/components/AdminWorkspaceLayout.tsx`; feature implementations in `apps/admin/src/features/catalogue`, `customers`, `staff`, `business`, `procurement`, `sales`, and `reports`.
- **Implementation status:** A shared filter-row presentation is now applied to customers, follow-ups, audit log, and notifications. The “New follow-up” action now sits in the shared admin page header, outside the search/filter row; live preview confirmed it opens the existing enquiry form and creates only the existing unsaved local draft. It is hidden in customer/detail/edit states. The supplier workspace now opens on its registered-supplier list with one prominent “Add supplier” action beside the list title; the add form remains directly addressable and keeps a back path. Staff & roles now places “Add staff member” in its page header, opens the create form on demand with a Cancel action, and places the staff-directory entry before the role reference cards. The optional draft warns before discarding entered details. Other create/detail headers and modules still need alignment.

### 5. Experts & Services opens directly into an empty creation form

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Business management → Experts & Services (`ExpertDirectoryPanel`)
- **Problem:** Entering the workspace opens a blank provider form and makes the directory a secondary tab, unlike the list-first Supplier workspace. This makes the first screen an action form instead of an inventory view.
- **Current behavior:** The default view is now the provider directory with one Add provider action beside its heading. The add form has a Back to directory action; explicit `experts:add` and edit subviews remain available.
- **Expected behavior:** Open the provider directory by default and show one prominent Add provider action alongside its heading. When the add form is open, provide a clear route back to the directory.
- **Recommended solution:** Make directory the default view, replace the add/directory peer tabs with a directory heading and Add provider action, and retain direct `experts:add` and edit routes. Preserve the existing submission contract and edit path.
- **Reusable component affected:** Admin list page header and `ExpertDirectoryPanel`.
- **Evidence:** `apps/admin/src/features/business/BusinessConsole.tsx` initializes and resets `expertView` to `add`; `apps/admin/src/features/content/ExpertDirectoryPanel.tsx` renders the add view as the first task tab and mounts a blank form by default.
- **Implementation status:** Directory-first view and the contextual Add provider/Back to directory actions are implemented. Local preview confirmed the populated directory on desktop and 375 px; Add provider opens the existing form and sets `businessSubView=experts:add`, and Back returns to `businessSubView=experts:directory`. Admin typecheck passes. Existing edit links and save handlers were preserved.

### 6. Notification filters require an extra submit action

- **Severity:** Low
- **Area:** Admin
- **Page/component:** Notifications → outcome/type filters (`NotificationStatus`)
- **Problem:** Changing the outcome selection does not update the result list until users press a separate Filter notifications button. This adds an unnecessary step for a simple dropdown filter and can make the control feel unresponsive.
- **Current behavior:** The filter form reads its values in `onSubmit`; the outcome dropdown and exact job type text field do not update the query until submit.
- **Expected behavior:** Apply the outcome filter immediately on selection; update the type filter as it changes, without a separate filter button.
- **Recommended solution:** Bind both controls to the existing filter state used by the request and URL effects, reset pagination when values change, and remove the submit control.
- **Reusable component affected:** Admin `FilterBar` and `NotificationStatus`.
- **Evidence:** `apps/admin/src/features/notifications/NotificationStatus.tsx`; live preview at 1440 px and 375 px.
- **Implementation status:** Outcome and type controls now update filter state as their values change, reset to page one, and drive the existing URL/query effects. The separate Filter notifications button is removed. Live preview selecting Failed immediately changed the URL and returned zero matching rows; restoring All outcomes removed the query and returned 28 jobs. The 375 px filter layout was checked and remains contained. Admin typecheck passes.

### 7. Audit Log optional filters wait for an extra apply action

- **Severity:** Low
- **Area:** Admin
- **Page/component:** Audit Log → filter row (`AuditLog`)
- **Problem:** The actor dropdown updates immediately, but date, action, entity type and entity reference inputs require users to press Apply filters, creating two different interaction rules in one filter row.
- **Current behavior:** `AuditLog` already fetches from filter state and writes the selected criteria to the URL; only those text/date inputs are staged in the form until submit. The API accepts each criterion independently, including one-sided date bounds.
- **Expected behavior:** Each optional filter applies when changed; remove the extra Apply filters button and keep pagination at the first page after each change.
- **Recommended solution:** Control each field from existing filter state, update that state on change, reset the page, and retain the existing query, abort, and URL synchronization behavior.
- **Reusable component affected:** Admin `FilterBar` and `AuditLog`.
- **Evidence:** `apps/admin/src/features/audit/AuditLog.tsx`; `apps/api/src/audit/audit.controller.ts` builds optional filters independently.
- **Implementation status:** Actor, date, action, entity type and entity reference controls now update the existing filter state immediately and reset pagination; Apply filters is removed. Live preview changing Activity by from My actions to All staff immediately changed `auditScope=mine` to `auditScope=all` and updated the count from 289 to 304, then restoring My actions returned the original URL and count. The desktop and 375 px filter layout was checked; admin typecheck passes.

### 8. Blog management opens to a blank create form

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Business management → Blogs (`BlogManagementPanel`)
- **Problem:** Opening the blog-management section immediately presents an empty editor, so staff have to switch views to review existing content and may mistake the blank form for the primary workspace.
- **Current behavior:** `blogView` initializes and resets to `write`; the panel presents Write article and Articles task tabs while mounting the empty form first.
- **Expected behavior:** Open on the article list with one clear Write article action. The create/edit form needs a clear route back to articles, while explicit URL-selected write/edit states remain available.
- **Recommended solution:** Default the blog subview to articles, replace peer task tabs with an article-list heading and contextual Write article action, and add Back to articles to the form. Preserve edit links, routes and submission behavior.
- **Reusable component affected:** Admin list page header and `BlogManagementPanel`.
- **Evidence:** `apps/admin/src/features/business/BusinessConsole.tsx` initializes `blogView` to `write` and `applyBusinessSubView` resets it to `write`; `apps/admin/src/features/content/BlogManagementPanel.tsx` renders the blank form for the default view.
- **Implementation status:** Blog management now opens on Articles with a Write article action at the list heading. The write form has a Back to articles action; successful creation returns to the list. Live preview showed the populated article list, confirmed `blogs:write` opens the blank create form and returns to `blogs:articles`, and confirmed an existing `blogs:edit:<slug>` record still opens with its values and returns to the list. No article was saved or edited. Admin typecheck and `git diff --check` pass.

### 9. Commission management opens to a blank entry form

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Business management → Commissions (`CommissionManagement`)
- **Problem:** Opening commission management immediately presents an empty record form instead of the existing commission records and their review actions.
- **Current behavior:** `commissionView` initializes and resets to `record`; the panel places Record commission and Commission records in peer task tabs and mounts the blank form first. After a successful save it already returns to records.
- **Expected behavior:** Open on Commission records with one clear Record commission action. The create form needs a clear Back to records path and should return to records after saving.
- **Recommended solution:** Default the commission subview to records, replace peer task tabs with a record-list heading and contextual create action, and add a Back to records action to the form. Preserve direct record/details views, approval behavior and submission contract.
- **Reusable component affected:** Admin list page header and `CommissionManagement`.
- **Evidence:** `apps/admin/src/features/business/BusinessConsole.tsx` initializes and resets `commissionView` to `record`; `apps/admin/src/features/commissions/CommissionManagement.tsx` renders the empty form by default and already switches to records after successful creation.
- **Implementation status:** Commission management now opens on Commission records with a Record commission action beside the list heading. The entry form has a Back to records action and keeps its existing submit-for-review flow; successful saves still return to records. Live preview showed the existing records and pending approval action, confirmed `commissions:record` opens the form and returns to `commissions:records`, and confirmed the record view remains available. No commission was submitted or approved. Admin typecheck and `git diff --check` pass.

### 10. Transportation opens to a blank delivery-plan form

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Business management → Transportation (`BusinessConsole`, `TransportationPlanningForms`)
- **Problem:** Entering Transportation opens a blank delivery-plan form while existing plans are a separate task view, so staff do not first see the records they are managing.
- **Current behavior:** Transportation opens on the plans list with Plan delivery and Issue challan actions in its heading. Each task form has a Back to transportation plans action; existing plan details and status actions remain available.
- **Expected behavior:** Open on Transportation plans with clear Plan delivery and Issue challan actions beside the list heading. Each form needs a return path to plans.
- **Recommended solution:** Default the transportation subview to plans, replace task tabs with a records heading and two contextual actions, and add Back to plans inside both forms. Preserve direct subview/detail URLs and the existing planning/challan contracts.
- **Reusable component affected:** Admin list page header, `BusinessConsole`, `TransportationPlanningForms`.
- **Evidence:** `apps/admin/src/features/business/BusinessConsole.tsx`; `apps/admin/src/features/transportation/TransportationPlanningForms.tsx`; local preview confirmed the list and both task return paths without submission.
- **Implementation status:** Transportation now opens on the plans list with Plan delivery and Issue challan actions in its heading. Both forms provide Back to transportation plans. Live preview confirmed both forms open and return to the existing plan list without submitting either form; the existing plan and status action remain visible. Direct subview/detail behavior is preserved.

### 11. Discount rules always shows a blank creation form

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Business management → Discount rules (`DiscountRules`)
- **Problem:** The new-rule form is permanently shown above the existing rules list, consuming the first screen with an empty form and making the list harder to scan.
- **Current behavior:** Discount rules opens on the existing rules list. The creation/edit form appears only on request and returns to the list; its hidden create form retains an unsaved draft.
- **Expected behavior:** Open on the rules list with one Add discount rule action. Show the form only when creating or editing; provide a return path while preserving a partially entered draft.
- **Recommended solution:** Add a list-first create state and list-header action, retain the form mounted while hidden so Back to discount rules does not discard draft values, and preserve the existing edit, save, toggle and delete behavior.
- **Reusable component affected:** Admin list page header, `DiscountRules`.
- **Evidence:** `apps/admin/src/features/discounts/DiscountRules.tsx`; local preview confirmed list → form → list navigation and preservation of a temporary local draft without submitting it.
- **Implementation status:** Discount rules now opens on the list with Add discount rule. The form is shown only for create/edit and offers Back to discount rules; the create form stays mounted while hidden so an unsaved draft is retained. Live preview confirmed list → create form → list navigation and the existing rule/actions without saving or changing a rule.

### 12. Tables and record lists use different scan and action conventions

- **Severity:** Medium
- **Area:** Admin / Customer
- **Page/component:** Audit log, staff, orders, procurement quotes, quotation editor, customer history
- **Problem:** Similar records are represented by native tables, scroll wrappers, cards, and custom grids with different density, alignment, row actions, and small-screen behavior.
- **Current behavior:** Examples include native table markup in `AuditLog`, `StaffManagement`, `OrderDetails`, procurement and `QuoteEditor`, while other workspaces use cards and custom row components. Shared table selectors style a subset; feature CSS adds module-specific variants. Sorting, pagination, selection, bulk actions, and row actions are not presented uniformly across all list modules.
- **Expected behavior:** Comparable data sets share readable column headers, aligned numeric values, explicit row-action placement, consistent sorting/filter feedback, and a usable narrow-screen strategy.
- **Recommended solution:** Define table primitives and when to switch to a card layout versus horizontal scrolling. Normalize header, density, status, action and pagination styles; make overflow and sticky behavior deliberate per module.
- **Reusable component affected:** `DataTable`, `TableActions`, `BulkActions`, `Pagination`, `EmptyState`.
- **Evidence:** `apps/admin/src/features/audit/AuditLog.tsx`; `apps/admin/src/features/staff/StaffManagement.tsx`; `apps/admin/src/features/procurement/ProcurementRequestCard.tsx`; `apps/admin/src/features/sales/QuoteEditor.tsx`; `apps/admin/src/features/sales/OrderDetails.tsx`.
- **Implementation status:** Shared admin tables now use one header, cell-spacing, border, row-hover, and horizontal-overflow treatment. Supplier quote comparison now uses the shared `table-scroll` wrapper and header/cell styling while retaining its 820 px comparison width and top-aligned quote details. At 375 px, live review confirmed the 820 px table scrolls inside a 319 px wrapper while the procurement cards and empty panels stay within the viewport. The supplier directory now paginates its long card list in groups of 10 and reports the visible range; filter and search changes return to the first page. The notifications table now preserves one-line IDs and timestamps inside its mobile scroller. Sales and procurement operational-report states were visually checked at 375 px: KPI cards stack, category/date controls stay readable, and wide tables retain their internal horizontal scroll. Source review confirms the staff directory, quotation editor, and customer-facing quote preview also keep wide tables inside local overflow wrappers. Remaining work is to assess whether cross-module sorting, pagination, selection, and row-action conventions should be aligned; specialized quote-sheet layouts remain intentionally feature-specific.

### 13. Form layouts and save/cancel placement vary by feature

- **Severity:** Medium
- **Area:** Admin / Customer / Storefront
- **Page/component:** Catalogue, supplier, quotation, purchase request, staff, website editor, account profile, quote request
- **Problem:** Labels, field grouping, widths, validation feedback, required indicators, and save/cancel actions are implemented locally in many complex forms.
- **Current behavior:** Feature forms use separate classes and patterns (`operation-form`, `bc-form`, catalogue editor forms, staff detail forms, account forms). Some are wide multi-column forms; others place actions in a local footer or beside fields. File uploads and image fields have custom treatments. Global input rules exist but are overridden by portal/admin feature rules.
- **Expected behavior:** Forms consistently explain required fields, show field-specific errors, group related inputs, keep action order stable, and preserve a readable max width without suppressing workflow-specific complexity.
- **Recommended solution:** Introduce shared field, form-section, validation, upload-field and action-footer patterns. Document when multi-column layouts collapse to one column and keep contextual help adjacent to its field.
- **Reusable component affected:** `Input`, `Select`, `Textarea`, `FormSection`, `FormActions`, `ContentImageField`.
- **Evidence:** `apps/admin/src/features/sales/QuoteEditor.tsx`; `apps/admin/src/features/procurement/PurchaseRequestForm.tsx`; `apps/admin/src/features/staff/StaffManagement.tsx`; `apps/web/src/pages/GetQuotePage.tsx`; `apps/web/src/pages/CustomerAccountPage.tsx`.
- **Implementation status:** Storefront quote/enquiry and admin supplier, supplier-product, professional-directory, policy-editor, and quotation-editor field groups now have accessible hidden legends; visible layouts and submission behavior remain unchanged. In Staff & Roles, Cancel and Create now share the end-of-form action area; live review at 375 px confirmed they stack as full-width controls in secondary-then-primary order. The staff-account edit form focuses Full name on open and places Cancel before Save details in its footer; at 375 px both buttons have equal width, and Cancel closes the edit without changing saved details. The temporary-password reset form now focuses its password field and puts Cancel before Reset password in the footer; live review confirmed focus on open and cancellation closes the form without entering or submitting a password. Other admin, account and storefront form patterns remain under review.

### 14. Loading, empty, and error feedback has several levels of polish

- **Severity:** Medium
- **Area:** Shared / Storefront / Admin
- **Page/component:** Blog/expert content pages, account pages, feature lists, admin workspace
- **Problem:** The application has useful loading skeletons and error roles, but some content surfaces fall back to plain text and generic controls instead of a consistent state pattern.
- **Current behavior:** Admin shell and catalogue/workspace use skeletons; customer pages use account-specific loading/error states. `ContentStatus` in `BusinessContentPages.tsx` provides styled public-content loading/error feedback and the blog has designed empty/no-match states. Before the latest correction, the storefront marketplace’s no-inventory, no-match and unavailable-with-retry panel had no live-region role, so result and failure changes were silent to assistive technology. The journal’s loaded-empty and filtered-no-match panels were also not live status regions.
- **Expected behavior:** Loading, empty, unavailable and error states explain what happened, offer a relevant next step, and preserve page layout while data changes.
- **Recommended solution:** Define reusable state components with optional illustration/icon, concise message, optional recovery action and consistent `role="status"`/`role="alert"` behavior. Use distinct copy for no results, no records yet, network failure and permission-limited views.
- **Reusable component affected:** `LoadingState`, `EmptyState`, `ErrorState`, `Toast`.
- **Evidence:** `apps/web/src/pages/BusinessContentPages.tsx`; `apps/admin/src/components/AdminWorkspaceLayout.tsx`; `apps/admin/src/features/audit/AuditLog.tsx`; `apps/web/src/pages/CustomerAccountPage.tsx`.
- **Implementation status:** Public content loading/error feedback now has a shared styled panel; the blog has explicit empty and no-match treatments. Both storefront journal result panels use `role="status"`, so newly loaded empty content and filter no-matches are announced politely without moving focus. The marketplace result panel now uses `role="status"` for no-inventory/no-match results and switches to `role="alert"` when catalogue data is unavailable; its existing retry action and visual treatment are unchanged. Notification readiness failures use an assertive alert surface while retaining the retry action. Filter-empty results in sales, audit, notifications, procurement, staff and activity views use polite status announcements; overview readiness errors use the alert treatment. Customer and follow-up lists show a styled polite empty state that distinguishes “no records yet” from “no matches” and gives filter recovery guidance; the new-follow-up action remains in the page header, and pagination is hidden when the result count is zero. A failed customer/follow-up request shows an unavailable state instead of incorrectly reporting zero records or displaying stale results. Supplier quote comparison shows a styled status panel when no quotes are available. The admin global-search no-match message and empty RFQ material row now expose polite status semantics without placing status messages inside the combobox listbox or changing the data layout. Other module-specific loading, empty, and error states still need review.

### 15. Public blog needs an editorial experience, not a generic card index

- **Severity:** Medium
- **Area:** Storefront
- **Page/component:** `/blogs` and `/blogs/:slug`
- **Problem:** The journal is readable but gives users little help finding relevant content or moving from an article to a related next step.
- **Current behavior:** The redesigned index has a featured story, local search, responsive article cards, empty/no-match messaging, local-guide links and quote actions. Published posts carry `featuredImageUrl` values managed in the admin editor. Article details use a structured header/byline, readable measure, optional markdown-style headings, related articles and a contextual quote action. Some published article bodies encode paragraph breaks as literal `\\n` sequences. Topic labels are inferred from article slugs/titles rather than stored as a content field; pagination is not part of the content model.
- **Expected behavior:** The journal makes new and useful articles easy to discover, provides a clear reading hierarchy, works well on mobile, and connects relevant guidance to products, quote requests, or service areas without interrupting reading.
- **Recommended solution:** Redesign the blog index and article detail completely as a focused editorial experience: feature one lead story, provide category/topic chips and search, use consistent image crops and metadata, build responsive article cards, add readable article typography and structured headings, include related articles and a quiet contextual quote CTA. Keep all content/API behavior and routes intact. Keep the homepage canvas and map animation/design untouched.
- **Reusable component affected:** Blog card, article header, topic filter, editorial image, content status, contextual CTA.
- **Evidence:** `apps/web/src/pages/BusinessContentPages.tsx`; general page styles in `apps/web/src/App.css`.
- **Implementation status:** The index now has a featured-story layout, local search, client-side topic chips derived from published slugs/titles, responsive article cards, designed no-match/empty states, local guide links, and quote CTAs. The phone-width search placeholder is shortened to “Search articles” while its accessible label and behavior remain unchanged. Featured images now render from the admin-managed `featuredImageUrl`, including the shared editorial image URL; no title-derived art replaces configured content. Missing images use a neutral media surface. The final unpaired desktop card is centered, and the tablet orphan card receives its own centered row. Article pages retain the structured header/byline, optional markdown-style headings, readable measure, normalized paragraph breaks, and contextual quote CTA. Existing routes and content API are unchanged.
- **Visual verification:** Earlier responsive layout checks confirmed the index and article remain contained at all seven widths and the topic filter works. The generated cover treatment has since been removed; recheck public visuals with posts using uploaded and missing featured images during the next live preview.

### 16. Responsive behavior has multiple breakpoints and has not been checked against the requested viewport set

- **Severity:** Medium
- **Area:** Shared / Admin / Customer / Storefront
- **Page/component:** Header/sidebar, marketplace filters and cards, account shell, admin tables/forms/dialogs
- **Problem:** Source shows breakpoint rules distributed across large stylesheets and feature CSS, while runtime coverage across the seven requested widths remains incomplete.
- **Current behavior:** Styles use several thresholds, including 480, 640, 680, 700, 760, 900, 992 and 1000 px. Admin and account layouts separately switch sidebar/navigation behavior. Table and dialog breakpoints are local to features. The home page, admin overview and blog index have been checked at all seven requested widths; storefront marketplace, quote request, material list, contact, account and engineering guides have now been checked at all seven widths for page-level overflow. Other routes and states remain unverified.
- **Expected behavior:** Shared layout changes happen at intentional, documented widths; key actions and content remain visible, reachable and legible at 320–1920 px.
- **Recommended solution:** During implementation QA, capture the primary route and representative list/form/detail/dialog state at 320, 375, 768, 1024, 1280, 1440 and 1920 px. Record overflow, clipping, target size and content order. Consolidate breakpoints where adjacent features have the same layout intent.
- **Reusable component affected:** Page containers, Navigation, FilterBar, DataTable, Dialog, FormActions.
- **Evidence:** `apps/web/src/customer.css`; `apps/web/src/customer-portal.css`; `apps/admin/src/admin.css`; feature CSS files.
- **Implementation status:** The homepage and admin overview document/body widths were checked at all seven requested widths and had no horizontal page overflow. A current 320 px homepage preview confirms the search and marketplace/quote actions stack inside the hero, with the WhatsApp shortcut still available; the home canvas and map were left untouched. Marketplace, quote request, material list, contact, account and engineering-guide templates were also checked at all seven widths; none produced page-level horizontal overflow. The quote request’s primary form action stayed within the viewport at every width. Marketplace brand chips remain inside their intended horizontal scroller. All 14 top-level admin workspaces were checked at all seven widths; none produced page-level overflow. The supplier-create form was visually reviewed at 320 px. The 768 px admin overview initially placed three KPI cards on the first row and one on the next; the grid now uses two columns through 900 px and one column through 560 px. The admin customer list was checked at 320 px and supplier form at 375 px; the supplier category picker now wraps its full label. A nested supplier-quote comparison exposed an implicit grid track expanding to its 820 px table width at 375 px; the procurement queue now defines an explicit shrinkable one-column track, keeping the page at 375 px and the table scrollable within its own 319 px wrapper. The populated supplier detail was measured at all seven widths: document and body widths matched each viewport (320–1920 px). Its 320, 375, 768, and desktop layouts were visually reviewed; the product cards, KPI cards and add action stay contained and balanced, so no change was needed. Other nested views, representative dialogs, and keyboard paths remain to be reviewed.

### 17. Focus and selected-state colors are not governed by one accessible rule

- **Severity:** Medium
- **Area:** Shared
- **Page/component:** Inputs, links, tab controls, sidebar navigation, dialogs, icon-only buttons
- **Problem:** Focus and active state styling is present but varies in selector, width, color and contrast, making keyboard focus less predictable across the three UI shells.
- **Current behavior:** The base storefront/admin rules now use a shared solid keyboard outline and a separate soft input halo; customer account filters add the solid outline explicitly. Feature styles still override focus width/color in places. A keyboard check found browser-default blue focus on the admin sidebar marketplace link; the dark sidebar and mobile menu now use the approved light-orange outline token. A CSS audit also found feature-specific orange focus rings and a supplier suggestion rule that suppressed its focus outline. The storefront client confirmation declared a modal but lacked focus entry, focus containment, focus return and background scroll locking.
- **Expected behavior:** Every interactive element has a consistent, visible keyboard focus indicator and active/selected state. State is not communicated only through color.
- **Recommended solution:** Define a single focus-ring token and apply `:focus-visible` consistently to links, buttons, fields, tabs and menu items. Pair selected states with weight, icon, shape or `aria-current` semantics and verify contrast against all surfaces.
- **Reusable component affected:** Button, Input, Select, Tabs, Navigation, IconButton, Modal.
- **Evidence:** `apps/web/src/index.css`; `apps/web/src/customer-portal.css`; repeated focus rules in `apps/admin/src/admin.css`.
- **Implementation status:** Storefront and admin now separate the soft field halo from the solid `#c2410c` keyboard outline; dark admin navigation uses a lighter orange outline. Account fields and filters use the shared halo. Catalogue, website-editor, partner-brand, supplier-filter and customer auth/profile fields now retain a solid token-based keyboard outline. A shared admin dialog manager focuses explicit modal dialogs, contains Tab navigation and restores focus to the opener. Live checks confirmed entry, Tab wrapping and opener return for the catalogue editor, delete confirmation and website-editor save confirmation; the last check caught and fixed focus loss in native admin `<dialog>` confirmations. The storefront client confirmation retains its own Escape, scroll-lock and focus-return behavior. A follow-up source sweep traced the remaining interactive `outline: none`/`outline: 0` resets to shared element rules or explicit focus-visible wrapper/field rules; no additional uncovered reset was found. The admin brand link now matches the dark-navigation focus token, and live keyboard tabbing confirmed the 3 px light-orange outline on the dark sidebar. Remaining nested dialog workflows and live field-state checks still need review.

### 18. Navigation depth and active states vary across the three shells

- **Severity:** Low
- **Area:** Shared / Customer / Admin
- **Page/component:** Storefront header, account sidebar, admin sidebar and nested workspace menus
- **Problem:** Each shell reflects a different user role, but cross-navigation and nested location cues are not consistently expressed.
- **Current behavior:** The storefront uses header links and a floating action dock; the customer account uses a sidebar plus a details-based mobile menu; admin uses a grouped sidebar plus a second details-based mobile menu. Business and sales use additional nested workflow navigation. The admin shell shows the selected workspace group in its breadcrumb, and nested Business and Sales navigation exposes the selected page with `aria-current="page"`.
- **Expected behavior:** Each shell remains role-appropriate while clearly showing current section, parent location, and a way back to the broader workspace on desktop and mobile.
- **Recommended solution:** Keep storefront discovery, customer account tasks, and admin operations distinct. Standardize active state, focus behavior, mobile menu close behavior and breadcrumb depth within each shell; show current nested module/view where useful.
- **Reusable component affected:** Navigation, Breadcrumbs, Sidebar, MobileMenu.
- **Evidence:** `apps/web/src/components/Header.tsx`; `apps/web/src/pages/CustomerAccountPage.tsx`; `apps/admin/src/components/AdminWorkspaceLayout.tsx`; `apps/admin/src/features/business/BusinessConsole.tsx`; `apps/admin/src/features/sales/SalesOperations.tsx`.
- **Implementation status:** The admin breadcrumb derives its parent label from the active sidebar group (for example, Products & pricing shows “Website Management”); live catalogue inspection confirmed the parent label and page title remain distinct. Storefront links, account navigation, admin navigation, and nested Business/Sales workflow controls expose their current page semantically; further detail-page breadcrumb review remains in scope.

### 19. Responsive action groups can fit while still looking accidental

- **Severity:** Medium
- **Area:** Shared / Storefront / Customer / Admin
- **Page/component:** Navigation, tab and filter groups, page-header actions, card action rows, and responsive lists
- **Problem:** Some responsive groups rely on natural flex wrapping. They avoid clipping but can leave uneven rows, overly wide active controls, isolated final actions, or cards whose metadata has no clear alignment.
- **Current behavior:** The RFQ status filters at intermediate widths wrapped into an irregular 2/2/1 arrangement; several shared styles use `flex-wrap` and need review in their actual containers and states.
- **Expected behavior:** Controls and card content should be intentionally composed at every breakpoint, with consistent grouping, useful card width, balanced whitespace and clear hierarchy while preserving the existing actions.
- **Recommended solution:** Review equivalent action groups across storefront, customer and admin. Use compact aligned rows where they fit, deliberate grids or stacked groups where they do not, and adjust card width/padding to screen space rather than merely preventing overflow. Keep semantics, routes and behavior unchanged.
- **Reusable component affected:** Tabs, FilterBar, PageHeader, ActionBar, Card, Navigation.
- **Evidence:** `apps/admin/src/features/sales/sales-operations.css` (`.rfq-status-filters`); responsive `flex-wrap` rules across `apps/admin/src` and `apps/web/src`.
- **Implementation status:** RFQ status actions now use a deliberate three-column tablet and two-column phone grid with aligned count badges. Customer account activity and quotation-status filters now use two-column mobile grids; labels wrap beside right-aligned count badges rather than displacing them below the label. Live previews at 320 and 375 px showed all filters fully visible and no page-level horizontal overflow. The responsive storefront header keeps the Delhi NCR label and call number while hiding the six-region list through the 1120 px compact-header breakpoint; this was verified at 1024 px, with the region list retained at 1280 px. The marketplace material-list notice now stays in page flow instead of covering content. Customer order tracking and purchase-history cards were visually reviewed at 375 px: long order references wrap, item amounts stay aligned, and the panels remain inside the account layout. Populated brand-comparison cards and the inactive loyalty-program state were also reviewed at 375 px; option/price rows and the empty-state return action remain within the account panel. The admin notification table now keeps job IDs and timestamps on one line to reduce row height; its remaining columns stay available in the internal horizontal scroller at 375 px. The supplier list was checked at 375 px: filters form an even two-column grid and the Add supplier action spans the available width. The closed off-canvas admin sidebar no longer shadows over left-edge content, while the open drawer still receives its shadow. Broader storefront, customer and admin action groups remain under review.

### 20. Embedded admin modules duplicate the page-level heading

- **Severity:** Low
- **Area:** Admin
- **Page/component:** Quotations & orders, Business management, Staff & roles inside `AdminWorkspaceLayout`
- **Problem:** Embedded modules presented their current section title as another `h1` beneath the shell's page title, which creates a confusing heading outline for screen-reader and keyboard users.
- **Current behavior:** The shared workspace renders the page-level `h1`; embedded SalesOperations and BusinessConsole section labels and the embedded StaffManagement title also used `h1`.
- **Expected behavior:** Keep one page-level `h1` and use ordered `h2` headings for nested sections. Standalone StaffManagement and standalone BusinessConsole views retain their own `h1`.
- **Recommended solution:** Use `h2` for embedded section/title labels and preserve their existing visual styling.
- **Reusable component affected:** `AdminWorkspaceLayout`, `SalesOperations`, `BusinessConsole`, `StaffManagement`.
- **Evidence:** `apps/admin/src/components/AdminWorkspaceLayout.tsx`; `apps/admin/src/features/sales/SalesOperations.tsx`; `apps/admin/src/features/business/BusinessConsole.tsx`; `apps/admin/src/features/staff/StaffManagement.tsx`.
- **Implementation status:** Embedded sales/business section labels and staff title now use `h2`; standalone staff and business titles remain `h1`. A live pass across all 14 top-level admin workspaces confirmed exactly one page-level `h1` per workspace. A populated customer-history detail also showed a visible sequence of shell `h1`, customer `h2`, history-group `h3`, and record `h4` headings; inactive workspace headings are hidden. The customer detail stayed within the viewport at 320 and 375 px. A live staff-account detail exposed two consecutive `h2` levels; the account name is now `h3` only when embedded, while standalone StaffManagement keeps its `h2`. After the change, the rendered hierarchy is `h1` → `h2` → `h3`; the 375 px detail remains within the viewport. Other nested detail, edit and confirmation heading order remains under review.

### 21. Native dropdown chevrons sit too far inside the field

- **Severity:** Medium
- **Area:** Shared / Storefront / Customer / Admin
- **Page/component:** Native select controls, including filters and form fields
- **Problem:** The enhanced browser picker draws its own chevron, while the field still reserves the large right padding intended for a background-image chevron. This makes the arrow appear detached from the field edge.
- **Current behavior:** The global fallback reserves about 42–43 px. In modern Chrome’s `base-select` mode the native picker icon is aligned after that padding, leaving a visibly oversized right gutter. A compact material-cart product-option select also inherited the large padding and hid its fallback chevron; its option label wrapped into a cramped row.
- **Expected behavior:** The chevron sits close to the right edge with a consistent, modest inset, and select text remains clear of it. Custom icons retain their own space.
- **Recommended solution:** In `base-select` mode, reduce the general right padding to 16 px across storefront and admin. Preserve the material option editor’s custom SVG arrow and padding; retain the supplier-filter exception.
- **Reusable component affected:** Shared Select / FilterBar.
- **Evidence:** `apps/web/src/App.css`; `apps/admin/src/admin.css`; live 430 px Audit Log filter; live material-list search result for an Astral Pipes product with six options.
- **Implementation status:** Updated both base-select rules. At 430 px the Audit Log “My actions” chevron moved from roughly 48 px to roughly 22 px from the field edge; computed right padding is 16 px. The admin Audit Log filter was rechecked live at 1440 px and 375 px: arrows sit about 20 px from the field edge, and values/icons are vertically centered in both layouts. Storefront marketplace brand and availability filters were also visually checked at desktop and 375 px; their arrows sit about 20 px from the field edge, and the filters stack cleanly on mobile. Storefront account filter computed padding is also 16 px. A source cascade audit across storefront and admin confirms standard single-select controls receive centered content and a 16 px right inset even where feature styles set larger legacy padding. The material option editor retains its custom arrow reservation, and supplier filters retain their tighter 12 px inset. The compact cart option selector uses one visible chevron, a full-width selector below its label, and one-line ellipsis for long option names; live preview confirmed its menu opens and lists all six options. The Notifications outcome filter was reviewed live at both 1440 px and 375 px: the 44 px-high field stays centered with 16 px right padding, and the visible arrow remains about 21 px from the field edge. Other module-specific select variants still need review.

### 22. Higher-specificity field focus rules suppress the shared keyboard outline

- **Severity:** High
- **Area:** Shared / Customer / Admin
- **Page/component:** Catalogue forms, website editor fields, business filters, customer profile/auth fields
- **Problem:** Several local `:focus` rules set `outline: 0` or a pale local outline at a higher specificity than the global `:focus-visible` rule. Keyboard focus can therefore disappear or vary in contrast.
- **Current behavior:** Admin textarea/catalogue/website-editor rules suppress or replace the shared outline; customer profile/auth fields set `outline: 0`; catalogue and legacy customer fields use local focus colors.
- **Expected behavior:** Keyboard focus uses the shared solid orange outline, while pointer focus keeps the soft border/halo treatment. Existing action and field behavior stays unchanged.
- **Recommended solution:** Remove local outline resets from fields, use the shared focus ring for pointer focus, and explicitly use `--focus-outline` where a component's selector otherwise overrides the global focus rule.
- **Reusable component affected:** Input, Select, Textarea, SearchField.
- **Evidence:** `apps/admin/src/admin.css`; `apps/admin/src/features/catalogue/catalogue-manager.css`; `apps/admin/src/features/business/business-console.css`; `apps/web/src/customer.css`; `apps/web/src/customer-portal.css`.
- **Implementation status:** Corrected the identified catalogue, partner-brand, supplier-filter, website-editor, customer auth/profile and search-wrapper focus rules. Staff search, supplier search, admin global search, admin customer/follow-up search, and account quote search/filter wrappers now gain the solid keyboard outline while retaining their soft focus halo for pointer focus. Storefront hero search, marketplace search/selects, material-list inputs, quote forms, BOM fields, and journal search now also have explicit `:focus-visible` outlines where local outline resets overrode the global rule. Admin typecheck passes. Live customer-search keyboard review confirmed the 3 px `#c2410c` wrapper outline and 2 px offset; keyboard focus removes the redundant soft halo and input outline, while pointer focus retains the existing halo. Live catalogue keyboard focus shows the shared outline; the website editor keyboard field shows a 3 px `#c2410c` outline, and its save-confirm dialog returns focus to Preview draft after mouse and keyboard cancellation. Live keyboard tabbing to the marketplace search confirmed `:focus-visible`, a 3 px `#c2410c` outline and 2 px offset despite its local outline reset. Other module-specific fields remain in the broader review.

### 23. Select labels and picker icons sit too high inside their fields

- **Severity:** Medium
- **Area:** Storefront / Customer / Admin
- **Page/component:** Native select controls, including catalogue filters and account filters
- **Problem:** Selected values and their chevrons appear above the visual center of their outlined controls, making the controls feel vertically unbalanced.
- **Current behavior:** Browser-rendered `base-select` controls inherit varied local heights and padding. Without an explicit centered cross-axis alignment, the selected label and browser picker icon can appear too high, including in the admin catalogue filter row.
- **Expected behavior:** Selected values and picker icons share the vertical center of the field across storefront and admin, regardless of component-specific dimensions.
- **Recommended solution:** Set `align-items: center` in the shared storefront and admin `base-select` rules; keep feature-specific dimensions and horizontal arrow spacing intact.
- **Reusable component affected:** Shared Select / FilterBar.
- **Evidence:** `apps/admin/src/admin.css`; `apps/web/src/App.css`; live admin catalogue filters and customer quotation request filter.
- **Implementation status:** Added centered alignment to the shared browser-rendered select rules. Live admin catalogue filters (all five controls) and the storefront customer quotation filter were visually reviewed; their labels and chevrons sit centered in the fields.

### 24. Blue and purple interface accents conflict with the approved orange brand palette

- **Severity:** Medium
- **Area:** Storefront / Customer / Admin
- **Page/component:** Informational accents, icons, workflow statuses, loading notices, service-area links, supplier/partner artwork
- **Problem:** UI elements retained saturated blue or purple treatments even though the approved site palette uses orange for interface accents; supplier and partner artwork has its own original colors.
- **Current behavior:** Blue appears in informational tokens, home guide icons, phone/product icon accents, sales and procurement statuses, report loading feedback, service-area links, and content-history links. Deep navy and slate are neutral text/surface colors and are not brand accents.
- **Expected behavior:** Replace blue UI accents with the logo orange `#ea580c`, readable dark orange `#c2410c`, and pale orange surfaces. Preserve supplier/partner artwork and the direction map’s palette and animation/design untouched.
- **Recommended solution:** Update shared info tokens and feature-specific blue accent rules across storefront and admin; retain success, warning and danger semantics; preserve partner-brand artwork exactly as supplied.
- **Reusable component affected:** StatusBadge, InfoNotice, icon tiles, links, report/loading feedback.
- **Evidence:** `apps/web/src/index.css`; `apps/web/src/App.css`; `apps/web/src/components/SearchSuggestions.css`; `apps/admin/src/admin.css`; `apps/admin/src/features/sales/sales-operations.css`; `apps/admin/src/features/reports/operational-reports.css`.
- **Implementation status:** Replaced the identified blue and purple UI accents with orange across storefront and admin, including info tokens, status treatments, report loading, service-area and content-history links, guide/contact/search/category icons, and the delivery challan heading. The sales “Contacted” badge’s teal treatment now uses pale orange with `#c2410c` text. Active admin and customer-account navigation now uses the exact brand-orange fill with white labels and icons; desktop previews visibly confirm both shells. The admin purchase-order PDF’s pale-blue information panel now uses pale orange. A final accent sweep also changed the product-photo badge from teal to the shared orange token. A follow-up sweep aligned the compact admin menu selection, standalone business-console active navigation, selected-size badge, and RFQ active-filter context with the orange palette. Remaining navy/slate values are structural surfaces and neutral text. Supplier and partner logos retain their original colors, text, and artwork. Direction-map files and animation styles were not changed.
- **Final verification:** A repeat source-color sweep across storefront, admin and shared product UI found no saturated blue interface accents outside the protected direction map. Live computed-style checks of the storefront homepage, marketplace, blog index and admin overview had already confirmed their rendered accents use the orange palette. Supplier logos retain their original colors, text, and artwork. The map files and animation styles remain untouched.
- **Also completed:** A later exact-color sweep found non-semantic green and red-orange checkbox accents, older orange fallbacks, and off-token active-device preview fills/shadows. Interface controls now reference `--ms-primary` or `#ea580c`; semantic success/warning/danger colors remain distinct; supplier-brand artwork retains its original colors and text.
- **Also completed:** Storefront and admin root styles now set native checkbox/radio/range/progress accents and text-selection colors to `--ms-primary`, removing browser-default blue from these states. Direction-map colors and animation/design remain untouched.
- **Latest verification:** The user requested a repeat application-wide blue-to-orange sweep. A source scan across storefront, customer, admin, and shared product UI found no remaining saturated blue interface accents or blue-named utility classes outside the protected direction map. The catalogue preview mode and viewport tabs use the orange/white active state. Existing navy/slate neutrals and semantic success/warning/danger treatments remain unchanged. Supplier marks retain their original colors and artwork, and map visuals remain unchanged.
- **Heading follow-up:** Live inspection of Business Management → Suppliers showed “Suppliers” and its nested “Registered suppliers” list both announced as level-two headings. The list/form titles now use level three; supplier detail names use level three, and Products supplied / Recent ratings subsections use level four. Feature CSS preserves their previous visual sizes. After refresh, the live accessibility tree confirmed the supplier detail sequence `h1 Business Management` → `h2 Suppliers` → `h3 supplier name` → `h4 Products supplied / Recent ratings`.

### 25. The mandated white-on-orange action pair falls short of normal-text contrast

- **Severity:** Medium
- **Area:** Shared / Storefront / Customer / Admin
- **Page/component:** Orange-filled buttons, active tabs, filter chips and navigation actions
- **Problem:** White text on the user-specified `#ea580c` brand fill measures 3.56:1, below the 4.5:1 WCAG AA target for normal-sized text.
- **Current behavior:** The exact orange with white foreground is used as explicitly requested. The fill/foreground pair exceeds the 3:1 non-text UI contrast threshold; large text also meets the 3:1 text threshold. White on hover orange `#c2410c` measures 5.18:1.
- **Expected behavior:** Preserve the user's exact orange and white foreground direction while making action labels as legible as the component layout allows.
- **Recommended solution:** Keep the specified colors; use bold large labels when the control size supports them, and avoid tiny white text on brand-orange fills. If strict normal-text contrast is required for every control, request approval to change either the foreground or fill.
- **Reusable component affected:** Shared `Button`, `Tabs`, workflow filters and navigation actions.
- **Evidence:** Relative-luminance calculation: white/`#ea580c` 3.56:1; white/`#c2410c` 5.18:1; `#c2410c`/`#fff7ed` 4.88:1; `#475569`/white 7.58:1.
- **Implementation status:** Documented the measurable constraint without changing the user-mandated brand colors.

### 26. Supplier product dialogs could discard unfinished edits without warning

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Business Management → Suppliers → Products supplied → Add/Edit supplied product dialogs
- **Problem:** Escape, Cancel, and the close icon closed product-edit and add-selection dialogs immediately, discarding local changes without a confirmation.
- **Current behavior:** Product-edit fields and selected brand/category/product values could be lost on close. Escape from an open brand picker and Escape from the parent dialog were not ordered as nested dismissal steps.
- **Expected behavior:** Preserve work until the user chooses to discard it. Escape first closes an open picker or suggestion list; a later Escape opens a clear discard confirmation. Cancel returns to the draft, and explicit discard closes the dialog without saving.
- **Recommended solution:** Compare edit form values with the saved product and check add-selection state before close. Reuse the admin confirmation dialog and keep nested picker Escape handling local.
- **Reusable component affected:** Admin confirmation dialog; supplier product editor and catalogue picker.
- **Evidence:** `apps/admin/src/features/suppliers/SupplierProducts.tsx`; `apps/admin/src/features/suppliers/SupplierCataloguePicker.tsx`; live supplier test fixture.
- **Implementation status:** Added unsaved-change confirmations to both dialogs and dialog-level Escape handling. Live checks confirmed edit Escape opens the discard prompt, Cancel preserves the 1133 price draft, explicit discard leaves the saved 1121 price unchanged, the first Escape closes an expanded brand picker, and the next Escape confirms before discarding temporary unsaved selections or free-typed product text. Cancel preserved the typed draft; explicit discard closed the dialog while the saved supplier products stayed unchanged.

### 27. Supplier matching could silently discard a quote draft

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Business Management → Procurement → Purchase requests → Match suppliers
- **Problem:** The supplier matching overlay contains expandable supplier records and quote forms. Closing the overlay could discard entered prices, quantities, and notes without a warning; Escape also needed to dismiss a nested supplier detail before the parent overlay.
- **Current behavior:** The close icon, footer Close action, and Escape now pass through a dirty-form guard. Escape collapses an open supplier detail first; clean Escape closes the parent. A discard prompt explains that quote details will be lost.
- **Expected behavior:** Preserve quote drafts until the user explicitly discards them. Nested details close before the parent, and dismissing the confirmation returns to the draft.
- **Recommended solution:** Check quote form controls against their initial values before closing; reuse the shared admin confirmation dialog and ignore parent Escape while that native confirmation is active.
- **Reusable component affected:** Admin confirmation dialog; procurement supplier matcher.
- **Evidence:** `apps/admin/src/features/procurement/ProcurementRequestCard.tsx`; live local procurement request using synthetic supplier records.
- **Implementation status:** Added guarded close paths and nested Escape handling. Live checks confirmed an expanded supplier detail collapses on Escape, quote notes survive the collapse, the Close action opens the discard prompt, Escape dismisses that prompt while leaving the matcher open, explicit discard closes it, and clean Escape closes the matcher. No quote was saved; the original supplier workspace and record were restored.

### 28. Notification readiness failures were announced as routine status

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Operational Reports → Notifications → provider readiness check
- **Problem:** Readiness check failures used `role="status"`, which does not announce an error with alert urgency. The retry control was present, but the message lacked the shared error surface.
- **Current behavior:** Readiness errors now use the shared `.admin-error` surface and `role="alert"`; the retry action and pending state remain intact.
- **Expected behavior:** Announce actual check failures promptly, distinguish them from informational readiness and loading messages, and keep the recovery action adjacent.
- **Recommended solution:** Use the established assertive alert treatment for readiness endpoint errors while retaining `role="status"` for valid-but-unconfigured settings and successful checks.
- **Reusable component affected:** Admin feedback states; notification readiness check.
- **Evidence:** `apps/admin/src/features/notifications/NotificationStatus.tsx`; source comparison with shared alert rules in `apps/admin/src/admin.css`.
- **Implementation status:** Changed the readiness endpoint error wrapper to `role="alert"` with the existing shared red error treatment. Informational unconfigured and successful states remain polite statuses. The API request and retry behavior are unchanged. A phone-width review also found long configuration names broken mid-word in the unconfigured notice; names now render as code and wrap at underscores. Live previews at 320 and 375 px kept the warning within the page width and left the exact setting names readable.

### 29. Admin list empty states were not consistently announced

- **Severity:** Low
- **Area:** Admin
- **Page/component:** Sales RFQs/quotations/orders, audit log, notifications, procurement, staff, commissions, blogs, customer RFQ sourcing, and recent activity
- **Problem:** Several dynamic list-result messages were visible but lacked a live-region role, so assistive technology might not announce that filters or loaded records produced an empty result.
- **Current behavior:** Empty result messages in the reviewed list branches now use `role="status"`. Loading messages remain polite statuses and request failures remain alerts.
- **Expected behavior:** Announce loaded empty results without raising an error or changing focus; retain existing empty-state copy, layout, filters, and actions.
- **Recommended solution:** Add `role="status"` to data-dependent empty list/result surfaces and reserve `role="alert"` for actual failures.
- **Reusable component affected:** Admin empty/list feedback states.
- **Evidence:** `apps/admin/src/features/sales/SalesOperations.tsx`; `apps/admin/src/features/audit/AuditLog.tsx`; `apps/admin/src/features/notifications/NotificationStatus.tsx`; `apps/admin/src/features/procurement/ProcurementWorkspace.tsx`; `apps/admin/src/features/staff/StaffManagement.tsx`; `apps/admin/src/features/overview/WorkspaceOverview.tsx`.
- **Implementation status:** Added status semantics to empty results in sales RFQ, quotation, order, contact-enquiry, audit, notification, procurement, sourcing, staff, commission, blog, and recent-activity branches. Overview recent-activity load errors now use the shared alert surface. Source review confirms the existing text and controls are unchanged; `git diff --check` passes. Runtime announcement behavior was not separately tested.

### 30. Engineering reference table compressed its explanatory columns on phones

- **Severity:** Low
- **Area:** Storefront
- **Page/component:** Engineering guides, cable-selection reference table
- **Problem:** The table had an overflow wrapper, but its `width: 100%` layout had no minimum readable width, so four explanatory columns could compress into narrow text fragments on small screens.
- **Current behavior:** The wrapper now owns horizontal scrolling and the table retains a 640 px minimum width, keeping each column readable without causing page-level overflow.
- **Expected behavior:** Keep the complete table available and readable on phones while allowing horizontal scrolling inside the reference-table region.
- **Recommended solution:** Pair a bounded, shrinkable overflow wrapper with a deliberate minimum width for text-heavy reference tables.
- **Reusable component affected:** Storefront responsive reference tables.
- **Evidence:** `apps/web/src/pages/EngineeringGuidesPage.tsx`; `apps/web/src/App.css` (`.table-responsive`, `.engineering-table`).
- **Implementation status:** Added `width: 100%`, `min-width: 0`, and inline overscroll containment to the wrapper; set the engineering table minimum width to 640 px. The live preview verified the table at all seven requested widths: it scrolls inside the 239 px wrapper at 320 px, fits the available width from 768 px through 1440 px, and remains inside the 1182 px content column at 1920 px. No viewport had page-level horizontal overflow.

### 31. Engineering guide conversion action exceeded its card on phones

- **Severity:** Medium
- **Area:** Storefront
- **Page/component:** Engineering guides, final drawing/schedule CTA
- **Problem:** The long, non-wrapping button exceeded the card’s content width on phone screens.
- **Current behavior:** At 375 px, the CTA uses the card’s full available width and wraps its label while keeping the arrow visible; measured button bounds stay inside the card and the page has no horizontal overflow.
- **Expected behavior:** Keep the full action visible and easy to activate without widening or clipping its card.
- **Recommended solution:** In the narrow-screen guide layout, allow the button label to wrap and size the action to the card’s inner width.
- **Reusable component affected:** Guide-specific CTA; shared button keeps its normal desktop behavior.
- **Evidence:** `apps/web/src/pages/EngineeringGuidesPage.tsx`; `.guide-bottom-dispatch-card` rules in `apps/web/src/App.css`; local storefront preview at 375 px.
- **Implementation status:** Added a phone-width card padding adjustment and full-width, wrapping CTA. Browser review confirmed the action stays within its card and no page-level horizontal overflow occurs at all seven requested widths.

### 32. Profile overview heading competed with its edit action on phones

- **Severity:** Low
- **Area:** Customer
- **Page/component:** Customer account profile, Contact and business details card
- **Problem:** On a phone-width card, the title, supporting copy and Edit profile action shared a constrained horizontal row, causing the heading and description to wrap into a narrow column.
- **Current behavior:** The phone layout now stacks the text and right-aligns Edit profile beneath it; desktop keeps its existing side-by-side composition.
- **Expected behavior:** Keep the profile title and supporting copy readable at full card width while keeping the edit action easy to find.
- **Recommended solution:** At the existing mobile breakpoint, stack the heading content and align the compact edit action to the end of the row below.
- **Reusable component affected:** Customer profile overview card.
- **Evidence:** `apps/web/src/customer-portal.css`; live account profile preview at 375 px.
- **Implementation status:** Applied the stacked mobile layout. Live previews at 320 and 375 px confirm the full-width heading/supporting copy and right-aligned Edit profile action below. At 320 px, the profile form and its Cancel/Save profile actions also remain inside the 313 px document viewport; no page-level horizontal overflow was measured.

### 33. Declining a customer quotation submitted without confirmation

- **Severity:** Medium
- **Area:** Customer
- **Page/component:** Customer account → quotation detail → Decline quotation
- **Problem:** Declining immediately changed a current quotation to `REJECTED`, while accepting first showed the customer the selected brands/quantities and order consequence for confirmation.
- **Current behavior:** The decline button directly submitted the quotation response. The service accepts only current `QUOTE_SENT` quotations, so a rejected quote cannot later be accepted.
- **Expected behavior:** Ask the customer to confirm the decline, state that the quotation will be marked declined and cannot be accepted, and let them return without submitting.
- **Recommended solution:** Reuse the keyboard-managed customer confirmation dialog with a visibly destructive action style; keep the existing response endpoint and state transition unchanged.
- **Reusable component affected:** `QuotationResponse`, `ClientActionConfirmation`.
- **Evidence:** `apps/web/src/features/customer-account/QuotationResponse.tsx`; `apps/web/src/components/ClientActionConfirmation.tsx`; `apps/api/src/quotes/quotation-acceptance.service.ts`.
- **Implementation status:** The decline action now opens the shared confirmation dialog with the consequence copy; its confirm button and icon use a danger treatment, with a visible “Keep reviewing” cancel action before it. Confirming still calls the existing `REJECT` response, while cancelling, closing, or pressing Escape returns without submitting. The dialog actions stack at phone widths and meet the 44 px touch target. The local account has no unexpired quotation, so this new quote-specific path could not be exercised in the live preview; component behavior is covered by the shared dialog's existing keyboard/focus workflow.

### 34. Customer order cards repeated the section heading level

- **Severity:** Low
- **Area:** Customer
- **Page/component:** Account quotations → Your orders → order cards
- **Problem:** Each order number used an `h2`, the same level as the parent “Your orders” section.
- **Current behavior:** The rendered account tree exposed “Your orders” and each order number as sibling level-two headings, even though each order card is nested inside that section.
- **Expected behavior:** Keep “Your orders” at level two and expose each order number as a level-three heading.
- **Recommended solution:** Change the order-card title to `h3` and preserve its existing visual size and wrapping styles.
- **Reusable component affected:** Customer `OrderCard`.
- **Evidence:** `apps/web/src/pages/CustomerAccountContent.tsx`; `apps/web/src/customer-portal.css`; live account quotations accessibility tree.
- **Implementation status:** Changed the `OrderCard` order number to `h3`; the card CSS selector keeps its existing 15 px size and line-height. After refresh, the live accessibility tree reports “Your orders” as `h2` and each order number as `h3`.

## Consistency audit by interaction

### 35. Operational report date filters require a separate Apply action

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Operational reports → date range
- **Problem:** After choosing a valid From and To date, staff must press “Apply dates” to update the report, unlike the immediate filter behavior used elsewhere in the application.
- **Current behavior:** A complete valid range applies on input change; incomplete or reversed ranges show validation guidance. CSV export remains a separate action.
- **Expected behavior:** Update the report as soon as both dates are present and form a valid range, with no extra filter button.
- **Recommended solution:** Commit a valid changed range on date input changes; retain the current report and show a concise validation hint when a partial or reversed range is entered. Keep CSV export as a separate action.
- **Reusable component affected:** `OperationalReports` date filter.
- **Evidence:** `apps/admin/src/features/reports/OperationalReports.tsx`; local preview confirmed changing From updates the selected range in the URL immediately.
- **Implementation status:** The Apply dates button is removed. A valid From/To pair updates the URL and report immediately when either date changes; incomplete/reversed pairs show validation guidance, and CSV export remains separate. Desktop local preview confirmed that changing From from 2026-10-01 to 2026-10-02 immediately changed the URL to the selected range with no filter button present; the original range was restored.

### 36. Storefront mobile navigation does not expose or dismiss its open state accessibly

- **Severity:** Medium
- **Area:** Storefront
- **Page/component:** Shared header → mobile navigation panel (`Header`)
- **Problem:** The menu toggle does not announce whether the link panel is expanded or identify the controlled panel. Pressing Escape while focus is inside the open panel does not close it or return focus to the toggle.
- **Current behavior:** The menu opens and closes by pointer; selecting a link closes it. Keyboard users receive no expanded/collapsed state and cannot dismiss the panel with Escape.
- **Expected behavior:** Expose the toggle’s expanded state and controlled navigation panel. Escape closes the panel and restores focus to its toggle without trapping navigation focus.
- **Recommended solution:** Add `aria-expanded` and `aria-controls`, give the mobile link panel an ID and navigation label, and register a scoped Escape handler that closes the panel and focuses the toggle.
- **Reusable component affected:** Storefront `Header` mobile navigation.
- **Evidence:** `apps/web/src/components/Header.tsx`; mobile menu toggle currently has only a generic label and the panel has no ID or Escape handler.
- **Implementation status:** The toggle exposes `aria-expanded` and `aria-controls`, and the controlled panel remains in the tree while hidden with a labeled navigation landmark. Live 320 px review confirmed the open menu exposes all links, Escape closes it, and focus returns to the toggle; the 1440 px accessibility tree correctly omits the CSS-hidden mobile controls. Web TypeScript and whitespace checks pass.

### 37. Cross-application filter controls should not add a separate apply step

- **Severity:** Medium
- **Area:** Storefront / Customer / Admin
- **Page/component:** Storefront marketplace and content directories, customer quotation list, admin customer/follow-up and supplier lists, RFQs, procurement, catalogue, recent activity, audit log, notifications and operational reports
- **Problem:** A filter can feel unresponsive when a user must choose criteria and then perform a second Apply/Filter action. This pattern should be consistent across all filter surfaces, not just Notifications.
- **Current behavior:** Source review found ordinary filters apply on change across the storefront and admin, including status controls, select filters, local search/filter controls and the supplier list refinement controls. Audit Log and Notifications already apply criteria immediately; Operational Reports refreshes once its date pair is valid. Text searches that submit a query to a remote endpoint (supplier directory and customer/follow-up search) are separate search actions, not filter-apply buttons. Storefront search navigation and CSV export remain independent actions.
- **Expected behavior:** Ordinary filters update results when a value changes, reset pagination when needed, and expose clear/reset options without an extra Apply/Filter button. Paired date ranges update when valid and retain guidance for invalid/incomplete ranges.
- **Recommended solution:** Keep one change-driven filter pattern across storefront, customer account and admin; preserve explicit actions only for distinct searches, navigation, exports or mutations.
- **Reusable component affected:** Storefront and admin filter bars, native selects, status chips, date range controls.
- **Evidence:** `apps/web/src/pages/MarketplacePage.tsx`; `apps/web/src/pages/BusinessContentPages.tsx`; `apps/web/src/pages/CustomerAccountContent.tsx`; `apps/admin/src/features/customers/CustomerFollowupWorkspace.tsx`; `apps/admin/src/features/suppliers/SupplierManagement.tsx`; `apps/admin/src/features/sales/SalesOperations.tsx`; `apps/admin/src/features/procurement/ProcurementWorkspace.tsx`; `apps/admin/src/features/overview/RecentActivity.tsx`; `apps/admin/src/features/catalogue/CatalogueManager.tsx`; `apps/admin/src/features/audit/AuditLog.tsx`; `apps/admin/src/features/notifications/NotificationStatus.tsx`; `apps/admin/src/features/reports/OperationalReports.tsx`.
- **Implementation status:** Cross-surface source audit complete. A follow-up scan of every filter/select/date field and UI submit form found no additional ordinary filter-apply button beyond the already removed Notification, Audit Log, and Operational Reports actions. Storefront topic/service filters, account quote filters, admin customer/follow-up status, recent activity, catalogue, supplier refinements, RFQ, procurement, audit and notification criteria apply on change. Paired report dates update once valid. The Customer/Follow-up Search and supplier-directory Search buttons submit distinct list queries; reset/clear and CSV export controls also remain separate because they perform their named actions. No backend/API behavior changed.

### 38. Admin mobile navigation does not close on Escape

- **Severity:** Low
- **Area:** Admin
- **Page/component:** Admin shell → mobile top menu (`AdminWorkspaceLayout`)
- **Problem:** At 320 px the native details menu opens and exposes its state and named navigation controls, but Escape leaves it open.
- **Expected behavior:** Escape closes the open menu and restores focus to its summary toggle.
- **Recommended solution:** Handle Escape on the scoped menu, close its native details element, and focus the summary; keep normal link navigation and pointer toggling unchanged.
- **Reusable component affected:** Admin shell mobile navigation.
- **Evidence:** `apps/admin/src/components/AdminWorkspaceLayout.tsx`; live 320 px interaction review.
- **Implementation status:** Added a scoped Escape handler that closes the native details menu and returns focus to its summary. Live 320 px keyboard review opened the menu, pressed Escape, and confirmed the menu collapsed and focus returned to “Toggle admin menu”; navigation links and selected state remain available when open.

### 39. Experts directory filtered-empty state has no direct recovery action

- **Severity:** Low
- **Area:** Storefront
- **Page/component:** Experts directory (`ExpertsPage`)
- **Problem:** When search, service or PIN-code criteria produce no matches, the directory only displays a passive sentence. Screen readers are not told that the result count changed, and users must manually clear each field.
- **Current behavior:** The directory renders “No providers match these filters.” without a live status role or clear action. Its default no-provider state is separate.
- **Expected behavior:** Announce the no-match result without moving focus and offer a single action that clears the search, service and PIN-code criteria.
- **Recommended solution:** Render the filtered-empty message in a polite status region with a Clear filters control wired to the existing local state setters. Keep the no-providers-yet state unchanged.
- **Reusable component affected:** Storefront filtered empty state and directory filter controls.
- **Evidence:** `apps/web/src/pages/BusinessContentPages.tsx`; `.business-content-empty` in `apps/web/src/App.css`.
- **Implementation status:** The no-match branch now uses `role="status"` and provides a single Clear filters action that clears search, service and PIN-code values. The separate no-providers-yet message is unchanged. Live local preview entered a non-matching search, exposed the no-match message and recovery button, then restored all five provider cards with one click. Web typecheck passes.

### 40. Several admin loaded-empty states are not announced consistently

- **Severity:** Low
- **Area:** Admin
- **Page/component:** Overview analytics, Recently Deleted, catalogue/partner brands, supplier ratings, discount rules, transportation plans, procurement matching, homepage category editor and custom sections
- **Problem:** Several no-data messages appear after a successful load but are plain text, so assistive technology may not announce that an empty result or data state has appeared. One supplier rating empty state also needs to be distinguished from the adjacent error alert.
- **Current behavior:** Some already-correct admin lists use `role="status"`, while several dashboard and nested module states render without a live-region role. Recently Deleted begins with `busy=false` before its initial request effect, so it can briefly show “Nothing to recover” before loading starts. The discount and transportation views receive an empty array while another section is loading; they need to distinguish loading from an actually empty loaded list. Supplier rating load failures use `role="alert"`; the no-rating branch is separate but silent.
- **Expected behavior:** Announce expected loaded-empty states politely without moving focus; keep request failures in alert regions and leave static explanatory copy in record details unchanged.
- **Recommended solution:** Add polite status semantics to dynamic loaded-empty messages; explicitly show loading before the first result arrives in Recently Deleted, discount rules and transportation plans. Do not change API behavior, result conditions, or empty-state wording.
- **Reusable component affected:** Admin `EmptyState` and async status patterns.
- **Evidence:** `apps/admin/src/features/overview/WorkspaceOverview.tsx`; `apps/admin/src/features/trash/RecentlyDeleted.tsx`; `apps/admin/src/features/suppliers/SupplierManagement.tsx`; `apps/admin/src/features/suppliers/SupplierProducts.tsx`; `apps/admin/src/features/discounts/DiscountRules.tsx`; `apps/admin/src/features/business/BusinessConsole.tsx`; `apps/admin/src/features/catalogue/CatalogueManager.tsx`; `apps/admin/src/features/catalogue/PartnerBrandsManager.tsx`; `apps/admin/src/features/procurement/CustomerRfqSourcing.tsx`; `apps/admin/src/features/procurement/ProcurementRequestCard.tsx`; `apps/admin/src/features/content/HomepageCategoryImages.tsx`; `apps/admin/src/features/content/HomepageContentBlocks.tsx`; `apps/admin/src/features/sales/SalesOperations.tsx`.
- **Implementation status:** Added polite status semantics to loaded no-data results in overview analytics, catalogue and partner-brand lists, supplier rating views, procurement matching, homepage editor states and sales analytics. Recently Deleted now starts in a loading state and announces either loading or a true empty result after the request resolves. Discount rules receive a section-loaded flag so their directory distinguishes initial loading from a genuinely empty list; transportation plans use the same loaded-section state. Error branches remain alerts; no API or data behavior changed. Admin typecheck and `git diff --check` pass.

### 41. Product detail metadata and title collapse into narrow columns on phones

- **Severity:** High
- **Area:** Storefront
- **Page/component:** Product detail (`ProductDetailSurface`) at 320 px
- **Problem:** The product summary keeps an overly narrow side-by-side composition at the smallest phone width. Category/SKU metadata and brand identity collapse into thin columns, and the product title wraps almost one word per line.
- **Current behavior:** A live 320 px preview shows the content contained without horizontal overflow, but title and metadata are too compressed to scan comfortably.
- **Expected behavior:** At narrow phone widths, preserve an intentional reading order with a legible product title, readable brand/SKU details, product image and selection controls at usable widths.
- **Recommended solution:** Recompose the product summary as a single-column mobile layout at a deliberate breakpoint; allow compact metadata to wrap by field rather than squeezing each value into a narrow track. Preserve product selection, price and add-to-list behavior.
- **Reusable component affected:** Shared `ProductDetailSurface` and its responsive CSS.
- **Evidence:** `packages/storefront-ui/ProductDetailSurface.tsx`; `packages/storefront-ui/product-detail-surface.css`; local product detail at 320 px.
- **Implementation status:** The named inline-size query previously targeted the product card itself, so its 320 px single-column rule could not recompose that card. A wrapper now owns the query container. Live storefront checks at 320, 375, 768, 1024, 1280, 1440 and 1920 px show balanced columns at desktop widths and a readable stacked layout through tablet width, with no page-level overflow. Admin Product page preview now also renders and was visually reviewed at desktop and phone sizes; routerless preview labels remain non-interactive (see finding #42).

### 42. Admin product-page preview crashes on router-dependent links

- **Severity:** High
- **Area:** Admin / Shared
- **Page/component:** Products & pricing → private storefront preview → Product page (`ProductDetailSurface`)
- **Problem:** Switching the private preview from Marketplace card to Product page replaces the preview with the feature error boundary.
- **Current behavior:** A live reproduction logs `TypeError: Cannot destructure property 'basename' of useContext(...) as it is null` in React Router `LinkWithRef`. The admin preview is rendered outside router context, while the shared surface always renders router links for Shipping, FAQs, and the return policy.
- **Expected behavior:** The private product preview renders without leaving the editor or saving the draft; its navigation-only links remain inert in the non-interactive admin preview. The storefront detail continues using client-side links.
- **Recommended solution:** Use router links when the shared surface is inside router context and render navigation labels as static preview text when rendered in the routerless admin preview. Preserve ordinary storefront links and preview-disabled product controls.
- **Reusable component affected:** Shared `ProductDetailSurface` and admin catalogue preview.
- **Evidence:** `packages/storefront-ui/ProductDetailSurface.tsx`; `apps/admin/src/features/catalogue/CatalogueManager.tsx`; local admin Product page preview; React console stack from 2026-10-20.
- **Implementation status:** Shared `SurfaceLink` now uses React Router links inside the storefront router and static text in the routerless private preview. The admin preview was reproduced after the fix at desktop and mobile sizes; Product page renders with preview controls disabled, Shipping/FAQ/Returns labels do not navigate, and the recovered product draft remains unsaved. Storefront product detail still renders all three links as client-side anchors and reports no runtime errors. Web and admin typechecks and `git diff --check` pass.


| Interaction | Current pattern | Consistency assessment | Canonical direction |
|---|---|---|---|
| Create / Add | Primary buttons appear in shell headers, feature headings, local section bars, or near list content; labels vary between Add, Create, New, Record and Open | Medium inconsistency across admin modules | One primary action at the page/list header; use domain noun plus verb and use “Add” for a new catalogue entity only where it matches user vocabulary |
| Edit / View | Detail navigation, inline forms, cards and row buttons coexist | Medium | Row title opens detail; explicit Edit action appears in the same row action area; detail has stable Back and Edit actions |
| Delete / Disable / Archive | Some use confirmation helpers/dialogs; others use inline actions or distinct labels such as Disable/Delete | Medium, higher impact due to destructive intent | Visually destructive styling; explicit object name and consequence in confirmation; place cancel before destructive confirmation action |
| Save / Cancel | Form footers vary in alignment and order | Medium | Group at the end of each form section; secondary Cancel before primary Save; primary label reflects operation and loading state |
| Search / Filter / Sort | Feature-specific search and filter controls; tables vary in ordering and reset cues | Medium | Search first, filters next, date range where relevant, secondary/export actions last; show active filters and clear/reset affordance |
| Status change / Approve / Reject | Workflow-specific select, pill, inline action or dialog | Medium | Show current state and next action distinctly; use semantic status tokens and confirmation for consequential transitions |
| Upload / Import / Export / Download / Print | Actions live near the relevant record/editor, with varying icon and label treatment | Low to medium | Keep action adjacent to its data; use icon with text for primary/rare actions and labeled tooltips only for repeated compact row actions |
| Back / Close | Back links/buttons, dialog X controls and browser history are used across modules | Medium | Prefer labeled Back for page-level navigation, X for dismissible overlays with accessible name, and preserve unsaved-change guard behavior |

**Dialog implementation status:** Website-editor, partner-brand, supplier-rating, quotation-send, quotation-comparison and discount-rule-delete confirmations use the shared admin confirmation surface or dialog manager. Discount deletion no longer stacks a browser `window.confirm` with the admin modal. Escape now dismisses the catalogue add chooser and supplier-match dialog, keeps users in the partner-brand editor from its discard confirmation, cancels quotation-send confirmation only when no send is in progress, and returns the supplier-rating discard prompt to the rating editor. The catalogue product editor Escape path respects its unsaved-change prompt and preview state. Live checks confirmed the catalogue chooser and supplier matcher close on Escape and focus returns to each opener; the product editor preserves unsaved changes when the discard prompt is dismissed with Escape, then cleans its temporary recovery draft when explicitly discarded. The supplier-rating editor opens its unsaved-change confirmation on Escape, preserves the draft when “Keep editing” is selected, and discards the temporary change only after explicit confirmation; the saved rating remained unchanged. In the quotation editor, the PDF preview closes on Escape and returns focus to “Preview customer PDF”; the comparison prompt also closes on Escape and restores focus to “Compare another brand,” without saving or sending the local draft. The supplier-product recoverable-delete confirmation names the record and 30-day restore period; keyboard review confirmed focus starts on Cancel, cycles within the native modal, and returns to Delete product after Escape. The confirmation was cancelled and the saved record stayed unchanged. Other nested dialog workflows and responsive visuals remain under review.

**Also verified:** the Recently Deleted restore confirmation names the selected product and its recovery deadline. At 320 px the text and both actions remain contained in the viewport. Focus starts on Cancel; Escape closes without restoring and returns focus to that row's Restore action. The 98-record recovery list remained unchanged.

## Audit limits and next verification

- This report is based on source/style inspection and representative live checks; it does not assert full runtime accessibility conformance or final visual quality.
- The proposed system and sequence are in the companion documents, and implementation is authorized. Continue verifying representative desktop/mobile views at all seven widths and keyboard paths through navigation, forms, tables, menus and dialogs; do not claim full coverage until every listed area has evidence.
- Do not change the home page hero canvas animation or the direction map animation/design as part of the blog or system work.

### 43. Configured delivery routes disappeared when the exact office address was blank

- **Severity:** Medium
- **Area:** Storefront
- **Page/component:** Home and Contact service-area map (`DirectionGoogleMaps`)
- **Problem:** Route and region rendering was gated on an exact office address even when `contact.location` already contained configured Delhi NCR coverage. A blank address therefore hid all six region controls, route paths, pulsing locations, and animated trucks.
- **Current behavior:** The map derives routes from configured service-area coverage. When Delhi NCR is configured, all six route animations and location controls render without requiring an exact office address; address-dependent directions actions remain unavailable until an address is provided.
- **Expected behavior:** Preserve the established map artwork and animation while showing all configured regions and routes independently of optional address details.
- **Recommended solution:** Keep the route list driven by `contact.location`; do not gate it on `contact.officeAddress` or change the protected map artwork, palette, or animation.
- **Reusable component affected:** `DirectionGoogleMaps`.
- **Evidence:** `apps/web/src/components/DirectionGoogleMaps.tsx`; local storefront live preview showed the six region controls, route paths, and moving trucks after the condition was removed.
- **Implementation status:** Removed the office-address condition from route selection. The local preview confirms Delhi, Noida, Greater Noida, Gurugram, Ghaziabad, and Faridabad controls and animated trucks are visible. Map artwork and animation definitions were not changed.

### 44. Overview card actions interrupt the heading and description

- **Severity:** Low
- **Area:** Admin
- **Page/component:** Workspace Overview → “Today’s work” card
- **Problem:** “View customers” and “Record an enquiry” sit between the card heading/description and its supporting copy, leaving a large visual break and separating the actions from the section title.
- **Current behavior:** The buttons share the card’s top row with its heading/intro, aligned to the upper-right. At 375 px they wrap below the intro and remain inside the card.
- **Expected behavior:** Keep the heading and intro together at the left, with both actions grouped in the card’s upper-right corner.
- **Recommended solution:** Place the heading/intro and action group in a responsive card header; let the action group wrap below the title on narrow screens.
- **Reusable component affected:** Admin overview card header/action alignment.
- **Evidence:** User-provided desktop screenshot of the Overview “Today’s work” card; `apps/admin/src/features/overview/WorkspaceOverview.tsx`.
- **Implementation status:** Moved both actions into the responsive card-header row. Desktop and 375 px local previews confirm the actions remain visible and contained; both existing handlers are preserved.

### 45. Blog cards replace admin-managed featured images with generated artwork

- **Severity:** Medium
- **Area:** Storefront / content management
- **Page/component:** `/blogs`, `/blogs/:slug`, related article cards
- **Problem:** Published posts that use the shared editorial image URL saved through Blog Management are rendered with topic-derived, hardcoded `JournalArtwork` instead. The admin editor saves `featuredImageUrl`, and the public API returns it, but the storefront explicitly rejects `/images/materials-editorial.*` as non-specific and generates decorative art from each post title. This makes public article visuals diverge from the content controlled in admin.
- **Expected behavior:** Display the exact featured image configured for each post in admin whenever the URL is present. A missing URL should use a quiet neutral media placeholder, never topic-specific generated artwork.
- **Recommended solution:** Remove title-derived journal-cover generation from public blog cards, details and related links. Render the API’s `featuredImageUrl` directly, with the existing image-failure fallback behavior; use a neutral empty media surface only when no URL is configured.
- **Reusable component affected:** Blog image rendering in `BusinessContentPages` and journal media styles.
- **Evidence:** User screenshots of `/blogs` show “PPC or OPC cement,” “Waterproofing,” and “Electrical” cards with generated title/topic artwork. `BlogManagementPanel` saves `featuredImageUrl`; `PublicBlogsController` selects and returns it; `BusinessContentPages` replaces the shared URL through `hasSpecificJournalImage` and `JournalArtwork`.
- **Implementation status:** Removed topic-derived `JournalArtwork` and its styles. Live `/blogs` cards render the saved `featuredImageUrl`; the admin editor shows `/images/materials-editorial.png` for both the cement and waterproofing posts, matching the shared editorial photo seen on the storefront. This confirms the image is content-managed, and the current repeated image comes from the saved CMS value rather than topic artwork. Missing URLs use a neutral media surface. Routes/API fields and SEO metadata are unchanged; web typecheck passes.

### 46. Mobile marketplace-card preview collapses inside the simulated phone

- **Severity:** High
- **Area:** Admin
- **Page/component:** Products & pricing → private storefront preview → Marketplace card (`CatalogueManager`)
- **Problem:** The mobile preview can show a very narrow product card with overlapping stock badge, product image and details, even though the simulated phone has enough width for a normal card.
- **Current behavior:** The card-grid centering rule changes the mobile preview grid to flex at desktop viewport widths. Its generic four-column card basis then applies inside the simulated phone because responsive media queries are based on the editor viewport, not the preview device width.
- **Expected behavior:** The mobile preview should show one comfortably wide, full-width marketplace card inside the phone frame at any editor viewport width, with the image, availability, title and actions in their intended order.
- **Recommended solution:** Scope the mobile preview grid to a single-column grid (and full-width card) independently of the editor's viewport media queries; keep desktop preview grid behavior unchanged.
- **Reusable component affected:** Admin `CatalogueManager` preview and catalogue preview styles.
- **Evidence:** `apps/admin/src/features/catalogue/CatalogueManager.tsx`; `apps/admin/src/features/catalogue/catalogue-manager.css`; user screenshot dated 2026-10-20.
- **Implementation status:** Added a preview-device-scoped single-column grid and full-width card rule, so the desktop centering flex basis cannot shrink the mobile card. Desktop preview rules are unchanged. Live admin preview of Shree OPC 53 Grade Cement at desktop editor width confirmed the mobile card fills the phone frame and its image, stock, details and actions no longer collide; no product changes were saved.

### 47. Admin storefront preview diverges from live marketplace product cards

- **Severity:** High
- **Area:** Storefront / Admin
- **Page/component:** Marketplace product cards and Products & pricing → private storefront preview (`MarketplacePage`, `CatalogueManager`)
- **Problem:** The admin preview hand-builds a second version of the marketplace card. Its actions are all outlined and it shows a phone-call icon where the storefront shows an orange primary options action and a green WhatsApp action. The card's information layout and brand presentation also differ, so staff cannot trust the preview to represent the published card.
- **Current behavior:** Both surfaces render the shared `MarketplaceProductCard` and `ProductDetailSurface`. The card CSS still had a storefront-only override stack, and the detail preview used a separate quantity/action arrangement with a different disabled style, so shared markup alone did not guarantee a matching preview.
- **Expected behavior:** The marketplace card preview in admin uses the same card component and visual styles as the storefront, including the WhatsApp action when configured; card details and actions must not drift between surfaces. Keep navigation, variant selection, gallery, and quantity controls usable in preview while keeping cart submission and saving private.
- **Recommended solution:** Keep card markup, appearance, and responsive dimensions in the shared storefront UI package. Admin should only pass preview-safe action state and simulated viewport mode; its own CSS should control the frame and catalogue context, not card internals.
- **Reusable component affected:** Shared `MarketplaceProductCard`, marketplace card styles, `MarketplacePage`, and `CatalogueManager`.
- **Evidence:** User screenshots dated 2026-10-20 show the storefront WhatsApp action and orange options action beside the admin preview's phone-call and outlined actions; `apps/web/src/pages/MarketplacePage.tsx`; `apps/admin/src/features/catalogue/CatalogueManager.tsx`.
- **Implementation status:** `MarketplaceProductCard` owns the card presentation for both the storefront and admin preview; the preview passes its simulated viewport into the shared component. It maps the selected variant’s code, image, specification, option label, price/MRP, offer, stock and MOQ. `ProductDetailSurface` receives the brand mark, FAQs/returns policy, variant gallery and quantity breaks. Preview variant buttons, attribute dropdowns, quantity and gallery controls are interactive and update the selected SKU, image, price, availability, offer and MOQ; cart submission remains private and inert. Option construction and matching now follow the live product page and include all variants. Browser QA confirmed selecting 10L updates SKU, price/MRP, offer, stock/MOQ and action state; the color dropdown opens, and its duplicate admin caret was removed. Monorepo typecheck and `git diff --check` pass. No product was saved.

### 56. Private catalogue preview omits variant content and product-page details

- **Severity:** High
- **Area:** Admin
- **Page/component:** Products & pricing → private storefront preview (`CatalogueManager`, `MarketplaceProductCard`, `ProductDetailSurface`)
- **Problem:** The preview uses the shared storefront components but was passing only product-level values. Variant-driven catalogues therefore lost the size/specification badge, option label, selected option SKU/image/price/offer/availability/MOQ and sometimes showed the wrong fallback price. The product page preview omitted the storefront brand mark, public FAQ/returns content, selected-variant gallery and quantity-break pricing.
- **Expected behavior:** Preview the same product variant content and supporting detail sections that customers see on the live marketplace/product page. Keep card navigation, option selection, gallery and quantity interactive; keep cart submission and unsaved edits private.
- **Recommended solution:** Pass variant-derived data to the shared card and detail surfaces using the same field precedence as the storefront; feed public site content to the existing FAQ and policy props.
- **Reusable component affected:** `CatalogueManager`, shared `MarketplaceProductCard`, shared `ProductDetailSurface`.
- **Evidence:** User screenshots dated 2026-10-20 show the missing `1L` specification and outlined `OPTION` value; comparison with `MarketplacePage` and `ProductDetailPage` field mappings found the omitted variant and support data.
- **Implementation status:** Added storefront-equivalent selected-variant card mapping for code, image, compact specification, option label, price/MRP, offer, availability and MOQ. Added interactive variant selection with no option limit, synchronized image/quantity updates, shared brand logo and gallery, quantity breaks, FAQs and published returns policy. Product detail now suppresses a photo banner when the same offer already appears in its price panel, while marketplace offer banners stay visible. Removed the extra admin disclosure caret. Browser preview confirms the 10L choice updates SKU, price/MRP, offer, stock, MOQ and action state; `git diff --check` and monorepo typechecks pass. No product was saved.

### 55. Admin preview visually marks the edited product unlike the storefront

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Products & pricing → private storefront preview → Marketplace card (`CatalogueManager`)
- **Problem:** The current product gets an orange outline and neighboring cards are dimmed in the admin preview, even though these emphasis styles are absent from the public marketplace.
- **Current behavior:** Shared card markup and actions match the storefront, but preview-only CSS adds a border/outline/shadow to the edited card and reduces context-card opacity.
- **Expected behavior:** Every preview card uses the same appearance as its storefront counterpart; the private preview may keep scroll and responsive context hooks without changing card presentation.
- **Recommended solution:** Remove preview-only visual emphasis from shared-card context classes while keeping them available for scroll positioning and layout.
- **Reusable component affected:** Shared `MarketplaceProductCard` and admin catalogue preview styles.
- **Evidence:** Live local admin preview of Shree OPC 53 Grade Cement shows the configured WhatsApp action and orange options button alongside an admin-only orange card outline and faded context cards; the storefront marketplace does not show those treatments.
- **Implementation status:** Removed the admin-only outline, border/shadow emphasis, and reduced opacity. Kept the context classes for preview layout and scrolling. Live admin preview now shows identical marketplace-card actions across the edited and neighboring cards: outlined details, white-on-orange options, and configured WhatsApp. The live storefront uses the same actions. Admin/web typechecks and `git diff --check` pass; no product data was saved.

### 48. Operational report empty rows lack polite status semantics

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Operational Reports → record tables and status summaries (`OperationalReports`)
- **Problem:** Empty report tables and status-summary cards display no-data copy as plain cells or paragraphs, so assistive technology may not announce a newly loaded empty report state.
- **Current behavior:** Orders, quotations, procurement requests, purchase orders, delivery plans and status-summary groups display empty text without a live status region.
- **Expected behavior:** Keep the table/card layout and copy, while exposing each asynchronously loaded empty state as a polite status.
- **Recommended solution:** Wrap table empty-state copy in a `role="status"` element and mark the status-summary empty paragraphs similarly.
- **Reusable component affected:** Admin Operational Reports empty states and shared feedback semantics.
- **Evidence:** `apps/admin/src/features/reports/OperationalReports.tsx`, empty branches for report rows and status groups; source scan performed during the application-wide feedback-state audit.
- **Implementation status:** Added nested `role="status"` messages inside the five report table empty cells and to both status-summary empty messages, preserving table semantics and the existing layout. Admin TypeScript check and `git diff --check` pass; live announcement behavior still needs a screen-reader pass.

### 49. Customer dashboard quotation and order empty states are not announced

- **Severity:** Medium
- **Area:** Customer
- **Page/component:** Account dashboard → quotations and orders (`CustomerAccountContent`)
- **Problem:** The customer dashboard displays filtered-empty quotation results and the “no quotation/no orders yet” states as ordinary content after account activity loads, without a polite live status.
- **Current behavior:** The empty panels retain helpful explanation and the quotation filter recovery action, but assistive technology may not announce their appearance after asynchronous data loading or filter changes.
- **Expected behavior:** Preserve each panel and its recovery action while announcing loaded-empty results politely.
- **Recommended solution:** Add `role="status"` to the existing quotation and order empty-state containers; do not move focus or change account behavior.
- **Reusable component affected:** Customer account dashboard empty-state feedback.
- **Evidence:** `apps/web/src/pages/CustomerAccountContent.tsx`, quotation and order empty branches; cross-application empty-state sweep.
- **Implementation status:** Added polite `role="status"` regions to the filtered-empty quotation state, the no-quotation-yet state, and the no-orders-yet state. Existing copy and filter-recovery button remain in place; no focus or data behavior changed. Web typecheck and `git diff --check` pass. Live announcement behavior still needs a screen-reader pass.

### 50. Dynamic search and catalogue-picker empty results are not consistently announced

- **Severity:** Medium
- **Area:** Storefront / Admin / Shared
- **Page/component:** Storefront SearchSuggestions and MaterialCartFinder; admin SupplierCataloguePicker and QuoteEditor suggestion lists
- **Problem:** Several results panels replace matching suggestions with a no-match message after typing or changing a picker selection, but render that update as ordinary text.
- **Current behavior:** The home/search suggestions, material-list finder, supplier category picker, and quotation product suggestions show useful fallback text and actions, but no polite live status marks the update.
- **Expected behavior:** Announce the no-match result politely while retaining the search, selection, and custom-item actions.
- **Recommended solution:** Add a polite status region only to the settled no-match result, not while loading; keep current controls and matching behavior unchanged.
- **Reusable component affected:** Search suggestion empty feedback and catalogue picker/quotation result states.
- **Evidence:** `apps/web/src/components/SearchSuggestions.tsx`; `apps/web/src/components/MaterialCartFinder.tsx`; `apps/admin/src/features/suppliers/SupplierCataloguePicker.tsx`; `apps/admin/src/features/sales/QuoteEditor.tsx`.
- **Implementation status:** Added polite status semantics to settled no-match messages in storefront `SearchSuggestions` and `MaterialCartFinder`, the admin supplier category picker, both quotation product-suggestion lists, and Global Admin Search. The global search listbox now contains only options, with loading/empty feedback outside the listbox. Existing search-anyway/custom-material actions and match behavior are unchanged; loading is not mislabeled as a no-match. Runtime screen-reader announcement behavior still needs review.


### 51. Nested supplier and customer history empty states are not announced

- **Severity:** Low
- **Area:** Admin
- **Page/component:** Business Management → supplier detail and procurement comparison; Customers → customer request and quotation history
- **Problem:** Several loaded detail panels render expected empty states as plain text, so assistive technology may not announce that the asynchronous detail data resolved with no products, quotations, orders, deliveries, or service PINs.
- **Current behavior:** Supplier product/service-area panels and customer history panels show “none yet” copy after their parent records load, but the messages do not expose a status role.
- **Expected behavior:** Announce loaded empty detail states politely while preserving their card, paragraph, and workflow structure.
- **Recommended solution:** Add nested `role="status"` to only the no-record messages; do not change the surrounding articles, details, forms, or actions.
- **Reusable component affected:** Supplier detail, procurement supplier comparison, and customer history empty feedback.
- **Evidence:** Source review of `SupplierProducts`, `ProcurementRequestCard`, and `CustomerFollowupWorkspace`.
- **Implementation status:** Added polite status semantics to the loaded no-product supplier panel, no-service-PIN message, and customer history messages for missing quotations, orders, deliveries, and requests. Existing copy, panel structure and actions remain unchanged. Admin typecheck and `git diff --check` pass; runtime screen-reader announcement behavior remains to be reviewed.


### 52. Shared marketplace preview lost admin card context behavior

- **Severity:** Medium
- **Area:** Admin
- **Page/component:** Products & pricing → private Marketplace card preview (`CatalogueManager`, `MarketplaceProductCard`)
- **Problem:** The preview still queries legacy CSS hooks to scroll the selected listing into view and hide adjacent context cards in the phone simulator, but the shared card markup does not currently receive those hooks.
- **Current behavior:** Shared visual styling is correct, but the selected-card scroll target can be missing and mobile context cards can ignore the hide rule.
- **Expected behavior:** Keep the selected product distinguishable to preview logic and preserve the existing responsive context-card behavior while rendering the exact shared card.
- **Recommended solution:** Allow an optional outer class hook on `MarketplaceProductCard`; pass the existing selected/context classes from the admin preview. Keep those hooks out of the shared visual styling.
- **Reusable component affected:** `MarketplaceProductCard` and catalogue preview context.
- **Evidence:** `CatalogueManager` queries `.store-preview-current-product` and preview CSS scopes `.store-preview-context-product`, while the shared component previously emitted only `.shared-marketplace-card`.
- **Implementation status:** Added an optional class hook to the shared card and passed the selected/context classes in the admin preview. Live desktop and phone-frame previews confirm the selected card remains in view, context cards are hidden on mobile, and the full-width card retains the shared storefront actions without extra preview emphasis. Admin and storefront typechecks pass; no product was changed or saved.


### 53. Marketplace desktop grid makes product cards too narrow

- **Severity:** Medium
- **Area:** Storefront
- **Page/component:** `/marketplace` product grid (`MarketplacePage`, `MarketplaceProductCard`)
- **Problem:** The wide-desktop grid uses five columns, which compresses product names, variant labels, pricing metadata, and card actions into narrow cards. The user asked for cards to be made wider and shaped for readable details, not merely fit more into the row.
- **Current behavior:** Above 1350 px the storefront renders five cards per row; tablet and phone rules reduce this to four, three, two, then one at smaller widths.
- **Expected behavior:** Use wider cards with enough room for readable titles, details, and actions while keeping the catalogue responsive.
- **Recommended solution:** Limit wide desktop to four cards per row, retain the existing intermediate breakpoints, and confirm the card composition at 1440 and 1920 px.
- **Reusable component affected:** `MarketplaceProductCard` and marketplace product-grid layout.
- **Evidence:** `apps/web/src/App.css` set five columns in both the grid declaration and a later flex-card basis, so changing only the grid did not alter rendered cards. The live marketplace showed five narrow cards across its desktop viewport.
- **Implementation status:** Wide-desktop marketplace results now use four cards per row; three, two, and one-column breakpoints remain for smaller widths. Removed the redundant 1350 px four-column override. After a hard refresh, the live local marketplace visibly renders four wider cards, with product titles, option labels and actions using more horizontal space. Web typecheck and `git diff --check` pass.


### 54. Embedded Blog workspace repeats the active section heading level

- **Severity:** Low
- **Area:** Admin
- **Page/component:** Business Management → Blogs → Articles/write/edit/preview (`BusinessConsole`, `BlogManagementPanel`)
- **Problem:** The embedded workspace presents `Business Management` as the page `h1`, `Blogs` as an `h2`, and the nested `Articles` content title as another `h2`. This skips the heading level that expresses the nested content hierarchy.
- **Current behavior:** The embedded Blog list, write/edit form, and draft preview headings use `h3`; the standalone panel retains `h2`.
- **Expected behavior:** Embedded blog content is nested under the active Business section and uses `h3`; standalone Business Console uses its own page heading and keeps the appropriate `h2` subsection headings.
- **Recommended solution:** Render blog panel headings at `h3` only when its existing `embedded` prop is true, with CSS retaining the same visual sizing.
- **Reusable component affected:** Embedded content panel heading hierarchy.
- **Evidence:** The live local admin accessibility tree now reports `h1 Business Management` → `h2 Blogs` → `h3 Articles`. The embedded panel uses its `embedded` prop while standalone mode retains `h2`.
- **Implementation status:** Complete. `BlogManagementPanel` selects `h3` for embedded section headings and retains `h2` when used standalone; CSS preserves their established visual sizing. Admin typecheck and `git diff --check` pass.
