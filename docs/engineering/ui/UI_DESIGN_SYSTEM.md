# UI Design System Proposal

This document defines a proposed shared visual foundation and predictable patterns for the storefront, customer account, and admin workspace. Storefront and admin should share accessible controls and design tokens while keeping their different goals and layouts. Implementation has started with primary colors, focus treatment, and the blog experience; the remaining patterns below still guide the ongoing work.

## Design principles

1. Make the next useful action easy to find and name it with a clear verb.
2. Keep color and state meaning stable across pages.
3. Keep shared foundations consistent while allowing the storefront to support discovery and the admin to support dense, repeated work.
4. Provide a complete keyboard path, visible focus, clear feedback, and responsive layouts.
5. Prefer existing shared components and tokens over feature-specific copies.

## Foundations

### Color roles

Use semantic role names rather than component-specific hex values. Keep Material Square orange as the brand accent and slate as the neutral system. Reserve green, red, and amber for success, danger, and warning meanings; use orange for informational and selected interface accents.

| Role | Proposed use | Existing starting point |
|---|---|---|
| `brand-action` | Filled primary actions | Use the specified logo orange `rgb(234, 88, 12)` (`#ea580c`) with white text across storefront and admin |
| `brand-hover` | Hover/pressed fill | Use the darker orange `#c2410c` with white labels |
| `brand-selected` | Active navigation, tabs, and filter chips | Use the exact logo orange `#ea580c` with white active labels, as requested |
| `brand-subtle` | Selected chips, banners, focus-adjacent surfaces | Existing pale orange values such as `#fff7ed` / `#ffedd5` |
| `text-primary` | Headings, body and important data | Existing slate `#0f172a` |
| `text-secondary` | Supporting copy, labels, secondary table values | Slate `#475569` or darker where needed |
| `text-muted` | Metadata and helper text | Use at readable size and contrast; avoid slate 400 on white for normal text |
| `border-default` | Input/card/table boundary | Slate 200 or 300 depending on context |
| `surface-page` / `surface-raised` | Main canvas and cards | Existing slate 50 / white |
| `status-success`, `status-warning`, `status-danger`, `status-info` | Status text, icons and light-tint backgrounds | Use a dark semantic foreground plus pale background; informational accents use the brand orange, while success, warning and danger keep distinct meanings |
| `focus-ring` | Input focus halo | A soft orange shadow used alongside a visible border change; it is not the only keyboard-focus cue |
| `focus-outline` | Keyboard focus | A solid 2–3 px `#c2410c` outline with a visible offset on light surfaces; use a lighter orange on dark surfaces to retain at least 3:1 non-text contrast |

**Brand color direction:** use the specified logo orange `rgb(234, 88, 12)` (`#ea580c`), deep navy `#0f172a`, white and slate neutrals. Filled orange controls use white labels across storefront, customer account and admin. Active navigation, tabs and filter chips use white labels on the exact logo orange. Hover uses darker orange `#c2410c` with white labels. On the homepage, use deep navy for the hero surface, white for the headline, `#ea580c` for the highlighted headline and key accents, and slate-300 or lighter for supporting text. Alternate white and pale slate section surfaces, with restrained warm-orange tints and orange icons/links. This direction is applied to the homepage hero surface, supporting copy, navigation accents and CTA section; keep the hero canvas animation and direction map animation/design unchanged.

Blue and purple interface accents now use the brand orange in storefront and admin, including informational accents, product/contact/category icons, loading indicators, selected status treatments, and active admin/customer navigation. Active navigation uses a solid `#ea580c` fill with white labels and icons, changing to `#c2410c` on hover. Admin purchase-order PDFs use a pale-orange information surface, and delivery challan PDFs use an orange heading accent. Use `#fff7ed` with readable `#c2410c` foregrounds for subtle orange states. Keep navy/slate as neutral structure. Preserve supplier and partner artwork exactly as supplied, including original colors and lettering; apply orange tokens only to interface elements. Preserve the direction map’s colors and animation/design.

The latest repeat source scan across storefront, customer, admin and shared product UI found no saturated blue interface accents or blue-named UI tokens/utility classes outside the protected direction map. Existing navy/slate text and surfaces remain neutral structure, not accent colors. Live computed-style checks of the storefront homepage, marketplace, blog index and admin overview confirmed the orange palette on those rendered surfaces. Blue map artwork keeps its original colors. Supplier and partner logos retain their original artwork and colors; orange tokens apply only to interface elements.

Blog imagery is content-managed: render the `featuredImageUrl` saved through the admin editor whenever it is present, including the shared editorial image URL. Do not infer or generate topic artwork to replace a configured image. When no image is configured, use a neutral empty media surface rather than fabricated article-specific art.

Apply this foreground rule to every orange-filled control regardless of component or page: button label, icon, count badge, active tab label, and navigation action are white. At rest, use `#ea580c`; on hover, use `#c2410c` and keep the foreground white. This includes the Home search action, Browse Full Marketplace, View Material List, product/list actions, account actions, admin primary actions, workflow tabs, report filters and preview toggles. Keep orange text links on pale/white backgrounds in a darker readable orange rather than placing white text on a pale surface.

**Measured contrast:** Relative-luminance checks give white on `#ea580c` **3.56:1**, white on hover `#c2410c` **5.18:1**, dark-orange `#c2410c` on pale orange `#fff7ed` **4.88:1**, and slate `#475569` on white **7.58:1**. The exact brand-orange fill meets the 3:1 non-text UI contrast threshold and the 3:1 large-text threshold, but its white foreground does not reach 4.5:1 for normal-size text. Keep the user-specified orange and white labels; prefer bold, large labels where the layout supports them, and treat small white labels on the exact orange as a documented contrast exception unless the user approves a different foreground or fill.

Use the shared `--ms-primary` token for checkboxes, radio accents, and selected-device controls when they represent interface selection or an editable on/off setting. Keep success, warning and danger meanings in their semantic palette. Keep supplier-brand artwork unchanged, including its original colors and lettering.

Storefront and admin root styles also apply `--ms-primary` to native checkbox, radio, range and progress accents and to text selection, so browser defaults do not introduce blue UI accents. The direction map and all supplier/partner artwork retain their original colors and design.

**Implemented token mapping:** storefront `--ms-primary` / `--ms-action-orange`, admin `--ms-primary` / `--ms-action-orange`, and customer account `--ca-action-orange` use `#ea580c`; each hover token uses `#c2410c`. The admin primary token was corrected after the audit found it had still been set to the hover color.

**Focus mapping:** storefront and admin define `--focus-ring` for the soft field halo and `--focus-outline` (`#c2410c`) for visible keyboard outlines on light surfaces. Dark admin navigation uses `--focus-outline-dark` (`#fb923c`). Customer account filter tabs use the solid outline as well as the soft halo. Explicit `:focus-visible` outlines across storefront, shared components and admin styles now use one of these tokens; field halos can remain surface-specific. Feature styles must not suppress `:focus-visible` without providing an equally visible replacement. Direction-map styles are excluded from this pass to preserve the protected map design.

### Typography

- Keep Plus Jakarta Sans for display/page headings and Inter for body, controls, labels, and tables; use JetBrains Mono only for codes and technical identifiers.
- Use a consistent type scale: display/hero, page title, section title, card title, body, label, helper, metadata. Avoid local one-off sizes unless content density requires it.
- Page titles should be the only page-level `h1`; nested modules use ordered `h2` and `h3` levels. In an embedded admin workspace, the active workspace subsection is `h2` and its content view headings begin at `h3`; standalone feature pages use `h2` for their sections.
- Body copy should remain comfortable to read on a wide measure; constrain long-form legal and article content.
- Article detail pages keep the title/byline, cover and readable text column in a centered sequence on desktop and a single-column sequence on phones; fresh-load preview confirmed both compositions at 320, 768, 1440 and 1920 px, with no document overflow at any required width.
- Product-detail summaries should switch to a legible single-column reading order on narrow phones; category/SKU metadata and brand identity must wrap within their own content rather than being squeezed into side-by-side slivers. Keep the gallery, title, price, variant controls, quantity and primary action in a clear sequence.
- Metadata and helper text must remain readable at narrow sizes and maintain contrast.

### Spacing

Adopt a shared 4 px base scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Use the same names in both frontends. Typical control gap: 8–12; card padding: 16–24; section gap: 24–40. Admin may use tighter table row density than storefront cards while using the same scale.

### Radius and elevation

- Normalize to three shared radii: small controls/chips 6–8 px, cards/fields 10–12 px, large surfaces/dialogs 14–16 px.
- Use borders as the default card separation. Reserve shadows for overlays and elevated surfaces rather than applying them to every card.
- Keep a small shadow scale (subtle, raised, overlay) and one distinct drawer/modal shadow.

### Motion

- Use short, consistent transitions for hover/focus and slightly longer transitions for menus/drawers.
- Respect `prefers-reduced-motion` for decorative transitions, skeleton shimmer, reveal effects, and carousel motion.
- Preserve the existing homepage hero canvas animation and direction map visual design and animations unchanged. The map’s route and truck visibility follows configured service-region data, not whether an exact office address is supplied. The hero background, copy colors and surrounding section surfaces may use the approved logo palette.

## Shared component rules

### Buttons and actions

- Primary: one per page or form section; filled accessible brand action, clear verb and object.
- Secondary: outlined or neutral filled; for alternatives such as Cancel, Preview, Refresh, or Back.
- Tertiary: text action for low emphasis.
- Destructive: danger semantic color; never rely on red alone; confirm irreversible or high-impact operations.
- Icon-only buttons require an accessible name and a 40–44 px target where practical.
- Use consistent heights, horizontal padding, radius, icon sizing, disabled opacity/contrast, loading indicator, and hover/focus/pressed states.
- Use user-facing verbs consistently: Add, Edit, View, Save, Cancel, Delete, Restore, Approve, Reject, Assign, Export, Import, Upload, Download.

### Forms

- Place a persistent label above each input. Use placeholder text for examples, not as the only label.
- Mark required fields consistently and explain validation next to the field; focus the first invalid field on submit.
- Keep related fields in a named `FormSection`; use two columns only when field relationships and width support them, then collapse to one column on mobile.
- Give every semantic `<fieldset>` a `<legend>`; use the shared screen-reader-only utility when a visible section heading already names the group.
- Keep help text beside the field it explains. Use one error treatment across storefront, account, and admin.
- In browser-rendered native select mode, keep the chevron about 16 px from the field’s right edge; remove background-icon padding so the picker icon does not sit too far inside. Preserve extra clearance only for controls that use a custom SVG arrow.
- In browser-rendered native select mode, vertically center the selected label and picker icon within the field across storefront and admin. Component-specific padding and height must not shift the selected value toward the top edge.
- Compact selects in product/result cards should keep a single chevron inside the field, reserve only the needed icon space, and truncate long values on one line; place the field below its short label when a side-by-side label would squeeze the choice.
- Pointer focus may use the soft `--focus-ring` halo; keyboard focus must retain the solid `--focus-outline`, including in feature-specific form and search styles.
- Place Save as the primary action and Cancel as secondary, in a consistent footer at the end of the form. Show saving state and prevent accidental repeated submission.
- Give uploads progress, accepted file guidance, preview, remove/replace, and error states.

### Tables and record lists

- Use a shared `DataTable` for tabular records: clear column labels, consistent alignment, compact but readable row height, hover/focus state, status column, and stable row-action location.
- Align numeric values right; keep IDs/codes visually distinct; use badges for state, not decoration.
- Place Search first, then filters/date range, then secondary/export actions. Show active filter chips and a clear-all action when filters are active.
- Use consistent pagination and loading/empty/error states. Decide intentionally between horizontal scrolling and card conversion on small screens.
- When column meanings need to stay side by side, keep their readable minimum width and scroll inside the table wrapper rather than compressing the data or causing page-level overflow. Preserve compact, readable identifiers and timestamps on one line when that improves row scanning. A 375 px review of the admin notifications table confirmed this behavior exposes all columns inside its wrapper while keeping job IDs and timestamps on one line.
- For text-heavy reference tables, retain readable column widths and scroll inside a `min-width: 0` wrapper; do not compress explanatory columns until each row becomes a stack of short fragments.
- Bulk selection and bulk actions appear only when supported; selection should announce counts and destructive bulk actions require confirmation.

### Cards and status indicators

- Cards share padding, border, radius, title hierarchy and action location. Avoid nested cards unless they express a real hierarchy.
- Status badges use semantic foreground/background pairs and include text/icon meaning. Keep status label casing and terminology consistent.
- In responsive device simulators, size the content to the simulated device as well as the surrounding editor viewport. A mobile marketplace preview must keep a single full-width product card inside its phone frame regardless of the desktop viewport hosting the preview; card media, stock badge, text and actions must not overlap or compress into narrow columns.
- The storefront marketplace and private admin preview render the shared `MarketplaceProductCard` and card stylesheet. Preview card navigation opens the shared product-detail preview; options and WhatsApp remain available. Admin may add outer context classes for scrolling or responsive preview composition, but must not add card-only borders, opacity changes, or action styling that customers will not see.
- The admin card preview passes the same selected-variant data as the storefront card: SKU, image, compact specification, option label, price/MRP, offer, availability and minimum order quantity. Product detail preview uses the same shared surface and also passes the saved brand logo, selected-variant gallery and quantity breaks, public FAQs, and published returns policy. Variant, attribute dropdown, gallery and quantity controls update the preview. Cart submission and unsaved edits remain private. Avoid showing the same offer text twice on the product detail surface; the marketplace card retains its offer banner.

### Dialogs, drawers and confirmations

- Use dialogs for short focused decisions; drawers for contextual editing when the underlying list should remain relevant.
- Every overlay has a title, accessible name, close control, focus management, Escape behavior where appropriate, and a visible footer.
- Admin `aria-modal` dialogs and open native `<dialog>` elements use the shared focus manager to enter the overlay, keep Tab navigation inside it, and return focus after dismissal; use explicit autofocus only when the first control is not the right starting point.
- Move focus into the active dialog, keep Tab and Shift+Tab within it, and return focus to the invoking control after dismissal. Lock background scrolling while a modal is open.
- Keep Cancel before the primary confirmation action. For destructive actions, name the affected record and consequence; style the destructive confirmation clearly.
- Recoverable restore confirmations should name the record and any recovery deadline; default keyboard focus to Cancel and return focus to the row action when cancelled. At 320 px keep copy and both actions within the viewport. The live Recently Deleted check confirmed Escape cancels without changing the recovery list.
- Customer confirmation dialogs may use the shared danger tone for consequential negative actions: a warning icon and danger-colored confirm action with white text; the dialog still uses the shared focus, Escape and return-focus behavior.
- On narrow screens, use full-height or near-full-width sheets with scrollable content and a persistent action footer where feasible.
- Off-canvas navigation drawers cast their overlay shadow only while open; the closed drawer must not darken or visually cover the page edge.

### Navigation, breadcrumbs and page headers

- Active items use a consistent shape, color, weight and semantic `aria-current`; focus remains independently visible.
- Admin sidebar hover uses a subtle dark surface and no horizontal translation; the active item uses solid `#ea580c` with white labels and icons, with `#c2410c` on hover.
- Nested Business and Sales workflow navigation uses `aria-current="page"` for the selected section; use current-page semantics for navigation controls and pressed/selected semantics for in-place view switches.
- Page headers use title and brief description on the left; one primary action and relevant secondary actions on the right. On mobile, wrap actions below the title.
- Section cards with a compact action pair should place the actions in the upper-right of the heading row, not between the heading and its explanatory copy. Keep the title and description grouped on the left, then wrap actions below the heading on narrow screens.
- Use breadcrumbs for nested admin detail/editor pages and a visible way back. Keep role-specific navigation distinct across storefront, customer account and admin.
- In the admin shell, show the selected navigation group as the breadcrumb parent and the page title as the current location; nested record/detail screens should add a clear parent path when they provide page-level navigation.
- Mobile menu opening/closing, backdrop click, Escape and focus behavior should be consistent within each app shell.
- Storefront mobile navigation toggles expose `aria-expanded` and `aria-controls`; Escape closes the open panel and returns focus to the toggle. Keep it a non-modal navigation panel so users may tab through its links without a focus trap. Live 320 px keyboard review confirmed the link panel and Escape/focus-return behavior.
- Admin mobile navigation uses a native `details` menu; Escape closes the open menu and returns focus to its `summary` toggle. Keep the control operable by pointer and keyboard without adding a focus trap. Live review at 320 px confirmed the close and focus-return behavior.

### Shared feedback states

- `LoadingState`: reserve layout space; use skeletons for known structures and a short status label for small requests.
- `EmptyState`: explain why the list is empty and offer the next useful action when one exists.
- Distinguish “no records yet” from “no results match these filters”; for filtered states, suggest changing or clearing the search/filter. Keep create actions in the page header instead of duplicating them inside an empty panel.
- Announce asynchronously updated filtered-empty results with `role="status"` and put a clear/reset action beside the recovery guidance when active criteria can be cleared together.
- Search/autocomplete and catalogue pickers announce a settled no-match message politely, while keeping the existing retry, custom-item, or search-anyway action available; do not announce the transient loading message as a no-match.
- Announce loaded no-record states in dashboards and list workspaces with a polite status region; reserve `role="alert"` for failures, not for an expected absence of records.
- In tables, preserve the table row/cell structure and put `role="status"` on a nested empty-state message so loaded no-data updates are announced without replacing table semantics.
- Customer quotation and order panels also use polite status semantics when asynchronous loading, filters, or nested history details resolve to an empty result; the status wrapper must preserve any clear-filters control and must not move focus. Supplier detail and procurement comparison empty panels follow the same rule.
- Hide pagination when a list has no results; keep the result count and recovery guidance visible.
- `ErrorState`: state what failed, provide retry when safe, and preserve entered data.
- `Toast`/inline notice: distinguish success, neutral notice, warning and error; do not make transient feedback the only record of a consequential result.

## Storefront patterns

- Optimize for discovery: one prominent search, scannable categories, useful product imagery, availability/specification clarity, and easy material-list/quotation access.
- Keep category and filter controls obvious, responsive, and removable; show result count and empty/no-match states.
- Apply ordinary list filters as the user changes a selection or enters a filter value; do not add a second Apply/Filter button. For paired date ranges, refresh once both dates form a valid range and explain incomplete or reversed ranges. Keep deliberate remote searches, navigation/submit-to-search actions, and exports separate because they perform a distinct operation.
- Product cards prioritize product name, image, brand, key specification, price/availability and one clear action. On wide desktop marketplace layouts, keep the grid at four columns maximum so titles, variants and actions have enough width; retain two columns on phones only when each card remains readable, and use one column at the narrowest sizes.
- Shared product-detail surfaces size their responsive layout from an outer inline-size container so phone/tablet widths can switch to a readable stacked composition. In routerless, non-interactive admin previews, navigation-only labels stay static; public storefront instances retain client-side links.
- Quote flows explain required steps, keep material list context visible, support file upload, and show success/recovery states.
- Keep public content pages readable and distinct from product listing layouts. The blog should have an editorial lead story, topic discovery, readable article typography, structured headings and related content. The current journal topic chips derive their labels from published slugs/titles and filter locally, so no content/API fields are required.
- Use a dark logo-navy hero with readable white/slate text and a clear orange headline accent. Keep cards and content sections on white or pale slate surfaces, reserving orange for meaningful actions and highlights. Preserve the hero canvas animation and map animation/design unchanged.

## Customer account patterns

- Keep sign-in, quotations, orders, history, loyalty, and profile navigation visually connected while retaining a customer-friendly tone.
- Use a stable account page heading and route-aware active navigation. Provide mobile navigation without hiding the account identity or sign-out path.
- Lists need clear status, dates, reference numbers and next actions; detail pages need a consistent return path.
- OTP, request continuation, quotation response and profile changes need distinct loading, retry, error and confirmation feedback.

## Admin patterns

Canonical admin list page:

```text
PageHeader: title + description + primary action
FilterBar: search + filters + date range + secondary actions
DataTable or record list: data + status + row actions
Pagination
```

- FilterBar selections and criteria update the result list as they change, reset pagination where applicable, and do not require a separate Apply/Filter action. Paired date ranges update when valid. Keep a Search action only when it submits a distinct remote search workflow, not merely to apply selected filters; current admin customer/follow-up and supplier-directory searches are separate submitted queries, while their adjacent status/refinement controls update immediately.

Canonical admin detail/edit page:

```text
Breadcrumbs / Back
PageHeader: record title + status + contextual actions
DetailSections or FormSections
Persistent, predictable Save / Cancel actions
```

- Prioritize information density, scanning, keyboard operation and repeatable workflows.
- Put a list page’s single create action in the page header; reserve the filter row for search, filters and list-level secondary actions. Hide create actions while a record detail or edit form is active unless creating a related record is an explicit part of that workflow.
- Apply select and chip filters immediately when selection changes; update text filters as users type (debounce remote queries when needed). Date ranges apply as soon as both values form a valid range; show validation guidance for incomplete or reversed ranges. Keep a separate action only for submitting/searching a task where the action itself is the intended interaction, not to confirm ordinary list filters.
- For an optional filter row such as Audit Log, each independent date/text/select field applies when changed; the API may receive one-sided date bounds. Keep a committed Apply action only when the range is intentionally staged as a paired input, as in Operational Reports.
- Experts & Services follows the supplier pattern: show the provider directory first and put one Add provider action beside the list heading. The add form needs a clear route back to the directory.
- Content managers open Blog management on the article list. Keep Write article as the list-header action, and give create/edit forms a clear return path to the article list.
- Commission managers open on existing records. Keep Record commission as the list-header action; the form returns to records and retains its existing submit-for-review flow.
- Transportation opens on existing plans with Plan delivery and Issue challan actions in the list heading; both forms return to plans.
- Discount rules open on the rules list with one Add discount rule action. Hide the form until create/edit, and preserve an entered draft when returning to the list.
- Keep secondary destinations, such as the staff directory, visible before reference/help content. Open large create forms on demand and provide a clear Cancel path that preserves a non-empty draft until the user confirms discard.
- Use shared patterns across catalogue, supplier, customer, procurement, quotation, order, dispatch, staff, reports and content modules.
- Keep workflow-specific steps when operationally necessary, but do not change terminology, action hierarchy, or status colors without a shared reason.
- Support tables at desktop widths and a deliberate mobile adaptation; do not simply shrink all columns.
- Place destructive and high-impact actions away from routine primary actions and make consequences clear.

## Responsive behavior

- Validate at **320, 375, 768, 1024, 1280, 1440, and 1920 px**.
- Responsive quality means deliberate composition, not only fitting the viewport: preserve content/action hierarchy, use the available width well, keep card padding proportional, align related labels and counts, and avoid orphaned controls or arbitrary wrapping.
- Group navigation, tabs, filters and page actions into intentional rows or grids at each breakpoint. Keep action sizes and alignment consistent within a group; do not stretch compact controls across oversized tracks or leave a final action stranded without visual intent.
- Responsive storefront header keeps the Delhi NCR label and clickable call number on one compact row; hide the service-region names through the 1120 px compact-header breakpoint while retaining them on wider desktop layouts. Notices with primary actions should stay in page flow when a fixed overlay would cover filters or content.
- At 320/375: one-column forms, readable cards, no horizontal page overflow, reachable primary actions, touch targets around 44 px, mobile menu and overlay behavior.
- For storefront hero actions at phone widths, stack search and the primary marketplace/quote actions in a clear reading order; keep the floating WhatsApp shortcut reachable without covering content. The 320 px homepage preview confirmed this arrangement.
- At 768: verify transition between desktop and mobile navigation, filter wrapping, tables and dialogs; do not assume it behaves like either endpoint.
- At 1024: preserve usable admin content width alongside navigation and avoid compressed page-header actions.
- At 1280/1440/1920: limit reading width, prevent excessively stretched forms/cards, and keep admin tables scannable.
- Use responsive CSS around layout intent rather than isolated page-specific breakpoints where patterns are the same.
