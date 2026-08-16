# Contact Page Design And Behavior Sample

This document analyzes the current Contact page in the CRM frontend so the same layout, theme, and behavior can be reused in another project.

## Source Files

- Main component: `src/pages/ContactsPage.jsx`
- Active styling: `src/styles.css`
- App wrapper: `src/App.jsx`

The Contact page is rendered inside:

```jsx
<div className="crm-legacy-page">
  <ContactsPage ... />
</div>
```

## Page Purpose

The Contact page is a table-first CRM management screen. It supports:

- Contact summary metrics.
- Searchable filters.
- Date range filtering.
- Add contact.
- Edit contact.
- Delete contact with confirmation.
- Clickable table rows.
- Contact detail page.
- Related opportunities section.

The design should feel professional, compact, and operational.

## Main Page Structure

```jsx
<div className="lf-page leads-page contacts-page">
  <section className="lf-table-card sales-table-card">
    <section className="page-panel leads-page-panel">
      <ContactSummaryStrip />
      <section className="page-panel-filters lf-filter-bar">...</section>
      <header className="page-panel-header sales-page-header">...</header>
    </section>

    <div className="lf-table-scroll">
      <table className="lf-leads-table">...</table>
    </div>
  </section>

  <ConfirmDeleteContact />
</div>
```

## Data Model

Default contact columns:

```js
const contactColumns = [
  ['contactId', 'Contact ID', 'link-cell'],
  ['date', 'Date'],
  ['contact', 'Contact'],
  ['company', 'Company'],
  ['designation', 'Designation'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['owner', 'Owner'],
  ['status', 'Status'],
];
```

Default form state:

```js
const blankContactForm = {
  contact: '',
  company: '',
  designation: '',
  phone: '',
  email: '',
  date: '',
  owner: 'Ali Raza',
  status: 'Active',
};
```

Default form fields:

```js
const defaultContactFormFields = [
  { key: 'contact', label: 'Contact' },
  { key: 'company', label: 'Company' },
  { key: 'designation', label: 'Designation' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'owner', label: 'Owner', kind: 'select', options: owners.filter((item) => item !== 'All') },
  { key: 'status', label: 'Status', kind: 'select', options: contactStatuses.filter((item) => item !== 'All') },
];
```

## Component State

The Contact page uses local React state for:

- `filters`: current filter values.
- `dateRanges`: custom date range values.
- `addOpen`: whether the add form page is open.
- `selectedContact`: contact currently opened in detail view.
- `editingContact`: contact currently being edited.
- `deletingContact`: contact pending delete confirmation.
- `form`: add/edit form values.
- `fallbackContacts`: dummy rows used when no contacts are passed.

Behavior priority:

1. If `addOpen` is true, show add form page.
2. If `editingContact` exists, show edit form page.
3. If `selectedContact` exists, show detail page.
4. Otherwise, show table page.

## Summary Strip

The Contact page displays four metric cards:

- Total Contacts.
- Active.
- Inactive.
- Companies.

Markup:

```jsx
<section className="crm-summary-strip contact-summary-strip" aria-label="Contact summary">
  <article>
    <span>Total Contacts</span>
    <strong>{summary.total}</strong>
  </article>
  <article>
    <span>Active</span>
    <strong className="contact-summary-blue">{summary.active}</strong>
  </article>
  <article>
    <span>Inactive</span>
    <strong className="contact-summary-red">{summary.inactive}</strong>
  </article>
  <article>
    <span>Companies</span>
    <strong className="contact-summary-green">{summary.companies}</strong>
  </article>
</section>
```

Summary visual style:

- Four equal columns.
- Each metric is a small white card.
- Border radius: `4px`.
- Border: light blue-gray.
- Shadow: very subtle.
- Label text is small, uppercase, muted.
- Value text is `21px`, dark or colored.

Important CSS:

```css
.contact-summary-strip {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 0;
}

.contact-summary-strip article {
  min-height: 62px;
  display: grid;
  align-content: center;
  gap: 5px;
  border: 1px solid var(--color-border, #d8e4f0);
  border-radius: 4px;
  background: #ffffff;
  padding: 10px 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}
```

## Header Panel Layout

The top panel contains summary, filters, and New Contact button.

Desktop grid:

- Summary strip spans full width.
- Filters on the left.
- Action button on the right.

```css
.contacts-page:not(.companies-copy-page) .leads-page-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 10px 16px;
}

.contacts-page:not(.companies-copy-page) .contact-summary-strip {
  grid-column: 1 / -1;
}

.contacts-page:not(.companies-copy-page) .page-panel-filters.lf-filter-bar {
  grid-column: 1;
  width: 100%;
}

.contacts-page:not(.companies-copy-page) .page-panel-header {
  grid-column: 2;
}
```

## Filters

Default filters:

- Status.
- Owner.
- Date range.

Date range options:

```js
const dateRangeOptions = ['All', 'Today', 'Last 7 Days', 'This Month', 'Custom Range'];
```

Filter configuration:

```js
const defaultContactFilters = [
  { key: 'status', label: 'Status', options: contactStatuses },
  { key: 'owner', label: 'Owner', options: owners },
  { key: 'dateRange', label: 'Date range', type: 'dateRange', options: dateRangeOptions, defaultValue: 'All' },
];
```

Filter behavior:

- Each filter is a searchable dropdown.
- Non-date filters include a search box inside the dropdown.
- Date range filter supports `Custom Range`.
- Active filters show a clear-filter icon button.
- Reset restores all default filter values and clears custom ranges.

Filter button markup:

```jsx
<div className="lf-select-field searchable">
  <button type="button" className="lf-combo-button" aria-haspopup="listbox" aria-expanded={open}>
    <span>Status: Active</span>
    <ChevronDown size={15} />
  </button>

  <div className="lf-combo-menu">
    <label className="lf-combo-search">
      <input placeholder="Search status..." />
    </label>
    <div role="listbox">
      <button type="button" className="selected">Active</button>
    </div>
  </div>
</div>
```

Filter style:

```css
.page-panel-filters.lf-filter-bar {
  flex: 1 1 auto;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.page-panel-filters .lf-select-field {
  flex: 0 1 220px;
  max-width: 240px;
}

.page-panel-filters .lf-combo-button,
.page-panel-filters .lf-clear-filters {
  min-height: 36px;
}
```

Clear filter button:

```css
.page-panel-filters .lf-clear-filters--icon {
  width: 36px;
  min-width: 36px;
  padding: 0;
  color: var(--color-error);
  background: var(--color-error-bg);
  border-color: #fecaca;
}

.page-panel-filters .lf-clear-filters--icon:hover {
  color: #fff;
  background: var(--color-error);
  border-color: var(--color-error);
}
```

## New Contact Button

The add button sits in the panel header on the right.

Markup:

```jsx
<button className="lf-btn lf-btn-primary" onClick={openAddContact}>
  <PlusCircle size={17} />
  New Contact
</button>
```

Style:

- Width: `148px`.
- Height: `36px`.
- Blue primary action.
- Icon plus label.
- Compact CRM action size.

```css
.page-panel-header .lf-btn {
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
}

.page-panel-header .lf-btn-primary {
  width: 148px;
  min-width: 148px;
  height: 36px;
}
```

## Table

The Contact table uses `.lf-leads-table` even on the Contacts page.

Columns:

1. Serial number.
2. Contact ID.
3. Date.
4. Contact.
5. Company.
6. Designation.
7. Phone.
8. Email.
9. Owner.
10. Status.
11. Actions.

Markup pattern:

```jsx
<div className="lf-table-scroll">
  <table className="lf-leads-table">
    <thead>
      <tr>
        <th className="lf-sr-col">#</th>
        <th>Contact ID</th>
        <th>Date</th>
        <th>Contact</th>
        <th>Company</th>
        <th>Designation</th>
        <th>Phone</th>
        <th>Email</th>
        <th>Owner</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>...</tbody>
  </table>
</div>
```

Table style:

- Compact text: `12px`.
- Header text: `11px`.
- Cell padding: `8px 10px`.
- Row click opens detail page.
- Actions use icon buttons.

```css
.lf-leads-table {
  font-size: 12px;
}

.lf-leads-table th,
.lf-leads-table td {
  padding: 8px 10px;
}

.lf-leads-table thead th {
  height: 38px;
  font-size: 11px;
}

.lf-leads-table tbody td {
  font-size: 12px;
}
```

## Status Badges

The status column uses `.lf-badge`.

Markup:

```jsx
<span className="lf-badge contact-status contact-status--active">Active</span>
<span className="lf-badge contact-status contact-status--inactive">Inactive</span>
```

Colors:

```css
.contact-status--active {
  color: var(--color-success);
  background: var(--color-success-bg);
  border-color: #bbf7d0;
}

.contact-status--inactive {
  color: var(--color-error);
  background: var(--color-error-bg);
  border-color: #fecaca;
}

.lf-leads-table .lf-badge {
  min-height: 22px;
  padding: 0 8px;
  font-size: 11px;
}
```

## Row Actions

Each row has edit and delete buttons.

Markup:

```jsx
<div className="inline-row-actions">
  <button className="inline-action inline-action--edit" title="Edit">
    <Edit3 size={15} />
  </button>
  <button className="inline-action inline-action--delete" title="Delete">
    <Trash2 size={15} />
  </button>
</div>
```

Behavior:

- Row click opens detail.
- Edit/delete buttons call `event.stopPropagation()` so they do not open detail.
- Edit opens form page.
- Delete opens confirmation modal.

Style:

```css
.inline-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.inline-action {
  width: 30px;
  height: 30px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.inline-action--edit {
  color: var(--color-primary);
}

.inline-action--edit:hover {
  background: var(--color-primary-50);
  border-color: #bfdbfe;
}

.inline-action--delete {
  color: var(--color-error);
}

.inline-action--delete:hover {
  color: #fff;
  background: var(--color-error);
  border-color: var(--color-error);
}
```

## Add/Edit Form Page

The add and edit form use a full page card, not a modal.

Structure:

```jsx
<div className="lf-page leads-page contacts-page">
  <section className="lead-form-page contact-form-page">
    <div className="lead-form-page-card">
      <header className="lead-form-page-head">
        <div>
          <h2>Add Contact</h2>
          <p>Create a new contact record.</p>
        </div>
        <button className="lead-form-back"><ArrowLeft size={22} /></button>
      </header>

      <form className="lf-lead-form">
        <div className="contact-form-section-title">
          <h3>Contact Information</h3>
        </div>
        ...
      </form>

      <div className="lf-modal-actions">
        <button>Cancel</button>
        <button className="primary">Save Contact</button>
      </div>
    </div>
  </section>
</div>
```

Form card style:

- Max width: `880px` for contact form.
- White background.
- Border and subtle shadow.
- Header with back arrow.
- Footer action bar with light background.

```css
.contact-form-page .lead-form-page-card {
  max-width: 880px;
}

.contact-form-page .lf-lead-form {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.contact-form-section-title {
  grid-column: 1 / -1;
  padding-bottom: 2px;
}

.contact-form-section-title h3 {
  margin: 0;
  color: var(--color-secondary);
  font-size: 15px;
  font-weight: 750;
}
```

Form field style:

```css
.contact-form-page .lf-field {
  min-width: 0;
  gap: 8px;
  color: #334155;
}

.lead-form-page-card .lf-field input,
.lead-form-page-card .lf-field textarea,
.lead-form-page-card .lf-combo-button {
  min-height: 38px;
  border-color: #d6e0ee;
  background: #fff;
}

.lead-form-page-card .lf-field input:focus,
.lead-form-page-card .lf-field textarea:focus,
.lead-form-page-card .lf-combo-button:focus-visible {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
```

## Select Fields In Form

Owner and Status are searchable select fields.

Behavior:

- Clicking opens dropdown.
- Search input filters options.
- Selected option gets `.selected`.
- Blur closes the menu.

Use this pattern for owner/status dropdowns in another project.

## Contact Detail Page

Clicking a row opens `ContactRecordDetailPage`.

Sections:

- Header with back button, contact name, company/designation, and Edit button.
- Summary strip with Contact ID, Status, Owner, Created Date.
- Contact Information section.
- Related Opportunities section.

Detail header behavior:

- Back button returns to table.
- Edit button opens edit form.

Detail information fields:

- Contact.
- Designation.
- Phone.
- Email.
- Company.
- Owner.
- Status.
- Created Date.

The detail page reuses the payment record/detail design classes:

```jsx
<section className="payment-record-detail contact-record-detail">
  <header className="payment-record-header">...</header>
  <section className="payment-record-summary">...</section>
  <div className="payment-record-sections lead-primary-sections">...</div>
  <section className="payment-record-section payment-record-history">...</section>
</section>
```

Contact detail section style:

```css
.contact-record-detail .lead-primary-sections {
  grid-template-columns: 1fr;
  gap: 16px;
}

.contact-record-detail .lead-primary-sections .payment-record-section {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.contact-record-detail .lead-primary-sections .payment-record-section h3::before {
  content: "";
  width: 4px;
  height: 18px;
  border-radius: 999px;
  background: #2563eb;
}
```

## Related Opportunities Table

The related opportunities table appears in the contact detail page.

Columns:

- Opportunity.
- Stage.
- Value.

Markup:

```jsx
<div className="contact-related-table-wrap">
  <table className="contact-related-table">
    <thead>
      <tr>
        <th>Opportunity</th>
        <th>Stage</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Metro Health - Initial Opportunity</td>
        <td><span className="lf-badge contact-opportunity-stage">Closed Won</span></td>
        <td>$20000.00</td>
      </tr>
    </tbody>
  </table>
</div>
```

Style:

```css
.contact-related-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.contact-related-table {
  width: 100%;
  min-width: 460px;
  border-collapse: collapse;
  table-layout: fixed;
}

.contact-related-table th,
.contact-related-table td {
  padding: 8px 4px;
  border-bottom: 1px solid var(--color-border, #d8e4f0);
  color: var(--color-text, #0f172a);
  font-size: 14px;
  text-align: left;
}

.contact-opportunity-stage {
  min-height: 22px;
  border-radius: 5px;
  background: #19bff2;
  color: #073047;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 900;
}
```

## Delete Confirmation Modal

Delete uses a centered modal.

Markup:

```jsx
<div className="lf-modal-backdrop" role="presentation">
  <section className="lf-modal" role="dialog" aria-modal="true" aria-labelledby="delete-contact-title">
    <div className="lf-modal-head">
      <div>
        <h2 id="delete-contact-title">Delete this contact?</h2>
        <p>Delete Sana Mir? This action cannot be undone.</p>
      </div>
      <button aria-label="Close modal"><X size={18} /></button>
    </div>
    <div className="lf-modal-actions">
      <button type="button">Cancel</button>
      <button type="button" className="danger">Delete Contact</button>
    </div>
  </section>
</div>
```

Modal style:

```css
.lf-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: var(--space-5);
  background: rgba(15, 23, 42, 0.48);
}

.lf-modal {
  width: min(720px, 100%);
  max-height: min(86vh, 920px);
  overflow: auto;
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
```

## Filtering Logic

Rows are filtered like this:

```js
const rows = contactRows.filter((contact) =>
  filterConfig.every((filter) => {
    const selected = filters[filter.key];
    if (!selected || (selected === 'All' && filter.type !== 'dateRange') || selected === 'Any Time') return true;
    if (filter.type === 'dateRange') return matchesDateFilter(contact.date, selected, dateRanges[filter.key]);
    return contact[filter.field || filter.key] === selected;
  })
);
```

Date range behavior:

- `All`: show all rows.
- `Today`: exact current date.
- `Last 7 Days`: date from six days ago through today.
- `This Month`: same month and year as today.
- `Custom Range`: respect `from` and `to` date inputs.

## ID Generation

New contacts get IDs like `CT-0001`.

```js
function makeEntityId(contacts, prefix = 'CT') {
  const maxId = contacts.reduce((max, contact) => {
    const value = String(contact.contactId || contact.id || '').match(new RegExp(`${prefix}-?(\\d+)`));
    return value ? Math.max(max, Number(value[1])) : max;
  }, 0);
  return `${prefix}-${String(maxId + 1).padStart(4, '0')}`;
}
```

## Reusable Contact Page Checklist

Use this checklist to recreate the Contact page in another project:

1. Create a white `sales-table-card` container.
2. Add a top `leads-page-panel` with summary strip, filters, and action button.
3. Use four summary cards: total, active, inactive, companies.
4. Use searchable dropdown filters for status and owner.
5. Use date range filter with custom range support.
6. Show clear filter icon only when filters are active.
7. Use `.lf-leads-table` for compact CRM table styling.
8. Make table rows clickable and open detail page.
9. Keep edit/delete as icon buttons and stop row click propagation.
10. Use colored status badges.
11. Use a full-page form card for Add/Edit Contact.
12. Use two-column form layout.
13. Use centered modal only for delete confirmation.
14. Use related opportunities table in detail view.
15. Keep colors, borders, radius, and spacing aligned with `styles.css` tokens.

## Recommended UX Rules

- Do not hide the primary `New Contact` action.
- Do not use large decorative hero sections on the Contacts page.
- Keep filters compact and aligned with the table.
- Keep status colors consistent across table and detail page.
- Keep forms professional: labels above fields, consistent input height, and clear footer buttons.
- Keep delete confirmation short, direct, and visibly destructive.
- Use icons only where they speed recognition: add, edit, delete, back, close, dropdown.
