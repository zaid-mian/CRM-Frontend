import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Edit3, PlusCircle, Trash2, X } from 'lucide-react';
import { contactStatuses, owners } from '../data/crmData';

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

const dummyContacts = [
  { id: 'CT-D001', contactId: 'CT-000041', date: '2026-07-24', contact: 'Sophia Bennett', company: 'Northstar Digital', designation: 'VP Operations', phone: '+1 (415) 555-0138', email: 'sophia@northstardigital.com', owner: 'Ali Raza', status: 'Active' },
  { id: 'CT-D002', contactId: 'CT-000039', date: '2026-07-23', contact: 'Ethan Carter', company: 'Carter Logistics', designation: 'Founder', phone: '+1 (312) 555-0182', email: 'ethan@carterlogistics.com', owner: 'Sara Ahmed', status: 'Active' },
  { id: 'CT-D003', contactId: 'CT-000038', date: '2026-07-22', contact: 'Olivia Martin', company: 'Horizon Properties', designation: 'Head of Sales', phone: '+1 (646) 555-0169', email: 'olivia@horizonproperties.com', owner: 'Ali Raza', status: 'Inactive' },
];

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

const defaultContactDetailFields = [
  { key: 'contactId', label: 'Contact ID', fallbackKey: 'id' },
  { key: 'contact', label: 'Contact' },
  { key: 'company', label: 'Company' },
  { key: 'designation', label: 'Designation' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status', render: (contact) => <span className={`lf-badge contact-status contact-status--${String(contact.status || '').toLowerCase()}`}>{contact.status || '-'}</span> },
  { key: 'date', label: 'Created Date', render: (contact) => formatContactDate(contact.date) },
];

const dateRangeOptions = ['All', 'Today', 'Last 7 Days', 'This Month', 'Custom Range'];

const defaultContactFilters = [
  { key: 'status', label: 'Status', options: contactStatuses },
  { key: 'owner', label: 'Owner', options: owners },
  { key: 'dateRange', label: 'Date range', type: 'dateRange', options: dateRangeOptions, defaultValue: 'All' },
];

export default function ContactsPage({
  contacts = [],
  setContacts,
  setMessage,
  onDetailOpenChange,
  filterTopContent = null,
  pageClassName = '',
  tableColumns = contactColumns,
  showSerialColumn = true,
  addButtonLabel = 'New Contact',
  addButtonIcon: AddButtonIcon = PlusCircle,
  blankFormValue = blankContactForm,
  formFields = defaultContactFormFields,
  formSectionTitle = 'Contact Information',
  addFormTitle = 'Add Contact',
  addFormDescription = 'Create a new contact record.',
  editFormTitle = 'Edit Contact',
  editFormDescription = 'Update this contact record.',
  saveButtonLabel = 'Save Contact',
  updateButtonLabel = 'Save Changes',
  idPrefix = 'CT',
  allowManualId = true,
  formPageClassName = '',
  detailTitle = 'Contact Detail',
  detailAriaLabel = 'Contact details',
  detailFields = defaultContactDetailFields,
  detailExtraContent = null,
  showActivitySections = true,
  filterConfig = defaultContactFilters,
  panelAfterContent = null,
  hideTable = false,
  onAddButtonClick = null,
  actionExtraContent = null,
  customDetailRenderer = null,
  useFallbackRows = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const [filters, setFilters] = useState(() => buildDefaultFilters(filterConfig));
  const [dateRanges, setDateRanges] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [deletingContact, setDeletingContact] = useState(null);
  const [form, setForm] = useState(blankFormValue);
  const [fallbackContacts, setFallbackContacts] = useState(dummyContacts);
  const contactRows = contacts.length > 0
    ? contacts.map((contact) => ({ ...contact, contactId: contact.contactId || contact.id }))
    : useFallbackRows
      ? fallbackContacts.map((contact) => ({ ...contact, contactId: contact.contactId || contact.id }))
      : [];
  const contactSummary = useMemo(() => ({
    total: contactRows.length,
    active: contactRows.filter((contact) => contact.status === 'Active').length,
    inactive: contactRows.filter((contact) => contact.status === 'Inactive').length,
    companies: new Set(contactRows.map((contact) => contact.company).filter(Boolean)).size,
  }), [contactRows]);

  const rows = useMemo(() => contactRows
    .filter((contact) => filterConfig.every((filter) => {
      const selected = filters[filter.key];
      if (!selected || (selected === 'All' && filter.type !== 'dateRange') || selected === 'Any Time') return true;
      if (filter.type === 'dateRange') return matchesDateFilter(contact.date, selected, dateRanges[filter.key]);
      return contact[filter.field || filter.key] === selected;
    })), [contactRows, filterConfig, filters, dateRanges]);

  const activeFilterCount = Object.values(filters).filter((value) => value !== 'All' && value !== 'Any Time').length;
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () => {
    setFilters(buildDefaultFilters(filterConfig));
    setDateRanges({});
  };
  const updateVisibleContacts = (updater) => {
    if (contacts.length > 0) {
      setContacts?.(updater);
      return;
    }
    if (!useFallbackRows) {
      const nextRows = typeof updater === 'function' ? updater([]) : updater;
      setContacts?.(nextRows);
      return;
    }
    setFallbackContacts(updater);
  };

  const deleteContact = (contact) => {
    updateVisibleContacts((current) => current.filter((item) => item.id !== contact.id));
    if (selectedContact?.id === contact.id) {
      setSelectedContact(null);
      onDetailOpenChange?.(false);
    }
    if (editingContact?.id === contact.id) setEditingContact(null);
    setDeletingContact(null);
    setMessage?.('Contact deleted successfully.');
  };

  const requestDeleteContact = (contact) => {
    setDeletingContact(contact);
  };

  const openAddContact = () => {
    setForm({ ...blankFormValue, date: blankFormValue.date || new Date().toISOString().slice(0, 10) });
    setEditingContact(null);
    setSelectedContact(null);
    onDetailOpenChange?.(false);
    setAddOpen(true);
  };

  const openEditContact = (contact) => {
    setForm(formFields.reduce((nextForm, field) => ({
      ...nextForm,
      [field.key]: contact[field.key] || blankFormValue[field.key] || '',
    }), {}));
    setEditingContact(contact);
    setSelectedContact(null);
    onDetailOpenChange?.(false);
    setAddOpen(false);
  };

  const openContactDetails = (contact) => {
    setSelectedContact(contact);
    onDetailOpenChange?.(true);
  };

  const closeContactDetails = () => {
    setSelectedContact(null);
    onDetailOpenChange?.(false);
  };

  const saveContact = () => {
    const typedId = allowManualId ? String(form.id || '').trim() : '';
    const nextId = typedId || makeEntityId(contactRows, idPrefix);
    const nextContact = {
      ...form,
      id: nextId,
      contactId: nextId,
      contact: form.contact || form.name || form.company || '',
      company: form.company || form.name || '',
      designation: form.designation || form.industry || '',
      date: form.date || new Date().toISOString().slice(0, 10),
    };

    updateVisibleContacts((current) => [nextContact, ...current]);
    setMessage?.('Contact saved successfully.');
    setAddOpen(false);
    setForm(blankFormValue);
  };

  const saveEditedContact = () => {
    if (!editingContact) return;

    const updatedContact = {
      ...editingContact,
      ...form,
      id: allowManualId && form.id ? form.id : editingContact.id,
      contactId: allowManualId && form.id ? form.id : editingContact.contactId || editingContact.id,
      contact: form.contact || form.name || form.company || '',
      company: form.company || form.name || '',
      designation: form.designation || form.industry || '',
    };

    updateVisibleContacts((current) => current.map((contact) => (
      contact.id === editingContact.id ? updatedContact : contact
    )));
    setMessage?.('Contact updated successfully.');
    setEditingContact(null);
    setForm(blankFormValue);
  };

  if (addOpen) {
    return (
      <ContactFormPage
        title={addFormTitle}
        description={addFormDescription}
        submitLabel={saveButtonLabel}
        sectionTitle={formSectionTitle}
        fields={formFields}
        pageClassName={formPageClassName}
        form={form}
        setForm={setForm}
        onClose={() => { setAddOpen(false); onDetailOpenChange?.(false); }}
        onSubmit={saveContact}
      />
    );
  }

  if (editingContact) {
    return (
      <ContactFormPage
        title={editFormTitle}
        description={editFormDescription}
        submitLabel={updateButtonLabel}
        sectionTitle={formSectionTitle}
        fields={formFields}
        pageClassName={formPageClassName}
        form={form}
        setForm={setForm}
        onClose={() => { setEditingContact(null); onDetailOpenChange?.(false); }}
        onSubmit={saveEditedContact}
      />
    );
  }

  if (selectedContact) {
    if (customDetailRenderer) {
      return customDetailRenderer({
        record: selectedContact,
        onBack: closeContactDetails,
        onEdit: () => openEditContact(selectedContact),
        onDelete: () => requestDeleteContact(selectedContact),
        deletingContact,
        onCancelDelete: () => setDeletingContact(null),
        onConfirmDelete: () => deleteContact(deletingContact),
      });
    }

    return (
      <>
        <ContactRecordDetailPage
  contact={selectedContact}
  onBack={closeContactDetails}
  onEdit={() => openEditContact(selectedContact)}
  onDelete={() => requestDeleteContact(selectedContact)}
  canEdit={canEdit}
/>
        {deletingContact && (
          <ConfirmDeleteContact
            contact={deletingContact}
            onCancel={() => setDeletingContact(null)}
            onConfirm={() => deleteContact(deletingContact)}
          />
        )}
      </>
    );
  }

  return (
    <div className={`lf-page leads-page contacts-page${pageClassName ? ` ${pageClassName}` : ''}`}>
      <section className="lf-table-card sales-table-card">
        <section className="page-panel leads-page-panel">
          {filterTopContent || <ContactSummaryStrip summary={contactSummary} />}
          <section className="page-panel-filters lf-filter-bar" aria-label="Contact filters">
            {filterConfig.map((filter) => (
              <ContactFilter
                key={filter.key}
                label={filter.label}
                value={filters[filter.key]}
                options={filter.options}
                type={filter.type}
                range={dateRanges[filter.key] || { from: '', to: '' }}
                onChange={(value) => updateFilter(filter.key, value)}
                onRangeChange={(range) => setDateRanges((current) => ({ ...current, [filter.key]: range }))}
              />
            ))}
            {activeFilterCount > 0 && (
              <button className="lf-clear-filters lf-clear-filters--icon" type="button" aria-label="Clear Filter" title="Clear Filter" onClick={resetFilters}><X size={16} /></button>
            )}
          </section>
          <header className="page-panel-header sales-page-header" aria-label="Contact actions">
            <div className="lf-page-actions lf-page-actions--hero">
              {actionExtraContent}
              {canCreate && <button className="lf-btn lf-btn-primary" onClick={onAddButtonClick || openAddContact}><AddButtonIcon size={17} />{addButtonLabel}</button>}
            </div>
          </header>
        </section>

        {panelAfterContent}

        {!hideTable && <div className="lf-table-scroll">
          <table className="lf-leads-table">
            <thead>
              <tr>
                {showSerialColumn && <th className="lf-sr-col">#</th>}
                {tableColumns.map(([, label]) => <th key={label}>{label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((contact, rowIndex) => {
                return (
                  <tr key={contact.id} className="clickable-row" onClick={() => openContactDetails(contact)}>
                    {showSerialColumn && <td className="lf-sr-col">{rowIndex + 1}</td>}
                    {tableColumns.map(([key, , className]) => (
                      <td key={key} className={className || undefined}>
                        {key === 'status'
                          ? <span className={`lf-badge contact-status contact-status--${String(contact.status || '').toLowerCase()}`}>{contact.status || '-'}</span>
                          : contact[key] || '-'}
                      </td>
                    ))}
                    <td className="lf-actions-cell">
                      <div className="inline-row-actions">
                        {canEdit && <button type="button" className="inline-action inline-action--edit" aria-label={`Edit ${getContactDisplayName(contact)}`} title="Edit" onClick={(event) => { event.stopPropagation(); openEditContact(contact); }}><Edit3 size={15} /></button>}
                        {canDelete && <button type="button" className="inline-action inline-action--delete" aria-label={`Delete ${getContactDisplayName(contact)}`} title="Delete" onClick={(event) => { event.stopPropagation(); requestDeleteContact(contact); }}><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}
      </section>
      {deletingContact && (
        <ConfirmDeleteContact
          contact={deletingContact}
          onCancel={() => setDeletingContact(null)}
          onConfirm={() => deleteContact(deletingContact)}
        />
      )}
    </div>
  );
}

function ContactSummaryStrip({ summary }) {
  return (
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
  );
}

function ContactFormPage({ title, description, submitLabel, sectionTitle, fields, pageClassName, form, setForm, onClose, onSubmit }) {
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className={`lf-page leads-page contacts-page${pageClassName ? ` ${pageClassName}` : ''}`}>
      <section className="lead-form-page contact-form-page">
        <div className="lead-form-page-card">
          <header className="lead-form-page-head">
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <button type="button" className="lead-form-back" aria-label="Back" title="Back" onClick={onClose}><ArrowLeft size={22} /></button>
          </header>
          <form className="lf-lead-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
            <div className="contact-form-section-title">
              <h3>{sectionTitle}</h3>
            </div>
            {fields.map((field) => (
              field.kind === 'select'
                ? <ContactFormSelect key={field.key} label={field.label} value={form[field.key] || ''} options={field.options} onChange={(value) => setField(field.key, value)} />
                : <ContactTextInput key={field.key} label={field.label} type={field.type || 'text'} value={form[field.key] || ''} onChange={(value) => setField(field.key, value)} />
            ))}
          </form>
          <div className="lf-modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="button" className="primary" onClick={onSubmit}>{submitLabel}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactRecordDetailPage({
  contact,
  onBack,
  onEdit,
  canEdit = true,
}) {
  return (
    <div className="lf-page leads-page contact-record-page">
      <section className="payment-record-detail contact-record-detail" aria-label="Contact details">
        <header className="payment-record-header">
          <button type="button" className="payment-record-back" aria-label="Back" title="Back" onClick={onBack}><ArrowLeft size={22} /></button>
          <div>
            <h2>{contact.contact || 'Contact Detail'}</h2>
            <p>{contact.company || '-'} / {contact.designation || '-'}</p>
          </div>
          <div className="contact-record-actions">
            {canEdit && <button className="payment-record-edit" type="button" onClick={onEdit}>Edit</button>}
          </div>
        </header>

        <section className="payment-record-summary" aria-label="Contact summary">
          <div>
            <span>Contact ID</span>
            <strong>{contact.contactId || contact.id || '-'}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{contact.status || '-'}</strong>
          </div>
          <div>
            <span>Owner</span>
            <strong>{contact.owner || '-'}</strong>
          </div>
          <div>
            <span>Created Date</span>
            <strong>{formatContactDate(contact.date)}</strong>
          </div>
        </section>

        <div className="payment-record-sections lead-primary-sections">
          <section className="payment-record-section">
            <h3>Contact Information</h3>
            <dl>
              <div><dt>Contact</dt><dd>{contact.contact || '-'}</dd></div>
              <div><dt>Designation</dt><dd>{contact.designation || '-'}</dd></div>
              <div><dt>Phone</dt><dd>{contact.phone || '-'}</dd></div>
              <div><dt>Email</dt><dd>{contact.email || '-'}</dd></div>
              <div><dt>Company</dt><dd>{contact.company || '-'}</dd></div>
              <div><dt>Owner</dt><dd>{contact.owner || '-'}</dd></div>
              <div><dt>Status</dt><dd>{contact.status || '-'}</dd></div>
              <div><dt>Created Date</dt><dd>{formatContactDate(contact.date)}</dd></div>
            </dl>
          </section>
        </div>

        <section className="payment-record-section payment-record-history">
          <h3>Related Opportunities</h3>
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
                  <td>{contact.relatedOpportunity || `${contact.company || contact.contact || 'Contact'} - Initial Opportunity`}</td>
                  <td><span className="lf-badge contact-opportunity-stage">Closed Won</span></td>
                  <td>$20000.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}

function ContactTextInput({ label, value, onChange, type = 'text' }) {
  return (
    <label className="lf-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ContactFormSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredOptions = options.filter((option) => String(option).toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <label className="lf-field searchable" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(''); } }}>
      <span>{label}</span>
      <button type="button" className="lf-combo-button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{value}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="lf-combo-menu">
          <label className="lf-combo-search">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} autoFocus />
          </label>
          <div role="listbox">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <button type="button" key={option} className={option === value ? 'selected' : ''} onClick={() => { onChange(option); setQuery(''); setOpen(false); }}>{option}</button>
            )) : <p>No results</p>}
          </div>
        </div>
      )}
    </label>
  );
}

function ContactDetailsPage({
  contact,
  pageClassName,
  title,
  ariaLabel,
  fields,
  extraContent,
  showActivitySections,
  onClose,
  onEdit,
  canEdit = true,
}) {
  return (
    <div className={`lf-page leads-page contacts-page${pageClassName ? ` ${pageClassName}` : ''}`}>
      <section className="lead-detail-page contact-detail-page" aria-label={ariaLabel}>
        <div className="lead-detail-page-card">
          <div className="lead-detail-title">
            <h2>{title}</h2>
          </div>
          <div className="lf-drawer-head">
            <div className="lf-drawer-person">
              <div>
                <h2>{getContactDisplayName(contact)}</h2>
                <p>{contact.company || '-'} · {contact.designation || '-'}</p>
              </div>
            </div>
            <button type="button" className="button secondary lead-detail-back" aria-label="Back" title="Back" onClick={onClose}><ArrowLeft size={22} /></button>
          </div>

          <div className="lf-detail-grid">
            {fields.map((field) => (
              <ContactDetail
                key={field.label}
                label={field.label}
                value={field.render ? field.render(contact) : contact[field.key] || (field.fallbackKey ? contact[field.fallbackKey] : '')}
              />
            ))}
          </div>

          {extraContent || (
            <section className="contact-detail-section" aria-label="Related opportunities">
              <h3>Related Opportunities</h3>
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
                      <td>{contact.relatedOpportunity || `${contact.company || contact.contact || 'Contact'} - Initial Opportunity`}</td>
                      <td><span className="lf-badge contact-opportunity-stage">Closed Won</span></td>
                      <td>$20000.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {showActivitySections && (
            <>
              <section className="contact-detail-section" aria-label="Activity timeline">
                <h3>Activity Timeline</h3>
                <p className="contact-timeline-item"><Check size={15} aria-hidden="true" />Contact Created</p>
              </section>

              <section className="contact-detail-section" aria-label="Related tasks">
                <h3>Related Tasks</h3>
                <p>No tasks assigned.</p>
              </section>
            </>
          )}

          <div className="lf-drawer-actions lf-drawer-actions--footer">
            {canEdit && <button type="button" onClick={onEdit}><Edit3 size={15} />Edit</button>}
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactDetail({ label, value }) {
  return <div className="lf-detail-item"><span>{label}</span><strong>{value || '-'}</strong></div>;
}

function ConfirmDeleteContact({ contact, onCancel, onConfirm }) {
  return (
    <div className="lf-modal-backdrop" role="presentation">
      <section className="lf-modal" role="dialog" aria-modal="true" aria-labelledby="delete-contact-title">
        <div className="lf-modal-head">
          <div>
            <h2 id="delete-contact-title">Delete this contact?</h2>
            <p>Delete {getContactDisplayName(contact)}? This action cannot be undone.</p>
          </div>
          <button aria-label="Close modal" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="lf-modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="danger" onClick={onConfirm}>Delete Contact</button>
        </div>
      </section>
    </div>
  );
}

function getContactDisplayName(contact) {
  return contact.contact || contact.name || contact.company || 'this contact';
}

function buildDefaultFilters(filters) {
  return filters.reduce((defaults, filter) => ({
    ...defaults,
    [filter.key]: filter.defaultValue || filter.options[0],
  }), {});
}

function matchesDateFilter(value, selected, range = {}) {
  if (selected === 'All') return true;
  if (!value) return true;
  const recordDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(recordDate.getTime())) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selected === 'Today') {
    return recordDate.getTime() === today.getTime();
  }

  if (selected === 'Last 7 Days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return recordDate >= start && recordDate <= today;
  }

  if (selected === 'This Month') {
    return recordDate.getFullYear() === today.getFullYear() && recordDate.getMonth() === today.getMonth();
  }

  if (selected === 'Custom Range') {
    const from = range.from ? new Date(`${range.from}T00:00:00`) : null;
    const to = range.to ? new Date(`${range.to}T00:00:00`) : null;
    if (from && recordDate < from) return false;
    if (to && recordDate > to) return false;
  }

  return true;
}

function ContactFilter({ label, value, options, onChange, type, range, onRangeChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredOptions = options.filter((option) => String(option).toLowerCase().includes(query.trim().toLowerCase()));
  const isDateRange = type === 'dateRange';

  return (
    <div className="lf-select-field searchable" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(''); } }}>
      <button type="button" className="lf-combo-button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{label}: {value}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className={`lf-combo-menu${isDateRange ? ' lf-date-range-menu' : ''}`}>
          {!isDateRange && (
            <label className="lf-combo-search">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} autoFocus />
            </label>
          )}
          {isDateRange && value === 'Custom Range' ? (
            <div className="lf-custom-range-form">
              <label>
                <span>From</span>
                <input type="date" value={range.from} onChange={(event) => onRangeChange?.({ ...range, from: event.target.value })} />
              </label>
              <label>
                <span>To</span>
                <input type="date" value={range.to} onChange={(event) => onRangeChange?.({ ...range, to: event.target.value })} />
              </label>
              <button type="button" className="selected" onClick={() => setOpen(false)}>Apply</button>
            </div>
          ) : (
            <div role="listbox">
              {filteredOptions.length > 0 ? filteredOptions.map((option) => (
                <button type="button" key={option} className={option === value ? 'selected' : ''} onClick={() => { onChange(option); setQuery(''); if (option !== 'Custom Range') setOpen(false); }}>{option}</button>
              )) : <p>No results</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function makeEntityId(contacts, prefix = 'CT') {
  const maxId = contacts.reduce((max, contact) => {
    const value = String(contact.contactId || contact.id || '').match(new RegExp(`${prefix}-?(\\d+)`));
    return value ? Math.max(max, Number(value[1])) : max;
  }, 0);
  return `${prefix}-${String(maxId + 1).padStart(4, '0')}`;
}

function formatContactDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
