import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  FileText,
  AlertTriangle,
  Calendar,
  Search,
  RefreshCw,
  Download,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Layers,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  Sparkles,
  Receipt,
  Wallet,
  Building2,
  Tag,
  Sliders,
  History,
  Info,
  ExternalLink,
  Filter,
  ArrowRight,
  Check,
  Percent,
} from 'lucide-react';
import {
  fetchBillingAnalyticsOverview,
  fetchBillingMrrMovement,
  fetchSubscriptions,
  fetchSubscription,
  fetchBillingCustomers,
  fetchBillingCustomer,
  fetchInvoices,
  fetchInvoice,
  getInvoicePdfUrl,
  fetchPayments,
  fetchCreditNotes,
  fetchDebitNotes,
  fetchSubscriptionAuditLogs,
  fetchDunningHistory,
} from '../utils/billingApi';

const STATUS_CHIPS = {
  DRAFT: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  FUTURE: { label: 'Future', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  TRIAL: { label: 'Trial', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  LIVE: { label: 'Live', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  PAST_DUE: { label: 'Past Due', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  UNPAID: { label: 'Unpaid', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
  NON_RENEWING: { label: 'Non-Renewing', bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  PAUSED: { label: 'Paused', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
};

const INVOICE_STATUS_CHIPS = {
  DRAFT: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  POSTED: { label: 'Posted / Unpaid', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  PARTIALLY_PAID: { label: 'Partially Paid', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  PAID: { label: 'Paid', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  VOID: { label: 'Void', bg: 'bg-slate-100 text-slate-500 border-slate-200' },
  UNCOLLECTIBLE: { label: 'Uncollectible', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function BillingReportingPage({ currentUser, setMessage }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Core Data States
  const [overview, setOverview] = useState(null);
  const [mrrMovement, setMrrMovement] = useState([]);
  const [movementMonths, setMovementMonths] = useState(6);
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  // Filter & Search States
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' | 'customers' | 'invoices' | 'payments'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drill-Down Drawer States
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [subDetail, setSubDetail] = useState(null);
  const [subDetailLoading, setSubDetailLoading] = useState(false);
  const [subDrawerTab, setSubDrawerTab] = useState('overview'); // 'overview' | 'items' | 'audit' | 'dunning'
  const [subAuditLogs, setSubAuditLogs] = useState([]);
  const [subDunningLogs, setSubDunningLogs] = useState([]);
  const [subCreditNotes, setSubCreditNotes] = useState([]);
  const [subDebitNotes, setSubDebitNotes] = useState([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [customerDetailLoading, setCustomerDetailLoading] = useState(false);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState(null);

  // Load all organization billing data concurrently
  const loadAllReportingData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [overviewData, movementData, subsData, custData, invData, payData] = await Promise.all([
        fetchBillingAnalyticsOverview(),
        fetchBillingMrrMovement({ months: movementMonths }),
        fetchSubscriptions({ page_size: 100 }),
        fetchBillingCustomers({ page_size: 100 }),
        fetchInvoices({ page_size: 100 }),
        fetchPayments({ page_size: 100 }),
      ]);

      setOverview(overviewData || null);
      setMrrMovement(Array.isArray(movementData) ? movementData : (movementData?.results || []));
      setSubscriptions(Array.isArray(subsData) ? subsData : (subsData?.results || []));
      setCustomers(Array.isArray(custData) ? custData : (custData?.results || []));
      setInvoices(Array.isArray(invData) ? invData : (invData?.results || []));
      setPayments(Array.isArray(payData) ? payData : (payData?.results || []));
    } catch (err) {
      console.error('Failed to load organization billing reporting data:', err);
      const msg = err?.message || 'Failed to load organization billing reporting data.';
      setError(msg);
      if (setMessage) setMessage(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [movementMonths, setMessage]);

  useEffect(() => {
    loadAllReportingData();
  }, [loadAllReportingData]);

  // Currency Formatter
  const formatCurrency = (val) => {
    if (val === null || val === undefined || val === '') return '$0.00';
    const num = Number(val);
    if (isNaN(num)) return `$${val}`;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined || val === '') return '0.00%';
    const num = Number(val);
    if (isNaN(num)) return `${val}%`;
    return `${num.toFixed(2)}%`;
  };

  // Derived Financial Metrics
  const calculatedMetrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((acc, inv) => {
      if (inv.status !== 'VOID') {
        return acc + Number(inv.total_amount || inv.total || 0);
      }
      return acc;
    }, 0);

    const outstandingBalance = invoices.reduce((acc, inv) => {
      if (['POSTED', 'PARTIALLY_PAID'].includes(inv.status)) {
        return acc + Number(inv.balance || 0);
      }
      return acc;
    }, 0);

    const atRiskSubs = subscriptions.filter(s => ['PAST_DUE', 'UNPAID'].includes(s.status));
    const atRiskMrr = atRiskSubs.reduce((acc, s) => acc + Number(s.cached_mrr || 0), 0);

    return {
      totalInvoiced: totalInvoiced.toFixed(2),
      outstandingBalance: outstandingBalance.toFixed(2),
      atRiskCount: atRiskSubs.length,
      atRiskMrr: atRiskMrr.toFixed(2),
    };
  }, [invoices, subscriptions]);

  // Filtered Ledgers
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(s => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        (s.subscription_number || '').toLowerCase().includes(q) ||
        (s.customer_name || s.customer?.name || '').toLowerCase().includes(q) ||
        (s.plan_name || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [subscriptions, search, statusFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        (c.customer_number || '').toLowerCase().includes(q) ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.external_reference_id || '').toLowerCase().includes(q);
      return matchSearch;
    });
  }, [customers, search]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        (inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.customer_name || inv.customer?.name || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        (p.payment_number || String(p.id)).toLowerCase().includes(q) ||
        (p.customer_name || p.customer?.name || '').toLowerCase().includes(q) ||
        (p.payment_method || '').toLowerCase().includes(q);
      return matchSearch;
    });
  }, [payments, search]);

  // Handle Subscription Drill-Down
  const handleOpenSubscription = async (subId) => {
    setSelectedSubId(subId);
    setSubDetailLoading(true);
    setSubDrawerTab('overview');
    try {
      const [detail, audits, dunnings, creditNotes, debitNotes] = await Promise.allSettled([
        fetchSubscription(subId),
        fetchSubscriptionAuditLogs(subId),
        fetchDunningHistory(subId),
        fetchCreditNotes({ subscription_id: subId }),
        fetchDebitNotes({ subscription_id: subId }),
      ]);

      if (detail.status === 'fulfilled') setSubDetail(detail.value);
      if (audits.status === 'fulfilled') setSubAuditLogs(Array.isArray(audits.value) ? audits.value : (audits.value?.results || []));
      if (dunnings.status === 'fulfilled') setSubDunningLogs(Array.isArray(dunnings.value) ? dunnings.value : (dunnings.value?.results || []));
      if (creditNotes.status === 'fulfilled') setSubCreditNotes(Array.isArray(creditNotes.value) ? creditNotes.value : (creditNotes.value?.results || []));
      if (debitNotes.status === 'fulfilled') setSubDebitNotes(Array.isArray(debitNotes.value) ? debitNotes.value : (debitNotes.value?.results || []));
    } catch (err) {
      console.error('Failed to load subscription details:', err);
    } finally {
      setSubDetailLoading(false);
    }
  };

  // Handle Customer Drill-Down
  const handleOpenCustomer = async (custId) => {
    setSelectedCustomerId(custId);
    setCustomerDetailLoading(true);
    try {
      const data = await fetchBillingCustomer(custId);
      setCustomerDetail(data);
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setCustomerDetailLoading(false);
    }
  };

  // Handle Invoice Drill-Down
  const handleOpenInvoice = async (invId) => {
    setSelectedInvoiceId(invId);
    setInvoiceDetailLoading(true);
    try {
      const data = await fetchInvoice(invId);
      setInvoiceDetail(data);
    } catch (err) {
      console.error('Failed to load invoice details:', err);
    } finally {
      setInvoiceDetailLoading(false);
    }
  };

  // Handle PDF Download
  const handleDownloadInvoicePdf = (invId) => {
    try {
      const url = getInvoicePdfUrl(invId);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to open invoice PDF URL:', err);
      if (setMessage) setMessage('Failed to open invoice PDF.');
    }
  };

  // Export Executive Summary to CSV
  const handleExportCsv = () => {
    try {
      const rows = [
        ['AdaptCRM Executive Billing Report', `Generated: ${new Date().toISOString()}`],
        ['Tenant Organization', currentUser?.profile?.organization?.name || 'Current Tenant'],
        [],
        ['Executive Metric', 'Value'],
        ['Live Monthly Recurring Revenue (MRR)', `$${overview?.live_mrr || '0.00'}`],
        ['Live Annual Recurring Revenue (ARR)', `$${overview?.live_arr || '0.00'}`],
        ['Active Subscribers', overview?.active_subscribers || 0],
        ['Total Cleared Cash Collected', `$${overview?.total_collected_revenue || '0.00'}`],
        ['Total Invoiced Amount', `$${calculatedMetrics.totalInvoiced}`],
        ['Outstanding Invoiced Balance', `$${calculatedMetrics.outstandingBalance}`],
        ['At-Risk / Dunning MRR', `$${calculatedMetrics.atRiskMrr}`],
        ['30-Day Churn Rate', `${overview?.churn_rate_pct || '0.00'}%`],
        ['Average Revenue Per User (ARPU)', `$${overview?.arpu || '0.00'}`],
        ['Customer Lifetime Value (LTV)', `$${overview?.ltv || '0.00'}`],
        [],
        ['Subscription #', 'Customer Name', 'Status', 'MRR', 'ARR', 'Start Date', 'Next Billing Date'],
        ...subscriptions.map(s => [
          s.subscription_number,
          `"${s.customer_name || s.customer?.name || ''}"`,
          s.status,
          `$${s.cached_mrr || '0.00'}`,
          `$${s.cached_arr || '0.00'}`,
          s.current_term_start || '',
          s.next_billing_date || '',
        ]),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `billing_reporting_summary_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      if (setMessage) setMessage('Failed to export CSV report.');
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-12 space-y-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <DollarSign className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={22} />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Compiling Executive Billing Ledger</h3>
          <p className="text-xs text-slate-500 mt-1">Aggregating live MRR, ARR, invoice receivables & cash receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* ── 1. HERO EXECUTIVE HEADER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-7 md:p-8 shadow-xl border border-slate-800">
        {/* Subtle Background Glow Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 backdrop-blur-md">
                <ShieldCheck size={14} className="text-indigo-400" />
                Executive Billing Suite
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Live Commercial Ledger
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Billing & Revenue Reporting
            </h1>
            
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Organization-wide commercial governance, real-time MRR/ARR waterfall, subscriber lifecycle oversight, and cash collection ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadAllReportingData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 backdrop-blur-sm transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-50"
              title="Refresh live ledger"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'} />
              <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:shadow-indigo-600/40 active:scale-95"
            >
              <Download size={15} />
              <span>Export Executive CSV</span>
            </button>
          </div>
        </div>

        {/* Hero Bottom Mini Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Organization</span>
            <span className="font-bold text-white tracking-wide text-sm">{currentUser?.profile?.organization?.name || 'QA Testing Corp'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Live Run-Rate ARR</span>
            <span className="font-bold text-emerald-400 text-sm">{formatCurrency(overview?.live_arr)}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Cleared Cash</span>
            <span className="font-bold text-indigo-300 text-sm">{formatCurrency(overview?.total_collected_revenue)}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Active Subscriptions</span>
            <span className="font-bold text-white text-sm">{overview?.active_subscribers || 0} Agreements</span>
          </div>
        </div>
      </div>

      {/* ── 2. 8 EXECUTIVE FINANCIAL KPI CARDS ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-600" />
            Executive Financial Health Overview
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Click any metric card to filter ledger</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Live MRR */}
          <div
            onClick={() => { setActiveTab('subscriptions'); setStatusFilter('LIVE'); }}
            className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 opacity-80 group-hover:opacity-100 transition"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live MRR</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition duration-200">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(overview?.live_mrr)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
              <span>Recurring monthly run-rate</span>
              <ChevronRight size={14} className="transform group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 2: Live ARR */}
          <div
            onClick={() => { setActiveTab('subscriptions'); setStatusFilter('ALL'); }}
            className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-purple-400 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500 opacity-80 group-hover:opacity-100 transition"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live ARR</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition duration-200">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(overview?.live_arr)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-purple-600 font-semibold">
              <span>Annualized projection (12x)</span>
              <ChevronRight size={14} className="transform group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 3: Active Subscribers */}
          <div
            onClick={() => { setActiveTab('subscriptions'); setStatusFilter('ALL'); }}
            className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 opacity-80 group-hover:opacity-100 transition"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Subscribers</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition duration-200">
                  <Users size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">
                {overview?.active_subscribers || 0}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-semibold">
              <span>Across {customers.length} total customers</span>
              <ChevronRight size={14} className="transform group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 4: Total Cleared Cash */}
          <div
            onClick={() => setActiveTab('payments')}
            className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-teal-400 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500 opacity-80 group-hover:opacity-100 transition"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cleared Cash</span>
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition duration-200">
                  <Wallet size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-teal-700 tracking-tight">
                {formatCurrency(overview?.total_collected_revenue)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-teal-600 font-semibold">
              <span>{payments.length} settled payment receipts</span>
              <ChevronRight size={14} className="transform group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 5: Unpaid Invoiced Receivables */}
          <div
            onClick={() => { setActiveTab('invoices'); setStatusFilter('POSTED'); }}
            className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-amber-400 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 opacity-80 group-hover:opacity-100 transition"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unpaid Receivables</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition duration-200">
                  <Receipt size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-amber-700 tracking-tight">
                {formatCurrency(calculatedMetrics.outstandingBalance)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-amber-600 font-semibold">
              <span>Posted invoice balance</span>
              <ChevronRight size={14} className="transform group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 6: At-Risk / Dunning MRR */}
          <div
            onClick={() => { setActiveTab('subscriptions'); setStatusFilter('PAST_DUE'); }}
            className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-rose-400 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500 opacity-80 group-hover:opacity-100 transition"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">At-Risk MRR</span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition duration-200">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-rose-700 tracking-tight">
                {formatCurrency(calculatedMetrics.atRiskMrr)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-rose-600 font-semibold">
              <span>{calculatedMetrics.atRiskCount} past-due / unpaid agreements</span>
              <ChevronRight size={14} className="transform group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 7: ARPU & Proj. LTV */}
          <div className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-blue-400 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 opacity-80"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ARPU / LTV</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BarChart3 size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(overview?.arpu)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
              <span>Lifetime Value: {formatCurrency(overview?.ltv)}</span>
            </div>
          </div>

          {/* Card 8: 30D Churn Rate */}
          <div
            onClick={() => { setActiveTab('subscriptions'); setStatusFilter('CANCELLED'); }}
            className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-slate-400 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-500 opacity-80 group-hover:opacity-100 transition"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">30D Churn Rate</span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-slate-700 group-hover:text-white transition duration-200">
                  <PieChart size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatPercent(overview?.churn_rate_pct)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
              <span>Subscriber turnover</span>
              <ChevronRight size={14} className="transform group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. MRR WATERFALL & COMMERCIAL DISTRIBUTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: MRR Movement Waterfall Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={18} className="text-indigo-600" />
                  MRR Growth & Movement Waterfall
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Authoritative monthly net recurring revenue progression.</p>
              </div>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto">
                {[3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setMovementMonths(m)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      movementMonths === m
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m} Months
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
                    <th className="py-3 px-3.5 rounded-l-lg">Period</th>
                    <th className="py-3 px-3 text-emerald-700">New MRR</th>
                    <th className="py-3 px-3 text-blue-700">Expansion</th>
                    <th className="py-3 px-3 text-amber-700">Contraction</th>
                    <th className="py-3 px-3 text-rose-700">Churned</th>
                    <th className="py-3 px-3">Net Growth</th>
                    <th className="py-3 px-3.5 text-right font-bold text-slate-900 rounded-r-lg">Ending MRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mrrMovement.length > 0 ? (
                    mrrMovement.map(period => (
                      <tr key={period.period} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {period.period}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            +{formatCurrency(period.new_mrr)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            +{formatCurrency(period.expansion_mrr)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                            -{formatCurrency(period.contraction_mrr)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                            -{formatCurrency(period.churned_mrr)}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold">
                          <span className={`flex items-center gap-0.5 ${Number(period.net_mrr_growth) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {Number(period.net_mrr_growth) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {formatCurrency(period.net_mrr_growth)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-extrabold text-slate-900 text-sm">
                          {formatCurrency(period.ending_mrr)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 italic">No movement records recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Commercial Distribution & Plan Adoption */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieChart size={18} className="text-indigo-600" />
                Commercial Distribution
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Live agreement status & catalog adoption.</p>
            </div>

            {/* Status Breakdown */}
            <div className="mt-4 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">By Lifecycle Status</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(overview?.subscriber_breakdown?.by_status || {}).map(([st, cnt]) => {
                  const meta = STATUS_CHIPS[st] || { label: st, bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
                  return (
                    <div key={st} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/50 hover:bg-slate-50 transition">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                        <span className="font-semibold text-slate-700 text-[11px]">{meta.label}</span>
                      </div>
                      <span className="font-extrabold text-slate-900 text-xs px-2 py-0.5 bg-white rounded-md border border-slate-200/60 shadow-2xs">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan Adoption */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">By Catalog Plan</span>
              <div className="space-y-2 text-xs">
                {Object.entries(overview?.subscriber_breakdown?.by_plan || {}).map(([pName, cnt]) => {
                  const pct = Math.round((cnt / (overview?.active_subscribers || 1)) * 100);
                  return (
                    <div key={pName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{pName}</span>
                        <span className="font-bold text-indigo-700">{cnt} active ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(overview?.subscriber_breakdown?.by_plan || {}).length === 0 && (
                  <p className="text-xs text-slate-400 italic">No plan distributions active.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. ORGANIZATION LEDGER & DRILL-DOWN ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Ledger Navigation Header */}
        <div className="bg-slate-50/70 border-b border-slate-200/80 p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Segmented Pill Tabs */}
          <div className="flex items-center bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300/60 overflow-x-auto gap-1">
            {[
              { id: 'subscriptions', label: 'Subscriptions', count: subscriptions.length, icon: FileText },
              { id: 'customers', label: 'Customers', count: customers.length, icon: Users },
              { id: 'invoices', label: 'Invoices', count: invoices.length, icon: Receipt },
              { id: 'payments', label: 'Payments', count: payments.length, icon: CreditCard },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setStatusFilter('ALL'); }}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-sm shadow-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-500'} />
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-300/80 text-slate-700'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="search"
                placeholder="Search by ID, name, number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {activeTab === 'subscriptions' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="py-2 px-3 text-xs bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="LIVE">Live</option>
                <option value="PAST_DUE">Past Due</option>
                <option value="PAUSED">Paused</option>
                <option value="NON_RENEWING">Non-Renewing</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="DRAFT">Draft</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            )}

            {activeTab === 'invoices' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="py-2 px-3 text-xs bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="ALL">All Invoices</option>
                <option value="POSTED">Posted / Unpaid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="VOID">Void</option>
                <option value="UNCOLLECTIBLE">Uncollectible</option>
              </select>
            )}
          </div>
        </div>

        {/* ── TAB CONTENT TABLES ── */}
        <div className="p-0">
          {/* TAB 1: SUBSCRIPTIONS LEDGER */}
          {activeTab === 'subscriptions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-5">Subscription #</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Active Plan</th>
                    <th className="py-3.5 px-4">MRR ($)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Next Billing Date</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubscriptions.length > 0 ? (
                    filteredSubscriptions.map(sub => {
                      const chip = STATUS_CHIPS[sub.status] || { label: sub.status, bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
                      return (
                        <tr
                          key={sub.id}
                          onClick={() => handleOpenSubscription(sub.id)}
                          className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-5 font-mono font-bold text-indigo-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {sub.subscription_number}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{sub.customer_name || sub.customer?.name || '—'}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">{sub.plan_name || 'Standard Plan'}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">{formatCurrency(sub.cached_mrr)}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${chip.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`}></span>
                              {chip.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium">{sub.next_billing_date || '—'}</td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenSubscription(sub.id); }}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs"
                            >
                              <Eye size={13} />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 italic">No subscriptions matching filter criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: CUSTOMERS LEDGER */}
          {activeTab === 'customers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-5">Customer #</th>
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Currency</th>
                    <th className="py-3.5 px-4">Unapplied Credit</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(cust => (
                      <tr
                        key={cust.id}
                        onClick={() => handleOpenCustomer(cust.id)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-5 font-mono font-bold text-indigo-600">{cust.customer_number}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{cust.name}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">{cust.email}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{cust.currency || 'USD'}</td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-600">{formatCurrency(cust.unapplied_credit_balance || '0.00')}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            cust.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cust.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {cust.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenCustomer(cust.id); }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 italic">No customer records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: INVOICES LEDGER */}
          {activeTab === 'invoices' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-5">Invoice #</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4">Paid Amount</th>
                    <th className="py-3.5 px-4">Remaining Balance</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map(inv => {
                      const chip = INVOICE_STATUS_CHIPS[inv.status] || { label: inv.status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => handleOpenInvoice(inv.id)}
                          className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-5 font-mono font-bold text-indigo-600">{inv.invoice_number}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{inv.customer_name || inv.customer?.name || '—'}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">{formatCurrency(inv.total_amount || inv.total)}</td>
                          <td className="py-3.5 px-4 font-semibold text-emerald-600">{formatCurrency(inv.paid_amount || '0.00')}</td>
                          <td className="py-3.5 px-4 font-extrabold text-amber-700">{formatCurrency(inv.balance)}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${chip.bg}`}>
                              {chip.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium">{inv.due_date || '—'}</td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleDownloadInvoicePdf(inv.id)}
                                className="p-1.5 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-lg transition"
                                title="Download ReportLab PDF"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenInvoice(inv.id)}
                                className="px-3 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 italic">No invoice records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: PAYMENTS LEDGER */}
          {activeTab === 'payments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-5">Payment #</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Settled Amount</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Settlement Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPayment(p)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-5 font-mono font-bold text-indigo-600">{p.payment_number || `PAY-${p.id}`}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{p.customer_name || p.customer?.name || '—'}</td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-600">{formatCurrency(p.amount)}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">{p.payment_method || 'Card / Online'}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">{p.payment_date ? p.payment_date.slice(0, 10) : '—'}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {p.status || 'SUCCEEDED'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedPayment(p); }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs"
                          >
                            <Eye size={13} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 italic">No payment records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ledger Summary Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Showing <strong className="text-slate-800">
              {activeTab === 'subscriptions' ? filteredSubscriptions.length : activeTab === 'customers' ? filteredCustomers.length : activeTab === 'invoices' ? filteredInvoices.length : filteredPayments.length}
            </strong> records in current view
          </span>
          <span className="font-semibold text-slate-600">
            Authoritative Organization Ledger • Multi-Tenant Isolated
          </span>
        </div>
      </div>

      {/* ── 5. DRILL-DOWN CENTER DRAWER: SUBSCRIPTION DETAILS ── */}
      {selectedSubId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl max-h-[90vh] flex flex-col justify-between overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 md:p-7 border-b border-slate-200 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {subDetail?.subscription_number || `Subscription #${selectedSubId}`}
                  </h2>
                  {subDetail && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_CHIPS[subDetail.status]?.bg || 'bg-slate-100 text-slate-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CHIPS[subDetail.status]?.dot || 'bg-slate-400'}`}></span>
                      {STATUS_CHIPS[subDetail.status]?.label || subDetail.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Customer: <strong className="text-slate-800">{subDetail?.customer_name || subDetail?.customer?.name || 'Loading...'}</strong>
                </p>
              </div>
              <button
                onClick={() => { setSelectedSubId(null); setSubDetail(null); }}
                className="p-2 hover:bg-slate-200/70 rounded-xl text-slate-400 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
              {subDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-semibold">Loading agreement commercial details...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Segmented Sub Tabs */}
                  <div className="flex border-b border-slate-200 gap-2">
                    {[
                      { id: 'overview', label: 'Commercial Overview' },
                      { id: 'items', label: `Snapshot Items (${subDetail?.items?.length || 0})` },
                      { id: 'audit', label: `Audit Trail (${subAuditLogs.length})` },
                      { id: 'dunning', label: `Dunning Logs (${subDunningLogs.length})` },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSubDrawerTab(t.id)}
                        className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
                          subDrawerTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: OVERVIEW */}
                  {subDrawerTab === 'overview' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-white rounded-2xl border border-indigo-100">
                          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">Monthly Recurring Revenue</span>
                          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{formatCurrency(subDetail?.cached_mrr)}</span>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-purple-50/80 to-white rounded-2xl border border-purple-100">
                          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Annual Recurring Revenue</span>
                          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{formatCurrency(subDetail?.cached_arr)}</span>
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-500 font-medium">Current Term Start</span>
                          <span className="font-bold text-slate-900">{subDetail?.current_term_start || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-500 font-medium">Current Term End</span>
                          <span className="font-bold text-slate-900">{subDetail?.current_term_end || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-500 font-medium">Next Scheduled Billing</span>
                          <span className="font-extrabold text-indigo-600">{subDetail?.next_billing_date || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-500 font-medium">Collection Method</span>
                          <span className="font-bold text-slate-900">{subDetail?.collection_method || 'CHARGE_AUTOMATIC'}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500 font-medium">Payment Terms</span>
                          <span className="font-bold text-slate-900">Net {subDetail?.payment_terms_days || 0} Days</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ITEMS & ADD-ONS */}
                  {subDrawerTab === 'items' && (
                    <div className="space-y-3">
                      {(subDetail?.items || []).map(item => (
                        <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{item.plan_name || item.addon_name || 'Commercial Line Item'}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800">{item.item_type}</span>
                            </div>
                            <p className="text-slate-500 mt-1 font-medium">Quantity: {item.quantity || 1} • Unit Snapshot: {formatCurrency(item.unit_price)}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-extrabold text-slate-900 block">{formatCurrency((Number(item.unit_price) * Number(item.quantity || 1)) - Number(item.discount_amount || 0))}</span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Locked Snapshot</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 3: AUDIT TRAIL */}
                  {subDrawerTab === 'audit' && (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {subAuditLogs.length > 0 ? (
                        subAuditLogs.map(log => (
                          <div key={log.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{log.action || log.title}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</span>
                            </div>
                            <p className="text-slate-600 font-medium">{log.reason || 'Lifecycle event executed'}</p>
                            {log.state_delta && (
                              <div className="text-[11px] text-indigo-700 bg-indigo-50/70 p-2 rounded-lg font-mono border border-indigo-100">
                                {log.state_delta.old} ➔ {log.state_delta.new}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-10 text-slate-400 text-xs italic">No audit records recorded.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 4: DUNNING HISTORY */}
                  {subDrawerTab === 'dunning' && (
                    <div className="space-y-3">
                      {subDunningLogs.length > 0 ? (
                        subDunningLogs.map(log => (
                          <div key={log.id} className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 text-xs space-y-1.5">
                            <div className="flex justify-between">
                              <span className="font-bold text-rose-900">Attempt #{log.attempt_number} ({log.action_taken || log.status})</span>
                              <span className="text-[10px] text-rose-500 font-medium">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</span>
                            </div>
                            <p className="text-rose-700 font-medium">{log.error_message || 'Payment collection failed'}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-10 text-slate-400 text-xs italic">No failed payment retry attempts recorded.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => { setSelectedSubId(null); setSubDetail(null); }}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition shadow-2xs"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. DRILL-DOWN CENTER DRAWER: CUSTOMER DETAILS ── */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl max-h-[90vh] flex flex-col justify-between overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 md:p-7 border-b border-slate-200 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{customerDetail?.name || 'Customer Details'}</h2>
                <p className="text-xs font-mono font-bold text-indigo-600 mt-0.5">{customerDetail?.customer_number}</p>
              </div>
              <button
                onClick={() => { setSelectedCustomerId(null); setCustomerDetail(null); }}
                className="p-2 hover:bg-slate-200/70 rounded-xl text-slate-400 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
              {customerDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-semibold">Loading customer profile...</p>
                </div>
              ) : (
                <div className="space-y-5 text-xs">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Email Address</span>
                      <span className="font-bold text-slate-900">{customerDetail?.email || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Phone Number</span>
                      <span className="font-semibold text-slate-900">{customerDetail?.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Account Currency</span>
                      <span className="font-extrabold text-indigo-600">{customerDetail?.currency || 'USD'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500 font-medium">Unapplied Credit Balance</span>
                      <span className="font-extrabold text-emerald-600 text-sm">{formatCurrency(customerDetail?.unapplied_credit_balance || '0.00')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => { setSelectedCustomerId(null); setCustomerDetail(null); }}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition shadow-2xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. DRILL-DOWN CENTER DRAWER: INVOICE DETAILS ── */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl max-h-[90vh] flex flex-col justify-between overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 md:p-7 border-b border-slate-200 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">{invoiceDetail?.invoice_number || `Invoice #${selectedInvoiceId}`}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Customer: <strong className="text-slate-800">{invoiceDetail?.customer_name || invoiceDetail?.customer?.name}</strong></p>
              </div>
              <button
                onClick={() => { setSelectedInvoiceId(null); setInvoiceDetail(null); }}
                className="p-2 hover:bg-slate-200/70 rounded-xl text-slate-400 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
              {invoiceDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-semibold">Loading invoice details...</p>
                </div>
              ) : (
                <div className="space-y-5 text-xs">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Total Invoiced</span>
                      <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(invoiceDetail?.total_amount || invoiceDetail?.total)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Paid Amount</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(invoiceDetail?.paid_amount || '0.00')}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500 font-medium">Remaining Balance</span>
                      <span className="font-extrabold text-amber-700 text-sm">{formatCurrency(invoiceDetail?.balance)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">Line Items ({invoiceDetail?.lines?.length || 0})</span>
                    {(invoiceDetail?.lines || []).map((line, idx) => (
                      <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center shadow-2xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{line.description}</span>
                          <span className="text-slate-500 text-[11px]">Qty: {line.quantity} • Unit: {formatCurrency(line.unit_price)}</span>
                        </div>
                        <span className="font-extrabold text-slate-900">{formatCurrency(line.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <button
                onClick={() => handleDownloadInvoicePdf(selectedInvoiceId)}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
              >
                <Download size={14} />
                <span>Download ReportLab PDF</span>
              </button>
              <button
                onClick={() => { setSelectedInvoiceId(null); setInvoiceDetail(null); }}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. DRILL-DOWN CENTER DRAWER: PAYMENT ALLOCATION ── */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6 text-xs border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Wallet size={18} className="text-emerald-600" />
                Payment Receipt
              </h3>
              <button onClick={() => setSelectedPayment(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Payment Number</span>
                <span className="font-mono font-bold text-indigo-600">{selectedPayment.payment_number || `PAY-${selectedPayment.id}`}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Customer</span>
                <span className="font-bold text-slate-900">{selectedPayment.customer_name || selectedPayment.customer?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Settled Cash Amount</span>
                <span className="font-extrabold text-emerald-600 text-sm">{formatCurrency(selectedPayment.amount)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Settlement Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                  <Check size={12} />
                  {selectedPayment.status || 'SUCCEEDED'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
