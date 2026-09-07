import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Building2,
  TrendingUp,
  Award,
  AlertTriangle,
  Briefcase,
  Target,
  DollarSign,
  PieChart,
  UserCheck,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Filter,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  FileText,
  FileSpreadsheet,
  Clock,
  Tag,
  ArrowRight,
  ArrowLeft,
  Eye,
  Lock,
} from 'lucide-react';
import { API_BASE_URL, apiGet } from '../App';

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Helper to reliably extract array items from standard or paginated API payloads
function getArrayFromResponse(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.success && Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.results)) return res.data.results;
  if (Array.isArray(res.results)) return res.results;
  return [];
}

export default function UserReportingPage({ currentUser, setMessage }) {
  const [reportData, setReportData] = useState({ summary: {}, users: [], stages: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL');
  const [availableRoles, setAvailableRoles] = useState([]);

  // Dedicated Detail Page State
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLeads, setUserLeads] = useState([]);
  const [userOpps, setUserOpps] = useState([]);
  const [allPipelines, setAllPipelines] = useState([]);
  const [allStages, setAllStages] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Detail Page Filter States
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | '30DAYS' | 'CUSTOM'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState('ALL');
  const [recordType, setRecordType] = useState('ALL'); // 'ALL' | 'LEADS' | 'OPPORTUNITIES'

  // Pagination States for Detail Tables
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsPageSize, setLeadsPageSize] = useState(10);
  const [oppsPage, setOppsPage] = useState(1);
  const [oppsPageSize, setOppsPageSize] = useState(10);

  // Enforce CRM Administrator Access Restriction
  const isAdmin = currentUser?.user_type === 'ADMIN' || currentUser?.is_superuser || currentUser?.role === 'CRM Administrator';

  // Fetch organization report summary from API
  const fetchReport = async () => {
    try {
      setLoading(true);
      let queryParams = [];
      if (search.trim()) queryParams.push(`search=${encodeURIComponent(search.trim())}`);
      if (selectedRole !== 'ALL') queryParams.push(`role_id=${selectedRole}`);

      if (dateRange === '30DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        queryParams.push(`date_from=${d.toISOString().slice(0, 10)}`);
      } else if (dateRange === 'THIS_MONTH') {
        const d = new Date();
        d.setDate(1);
        queryParams.push(`date_from=${d.toISOString().slice(0, 10)}`);
      }

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await apiGet(`/api/reports/user-performance/${queryString}`);

      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        setMessage?.(res.message || 'Failed to retrieve user reporting data.');
      }
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || 'Error fetching user report.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch auxiliary CRM roles, pipelines, and stages
  const fetchAuxiliaryData = async () => {
    try {
      const [rolesRes, pipelinesRes, stagesRes] = await Promise.allSettled([
        apiGet('/api/roles/'),
        apiGet('/api/pipelines/'),
        apiGet('/api/pipeline/stages/'),
      ]);

      if (rolesRes.status === 'fulfilled' && rolesRes.value?.success && Array.isArray(rolesRes.value.data)) {
        setAvailableRoles(rolesRes.value.data);
      }

      if (pipelinesRes.status === 'fulfilled') {
        const loadedPipelines = getArrayFromResponse(pipelinesRes.value);
        setAllPipelines(loadedPipelines);
      }

      if (stagesRes.status === 'fulfilled') {
        setAllStages(getArrayFromResponse(stagesRes.value));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchReport();
      fetchAuxiliaryData();
    }
  }, [selectedRole, dateRange, isAdmin]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const { summary = {}, users = [], stages = [] } = reportData;

  // Filter users client-side for search box
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  // Open Dedicated User Performance Detail Page View
  const openUserDetailPage = async (u) => {
    setSelectedUser(u);
    setDetailsLoading(true);
    setDatePreset('ALL');
    setDateFrom('');
    setDateTo('');
    setSelectedPipeline('ALL');
    setRecordType('ALL');
    setLeadsPage(1);
    setOppsPage(1);

    try {
      // Fetch user's assigned leads & opportunities using existing CRM APIs
      const targetUserId = Number(u.user_id);
      const [leadsRes, oppsRes] = await Promise.allSettled([
        apiGet(`/api/leads/?assigned_salesperson=${targetUserId}&page_size=500`),
        apiGet(`/api/opportunities/?assigned_salesperson=${targetUserId}&page_size=500`),
      ]);

      let leadsList = [];
      if (leadsRes.status === 'fulfilled') {
        leadsList = getArrayFromResponse(leadsRes.value);
      }

      let oppsList = [];
      if (oppsRes.status === 'fulfilled') {
        oppsList = getArrayFromResponse(oppsRes.value);
      }

      setUserLeads(leadsList);
      setUserOpps(oppsList);
    } catch (err) {
      console.error('Error fetching user detail records:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeUserDetailPage = () => {
    setSelectedUser(null);
    setUserLeads([]);
    setUserOpps([]);
  };

  // Maps for Pipeline Name and Stage Name lookup
  const pipelineMap = useMemo(() => {
    const map = {};
    allPipelines.forEach((p) => {
      if (p.id) map[p.id] = p.name || `Pipeline ${p.id}`;
    });

    // Extract any unique pipeline IDs directly from user leads and opps if missing in map
    userLeads.forEach((l) => {
      if (l.pipeline && !map[l.pipeline]) map[l.pipeline] = `Pipeline ${l.pipeline}`;
    });
    userOpps.forEach((o) => {
      if (o.pipeline && !map[o.pipeline]) map[o.pipeline] = `Pipeline ${o.pipeline}`;
    });

    return map;
  }, [allPipelines, userLeads, userOpps]);

  // Set availablePipelineOptions directly from allPipelines data
  const availablePipelineOptions = useMemo(() => {
    return allPipelines;
  }, [allPipelines]);

  const stageMap = useMemo(() => {
    const map = {};
    allStages.forEach((s) => {
      if (s.id && s.name) map[s.id] = s.name;
    });
    stages.forEach((s) => {
      if (s.id && s.name) map[s.id] = s.name;
    });
    return map;
  }, [allStages, stages]);

  // Handle Date Preset selection
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'TODAY') {
      const todayStr = now.toISOString().slice(0, 10);
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'THIS_WEEK') {
      const dayOfWeek = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - dayOfWeek);
      setDateFrom(firstDay.toISOString().slice(0, 10));
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(firstDay.toISOString().slice(0, 10));
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === '30DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setDateFrom(d.toISOString().slice(0, 10));
      setDateTo(now.toISOString().slice(0, 10));
    }
  };

  // Client-side filtering for detail page records based on Date & Pipeline filters
  const filteredDetailLeads = useMemo(() => {
    if (!selectedUser) return [];
    return userLeads.filter((l) => {
      if (dateFrom && l.created_at) {
        if (new Date(l.created_at) < new Date(dateFrom)) return false;
      }
      if (dateTo && l.created_at) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(l.created_at) > end) return false;
      }
      if (selectedPipeline !== 'ALL' && l.pipeline) {
        if (String(l.pipeline) !== String(selectedPipeline)) return false;
      }
      return true;
    });
  }, [userLeads, selectedUser, dateFrom, dateTo, selectedPipeline]);

  const filteredDetailOpps = useMemo(() => {
    if (!selectedUser) return [];
    return userOpps.filter((o) => {
      if (dateFrom && o.created_at) {
        if (new Date(o.created_at) < new Date(dateFrom)) return false;
      }
      if (dateTo && o.created_at) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(o.created_at) > end) return false;
      }
      if (selectedPipeline !== 'ALL' && o.pipeline) {
        if (String(o.pipeline) !== String(selectedPipeline)) return false;
      }
      return true;
    });
  }, [userOpps, selectedUser, dateFrom, dateTo, selectedPipeline]);

  // Reset pagination on filter change
  useEffect(() => {
    setLeadsPage(1);
    setOppsPage(1);
  }, [dateFrom, dateTo, selectedPipeline, recordType]);

  // Paginated leads & opps arrays
  const paginatedLeads = useMemo(() => {
    const start = (leadsPage - 1) * leadsPageSize;
    return filteredDetailLeads.slice(start, start + leadsPageSize);
  }, [filteredDetailLeads, leadsPage, leadsPageSize]);

  const totalLeadsPages = Math.ceil(filteredDetailLeads.length / leadsPageSize) || 1;

  const paginatedOpps = useMemo(() => {
    const start = (oppsPage - 1) * oppsPageSize;
    return filteredDetailOpps.slice(start, start + oppsPageSize);
  }, [filteredDetailOpps, oppsPage, oppsPageSize]);

  const totalOppsPages = Math.ceil(filteredDetailOpps.length / oppsPageSize) || 1;

  // Dynamic Metrics calculation for selected user Detail Page
  const userMetrics = useMemo(() => {
    if (!selectedUser) return {};
    const totLeads = filteredDetailLeads.length;
    const totOpps = filteredDetailOpps.length;
    const wonOpps = filteredDetailOpps.filter((o) => o.stage === 'CLOSED_WON' || o.won).length;
    const lostOpps = filteredDetailOpps.filter((o) => o.stage === 'CLOSED_LOST' || (o.closed && !o.won)).length;
    const closedCount = wonOpps + lostOpps;
    const winRate = closedCount > 0 ? ((wonOpps / closedCount) * 100).toFixed(1) : (selectedUser.win_rate || 0);

    const pipelineVal = filteredDetailOpps
      .filter((o) => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST')
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    const wonVal = filteredDetailOpps
      .filter((o) => o.stage === 'CLOSED_WON' || o.won)
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    return {
      totalLeads: totLeads,
      totalOpps: totOpps,
      wonOpps,
      lostOpps,
      winRate,
      pipelineVal,
      wonVal,
    };
  }, [selectedUser, filteredDetailLeads, filteredDetailOpps]);

  // Export Main Users CSV
  const exportMainCSV = () => {
    if (!filteredUsers || !filteredUsers.length) return;

    const sanitizeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Sr. #',
      'User ID',
      'Full Name',
      'Email',
      'Role',
      'Total Leads',
      'New Leads',
      'Contacted Leads',
      'Converted Leads',
      'Total Opps',
      'Won Opps',
      'Lost Opps',
      'Pipeline Value ($)',
      'Won Revenue ($)',
      'Win Rate (%)',
    ];

    let csvStr = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
    csvStr += headers.map(sanitizeCsvCell).join(',') + '\n';

    filteredUsers.forEach((u, idx) => {
      const row = [
        idx + 1,
        u.user_id || u.id,
        u.full_name || '',
        u.email || '',
        u.role || '',
        u.total_leads || 0,
        u.new_leads || 0,
        u.contacted_leads || 0,
        u.converted_leads || 0,
        u.total_opportunities || 0,
        u.won_opportunities || 0,
        u.lost_opportunities || 0,
        Number(u.pipeline_value || 0).toFixed(2),
        Number(u.won_revenue || 0).toFixed(2),
        `${Number(u.win_rate || 0).toFixed(1)}%`,
      ];
      csvStr += row.map(sanitizeCsvCell).join(',') + '\n';
    });

    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CRM_User_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Selected User Detail Excel (.csv format with UTF-8 BOM for native Excel compatibility)
  const downloadUserExcel = () => {
    if (!selectedUser) return;
    const dateFilterStr = `${dateFrom || 'Start'} to ${dateTo || 'End'}`;
    const pipelineStr = selectedPipeline === 'ALL' ? 'All Pipelines' : pipelineMap[selectedPipeline] || selectedPipeline;

    const sanitizeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvContent = '\uFEFF'; // UTF-8 BOM for Microsoft Excel

    // Title & Metadata
    csvContent += `USER PERFORMANCE DETAIL REPORT - ${selectedUser.full_name.toUpperCase()}\n`;
    csvContent += `Salesperson,${sanitizeCsvCell(`${selectedUser.full_name} (${selectedUser.email})`)}\n`;
    csvContent += `Role,${sanitizeCsvCell(selectedUser.role)}\n`;
    csvContent += `Date Filter,${sanitizeCsvCell(dateFilterStr)}\n`;
    csvContent += `Pipeline Filter,${sanitizeCsvCell(pipelineStr)}\n`;
    csvContent += `Export Date,${sanitizeCsvCell(new Date().toLocaleString())}\n\n`;

    // Executive Summary
    csvContent += `EXECUTIVE METRIC SUMMARY\n`;
    csvContent += `Total Leads,Total Opportunities,Won Opportunities,Lost Opportunities,Win Rate,Pipeline Value,Won Revenue\n`;
    csvContent += `${userMetrics.totalLeads},${userMetrics.totalOpps},${userMetrics.wonOpps},${userMetrics.lostOpps},${userMetrics.winRate}%,$${Number(userMetrics.pipelineVal || 0).toFixed(2)},$${Number(userMetrics.wonVal || 0).toFixed(2)}\n\n`;

    // Assigned Leads Section
    if (recordType === 'ALL' || recordType === 'LEADS') {
      csvContent += `ASSIGNED LEADS (${filteredDetailLeads.length})\n`;
      csvContent += `Sr. #,Created Date,Lead ID,Lead Name,Company,Current Pipeline,Current Stage,Status,Priority,Source\n`;
      filteredDetailLeads.forEach((l, idx) => {
        const row = [
          idx + 1,
          l.created_at ? new Date(l.created_at).toLocaleDateString() : '—',
          l.lead_code || `LD-${l.id}`,
          l.full_name || '',
          l.company_name || '—',
          pipelineMap[l.pipeline] || 'Standard Pipeline',
          stageMap[l.pipeline_stage] || l.status,
          l.is_converted ? 'CONVERTED' : l.status,
          l.priority || 'MEDIUM',
          l.source || 'OTHER'
        ];
        csvContent += row.map(sanitizeCsvCell).join(',') + '\n';
      });
      csvContent += '\n';
    }

    // Assigned Opportunities Section
    if (recordType === 'ALL' || recordType === 'OPPORTUNITIES') {
      csvContent += `ASSIGNED OPPORTUNITIES (${filteredDetailOpps.length})\n`;
      csvContent += `Sr. #,Created Date,Opportunity ID,Opportunity Name,Company,Current Pipeline,Current Stage,Status,Deal Value\n`;
      filteredDetailOpps.forEach((o, idx) => {
        const row = [
          idx + 1,
          o.created_at ? new Date(o.created_at).toLocaleDateString() : '—',
          o.opportunity_code || `OP-${o.id}`,
          o.name || '',
          o.company_name || '—',
          pipelineMap[o.pipeline] || 'Standard Pipeline',
          stageMap[o.pipeline_stage] || o.stage,
          o.stage === 'CLOSED_WON' || o.won ? 'WON' : o.stage === 'CLOSED_LOST' ? 'LOST' : o.stage,
          `$${Number(o.amount || 0).toFixed(2)}`
        ];
        csvContent += row.map(sanitizeCsvCell).join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `User_Performance_${selectedUser.username || selectedUser.user_id}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export Selected User Detail PDF (Headless Chromium 1-click direct download with iframe fallback)
  const downloadUserPDF = async () => {
    if (!selectedUser) return;

    const dateFilterStr = `${dateFrom || 'Start'} to ${dateTo || 'End'}`;
    const pipelineStr = selectedPipeline === 'ALL' ? 'All Pipelines' : pipelineMap[selectedPipeline] || selectedPipeline;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>User Performance Report - ${selectedUser.full_name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
          h1 { color: #4f46e5; margin-bottom: 4px; font-size: 22px; }
          .sub { color: #64748b; font-size: 12px; margin-bottom: 20px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .metric-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center; }
          .metric-box label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; display: block; }
          .metric-box strong { font-size: 18px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; font-weight: bold; color: #475569; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          .badge { padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; }
          .won { background: #dcfce7; color: #166534; }
          .lost { background: #ffe4e6; color: #9f1239; }
          .new { background: #dbeafe; color: #1e40af; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>User Performance Report: ${selectedUser.full_name}</h1>
        <div class="sub">
          Email: ${selectedUser.email} | Role: ${selectedUser.role} | Filter: ${dateFilterStr} | Pipeline: ${pipelineStr} | Generated: ${new Date().toLocaleString()}
        </div>

        <div class="summary-grid">
          <div class="metric-box"><label>Total Leads</label><strong>${userMetrics.totalLeads}</strong></div>
          <div class="metric-box"><label>Total Opps</label><strong>${userMetrics.totalOpps}</strong></div>
          <div class="metric-box"><label>Won Deals</label><strong style="color: #16a34a;">${userMetrics.wonOpps}</strong></div>
          <div class="metric-box"><label>Win Rate</label><strong style="color: #4f46e5;">${userMetrics.winRate}%</strong></div>
          <div class="metric-box"><label>Pipeline Value</label><strong>$${Number(userMetrics.pipelineVal).toFixed(2)}</strong></div>
          <div class="metric-box"><label>Won Revenue</label><strong style="color: #16a34a;">$${Number(userMetrics.wonVal).toFixed(2)}</strong></div>
        </div>

        ${
          recordType === 'ALL' || recordType === 'LEADS'
            ? `
          <h3>Assigned Leads (${filteredDetailLeads.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Sr. #</th><th>Created Date</th><th>Lead ID</th><th>Lead Name</th><th>Company</th><th>Pipeline</th><th>Stage</th><th>Status</th><th>Priority</th><th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDetailLeads
                .map(
                  (l, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
                  <td>${l.lead_code || `LD-${l.id}`}</td>
                  <td><strong>${l.full_name || ''}</strong></td>
                  <td>${l.company_name || '—'}</td>
                  <td>${pipelineMap[l.pipeline] || 'Standard Pipeline'}</td>
                  <td>${stageMap[l.pipeline_stage] || l.status}</td>
                  <td><span class="badge ${l.is_converted ? 'won' : 'new'}">${l.is_converted ? 'CONVERTED' : l.status}</span></td>
                  <td>${l.priority || 'MEDIUM'}</td>
                  <td>${l.source || 'OTHER'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }

        ${
          recordType === 'ALL' || recordType === 'OPPORTUNITIES'
            ? `
          <h3>Assigned Opportunities (${filteredDetailOpps.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Sr. #</th><th>Created Date</th><th>Opp ID</th><th>Opportunity Name</th><th>Company</th><th>Pipeline</th><th>Stage</th><th>Status</th><th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDetailOpps
                .map(
                  (o, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                  <td>${o.opportunity_code || `OP-${o.id}`}</td>
                  <td><strong>${o.name || ''}</strong></td>
                  <td>${o.company_name || '—'}</td>
                  <td>${pipelineMap[o.pipeline] || 'Standard Pipeline'}</td>
                  <td>${stageMap[o.pipeline_stage] || o.stage}</td>
                  <td><span class="badge ${o.stage === 'CLOSED_WON' || o.won ? 'won' : 'new'}">${o.stage === 'CLOSED_WON' || o.won ? 'WON' : o.stage === 'CLOSED_LOST' ? 'LOST' : o.stage}</span></td>
                  <td><strong>$${Number(o.amount || 0).toFixed(2)}</strong></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }
      </body>
      </html>
    `;

    const filename = `User_Performance_${selectedUser.username || selectedUser.user_id}_${new Date().toISOString().slice(0, 10)}.pdf`;

    try {
      const csrfToken = getCookie('csrftoken');
      const res = await fetch(`${API_BASE_URL}/api/reports/user-performance/pdf/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify({ html_content: htmlContent, filename }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      if (setMessage) {
        setMessage('PDF report downloaded successfully.');
      }
    } catch (err) {
      console.error('Playwright PDF server rendering failed:', err);
      if (setMessage) {
        setMessage(`PDF download failed: ${err.message}`);
      }
    }
  };

  // Render Access Restricted Screen for Non-Admin roles
  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-slate-500 font-semibold flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-sm">
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 m-0">Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md m-0">
          User Performance Reporting and representative drill-downs are available strictly to CRM Administrators.
        </p>
      </div>
    );
  }

  // Loading Indicator
  if (loading && !users.length && !selectedUser) {
    return (
      <div className="p-12 text-center text-slate-500 font-semibold animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center animate-spin">
          <RefreshCw size={20} />
        </div>
        <span>Loading organization user reporting data from server...</span>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 2: DEDICATED USER PERFORMANCE DETAIL PAGE VIEW (When user selected)
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedUser) {
    const initials = selectedUser.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className="page user-performance-detail-page p-4 sm:p-6 max-w-[1600px] w-full max-w-full overflow-x-hidden mx-auto space-y-6 animate-in fade-in duration-200">
        
        {/* ── TOP NAVIGATION HEADER BAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeUserDetailPage}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all cursor-pointer shrink-0"
              title="Back to User Performance"
              aria-label="Back to User Performance"
            >
              <ArrowLeft size={18} />
            </button>

            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Performance Detail</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={downloadUserExcel}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-sm transition-all cursor-pointer"
              title="Download Excel (.xlsx) Report"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={downloadUserPDF}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition-all cursor-pointer"
              title="Download PDF (.pdf) Report"
            >
              <FileText size={15} className="text-indigo-600" />
              <span>Download PDF (.pdf)</span>
            </button>
          </div>
        </div>

        {/* ── USER PROFILE & EXECUTIVE METRICS STRIP ── */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col lg:flex-row items-stretch justify-between gap-6">
          {/* User Profile Summary */}
          <div className="flex items-center gap-4 min-w-0 pr-6 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 m-0 truncate">
                  User Performance — {selectedUser.full_name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedUser.role === 'Administrator'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : selectedUser.role.includes('Manager')
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  {selectedUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 m-0 font-medium truncate">{selectedUser.email}</p>
            </div>
          </div>

          {/* User KPI Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 flex-1">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Total Leads</span>
              <strong className="text-lg font-black text-slate-900">{userMetrics.totalLeads}</strong>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Total Opps</span>
              <strong className="text-lg font-black text-slate-900">{userMetrics.totalOpps}</strong>
            </div>

            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-600 block mb-0.5">Won Opps</span>
              <strong className="text-lg font-black text-emerald-700">{userMetrics.wonOpps}</strong>
            </div>

            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
              <span className="text-[10px] font-bold uppercase text-rose-600 block mb-0.5">Lost Opps</span>
              <strong className="text-lg font-black text-rose-700">{userMetrics.lostOpps}</strong>
            </div>

            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 text-center">
              <span className="text-[10px] font-bold uppercase text-indigo-600 block mb-0.5">Win Rate</span>
              <strong className="text-lg font-black text-indigo-700">{userMetrics.winRate}%</strong>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-700 block mb-0.5">Pipeline Val</span>
              <strong className="text-sm sm:text-base font-black text-amber-900 truncate block">
                ${Number(userMetrics.pipelineVal || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </strong>
            </div>

            <div className="bg-emerald-100/70 p-3 rounded-xl border border-emerald-300 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block mb-0.5">Won Revenue</span>
              <strong className="text-sm sm:text-base font-black text-emerald-900 truncate block">
                ${Number(userMetrics.wonVal || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </strong>
            </div>
          </div>
        </div>

        {/* ── FILTER CONTROLS BAR WITH IMPROVED DATE RANGE UX ── */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            
            {/* Quick Date Presets Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Calendar size={14} className="text-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-slate-500 uppercase shrink-0">Date Range:</span>
              <select
                value={datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-indigo-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="30DAYS">Last 30 Days</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>
            </div>

            {/* Custom Calendar Pickers (Shown when Custom Range selected or dates active) */}
            {(datePreset === 'CUSTOM' || dateFrom || dateTo) && (
              <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">From:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setDatePreset('CUSTOM');
                    }}
                    className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">To:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setDatePreset('CUSTOM');
                    }}
                    className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Pipeline Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Filter size={13} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-500 uppercase shrink-0">Pipeline:</span>
              <select
                value={selectedPipeline}
                onChange={(e) => setSelectedPipeline(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Pipelines</option>
                {availablePipelineOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Record Type Toggle */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Layers size={13} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-500 uppercase shrink-0">Show:</span>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Records</option>
                <option value="LEADS">Assigned Leads</option>
                <option value="OPPORTUNITIES">Assigned Opportunities</option>
              </select>
            </div>
          </div>

          {(dateFrom || dateTo || selectedPipeline !== 'ALL' || recordType !== 'ALL' || datePreset !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setDatePreset('ALL');
                setDateFrom('');
                setDateTo('');
                setSelectedPipeline('ALL');
                setRecordType('ALL');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 underline shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* ── SEGMENTED RECORD SECTION NAVIGATION BAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setRecordType('ALL')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                recordType === 'ALL'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={14} />
              <span>All Records ({filteredDetailLeads.length + filteredDetailOpps.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setRecordType('LEADS')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                recordType === 'LEADS'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target size={14} />
              <span>Assigned Leads ({filteredDetailLeads.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setRecordType('OPPORTUNITIES')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                recordType === 'OPPORTUNITIES'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase size={14} />
              <span>Assigned Opportunities ({filteredDetailOpps.length})</span>
            </button>
          </div>

          <span className="text-[11px] font-medium text-slate-500 px-2">
            Active Display: <strong className="text-slate-800">{recordType === 'ALL' ? 'Combined View' : recordType === 'LEADS' ? 'Assigned Leads View' : 'Assigned Opportunities View'}</strong>
          </span>
        </div>

        {/* ── ASSIGNED LEADS TABLE (PAGINATED WITH CONSTRAINED VIEWPORT & STICKY HEADER) ── */}
        {(recordType === 'ALL' || recordType === 'LEADS') && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 m-0">Assigned Leads ({filteredDetailLeads.length})</h3>
              </div>

              {/* Pagination Page Size */}
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>Show:</span>
                <select
                  value={leadsPageSize}
                  onChange={(e) => {
                    setLeadsPageSize(Number(e.target.value));
                    setLeadsPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-2 py-0.5 font-bold text-slate-800"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>per page</span>
              </div>
            </div>

            {detailsLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold animate-pulse flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-indigo-600" />
                <span>Loading lead records for {selectedUser.full_name}...</span>
              </div>
            ) : filteredDetailLeads.length > 0 ? (
              <>
                <div className="w-full max-w-full block overflow-x-auto max-h-[540px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-xs">
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                        <th className="py-3 px-4 w-14 text-center whitespace-nowrap">Sr. #</th>
                        <th className="py-3 px-4 whitespace-nowrap">Created Date</th>
                        <th className="py-3 px-4 whitespace-nowrap">Lead ID</th>
                        <th className="py-3 px-4 whitespace-nowrap">Lead Name</th>
                        <th className="py-3 px-4 whitespace-nowrap">Company</th>
                        <th className="py-3 px-4 whitespace-nowrap">Current Pipeline</th>
                        <th className="py-3 px-4 whitespace-nowrap">Current Stage</th>
                        <th className="py-3 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3 px-4 whitespace-nowrap">Priority</th>
                        <th className="py-3 px-4 whitespace-nowrap">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedLeads.map((l, idx) => (
                        <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-400 whitespace-nowrap">
                            {(leadsPage - 1) * leadsPageSize + idx + 1}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                            {l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-500 whitespace-nowrap">{l.lead_code || `LD-${l.id}`}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{l.full_name}</td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{l.company_name || '—'}</td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{pipelineMap[l.pipeline] || 'Standard Pipeline'}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {stageMap[l.pipeline_stage] || l.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                l.is_converted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : l.status === 'NEW'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {l.is_converted ? 'CONVERTED' : l.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">{l.priority || 'MEDIUM'}</td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{l.source || 'OTHER'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Bar */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    Showing <strong className="text-slate-900">{Math.min(filteredDetailLeads.length, (leadsPage - 1) * leadsPageSize + 1)}</strong> to{' '}
                    <strong className="text-slate-900">{Math.min(filteredDetailLeads.length, leadsPage * leadsPageSize)}</strong> of{' '}
                    <strong className="text-slate-900">{filteredDetailLeads.length}</strong> leads
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={leadsPage === 1}
                      onClick={() => setLeadsPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    <span className="font-semibold text-slate-700">
                      Page <strong>{leadsPage}</strong> of {totalLeadsPages}
                    </span>

                    <button
                      type="button"
                      disabled={leadsPage >= totalLeadsPages}
                      onClick={() => setLeadsPage((p) => Math.min(totalLeadsPages, p + 1))}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-10 text-center text-slate-400 text-xs font-semibold bg-slate-50/50">
                No leads match active filter criteria for {selectedUser.full_name}.
              </div>
            )}
          </div>
        )}

        {/* ── ASSIGNED OPPORTUNITIES TABLE (PAGINATED WITH CONSTRAINED VIEWPORT & STICKY HEADER) ── */}
        {(recordType === 'ALL' || recordType === 'OPPORTUNITIES') && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 m-0">Assigned Opportunities ({filteredDetailOpps.length})</h3>
              </div>

              {/* Pagination Page Size */}
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>Show:</span>
                <select
                  value={oppsPageSize}
                  onChange={(e) => {
                    setOppsPageSize(Number(e.target.value));
                    setOppsPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-2 py-0.5 font-bold text-slate-800"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>per page</span>
              </div>
            </div>

            {detailsLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold animate-pulse flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-indigo-600" />
                <span>Loading opportunity records for {selectedUser.full_name}...</span>
              </div>
            ) : filteredDetailOpps.length > 0 ? (
              <>
                <div className="w-full max-w-full block overflow-x-auto max-h-[540px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-xs">
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                        <th className="py-3 px-4 w-14 text-center whitespace-nowrap">Sr. #</th>
                        <th className="py-3 px-4 whitespace-nowrap">Created Date</th>
                        <th className="py-3 px-4 whitespace-nowrap">Opportunity ID</th>
                        <th className="py-3 px-4 whitespace-nowrap">Opportunity Name</th>
                        <th className="py-3 px-4 whitespace-nowrap">Company</th>
                        <th className="py-3 px-4 whitespace-nowrap">Current Pipeline</th>
                        <th className="py-3 px-4 whitespace-nowrap">Current Stage</th>
                        <th className="py-3 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Deal Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedOpps.map((o, idx) => (
                        <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-400 whitespace-nowrap">
                            {(oppsPage - 1) * oppsPageSize + idx + 1}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                            {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-500 whitespace-nowrap">{o.opportunity_code || `OP-${o.id}`}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{o.name}</td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{o.company_name || '—'}</td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{pipelineMap[o.pipeline] || 'Standard Pipeline'}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {stageMap[o.pipeline_stage] || o.stage}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                o.stage === 'CLOSED_WON' || o.won
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : o.stage === 'CLOSED_LOST'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {o.stage === 'CLOSED_WON' || o.won ? 'WON' : o.stage === 'CLOSED_LOST' ? 'LOST' : o.stage}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                            ${Number(o.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Bar */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    Showing <strong className="text-slate-900">{Math.min(filteredDetailOpps.length, (oppsPage - 1) * oppsPageSize + 1)}</strong> to{' '}
                    <strong className="text-slate-900">{Math.min(filteredDetailOpps.length, oppsPage * oppsPageSize)}</strong> of{' '}
                    <strong className="text-slate-900">{filteredDetailOpps.length}</strong> opportunities
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={oppsPage === 1}
                      onClick={() => setOppsPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    <span className="font-semibold text-slate-700">
                      Page <strong>{oppsPage}</strong> of {totalOppsPages}
                    </span>

                    <button
                      type="button"
                      disabled={oppsPage >= totalOppsPages}
                      onClick={() => setOppsPage((p) => Math.min(totalOppsPages, p + 1))}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-10 text-center text-slate-400 text-xs font-semibold bg-slate-50/50">
                No opportunities match active filter criteria for {selectedUser.full_name}.
              </div>
            )}
          </div>
        )}

      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 1: MAIN ORGANIZATION USER PERFORMANCE TABLE (When no user selected)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="page salesforce-leads user-reporting-page p-4 sm:p-6 max-w-[1600px] w-full max-w-full overflow-x-hidden mx-auto space-y-6">
      {/* ── EXECUTIVE HEADER ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200 shrink-0">
              <Users size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 m-0">User Performance & Workload</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Sparkles size={12} /> Live Executive Analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 m-0 font-medium">
                Organization-wide sales representative workload, lead status velocity, and deal conversion metrics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-end md:self-auto">
          <button
            type="button"
            className="button secondary sm flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all"
            onClick={fetchReport}
            title="Refresh Report Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="button sm flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-sm transition-all"
            onClick={exportMainCSV}
            title="Export Performance CSV Report"
          >
            <Download size={14} className="text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* ── PREMIUM KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Active Reps */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-400 group-hover:bg-indigo-600 transition-colors" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400">Active Reps</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Users size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">{summary.total_users || 0}</div>
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-1 truncate">Assigned Representatives</div>
        </div>

        {/* Card 2: Total Leads */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400">Total Leads</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Target size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tight text-blue-700">{summary.total_leads || 0}</div>
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-1 truncate">Org Lead Pipeline</div>
        </div>

        {/* Card 3: Total Opps */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400">Total Opps</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Briefcase size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tight text-amber-700">{summary.total_opportunities || 0}</div>
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-1 truncate">Active Opportunities</div>
        </div>

        {/* Card 4: Won Deals */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400">Won Deals</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tight text-emerald-700">{summary.total_won_deals || 0}</div>
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-1 truncate">Closed-Won Deals</div>
        </div>

        {/* Card 5: Won Revenue */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400">Won Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tight text-emerald-800 truncate">
            ${Number(summary.total_won_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] sm:text-[11px] font-medium text-emerald-600 mt-1 truncate">Realized Revenue</div>
        </div>

        {/* Card 6: Org Win Rate */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-slate-400">Org Win Rate</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <PieChart size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tight text-indigo-700">{summary.avg_win_rate || 0}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, summary.avg_win_rate || 0))}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search representative by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <button type="submit" className="button primary sm text-xs font-semibold px-4 shrink-0">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Role Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex-1 sm:flex-initial">
            <Filter size={13} className="text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-500 uppercase shrink-0">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Roles</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex-1 sm:flex-initial">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-500 uppercase shrink-0">Date:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Time</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── MAIN USER PERFORMANCE TABLE (WITH SR. # FIRST COLUMN) ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden w-full max-w-full">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 m-0">Team Performance & Pipeline Breakdown</h3>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Showing <strong className="text-slate-800">{filteredUsers.length}</strong> sales representatives (Click row for details)
          </span>
        </div>

        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[980px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-2 w-10 text-center whitespace-nowrap">Sr. #</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Salesperson</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Role</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Total Leads</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">New</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Contacted</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Converted</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Total Opps</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Won Opps</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Lost Opps</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Pipeline Value</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Won Revenue</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Win Rate</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u, idx) => {
                  const initials = u.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  const isHighPerformer = u.win_rate >= 50;

                  return (
                    <tr
                      key={u.user_id}
                      onClick={() => openUserDetailPage(u)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      title="Click to view full user performance details & pipeline breakdown"
                    >
                      {/* Sr. # Column (Sequential 1, 2, 3...) */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-400 whitespace-nowrap">
                        {idx + 1}
                      </td>

                      {/* Rep Name & Email */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-[11px] flex items-center justify-center shadow-sm shrink-0">
                            {initials}
                          </div>
                          <div>
                            <strong className="block text-slate-900 font-semibold group-hover:text-indigo-600 transition-colors text-xs">
                              {u.full_name}
                            </strong>
                            <span className="text-[11px] text-slate-400 font-normal">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Pill */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.role === 'Administrator'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : u.role.includes('Manager')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Total Leads */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-bold text-[11px]">
                          {u.total_leads}
                        </span>
                      </td>

                      {/* New Leads */}
                      <td className="py-2.5 px-2 text-center text-slate-600 font-medium whitespace-nowrap">
                        {u.new_leads > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-semibold">
                            {u.new_leads}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* Contacted */}
                      <td className="py-2.5 px-2 text-center text-slate-600 font-medium whitespace-nowrap">
                        {u.contacted_leads > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[11px] font-semibold">
                            {u.contacted_leads}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* Converted */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        {u.converted_leads > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} /> {u.converted_leads}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* Total Opps */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-bold text-[11px]">
                          {u.total_opportunities}
                        </span>
                      </td>

                      {/* Won Opps */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        {u.won_opportunities > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Award size={11} /> {u.won_opportunities}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* Lost Opps */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        {u.lost_opportunities > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle size={11} /> {u.lost_opportunities}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* Pipeline Value */}
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        ${Number(u.pipeline_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Won Revenue */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {u.won_revenue > 0 ? (
                          <span className="font-extrabold text-emerald-700">
                            ${Number(u.won_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Win Rate */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                              isHighPerformer
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : u.win_rate > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {u.win_rate}%
                          </span>
                          <div className="w-14 bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isHighPerformer ? 'bg-emerald-500' : u.win_rate > 0 ? 'bg-amber-500' : 'bg-slate-300'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, u.win_rate))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Action Icon */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all mx-auto">
                          <Eye size={13} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="14" className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search size={24} className="text-slate-300" />
                      <span>No salespeople or performance records match your active search filters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
