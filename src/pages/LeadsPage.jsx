import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  Check,
  ArrowLeft,
  ChevronDown,
  Columns3,
  Download,
  Edit3,
  Eye,
  FileText,
  Mail,
  Phone,
  PlusCircle,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  defaultLeadColumns,
  leadColumns,
  leadDateOptions,
  leadOwnerOptions,
  leadPriorityOptions,
  leadSourceOptions,
  leadStatusOptions,
  mockLeads,
} from '../data/leads';
import { companyTypes } from '../data/crmData';

const priorityRank = { Urgent: 1, High: 2, Medium: 3, Low: 4 };
const statusRank = { New: 1, Contacted: 2, Qualified: 3, 'Proposal Sent': 4, Negotiation: 5, Converted: 6, Lost: 7 };
const salesTableColumns = [
  { key: 'clientId', label: 'Lead ID', sortable: true },
  { key: 'createdDate', label: 'Date', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'company', label: 'Company', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'source', label: 'Source' },
  { key: 'owner', label: 'Owner', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

const blankLeadForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  companyType: 'Prospect',
  companyEmployees: '',
  companyAnnualRevenue: '',
  companyIndustry: '',
  companyPhone: '',
  companyEmail: '',
  companyOwner: 'Ali Raza',
  jobTitle: '',
  source: 'Website',
  owner: 'Ali Raza',
  priority: 'Medium',
  status: 'New',
  createdDate: '',
  estimatedValue: '',
  expectedCloseDate: '',
  notes: '',
};

export default function LeadsPage({ setLeads, setContacts, setCompanies, setMessage, onDetailOpenChange, globalSearch = '', detailRequestId = '', onDetailRequestHandled, canCreate = true, canEdit = true, canDelete = true }) {
  const [leads, setLocalLeads] = useState(mockLeads);
  const [filters, setFilters] = useState({ status: 'All Statuses', owner: 'All Owners', priority: 'All Priorities', source: 'All Sources', dateRange: 'Any Time' });
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [visibleColumns, setVisibleColumns] = useState(defaultLeadColumns);
  const [draftColumns, setDraftColumns] = useState(defaultLeadColumns);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [detailsLead, setDetailsLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blankLeadForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    updateLeads(leads);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setColumnsOpen(false);
      setExportOpen(false);
      setDetailsLead(null);
      setDeletingLead(null);
      closeForm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    onDetailOpenChange?.(Boolean(detailsLead));
    return () => onDetailOpenChange?.(false);
  }, [detailsLead, onDetailOpenChange]);

  useEffect(() => {
    if (!detailRequestId) return;
    const requestedLead = leads.find((lead) => lead.id === detailRequestId || lead.clientId === detailRequestId);
    if (requestedLead) setDetailsLead(requestedLead);
    onDetailRequestHandled?.();
  }, [detailRequestId, leads, onDetailRequestHandled]);

  const showToast = (text) => setMessage?.(text);

  const upsertRelatedContact = (lead) => {
    if (!setContacts || !lead.customer) return;
    const contactRow = {
      id: `CT-${lead.clientId || lead.id}`,
      contactId: `CT-${lead.clientId || lead.id}`,
      clientId: lead.clientId,
      date: lead.createdDate,
      contact: lead.customer,
      company: lead.company,
      designation: lead.jobTitle || '',
      phone: lead.phone,
      email: lead.email,
      whatsapp: lead.phone,
      owner: lead.owner,
      status: 'Active',
      notes: lead.notes || '',
      relatedLeadId: lead.id,
    };
    setContacts((current = []) => {
      const existing = current.find((contact) => (
        contact.relatedLeadId === lead.id
        || (lead.phone && contact.phone === lead.phone)
        || (lead.email && contact.email === lead.email)
      ));
      if (existing) {
        return current.map((contact) => contact.id === existing.id ? { ...contact, ...contactRow, id: existing.id, contactId: existing.contactId || existing.id } : contact);
      }
      return [contactRow, ...current];
    });
  };

  const upsertRelatedCompany = (lead) => {
    if (!setCompanies || !lead.company) return;
    const companyRow = {
      id: `CO-${String(lead.company).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || lead.clientId || lead.id}`,
      date: lead.createdDate,
      name: lead.company,
      company: lead.company,
      contact: lead.company,
      type: lead.companyType || 'Prospect',
      employees: lead.companyEmployees || '',
      annualRevenue: lead.companyAnnualRevenue || 0,
      industry: lead.companyIndustry || '',
      phone: lead.companyPhone || lead.phone,
      email: lead.companyEmail || lead.email,
      owner: lead.companyOwner || lead.owner,
      status: 'Active',
      leadSource: lead.source,
      description: lead.notes || '',
      relatedLeadId: lead.id,
    };
    setCompanies((current = []) => {
      const existing = current.find((company) => (
        company.relatedLeadId === lead.id
        || String(company.name || company.company || '').toLowerCase() === String(lead.company).toLowerCase()
      ));
      if (existing) {
        return current.map((company) => company.id === existing.id ? { ...company, ...companyRow, id: existing.id } : company);
      }
      return [companyRow, ...current];
    });
  };

  const updateLeads = (nextLeads) => {
    setLocalLeads(nextLeads);
    setLeads?.(nextLeads.map((lead) => ({
      id: lead.id,
      clientId: lead.clientId,
      date: lead.createdDate,
      customer: lead.customer,
      company: lead.company,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      owner: lead.owner,
      companyType: lead.companyType,
      companyEmployees: lead.companyEmployees,
      companyAnnualRevenue: lead.companyAnnualRevenue,
      companyIndustry: lead.companyIndustry,
      companyPhone: lead.companyPhone,
      companyEmail: lead.companyEmail,
      companyOwner: lead.companyOwner,
      priority: lead.priority,
      status: lead.status,
      leadValue: lead.estimatedValue,
      lastActivity: lead.lastActivity,
      nextFollowUp: lead.upcomingFollowUp,
    })));
  };

  const filteredLeads = useMemo(() => {
    const searchTerm = globalSearch.trim().toLowerCase();
    return leads
      .filter((lead) => {
        if (!searchTerm) return true;
        return [lead.clientId, lead.customer, lead.company, lead.phone, lead.source, lead.owner, lead.priority, lead.status]
          .some((value) => String(value || '').toLowerCase().includes(searchTerm));
      })
      .filter((lead) => filters.status === 'All Statuses' || lead.status === filters.status)
      .filter((lead) => filters.owner === 'All Owners' || lead.owner === filters.owner)
      .filter((lead) => filters.priority === 'All Priorities' || lead.priority === filters.priority)
      .filter((lead) => filters.source === 'All Sources' || lead.source === filters.source)
      .filter((lead) => {
        if (filters.dateRange !== 'Custom Range') return true;
        if (dateRange.from && lead.createdDate < dateRange.from) return false;
        if (dateRange.to && lead.createdDate > dateRange.to) return false;
        return true;
      })
      .sort((a, b) => compareLeads(a, b, sortBy, sortDirection));
  }, [dateRange, filters, globalSearch, leads, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filteredLeads.slice(pageStart, pageStart + rowsPerPage);
  const leadSummary = useMemo(() => ({
    total: leads.length,
    new: leads.filter((lead) => lead.status === 'New').length,
    qualified: leads.filter((lead) => lead.status === 'Qualified').length,
    converted: leads.filter((lead) => lead.status === 'Converted').length,
    lost: leads.filter((lead) => lead.status === 'Lost').length,
  }), [leads]);
  const activeFilterCount = Object.values(filters).filter((value) => !String(value).startsWith('All') && value !== 'Any Time').length;
  const displayColumns = salesTableColumns;
  const hasEmailHidden = false;

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    setSortBy((current) => {
      if (current === key) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDirection('asc');
      return key;
    });
  };

  const resetFilters = () => {
    setFilters({ status: 'All Statuses', owner: 'All Owners', priority: 'All Priorities', source: 'All Sources', dateRange: 'Any Time' });
    setDateRange({ from: '', to: '' });
    setCurrentPage(1);
  };

  const toggleVisible = (checked) => {
    const ids = pageRows.map((lead) => lead.id);
    setSelectedIds((current) => checked ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id)));
  };

  const toggleColumn = (key) => {
    setDraftColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const openAdd = () => {
    setEditingLead(null);
    setForm({ ...blankLeadForm, createdDate: new Date().toISOString().slice(0, 10) });
    setErrors({});
    setAddOpen(true);
  };

  const openEdit = (lead) => {
    const [firstName, ...rest] = lead.customer.split(' ');
    setEditingLead(lead);
    setForm({
      firstName,
      lastName: rest.join(' '),
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      companyType: lead.companyType || 'Prospect',
      companyEmployees: String(lead.companyEmployees || lead.expectedCloseDate || ''),
      companyAnnualRevenue: String(lead.companyAnnualRevenue || lead.estimatedValue || ''),
      companyIndustry: lead.companyIndustry || lead.source || '',
      companyPhone: lead.companyPhone || lead.phone || '',
      companyEmail: lead.companyEmail || lead.email || '',
      companyOwner: lead.companyOwner || lead.owner || 'Ali Raza',
      jobTitle: lead.jobTitle,
      source: lead.source,
      owner: lead.owner,
      priority: lead.priority,
      status: lead.status,
      createdDate: lead.createdDate,
      estimatedValue: String(lead.estimatedValue),
      expectedCloseDate: lead.expectedCloseDate,
      notes: lead.notes,
    });
    setErrors({});
    setAddOpen(true);
  };

  const closeForm = () => {
    setAddOpen(false);
    setEditingLead(null);
    setSaving(false);
  };

  const submitLead = (mode = 'final') => {
    const nextErrors = validateLeadForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      const customer = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const payload = {
        id: editingLead?.id || `lead-${Date.now()}`,
        clientId: editingLead?.clientId || `LD-${10249 + leads.length}`,
        createdDate: form.createdDate || editingLead?.createdDate || new Date().toISOString().slice(0, 10),
        customer,
        company: form.company,
        phone: form.phone,
        email: form.email,
        source: form.source,
        owner: form.owner,
        companyType: form.companyType,
        companyEmployees: form.companyEmployees,
        companyAnnualRevenue: Number(form.companyAnnualRevenue || 0),
        companyIndustry: form.companyIndustry,
        companyPhone: form.companyPhone,
        companyEmail: form.companyEmail,
        companyOwner: form.companyOwner,
        priority: form.priority,
        status: mode === 'draft' ? 'New' : form.status,
        lastActivity: editingLead ? 'Updated just now' : 'Created just now',
        jobTitle: form.jobTitle,
        estimatedValue: Number(form.estimatedValue || 0),
        expectedCloseDate: form.expectedCloseDate,
        notes: form.notes,
        upcomingFollowUp: editingLead?.upcomingFollowUp || 'Schedule first follow-up',
      };
      const nextLeads = editingLead ? leads.map((lead) => lead.id === editingLead.id ? payload : lead) : [payload, ...leads];
      updateLeads(nextLeads);
      upsertRelatedContact(payload);
      upsertRelatedCompany(payload);
      showToast(editingLead ? 'Lead updated successfully' : mode === 'draft' ? 'Lead saved as draft' : 'Lead created successfully');
      closeForm();
    }, 500);
  };

  const deleteLead = () => {
    if (!deletingLead) return;
    updateLeads(leads.filter((lead) => lead.id !== deletingLead.id));
    setSelectedIds((current) => current.filter((id) => id !== deletingLead.id));
    setDeletingLead(null);
    showToast('Lead deleted successfully');
  };

  const runExport = (scope, format) => {
    setExportOpen(false);
    showToast(`Export started: ${scope} as ${format}`);
  };

  return (
    <div className="lf-page leads-page salesforce-leads">
      {!addOpen && !detailsLead && selectedIds.length > 0 && (
        <section className="lf-bulk-bar" aria-live="polite">
          <strong>{selectedIds.length} selected</strong>
          <button onClick={() => showToast('Lead assigned successfully')}><UserPlus size={15} />Assign Owner</button>
          <button onClick={() => showToast('Status changed successfully')}><Check size={15} />Change Status</button>
          <button onClick={() => runExport('selected records', 'CSV')}><Download size={15} />Export</button>
          <button className="danger" onClick={() => showToast('Unable to complete the action')}><Trash2 size={15} />Delete</button>
          <button onClick={() => setSelectedIds([])}><X size={15} />Clear Selection</button>
        </section>
      )}

      {!addOpen && !detailsLead && (
        <section className="lf-table-card sales-table-card">
          <PagePanel>
            <LeadSummaryStrip summary={leadSummary} />
            <PageFilters
              filters={filters}
              dateRange={dateRange}
              activeFilterCount={activeFilterCount}
              updateFilter={updateFilter}
              setDateRange={setDateRange}
              resetFilters={resetFilters}
            />
            {canCreate && (
              <PageHeader
                onAdd={openAdd}
              />
            )}
          </PagePanel>
          <div className="lf-table-scroll">
            <table className="lf-leads-table">
              <thead>
                <tr>
                  <th className="lf-sr-col">#</th>
                  {displayColumns.map((column) => (
                    <th key={column.key}>
                      {column.sortable ? (
                        <button className="lf-sort-btn" onClick={() => handleSort(column.key)}>
                          {column.label}<span>{sortBy === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </button>
                      ) : column.label}
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((lead, rowIndex) => {
                  return (
                    <tr key={lead.id} className={selectedIds.includes(lead.id) ? 'selected' : ''} onClick={() => setDetailsLead(lead)}>
                      <td className="lf-sr-col">{pageStart + rowIndex + 1}</td>
                      {displayColumns.map((column) => (
                        <td key={column.key}>{renderLeadCell(lead, column.key, { onDetails: setDetailsLead, emailHidden: hasEmailHidden, query: globalSearch })}</td>
                      ))}
                      <td className="lf-actions-cell">
                        <div className="inline-row-actions" onClick={(event) => event.stopPropagation()}>
                          {canEdit && <button type="button" className="inline-action inline-action--edit" aria-label={`Edit ${lead.customer}`} title="Edit" onClick={() => openEdit(lead)}><Edit3 size={15} /></button>}
                          {canDelete && <button type="button" className="inline-action inline-action--delete" aria-label={`Delete ${lead.customer}`} title="Delete" onClick={() => setDeletingLead(lead)}><Trash2 size={15} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredLeads.length === 0 && (
              <div className="lf-empty-state">
                <h3>No leads found</h3>
                <p>Try adjusting your search or filters, or create your first lead.</p>
                <button onClick={resetFilters}>Clear Filters</button>
                {canCreate && <button className="primary" onClick={openAdd}>Add New Lead</button>}
              </div>
            )}
          </div>

        </section>
      )}

      {addOpen && <AddLeadModal form={form} setForm={setForm} errors={errors} saving={saving} editing={Boolean(editingLead)} onClose={closeForm} onDraft={() => submitLead('draft')} onSubmit={() => submitLead('final')} />}

      {!addOpen && detailsLead && (
        <LeadDetailsDrawer
          lead={detailsLead}
          onClose={() => setDetailsLead(null)}
          onEdit={() => { openEdit(detailsLead); setDetailsLead(null); }}
          onConvert={() => {
            updateLeads(leads.map((item) => item.id === detailsLead.id ? { ...item, status: 'Converted', lastActivity: 'Converted just now' } : item));
            setDetailsLead((current) => current ? { ...current, status: 'Converted', lastActivity: 'Converted just now' } : current);
            showToast('Lead converted successfully');
          }}
          onMarkLost={() => {
            updateLeads(leads.map((item) => item.id === detailsLead.id ? { ...item, status: 'Lost', lastActivity: 'Marked lost just now' } : item));
            setDetailsLead((current) => current ? { ...current, status: 'Lost', lastActivity: 'Marked lost just now' } : current);
            showToast('Lead marked lost successfully');
          }}
          onToast={showToast}
          canEdit={canEdit}
        />
      )}

      {!addOpen && columnsOpen && (
        <ColumnSelector draftColumns={draftColumns} setDraftColumns={setDraftColumns} toggleColumn={toggleColumn} onClose={() => setColumnsOpen(false)} onApply={() => { setVisibleColumns([...new Set([...draftColumns, 'customer'])]); setColumnsOpen(false); }} />
      )}
      {!addOpen && deletingLead && <ConfirmDelete lead={deletingLead} onCancel={() => setDeletingLead(null)} onConfirm={deleteLead} />}
    </div>
  );
}

function PagePanel({ children }) {
  return <section className="page-panel leads-page-panel">{children}</section>;
}

function Divider() {
  return <div className="page-panel-divider" role="presentation" />;
}

function LeadSummaryStrip({ summary }) {
  return (
    <section className="crm-summary-strip lead-summary-strip" aria-label="Lead summary">
      <article>
        <span>Total Leads</span>
        <strong>{summary.total}</strong>
      </article>
      <article>
        <span>New</span>
        <strong className="lead-summary-blue">{summary.new}</strong>
      </article>
      <article>
        <span>Won</span>
        <strong className="lead-summary-orange">{summary.qualified}</strong>
      </article>
      <article>
        <span>Lost</span>
        <strong className="lead-summary-red">{summary.lost}</strong>
      </article>
    </section>
  );
}

function PageHeader({ onAdd }) {
  return (
    <header className="page-panel-header sales-page-header" aria-label="Sales page header">
      <div className="lf-page-actions lf-page-actions--hero">
        <button className="lf-btn lf-btn-primary" onClick={onAdd}><PlusCircle size={17} />New Lead</button>
      </div>
    </header>
  );
}

function PageFilters({ filters, dateRange, activeFilterCount, updateFilter, setDateRange, resetFilters }) {
  return (
    <section className="page-panel-filters lf-filter-bar" aria-label="Lead search and filters">
      <FilterSelect label="Status" value={filters.status} options={leadStatusOptions} onChange={(value) => updateFilter('status', value)} />
      <FilterSelect label="Owner" value={filters.owner} options={leadOwnerOptions} onChange={(value) => updateFilter('owner', value)} />
      <DateRangeFilter value={filters.dateRange} range={dateRange} onPresetChange={(value) => updateFilter('dateRange', value)} onRangeChange={(nextRange) => { setDateRange(nextRange); updateFilter('dateRange', 'Custom Range'); }} />
      {activeFilterCount > 0 && (
        <button className="lf-clear-filters lf-clear-filters--icon" type="button" aria-label="Clear Filter" title="Clear Filter" onClick={resetFilters}><X size={16} /></button>
      )}
    </section>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return <SearchableSelect className="lf-select-field" label={label} value={value} options={options} onChange={onChange} />;
}

function SearchableSelect({ label, value, options, onChange, className = 'lf-field', showInlineLabel = true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const visibleOptions = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()));

  const choose = (option) => {
    onChange(option);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={`${className} searchable`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <span>{label}</span>
      <button type="button" className="lf-combo-button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{showInlineLabel ? `${label}: ${value}` : value}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="lf-combo-menu">
          <label className="lf-combo-search">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} autoFocus />
          </label>
          <div role="listbox">
            {visibleOptions.length > 0 ? visibleOptions.map((option) => (
              <button type="button" key={option} className={option === value ? 'selected' : ''} onClick={() => choose(option)}>{option}</button>
            )) : <p>No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function DateRangeFilter({ value, range, onPresetChange, onRangeChange }) {
  const [open, setOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const label = value === 'Custom Range' && (range.from || range.to) ? `${range.from || 'From'} to ${range.to || 'To'}` : value;
  return (
    <div className="lf-select-field searchable date-range-filter" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setRangeOpen(false); } }}>
      <span>Date range</span>
      <button type="button" className="lf-combo-button" onClick={() => setOpen((current) => !current)} aria-haspopup="dialog" aria-expanded={open}>
        <span>{label}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="lf-combo-menu lf-date-menu">
          <div className="lf-date-presets">
            {leadDateOptions.map((option) => (
              <button type="button" key={option} className={option === value ? 'selected' : ''} onClick={() => { onPresetChange(option); if (option === 'Custom Range') { setOpen(false); setRangeOpen(true); } else { setRangeOpen(false); setOpen(false); } }}>{option}</button>
            ))}
          </div>
        </div>
      )}
      {rangeOpen && (
        <div className="lf-date-range-popover">
          <div className="lf-date-range-fields">
            <label><span>From</span><input type="date" value={range.from} onChange={(event) => onRangeChange({ ...range, from: event.target.value })} /></label>
            <label><span>To</span><input type="date" value={range.to} onChange={(event) => onRangeChange({ ...range, to: event.target.value })} /></label>
          </div>
          <div className="lf-date-actions">
            <button type="button" onClick={() => { onRangeChange({ from: '', to: '' }); onPresetChange('Any Time'); setOpen(false); setRangeOpen(false); }}>Clear</button>
            <button type="button" className="selected" onClick={() => { setOpen(false); setRangeOpen(false); }}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderLeadCell(lead, key, { onDetails, emailHidden, query }) {
  if (key === 'customer') {
    return (
      <button className="lf-person-cell lf-person-cell--plain" onClick={(event) => { event.stopPropagation(); onDetails(lead); }}>
        <strong>{highlightText(lead.customer, query)}</strong>
      </button>
    );
  }
  if (key === 'clientId') return <span className="link-cell">{highlightText(lead.clientId, query)}</span>;
  if (key === 'company') return highlightText(lead.company, query);
  if (key === 'phone') return highlightText(lead.phone, query);
  if (key === 'owner') return highlightText(lead.owner, query);
  if (key === 'priority') return <PriorityBadge value={lead.priority} />;
  if (key === 'status') return <StatusBadge value={lead.status} />;
  if (key === 'createdDate') return formatDate(lead.createdDate);
  if (key === 'source') return highlightText(String(lead.source || '-').toUpperCase(), query);
  return highlightText(lead[key] || '-', query);
}

function highlightText(text, query) {
  const value = String(text ?? '');
  const term = String(query || '').trim();
  if (!term) return value || '-';
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = value.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, index) => part.toLowerCase() === term.toLowerCase()
        ? <mark key={`${part}-${index}`} className="search-highlight">{part}</mark>
        : part)}
    </>
  );
}

function StatusBadge({ value }) {
  return <span className={`lf-badge status-${slug(value)}`}>{value}</span>;
}

function PriorityBadge({ value }) {
  return <span className={`lf-badge priority-${slug(value)}`}>{value}</span>;
}

function Avatar({ name, small }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2);
  return <span className={`lf-avatar${small ? ' small' : ''}`}>{initials}</span>;
}

function ExportMenu({ runExport, selectedCount }) {
  const scopes = ['visible records', selectedCount ? 'selected records' : 'all filtered records', 'all filtered records'];
  return (
    <div className="lf-export-menu" role="menu">
      {scopes.map((scope, index) => (
        <div key={`${scope}-${index}`}>
          <strong>Export {scope}</strong>
          {['CSV', 'Excel', 'PDF'].map((format) => <button key={format} onClick={() => runExport(scope, format)}>{format}</button>)}
        </div>
      ))}
    </div>
  );
}

function ColumnSelector({ draftColumns, toggleColumn, setDraftColumns, onClose, onApply }) {
  return (
    <ModalShell title="Customize Columns" onClose={onClose}>
      <div className="lf-column-list">
        {leadColumns.map((column) => (
          <label key={column.key} className={column.locked ? 'disabled' : ''}>
            <input type="checkbox" checked={draftColumns.includes(column.key) || column.locked} disabled={column.locked} onChange={() => toggleColumn(column.key)} />
            {column.label}{column.locked && <small>Required</small>}
          </label>
        ))}
      </div>
      <div className="lf-modal-actions">
        <button onClick={() => setDraftColumns(defaultLeadColumns)}>Reset to Default</button>
        <button className="primary" onClick={onApply}>Apply Columns</button>
      </div>
    </ModalShell>
  );
}

function AddLeadModal({ form, setForm, errors, saving, editing, onClose, onDraft, onSubmit }) {
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const setFullName = (value) => {
    const [firstName = '', ...rest] = value.trimStart().split(/\s+/);
    setForm((current) => ({ ...current, firstName, lastName: rest.join(' ') }));
  };
  return (
    <section className="lead-form-page">
      <div className="lead-form-page-card">
        <header className="lead-form-page-head">
          <div>
            <h2>{editing ? 'Edit Lead' : 'Add Lead'}</h2>
            <p>{editing ? 'Update lead details and save changes.' : 'Create a new lead record.'}</p>
          </div>
          <button type="button" className="lead-form-back" aria-label="Back" title="Back" onClick={onClose}><ArrowLeft size={22} /></button>
        </header>
        <form className="lf-lead-form lead-information-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <section className="lead-info-column lead-person-box">
            <h3>Person Information</h3>
            <TextInput label="Full Name" value={fullName} error={errors.firstName || errors.lastName} onChange={setFullName} required />
            <TextInput label="Date" type="date" value={form.createdDate} onChange={(value) => setField('createdDate', value)} />
            <TextInput label="Phone Number" value={form.phone} error={errors.phone} onChange={(value) => setField('phone', value)} />
            <TextInput label="Email Address" value={form.email} error={errors.email} onChange={(value) => setField('email', value)} />
            <FormSelect label="Lead Source" value={form.source} options={leadSourceOptions.filter((item) => item !== 'All Sources')} onChange={(value) => setField('source', value)} />
            <FormSelect label="Assigned Salesperson" value={form.owner} options={leadOwnerOptions.filter((item) => item !== 'All Owners')} onChange={(value) => setField('owner', value)} />
            <FormSelect label="Priority" value={form.priority} options={leadPriorityOptions.filter((item) => item !== 'All Priorities')} onChange={(value) => setField('priority', value)} />
            <FormSelect label="Status" value={form.status} options={leadStatusOptions.filter((item) => item !== 'All Statuses')} onChange={(value) => setField('status', value)} />
          </section>
          <section className="lead-info-column lead-company-box lead-company-form-grid">
            <h3>Company Information</h3>
            <TextInput label="Company Name" value={form.company} onChange={(value) => setField('company', value)} required />
            <FormSelect label="Type" value={form.companyType} options={companyTypes} onChange={(value) => setField('companyType', value)} />
            <TextInput label="Employees" type="number" value={form.companyEmployees} onChange={(value) => setField('companyEmployees', value)} />
            <TextInput label="Annual Revenue" type="number" value={form.companyAnnualRevenue} onChange={(value) => setField('companyAnnualRevenue', value)} />
            <TextInput label="Industry" value={form.companyIndustry} onChange={(value) => setField('companyIndustry', value)} />
            <TextInput label="Phone" value={form.companyPhone} onChange={(value) => setField('companyPhone', value)} />
            <TextInput label="Email" type="email" value={form.companyEmail} onChange={(value) => setField('companyEmail', value)} />
            <FormSelect label="Owner" value={form.companyOwner} options={leadOwnerOptions.filter((item) => item !== 'All Owners')} onChange={(value) => setField('companyOwner', value)} />
            <label className="lf-field full"><span>Notes</span><textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} /></label>
          </section>
        </form>
        <div className="lf-modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={onSubmit} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Lead' : 'Save Lead'}</button>
        </div>
      </div>
    </section>
  );
}

function TextInput({ label, value, onChange, error, type = 'text', required, className = '' }) {
  return (
    <label className={`lf-field${className ? ` ${className}` : ''}`}>
      <span>{label}{required && <b>*</b>}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
      {error && <small>{error}</small>}
    </label>
  );
}

function FormSelect({ label, value, options, onChange, className = '' }) {
  return <SearchableSelect className={`lf-field${className ? ` ${className}` : ''}`} label={label} value={value} options={options} onChange={onChange} showInlineLabel={false} />;
}

function LeadDetailsDrawer({ lead, onClose, onEdit, onConvert, onMarkLost, onToast, canEdit = true }) {
  const estimatedValue = Number(lead.estimatedValue || 0);

  return (
    <section className="payment-record-detail lead-record-detail" aria-label="Lead details">
      <header className="payment-record-header">
        <button type="button" className="payment-record-back" aria-label="Back" title="Back" onClick={onClose}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2>{lead.customer || 'Lead Detail'}</h2>
          <p>{lead.company || '-'} / {lead.jobTitle || lead.source || '-'}</p>
        </div>
        <div className="lead-record-actions">
          {canEdit && <button type="button" className="payment-record-edit" onClick={onEdit}><Edit3 size={15} />Edit</button>}
          {canEdit && <button type="button" className="lead-record-convert" onClick={onConvert}><Check size={15} />Convert</button>}
          {canEdit && <button type="button" className="lead-record-lost" onClick={onMarkLost}><X size={15} />Mark Lost</button>}
        </div>
      </header>

      <section className="payment-record-summary" aria-label="Lead summary">
        <div><span>Lead ID</span><strong>{lead.clientId || lead.id}</strong></div>
        <div><span>Date</span><strong>{formatDate(lead.createdDate)}</strong></div>
        <div><span>Status</span><strong>{lead.status || '-'}</strong></div>
        <div><span>Estimated Value</span><strong>{estimatedValue ? `$${estimatedValue.toLocaleString()}` : '-'}</strong></div>
      </section>

      <div className="payment-record-sections lead-primary-sections">
        <section className="payment-record-section lead-person-detail-section">
          <h3>Person Information</h3>
          <dl>
            <div><dt>Full Name*</dt><dd>{lead.customer || '-'}</dd></div>
            <div><dt>Date</dt><dd>{formatDate(lead.createdDate)}</dd></div>
            <div><dt>Phone Number</dt><dd>{lead.phone || '-'}</dd></div>
            <div><dt>Email Address</dt><dd>{lead.email || '-'}</dd></div>
            <div><dt>Lead Source</dt><dd>{lead.source || '-'}</dd></div>
            <div><dt>Assigned Salesperson</dt><dd>{lead.owner || '-'}</dd></div>
            <div><dt>Priority</dt><dd>{lead.priority || '-'}</dd></div>
            <div><dt>Status</dt><dd>{lead.status || '-'}</dd></div>
          </dl>
        </section>
      </div>

      <div className="payment-record-sections">
        <section className="payment-record-section payment-record-history">
          <h3>Activity Timeline</h3>
          <p>{lead.lastActivity || 'No recent activity.'}</p>
          <p>Discovery email sent and next step logged.</p>
        </section>

        <section className="payment-record-section payment-record-history">
          <h3>Follow-up & Tasks</h3>
          <p><strong>Upcoming Follow-up:</strong> {lead.upcomingFollowUp || '-'}</p>
          <p>Prepare account map, confirm buying committee, and update close plan.</p>
        </section>
      </div>

      <section className="payment-record-section payment-record-history lead-notes-section">
        <h3>Notes</h3>
        <p>{lead.notes || 'No notes added.'}</p>
      </section>
    </section>
  );

  return (
    <section className="lead-detail-page" aria-label="Lead details">
      <div className="lead-detail-page-card">
        <div className="lead-detail-title">
          <h2>Lead Detail</h2>
        </div>
        <div className="lf-drawer-head">
          <div className="lf-drawer-person"><Avatar name={lead.customer} /><div><h2>{lead.customer}</h2><p>{lead.company} · {lead.jobTitle}</p></div></div>
          <button type="button" className="button secondary lead-detail-back" aria-label="Back" title="Back" onClick={onClose}><ArrowLeft size={22} /></button>
        </div>
        <div className="lf-detail-grid">
          <Detail label="Full Name" value={lead.customer} />
          <Detail label="Email" value={lead.email} />
          <Detail label="Phone" value={lead.phone} />
          <Detail label="Status" value={<StatusBadge value={lead.status} />} />
          <Detail label="Priority" value={<PriorityBadge value={lead.priority} />} />
          <Detail label="Lead Source" value={lead.source} />
          <Detail label="Assigned Owner" value={lead.owner} />
        </div>
        <section className="lead-detail-section-heading">
          <h3>Company Information</h3>
        </section>
        <div className="lf-detail-grid">
          <Detail label="Company Name" value={lead.company || '-'} />
          <Detail label="Website" value={lead.jobTitle || '-'} />
          <Detail label="Industry" value={lead.source || '-'} />
          <Detail label="Employees" value={lead.expectedCloseDate || '-'} />
          <Detail label="Annual Revenue" value={lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '-'} />
          <Detail label="Estimated Value" value={`$${lead.estimatedValue.toLocaleString()}`} />
          <Detail label="Created Date" value={formatDate(lead.createdDate)} />
        </div>
        <section className="lf-detail-section"><h3>Notes</h3><p>{lead.notes}</p></section>
        <section className="lf-detail-section"><h3>Activity Timeline</h3><p>{lead.lastActivity}</p><p>Discovery email sent and next step logged.</p></section>
        <section className="lf-detail-section"><h3>Upcoming Follow-up</h3><p>{lead.upcomingFollowUp}</p></section>
        <section className="lf-detail-section"><h3>Related Tasks</h3><p>Prepare account map, confirm buying committee, and update close plan.</p></section>
        <div className="lf-drawer-actions lf-drawer-actions--footer">
          {canEdit && <button onClick={onEdit}><Edit3 size={15} />Edit</button>}
          {canEdit && <button className="primary" onClick={onConvert}><Check size={15} />Convert</button>}
          {canEdit && <button className="danger" onClick={onMarkLost}><X size={15} />Mark Lost</button>}
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }) {
  return <div className="lf-detail-item"><span>{label}</span><strong>{value}</strong></div>;
}

function DetailField({ label, value }) {
  return (
    <div className="lead-detail-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ConfirmDelete({ lead, onCancel, onConfirm }) {
  return (
    <ModalShell title="Delete this lead?" subtitle={`Delete ${lead.customer}? This action cannot be undone.`} onClose={onCancel}>
      <div className="lf-modal-actions">
        <button onClick={onCancel}>Cancel</button>
        <button className="danger" onClick={onConfirm}>Delete Lead</button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, subtitle, onClose, children, wide, className = '' }) {
  return (
    <div className="lf-modal-backdrop" role="presentation">
      <section className={`lf-modal${wide ? ' wide' : ''}${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" aria-labelledby="lf-modal-title">
        <div className="lf-modal-head">
          <div><h2 id="lf-modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button aria-label="Close modal" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function validateLeadForm(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = 'First name is required.';
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!form.email.trim() && !form.phone.trim()) errors.email = 'Email or phone is required.';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
  if (form.phone && !/^[+()\d\s-]{7,}$/.test(form.phone)) errors.phone = 'Enter a valid phone number.';
  return errors;
}

function compareLeads(a, b, key, direction) {
  const left = key === 'priority' ? priorityRank[a[key]] : key === 'status' ? statusRank[a[key]] : a[key];
  const right = key === 'priority' ? priorityRank[b[key]] : key === 'status' ? statusRank[b[key]] : b[key];
  const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left || '').localeCompare(String(right || ''));
  return direction === 'asc' ? result : -result;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function slug(value) {
  return String(value).toLowerCase().replace(/\s+/g, '-');
}
