import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  PieChart,
  BarChart3,
  Layers,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  fetchBillingAnalyticsOverview,
  fetchBillingMrrMovement,
} from '../utils/billingApi';

export default function BillingAnalyticsPage({ currentUser, setMessage }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [mrrMovement, setMrrMovement] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState(6);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [overviewData, movementData] = await Promise.all([
        fetchBillingAnalyticsOverview(),
        fetchBillingMrrMovement({ months: selectedMonths }),
      ]);
      setOverview(overviewData || null);
      setMrrMovement(Array.isArray(movementData) ? movementData : (movementData?.results || []));
    } catch (err) {
      console.error('Failed to load billing analytics:', err);
      const errMsg = err?.message || 'Failed to load executive billing analytics.';
      setError(errMsg);
      if (setMessage) setMessage(errMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonths, setMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading authoritative SaaS analytics...</p>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Analytics Unavailable</h3>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => loadData()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const breakdown = overview?.subscriber_breakdown || {
    by_status: {},
    by_plan: {},
    by_billing_cycle: {},
  };

  const statusEntries = Object.entries(breakdown.by_status || {});
  const planEntries = Object.entries(breakdown.by_plan || {});
  const cycleEntries = Object.entries(breakdown.by_billing_cycle || {});

  const totalActiveSubs = overview?.active_subscribers || 0;

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp size={22} />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              SaaS Analytics & Revenue Dashboard
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Authoritative, real-time commercial revenue metrics and subscription intelligence.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1 text-xs font-medium text-gray-600">
            <button
              onClick={() => setSelectedMonths(3)}
              className={`px-3 py-1.5 rounded-md transition ${selectedMonths === 3 ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-gray-900'}`}
            >
              3M
            </button>
            <button
              onClick={() => setSelectedMonths(6)}
              className={`px-3 py-1.5 rounded-md transition ${selectedMonths === 6 ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-gray-900'}`}
            >
              6M
            </button>
            <button
              onClick={() => setSelectedMonths(12)}
              className={`px-3 py-1.5 rounded-md transition ${selectedMonths === 12 ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-gray-900'}`}
            >
              12M
            </button>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            title="Refresh Live Metrics"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Executive KPI Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Live MRR */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Live MRR</span>
            <DollarSign size={16} className="text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900">
              {formatCurrency(overview?.live_mrr)}
            </span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Live Active
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Monthly Recurring Revenue</p>
        </div>

        {/* 2. Live ARR */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Live ARR</span>
            <TrendingUp size={16} className="text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900">
              {formatCurrency(overview?.live_arr)}
            </span>
            <span className="text-xs text-gray-500 font-medium">12x Multiplier</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Annualized Run Rate</p>
        </div>

        {/* 3. Active Subscribers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Active Subscribers</span>
            <Users size={16} className="text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900">
              {overview?.active_subscribers ?? 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Authoritative</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Active Agreements (LIVE, TRIAL, etc.)</p>
        </div>

        {/* 4. ARPU */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>ARPU</span>
            <Sparkles size={16} className="text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900">
              {formatCurrency(overview?.arpu)}
            </span>
            <span className="text-xs text-gray-500">Per Account</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Average Revenue Per User</p>
        </div>
      </div>

      {/* ── Secondary KPI Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Churn Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Subscriber Churn (30D)</span>
            <Clock size={16} className="text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">
              {formatPercent(overview?.churn_rate_pct)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${Number(overview?.churn_rate_pct || 0) === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {Number(overview?.churn_rate_pct || 0) === 0 ? 'Optimal' : 'Active Rate'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Cancellations over total subscribers at risk</p>
        </div>

        {/* LTV */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Customer Lifetime Value (LTV)</span>
            <Layers size={16} className="text-cyan-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(overview?.ltv)}
            </span>
            <span className="text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full font-medium">
              ARPU / Churn
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Projected average revenue per subscriber lifetime</p>
        </div>

        {/* Total Collected Cash */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Collected Cash</span>
            <ShieldCheck size={16} className="text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(overview?.total_collected_revenue)}
            </span>
            <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-medium">
              Ledger Cleared
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Cumulative cleared payments ledger</p>
        </div>
      </div>

      {/* ── MRR Movement Waterfall & Monthly Progression Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-600" />
              MRR Movement & Growth Breakdown
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Deterministic monthly SaaS bridge: New, Expansion, Contraction, Churn, and Net Ending MRR.
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Last {selectedMonths} Months
          </span>
        </div>

        {mrrMovement.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No historical MRR movements recorded for this window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-emerald-600">New MRR</th>
                  <th className="py-3 px-4 text-indigo-600">Expansion MRR</th>
                  <th className="py-3 px-4 text-amber-600">Contraction MRR</th>
                  <th className="py-3 px-4 text-rose-600">Churned MRR</th>
                  <th className="py-3 px-4 text-gray-700">Net Growth</th>
                  <th className="py-3 px-4 text-gray-900 font-bold">Ending MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mrrMovement.map((row, idx) => {
                  const netVal = Number(row.net_mrr_growth || 0);
                  const isPositive = netVal >= 0;
                  return (
                    <tr key={row.period || idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-800 flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        {row.period}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 font-medium">
                        +{formatCurrency(row.new_mrr)}
                      </td>
                      <td className="py-3.5 px-4 text-indigo-600 font-medium">
                        +{formatCurrency(row.expansion_mrr)}
                      </td>
                      <td className="py-3.5 px-4 text-amber-600 font-medium">
                        -{formatCurrency(row.contraction_mrr)}
                      </td>
                      <td className="py-3.5 px-4 text-rose-600 font-medium">
                        -{formatCurrency(row.churned_mrr)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {formatCurrency(row.net_mrr_growth)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {formatCurrency(row.ending_mrr)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Active Subscriber Distribution Breakdowns ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <PieChart size={16} className="text-indigo-600" />
            Subscription Status Breakdown
          </h3>
          {statusEntries.length === 0 ? (
            <p className="text-xs text-gray-400">No subscriptions active.</p>
          ) : (
            <div className="space-y-3">
              {statusEntries.map(([st, count]) => {
                const badgeColor =
                  st === 'LIVE' ? 'bg-emerald-100 text-emerald-800' :
                  st === 'TRIAL' ? 'bg-blue-100 text-blue-800' :
                  st === 'NON_RENEWING' ? 'bg-amber-100 text-amber-800' :
                  st === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                  st === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                  'bg-gray-100 text-gray-800';

                return (
                  <div key={st} className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${badgeColor}`}>
                      {st}
                    </span>
                    <span className="font-bold text-gray-900">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Layers size={16} className="text-blue-600" />
            Active Plan Distribution
          </h3>
          {planEntries.length === 0 ? (
            <p className="text-xs text-gray-400">No active plans assigned.</p>
          ) : (
            <div className="space-y-3">
              {planEntries.map(([planName, count]) => {
                const pct = totalActiveSubs > 0 ? Math.round((count / totalActiveSubs) * 100) : 0;
                return (
                  <div key={planName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-700 truncate max-w-[180px]">{planName}</span>
                      <span className="text-gray-900 font-bold">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Billing Cycle Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Calendar size={16} className="text-emerald-600" />
            Billing Cycle Frequency
          </h3>
          {cycleEntries.length === 0 ? (
            <p className="text-xs text-gray-400">No cycle data available.</p>
          ) : (
            <div className="space-y-3">
              {cycleEntries.map(([cycleName, count]) => (
                <div key={cycleName} className="flex items-center justify-between text-xs py-1">
                  <span className="capitalize font-medium text-gray-700">{cycleName}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-800 font-bold rounded">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
