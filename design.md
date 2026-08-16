# CRM Frontend Design Guide

This document captures the current LeadFlow CRM visual system so the same theme can be reused in another project.

## Active Styling Entry

The app loads one CSS file from `src/main.jsx`:

```jsx
import './styles.css';
```

The files `auth-pages.css`, `leads-redesign.css`, `design-standard.css`, and `crm-theme.css` exist in the repo as reference or previous styling layers, but they are not currently imported by the app.

## Product Style

The interface is a professional CRM/admin dashboard. It should feel clean, structured, and work-focused:

- Dense but readable business UI.
- White cards on a soft blue-gray page background.
- Deep navy sidebar.
- Blue primary actions.
- Minimal decoration.
- Rounded corners are restrained, usually `6px`, `8px`, or `12px`.
- Shadows are soft and used mainly for cards, modals, dropdowns, and panels.
- Icons are from `lucide-react`.

## Design Tokens

Use these CSS variables as the base theme:

```css
:root {
  --color-primary: #2563eb;
  --color-primary-600: #1d4ed8;
  --color-primary-50: #eff6ff;
  --color-secondary: #0f172a;
  --color-sidebar: #1f3058;
  --color-bg: #f6f8fb;
  --color-surface: #ffffff;
  --color-surface-2: #f8fafc;
  --color-text: #172033;
  --color-muted: #64748b;
  --color-soft: #94a3b8;
  --color-border: #dbe3ef;
  --color-border-strong: #cbd5e1;
  --color-success: #15803d;
  --color-success-bg: #dcfce7;
  --color-warning: #b45309;
  --color-warning-bg: #fef3c7;
  --color-error: #dc2626;
  --color-error-bg: #fee2e2;
  --color-info: #0369a1;
  --color-info-bg: #e0f2fe;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 10px 24px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 24px 56px rgba(15, 23, 42, 0.16);
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --sidebar-width: 236px;
  --header-height: 64px;
  --font-xs: 12px;
  --font-sm: 13px;
  --font-md: 13px;
  --font-lg: 16px;
  --font-xl: 22px;
}
```

## Typography

Use Inter as the primary font:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Typography rules:

- Body text: `13px`, line-height `1.5`.
- Labels: `12px` to `13px`, bold, often muted.
- Table text: compact and readable.
- Page titles: bold, dark navy.
- Avoid negative letter spacing.
- Use uppercase only for small section labels and metadata labels.

## App Shell

The app uses a two-part shell:

- Fixed left sidebar.
- Main content area offset by `--sidebar-width`.
- Sticky top navbar.
- Main content max width around `1680px`.

Core structure:

```jsx
<div className="crm-shell">
  <aside className="crm-sidebar">...</aside>
  <div className="crm-main">
    <header className="crm-navbar">...</header>
    <main className="crm-content">...</main>
  </div>
</div>
```

## Sidebar

Sidebar style:

- Width: `236px`.
- Background: `#1f3058`.
- White/blue text.
- Logo at the top.
- Navigation label: `MAIN MENU`.
- Nav buttons are full-width, `44px` high, left aligned.
- Active nav item uses translucent blue background and a small active indicator.
- The sidebar does not show a user card/footer.

Sidebar item pattern:

```jsx
<button className="crm-sb-item crm-sb-item--active">
  <span className="crm-sb-item-icon"><Icon size={18} /></span>
  <span className="crm-sb-item-label">Leads</span>
  <span className="crm-sb-item-dot" />
</button>
```

## Top Navbar

Navbar style:

- Height: `64px`.
- White surface.
- Bottom border.
- Left page title with icon.
- Center global search.
- Right icon buttons and user button.

User button opens a compact account menu with:

- User avatar.
- User name.
- User ID.
- Sign Out button.

The account menu is a dropdown, not a full-height drawer:

- Width: about `280px`.
- Anchored below the navbar.
- White background, border, soft shadow.
- Transparent click-away backdrop.

## Global Search

Search field style:

- Rounded rectangular input.
- Icon on the left.
- Results appear in a popover below the search.
- Result rows show record type, title, and matched metadata.
- Highlight matches using `mark.search-highlight`.

## Pages

Most pages use these wrappers:

```jsx
<div className="lf-page-content">
  <PageComponent />
</div>
```

or for older pages:

```jsx
<div className="crm-legacy-page">
  <PageComponent />
</div>
```

Common page layout:

- Page header or hero area.
- Filter/action toolbar.
- Summary strip.
- Main table/card/kanban content.

## Cards And Panels

Use cards for repeated records, forms, summary metrics, modals, and detail blocks.

Card style:

```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-sm);
```

Avoid putting cards inside cards unless it is a modal/detail layout that needs clear grouping.

## Tables

Main CRM tables use `.lf-leads-table`.

Table style:

- White surface.
- Thin blue-gray borders.
- Compact row height.
- Sticky/clear header look.
- Header text is uppercase or bold muted.
- Rows have subtle hover state.
- Actions are icon buttons on the right.

Recommended table structure:

```jsx
<div className="lf-table-scroll">
  <table className="lf-leads-table">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```

## Forms

Form fields use `.field` or `.lf-field`.

Field rules:

- Label above input.
- Input height around `42px` to `48px`.
- Border: `var(--color-border)`.
- Background: white or `var(--color-surface-2)`.
- Focus ring uses blue shadow.
- Required labels include `*`.
- Two-column grids are preferred on desktop.
- Full-width fields use `.wide` or `.full`.

Common form grid:

```css
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.field.wide {
  grid-column: 1 / -1;
}
```

## Buttons

Primary actions:

- Blue background.
- White text.
- Bold.
- Used for Save, Create, Convert, Apply.

Secondary actions:

- White or light background.
- Blue-gray border.
- Dark text.
- Used for Cancel, Back, Edit.

Danger actions:

- Red background.
- White text.
- Used for Delete and destructive confirmations.

Button examples:

```jsx
<button className="button primary">Save</button>
<button className="button secondary">Cancel</button>
<button className="button danger">Delete</button>
```

## Modals

Modal style:

- Centered overlay.
- White panel.
- Rounded corners.
- Strong header with close icon.
- Footer action row aligned to the right.
- Form content uses two-column layout where possible.

Standard modal structure:

```jsx
<Modal title="Confirm Opportunity Form" onClose={onClose}>
  <form className="form-grid">...</form>
  <div className="panel-actions">
    <button className="button secondary">Cancel</button>
    <button className="button primary">Save</button>
  </div>
</Modal>
```

Professional modal guidance:

- Do not use colored full-width modal headers unless the rest of the app uses them.
- Keep titles simple and direct.
- Show validation errors inside the modal, close to the fields or footer.
- Keep action buttons visible at the bottom.

## Dropdowns And Searchable Selects

Searchable select pattern:

- Input-like trigger.
- Chevron on right.
- Dropdown menu below.
- Optional search input inside menu.
- Selected option uses stronger blue state.

Use this pattern for fields like:

- Assigned Salesperson.
- Owner.
- Company.
- Stage.
- Priority.

## Badges And Pills

Use pills for statuses, priorities, and stages.

Priority colors:

- High: red text on red-tinted background.
- Medium: blue/cyan text on pale blue background.
- Low: green text on pale green background.

Badge styling:

```css
border-radius: 999px;
font-size: 12px;
font-weight: 800;
padding: 2px 10px;
```

## Dashboard

Dashboard uses:

- Large hero panel.
- Metric cards.
- Workspace/action section.
- Small cards for feature/status summaries.

Hero visual language:

- Deep navy background.
- White headline.
- Muted blue uppercase kicker.
- Minimal geometric accent shape.

## Leads, Contacts, Companies, Payments

These pages share the same table-first CRM design:

- Filters at the top.
- Primary action button in the header.
- Summary strip when needed.
- Table with row actions.
- Detail pages use record summary cards and section blocks.

Companies and dynamic opportunity stage pages should follow the same table/detail format:

- Summary strip.
- Table columns adjusted to the entity fields.
- Detail page with record summary and grouped fields.

## Pipeline And Kanban

Pipeline uses a horizontally scrollable kanban board.

Kanban style:

- Columns have pale background and blue-gray border.
- Column header shows stage name and count.
- Cards are white with subtle shadow.
- Cards show name, company, client ID, phone, owner, and priority.
- Empty stages must remain valid drop targets.

Opportunity stage behavior:

- A stage can be configured as an opportunity stage.
- Standard form opens when a lead is dropped into a standard opportunity stage.
- Custom form opens when a lead is dropped into a custom opportunity stage.
- Data saved from the popup appears in the dynamic stage detail page.

## Dynamic Opportunity Forms

Custom opportunity forms support these field types:

- Short Text.
- Long Text.
- Number.
- Date.
- Checkbox.
- Dropdown.

When rendering dynamic forms:

- Use the same modal layout as the standard opportunity form.
- Place two fields per row on desktop.
- Put long text fields full width.
- Show linked record summary at the top.
- Save button label should be `Save Opportunity`.
- Validation messages must appear inside the modal.

## Responsive Rules

Responsive behavior:

- Sidebar becomes a slide-in drawer on smaller screens.
- Navbar shows mobile menu button.
- Table areas scroll horizontally.
- Form grids collapse to one column.
- Modals use smaller padding and near-full viewport width.
- Avoid text overflow in buttons, table cells, and cards.

## Icons

Use `lucide-react` icons consistently.

Common icon usage:

- Sidebar/page: `LayoutGrid`, `Users`, `Building2`, `BarChart3`, `CreditCard`.
- Navbar: `Bell`, `HelpCircle`, `Search`, `Menu`.
- Actions: `Plus`, `Edit3`, `Trash2`, `X`, `ArrowLeft`, `Power`.

Icons should be `15px` to `20px` in most controls.

## Implementation Notes For Another Project

To reuse this design:

1. Copy the token block from `styles.css`.
2. Build the same app shell: fixed sidebar, sticky navbar, constrained content.
3. Use the same class naming style: `crm-*` for shell/navigation, `lf-*` for CRM pages and tables.
4. Use `lucide-react` for icons.
5. Keep forms and modals consistent across entities.
6. Use tables for operational data instead of marketing-style cards.
7. Use badges for state, priority, and pipeline stage.
8. Keep the sidebar clean with only logo and navigation.

## Current Key Files

- `src/main.jsx`: mounts React and imports `styles.css`.
- `src/App.jsx`: app shell, login flow, navbar, sidebar, routing state, account dropdown.
- `src/styles.css`: active design system and page styling.
- `src/pages/LeadsPage.jsx`: leads table, forms, detail behavior.
- `src/pages/ContactsPage.jsx`: contacts table and detail pages.
- `src/pages/CompaniesPage.jsx`: company table/detail format.
- `src/pages/PipelinePage.jsx`: pipeline board, opportunity workflow, dynamic stage pages.
- `src/pages/PaymentsPage.jsx`: payments table and record forms.
- `src/components/ui.jsx`: reusable UI helpers such as modal, drawer, table, searchable select, fields, and actions.
