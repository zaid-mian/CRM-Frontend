import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  FileText,
  Calendar,
  CreditCard,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  Shield,
  Layers,
  Package,
  Trash2,
  PlusCircle,
  Tag,
  Sliders,
  DollarSign,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ArrowRightLeft,
  History,
  ChevronDown,
  ChevronUp,
  Activity,
  User,
  Bot,
} from 'lucide-react';
import {
  fetchSubscriptions,
  fetchSubscription,
  createSubscription,
  fetchBillingCustomers,
  fetchAvailablePlans,
  fetchAvailableAddons,
  addSubscriptionItem,
  deleteSubscriptionItem,
  transitionSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  fetchInvoices,
  generateInvoice,
  getInvoicePdfUrl,
  fetchPayments,
  runSubscriptionRenewals,
  fetchDunningHistory,
  runDunningRetries,
  previewSubscriptionAmendment,
  commitSubscriptionAmendment,
  fetchCreditNotes,
  fetchCreditNote,
  issueCreditNote,
  allocateCreditNote,
  fetchCustomerUnappliedCredit,
  fetchDebitNotes,
  issueDebitNote,
  fetchSubscriptionAuditLogs,
  formatBillingApiErrorMessage,
} from '../utils/billingApi';

const getNextBillingCountdown = (nextBillingDateStr) => {
  if (!nextBillingDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(nextBillingDateStr + 'T00:00:00');
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, color: '#ef4444', isDue: true };
  } else if (diffDays === 0) {
    return { text: 'Due today', color: '#ea580c', isDue: true };
  } else {
    return { text: `In ${diffDays}d`, color: '#2563eb', isDue: false };
  }
};


const STATUS_CHIPS = {
  DRAFT: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  FUTURE: { label: 'Future', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  TRIAL: { label: 'Trial', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  LIVE: { label: 'Live', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  PAST_DUE: { label: 'Past Due', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  UNPAID: { label: 'Unpaid', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300' },
  NON_RENEWING: { label: 'Non-Renewing', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  PAUSED: { label: 'Paused', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
};

const ALLOWED_TRANSITIONS = {
  DRAFT: [
    { target: 'LIVE', label: 'Activate Subscription', variant: 'primary' },
    { target: 'TRIAL', label: 'Start Trial', variant: 'purple' },
    { target: 'FUTURE', label: 'Set Future Start', variant: 'blue' },
    { target: 'CANCELLED', label: 'Cancel Subscription', variant: 'danger', requiresReason: true },
  ],
  FUTURE: [
    { target: 'LIVE', label: 'Activate Now', variant: 'primary' },
    { target: 'CANCELLED', label: 'Cancel Subscription', variant: 'danger', requiresReason: true },
  ],
  TRIAL: [
    { target: 'LIVE', label: 'Activate Subscription', variant: 'primary' },
    { target: 'CANCELLED', label: 'Cancel Subscription', variant: 'danger', requiresReason: true },
  ],
  LIVE: [
    { target: 'PAUSED', label: 'Pause Subscription', variant: 'warning', requiresReason: true },
    { target: 'NON_RENEWING', label: 'Cancel at Period End', variant: 'orange' },
    { target: 'PAST_DUE', label: 'Mark Past Due', variant: 'amber' },
    { target: 'CANCELLED', label: 'Cancel Immediately', variant: 'danger', requiresReason: true },
  ],
  PAUSED: [
    { target: 'LIVE', label: 'Resume Subscription', variant: 'primary' },
    { target: 'CANCELLED', label: 'Cancel Subscription', variant: 'danger', requiresReason: true },
  ],
  NON_RENEWING: [
    { target: 'LIVE', label: 'Resume Auto-Renew', variant: 'primary' },
    { target: 'CANCELLED', label: 'Cancel Immediately', variant: 'danger', requiresReason: true },
  ],
  PAST_DUE: [
    { target: 'LIVE', label: 'Mark Paid / Restore Live', variant: 'primary' },
    { target: 'UNPAID', label: 'Mark Unpaid', variant: 'danger' },
    { target: 'CANCELLED', label: 'Cancel Subscription', variant: 'danger', requiresReason: true },
  ],
  UNPAID: [
    { target: 'LIVE', label: 'Mark Paid / Restore Live', variant: 'primary' },
    { target: 'CANCELLED', label: 'Cancel Subscription', variant: 'danger', requiresReason: true },
  ],
  CANCELLED: [],
};

export default function BillingSubscriptionsPage({ currentUser, setMessage }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [selectedSubDetail, setSelectedSubDetail] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview' | 'items'
  const [modalOpen, setModalOpen] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Phase 5 State Machine Modal State
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionSubmitting, setTransitionSubmitting] = useState(false);

  // Phase 4 Attach Item Modal State
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [attaching, setAttaching] = useState(false);
  const [itemFormData, setItemFormData] = useState({
    item_type: 'PLAN',
    plan: '',
    addon: '',
    quantity: 1,
    unit_price: '',
    discount_amount: '0.00',
  });

  const [formData, setFormData] = useState({
    customer: '',
    status: 'DRAFT',
    current_term_start: new Date().toISOString().split('T')[0],
    billing_cycle: 'MONTHLY',
    collection_method: 'CHARGE_AUTOMATIC',
    payment_terms_days: '0',
    cancel_at_period_end: false,
  });

  // Phase 6 Invoices Drawer State
  const [subInvoices, setSubInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Phase 7 Payments Drawer State
  const [subPayments, setSubPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Phase 9 Renewals Execution State
  const [runningRenewals, setRunningRenewals] = useState(false);

  // Phase 10 Dunning State
  const [subDunningLogs, setSubDunningLogs] = useState([]);
  const [dunningLoading, setDunningLoading] = useState(false);
  const [runningDunning, setRunningDunning] = useState(false);

  // Phase 11 Cancellation, Pause & Resume Modals State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelType, setCancelType] = useState('IMMEDIATE'); // 'IMMEDIATE' | 'PERIOD_END'
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseSubmitting, setPauseSubmitting] = useState(false);

  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [resumeSubmitting, setResumeSubmitting] = useState(false);

  // Phase 12 Subscription Amendment Modal State
  const [amendModalOpen, setAmendModalOpen] = useState(false);
  const [amendStep, setAmendStep] = useState(1); // 1: Config, 2: Preview, 3: Commit
  const [amendSelectedPlan, setAmendSelectedPlan] = useState('');
  const [amendEffectiveDate, setAmendEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [amendAddons, setAmendAddons] = useState([]); // [{ addon_id, action: 'ADD'|'CHANGE'|'REMOVE', quantity: 1 }]
  const [amendReason, setAmendReason] = useState('');
  const [prorationPreview, setProrationPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [amendSubmitting, setAmendSubmitting] = useState(false);
  const [amendError, setAmendError] = useState('');

  // Phase 13 Adjustments (Credit & Debit Notes) State
  const [subCreditNotes, setSubCreditNotes] = useState([]);
  const [subDebitNotes, setSubDebitNotes] = useState([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [customerUnappliedCredit, setCustomerUnappliedCredit] = useState('0.00');

  // Issue Credit Note Modal State
  const [issueCreditNoteModalOpen, setIssueCreditNoteModalOpen] = useState(false);
  const [issueCreditNoteForm, setIssueCreditNoteForm] = useState({
    customer_id: '',
    invoice_id: '',
    amount: '',
    reason: 'GOODWILL',
    subtotal: '',
    tax_total: '',
  });
  const [issueCreditNoteSubmitting, setIssueCreditNoteSubmitting] = useState(false);

  // Allocate Credit Note Modal State
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState(null);
  const [allocateForm, setAllocateForm] = useState({
    invoice_id: '',
    amount: '',
  });
  const [allocateSubmitting, setAllocateSubmitting] = useState(false);

  // Issue Debit Note Modal State
  const [issueDebitNoteModalOpen, setIssueDebitNoteModalOpen] = useState(false);
  const [issueDebitNoteForm, setIssueDebitNoteForm] = useState({
    invoice_id: '',
    amount: '',
    reason: '',
  });
  const [issueDebitNoteSubmitting, setIssueDebitNoteSubmitting] = useState(false);

  // Phase 14 Audit Trail & Activity Feed State
  const [subAuditLogs, setSubAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState(null);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('ALL');

  const handleOpenAmendModal = async (sub) => {
    if (!sub || sub.status !== 'LIVE') return;
    setAmendError('');
    setProrationPreview(null);
    setAmendStep(1);
    setAmendReason('');
    const todayStr = new Date().toISOString().split('T')[0];
    let initialEffDate = todayStr;
    if (sub.current_term_start && todayStr < sub.current_term_start) {
      initialEffDate = sub.current_term_start;
    } else if (sub.current_term_end && todayStr > sub.current_term_end) {
      initialEffDate = sub.current_term_end;
    }
    setAmendEffectiveDate(initialEffDate);

    // Current plan
    const currentPlanItem = (sub.items || []).find((i) => i.item_type === 'PLAN');
    setAmendSelectedPlan(currentPlanItem?.plan || '');
    setAmendAddons([]);

    try {
      const [plans, addons] = await Promise.all([
        fetchAvailablePlans(),
        fetchAvailableAddons(),
      ]);
      setAvailablePlans(plans);
      setAvailableAddons(addons);
    } catch {
      // fallback
    }

    setAmendModalOpen(true);
  };

  const handleAddAddonRow = () => {
    if (availableAddons.length === 0) return;
    setAmendAddons((prev) => [
      ...prev,
      { addon_id: availableAddons[0].id, action: 'ADD', quantity: 1 },
    ]);
  };

  const handleUpdateAddonRow = (index, field, value) => {
    setAmendAddons((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveAddonRow = (index) => {
    setAmendAddons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCalculateProrationPreview = async () => {
    if (!selectedSubDetail) return;
    setPreviewLoading(true);
    setAmendError('');
    try {
      const payload = {
        effective_date: amendEffectiveDate,
      };
      const currentPlanItem = (selectedSubDetail.items || []).find((i) => i.item_type === 'PLAN');
      if (amendSelectedPlan && parseInt(amendSelectedPlan, 10) !== currentPlanItem?.plan) {
        payload.new_plan_id = parseInt(amendSelectedPlan, 10);
      }
      if (amendAddons.length > 0) {
        payload.add_ons = amendAddons.map((a) => ({
          addon_id: parseInt(a.addon_id, 10),
          action: a.action,
          quantity: parseInt(a.quantity, 10) || 1,
        }));
      }

      const result = await previewSubscriptionAmendment(selectedSubDetail.id, payload);
      setProrationPreview(result);
      setAmendStep(2);
    } catch (err) {
      setAmendError(formatBillingApiErrorMessage(err));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCommitAmendment = async (e) => {
    if (e) e.preventDefault();
    if (!amendReason.trim()) {
      setAmendError('An amendment reason is required.');
      return;
    }
    setAmendSubmitting(true);
    setAmendError('');
    try {
      const payload = {
        effective_date: amendEffectiveDate,
        reason: amendReason.trim(),
      };
      const currentPlanItem = (selectedSubDetail.items || []).find((i) => i.item_type === 'PLAN');
      if (amendSelectedPlan && parseInt(amendSelectedPlan, 10) !== currentPlanItem?.plan) {
        payload.new_plan_id = parseInt(amendSelectedPlan, 10);
      }
      if (amendAddons.length > 0) {
        payload.add_ons = amendAddons.map((a) => ({
          addon_id: parseInt(a.addon_id, 10),
          action: a.action,
          quantity: parseInt(a.quantity, 10) || 1,
        }));
      }

      const result = await commitSubscriptionAmendment(selectedSubDetail.id, payload);
      const invNum = result.proration?.invoice_number;
      const invMsg = invNum ? ` (Proration Invoice #${invNum} posted)` : '';
      setMessage(`Subscription ${selectedSubDetail.subscription_number} amended successfully${invMsg}.`);
      setAmendModalOpen(false);
      loadSubscriptions();
      if (selectedSubId) {
        handleRefreshSubDetail(selectedSubId);
      }
    } catch (err) {
      setAmendError(formatBillingApiErrorMessage(err));
    } finally {
      setAmendSubmitting(false);
    }
  };

  const loadSubDunningLogs = async (subId) => {
    if (!subId) return;
    setDunningLoading(true);
    try {
      const data = await fetchDunningHistory(subId);
      setSubDunningLogs(data);
    } catch {
      setSubDunningLogs([]);
    } finally {
      setDunningLoading(false);
    }
  };

  const handleRunDunning = async (force = false) => {
    setRunningDunning(true);
    try {
      const summary = await runDunningRetries({ force });
      setMessage(
        `Dunning Retries Processing Completed: ${summary.succeeded || 0} succeeded, ${summary.failed || 0} failed, ${summary.exhausted || 0} exhausted (UNPAID) out of ${summary.processed || 0} processed.`
      );
      loadSubscriptions();
      if (selectedSubId) {
        handleRefreshSubDetail(selectedSubId);
        loadSubDunningLogs(selectedSubId);
      }
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setRunningDunning(false);
    }
  };

  const handleRunRenewals = async () => {
    setRunningRenewals(true);
    try {
      const summary = await runSubscriptionRenewals({ batch_size: 50 });
      setMessage(
        `Scheduled Renewals Run Completed: ${summary.renewed} renewed, ${summary.cancelled} auto-cancelled, ${summary.skipped} skipped, ${summary.failed} failed out of ${summary.total_processed} processed.`
      );
      loadSubscriptions();
      if (selectedSubId) {
        handleRefreshSubDetail(selectedSubId);
      }
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setRunningRenewals(false);
    }
  };


  const loadSubAuditLogs = async (subId, category = null) => {
    if (!subId) return;
    setAuditLoading(true);
    try {
      const params = category && category !== 'ALL' ? { category } : {};
      const data = await fetchSubscriptionAuditLogs(subId, params);
      setSubAuditLogs(data);
    } catch {
      setSubAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const loadSubPayments = async (customerId) => {
    if (!customerId) return;
    setPaymentsLoading(true);
    try {
      const data = await fetchPayments({ customer: customerId });
      setSubPayments(data);
    } catch {
      setSubPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await fetchSubscriptions({ search, status: statusFilter });
      setSubscriptions(data);
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadSubInvoices = async (subId) => {
    setInvoicesLoading(true);
    try {
      const data = await fetchInvoices({ subscription: subId });
      setSubInvoices(data);
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [search, statusFilter]);

  const loadSubAdjustments = async (customerId) => {
    if (!customerId) return;
    setAdjustmentsLoading(true);
    try {
      const [cns, dns, creditRes] = await Promise.all([
        fetchCreditNotes({ customer: customerId }),
        fetchDebitNotes({ customer: customerId }),
        fetchCustomerUnappliedCredit(customerId).catch(() => ({ unapplied_credit: '0.00' })),
      ]);
      setSubCreditNotes(cns);
      setSubDebitNotes(dns);
      setCustomerUnappliedCredit(creditRes?.unapplied_credit || '0.00');
    } catch (err) {
      console.error("Failed to load adjustments", err);
    } finally {
      setAdjustmentsLoading(false);
    }
  };

  const handleOpenIssueCreditNoteModal = () => {
    if (!selectedSubDetail) return;
    setIssueCreditNoteForm({
      customer_id: selectedSubDetail.customer,
      invoice_id: '',
      amount: '',
      reason: 'GOODWILL',
      subtotal: '',
      tax_total: '',
    });
    setIssueCreditNoteModalOpen(true);
  };

  const handleIssueCreditNoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubDetail) return;
    if (!issueCreditNoteForm.amount || parseFloat(issueCreditNoteForm.amount) <= 0) {
      setMessage('A valid positive credit amount is required.');
      return;
    }

    setIssueCreditNoteSubmitting(true);
    try {
      const payload = {
        customer_id: selectedSubDetail.customer,
        amount: issueCreditNoteForm.amount,
        reason: issueCreditNoteForm.reason || 'GOODWILL',
      };
      if (issueCreditNoteForm.invoice_id) {
        payload.invoice_id = parseInt(issueCreditNoteForm.invoice_id, 10);
      }
      if (issueCreditNoteForm.subtotal && issueCreditNoteForm.subtotal.trim() !== '') {
        payload.subtotal = issueCreditNoteForm.subtotal.trim();
      }
      if (issueCreditNoteForm.tax_total && issueCreditNoteForm.tax_total.trim() !== '') {
        payload.tax_total = issueCreditNoteForm.tax_total.trim();
      }

      const res = await issueCreditNote(payload);
      setMessage(`Credit Note ${res.credit_note_number} issued successfully for $${res.total_amount}.`);
      setIssueCreditNoteModalOpen(false);
      loadSubAdjustments(selectedSubDetail.customer);
      if (selectedSubId) {
        handleRefreshSubDetail(selectedSubId);
      }
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setIssueCreditNoteSubmitting(false);
    }
  };

  const handleOpenAllocateModal = (creditNote) => {
    setSelectedCreditNote(creditNote);
    const eligibleInvoices = subInvoices.filter(
      (inv) => (inv.status === 'POSTED' || inv.status === 'PARTIALLY_PAID') && parseFloat(inv.balance) > 0
    );
    setAllocateForm({
      invoice_id: eligibleInvoices.length > 0 ? eligibleInvoices[0].id : '',
      amount: creditNote.unallocated_amount,
    });
    setAllocateModalOpen(true);
  };

  const handleAllocateCreditNoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCreditNote) return;
    if (!allocateForm.invoice_id) {
      setMessage('Please select a target invoice to allocate credit.');
      return;
    }
    if (!allocateForm.amount || parseFloat(allocateForm.amount) <= 0) {
      setMessage('A valid positive allocation amount is required.');
      return;
    }

    setAllocateSubmitting(true);
    try {
      const payload = {
        invoice_id: parseInt(allocateForm.invoice_id, 10),
        amount: allocateForm.amount,
      };
      const res = await allocateCreditNote(selectedCreditNote.id, payload);
      setMessage(`Credit Note ${res.credit_note_number} allocated successfully.`);
      setAllocateModalOpen(false);
      loadSubAdjustments(selectedSubDetail.customer);
      if (selectedSubId) {
        loadSubInvoices(selectedSubId);
        handleRefreshSubDetail(selectedSubId);
      }
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setAllocateSubmitting(false);
    }
  };

  const handleOpenIssueDebitNoteModal = () => {
    if (!selectedSubDetail) return;
    const eligibleInvoices = subInvoices.filter(
      (inv) => inv.status === 'POSTED' || inv.status === 'PARTIALLY_PAID' || inv.status === 'PAID'
    );
    setIssueDebitNoteForm({
      invoice_id: eligibleInvoices.length > 0 ? eligibleInvoices[0].id : '',
      amount: '',
      reason: '',
    });
    setIssueDebitNoteModalOpen(true);
  };

  const handleIssueDebitNoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubDetail) return;
    if (!issueDebitNoteForm.invoice_id) {
      setMessage('Please select a target invoice for this debit note.');
      return;
    }
    if (!issueDebitNoteForm.amount || parseFloat(issueDebitNoteForm.amount) <= 0) {
      setMessage('A valid positive debit amount is required.');
      return;
    }

    setIssueDebitNoteSubmitting(true);
    try {
      const payload = {
        invoice_id: parseInt(issueDebitNoteForm.invoice_id, 10),
        amount: issueDebitNoteForm.amount,
        reason: issueDebitNoteForm.reason || '',
      };
      const res = await issueDebitNote(payload);
      setMessage(`Debit Note ${res.debit_note_number} issued successfully for $${res.amount}.`);
      setIssueDebitNoteModalOpen(false);
      loadSubAdjustments(selectedSubDetail.customer);
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setIssueDebitNoteSubmitting(false);
    }
  };

  const handleOpenDrawer = async (subId) => {
    setSelectedSubId(subId);
    setDrawerTab('overview');
    setDrawerOpen(true);
    loadSubInvoices(subId);
    loadSubAuditLogs(subId, 'ALL');
    try {
      const detail = await fetchSubscription(subId);
      setSelectedSubDetail(detail);
      if (detail?.customer) {
        loadSubPayments(detail.customer);
        loadSubAdjustments(detail.customer);
      }
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    }
  };

  const handleGenerateInvoiceSubmit = async (subId) => {
    setGeneratingInvoice(true);
    try {
      const inv = await generateInvoice({ subscription: subId });
      setMessage(`Invoice ${inv.invoice_number} generated successfully.`);
      loadSubInvoices(subId);
      loadSubAuditLogs(subId, auditCategoryFilter);
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleRefreshSubDetail = async (subId) => {
    try {
      const detail = await fetchSubscription(subId);
      setSelectedSubDetail(detail);
      loadSubAuditLogs(subId, auditCategoryFilter);
      loadSubscriptions();
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    }
  };

  const handleOpenTransitionModal = (targetConfig) => {
    setPendingTransition(targetConfig);
    setTransitionReason('');
    setTransitionModalOpen(true);
  };

  const handleExecuteTransition = async (e) => {
    e.preventDefault();
    if (!selectedSubDetail || !pendingTransition) return;

    if (pendingTransition.requiresReason && !transitionReason.trim()) {
      setMessage(`A reason is required when transitioning to ${pendingTransition.target}.`);
      return;
    }

    setTransitionSubmitting(true);
    try {
      const updated = await transitionSubscription(selectedSubDetail.id, {
        to_status: pendingTransition.target,
        reason: transitionReason.trim(),
      });
      setMessage(`Subscription ${updated.subscription_number} transitioned to ${updated.status} successfully.`);
      setTransitionModalOpen(false);
      setSelectedSubDetail(updated);
      loadSubscriptions();
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setTransitionSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubDetail) return;
    if (!cancelReason.trim()) {
      setMessage('A cancellation reason is required.');
      return;
    }

    setCancelSubmitting(true);
    try {
      const updated = await cancelSubscription(selectedSubDetail.id, {
        cancel_type: cancelType,
        reason: cancelReason.trim(),
      });
      setMessage(`Subscription ${updated.subscription_number} ${cancelType === 'IMMEDIATE' ? 'cancelled immediately' : 'scheduled for period-end cancellation'}.`);
      setCancelModalOpen(false);
      setSelectedSubDetail(updated);
      loadSubscriptions();
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handlePauseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubDetail) return;
    if (!pauseReason.trim()) {
      setMessage('A pause reason is required.');
      return;
    }

    setPauseSubmitting(true);
    try {
      const updated = await pauseSubscription(selectedSubDetail.id, {
        reason: pauseReason.trim(),
      });
      setMessage(`Subscription ${updated.subscription_number} paused successfully. Billing frozen.`);
      setPauseModalOpen(false);
      setSelectedSubDetail(updated);
      loadSubscriptions();
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setPauseSubmitting(false);
    }
  };

  const handleResumeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubDetail) return;

    setResumeSubmitting(true);
    try {
      const updated = await resumeSubscription(selectedSubDetail.id);
      setMessage(`Subscription ${updated.subscription_number} resumed successfully. Billing schedule restored with term extension.`);
      setResumeModalOpen(false);
      setSelectedSubDetail(updated);
      loadSubscriptions();
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setResumeSubmitting(false);
    }
  };

  const handleOpenAttachModal = async () => {
    setAttachModalOpen(true);
    setItemFormData({
      item_type: 'PLAN',
      plan: '',
      addon: '',
      quantity: 1,
      unit_price: '',
      discount_amount: '0.00',
    });
    try {
      const [plans, addons] = await Promise.all([
        fetchAvailablePlans(),
        fetchAvailableAddons(),
      ]);
      setAvailablePlans(plans);
      setAvailableAddons(addons);
      if (plans.length > 0) {
        setItemFormData((prev) => ({ ...prev, plan: plans[0].id }));
      }
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    }
  };

  const handleAttachItemSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubDetail) return;

    setAttaching(true);
    try {
      const payload = {
        item_type: itemFormData.item_type,
        quantity: parseInt(itemFormData.quantity, 10) || 1,
        discount_amount: itemFormData.discount_amount || '0.00',
      };

      if (itemFormData.item_type === 'PLAN') {
        if (!itemFormData.plan) {
          setMessage('Please select a pricing plan.');
          setAttaching(false);
          return;
        }
        payload.plan = parseInt(itemFormData.plan, 10);
      } else {
        if (!itemFormData.addon) {
          setMessage('Please select an add-on.');
          setAttaching(false);
          return;
        }
        payload.addon = parseInt(itemFormData.addon, 10);
      }

      if (itemFormData.unit_price) {
        payload.unit_price = itemFormData.unit_price;
      }

      await addSubscriptionItem(selectedSubDetail.id, payload);
      setMessage(`Line item attached successfully.`);
      setAttachModalOpen(false);
      handleRefreshSubDetail(selectedSubDetail.id);
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setAttaching(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!selectedSubDetail) return;
    if (!window.confirm('Are you sure you want to remove this line item?')) return;

    try {
      await deleteSubscriptionItem(selectedSubDetail.id, itemId);
      setMessage('Line item removed successfully.');
      handleRefreshSubDetail(selectedSubDetail.id);
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    }
  };

  const handleOpenCreateModal = async () => {
    setModalOpen(true);
    try {
      const custs = await fetchBillingCustomers();
      setCustomersList(custs);
      if (custs.length > 0 && !formData.customer) {
        setFormData((prev) => ({ ...prev, customer: custs[0].id }));
      }
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer) {
      setMessage('Please select a customer.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        customer: parseInt(formData.customer, 10),
        status: formData.status,
        current_term_start: formData.current_term_start,
        billing_cycle: formData.billing_cycle,
        collection_method: formData.collection_method,
        payment_terms_days: parseInt(formData.payment_terms_days, 10) || 0,
        cancel_at_period_end: formData.cancel_at_period_end,
      };

      const newSub = await createSubscription(payload);
      setMessage(`Subscription ${newSub.subscription_number} created successfully.`);
      setModalOpen(false);
      loadSubscriptions();
    } catch (err) {
      setMessage(formatBillingApiErrorMessage(err));
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="crm-legacy-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={24} style={{ color: '#2563eb' }} /> Subscriptions & Line Item Snapshot Pricing
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
            Manage commercial subscription headers, line items, historical snapshot pricing, and recurring revenue metrics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleRunRenewals}
            disabled={runningRenewals}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '6px',
              backgroundColor: '#059669',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              opacity: runningRenewals ? 0.7 : 1,
            }}
          >
            <RefreshCw size={18} className={runningRenewals ? 'animate-spin' : ''} />
            {runningRenewals ? 'Running Renewals...' : 'Run Scheduled Renewals'}
          </button>
          <button
            type="button"
            onClick={() => handleRunDunning(true)}
            disabled={runningDunning}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '6px',
              backgroundColor: '#d97706',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              opacity: runningDunning ? 0.7 : 1,
            }}
          >
            <RefreshCw size={18} className={runningDunning ? 'animate-spin' : ''} />
            {runningDunning ? 'Processing Dunning...' : 'Run Dunning Retries'}
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
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
            <Plus size={18} /> Create Subscription
          </button>
        </div>

      </div>

      {/* Filter and Search Toolbar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by subscription # or customer name..."
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

      {/* Subscriptions Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No subscriptions found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: '600' }}>
                <th style={{ padding: '12px 16px' }}>Subscription #</th>
                <th style={{ padding: '12px 16px' }}>Customer</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>MRR / ARR</th>
                <th style={{ padding: '12px 16px' }}>Term Start</th>
                <th style={{ padding: '12px 16px' }}>Next Billing</th>
                <th style={{ padding: '12px 16px' }}>Collection Method</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => {
                const chip = STATUS_CHIPS[sub.status] || STATUS_CHIPS.DRAFT;
                return (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>
                      {sub.subscription_number}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500', color: '#0f172a' }}>{sub.customer_name || `Customer #${sub.customer}`}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{sub.customer_number}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: chip.bg === 'bg-slate-100' ? '#f1f5f9' : chip.bg === 'bg-emerald-50' ? '#ecfdf5' : '#eff6ff',
                          color: chip.text === 'text-emerald-700' ? '#047857' : '#1d4ed8',
                        }}
                      >
                        {chip.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>${sub.cached_mrr}/mo</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>${sub.cached_arr}/yr</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{sub.current_term_start || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#475569', fontWeight: '500' }}>{sub.next_billing_date || '—'}</div>
                      {sub.next_billing_date && sub.status === 'LIVE' && (() => {
                        const countdown = getNextBillingCountdown(sub.next_billing_date);
                        if (!countdown) return null;
                        return (
                          <span style={{
                            display: 'inline-block',
                            marginTop: '2px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: countdown.isDue ? '#fef2f2' : '#eff6ff',
                            color: countdown.color,
                          }}>
                            {countdown.text}
                          </span>
                        );
                      })()}
                    </td>

                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '13px' }}>
                      {sub.collection_method === 'CHARGE_AUTOMATIC' ? 'Charge Automatic' : 'Send Invoice'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenDrawer(sub.id)}
                        style={{
                          padding: '6px 12px',
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
                        <Eye size={14} /> Overview & Items
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Subscription Detail Overview Drawer */}
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
              width: '940px',
              maxWidth: '96vw',
              height: '90vh',
              maxHeight: '920px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                    {selectedSubDetail?.subscription_number || 'Subscription Detail'}
                  </h2>
                  {selectedSubDetail?.status && (
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: selectedSubDetail.status === 'LIVE' ? '#ecfdf5' : selectedSubDetail.status === 'CANCELLED' ? '#f1f5f9' : '#eff6ff',
                        color: selectedSubDetail.status === 'LIVE' ? '#047857' : selectedSubDetail.status === 'CANCELLED' ? '#64748b' : '#1d4ed8',
                      }}
                    >
                      {STATUS_CHIPS[selectedSubDetail.status]?.label || selectedSubDetail.status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Customer:</span>
                  <strong style={{ color: '#334155' }}>{selectedSubDetail?.customer_name || '—'}</strong>
                  <span style={{ color: '#94a3b8' }}>({selectedSubDetail?.customer_number})</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                style={{
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Navigation (Horizontally Scrollable) */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                padding: '0 16px',
                gap: '2px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'thin',
              }}
            >
              <button
                type="button"
                onClick={() => setDrawerTab('overview')}
                style={{
                  padding: '12px 14px',
                  fontWeight: drawerTab === 'overview' ? '700' : '600',
                  fontSize: '13px',
                  border: 'none',
                  background: drawerTab === 'overview' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: drawerTab === 'overview' ? '2px solid #2563eb' : '2px solid transparent',
                  color: drawerTab === 'overview' ? '#2563eb' : '#64748b',
                  borderRadius: '6px 6px 0 0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <Eye size={15} /> Overview
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('items')}
                style={{
                  padding: '12px 14px',
                  fontWeight: drawerTab === 'items' ? '700' : '600',
                  fontSize: '13px',
                  border: 'none',
                  background: drawerTab === 'items' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: drawerTab === 'items' ? '2px solid #2563eb' : '2px solid transparent',
                  color: drawerTab === 'items' ? '#2563eb' : '#64748b',
                  borderRadius: '6px 6px 0 0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <Package size={15} /> Items & Add-ons
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: drawerTab === 'items' ? '#dbeafe' : '#e2e8f0',
                    color: drawerTab === 'items' ? '#1d4ed8' : '#64748b',
                  }}
                >
                  {selectedSubDetail?.items?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('invoices')}
                style={{
                  padding: '12px 14px',
                  fontWeight: drawerTab === 'invoices' ? '700' : '600',
                  fontSize: '13px',
                  border: 'none',
                  background: drawerTab === 'invoices' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: drawerTab === 'invoices' ? '2px solid #2563eb' : '2px solid transparent',
                  color: drawerTab === 'invoices' ? '#2563eb' : '#64748b',
                  borderRadius: '6px 6px 0 0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <FileText size={15} /> Invoices
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: drawerTab === 'invoices' ? '#dbeafe' : '#e2e8f0',
                    color: drawerTab === 'invoices' ? '#1d4ed8' : '#64748b',
                  }}
                >
                  {subInvoices.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerTab('payments');
                  if (selectedSubDetail?.customer) loadSubPayments(selectedSubDetail.customer);
                }}
                style={{
                  padding: '12px 14px',
                  fontWeight: drawerTab === 'payments' ? '700' : '600',
                  fontSize: '13px',
                  border: 'none',
                  background: drawerTab === 'payments' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: drawerTab === 'payments' ? '2px solid #2563eb' : '2px solid transparent',
                  color: drawerTab === 'payments' ? '#2563eb' : '#64748b',
                  borderRadius: '6px 6px 0 0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <CreditCard size={15} /> Payments
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: drawerTab === 'payments' ? '#dbeafe' : '#e2e8f0',
                    color: drawerTab === 'payments' ? '#1d4ed8' : '#64748b',
                  }}
                >
                  {subPayments.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerTab('dunning');
                  if (selectedSubDetail?.id) loadSubDunningLogs(selectedSubDetail.id);
                }}
                style={{
                  padding: '12px 14px',
                  fontWeight: drawerTab === 'dunning' ? '700' : '600',
                  fontSize: '13px',
                  border: 'none',
                  background: drawerTab === 'dunning' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: drawerTab === 'dunning' ? '2px solid #2563eb' : '2px solid transparent',
                  color: drawerTab === 'dunning' ? '#2563eb' : '#64748b',
                  borderRadius: '6px 6px 0 0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <Shield size={15} /> Dunning
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: drawerTab === 'dunning' ? '#dbeafe' : '#e2e8f0',
                    color: drawerTab === 'dunning' ? '#1d4ed8' : '#64748b',
                  }}
                >
                  {subDunningLogs.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerTab('adjustments');
                  if (selectedSubDetail?.customer) loadSubAdjustments(selectedSubDetail.customer);
                }}
                style={{
                  padding: '12px 14px',
                  fontWeight: drawerTab === 'adjustments' ? '700' : '600',
                  fontSize: '13px',
                  border: 'none',
                  background: drawerTab === 'adjustments' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: drawerTab === 'adjustments' ? '2px solid #2563eb' : '2px solid transparent',
                  color: drawerTab === 'adjustments' ? '#2563eb' : '#64748b',
                  borderRadius: '6px 6px 0 0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <DollarSign size={15} /> Credit & Debit Notes
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: drawerTab === 'adjustments' ? '#dbeafe' : '#e2e8f0',
                    color: drawerTab === 'adjustments' ? '#1d4ed8' : '#64748b',
                  }}
                >
                  {subCreditNotes.length + subDebitNotes.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerTab('audit');
                  if (selectedSubDetail?.id) loadSubAuditLogs(selectedSubDetail.id, auditCategoryFilter);
                }}
                style={{
                  padding: '12px 14px',
                  fontWeight: drawerTab === 'audit' ? '700' : '600',
                  fontSize: '13px',
                  border: 'none',
                  background: drawerTab === 'audit' ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: drawerTab === 'audit' ? '2px solid #2563eb' : '2px solid transparent',
                  color: drawerTab === 'audit' ? '#2563eb' : '#64748b',
                  borderRadius: '6px 6px 0 0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <History size={15} /> Audit Trail
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: drawerTab === 'audit' ? '#dbeafe' : '#e2e8f0',
                    color: drawerTab === 'audit' ? '#1d4ed8' : '#64748b',
                  }}
                >
                  {subAuditLogs.length}
                </span>
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {selectedSubDetail ? (
                drawerTab === 'overview' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {(selectedSubDetail.status === 'PAST_DUE' || selectedSubDetail.status === 'UNPAID') && (
                      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <AlertCircle size={20} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: '700', color: '#b45309', fontSize: '14px' }}>
                            {selectedSubDetail.status === 'PAST_DUE' ? 'Subscription is Past Due' : 'Subscription Payment Unpaid'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#92400e', marginTop: '4px' }}>
                            Renewal payment collection failed. Scheduled dunning retries (Day 3, Day 7, Day 14) will attempt automatic recovery. Please ensure the customer has a valid payment method attached.
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Revenue Card */}
                    <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Monthly Recurring Revenue (MRR)</div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a', marginTop: '2px' }}>
                          ${selectedSubDetail.cached_mrr} <span style={{ fontSize: '13px', fontWeight: '500' }}>/ month</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Annual (ARR)</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1d4ed8' }}>${selectedSubDetail.cached_arr} / yr</div>
                      </div>
                    </div>

                    {/* Status & Lifecycle State Card */}
                    <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Commercial State</div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{selectedSubDetail.status}</div>
                        </div>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: '600',
                            backgroundColor: selectedSubDetail.status === 'LIVE' ? '#ecfdf5' : selectedSubDetail.status === 'CANCELLED' ? '#f1f5f9' : '#eff6ff',
                            color: selectedSubDetail.status === 'LIVE' ? '#047857' : selectedSubDetail.status === 'CANCELLED' ? '#64748b' : '#1d4ed8',
                          }}
                        >
                          {STATUS_CHIPS[selectedSubDetail.status]?.label || selectedSubDetail.status}
                        </span>
                      </div>

                      {/* Commercial Amendments Button (Phase 12) */}
                      {selectedSubDetail.status === 'LIVE' && (
                        <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px dashed #cbd5e1' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Sliders size={14} color="#2563eb" /> Commercial Amendments & Proration (Phase 12)
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenAmendModal(selectedSubDetail)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '9px 16px',
                              borderRadius: '6px',
                              backgroundColor: '#1d4ed8',
                              color: '#ffffff',
                              fontWeight: '600',
                              fontSize: '13px',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                          >
                            <Sliders size={16} /> Amend Subscription / Change Plan
                          </button>
                        </div>
                      )}

                      {/* State Machine Transition Actions */}
                      <div style={{ paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Available Lifecycle Actions
                        </div>
                        {selectedSubDetail.status === 'CANCELLED' ? (
                          <div style={{ padding: '10px 12px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                            This subscription is CANCELLED (Terminal State). No further transitions permitted.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(ALLOWED_TRANSITIONS[selectedSubDetail.status] || []).map((tConfig) => (
                              <button
                                key={tConfig.target}
                                type="button"
                                onClick={() => {
                                  if (tConfig.target === 'CANCELLED' || tConfig.target === 'NON_RENEWING') {
                                    setCancelType(tConfig.target === 'NON_RENEWING' ? 'PERIOD_END' : 'IMMEDIATE');
                                    setCancelReason('');
                                    setCancelModalOpen(true);
                                  } else if (tConfig.target === 'PAUSED') {
                                    setPauseReason('');
                                    setPauseModalOpen(true);
                                  } else if (tConfig.target === 'LIVE' && selectedSubDetail.status === 'PAUSED') {
                                    setResumeModalOpen(true);
                                  } else {
                                    handleOpenTransitionModal(tConfig);
                                  }
                                }}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  border: 'none',
                                  backgroundColor:
                                    tConfig.variant === 'primary' ? '#2563eb' :
                                    tConfig.variant === 'danger' ? '#ef4444' :
                                    tConfig.variant === 'warning' ? '#f59e0b' :
                                    tConfig.variant === 'orange' ? '#ea580c' :
                                    tConfig.variant === 'purple' ? '#9333ea' : '#3b82f6',
                                  color: '#ffffff',
                                }}
                              >
                                {tConfig.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Term Schedule */}
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={16} /> Term Schedule & Billing Dates
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#ffffff', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Term Start Date</div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedSubDetail.current_term_start || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Term End Date</div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedSubDetail.current_term_end || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Next Billing Date</div>
                          <div style={{ fontWeight: '600', color: '#2563eb' }}>{selectedSubDetail.next_billing_date || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Currency</div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedSubDetail.currency}</div>
                        </div>
                      </div>
                    </div>

                    {/* Commercial Collection Terms */}
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={16} /> Commercial Collection Terms
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#ffffff', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Collection Method</div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>
                            {selectedSubDetail.collection_method === 'CHARGE_AUTOMATIC' ? 'Charge Automatic' : 'Send Invoice'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Payment Grace Period</div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>Net {selectedSubDetail.payment_terms_days} Days</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : drawerTab === 'items' ? (
                  /* Phase 4 Items & Add-ons Tab */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Attached Line Items</h4>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                          Active items contribute to cached MRR (${selectedSubDetail.cached_mrr}/mo).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAttachModal}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '600',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <PlusCircle size={16} /> Attach Item
                      </button>
                    </div>

                    {selectedSubDetail.items && selectedSubDetail.items.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedSubDetail.items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: item.item_type === 'PLAN' ? '#f8fafc' : '#ffffff',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    backgroundColor: item.item_type === 'PLAN' ? '#dbeafe' : '#fef3c7',
                                    color: item.item_type === 'PLAN' ? '#1e40af' : '#92400e',
                                  }}
                                >
                                  {item.item_type}
                                </span>
                                <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                                  {item.item_name}
                                </span>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                  (x{item.quantity})
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', display: 'flex', gap: '16px' }}>
                                <span>Snapshot Price: <strong>${item.unit_price}</strong></span>
                                <span>Cycle: <strong>{item.billing_cycle}</strong></span>
                                {parseFloat(item.discount_amount) > 0 && (
                                  <span>Discount: <strong>-${item.discount_amount}</strong></span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '4px',
                              }}
                              title="Remove Line Item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <Package size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                        <div style={{ fontWeight: '600', color: '#334155' }}>No Line Items Attached</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                          Attach a Base Plan or Add-on to start calculating MRR/ARR revenue.
                        </div>
                      </div>
                    )}
                  </div>
                ) : drawerTab === 'invoices' ? (
                  /* Phase 6 Subscription Invoices Tab */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Generated Invoices</h4>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                          Invoices derived from active line items with deterministic idempotency keys.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateInvoiceSubmit(selectedSubDetail.id)}
                        disabled={generatingInvoice}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '600',
                          border: 'none',
                          cursor: 'pointer',
                          opacity: generatingInvoice ? 0.7 : 1,
                        }}
                      >
                        <PlusCircle size={16} /> {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
                      </button>
                    </div>

                    {invoicesLoading ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading invoices...</div>
                    ) : subInvoices.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {subInvoices.map((inv) => (
                          <div
                            key={inv.id}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              display: 'flex',
                              justify: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                                  {inv.invoice_number}
                                </span>
                                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: '#ecfdf5', color: '#047857' }}>
                                  {inv.status}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', display: 'flex', gap: '16px' }}>
                                <span>Issue Date: <strong>{inv.issue_date}</strong></span>
                                <span>Due Date: <strong>{inv.due_date}</strong></span>
                                <span>Total: <strong>${inv.total_amount}</strong></span>
                                <span>Balance: <strong style={{ color: '#2563eb' }}>${inv.balance}</strong></span>
                              </div>
                            </div>
                            <a
                              href={getInvoicePdfUrl(inv.id)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#f8fafc',
                                color: '#1e293b',
                                fontSize: '12px',
                                fontWeight: '600',
                                textDecoration: 'none',
                              }}
                            >
                              Download PDF
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <FileText size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                        <div style={{ fontWeight: '600', color: '#334155' }}>No Invoices Generated</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                          Click "Generate Invoice" to create a deterministic posted invoice for this subscription.
                        </div>
                      </div>
                    )}
                  </div>
                ) : drawerTab === 'payments' ? (
                  /* Phase 7 Subscription Payments & Allocations Tab */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Customer Payments & Allocations</h4>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                          Payment receipts and invoice settlement history for this customer.
                        </p>
                      </div>
                    </div>

                    {paymentsLoading ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading payments...</div>
                    ) : subPayments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {subPayments.map((pay) => (
                          <div
                            key={pay.id}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              display: 'flex',
                              justify: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{pay.payment_number}</span>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#15803d' }}>
                                  {pay.status}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                                <span>Date: <strong>{pay.payment_date}</strong></span>
                                <span>Method: <strong style={{ textTransform: 'capitalize' }}>{(pay.payment_method || '').replace('_', ' ')}</strong></span>
                                <span>Total: <strong>${pay.amount}</strong></span>
                                <span>Allocated: <strong style={{ color: '#16a34a' }}>${pay.allocated_amount}</strong></span>
                                <span>Unallocated Credit: <strong style={{ color: '#d97706' }}>${pay.unallocated_amount}</strong></span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <CreditCard size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                        <div style={{ fontWeight: '600', color: '#334155' }}>No Payments Found</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                          No payment receipts recorded for this customer yet.
                        </div>
                      </div>
                    )}
                  </div>
                ) : drawerTab === 'dunning' ? (
                  /* Phase 10 Subscription Dunning History Tab */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Dunning Retry Logs & Schedule</h4>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                          Automated retry schedule (Day 3, Day 7, Day 14) and recovery progression.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => loadSubDunningLogs(selectedSubDetail.id)}
                          style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <RefreshCw size={13} /> Refresh Logs
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunDunning(true)}
                          disabled={runningDunning}
                          style={{
                            padding: '7px 16px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#d97706',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            opacity: runningDunning ? 0.7 : 1,
                          }}
                        >
                          <RefreshCw size={13} className={runningDunning ? 'animate-spin' : ''} />
                          {runningDunning ? 'Executing Retries...' : 'Execute Next Due Retry'}
                        </button>
                      </div>
                    </div>

                    {/* Dunning Schedule & Next Action Banner */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="#2563eb" /> Automated 3-Stage Dunning Schedule
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
                        <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>DAY 0</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>Initial Failure</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Attempt #0 (PAST_DUE)</div>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb' }}>DAY 3</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>1st Retry</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Attempt #1</div>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#d97706' }}>DAY 7</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>2nd Retry</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Attempt #2</div>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626' }}>DAY 14</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>Final Retry</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Attempt #3 ➔ UNPAID</div>
                        </div>
                      </div>

                      {/* Dynamic Scheduled Next Retry Info */}
                      {selectedSubDetail.status === 'PAST_DUE' ? (
                        <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={16} color="#2563eb" />
                            <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '500' }}>
                              Subscription is <strong>PAST DUE</strong>.
                              {subDunningLogs.length > 0 && subDunningLogs[0].next_retry_at && (
                                <> Next scheduled retry is set for: <strong>{new Date(subDunningLogs[0].next_retry_at).toLocaleString()}</strong>.</>
                              )}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                            {subDunningLogs.length === 1 ? 'Next: Day 3 Retry (Attempt #1)' : subDunningLogs.length === 2 ? 'Next: Day 7 Retry (Attempt #2)' : 'Next: Day 14 Final Retry (Attempt #3)'}
                          </span>
                        </div>
                      ) : selectedSubDetail.status === 'UNPAID' ? (
                        <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertCircle size={16} color="#dc2626" />
                          <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: '500' }}>
                            Dunning retries exhausted after 3 failed attempts. Subscription is marked <strong>UNPAID</strong>.
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Dunning Logs List */}
                    {dunningLoading ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading dunning logs...</div>
                    ) : subDunningLogs.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {subDunningLogs.map((log) => {
                          const attemptLabel = log.attempt_number === 0
                            ? 'Attempt #0 (Initial Payment Failure — Day 0)'
                            : log.attempt_number === 1
                            ? 'Attempt #1 (Day 3 Scheduled Retry)'
                            : log.attempt_number === 2
                            ? 'Attempt #2 (Day 7 Scheduled Retry)'
                            : 'Attempt #3 (Day 14 Final Retry)';

                          return (
                            <div
                              key={log.id}
                              style={{
                                padding: '14px 16px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                                    {attemptLabel}
                                  </span>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    backgroundColor: log.status === 'SUCCESS' ? '#dcfce7' : log.status === 'EXHAUSTED' ? '#fee2e2' : '#fef3c7',
                                    color: log.status === 'SUCCESS' ? '#15803d' : log.status === 'EXHAUSTED' ? '#b91c1c' : '#b45309',
                                  }}>
                                    {log.status}
                                  </span>
                                  {log.next_retry_at && log.status !== 'SUCCESS' && log.status !== 'EXHAUSTED' && (
                                    <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                                      Next Scheduled Retry: {new Date(log.next_retry_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                                  <span>Invoice: <strong>{log.invoice_number || '—'}</strong></span>
                                  {log.gateway_transaction_id && (
                                    <span>PaymentIntent: <strong>{log.gateway_transaction_id}</strong></span>
                                  )}
                                  {log.error_code && (
                                    <span>Error: <strong style={{ color: '#dc2626' }}>[{log.error_code}] {log.error_message}</strong></span>
                                  )}
                                  <span>Logged At: <strong>{new Date(log.timestamp).toLocaleString()}</strong></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <Shield size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                        <div style={{ fontWeight: '600', color: '#334155' }}>No Dunning Logs Found</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                          No retry attempts recorded for this subscription.
                        </div>
                      </div>
                    )}
                  </div>
                ) : drawerTab === 'adjustments' ? (
                  /* Phase 13 Subscription Credit & Debit Notes Tab */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {/* Customer Account Credit Balance Hero Card */}
                    <div
                      style={{
                        padding: '20px 24px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #064e3b 100%)',
                        border: '1px solid #334155',
                        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#6ee7b7' }}>
                          <Wallet size={14} /> Customer Account Credit Balance
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', marginTop: '4px', letterSpacing: '-0.5px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          ${customerUnappliedCredit}
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>USD Available</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                          Unallocated credit available to offset existing or future invoice charges.
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={handleOpenIssueCreditNoteModal}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 16px',
                            borderRadius: '6px',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: '700',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <PlusCircle size={15} /> Issue Credit Note
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenIssueDebitNoteModal}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 16px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: '600',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <PlusCircle size={15} /> Issue Debit Note
                        </button>
                      </div>
                    </div>

                    {/* Credit Notes Section */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={16} color="#059669" /> Credit Notes
                          </h4>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#047857' }}>
                            {subCreditNotes.length}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Formal financial credit instruments</span>
                      </div>

                      {adjustmentsLoading ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading credit notes...</div>
                      ) : subCreditNotes.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {subCreditNotes.map((cn) => {
                            const unallocatedNum = parseFloat(cn.unallocated_amount || '0');
                            const isAllocatable = cn.status === 'ISSUED' && unallocatedNum > 0;
                            return (
                              <div
                                key={cn.id}
                                style={{
                                  padding: '16px',
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                  backgroundColor: '#ffffff',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>
                                      {cn.credit_note_number}
                                    </span>
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        backgroundColor: cn.status === 'ISSUED' ? '#ecfdf5' : '#eff6ff',
                                        color: cn.status === 'ISSUED' ? '#047857' : '#1d4ed8',
                                      }}
                                    >
                                      {cn.status}
                                    </span>
                                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569' }}>
                                      {cn.reason}
                                    </span>
                                    {cn.invoice_number && (
                                      <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        Ref: {cn.invoice_number}
                                      </span>
                                    )}
                                  </div>
                                  {isAllocatable && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAllocateModal(cn)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #bfdbfe',
                                        backgroundColor: '#eff6ff',
                                        color: '#1d4ed8',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                      }}
                                    >
                                      <ArrowRightLeft size={13} /> Allocate to Invoice
                                    </button>
                                  )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Amount</div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>${cn.total_amount}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Allocated</div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#059669', marginTop: '2px' }}>${cn.allocated_amount}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Remaining Credit</div>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: unallocatedNum > 0 ? '#047857' : '#64748b', marginTop: '2px' }}>
                                      ${cn.unallocated_amount}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Issue Date</div>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginTop: '2px' }}>{cn.issued_date || '—'}</div>
                                  </div>
                                </div>

                                {cn.allocations && cn.allocations.length > 0 && (
                                  <div style={{ paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '12px', color: '#475569' }}>
                                    <span style={{ fontWeight: '700', color: '#334155', marginRight: '8px' }}>Allocations:</span>
                                    {cn.allocations.map((a, i) => (
                                      <span
                                        key={a.id || i}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '2px 8px',
                                          borderRadius: '6px',
                                          backgroundColor: '#f1f5f9',
                                          border: '1px solid #e2e8f0',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          color: '#1e293b',
                                          marginRight: '8px',
                                          marginTop: '4px',
                                        }}
                                      >
                                        Invoice #{a.invoice_number} credited <strong>${a.amount}</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ padding: '32px 20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                          <DollarSign size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                          <div style={{ fontWeight: '700', color: '#334155', fontSize: '14px' }}>No Credit Notes Issued</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0 auto' }}>
                            Formal credit instruments issued for refunds, SLA downtime credits, or plan proration adjustments will appear here.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Debit Notes Section */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Receipt size={16} color="#dc2626" /> Debit Notes
                          </h4>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                            {subDebitNotes.length}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Post-invoicing charges & financial adjustments</span>
                      </div>

                      {adjustmentsLoading ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading debit notes...</div>
                      ) : subDebitNotes.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {subDebitNotes.map((dn) => (
                            <div
                              key={dn.id}
                              style={{
                                padding: '16px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>
                                    {dn.debit_note_number}
                                  </span>
                                  {dn.reason && (
                                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                                      {dn.reason}
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontWeight: '800', color: '#dc2626', fontSize: '16px' }}>
                                  +${dn.amount}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 18px', fontSize: '12px', color: '#64748b', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <span>Target Invoice: <strong style={{ color: '#1e293b' }}>{dn.invoice_number}</strong></span>
                                <span>Issued Date: <strong style={{ color: '#1e293b' }}>{dn.issued_date || '—'}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '32px 20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                          <Receipt size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                          <div style={{ fontWeight: '700', color: '#334155', fontSize: '14px' }}>No Debit Notes Recorded</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0 auto' }}>
                            Debit notes record independent post-invoicing commercial adjustments or penalties.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : drawerTab === 'audit' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Audit Tab Header with Category Filters & Refresh */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginRight: '4px' }}>Category:</span>
                        {['ALL', 'LIFECYCLE', 'AMENDMENT', 'FINANCIAL', 'DUNNING'].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setAuditCategoryFilter(cat);
                              if (selectedSubDetail?.id) {
                                loadSubAuditLogs(selectedSubDetail.id, cat);
                              }
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              border: auditCategoryFilter === cat ? '1px solid #2563eb' : '1px solid #cbd5e1',
                              backgroundColor: auditCategoryFilter === cat ? '#eff6ff' : '#ffffff',
                              color: auditCategoryFilter === cat ? '#1d4ed8' : '#475569',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSubDetail?.id) {
                            loadSubAuditLogs(selectedSubDetail.id, auditCategoryFilter);
                          }
                        }}
                        disabled={auditLoading}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        <RefreshCw size={13} className={auditLoading ? 'animate-spin' : ''} />
                        Refresh
                      </button>
                    </div>

                    {/* Activity Timeline */}
                    {(() => {
                      const displayedAuditLogs = auditCategoryFilter === 'ALL'
                        ? subAuditLogs
                        : subAuditLogs.filter((a) => a.category === auditCategoryFilter);

                      if (auditLoading) {
                        return (
                          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#2563eb' }} />
                            <div>Loading activity logs...</div>
                          </div>
                        );
                      }

                      if (displayedAuditLogs.length === 0) {
                        return (
                          <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                            <History size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
                            <div style={{ fontWeight: '700', color: '#334155', fontSize: '15px' }}>No Activity Records Found</div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', maxWidth: '400px', margin: '4px auto 0 auto' }}>
                              {auditCategoryFilter !== 'ALL'
                                ? `No ${auditCategoryFilter.toLowerCase()} events recorded for this subscription yet.`
                                : 'Every lifecycle change, commercial amendment, payment allocation, and dunning retry will appear here automatically.'}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                          {displayedAuditLogs.map((activity) => {
                          const isExpanded = expandedAuditId === activity.id;
                          const categoryColors = {
                            LIFECYCLE: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badgeBg: '#dbeafe' },
                            AMENDMENT: { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', badgeBg: '#ede9fe' },
                            FINANCIAL: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', badgeBg: '#d1fae5' },
                            DUNNING: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', badgeBg: '#ffedd5' },
                          };
                          const colorTheme = categoryColors[activity.category] || categoryColors.LIFECYCLE;

                          return (
                            <div
                              key={activity.id}
                              style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                backgroundColor: '#ffffff',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                overflow: 'hidden',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {/* Event Card Header */}
                              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                  {/* Category Pill / Icon Indicator */}
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '8px',
                                      backgroundColor: colorTheme.bg,
                                      border: `1px solid ${colorTheme.border}`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: colorTheme.text,
                                      flexShrink: 0,
                                      marginTop: '2px',
                                    }}
                                  >
                                    {activity.category === 'LIFECYCLE' ? <Activity size={18} /> :
                                     activity.category === 'AMENDMENT' ? <ArrowRightLeft size={18} /> :
                                     activity.category === 'FINANCIAL' ? <DollarSign size={18} /> :
                                     <Shield size={18} />}
                                  </div>

                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>
                                        {activity.title || activity.action}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          padding: '1px 7px',
                                          borderRadius: '10px',
                                          backgroundColor: colorTheme.badgeBg,
                                          color: colorTheme.text,
                                        }}
                                      >
                                        {activity.category}
                                      </span>
                                      {activity.proration_amount && parseFloat(activity.proration_amount) !== 0 && (
                                        <span
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            padding: '1px 7px',
                                            borderRadius: '10px',
                                            backgroundColor: parseFloat(activity.proration_amount) > 0 ? '#ecfdf5' : '#fef2f2',
                                            color: parseFloat(activity.proration_amount) > 0 ? '#047857' : '#b91c1c',
                                          }}
                                        >
                                          Proration: ${activity.proration_amount}
                                        </span>
                                      )}
                                    </div>

                                    {/* State Delta if present */}
                                    {activity.state_delta && (activity.state_delta.old || activity.state_delta.new) && (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', fontWeight: '600' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                                          {activity.state_delta.old || 'INITIAL'}
                                        </span>
                                        <ArrowRight size={13} style={{ color: '#94a3b8' }} />
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                          {activity.state_delta.new}
                                        </span>
                                      </div>
                                    )}

                                    {/* Reason text */}
                                    {activity.reason && (
                                      <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px', fontStyle: 'italic' }}>
                                        "{activity.reason}"
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right Metadata: Actor chip & Timestamp */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', backgroundColor: activity.actor_type === 'SYSTEM' ? '#f1f5f9' : '#e0e7ff', color: activity.actor_type === 'SYSTEM' ? '#475569' : '#3730a3', fontSize: '11px', fontWeight: '700' }}>
                                    {activity.actor_type === 'SYSTEM' ? <Bot size={12} /> : <User size={12} />}
                                    <span>{activity.actor_name || (activity.actor_type === 'SYSTEM' ? 'Automated Engine' : `User #${activity.actor_id}`)}</span>
                                  </div>
                                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Clock size={11} /> {new Date(activity.timestamp).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Expandable Details Button & Panel */}
                              {activity.details && Object.keys(activity.details).length > 0 && (
                                <div style={{ borderTop: '1px solid #f1f5f9', backgroundColor: '#fafafa', padding: '8px 16px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedAuditId(isExpanded ? null : activity.id)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      color: '#475569',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: 0,
                                    }}
                                  >
                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    {isExpanded ? 'Hide Sanitized Context' : 'View Audit Context'}
                                  </button>

                                  {isExpanded && (
                                    <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '11px', overflowX: 'auto' }}>
                                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {JSON.stringify(activity.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : null

              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading subscription details...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phase 4 Attach Item Modal */}
      {attachModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '540px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} style={{ color: '#2563eb' }} /> Attach Line Item
              </h3>
              <button type="button" onClick={() => setAttachModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAttachItemSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Item Type Radio Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Select Item Type *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setItemFormData({ ...itemFormData, item_type: 'PLAN' })}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: itemFormData.item_type === 'PLAN' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: itemFormData.item_type === 'PLAN' ? '#eff6ff' : '#ffffff',
                        fontWeight: '600',
                        fontSize: '14px',
                        color: itemFormData.item_type === 'PLAN' ? '#1d4ed8' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      Base Plan (Max 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemFormData({ ...itemFormData, item_type: 'ADDON' })}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: itemFormData.item_type === 'ADDON' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: itemFormData.item_type === 'ADDON' ? '#eff6ff' : '#ffffff',
                        fontWeight: '600',
                        fontSize: '14px',
                        color: itemFormData.item_type === 'ADDON' ? '#1d4ed8' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      Add-on Item
                    </button>
                  </div>
                </div>

                {itemFormData.item_type === 'PLAN' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Select Catalog Plan *
                    </label>
                    <select
                      value={itemFormData.plan}
                      onChange={(e) => setItemFormData({ ...itemFormData, plan: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    >
                      <option value="">-- Choose Pricing Plan --</option>
                      {availablePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - ${p.price} ({p.billing_cycle})
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '12px', color: '#d97706', marginTop: '6px', backgroundColor: '#fffbeb', padding: '8px 12px', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                      Note: Attaching a new Base Plan will transactionally replace any existing Base Plan on this subscription.
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Select Catalog Add-on *
                    </label>
                    <select
                      value={itemFormData.addon}
                      onChange={(e) => setItemFormData({ ...itemFormData, addon: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    >
                      <option value="">-- Choose Add-on --</option>
                      {availableAddons.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} - ${a.price}/{a.unit_label} ({a.billing_cycle}) {a.max_quantity ? `[Max: ${a.max_quantity}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Quantity / Seats *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={itemFormData.quantity}
                    onChange={(e) => setItemFormData({ ...itemFormData, quantity: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                {/* Custom Unit Price Snapshot Override */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Snapshot Unit Price Override (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Leave empty to use catalog default price"
                    value={itemFormData.unit_price}
                    onChange={(e) => setItemFormData({ ...itemFormData, unit_price: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>If left empty, catalog plan/addon price is snapshot-copied.</span>
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setAttachModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attaching}
                  style={{ padding: '10px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', fontSize: '14px', cursor: 'pointer', opacity: attaching ? 0.7 : 1 }}
                >
                  {attaching ? 'Attaching Item...' : 'Attach Line Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Subscription Header Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.4)' }}>
          <div style={{ width: '560px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Create Subscription Header</h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Select Billing Customer *
                  </label>
                  <select
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    {customersList.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.name} ({cust.customer_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Term Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.current_term_start}
                      onChange={(e) => setFormData({ ...formData, current_term_start: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Billing Cycle Term
                    </label>
                    <select
                      value={formData.billing_cycle}
                      onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    >
                      <option value="MONTHLY">Monthly Term</option>
                      <option value="YEARLY">Yearly Term</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Collection Method
                    </label>
                    <select
                      value={formData.collection_method}
                      onChange={(e) => setFormData({ ...formData, collection_method: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    >
                      <option value="CHARGE_AUTOMATIC">Charge Automatic</option>
                      <option value="SEND_INVOICE">Send Invoice</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Payment Terms
                    </label>
                    <select
                      value={formData.payment_terms_days}
                      onChange={(e) => setFormData({ ...formData, payment_terms_days: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    >
                      <option value="0">Net 0 (Due immediately)</option>
                      <option value="7">Net 7</option>
                      <option value="15">Net 15</option>
                      <option value="30">Net 30</option>
                      <option value="60">Net 60</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}
                >
                  {formSubmitting ? 'Creating...' : 'Create Subscription Header'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 5 State Machine Transition Confirmation Modal */}
      {transitionModalOpen && pendingTransition && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '500px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Confirm State Transition: {pendingTransition.label}
              </h3>
              <button type="button" onClick={() => setTransitionModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExecuteTransition} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af' }}>
                  Transitioning subscription <strong>{selectedSubDetail?.subscription_number}</strong> from <strong>{selectedSubDetail?.status}</strong> to <strong>{pendingTransition.target}</strong>.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Reason for Transition {pendingTransition.requiresReason ? '*' : '(Optional)'}
                  </label>
                  <textarea
                    rows={3}
                    value={transitionReason}
                    onChange={(e) => setTransitionReason(e.target.value)}
                    required={pendingTransition.requiresReason}
                    placeholder={pendingTransition.requiresReason ? 'Required reason for audit log...' : 'Optional reason or note...'}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  {pendingTransition.requiresReason && (
                    <span style={{ fontSize: '12px', color: '#ef4444' }}>A reason is required when transitioning to {pendingTransition.target}.</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setTransitionModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transitionSubmitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: pendingTransition.variant === 'danger' ? '#ef4444' : '#2563eb',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    opacity: transitionSubmitting ? 0.7 : 1,
                  }}
                >
                  {transitionSubmitting ? 'Executing Transition...' : `Confirm ${pendingTransition.target}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 11 Cancel Subscription Modal */}
      {cancelModalOpen && selectedSubDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '520px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="#dc2626" />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#991b1b', margin: 0 }}>
                  Cancel Subscription: {selectedSubDetail.subscription_number}
                </h3>
              </div>
              <button type="button" onClick={() => setCancelModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Cancellation Type Choice */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                    Select Cancellation Type
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '8px', border: cancelType === 'PERIOD_END' ? '2px solid #ea580c' : '1px solid #e2e8f0', backgroundColor: cancelType === 'PERIOD_END' ? '#fff7ed' : '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="cancel_type"
                        value="PERIOD_END"
                        checked={cancelType === 'PERIOD_END'}
                        onChange={(e) => setCancelType(e.target.value)}
                        style={{ marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#9a3412' }}>Cancel at End of Billing Period (Recommended)</div>
                        <div style={{ fontSize: '12px', color: '#7c2d12', marginTop: '2px' }}>
                          Customer keeps full access through term end (<strong>{selectedSubDetail.current_term_end || 'current term'}</strong>). Auto-renewal is cancelled, and subscription becomes <strong>NON_RENEWING</strong>.
                        </div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '8px', border: cancelType === 'IMMEDIATE' ? '2px solid #dc2626' : '1px solid #e2e8f0', backgroundColor: cancelType === 'IMMEDIATE' ? '#fef2f2' : '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="cancel_type"
                        value="IMMEDIATE"
                        checked={cancelType === 'IMMEDIATE'}
                        onChange={(e) => setCancelType(e.target.value)}
                        style={{ marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#991b1b' }}>Cancel Immediately</div>
                        <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '2px' }}>
                          Service is terminated immediately. Status becomes <strong>CANCELLED</strong> (Terminal State).
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Mandatory Cancellation Reason */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Reason for Cancellation *
                  </label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                    placeholder="Enter mandatory reason for audit logging..."
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#dc2626' }}>A reason is required to process subscription cancellation.</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: cancelType === 'IMMEDIATE' ? '#dc2626' : '#ea580c',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    opacity: cancelSubmitting ? 0.7 : 1,
                  }}
                >
                  {cancelSubmitting ? 'Processing...' : cancelType === 'IMMEDIATE' ? 'Confirm Immediate Cancellation' : 'Schedule Period-End Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 11 Pause Subscription Modal */}
      {pauseModalOpen && selectedSubDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '500px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#d97706" />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#b45309', margin: 0 }}>
                  Pause Subscription: {selectedSubDetail.subscription_number}
                </h3>
              </div>
              <button type="button" onClick={() => setPauseModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePauseSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af' }}>
                  Pausing freezes recurring renewals and invoice generation immediately. When resumed, remaining subscription term days will be extended forward.
                </div>

                <div style={{ fontSize: '13px', color: '#475569' }}>
                  <strong>Effective Pause Date:</strong> Today ({new Date().toISOString().split('T')[0]})
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Reason for Pausing *
                  </label>
                  <textarea
                    rows={3}
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    required
                    placeholder="Enter mandatory reason for audit logging..."
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#d97706' }}>A reason is required to pause subscription billing.</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setPauseModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pauseSubmitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    opacity: pauseSubmitting ? 0.7 : 1,
                  }}
                >
                  {pauseSubmitting ? 'Pausing...' : 'Confirm Pause'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 11 Resume Subscription Confirmation Modal */}
      {resumeModalOpen && selectedSubDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '500px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ecfdf5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="#059669" />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#065f46', margin: 0 }}>
                  Resume Subscription: {selectedSubDetail.subscription_number}
                </h3>
              </div>
              <button type="button" onClick={() => setResumeModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResumeSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '13px', color: '#166534' }}>
                  Resuming will restore this subscription to <strong>LIVE</strong> status. Billing term end date and next billing date will be automatically extended forward by the paused duration.
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>Paused Since</div>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedSubDetail.pause_date || '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>Resumption Date</div>
                    <div style={{ fontWeight: '600', color: '#059669' }}>Today ({new Date().toISOString().split('T')[0]})</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setResumeModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resumeSubmitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    opacity: resumeSubmitting ? 0.7 : 1,
                  }}
                >
                  {resumeSubmitting ? 'Resuming...' : 'Confirm Resume'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 12 Subscription Amendment / Change Plan Modal */}
      {amendModalOpen && selectedSubDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={20} color="#2563eb" />
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                    Amend Subscription: {selectedSubDetail.subscription_number}
                  </h3>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                  Current Term: {selectedSubDetail.current_term_start} to {selectedSubDetail.current_term_end} • Status: <strong style={{ color: '#059669' }}>LIVE</strong>
                </div>
              </div>
              <button type="button" onClick={() => setAmendModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Step Indicators */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
              <div style={{ flex: 1, padding: '10px 16px', fontSize: '13px', fontWeight: '600', color: amendStep >= 1 ? '#2563eb' : '#64748b', borderBottom: amendStep === 1 ? '2px solid #2563eb' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>1. Configure Changes</span>
              </div>
              <div style={{ flex: 1, padding: '10px 16px', fontSize: '13px', fontWeight: '600', color: amendStep >= 2 ? '#2563eb' : '#64748b', borderBottom: amendStep === 2 ? '2px solid #2563eb' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>2. Proration Preview</span>
              </div>
              <div style={{ flex: 1, padding: '10px 16px', fontSize: '13px', fontWeight: '600', color: amendStep >= 3 ? '#2563eb' : '#64748b', borderBottom: amendStep === 3 ? '2px solid #2563eb' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>3. Reason & Confirm</span>
              </div>
            </div>

            {/* Error Banner */}
            {amendError && (
              <div style={{ margin: '16px 24px 0 24px', padding: '12px 14px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{amendError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {amendStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Effective Date */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Amendment Effective Date *
                    </label>
                    <input
                      type="date"
                      value={amendEffectiveDate}
                      min={selectedSubDetail.current_term_start}
                      max={selectedSubDetail.current_term_end}
                      onChange={(e) => setAmendEffectiveDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Must be between term start ({selectedSubDetail.current_term_start}) and term end ({selectedSubDetail.current_term_end}).
                    </div>
                  </div>

                  {/* Pricing Plan Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Base Pricing Plan
                    </label>
                    <select
                      value={amendSelectedPlan}
                      onChange={(e) => setAmendSelectedPlan(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    >
                      {availablePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ${p.price}/{p.billing_cycle || 'monthly'}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Selecting a new plan replaces the active base plan and credits the unconsumed portion of the current term.
                    </div>
                  </div>

                  {/* Add-ons Amendments */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                        Add-on Amendments (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddAddonRow}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#2563eb',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} /> Add Add-on Change
                      </button>
                    </div>

                    {amendAddons.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {amendAddons.map((row, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <select
                              value={row.addon_id}
                              onChange={(e) => handleUpdateAddonRow(idx, 'addon_id', e.target.value)}
                              style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                              {availableAddons.map((ad) => (
                                <option key={ad.id} value={ad.id}>
                                  {ad.name} (${ad.price})
                                </option>
                              ))}
                            </select>
                            <select
                              value={row.action}
                              onChange={(e) => handleUpdateAddonRow(idx, 'action', e.target.value)}
                              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                              <option value="ADD">ADD (+qty)</option>
                              <option value="CHANGE">CHANGE (to qty)</option>
                              <option value="REMOVE">REMOVE (0)</option>
                            </select>
                            {row.action !== 'REMOVE' && (
                              <input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={(e) => handleUpdateAddonRow(idx, 'quantity', e.target.value)}
                                style={{ width: '70px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveAddonRow(idx)}
                              style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', fontSize: '12px', color: '#64748b' }}>
                        No add-on changes added. Click "+ Add Add-on Change" to modify active add-ons.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {amendStep === 2 && prorationPreview && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Proration Summary Card */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Proration Summary</span>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: prorationPreview.is_upgrade ? '#ecfdf5' : prorationPreview.is_downgrade ? '#fffbeb' : '#f1f5f9',
                          color: prorationPreview.is_upgrade ? '#059669' : prorationPreview.is_downgrade ? '#d97706' : '#475569',
                        }}
                      >
                        {prorationPreview.is_upgrade ? 'UPGRADE (Invoice Generated)' : prorationPreview.is_downgrade ? 'DOWNGRADE (Credit Logged)' : 'ZERO DELTA'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Unused Credit</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>${prorationPreview.total_credit}</div>
                      </div>
                      <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Prorated Charge</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#b91c1c' }}>${prorationPreview.total_charge}</div>
                      </div>
                      <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Net Proration Due</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: prorationPreview.is_upgrade ? '#2563eb' : '#0f172a' }}>
                          ${prorationPreview.net_amount}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#475569' }}>
                      <span>Remaining Days: <strong>{prorationPreview.term_days_remaining} of {prorationPreview.term_days_total}</strong></span>
                      <span>Current MRR: <strong>${prorationPreview.current_mrr}/mo</strong></span>
                      <span>Projected New MRR: <strong style={{ color: '#2563eb' }}>${prorationPreview.projected_new_mrr}/mo</strong></span>
                    </div>
                  </div>

                  {/* Line Item Breakdown */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                      Detailed Calculation Line Items
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {prorationPreview.credits.map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '13px' }}>
                          <span style={{ color: '#166534' }}>{c.description}</span>
                          <span style={{ fontWeight: '700', color: '#166534' }}>-${c.amount}</span>
                        </div>
                      ))}
                      {prorationPreview.charges.map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '13px' }}>
                          <span style={{ color: '#991b1b' }}>{c.description}</span>
                          <span style={{ fontWeight: '700', color: '#991b1b' }}>+${c.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {amendStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontWeight: '700', color: '#1e40af', fontSize: '14px', marginBottom: '4px' }}>
                      Ready to Commit Commercial Amendment
                    </div>
                    <div style={{ fontSize: '13px', color: '#1e40af' }}>
                      Net proration of <strong>${prorationPreview?.net_amount}</strong> will be applied effective <strong>{amendEffectiveDate}</strong>.
                      {prorationPreview?.is_upgrade && ' A positive proration invoice will be immediately generated and posted.'}
                      {prorationPreview?.is_downgrade && ' The credit delta will be securely logged to the subscription change ledger.'}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Mandatory Reason for Amendment *
                    </label>
                    <textarea
                      rows={3}
                      value={amendReason}
                      onChange={(e) => setAmendReason(e.target.value)}
                      required
                      placeholder="Enter the business rationale for this subscription plan/add-on change..."
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      This reason will be immutably recorded in both SubscriptionAuditLog and SubscriptionChangeLog.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                {amendStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setAmendStep((prev) => prev - 1)}
                    disabled={amendSubmitting || previewLoading}
                    style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Back
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAmendModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#64748b', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                {amendStep === 1 && (
                  <button
                    type="button"
                    onClick={handleCalculateProrationPreview}
                    disabled={previewLoading}
                    style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: previewLoading ? 0.7 : 1 }}
                  >
                    <RefreshCw size={14} className={previewLoading ? 'animate-spin' : ''} />
                    {previewLoading ? 'Calculating Preview...' : 'Calculate Proration Preview'}
                  </button>
                )}
                {amendStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setAmendStep(3)}
                    style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    Proceed to Commit <ArrowRight size={14} />
                  </button>
                )}
                {amendStep === 3 && (
                  <button
                    type="button"
                    onClick={handleCommitAmendment}
                    disabled={amendSubmitting}
                    style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#059669', color: '#ffffff', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: amendSubmitting ? 0.7 : 1 }}
                  >
                    <CheckCircle2 size={16} />
                    {amendSubmitting ? 'Committing Amendment...' : 'Confirm & Commit Amendment'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase 13 Issue Credit Note Modal */}
      {issueCreditNoteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '500px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} style={{ color: '#16a34a' }} /> Issue Credit Note
              </h3>
              <button type="button" onClick={() => setIssueCreditNoteModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleIssueCreditNoteSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Customer
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedSubDetail?.customer_name || 'Customer'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Reference Invoice (Optional)
                </label>
                <select
                  value={issueCreditNoteForm.invoice_id}
                  onChange={(e) => setIssueCreditNoteForm({ ...issueCreditNoteForm, invoice_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '14px' }}
                >
                  <option value="">No specific invoice (General account credit)</option>
                  {subInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — Total: ${inv.total_amount} (Balance: ${inv.balance})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Credit Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={issueCreditNoteForm.amount}
                    onChange={(e) => setIssueCreditNoteForm({ ...issueCreditNoteForm, amount: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Reason *
                  </label>
                  <select
                    value={issueCreditNoteForm.reason}
                    onChange={(e) => setIssueCreditNoteForm({ ...issueCreditNoteForm, reason: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '14px' }}
                  >
                    <option value="CORRECTION">Correction</option>
                    <option value="GOODWILL">Goodwill</option>
                    <option value="REFUND">Refund</option>
                    <option value="DISPUTE">Dispute</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                Credit notes create formal customer credit and do not mutate posted invoices. You can allocate this credit note to outstanding invoices at any time.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIssueCreditNoteModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueCreditNoteSubmitting}
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: issueCreditNoteSubmitting ? 0.7 : 1 }}
                >
                  {issueCreditNoteSubmitting ? 'Issuing...' : 'Issue Credit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 13 Allocate Credit Note Modal */}
      {allocateModalOpen && selectedCreditNote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '500px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} style={{ color: '#2563eb' }} /> Allocate Credit Note
              </h3>
              <button type="button" onClick={() => setAllocateModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAllocateCreditNoteSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px 14px', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600' }}>Credit Note {selectedCreditNote.credit_note_number}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1d4ed8', marginTop: '2px' }}>
                    Available Credit: ${selectedCreditNote.unallocated_amount}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Target Invoice with Unpaid Balance *
                </label>
                <select
                  required
                  value={allocateForm.invoice_id}
                  onChange={(e) => {
                    const invId = e.target.value;
                    const targetInv = subInvoices.find((i) => String(i.id) === String(invId));
                    let maxAmt = selectedCreditNote.unallocated_amount;
                    if (targetInv && parseFloat(targetInv.balance) < parseFloat(maxAmt)) {
                      maxAmt = targetInv.balance;
                    }
                    setAllocateForm({ invoice_id: invId, amount: maxAmt });
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '14px' }}
                >
                  <option value="">Select an invoice to credit</option>
                  {subInvoices
                    .filter((inv) => (inv.status === 'POSTED' || inv.status === 'PARTIALLY_PAID') && parseFloat(inv.balance) > 0)
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} — Outstanding Balance: ${inv.balance} (Total: ${inv.total_amount})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Allocation Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCreditNote.unallocated_amount}
                  required
                  placeholder="0.00"
                  value={allocateForm.amount}
                  onChange={(e) => setAllocateForm({ ...allocateForm, amount: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAllocateModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocateSubmitting}
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: allocateSubmitting ? 0.7 : 1 }}
                >
                  {allocateSubmitting ? 'Allocating...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 13 Issue Debit Note Modal */}
      {issueDebitNoteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '500px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} style={{ color: '#475569' }} /> Issue Debit Note
              </h3>
              <button type="button" onClick={() => setIssueDebitNoteModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleIssueDebitNoteSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Target Invoice *
                </label>
                <select
                  required
                  value={issueDebitNoteForm.invoice_id}
                  onChange={(e) => setIssueDebitNoteForm({ ...issueDebitNoteForm, invoice_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '14px' }}
                >
                  <option value="">Select an invoice to adjust</option>
                  {subInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — Total: ${inv.total_amount} (Balance: ${inv.balance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Debit Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={issueDebitNoteForm.amount}
                  onChange={(e) => setIssueDebitNoteForm({ ...issueDebitNoteForm, amount: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penalty fee, usage overage, service charge"
                  value={issueDebitNoteForm.reason}
                  onChange={(e) => setIssueDebitNoteForm({ ...issueDebitNoteForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                Debit notes record independent post-invoicing commercial adjustments. Original posted invoices remain immutable.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIssueDebitNoteModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueDebitNoteSubmitting}
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#475569', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: issueDebitNoteSubmitting ? 0.7 : 1 }}
                >
                  {issueDebitNoteSubmitting ? 'Issuing...' : 'Issue Debit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
