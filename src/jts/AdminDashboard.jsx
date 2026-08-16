import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Edit3, Trash2, X } from 'lucide-react';
import { fetchApprovalRequests } from '../data/jts/approvalsApi';
import { StatusBadge } from './ui';

const dateOptions = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'last-7-days', label: 'Last 7 Days' },
  { value: 'this-month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
];
const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function matchesDateFilter(value, filter, range = {}) {
  if (!filter || filter === 'all') return true;

  const date = new Date(value);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (filter === 'today') {
    return date >= startOfToday;
  }

  if (filter === 'last-7-days') {
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    return date >= sevenDaysAgo;
  }

  if (filter === 'this-month') {
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }

  if (filter === 'custom') {
    const from = range.from ? new Date(`${range.from}T00:00:00`) : null;
    const to = range.to ? new Date(`${range.to}T23:59:59`) : null;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  }

  return true;
}

function SearchableFilter({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value) || options[0];
  const filtered = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="lf-select-field searchable admin-searchable-filter">
      <span className="admin-filter-label">{label}</span>
      <button
        type="button"
        className="lf-combo-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="lf-combo-menu">
          <label className="lf-combo-search">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} />
          </label>
          <div role="listbox">
            {filtered.map((option) => (
              <button
                type="button"
                key={option.value}
                className={option.value === value ? 'selected' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setQuery('');
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DateFilter({ value, range, onChange, onRangeChange }) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const selected = dateOptions.find((option) => option.value === value) || dateOptions[0];
  const label = value === 'custom' && (range.from || range.to)
    ? `${range.from || 'Start'} to ${range.to || 'End'}`
    : selected.label;

  const chooseOption = (optionValue) => {
    onChange(optionValue);
    if (optionValue === 'custom') {
      setCustomOpen(true);
      return;
    }

    setCustomOpen(false);
    setOpen(false);
  };

  return (
    <div className="lf-select-field searchable admin-searchable-filter admin-date-filter">
      <span className="admin-filter-label">Date</span>
      <button
        type="button"
        className="lf-combo-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setCustomOpen(value === 'custom');
        }}
      >
        <span>{label}</span>
        <ChevronDown size={15} />
      </button>

      {open && (
        <div className="lf-combo-menu admin-date-menu">
          {customOpen ? (
            <div className="admin-custom-date-popover">
              <label>
                <span>From</span>
                <input type="date" value={range.from} onChange={(event) => onRangeChange({ ...range, from: event.target.value })} />
              </label>
              <label>
                <span>To</span>
                <input type="date" value={range.to} onChange={(event) => onRangeChange({ ...range, to: event.target.value })} />
              </label>
              <div className="admin-custom-date-actions">
                <button
                  type="button"
                  onClick={() => {
                    onChange('all');
                    onRangeChange({ from: '', to: '' });
                    setCustomOpen(false);
                    setOpen(false);
                  }}
                >
                  Clear
                </button>
                <button type="button" className="primary" onClick={() => setOpen(false)}>
                  Apply
                </button>
              </div>
            </div>
          ) : (
            <div role="listbox">
              {dateOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={option.value === value ? 'selected' : ''}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseOption(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [deletingApplicationId, setDeletingApplicationId] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    owner: 'all',
    dateRange: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const selectedApplication = applications.find((app) => app.id === selectedApplicationId);
  const deletingApplication = applications.find((app) => app.id === deletingApplicationId);

  useEffect(() => {
    fetchApprovalRequests()
      .then((requests) => setApplications(requests))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = (id) => {
    setApplications(applications.map((app) => app.id === id ? { ...app, status: 'Approved' } : app));
  };

  const handleReject = (id) => {
    setApplications(applications.map((app) => app.id === id ? { ...app, status: 'Rejected' } : app));
  };

  const handleDelete = (id) => {
    setApplications(applications.filter((app) => app.id !== id));
    if (selectedApplicationId === id) setSelectedApplicationId(null);
    setDeletingApplicationId(null);
  };

  const owners = useMemo(() => [
    { value: 'all', label: 'All Owners' },
    ...[...new Set(applications.map((app) => app.ownerName))].map((owner) => ({ value: owner, label: owner })),
  ], [applications]);
  const filteredApplications = useMemo(() => {
    return applications.filter((application) => (
      (filters.status === 'all' || application.status === filters.status) &&
      (filters.owner === 'all' || application.ownerName === filters.owner) &&
      matchesDateFilter(application.createdAt, filters.dateRange, { from: filters.dateFrom, to: filters.dateTo })
    ));
  }, [applications, filters]);
  const summary = {
    total: applications.length,
    pending: applications.filter((app) => app.status === 'Pending').length,
    approved: applications.filter((app) => app.status === 'Approved').length,
    rejected: applications.filter((app) => app.status === 'Rejected').length,
  };
  const hasActiveFilters = filters.status !== 'all' || filters.owner !== 'all' || filters.dateRange !== 'all';

  return (
    <section className="lf-page leads-page contacts-page catalog-admin-page approvals-page">
      <section className="lf-table-card sales-table-card admin-table-card">
        <section className="page-panel leads-page-panel">
          <section className="crm-summary-strip contact-summary-strip catalog-summary-strip approval-summary-strip" aria-label="Approval summary">
            <article>
              <span>Total Requests</span>
              <strong>{summary.total}</strong>
            </article>
            <article>
              <span>Pending</span>
              <strong className="approval-summary-amber">{summary.pending}</strong>
            </article>
            <article>
              <span>Approved</span>
              <strong className="catalog-summary-green">{summary.approved}</strong>
            </article>
            <article>
              <span>Rejected</span>
              <strong className="catalog-summary-red">{summary.rejected}</strong>
            </article>
          </section>

          <section className="page-panel-filters lf-filter-bar admin-toolbar approval-toolbar">
            <label className="admin-select-filter">
              <span>Status</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <SearchableFilter label="Owner" value={filters.owner} options={owners} onChange={(value) => setFilters((current) => ({ ...current, owner: value }))} />

            <DateFilter
              value={filters.dateRange}
              range={{ from: filters.dateFrom, to: filters.dateTo }}
              onChange={(value) => setFilters((current) => ({
                ...current,
                dateRange: value,
                ...(value !== 'custom' ? { dateFrom: '', dateTo: '' } : {}),
              }))}
              onRangeChange={(range) => setFilters((current) => ({ ...current, dateFrom: range.from, dateTo: range.to, dateRange: 'custom' }))}
            />

            {hasActiveFilters && (
              <button
                type="button"
                className="admin-clear-filters"
                title="Clear filters"
                onClick={() => setFilters({ status: 'all', owner: 'all', dateRange: 'all', dateFrom: '', dateTo: '' })}
              >
                <X size={15} />
              </button>
            )}
          </section>

          <header className="page-panel-header sales-page-header approval-page-header">
            <span>{filteredApplications.length} visible</span>
          </header>
        </section>

        <div className="lf-table-scroll">
          <table className="lf-leads-table approval-table">
            <thead>
              <tr>
                <th className="lf-sr-col">#</th>
                <th>Date</th>
                <th>Company Logo</th>
                <th>Company Name</th>
                <th>Owner Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                <tr>
                  <td colSpan="8" className="admin-empty"><strong>Loading approval requests...</strong></td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {filteredApplications.map((application, index) => (
                  <tr key={application.id} onClick={() => setSelectedApplicationId(application.id)}>
                    <td className="lf-sr-col">{index + 1}</td>
                    <td>{formatDate(application.createdAt)}</td>
                    <td>
                      <span className="approval-logo">{application.companyLogo}</span>
                    </td>
                    <td>{application.companyName}</td>
                    <td>{application.ownerName}</td>
                    <td>{application.email}</td>
                    <td><StatusBadge status={application.status} /></td>
                    <td>
                      <div className="inline-row-actions approval-row-actions">
                        <button type="button" className="inline-action inline-action--edit" title="Edit" onClick={(event) => { event.stopPropagation(); setSelectedApplicationId(application.id); }}>
                          <Edit3 size={15} />
                        </button>
                        <button type="button" className="inline-action inline-action--delete" title="Delete" onClick={(event) => { event.stopPropagation(); setDeletingApplicationId(application.id); }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredApplications.length && (
                  <tr>
                    <td colSpan="8" className="admin-empty"><strong>No approval requests match these filters.</strong></td>
                  </tr>
                )}
              </tbody>
            )}
          </table>
        </div>
      </section>

      {selectedApplication && (
        <div className="approval-modal-backdrop" role="presentation">
          <section className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-detail-title">
            <header className="approval-modal-head">
              <div>
                <h3 id="approval-detail-title">Registration Details</h3>
                <p>{selectedApplication.companyName}</p>
              </div>
              <button type="button" aria-label="Close details" onClick={() => setSelectedApplicationId(null)}>
                <X size={18} />
              </button>
            </header>

            <div className="approval-modal-status">
              <span>{formatDate(selectedApplication.createdAt)}</span>
              <StatusBadge status={selectedApplication.status} />
            </div>

            <div className="approval-detail-grid">
              <p><span>Owner Name</span>{selectedApplication.ownerName}</p>
              <p><span>Email</span>{selectedApplication.email}</p>
              <p><span>Phone Number</span>{selectedApplication.phoneNumber}</p>
              <p><span>Country</span>{selectedApplication.country}</p>
              <p><span>CNIC</span>{selectedApplication.cnic}</p>
              <p><span>Address</span>{selectedApplication.address}</p>
            </div>

            <footer className="approval-modal-actions">
              <button type="button" className="approve" onClick={() => handleApprove(selectedApplication.id)}>
                Approve
              </button>
              <button type="button" className="reject" onClick={() => handleReject(selectedApplication.id)}>
                Reject
              </button>
            </footer>
          </section>
        </div>
      )}

      {deletingApplication && (
        <div className="approval-modal-backdrop" role="presentation">
          <section className="approval-modal approval-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-approval-title">
            <header className="approval-modal-head">
              <div>
                <h3 id="delete-approval-title">Delete this request?</h3>
                <p>Delete {deletingApplication.companyName}? This action cannot be undone.</p>
              </div>
              <button type="button" aria-label="Close confirmation" onClick={() => setDeletingApplicationId(null)}>
                <X size={18} />
              </button>
            </header>

            <footer className="approval-modal-actions">
              <button type="button" className="approval-cancel" onClick={() => setDeletingApplicationId(null)}>
                Cancel
              </button>
              <button type="button" className="reject" onClick={() => handleDelete(deletingApplication.id)}>
                Delete
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
