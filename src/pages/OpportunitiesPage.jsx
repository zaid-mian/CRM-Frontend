import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Edit3,
  PlusCircle,
  Search,
  ShieldCheck,
  X,
  Building2,
  User,
  Users,
  Briefcase,
  Clock,
  Activity,
  FileText,
  Calendar,
  ExternalLink,
  Plus,
  DollarSign,
  Phone,
  Mail,
  Globe,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Check,
  CreditCard,
  PackageCheck,
  Zap,
} from 'lucide-react';
import { authRequest, apiGet } from '../App';
import { provisionWonOpportunity, fetchPricingPlans } from '../utils/billingApi';

export default function OpportunitiesPage({ currentUser, setMessage, canCreate = true, canEdit = true, canDelete = true }) {
  const [opportunitiesList, setOpportunitiesList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [pipelinesList, setPipelinesList] = useState([]);
  const [stagesList, setStagesList] = useState([]);
  
  const [loading, setLoading] = useState(true);

  const hasAssignAll = currentUser?.user_type === 'ADMIN' || 
                       currentUser?.is_staff || 
                       currentUser?.is_superuser || 
                       currentUser?.role === 'Administrator' || 
                       currentUser?.role === 'Salesperson Manager';

  const displayUsers = hasAssignAll 
    ? usersList 
    : (usersList.some(u => String(u.id) === String(currentUser?.id)) 
        ? usersList.filter(u => String(u.id) === String(currentUser?.id))
        : [{ id: currentUser?.id, full_name: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser?.username }]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');

  // Details drawer states
  const [activeDrawerCard, setActiveDrawerCard] = useState(null);
  const [drawerMode, setDrawerMode] = useState(null); // 'view' or 'edit'
  const [drawerForm, setDrawerForm] = useState({});
  const [drawerStages, setDrawerStages] = useState([]);
  const [customFormFields, setCustomFormFields] = useState([]);
  const [savingDrawer, setSavingDrawer] = useState(false);

  // Phase 15 Closed-Won Subscription Conversion States
  const [conversionModalOpen, setConversionModalOpen] = useState(false);
  const [conversionOpp, setConversionOpp] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planQuantity, setPlanQuantity] = useState(1);
  const [conversionStartDate, setConversionStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [collectionMethod, setCollectionMethod] = useState('CHARGE_AUTOMATIC');
  const [paymentTermsDays, setPaymentTermsDays] = useState(0);
  const [converting, setConverting] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const closeConversionModal = () => {
    if (converting) return;
    setConversionModalOpen(false);
    setConversionOpp(null);
    setSelectedPlanId('');
    setAvailablePlans([]);
    setLoadingPlans(false);
    setConverting(false);
  };

  const handleOpenConversionModal = async (opp) => {
    setConversionOpp(opp);
    setConversionModalOpen(true);
    setConversionStartDate(new Date().toISOString().slice(0, 10));
    setPlanQuantity(1);
    setCollectionMethod('CHARGE_AUTOMATIC');
    setPaymentTermsDays(0);
    setSelectedPlanId('');
    setLoadingPlans(true);

    try {
      const plans = await fetchPricingPlans();
      const activePlans = Array.isArray(plans) ? plans.filter(p => p && p.is_active !== false) : [];
      setAvailablePlans(activePlans);
      if (activePlans.length > 0) {
        setSelectedPlanId(String(activePlans[0].id));
      }
    } catch (err) {
      console.error('Failed to load pricing plans for opportunity conversion:', err);
      setAvailablePlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleConfirmConversion = async (e) => {
    e?.preventDefault();
    if (!conversionOpp || !selectedPlanId || converting || loadingPlans) return;
    try {
      setConverting(true);
      const companyId = conversionOpp.company || conversionOpp.company_id;
      const company = companiesList.find(c => String(c.id) === String(companyId));

      const payload = {
        opportunity_id: conversionOpp.id,
        company_id: companyId || null,
        company_name: company?.name || conversionOpp.name,
        contact_email: company?.email || '',
        plan_id: Number(selectedPlanId),
        plan_quantity: Number(planQuantity) || 1,
        start_date: conversionStartDate,
        collection_method: collectionMethod,
        payment_terms_days: Number(paymentTermsDays) || 0,
        add_ons: [],
      };

      const res = await provisionWonOpportunity(payload);
      setMessage?.(`Successfully provisioned subscription ${res.subscription_number} (${res.status}) for opportunity #${res.opportunity_id}!`);

      const updatedOpp = {
        ...conversionOpp,
        custom_values: {
          ...(conversionOpp.custom_values || {}),
          billing_subscription_id: res.subscription_id,
          billing_subscription_number: res.subscription_number,
          billing_customer_id: res.customer_id,
          billing_customer_number: res.customer_number,
        }
      };

      setActiveDrawerCard(prev => (prev && prev.id === conversionOpp.id ? updatedOpp : prev));
      setOpportunitiesList(prev => prev.map(o => o.id === conversionOpp.id ? updatedOpp : o));

      try {
        await authRequest(`/api/opportunities/${conversionOpp.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            custom_values: updatedOpp.custom_values
          })
        });
      } catch (patchErr) {
        console.warn('Could not persist custom_values to CRM opportunity backend:', patchErr);
      }

      closeConversionModal();
    } catch (err) {
      setMessage?.(err.message || 'Failed to convert opportunity to billing subscription.');
      setConverting(false);
    }
  };

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      const [oppsRes, companiesRes, usersRes, pipelinesRes, stagesRes] = await Promise.all([
        apiGet('/api/opportunities/?page_size=100'),
        apiGet('/api/companies/?page_size=100'),
        apiGet('/api/admin/users/'),
        apiGet('/api/pipelines/'),
        apiGet('/api/pipeline/stages/'),
      ]);

      if (oppsRes.success && oppsRes.data) {
        const results = oppsRes.data.results || oppsRes.data || [];
        setOpportunitiesList(results);
      }
      if (companiesRes.success && companiesRes.data) {
        const results = companiesRes.data.results || companiesRes.data || [];
        setCompaniesList(results);
      }
      if (usersRes.success && Array.isArray(usersRes.data)) {
        setUsersList(usersRes.data);
      }
      const rawPipelines = Array.isArray(pipelinesRes) ? pipelinesRes : (pipelinesRes?.data?.results || pipelinesRes?.data || []);
      if (Array.isArray(rawPipelines)) {
        setPipelinesList(rawPipelines);
      }
      const rawStages = Array.isArray(stagesRes) ? stagesRes : (stagesRes?.data?.results || stagesRes?.data || []);
      setStagesList(rawStages);
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || 'Failed to fetch opportunities workspace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const getOwnerName = (ownerId) => {
    if (!ownerId) return 'Unassigned';
    const found = usersList.find(u => String(u.id) === String(ownerId));
    return found ? (found.full_name || found.username) : `User ${ownerId}`;
  };

  const getCompanyName = (companyId) => {
    if (!companyId) return 'None';
    const found = companiesList.find(c => String(c.id) === String(companyId));
    return found ? found.name : `Company ${companyId}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Card click details drawer handler
  const handleCardClick = async (opp) => {
    try {
      setDrawerMode('view');
      const detailRes = await apiGet(`/api/opportunities/${opp.id}/`);
      const detailedOpp = detailRes.success && detailRes.data ? detailRes.data : opp;
      
      setActiveDrawerCard(detailedOpp);
      
      const targetPipelineId = detailedOpp.pipeline || (pipelinesList[0]?.id || '');
      let stages = [];
      let fields = [];
      
      if (targetPipelineId) {
        const [stagesRes, formRes] = await Promise.all([
          apiGet(`/api/pipeline/stages/?pipeline=${targetPipelineId}`),
          apiGet(`/api/pipelines/${targetPipelineId}/form/`)
        ]);
        const fetchedStages = Array.isArray(stagesRes) ? stagesRes : (stagesRes?.data?.results || stagesRes?.data || []);
        stages = fetchedStages;
        setDrawerStages(stages);

        if (formRes.success && formRes.data && formRes.data.is_active) {
          fields = formRes.data.fields || [];
          setCustomFormFields(fields);
        } else {
          setCustomFormFields([]);
        }
      } else {
        setDrawerStages([]);
        setCustomFormFields([]);
      }

      const initialCustomValues = {};
      fields.forEach(f => {
        initialCustomValues[f.label] = (detailedOpp.custom_values && detailedOpp.custom_values[f.label] !== undefined)
          ? detailedOpp.custom_values[f.label]
          : '';
      });
      if (detailedOpp.custom_values) {
        Object.keys(detailedOpp.custom_values).forEach(k => {
          if (initialCustomValues[k] === undefined) {
            initialCustomValues[k] = detailedOpp.custom_values[k];
          }
        });
      }

      setDrawerForm({
        name: detailedOpp.name || '',
        company: detailedOpp.company || '',
        amount: detailedOpp.amount || 0,
        expected_close_date: detailedOpp.expected_close_date ? String(detailedOpp.expected_close_date).slice(0, 10) : '',
        pipeline: detailedOpp.pipeline || (pipelinesList[0]?.id || ''),
        pipeline_stage: detailedOpp.pipeline_stage || '',
        assigned_salesperson: detailedOpp.assigned_salesperson || '',
        notes: detailedOpp.description || '',
        lost_reason: detailedOpp.lost_reason || '',
        custom_values: initialCustomValues,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePipelineChangeInDrawer = async (pipelineId) => {
    setDrawerForm(prev => ({
      ...prev,
      pipeline: pipelineId,
      pipeline_stage: '',
      custom_values: {}
    }));
    if (pipelineId) {
      try {
        const [stagesRes, formRes] = await Promise.all([
          apiGet(`/api/pipeline/stages/?pipeline=${pipelineId}`),
          apiGet(`/api/pipelines/${pipelineId}/form/`)
        ]);
        const fetchedStages = Array.isArray(stagesRes) ? stagesRes : (stagesRes?.data?.results || stagesRes?.data || []);
        setDrawerStages(fetchedStages);

        if (formRes.success && formRes.data && formRes.data.is_active) {
          setCustomFormFields(formRes.data.fields || []);
        } else {
          setCustomFormFields([]);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setDrawerStages([]);
      setCustomFormFields([]);
    }
  };

  const saveOpportunityDrawer = async (e) => {
    e.preventDefault();
    if (!activeDrawerCard) return;
    try {
      setSavingDrawer(true);
      
      const payload = {
        name: drawerForm.name,
        company: drawerForm.company ? Number(drawerForm.company) : null,
        amount: Number(drawerForm.amount || 0),
        expected_close_date: drawerForm.expected_close_date || null,
        pipeline: Number(drawerForm.pipeline),
        pipeline_stage: Number(drawerForm.pipeline_stage),
        assigned_salesperson: drawerForm.assigned_salesperson ? Number(drawerForm.assigned_salesperson) : null,
        notes: drawerForm.notes,
        lost_reason: drawerForm.lost_reason,
        custom_values: drawerForm.custom_values || {},
      };

      const res = await authRequest(`/api/opportunities/${activeDrawerCard.id}/`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setMessage?.('Opportunity updated successfully.');
        fetchWorkspaceData();
        const updatedDetailRes = await apiGet(`/api/opportunities/${activeDrawerCard.id}/`);
        if (updatedDetailRes.success && updatedDetailRes.data) {
          setActiveDrawerCard(updatedDetailRes.data);
        }
        setDrawerMode('view');
      } else {
        setMessage?.(res.message || 'Failed to save opportunity.');
      }
    } catch (err) {
      console.error(err);
      setMessage?.(err.message || 'Failed to save opportunity details.');
    } finally {
      setSavingDrawer(false);
    }
  };

  const filteredOpportunities = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return opportunitiesList.filter((opp) => {
      const oppStage = opp.pipeline_stage || opp.pipeline_stage_id || opp.stage;
      const oppOwner = opp.assigned_salesperson || opp.assigned_salesperson_id;
      const matchesStage = stageFilter === 'All' || String(oppStage) === stageFilter || opp.stage === stageFilter;
      const matchesOwner = ownerFilter === 'All' || String(oppOwner) === ownerFilter;
      const matchesSearch = !search || 
        (opp.name || '').toLowerCase().includes(search) ||
        (getCompanyName(opp.company || opp.company_id) || '').toLowerCase().includes(search);
      return matchesStage && matchesOwner && matchesSearch;
    });
  }, [opportunitiesList, searchTerm, stageFilter, ownerFilter, companiesList]);

  const summary = useMemo(() => {
    return {
      total: opportunitiesList.length,
      value: opportunitiesList.reduce((sum, opp) => sum + Number(opp.amount || 0), 0),
      won: opportunitiesList.filter(o => o.stage === 'WON' || o.stage === 'Won').length,
    };
  }, [opportunitiesList]);

  if (loading && opportunitiesList.length === 0) {
    return <div className="text-slate-400 p-8 text-center font-semibold animate-pulse">Loading opportunities...</div>;
  }

  // Find active pipeline stage object to see if type is 'LOST'
  const activePipelineStageObj = drawerStages.find(s => String(s.id) === String(drawerForm.pipeline_stage));
  const isLostStageActive = activePipelineStageObj?.stage_type === 'LOST' || String(activePipelineStageObj?.name).toUpperCase() === 'LOST';

  return (
    <div className="lf-page leads-page opportunities-page">
      <section className="lf-table-card sales-table-card">
        
        {/* SUMMARY STRIP */}
        <section className="crm-summary-strip contact-summary-strip" aria-label="Opportunities summary">
          <article>
            <span>Total Opportunities</span>
            <strong>{summary.total}</strong>
          </article>
          <article>
            <span>Pipeline Value</span>
            <strong className="contact-summary-blue">{formatCurrency(summary.value)}</strong>
          </article>
          <article>
            <span>Won / Closed</span>
            <strong className="contact-summary-green">{summary.won}</strong>
          </article>
        </section>

        {/* FILTERS */}
        <section className="page-panel-filters lf-filter-bar" aria-label="Opportunities filters">
          <label className="role-search-field" style={{ flex: 1, maxWidth: '280px' }}>
            <Search size={15} />
            <input
              type="search"
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>

          <label className="lf-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="All">All Stages</option>
              {stagesList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.stage_type})</option>
              ))}
            </select>
          </label>

          <label className="lf-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Owner:</span>
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="All">All Owners</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
              ))}
            </select>
          </label>
        </section>

        {/* OPPORTUNITIES TABLE */}
        <div className="lf-table-scroll" style={{ marginTop: '16px' }}>
          <table className="lf-leads-table">
            <thead>
              <tr>
                <th className="lf-sr-col">#</th>
                <th>Opportunity ID</th>
                <th>Name</th>
                <th>Related Company</th>
                <th>Deal Amount</th>
                <th>Close Date</th>
                <th>Stage</th>
                <th>Probability</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.length > 0 ? (
                filteredOpportunities.map((opp, index) => (
                  <tr key={opp.id} className="clickable-row" onClick={() => handleCardClick(opp)}>
                    <td className="lf-sr-col">{index + 1}</td>
                    <td>{opp.id}</td>
                    <td><strong>{opp.name}</strong></td>
                    <td>{getCompanyName(opp.company || opp.company_id)}</td>
                    <td>{formatCurrency(opp.amount || 0)}</td>
                    <td>{opp.expected_close_date ? String(opp.expected_close_date).slice(0, 10) : '-'}</td>
                    <td>
                      <span className="lf-badge contact-opportunity-stage">
                        {opp.stage || 'New'}
                      </span>
                    </td>
                    <td>{opp.probability != null ? `${opp.probability}%` : '50%'}</td>
                    <td>{getOwnerName(opp.assigned_salesperson || opp.assigned_salesperson_id)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="payment-empty-table text-center py-8">
                    No opportunities found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* OPPORTUNITY DETAILS SIDE DRAWER */}
      {activeDrawerCard && (
        <div className="crm-sb-drawer-container">
          <button
            className="account-drawer-backdrop"
            type="button"
            aria-label="Close details drawer"
            onClick={() => { setActiveDrawerCard(null); setDrawerMode(null); }}
          />
          <section className="crm-sb-drawer" role="dialog" aria-modal="true">
            <header className="crm-sb-drawer-header">
              <h2>Opportunity Details</h2>
              <button
                type="button"
                aria-label="Close details drawer"
                onClick={() => { setActiveDrawerCard(null); setDrawerMode(null); }}
              >
                <X size={20} />
              </button>
            </header>
            
            <div className="crm-sb-drawer-body">
              {drawerMode === 'view' ? (
                <OpportunityDrawerDetailView
                  opp={activeDrawerCard}
                  pipelinesList={pipelinesList}
                  drawerStages={drawerStages}
                  customFormFields={customFormFields}
                  getCompanyName={getCompanyName}
                  getOwnerName={getOwnerName}
                  canEdit={canEdit}
                  onEditClick={() => setDrawerMode('edit')}
                  onConvertToSubscription={handleOpenConversionModal}
                  onToast={setMessage}
                />
              ) : (
                <form className="crm-sb-drawer-edit-form" onSubmit={saveOpportunityDrawer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label className="lf-field">
                    <span>Opportunity Name*</span>
                    <input
                      type="text"
                      required
                      value={drawerForm.name}
                      onChange={(e) => setDrawerForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </label>

                  <label className="lf-field">
                    <span>Related Company</span>
                    <select
                      value={drawerForm.company}
                      onChange={(e) => setDrawerForm(prev => ({ ...prev, company: e.target.value }))}
                    >
                      <option value="">None</option>
                      {companiesList.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="lf-field">
                    <span>Deal Amount ($)</span>
                    <input
                      type="number"
                      required
                      value={drawerForm.amount}
                      onChange={(e) => setDrawerForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </label>

                  <label className="lf-field">
                    <span>Expected Close Date</span>
                    <input
                      type="date"
                      value={drawerForm.expected_close_date}
                      onChange={(e) => setDrawerForm(prev => ({ ...prev, expected_close_date: e.target.value }))}
                    />
                  </label>

                  <label className="lf-field">
                    <span>Pipeline</span>
                    <select
                      value={drawerForm.pipeline}
                      onChange={(e) => handlePipelineChangeInDrawer(e.target.value)}
                    >
                      {pipelinesList.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="lf-field">
                    <span>Stage</span>
                    <select
                      value={drawerForm.pipeline_stage}
                      onChange={(e) => setDrawerForm(prev => ({ ...prev, pipeline_stage: e.target.value }))}
                    >
                      <option value="">Select Stage</option>
                      {drawerStages.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.stage_type})</option>
                      ))}
                    </select>
                  </label>

                  <label className="lf-field">
                    <span>Assigned Salesperson</span>
                    <select
                      value={drawerForm.assigned_salesperson}
                      onChange={(e) => setDrawerForm(prev => ({ ...prev, assigned_salesperson: e.target.value }))}
                      disabled={!hasAssignAll}
                    >
                      {hasAssignAll && <option value="">Unassigned</option>}
                      {displayUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                      ))}
                    </select>
                  </label>

                  {isLostStageActive && (
                    <label className="lf-field">
                      <span>Lost Reason*</span>
                      <textarea
                        required
                        placeholder="Why was this deal lost?"
                        value={drawerForm.lost_reason}
                        onChange={(e) => setDrawerForm(prev => ({ ...prev, lost_reason: e.target.value }))}
                        style={{ height: '80px' }}
                      />
                    </label>
                  )}

                  <label className="lf-field">
                    <span>Notes / Description</span>
                    <textarea
                      placeholder="Add deal details..."
                      value={drawerForm.notes}
                      onChange={(e) => setDrawerForm(prev => ({ ...prev, notes: e.target.value }))}
                      style={{ height: '80px' }}
                    />
                  </label>

                  {/* Dynamic Custom Form Fields */}
                  {customFormFields.map(f => {
                    const val = drawerForm.custom_values?.[f.label] ?? '';
                    const setVal = (newVal) => {
                      setDrawerForm(prev => ({
                        ...prev,
                        custom_values: {
                          ...prev.custom_values,
                          [f.label]: newVal
                        }
                      }));
                    };

                    if (f.field_type === 'TEXTAREA') {
                      return (
                        <label className="lf-field" key={f.label}>
                          <span>{f.label}{f.required ? '*' : ''}</span>
                          <textarea
                            required={f.required}
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                            style={{ height: '80px' }}
                          />
                        </label>
                      );
                    } else if (f.field_type === 'NUMBER') {
                      return (
                        <label className="lf-field" key={f.label}>
                          <span>{f.label}{f.required ? '*' : ''}</span>
                          <input
                            type="number"
                            required={f.required}
                            value={val}
                            onChange={(e) => setVal(e.target.value !== '' ? Number(e.target.value) : '')}
                          />
                        </label>
                      );
                    } else if (f.field_type === 'DATE') {
                      return (
                        <label className="lf-field" key={f.label}>
                          <span>{f.label}{f.required ? '*' : ''}</span>
                          <input
                            type="date"
                            required={f.required}
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                          />
                        </label>
                      );
                    } else if (f.field_type === 'DROPDOWN') {
                      return (
                        <label className="lf-field" key={f.label}>
                          <span>{f.label}{f.required ? '*' : ''}</span>
                          <select
                            required={f.required}
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                          >
                            <option value="">Select option</option>
                            {(f.options || []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </label>
                      );
                    } else if (f.field_type === 'CHECKBOX') {
                      return (
                        <label className="lf-field" key={f.label} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => setVal(e.target.checked)}
                          />
                          <span>{f.label}</span>
                        </label>
                      );
                    } else {
                      return (
                        <label className="lf-field" key={f.label}>
                          <span>{f.label}{f.required ? '*' : ''}</span>
                          <input
                            type="text"
                            required={f.required}
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                          />
                        </label>
                      );
                    }
                  })}

                  <div className="lf-modal-actions" style={{ marginTop: '12px' }}>
                    <button type="button" onClick={() => setDrawerMode('view')} disabled={savingDrawer}>Cancel</button>
                    <button type="submit" className="primary" disabled={savingDrawer}>
                      {savingDrawer ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      )}

      {/* PHASE 15: CONVERT TO SUBSCRIPTION MODAL */}
      {conversionModalOpen && conversionOpp && (
        <div
          className="crm-sb-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 20000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeConversionModal();
            }
          }}
        >
          <div
            className="crm-sb-modal"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '520px',
              width: '92%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              zIndex: 20001,
              position: 'relative',
            }}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>Convert to Standalone Subscription</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Opportunity #{conversionOpp.id} • {conversionOpp.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeConversionModal}
                disabled={converting}
                aria-label="Close conversion modal"
                style={{ background: 'none', border: 'none', cursor: converting ? 'not-allowed' : 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmConversion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label className="lf-field">
                <span>Catalog Pricing Plan*</span>
                <select
                  required
                  disabled={loadingPlans || converting}
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {loadingPlans ? (
                    <option value="">Loading active catalog plans...</option>
                  ) : availablePlans.length > 0 ? (
                    availablePlans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ${Number(p.price || 0).toFixed(2)} / {p.billing_cycle || 'month'}
                      </option>
                    ))
                  ) : (
                    <option value="">No active catalog plans found</option>
                  )}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label className="lf-field">
                  <span>Start Date</span>
                  <input
                    type="date"
                    required
                    disabled={converting}
                    value={conversionStartDate}
                    onChange={(e) => setConversionStartDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </label>

                <label className="lf-field">
                  <span>Plan Quantity</span>
                  <input
                    type="number"
                    min="1"
                    required
                    disabled={converting}
                    value={planQuantity}
                    onChange={(e) => setPlanQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label className="lf-field">
                  <span>Collection Method</span>
                  <select
                    disabled={converting}
                    value={collectionMethod}
                    onChange={(e) => setCollectionMethod(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="CHARGE_AUTOMATIC">Charge Automatic</option>
                    <option value="SEND_INVOICE">Send Invoice</option>
                  </select>
                </label>

                <label className="lf-field">
                  <span>Payment Terms (Days)</span>
                  <input
                    type="number"
                    min="0"
                    disabled={converting}
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </label>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                <p style={{ margin: 0 }}>
                  ⚡ <strong>Standalone Billing Authority:</strong> Provisioning will resolve/create the Billing Customer, attach the commercial subscription, activate entitlements, and record an immutable audit trail.
                </p>
              </div>

              <div className="lf-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={closeConversionModal}
                  disabled={converting}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: converting ? 'not-allowed' : 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting || loadingPlans || !selectedPlanId}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: '#059669',
                    color: '#fff',
                    border: 'none',
                    fontWeight: '600',
                    cursor: converting || loadingPlans || !selectedPlanId ? 'not-allowed' : 'pointer',
                    opacity: converting || loadingPlans || !selectedPlanId ? 0.6 : 1,
                  }}
                >
                  {converting ? 'Provisioning...' : (loadingPlans ? 'Loading Plans...' : 'Confirm & Provision')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function OpportunityDrawerDetailView({
  opp,
  pipelinesList,
  drawerStages,
  customFormFields,
  getCompanyName,
  getOwnerName,
  canEdit,
  onEditClick,
  onConvertToSubscription,
}) {
  if (!opp) return null;

  // Initials
  const initials = useMemo(() => {
    const name = (opp.name || 'Opportunity').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'OP';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [opp.name]);

  const pipelineName = pipelinesList.find(p => String(p.id) === String(opp.pipeline))?.name || 'Standard Pipeline';
  const companyName = getCompanyName(opp.company || opp.company_id);
  const ownerName = getOwnerName(opp.assigned_salesperson || opp.assigned_salesperson_id);

  const amountVal = Number(opp.amount || opp.value || 0);
  const probabilityVal = opp.probability != null ? Number(opp.probability) : 50;
  const expectedRevVal = opp.expected_revenue != null ? Number(opp.expected_revenue) : Math.round(amountVal * (probabilityVal / 100));

  // Outcome status flags
  const stageUpper = String(opp.stage || opp.pipeline_stage_name || '').toUpperCase().replace(/[\s_-]+/g, '');
  const isWon = opp.won || stageUpper === 'WON' || stageUpper === 'CLOSEDWON';
  const isLost = Boolean(opp.lost_reason) || stageUpper === 'LOST' || stageUpper === 'CLOSEDLOST';

  const hasSubscription = Boolean(
    opp.custom_values?.billing_subscription_id ||
    opp.custom_values?.billing_subscription_number
  );

  const getStageBadgeStyle = () => {
    if (isWon) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (isLost) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const getPriorityBadgeStyle = (priorityStr) => {
    const p = String(priorityStr || '').toLowerCase();
    if (p === 'high') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (p === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const customFieldKeys = opp.custom_values ? Object.keys(opp.custom_values) : [];
  const hasCustomFields = (customFormFields && customFormFields.length > 0) || customFieldKeys.length > 0;

  return (
    <div className="crm-sb-drawer-view lead-details-redesign">
      {/* ── HERO HEADER ── */}
      <header className="lead-drawer-hero">
        <div className="lead-hero-left">
          <div className="lead-avatar-circle opp-avatar-gradient">
            <span>{initials}</span>
          </div>

          <div className="lead-hero-title-block">
            <div className="lead-hero-title-row">
              <h2>{opp.name}</h2>
              <span className={`lead-status-pill ${getStageBadgeStyle()}`}>
                {isWon ? 'Closed Won' : (isLost ? 'Closed Lost' : (opp.stage || 'Active'))}
              </span>
              <span className={`lead-priority-pill ${getPriorityBadgeStyle(opp.priority)}`}>
                {opp.priority || 'Medium'} Priority
              </span>
              <span className="lead-code-pill">
                {opp.opportunity_code || opp.id}
              </span>
            </div>

            <p className="lead-hero-subtitle">
              {companyName !== 'None' ? (
                <>
                  <Building2 size={14} className="inline-icon mr-1" />
                  <strong>{companyName}</strong>
                  <span className="mx-2">•</span>
                </>
              ) : null}
              {pipelineName}
            </p>
          </div>
        </div>

        <div className="lead-record-actions">
          {canEdit && (
            <button type="button" className="payment-record-edit" onClick={onEditClick}>
              <Edit3 size={15} /> Edit Details
            </button>
          )}
        </div>
      </header>

      {/* ── DEAL METRICS SUMMARY STRIP ── */}
      <section className="payment-record-summary lead-redesign-summary" aria-label="Deal summary metrics">
        <div>
          <span>Deal Amount</span>
          <strong className="text-indigo-600">${amountVal.toLocaleString()}</strong>
        </div>
        <div>
          <span>Win Probability</span>
          <strong>{probabilityVal}%</strong>
        </div>
        <div>
          <span>Expected Revenue</span>
          <strong className="text-emerald-600">${expectedRevVal.toLocaleString()}</strong>
        </div>
        <div>
          <span>Expected Close</span>
          <strong>{opp.expected_close_date ? String(opp.expected_close_date).slice(0, 10) : '-'}</strong>
        </div>
      </section>

      {/* ── TERMINAL OUTCOME & BILLING INTEGRATION CALLOUT ── */}
      {isWon && (
        <div className="p-4 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col gap-3" style={{ padding: '16px', marginBottom: '16px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={24} style={{ color: '#059669', flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#065f46' }}>Closed Won Opportunity</h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#047857' }}>
                  Deal won! Total value of ${amountVal.toLocaleString()} is ready for Standalone Billing provisioning.
                </p>
              </div>
            </div>

            {hasSubscription ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
                <PackageCheck size={15} /> Subscription Active (#{opp.custom_values?.billing_subscription_number || opp.custom_values?.billing_subscription_id})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onConvertToSubscription?.(opp)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#059669', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              >
                <CreditCard size={15} /> Convert to Subscription
              </button>
            )}
          </div>

          {hasSubscription && (
            <div style={{ fontSize: '12px', color: '#065f46', backgroundColor: 'rgba(255, 255, 255, 0.75)', padding: '8px 12px', borderRadius: '6px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span>Agreement: <strong>{opp.custom_values?.billing_subscription_number || `SUB #${opp.custom_values?.billing_subscription_id}`}</strong></span>
              <span>Billing Customer: <strong>{opp.custom_values?.billing_customer_number || `CUST #${opp.custom_values?.billing_customer_id}`}</strong></span>
            </div>
          )}
        </div>
      )}

      {isLost && (
        <div className="p-4 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3" style={{ padding: '16px', marginBottom: '16px', borderRadius: '8px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3' }}>
          <AlertCircle size={24} style={{ color: '#e11d48', flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#9f1239' }}>Closed Lost Opportunity</h4>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#be123c' }}>
              {opp.lost_reason ? `Reason: "${opp.lost_reason}"` : 'This deal was marked closed lost.'}
            </p>
          </div>
        </div>
      )}

      {/* ── DETAILED ATTRIBUTES GRID ── */}
      <div className="lead-overview-cards-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Financial & Deal Parameters Card */}
        <section className="lead-card-box">
          <header className="lead-card-box-head">
            <DollarSign size={16} /> <h3>Deal Parameters</h3>
          </header>
          <dl className="lead-details-dl">
            <div><dt>Opportunity Name</dt><dd>{opp.name}</dd></div>
            <div><dt>Deal Amount</dt><dd><strong>${amountVal.toLocaleString()}</strong></dd></div>
            <div><dt>Win Probability</dt><dd>{probabilityVal}%</dd></div>
            <div><dt>Expected Revenue</dt><dd><strong>${expectedRevVal.toLocaleString()}</strong></dd></div>
            <div><dt>Priority Level</dt><dd>{opp.priority || 'Medium'}</dd></div>
            <div><dt>Lead Source</dt><dd>{opp.lead_source || opp.leadSource || 'Lead Conversion'}</dd></div>
            <div><dt>Assigned Salesperson</dt><dd><strong>{ownerName}</strong></dd></div>
          </dl>
        </section>

        {/* Corporate & Account Details Card */}
        <section className="lead-card-box">
          <header className="lead-card-box-head">
            <Building2 size={16} /> <h3>Account & Pipeline</h3>
          </header>
          <dl className="lead-details-dl">
            <div><dt>Related Company</dt><dd>{companyName}</dd></div>
            <div><dt>Pipeline</dt><dd>{pipelineName}</dd></div>
            <div><dt>Current Stage</dt><dd><strong>{opp.stage || 'Active'}</strong></dd></div>
            <div><dt>Expected Close Date</dt><dd>{opp.expected_close_date ? String(opp.expected_close_date).slice(0, 10) : '-'}</dd></div>
            <div><dt>Created Date</dt><dd>{opp.created_at ? String(opp.created_at).slice(0, 10) : (opp.createdDate || '-')}</dd></div>
            <div><dt>Organization</dt><dd>{opp.organization || '-'}</dd></div>
          </dl>
        </section>

        {/* Custom Conversion Attributes Card (if dynamic custom values exist) */}
        {hasCustomFields && (
          <section className="lead-card-box full-width">
            <header className="lead-card-box-head">
              <Sparkles size={16} /> <h3>Custom Conversion Attributes</h3>
            </header>
            <dl className="lead-details-dl">
              {customFormFields && customFormFields.length > 0 ? (
                customFormFields.map(f => {
                  const val = opp.custom_values?.[f.label];
                  return (
                    <div key={f.label}>
                      <dt>{f.label}</dt>
                      <dd>{val !== undefined && val !== null && val !== '' ? String(val) : '-'}</dd>
                    </div>
                  );
                })
              ) : (
                customFieldKeys.map(k => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{String(opp.custom_values[k])}</dd>
                  </div>
                ))
              )}
            </dl>
          </section>
        )}

        {/* Description / Notes Card */}
        {(opp.notes || opp.description) && (
          <section className="lead-card-box full-width">
            <header className="lead-card-box-head">
              <FileText size={16} /> <h3>Notes & Description</h3>
            </header>
            <p className="text-sm text-slate-700 leading-relaxed margin-0">{opp.notes || opp.description}</p>
          </section>
        )}
      </div>
    </div>
  );
}
