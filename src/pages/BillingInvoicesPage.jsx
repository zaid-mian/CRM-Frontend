import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  FileText,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Download,
  PlusCircle,
  Package,
} from 'lucide-react';
import {
  fetchInvoices,
  fetchInvoice,
  generateInvoice,
  fetchSubscriptions,
  getInvoicePdfUrl,
  formatBillingApiErrorMessage,
} from '../utils/billingApi';

const STATUS_CHIPS = {
  DRAFT: { label: 'Draft', bg: '#f1f5f9', text: '#475569' },
  POSTED: { label: 'Posted', bg: '#eff6ff', text: '#1d4ed8' },
  PAID: { label: 'Paid', bg: '#ecfdf5', text: '#047857' },
  PARTIALLY_PAID: { label: 'Partially Paid', bg: '#fffbeb', text: '#b45309' },
  VOID: { label: 'Void', bg: '#f1f5f9', text: '#94a3b8' },
  UNCOLLECTIBLE: { label: 'Uncollectible', bg: '#fef2f2', text: '#b91c1c' },
};

export default function BillingInvoicesPage({ currentUser, setMessage }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Generate Invoice Modal State
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [subscriptionsList, setSubscriptionsList] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [generating, setGenerating] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoices({ search, status: statusFilter });
      setInvoices(data);
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [search, statusFilter]);

  const handleOpenDetail = async (invoiceId) => {
    setDrawerOpen(true);
    try {
      const detail = await fetchInvoice(invoiceId);
      setSelectedInvoiceDetail(detail);
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    }
  };

  const handleOpenGenerateModal = async () => {
    setGenerateModalOpen(true);
    setSelectedSubId('');
    try {
      const subs = await fetchSubscriptions();
      setSubscriptionsList(subs);
      if (subs.length > 0) {
        setSelectedSubId(subs[0].id);
      }
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    }
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubId) {
      setMessage('Please select a subscription.');
      return;
    }

    setGenerating(true);
    try {
      const inv = await generateInvoice({ subscription: parseInt(selectedSubId, 10) });
      setMessage(`Invoice ${inv.invoice_number} generated successfully.`);
      setGenerateModalOpen(false);
      loadInvoices();
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="crm-legacy-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={24} style={{ color: '#2563eb' }} /> Invoices & Billing Documents
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
            View and generate posted commercial invoices, itemized breakdown statements, and PDF documents.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenGenerateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '6px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} /> Generate Invoice
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by invoice #, customer, or subscription..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '38px',
              paddingRight: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
            }}
          />
        </div>
        <div style={{ width: '200px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CHIPS).map(([key, item]) => (
              <option key={key} value={key}>{item.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No invoices found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: '600' }}>
                <th style={{ padding: '12px 16px' }}>Invoice #</th>
                <th style={{ padding: '12px 16px' }}>Customer</th>
                <th style={{ padding: '12px 16px' }}>Subscription #</th>
                <th style={{ padding: '12px 16px' }}>Issue Date</th>
                <th style={{ padding: '12px 16px' }}>Due Date</th>
                <th style={{ padding: '12px 16px' }}>Total Amount</th>
                <th style={{ padding: '12px 16px' }}>Balance</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const chip = STATUS_CHIPS[inv.status] || STATUS_CHIPS.POSTED;
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>
                      {inv.invoice_number}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500', color: '#0f172a' }}>{inv.customer_name || `Customer #${inv.customer}`}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{inv.customer_number}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {inv.subscription_number || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{inv.issue_date}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{inv.due_date}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                      ${inv.total_amount}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#2563eb' }}>
                      ${inv.balance}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: chip.bg,
                          color: chip.text,
                        }}
                      >
                        {chip.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(inv.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#334155',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Eye size={14} /> Detail
                      </button>
                      <a
                        href={getInvoicePdfUrl(inv.id)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#1e293b',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Download size={14} /> PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Invoice Detail Drawer */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDrawerOpen(false);
            }
          }}
        >
          <div
            style={{
              width: '760px',
              maxWidth: '96vw',
              maxHeight: '90vh',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  {selectedInvoiceDetail?.invoice_number || 'Invoice Detail'}
                </h2>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Customer: {selectedInvoiceDetail?.customer_name || '—'} ({selectedInvoiceDetail?.customer_number})
                </span>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {selectedInvoiceDetail ? (
                <>
                  {/* Revenue / Balance Banner */}
                  <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Total Amount</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a', marginTop: '2px' }}>
                        ${selectedInvoiceDetail.total_amount}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Balance Due</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#1d4ed8' }}>
                        ${selectedInvoiceDetail.balance}
                      </div>
                    </div>
                  </div>

                  {/* Dates & Reference Card */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Issue Date</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedInvoiceDetail.issue_date}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Due Date</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedInvoiceDetail.due_date}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Coverage Period</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedInvoiceDetail.billing_period_start || '—'} to {selectedInvoiceDetail.billing_period_end || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Idempotency Key</div>
                      <div style={{ fontWeight: '500', color: '#64748b', fontSize: '11px' }}>{selectedInvoiceDetail.idempotency_key}</div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>Itemized Statement Lines</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedInvoiceDetail.lines && selectedInvoiceDetail.lines.length > 0 ? (
                        selectedInvoiceDetail.lines.map((l) => (
                          <div key={l.id} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>{l.description}</div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                {l.quantity} x ${l.unit_price} {parseFloat(l.discount_amount) > 0 ? `(-$${l.discount_amount} discount)` : ''}
                              </div>
                            </div>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                              ${l.total_amount}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No line items.</div>
                      )}
                    </div>
                  </div>

                  {/* PDF Download Button */}
                  <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                    <a
                      href={getInvoicePdfUrl(selectedInvoiceDetail.id)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '10px 18px',
                        borderRadius: '6px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '14px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Download size={16} /> Download Official PDF Invoice
                    </a>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading details...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {generateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '500px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} style={{ color: '#2563eb' }} /> Generate Commercial Invoice
              </h3>
              <button type="button" onClick={() => setGenerateModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Select Subscription *
                  </label>
                  <select
                    value={selectedSubId}
                    onChange={(e) => setSelectedSubId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    <option value="">-- Choose Subscription --</option>
                    {subscriptionsList.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.subscription_number} - {sub.customer_name} ({sub.status}) [MRR: ${sub.cached_mrr}]
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                    Invoice lines will be derived from active subscription items with deterministic idempotency key.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  style={{ padding: '10px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', fontSize: '14px', cursor: 'pointer', opacity: generating ? 0.7 : 1 }}
                >
                  {generating ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
