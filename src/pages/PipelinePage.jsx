import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Edit, FileCog, FileText, Filter, Lock, MoreHorizontal, Pin, Plus, Settings, Trash2, Users } from 'lucide-react';
import { Confirm, DetailBlock, DetailGrid, HighlightedText, IconButton, Modal, PanelActions, SearchableSelect, SearchBox, SelectField, TextField, TextArea } from '../components/ui';
import { assignLeadOptions, companies, emptyLead, leadSources, owners, priorities, products, stages } from '../data/crmData';
import { formatCurrency } from '../utils/format';
import CompaniesPage from './CompaniesPage';
import ContactsPage from './ContactsPage';
import { authRequest, apiGet } from '../App';
import { leadBackendToUi, opportunityBackendToUi, normalizeLabel, mapStageNameToBackendStage } from '../utils/adapters';

const standardStageDescriptions = {
  New: 'Initial contact pending',
  Contacted: 'Outreach initiated',
  Confirm: 'Requirements gathered',
  Proposal: 'Quote delivered to client',
  Negotiation: 'Finalizing terms',
  Won: 'Deal closed successfully',
  Lost: 'Deal lost or abandoned',
};

const customFieldTypes = ['Short Text', 'Long Text', 'Number', 'Date', 'Checkbox', 'Dropdown'];

const getCustomFieldInputType = (type) => (
  type === 'Date' ? 'date' : type === 'Number' ? 'number' : 'text'
);

const normalizeCustomFieldType = (type) => (type === 'Text' ? 'Short Text' : type);

const getResponseList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.success && Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.results)) return res.data.results;
  if (Array.isArray(res.results)) return res.results;
  return [];
};

const getResponseObject = (res) => {
  if (!res) return null;
  if (res.success && res.data) return res.data;
  if (res.success === true) {
    const { success, message, ...rest } = res;
    return Object.keys(rest).length ? rest : res;
  }
  return res;
};

const isResponseSuccess = (res) => {
  if (!res) return false;
  if (res.success === true) return true;
  return true;
};

export default function PipelinePage({
  currentUser,
  leads,
  setLeads,
  opportunities,
  setOpportunities,
  setMessage,
  dynamicStagePage,
  setDynamicStagePage,
  activeStagePage,
  setActiveStagePage,
  opportunityStageConfig,
  setOpportunityStageConfig,
  canCreate = true,
  canEdit = true,
  canDelete = true
}) {
  const [activePipelineId, setActivePipelineId] = useState(null);
  const [pipelinesList, setPipelinesList] = useState([]);
  const [stageList, setStageList] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ stage: 'All', owner: 'All', company: 'All', priority: 'All', product: 'All' });
  const [dragged, setDragged] = useState(null);
  const [draggedLead, setDraggedLead] = useState(null);
  const [draggedStageId, setDraggedStageId] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageForm, setStageForm] = useState({ name: '', owner: '' });
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false);
  const [opportunityForm, setOpportunityForm] = useState({
    dealName: '',
    company: '',
    contact: '',
    value: '',
    closeDate: '',
    stage: 'New',
    owner: '',
    notes: '',
  });
  const [editingStage, setEditingStage] = useState(null);
  const [deleteStage, setDeleteStage] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showStages, setShowStages] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState(null);
  const [editingOpportunityId, setEditingOpportunityId] = useState(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(emptyLead);
  const [opportunityErrors, setOpportunityErrors] = useState([]);
  const [duplicateLeadId, setDuplicateLeadId] = useState(null);
  const [stagePrompt, setStagePrompt] = useState(null);
  const [stageFormChoice, setStageFormChoice] = useState(null);
  const [customBuilderStage, setCustomBuilderStage] = useState(null);
  const [standardPreviewStage, setStandardPreviewStage] = useState(null);
  const [fieldDraft, setFieldDraft] = useState({ label: '', type: 'Short Text', required: 'Yes' });
  const [editingFieldId, setEditingFieldId] = useState('');
  const [customDrop, setCustomDrop] = useState(null);
  const [customValues, setCustomValues] = useState({});
  const [customErrors, setCustomErrors] = useState([]);
  const [customBuilderError, setCustomBuilderError] = useState('');
  const [openRecordActionId, setOpenRecordActionId] = useState('');
  const [pipelineSettingsOpen, setPipelineSettingsOpen] = useState(false);
  const [pipelineSettingsStep, setPipelineSettingsStep] = useState('choose');
  const [activePipeline, setActivePipeline] = useState({ type: 'standard', name: 'Standard Pipeline' });
  const [savedCustomPipeline, setSavedCustomPipeline] = useState(null);
  const [customStageActionsOpen, setCustomStageActionsOpen] = useState(false);
  const [renamePipelineOpen, setRenamePipelineOpen] = useState(false);
  const [pipelineNameDraft, setPipelineNameDraft] = useState('');
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineStages, setNewPipelineStages] = useState([{ id: 'custom-stage-1', name: '', color: '#6c757d' }]);
  const [originalStages, setOriginalStages] = useState([]);
  const [isCreatingNewPipeline, setIsCreatingNewPipeline] = useState(false);
  const [wizardConversionStageIdx, setWizardConversionStageIdx] = useState(null);
  const [wizardHasWon, setWizardHasWon] = useState(true);
  const [wizardWonStageIdx, setWizardWonStageIdx] = useState(null);
  const [wizardHasLost, setWizardHasLost] = useState(true);
  const [wizardLostStageIdx, setWizardLostStageIdx] = useState(null);
  const [wizardEnableForm, setWizardEnableForm] = useState(false);
  const [wizardFormFields, setWizardFormFields] = useState([]);
  const [newFieldDraft, setNewFieldDraft] = useState({ label: '', type: 'TEXT', required: false, options: '' });
  const [wizardSaveLogs, setWizardSaveLogs] = useState([]);
  const [wizardSaving, setWizardSaving] = useState(false);

  const [activeDrawerCard, setActiveDrawerCard] = useState(null);
  const [drawerMode, setDrawerMode] = useState(null);

  const canAssignToOthers = (resource) => {
    if (!currentUser) return false;
    if (currentUser.is_staff || currentUser.is_superuser) return true;
    if (currentUser.user_type === 'ADMIN') return true;
    const scope = currentUser.permissions?.[resource]?.ASSIGN;
    return scope === 'ALL';
  };

  const isCardEditable = (record, type) => {
    if (!currentUser) return false;
    if (currentUser.is_staff || currentUser.is_superuser) return true;
    if (currentUser.user_type === 'ADMIN') return true;
    if (currentUser.role === 'Administrator' || currentUser.role === 'Manager' || currentUser.role === 'Salesperson Manager') return true;
    return record.owner === currentUser.id;
  };
  const [drawerForm, setDrawerForm] = useState({});
  const [drawerStages, setDrawerStages] = useState([]);
  const [conversionModalOpen, setConversionModalOpen] = useState(false);
  const [isCustomFormActive, setIsCustomFormActive] = useState(false);
  const [convertingLeadStageId, setConvertingLeadStageId] = useState(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignStageId, setReassignStageId] = useState('');

  const opportunityStageId = opportunityStageConfig.id;
  const opportunityStageMode = opportunityStageConfig.mode;
  const customFields = opportunityStageConfig.fields;
  const stageRecords = opportunityStageConfig.records;
  const setOpportunityStageId = (id) => setOpportunityStageConfig((current) => ({ ...current, id }));
  const setOpportunityStageMode = (mode) => setOpportunityStageConfig((current) => ({ ...current, mode }));
  const setCustomFields = (nextFields) => setOpportunityStageConfig((current) => ({
    ...current,
    fields: typeof nextFields === 'function' ? nextFields(current.fields) : nextFields,
  }));
  const setStageRecords = (nextRecords) => setOpportunityStageConfig((current) => ({
    ...current,
    records: typeof nextRecords === 'function' ? nextRecords(current.records) : nextRecords,
  }));

  const opportunityFieldLabels = {
    company: 'Related Company',
    contact: 'Primary Contact',
    value: 'Deal Amount',
    closeDate: 'Expected Close Date',
    stage: 'Stage',
    owner: 'Assigned Salesperson',
  };
  const opportunityStageColumns = [
    ['opportunityId', 'Opportunity ID', 'link-cell'],
    ['date', 'Date'],
    ['dealName', 'Deal Name'],
    ['company', 'Company'],
    ['contact', 'Contact'],
    ['amount', 'Deal Amount'],
    ['closeDate', 'Expected Close Date'],
    ['stage', 'Stage'],
    ['owner', 'Assigned Salesperson'],
  ];
  const opportunityStageFormFields = [
    { key: 'dealName', label: 'Deal Name' },
    { key: 'company', label: 'Company' },
    { key: 'contact', label: 'Contact' },
    { key: 'amount', label: 'Deal Amount', type: 'number' },
    { key: 'closeDate', label: 'Expected Close Date', type: 'date' },
    { key: 'stage', label: 'Stage', kind: 'select', options: stageList.map((stage) => stage.name) },
    { key: 'owner', label: 'Assigned Salesperson', kind: 'select', options: availableUsers.map((u) => u.full_name || u.username) },
    { key: 'description', label: 'Description' },
  ];
  const opportunityStageDetailFields = [
    { key: 'opportunityId', label: 'Opportunity ID' },
    { key: 'dealName', label: 'Deal Name' },
    { key: 'company', label: 'Company' },
    { key: 'contact', label: 'Contact' },
    { key: 'amount', label: 'Deal Amount' },
    { key: 'closeDate', label: 'Expected Close Date' },
    { key: 'stage', label: 'Stage' },
    { key: 'owner', label: 'Assigned Salesperson' },
    { key: 'description', label: 'Description' },
  ];

  // Helper: translate owner IDs to names
  const getOwnerName = (ownerId) => {
    if (!ownerId) return 'Unassigned';
    const found = availableUsers.find(u => String(u.id) === String(ownerId));
    return found ? (found.full_name || found.username) : `User ${ownerId}`;
  };

  const fetchUsers = async () => {
    try {
      const res = await apiGet('/api/admin/users/');
      const data = getResponseList(res);
      if (data) {
        setAvailableUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStages = async (pipelineId) => {
    try {
      const path = pipelineId ? `/api/pipeline/stages/?pipeline=${pipelineId}` : '/api/pipeline/stages/';
      const res = await apiGet(path);
      const data = getResponseList(res);
      if (data) {
        const mapped = data.map((stage) => ({
          id: stage.id,
          name: normalizeLabel(stage.name),
          owner: 'System',
          stage_type: stage.stage_type,
          entity_type: stage.entity_type,
          order: stage.order,
          role: stage.stage_type === 'WON' ? 'won' : stage.stage_type === 'LOST' ? 'lost' : undefined,
        }));
        mapped.sort((a, b) => a.order - b.order);
        setStageList(mapped);
        return mapped;
      }
    } catch (err) {
      console.error(err);
    }
    return [];
  };

  const fetchAllLeadsAndOpportunities = async () => {
    if (!activePipelineId) return;
    try {
      const res = await apiGet(`/api/pipeline/?pipeline=${activePipelineId}`);
      const cards = getResponseList(res);
      
      const parsedLeads = [];
      const parsedOpps = [];
      
      cards.forEach(card => {
        if (card.entity_type === 'lead') {
          parsedLeads.push({
            id: `LD-${card.id}`,
            backendId: card.id,
            clientId: `LD-${card.id}`,
            customer: card.name || 'Unnamed Lead',
            company: card.company_name || '',
            phone: card.phone || '',
            email: card.email || '',
            source: 'Website',
            owner: card.assigned_salesperson_id || '',
            priority: 'Medium',
            status: normalizeLabel(card.stage) || 'New',
            leadValue: Number(card.amount || 0),
            estimatedValue: Number(card.amount || 0),
            notes: card.notes || '',
            pipeline: activePipelineId,
            pipeline_stage: card.pipeline_stage_id || '',
            is_converted: false
          });
        } else {
          parsedOpps.push({
            id: `OP-${card.id}`,
            backendId: card.id,
            name: card.name || 'Unnamed Opportunity',
            company: card.company_name || '',
            companyId: card.company_id || null,
            contact: '',
            value: Number(card.amount || 0),
            priority: 'Medium',
            closeDate: card.expected_close_date ? String(card.expected_close_date).slice(0, 10) : '',
            owner: card.assigned_salesperson_id || '',
            stage: normalizeLabel(card.stage) || 'New',
            product: 'CRM Suite',
            notes: card.notes || '',
            pipeline: activePipelineId,
            pipeline_stage: card.pipeline_stage_id || '',
            won: card.stage === 'WON' || card.stage === 'Won',
            closed: card.stage === 'WON' || card.stage === 'LOST' || card.stage === 'Won' || card.stage === 'Lost',
            probability: card.probability !== undefined && card.probability !== null ? Number(card.probability) : null
          });
        }
      });
      
      setLeads(parsedLeads);
      setOpportunities(parsedOpps);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Failed to fetch pipeline workspace data.');
    }
  };

  const fetchPipelines = async () => {
    try {
      const res = await apiGet('/api/pipelines/');
      const data = getResponseList(res);
      if (data && data.length > 0) {
        setPipelinesList(data);
        const def = data.find(p => p.is_default) || data[0];
        setActivePipelineId(def.id);
        setActivePipeline({ type: def.is_default ? 'standard' : 'custom', name: def.name });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (activePipelineId) {
      fetchStages(activePipelineId);
      fetchAllLeadsAndOpportunities();
    }
  }, [activePipelineId]);

  const updateOpportunityField = (field, value) => {
    setOpportunityForm((current) => ({ ...current, [field]: value }));
    if (String(value).trim()) {
      setOpportunityErrors((current) => current.filter((error) => error !== opportunityFieldLabels[field]));
    }
  };

  const renderCustomDropInput = (field) => {
    const fieldType = field.field_type || field.type;
    const key = field.label;
    const updateValue = (value) => {
      setCustomValues((current) => ({ ...current, [key]: value }));
      setCustomErrors((current) => current.filter((lbl) => lbl !== key));
    };

    if (fieldType === 'TEXTAREA' || fieldType === 'Long Text') {
      return <textarea rows="4" value={customValues[key] || ''} onChange={(event) => updateValue(event.target.value)} />;
    }

    if (fieldType === 'CHECKBOX' || fieldType === 'Checkbox') {
      return (
        <label className="custom-checkbox-field">
          <input type="checkbox" checked={Boolean(customValues[key])} onChange={(event) => updateValue(event.target.checked)} />
          <span>Yes</span>
        </label>
      );
    }

    if (fieldType === 'DROPDOWN' || fieldType === 'Dropdown') {
      const opts = field.options || [];
      return (
        <select value={customValues[key] || ''} onChange={(event) => updateValue(event.target.value)}>
          <option value="">Select option</option>
          {opts.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    const inputType = fieldType === 'DATE' || fieldType === 'Date' ? 'date' : fieldType === 'NUMBER' || fieldType === 'Number' ? 'number' : 'text';
    return <input type={inputType} value={customValues[key] || ''} onChange={(event) => updateValue(event.target.value)} />;
  };

  const filtered = useMemo(() => opportunities
    .filter((item) => [item.id, item.name, item.company, item.contact, item.stage]
      .some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())))
    .filter((item) => filters.stage === 'All' || item.stage === filters.stage)
    .filter((item) => {
      if (filters.owner === 'All') return true;
      return getOwnerName(item.owner) === filters.owner;
    }), [opportunities, search, filters, availableUsers]);

  const stageLeads = useMemo(() => leads
    .filter((lead) => !lead.isConverted)
    .filter((lead) => [lead.clientId, lead.customer, lead.company, lead.phone, lead.email, lead.status]
      .some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())))
    .filter((lead) => {
      if (filters.owner === 'All') return true;
      return getOwnerName(lead.owner) === filters.owner;
    }), [leads, search, filters, availableUsers]);

  const totalPipeline = filtered.length + stageLeads.length;
  const openDeals = filtered.filter((item) => !['Won', 'Lost'].includes(item.stage)).length;
  const totalRevenue = filtered
    .filter((item) => item.stage === 'Won')
    .reduce((sum, item) => sum + Number(item.value || 0), 0);
  const expectedRevenue = filtered
    .filter((item) => !['Won', 'Lost'].includes(item.stage))
    .reduce((sum, item) => sum + Number(item.value || 0), 0);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const stageProbability = {
    Prospecting: 10,
    Qualified: 25,
    Demo: 40,
    Proposal: 60,
    Negotiation: 80,
    Won: 100,
  };

  const makeNextOpportunityId = () => {
    return `OP-${Date.now()}`;
  };

  const opportunityId = editingOpportunityId || makeNextOpportunityId();
  const probability = stageProbability[opportunityForm.stage] ?? 10;
  const configuredOpportunityStageName = opportunityStageConfig.name || dynamicStagePage || '';
  const opportunityStage = stageList.find((stage) => stage.id === opportunityStageId || stage.name === configuredOpportunityStageName);
  const opportunityStageName = opportunityStage?.name || '';
  const isConfiguredOpportunityStage = (stageName) => {
    const targetStage = stageList.find((stage) => stage.name === stageName);
    return Boolean(targetStage && (
      targetStage.id === opportunityStageId
      || targetStage.name === opportunityStageName
      || targetStage.name === configuredOpportunityStageName
      || targetStage.name === dynamicStagePage
    ));
  };
  const defaultOpportunityCloseDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 10);
  };
  const makeInitialDealName = (lead) => `${lead.company || lead.customer || 'Lead'} - Initial Opportunity`;

  const openNewLead = () => {
    const defaultLead = { ...emptyLead };
    if (currentUser && !canAssignToOthers('leads')) {
      defaultLead.assignLead = currentUser.id;
    }
    setLeadForm(defaultLead);
    setDuplicateLeadId(null);
    setLeadModalOpen(true);
  };

  const saveLead = async (event) => {
    event.preventDefault();
    if (!leadForm.customer.trim() || !leadForm.phone.trim()) {
      setMessage('Full Name and Phone Number are required.');
      return;
    }
    try {
      const res = await authRequest('/api/leads/', {
        method: 'POST',
        body: JSON.stringify({
          full_name: leadForm.customer.trim(),
          company_name: leadForm.company.trim(),
          phone: leadForm.phone.trim(),
          email: leadForm.email.trim() || null,
          lead_source: leadForm.source ? leadForm.source.toUpperCase().replace(/\s+/g, '_') : 'WEBSITE',
          priority: leadForm.priority ? leadForm.priority.toUpperCase() : 'MEDIUM',
          assigned_salesperson: leadForm.assignLead && leadForm.assignLead !== 'Decide Later' ? Number(leadForm.assignLead) : null,
          notes: leadForm.notes,
          pipeline: activePipelineId,
        })
      });
      if (isResponseSuccess(res)) {
        fetchAllLeadsAndOpportunities();
        setLeadModalOpen(false);
        setMessage('Lead created successfully.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to create lead.');
    }
  };

  const openEditOpportunity = (opportunity) => {
    setOpportunityErrors([]);
    setSelected(null);
    setConvertingLeadId(null);
    setEditingOpportunityId(opportunity.backendId || opportunity.id);
    setOpportunityForm({
      dealName: opportunity.name,
      company: opportunity.company,
      contact: opportunity.contact || opportunity.company,
      value: String(opportunity.value),
      closeDate: opportunity.closeDate,
      stage: opportunity.stage,
      owner: opportunity.owner,
      notes: opportunity.notes || '',
    });
    setOpportunityModalOpen(true);
  };

  const saveOpportunity = async (event) => {
    event.preventDefault();
    const amount = Number(opportunityForm.value);
    const missing = [
      !opportunityForm.dealName.trim() && 'Deal Name',
      Number.isNaN(amount) && 'Deal Amount',
      !opportunityForm.closeDate && 'Expected Close Date',
      !opportunityForm.stage && 'Stage',
      !opportunityForm.owner && 'Assigned Salesperson',
    ].filter(Boolean);
    if (missing.length) {
      setOpportunityErrors(missing);
      return;
    }
    setOpportunityErrors([]);

    const targetStage = stageList.find(s => s.name === opportunityForm.stage);

    if (convertingLeadId) {
      try {
        const res = await authRequest('/api/pipeline/move/', {
          method: 'POST',
          body: JSON.stringify({
            entity_type: 'lead',
            id: convertingLeadId,
            target_stage_id: targetStage?.id,
            opp_data: {
              name: opportunityForm.dealName,
              amount: amount,
              expected_close_date: opportunityForm.closeDate,
              description: opportunityForm.notes
            }
          })
        });
        if (isResponseSuccess(res)) {
          fetchAllLeadsAndOpportunities();
          setOpportunityModalOpen(false);
          setConvertingLeadId(null);
          setMessage('Lead successfully converted to Opportunity.');
        }
      } catch (err) {
        setMessage(err.message || 'Failed to convert lead.');
      }
    } else if (editingOpportunityId) {
      try {
        const res = await authRequest(`/api/opportunities/${editingOpportunityId}/`, {
          method: 'PUT',
          body: JSON.stringify({
            name: opportunityForm.dealName,
            amount: amount,
            expected_close_date: opportunityForm.closeDate,
            description: opportunityForm.notes,
            assigned_salesperson: opportunityForm.owner ? Number(opportunityForm.owner) : null,
            stage: targetStage ? mapStageNameToBackendStage(targetStage.name) : 'QUALIFICATION',
            pipeline_stage: targetStage ? targetStage.id : null,
          })
        });
        if (isResponseSuccess(res)) {
          fetchAllLeadsAndOpportunities();
          setOpportunityModalOpen(false);
          setEditingOpportunityId(null);
          setMessage('Opportunity updated successfully.');
        }
      } catch (err) {
        setMessage(err.message || 'Failed to update opportunity.');
      }
    }
  };

  const openEditStage = (stage) => {
    setEditingStage(stage);
    setStageForm({ name: stage.name, owner: stage.owner || '' });
    setStageModalOpen(true);
  };

  const openCreateManagedStage = () => {
    setEditingStage(null);
    setStageForm({ name: '', owner: availableUsers[0]?.id || '' });
    setStageModalOpen(true);
  };

  const openRenamePipeline = () => {
    setPipelineNameDraft(activePipeline.name);
    setRenamePipelineOpen(true);
  };

  const savePipelineName = async (event) => {
    event.preventDefault();
    const name = pipelineNameDraft.trim();
    if (!name) {
      setMessage('Pipeline name is required.');
      return;
    }
    try {
      const res = await authRequest(`/api/pipelines/${activePipelineId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ name })
      });
      if (isResponseSuccess(res)) {
        setActivePipeline((current) => ({ ...current, name }));
        setRenamePipelineOpen(false);
        setMessage('Pipeline name updated.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to rename pipeline.');
    }
  };

  const setStageAsWon = async (stage) => {
    try {
      const res = await authRequest(`/api/pipeline/stages/${stage.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ stage_type: 'WON' })
      });
      if (isResponseSuccess(res)) {
        fetchStages(activePipelineId);
        fetchAllLeadsAndOpportunities();
        setMessage('Stage set as WON terminal successfully.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to update stage type.');
    }
  };

  const setStageAsLost = async (stage) => {
    try {
      const res = await authRequest(`/api/pipeline/stages/${stage.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ stage_type: 'LOST' })
      });
      if (isResponseSuccess(res)) {
        fetchStages(activePipelineId);
        fetchAllLeadsAndOpportunities();
        setMessage('Stage set as LOST terminal successfully.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to update stage type.');
    }
  };

  const handleStageRowClick = (stage) => {
    if (opportunityStageId && opportunityStageId !== stage.id) {
      setMessage('One opportunity stage already exists. Remove it before selecting another stage.');
      return;
    }
    setStagePrompt(stage);
  };

  const makeStandardOpportunityStage = (stage) => {
    setOpportunityStageConfig((current) => ({
      ...current,
      id: stage.id,
      name: stage.name,
      mode: 'standard',
    }));
    setDynamicStagePage(stage.name);
    setStageFormChoice(null);
    setStandardPreviewStage(null);
  };

  const openStandardPreview = (stage) => {
    setStageFormChoice(null);
    setStandardPreviewStage(stage);
  };

  const addCustomField = () => {
    const label = fieldDraft.label.trim();
    if (!label) {
      setMessage('Field name is required.');
      return;
    }
    if (editingFieldId) {
      setCustomFields((current) => current.map((field) => field.id === editingFieldId ? { ...field, ...fieldDraft, label, type: normalizeCustomFieldType(fieldDraft.type) } : field));
      setEditingFieldId('');
    } else {
      setCustomFields((current) => [...current, { id: `field-${Date.now()}`, ...fieldDraft, label, type: normalizeCustomFieldType(fieldDraft.type) }]);
    }
    setCustomBuilderError('');
    setFieldDraft({ label: '', type: 'Short Text', required: 'Yes' });
  };

  const saveCustomStageForm = () => {
    if (!customBuilderStage) return;
    if (!customFields.length) {
      setCustomBuilderError('Create at least one field for custom form.');
      return;
    }
    setOpportunityStageConfig((current) => ({
      ...current,
      id: customBuilderStage.id,
      name: customBuilderStage.name,
      mode: 'custom',
      fields: customFields,
    }));
    setDynamicStagePage(customBuilderStage.name);
    setCustomBuilderStage(null);
    setCustomBuilderError('');
    setEditingFieldId('');
    setFieldDraft({ label: '', type: 'Short Text', required: 'Yes' });
  };

  const openCustomBuilder = (stage) => {
    setOpportunityStageMode('custom');
    setStageFormChoice(null);
    setCustomBuilderStage(stage);
    setCustomBuilderError('');
    setEditingFieldId('');
    setFieldDraft({ label: '', type: 'Short Text', required: 'Yes' });
  };

  const editCustomField = (field) => {
    setEditingFieldId(field.id);
    setFieldDraft({ label: field.label, type: normalizeCustomFieldType(field.type), required: field.required });
  };

  const deleteCustomField = (fieldId) => {
    setCustomFields((current) => current.filter((field) => field.id !== fieldId));
    if (editingFieldId === fieldId) {
      setEditingFieldId('');
      setFieldDraft({ label: '', type: 'Short Text', required: 'Yes' });
    }
  };

  const submitCustomDrop = async (event) => {
    event.preventDefault();
    const fields = customDrop.fields || [];
    const missing = fields
      .filter((field) => field.required && !String(customValues[field.label] || '').trim())
      .map((field) => field.label);
    if (missing.length) {
      setCustomErrors(missing);
      return;
    }

    const source = customDrop?.lead;
    const dealName = makeInitialDealName(source || {});
    // Find amount and close date in customValues or fall back
    const amountVal = Number(customValues['Amount'] || customValues['Value'] || source?.leadValue || 0);
    const closeDateVal = customValues['Expected Close Date'] || customValues['Close Date'] || defaultOpportunityCloseDate();

    try {
      const res = await authRequest('/api/pipeline/move/', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: 'lead',
          id: source.backendId || source.id,
          target_stage_id: customDrop.stageId,
          opp_data: {
            name: dealName,
            amount: amountVal,
            expected_close_date: closeDateVal,
            description: source.notes || ""
          },
          custom_values: customValues
        })
      });
      if (isResponseSuccess(res)) {
        fetchAllLeadsAndOpportunities();
        setMessage('Lead successfully converted to Opportunity.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to convert lead.');
    }

    setCustomDrop(null);
    setDragged(null);
    setDraggedLead(null);
  };

  const confirmDeleteStage = async () => {
    try {
      const res = await authRequest(`/api/pipeline/stages/${deleteStage.id}/`, {
        method: 'DELETE'
      });
      fetchStages(activePipelineId);
      fetchAllLeadsAndOpportunities();
      setMessage('Stage deleted successfully.');
      setDeleteStage(null);
    } catch (err) {
      if (err.message && err.message.includes("Please provide a reassign_stage_id")) {
        setReassignModalOpen(true);
      } else {
        setMessage(err.message || 'Failed to delete stage. Ensure no active opportunities remain in it.');
        setDeleteStage(null);
      }
    }
  };

  const confirmReassignDelete = async () => {
    if (!reassignStageId) {
      setMessage('Please select a target reassignment stage.');
      return;
    }
    try {
      await authRequest(`/api/pipeline/stages/${deleteStage.id}/`, {
        method: 'DELETE',
        body: JSON.stringify({ reassign_stage_id: Number(reassignStageId) })
      });
      fetchStages(activePipelineId);
      fetchAllLeadsAndOpportunities();
      setMessage('Cards successfully reassigned and stage deleted.');
      setReassignModalOpen(false);
      setDeleteStage(null);
      setReassignStageId('');
    } catch (err) {
      setMessage(err.message || 'Failed to reassign cards and delete stage.');
      setReassignModalOpen(false);
      setDeleteStage(null);
      setReassignStageId('');
    }
  };

  const handleCardClick = async (type, record) => {
    setActiveDrawerCard({ type, record });
    setDrawerMode('view');
    const stages = await fetchStages(record.pipeline || activePipelineId);
    setDrawerStages(stages);
    if (type === 'lead') {
      setDrawerForm({
        customer: record.customer || '',
        company: record.company || '',
        phone: record.phone || '',
        email: record.email || '',
        source: record.source || 'Website',
        priority: record.priority || 'Medium',
        pipeline: record.pipeline || activePipelineId,
        pipeline_stage: record.pipeline_stage || '',
        owner: record.owner || '',
        notes: record.notes || '',
      });
    } else {
      setDrawerForm({
        dealName: record.name || '',
        company: record.company || '',
        contact: record.contact || '',
        value: String(record.value || 0),
        closeDate: record.closeDate || '',
        stage: record.stage || '',
        pipeline: record.pipeline || activePipelineId,
        pipeline_stage: record.pipeline_stage || '',
        owner: record.owner || '',
        notes: record.notes || '',
        lost_reason: record.notes || '',
      });
    }
  };

  const fetchDrawerStages = async (pipelineId) => {
    try {
      const res = await apiGet(`/api/pipeline/stages/?pipeline=${pipelineId}`);
      const data = getResponseList(res);
      if (data) {
        const mapped = data.map((stage) => ({
          id: stage.id,
          name: normalizeLabel(stage.name),
          stage_type: stage.stage_type,
          entity_type: stage.entity_type,
          order: stage.order,
        }));
        mapped.sort((a, b) => a.order - b.order);
        return mapped;
      }
    } catch (err) {
      console.error(err);
    }
    return [];
  };

  const saveLeadDrawer = async (event) => {
    event.preventDefault();
    if (!drawerForm.customer.trim() || !drawerForm.phone.trim()) {
      setMessage('Full Name and Phone Number are required.');
      return;
    }
    const lead = activeDrawerCard.record;
    const targetStage = drawerStages.find(s => s.id === drawerForm.pipeline_stage);

    if (targetStage && targetStage.stage_type === 'CONVERSION') {
      setActiveDrawerCard(null);
      setDrawerMode(null);
      openConversionModal(lead, targetStage.id);
      return;
    }

    try {
      const res = await authRequest(`/api/leads/${lead.backendId || lead.id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: drawerForm.customer.trim(),
          company_name: drawerForm.company.trim(),
          phone: drawerForm.phone.trim(),
          email: drawerForm.email.trim() || null,
          source: drawerForm.source ? drawerForm.source.toUpperCase().replace(/\s+/g, '_') : 'WEBSITE',
          priority: drawerForm.priority ? drawerForm.priority.toUpperCase() : 'MEDIUM',
          notes: drawerForm.notes,
          pipeline: drawerForm.pipeline,
          pipeline_stage: drawerForm.pipeline_stage,
        })
      });
      if (isResponseSuccess(res)) {
        if (drawerForm.owner !== lead.owner) {
          await authRequest(`/api/leads/${lead.backendId || lead.id}/assign/`, {
            method: 'POST',
            body: JSON.stringify({
              assigned_salesperson: drawerForm.owner ? Number(drawerForm.owner) : null
            })
          });
        }
        fetchAllLeadsAndOpportunities();
        setActiveDrawerCard(null);
        setDrawerMode(null);
        setMessage('Lead details updated successfully.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to save lead details.');
    }
  };

  const saveOpportunityDrawer = async (event) => {
    event.preventDefault();
    const amount = Number(drawerForm.value);
    if (!drawerForm.dealName.trim()) {
      setMessage('Opportunity Name is required.');
      return;
    }
    if (Number.isNaN(amount) || amount < 0) {
      setMessage('Deal Amount must be a positive number.');
      return;
    }
    if (!drawerForm.closeDate) {
      setMessage('Expected Close Date is required.');
      return;
    }
    if (!drawerForm.pipeline_stage) {
      setMessage('Stage is required.');
      return;
    }
    const opp = activeDrawerCard.record;
    const targetStage = drawerStages.find(s => s.id === drawerForm.pipeline_stage);
    const isLost = targetStage?.stage_type === 'LOST';


    try {
      const res = await authRequest(`/api/opportunities/${opp.backendId || opp.id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          name: drawerForm.dealName.trim(),
          amount: amount,
          expected_close_date: drawerForm.closeDate,
          description: drawerForm.notes,
          assigned_salesperson: drawerForm.owner ? Number(drawerForm.owner) : null,
          stage: targetStage ? mapStageNameToBackendStage(targetStage.name) : 'QUALIFICATION',
          pipeline: drawerForm.pipeline,
          pipeline_stage: drawerForm.pipeline_stage,
          lost_reason: isLost ? drawerForm.lost_reason.trim() : '',
        })
      });
      if (isResponseSuccess(res)) {
        fetchAllLeadsAndOpportunities();
        setActiveDrawerCard(null);
        setDrawerMode(null);
        setMessage('Opportunity updated successfully.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to save opportunity details.');
    }
  };

  const openConversionModal = async (lead, stageId) => {
    const initialName = makeInitialDealName(lead);
    const initialNotes = lead.notes || '';
    const initialAmount = lead.leadValue ? String(lead.leadValue) : '0.00';
    const initialCloseDate = lead.nextFollowUp || lead.expectedCloseDate || defaultOpportunityCloseDate();

    setOpportunityForm({
      dealName: initialName,
      company: lead.company || '',
      contact: lead.customer || '',
      value: initialAmount,
      closeDate: initialCloseDate,
      stage: stageList.find(s => s.id === stageId)?.name || '',
      owner: lead.owner || '',
      notes: initialNotes,
    });

    setConvertingLeadId(lead.backendId || lead.id);
    setConvertingLeadStageId(stageId);

    try {
      const formRes = await apiGet(`/api/pipelines/${activePipelineId}/form/`);
      const formData = getResponseObject(formRes);
      if (formData && formData.is_active && formData.fields && formData.fields.length > 0) {
        setCustomFields(formData.fields.sort((a, b) => a.order - b.order));
        setIsCustomFormActive(true);
        setCustomValues(formData.fields.reduce((values, field) => ({ ...values, [field.label]: '' }), {}));
      } else {
        setCustomFields([]);
        setIsCustomFormActive(false);
      }
    } catch (err) {
      console.log("No custom form configuration found, converting using standard form fields.");
      setCustomFields([]);
      setIsCustomFormActive(false);
    }

    setConversionModalOpen(true);
  };

  const submitConversion = async (event) => {
    event.preventDefault();
    const amount = Number(opportunityForm.value);
    if (!opportunityForm.dealName.trim()) {
      setMessage('Deal Name is required.');
      return;
    }
    if (Number.isNaN(amount) || amount < 0) {
      setMessage('Deal Amount must be a positive number.');
      return;
    }
    if (!opportunityForm.closeDate) {
      setMessage('Expected Close Date is required.');
      return;
    }

    if (isCustomFormActive && customFields.length > 0) {
      const missing = customFields
        .filter((field) => field.required && !String(customValues[field.label] || '').trim())
        .map((field) => field.label);
      if (missing.length) {
        setCustomErrors(missing);
        setMessage(`Missing required custom fields: ${missing.join(', ')}`);
        return;
      }
    }

    try {
      const targetStage = stageList.find(s => s.name === opportunityForm.stage) || stageList.find(s => s.id === convertingLeadStageId);
      const res = await authRequest('/api/pipeline/move/', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: 'lead',
          id: convertingLeadId,
          target_stage_id: targetStage?.id || convertingLeadStageId,
          opp_data: {
            name: opportunityForm.dealName.trim(),
            amount: amount,
            expected_close_date: opportunityForm.closeDate,
            description: opportunityForm.notes
          },
          custom_values: isCustomFormActive ? customValues : {}
        })
      });
      if (isResponseSuccess(res)) {
        fetchAllLeadsAndOpportunities();
        setConversionModalOpen(false);
        setConvertingLeadId(null);
        setConvertingLeadStageId(null);
        setMessage('Lead successfully converted to Opportunity.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to convert lead.');
    }
  };

  const confirmMove = () => {
    setPendingMove(null);
    setDragged(null);
  };

  const moveStage = async (targetStageId) => {
    if (!draggedStageId || draggedStageId === targetStageId) return;
    const fromIndex = stageList.findIndex((stage) => stage.id === draggedStageId);
    const toIndex = stageList.findIndex((stage) => stage.id === targetStageId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...stageList];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setStageList(next);
    setDraggedStageId(null);
    try {
      await Promise.all(next.map((stage, index) =>
        authRequest(`/api/pipeline/stages/${stage.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ order: index }),
        })
      ));
      setMessage('Pipeline stage order updated.');
      fetchStages(activePipelineId);
      fetchAllLeadsAndOpportunities();
    } catch (err) {
      setMessage(err.message || 'Failed to update pipeline stage order.');
    }
  };

  const openPipelineSettings = () => {
    setPipelineSettingsStep('choose');
    setPipelineSettingsOpen(true);
  };

  const chooseStandardPipeline = async () => {
    try {
      const res = await apiGet('/api/pipelines/');
      const data = getResponseList(res);
      if (data) {
        setPipelinesList(data);
        const def = data.find(p => p.is_default) || data[0];
        if (def) {
          setActivePipelineId(def.id);
          setActivePipeline({ type: 'standard', name: def.name });
          setFilters((current) => ({ ...current, stage: 'All' }));
          setPipelineSettingsOpen(false);
          setMessage('Standard Pipeline selected.');
        }
      }
    } catch (err) {
      setMessage(err.message || 'Failed to load Standard Pipeline.');
    }
  };

  const startNewPipeline = () => {
    setIsCreatingNewPipeline(true);
    setNewPipelineName('');
    setNewPipelineStages([{ id: `custom-${Date.now()}-1`, name: '', color: '#6c757d' }]);
    setPipelineSettingsStep('name');
  };

  const deleteSavedCustomPipeline = async () => {
    if (!activePipelineId) return;
    if (activePipeline.type === 'standard') {
      setMessage('Standard Pipeline cannot be deleted.');
      return;
    }
    try {
      await authRequest(`/api/pipelines/${activePipelineId}/`, { method: 'DELETE' });
      chooseStandardPipeline();
      setMessage('Custom pipeline deleted successfully.');
    } catch (err) {
      setMessage(err.message || 'Failed to delete custom pipeline.');
    }
  };

  const continueNewPipeline = () => {
    if (!newPipelineName.trim()) {
      setMessage('Pipeline name is required.');
      return;
    }
    setPipelineSettingsStep('wizard-stages');
  };

  const addNewPipelineStage = () => {
    setNewPipelineStages((current) => [
      ...current,
      { id: `custom-${Date.now()}-${current.length + 1}`, name: '', color: '#6c757d' },
    ]);
  };

  const updateNewPipelineStage = (id, value) => {
    setNewPipelineStages((current) => current.map((stage) => (
      stage.id === id ? { ...stage, name: value } : stage
    )));
  };

  const removeNewPipelineStage = (id) => {
    setNewPipelineStages((current) => {
      const idx = current.findIndex((stage) => stage.id === id);
      if (idx !== -1) {
        setWizardConversionStageIdx((prev) => {
          if (prev === idx) return null;
          if (prev > idx) return prev - 1;
          return prev;
        });
        setWizardWonStageIdx((prev) => {
          if (prev === idx) return null;
          if (prev > idx) return prev - 1;
          return prev;
        });
        setWizardLostStageIdx((prev) => {
          if (prev === idx) return null;
          if (prev > idx) return prev - 1;
          return prev;
        });
      }
      return current.filter((stage) => stage.id !== id);
    });
  };

  const updateNewPipelineStageColor = (id, color) => {
    setNewPipelineStages((current) => current.map((stage) => (
      stage.id === id ? { ...stage, color } : stage
    )));
  };

  const moveNewPipelineStageIndex = (fromIndex, toIndex) => {
    setNewPipelineStages((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      // Adjust anchor indexes if shifted!
      if (wizardConversionStageIdx === fromIndex) setWizardConversionStageIdx(toIndex);
      else if (wizardConversionStageIdx === toIndex) setWizardConversionStageIdx(fromIndex);

      if (wizardWonStageIdx === fromIndex) setWizardWonStageIdx(toIndex);
      else if (wizardWonStageIdx === toIndex) setWizardWonStageIdx(fromIndex);

      if (wizardLostStageIdx === fromIndex) setWizardLostStageIdx(toIndex);
      else if (wizardLostStageIdx === toIndex) setWizardLostStageIdx(fromIndex);

      return next;
    });
  };

  const validateWizardStep2 = () => {
    if (newPipelineStages.length < 2) {
      return "The pipeline must have at least 2 stages.";
    }
    const emptyStage = newPipelineStages.find(s => !s.name || !s.name.trim());
    if (emptyStage) {
      return "Stage names cannot be empty.";
    }
    if (wizardConversionStageIdx === null || wizardConversionStageIdx === '') {
      return "Please select a conversion stage.";
    }
    const convIdx = parseInt(wizardConversionStageIdx);
    if (convIdx === 0) {
      return "The conversion stage cannot be the first stage. There must be at least one Lead stage.";
    }

    if (wizardHasWon) {
      if (wizardWonStageIdx === null || wizardWonStageIdx === '') {
        return "Please select a Won stage.";
      }
      const wonIdx = parseInt(wizardWonStageIdx);
      if (wonIdx < convIdx) {
        return "The Won stage cannot be before the Conversion stage.";
      }
    }

    if (wizardHasLost) {
      if (wizardLostStageIdx === null || wizardLostStageIdx === '') {
        return "Please select a Lost stage.";
      }
      const lostIdx = parseInt(wizardLostStageIdx);
      if (lostIdx < convIdx) {
        return "The Lost stage cannot be before the Conversion stage.";
      }
    }

    if (wizardHasWon && wizardHasLost && parseInt(wizardWonStageIdx) === parseInt(wizardLostStageIdx)) {
      return "The Won and Lost stages cannot be the same stage.";
    }

    return null;
  };

  const openSetupWizard = async () => {
    if (!activePipelineId) return;
    setIsCreatingNewPipeline(false);
    setNewPipelineStages(stageList.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color || '#6c757d',
      stage_type: s.stage_type,
      entity_type: s.entity_type,
      order: s.order
    })));
    setOriginalStages(JSON.parse(JSON.stringify(stageList)));

    let convIdx = null;
    let wonIdx = null;
    let lostIdx = null;
    stageList.forEach((s, idx) => {
      if (s.stage_type === 'CONVERSION') convIdx = idx;
      else if (s.stage_type === 'WON') wonIdx = idx;
      else if (s.stage_type === 'LOST') lostIdx = idx;
    });

    if (convIdx === null && stageList.length > 1) {
      convIdx = 1;
    }

    setWizardConversionStageIdx(convIdx);
    setWizardHasWon(wonIdx !== null);
    setWizardWonStageIdx(wonIdx);
    setWizardHasLost(lostIdx !== null);
    setWizardLostStageIdx(lostIdx);

    let formActive = false;
    let fieldsList = [];
    try {
      const formRes = await apiGet(`/api/pipelines/${activePipelineId}/form/`);
      const formData = getResponseObject(formRes);
      if (formData) {
        formActive = Boolean(formData.is_active);
        fieldsList = formData.fields || [];
      }
    } catch (err) {
      console.log("No custom form configured yet, starting empty.");
    }

    setWizardEnableForm(formActive);
    setWizardFormFields(fieldsList);

    setPipelineSettingsStep('wizard-stages');
    setPipelineSettingsOpen(true);
  };

  const saveGuidedSetupWizard = async () => {
    if (wizardSaving) return;
    const err = validateWizardStep2();
    if (err) {
      setMessage(err);
      return;
    }

    setWizardSaving(true);
    setWizardSaveLogs([]);
    const logMsg = (msg) => {
      setWizardSaveLogs((current) => [...current, `> ${msg}`]);
    };

    logMsg("Starting configuration save...");

    try {
      let pipelineId = isCreatingNewPipeline ? null : activePipelineId;
      if (!pipelineId) {
        logMsg("Creating custom pipeline record...");
        const res = await authRequest('/api/pipelines/', {
          method: 'POST',
          body: JSON.stringify({ name: newPipelineName.trim() })
        });
        const data = getResponseObject(res);
        if (data && data.id) {
          pipelineId = data.id;
          setActivePipelineId(pipelineId);
          setActivePipeline({ type: 'custom', name: newPipelineName.trim() });
        } else {
          throw new Error('Failed to create pipeline record on backend.');
        }
      }

      logMsg("Saving stages configuration...");
      const savedStages = [];
      for (let i = 0; i < newPipelineStages.length; i++) {
        const ws = newPipelineStages[i];
        const payload = {
          pipeline: pipelineId,
          name: ws.name.trim(),
          order: i,
          color: ws.color || "#6c757d"
        };

        logMsg(`Saving stage: "${ws.name}" (Position: ${i + 1})...`);
        let res;
        const isExisting = ws.id && typeof ws.id === 'number';
        if (isExisting) {
          res = await authRequest(`/api/pipeline/stages/${ws.id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
        } else {
          res = await authRequest('/api/pipeline/stages/', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        }
        const saved = getResponseObject(res);
        savedStages.push(saved);
      }
      logMsg("Stages configuration saved successfully.");

      const activeIds = savedStages.map(s => s.id);
      const deletedStages = originalStages.filter(os => !activeIds.includes(os.id));

      if (deletedStages.length > 0) {
        logMsg(`Processing deletions for ${deletedStages.length} removed stage(s)...`);
        for (const ds of deletedStages) {
          logMsg(`Soft deleting stage: "${ds.name}"...`);
          try {
            await authRequest(`/api/pipeline/stages/${ds.id}/`, {
              method: 'DELETE'
            });
          } catch (e) {
            if (e.message && e.message.includes("Please provide a reassign_stage_id")) {
              logMsg(`Stage "${ds.name}" contains active cards. Demanding reassignment.`);
              const promptMsg = `Stage "${ds.name}" contains active cards. Please enter the number (Position) of the target stage to reassign them to (1 to ${savedStages.length}):\n` +
                                savedStages.map((s, idx) => `[${idx+1}] ${s.name}`).join('\n');
              const targetIdx = window.prompt(promptMsg);
              const targetNum = parseInt(targetIdx);
              if (!isNaN(targetNum) && targetNum >= 1 && targetNum <= savedStages.length) {
                const reassignId = savedStages[targetNum - 1].id;
                logMsg(`Reassigning cards to "${savedStages[targetNum - 1].name}" and retrying deletion...`);
                await authRequest(`/api/pipeline/stages/${ds.id}/`, {
                  method: 'DELETE',
                  body: JSON.stringify({ reassign_stage_id: reassignId })
                });
              } else {
                throw new Error(`Deletion of stage "${ds.name}" cancelled or invalid reassign stage selected.`);
              }
            } else {
              throw e;
            }
          }
        }
        logMsg("Omitted stages deleted successfully.");
      }

      logMsg("Refreshing stage IDs for behavior role mapping...");
      const refreshRes = await apiGet(`/api/pipeline/stages/?pipeline=${pipelineId}`);
      const freshStages = getResponseList(refreshRes);
      freshStages.sort((a, b) => a.order - b.order);

      const convStageObj = freshStages[parseInt(wizardConversionStageIdx)];
      const wonStageObj = (wizardHasWon && wizardWonStageIdx !== null) ? freshStages[parseInt(wizardWonStageIdx)] : null;
      const lostStageObj = (wizardHasLost && wizardLostStageIdx !== null) ? freshStages[parseInt(wizardLostStageIdx)] : null;

      if (!convStageObj) {
        throw new Error("Could not resolve conversion stage database record.");
      }

      logMsg(`Mapping boundary conversion stage to: "${convStageObj.name}"...`);
      if (wonStageObj) logMsg(`Mapping Won stage to: "${wonStageObj.name}"...`);
      if (lostStageObj) logMsg(`Mapping Lost stage to: "${lostStageObj.name}"...`);

      logMsg("Updating pipeline behavior configuration...");
      await authRequest(`/api/pipelines/${pipelineId}/configure_behavior/`, {
        method: 'POST',
        body: JSON.stringify({
          conversion_stage_id: convStageObj.id,
          won_stage_id: wonStageObj ? wonStageObj.id : null,
          lost_stage_id: lostStageObj ? lostStageObj.id : null
        })
      });
      logMsg("Pipeline behavior configuration updated successfully.");

      logMsg("Saving Opportunity Custom Form Template...");
      await authRequest(`/api/pipelines/${pipelineId}/form/`, {
        method: 'POST',
        body: JSON.stringify({
          is_active: wizardEnableForm,
          fields: wizardFormFields.map((field, index) => ({
            ...field,
            order: index
          }))
        })
      });
      logMsg("Opportunity Custom Form Template saved successfully.");

      logMsg("--- PIPELINE SETUP COMPLETE! ---");
      await fetchPipelines();
      setActivePipelineId(pipelineId);
      const isDefault = (pipelineId === 1);
      const targetName = isCreatingNewPipeline ? newPipelineName.trim() : activePipeline.name;
      setActivePipeline({ type: isDefault ? 'standard' : 'custom', name: targetName });
      setFilters((current) => ({ ...current, stage: 'All' }));
      setPipelineSettingsOpen(false);
      setMessage(`Pipeline configured successfully!`);
    } catch (err) {
      console.error(err);
      logMsg(`ERROR: ${err.message}`);
      setMessage(err.message || 'Failed to save pipeline configuration.');
    } finally {
      setWizardSaving(false);
    }
  };

  const addNewWizardFormField = () => {
    const label = newFieldDraft.label.trim();
    if (!label) {
      setMessage("Field Label Name is required.");
      return;
    }
    const type = newFieldDraft.type;
    let opts = [];
    if (type === 'DROPDOWN') {
      opts = newFieldDraft.options.split(',').map(x => x.trim()).filter(x => x !== '');
      if (opts.length === 0) {
        setMessage("Dropdown field must have at least one option.");
        return;
      }
    }
    const req = newFieldDraft.required;

    setWizardFormFields((current) => [
      ...current,
      {
        label,
        field_type: type,
        required: req,
        options: opts
      }
    ]);

    setNewFieldDraft({ label: '', type: 'TEXT', required: false, options: '' });
  };

  const removeWizardFormField = (index) => {
    setWizardFormFields((current) => current.filter((_, idx) => idx !== index));
  };

  const createStage = async (event) => {
    event.preventDefault();
    const name = stageForm.name.trim();
    if (!name) {
      setMessage('Stage Name is required.');
      return;
    }
    if (editingStage) {
      try {
        const res = await authRequest(`/api/pipeline/stages/${editingStage.id}/`, {
          method: 'PUT',
          body: JSON.stringify({
            pipeline: activePipelineId,
            name,
            entity_type: editingStage.entity_type || 'OPPORTUNITY',
            stage_type: editingStage.stage_type || 'NORMAL_OPPORTUNITY',
            order: editingStage.order
          })
        });
        if (isResponseSuccess(res)) {
          fetchStages(activePipelineId);
          fetchAllLeadsAndOpportunities();
          setMessage('Stage updated successfully.');
        }
      } catch (err) {
        setMessage(err.message || 'Failed to update stage.');
      }
    } else {
      try {
        const res = await authRequest('/api/pipeline/stages/', {
          method: 'POST',
          body: JSON.stringify({
            pipeline: activePipelineId,
            name,
            entity_type: 'OPPORTUNITY',
            stage_type: 'NORMAL_OPPORTUNITY'
          })
        });
        if (isResponseSuccess(res)) {
          fetchStages(activePipelineId);
          fetchAllLeadsAndOpportunities();
          setMessage('Stage created successfully.');
        }
      } catch (err) {
        setMessage(err.message || 'Failed to create stage.');
      }
    }
    setStageForm({ name: '', owner: '' });
    setStageModalOpen(false);
    setEditingStage(null);
  };

  const moveLeadToStage = async (lead, stageId) => {
    const targetStage = stageList.find(s => s.id === stageId);
    if (!targetStage) return;

    if (targetStage.entity_type === 'OPPORTUNITY' || targetStage.stage_type === 'CONVERSION') {
      if (targetStage.stage_type !== 'CONVERSION') {
        setMessage('Unconverted leads must be dropped into the Conversion stage to convert them.');
        setDraggedLead(null);
        return;
      }
      openConversionModal(lead, targetStage.id);
      return;
    }

    try {
      const res = await authRequest('/api/pipeline/move/', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: 'lead',
          id: lead.backendId || lead.id,
          target_stage_id: targetStage.id
        })
      });
      if (isResponseSuccess(res)) {
        fetchAllLeadsAndOpportunities();
        setMessage('Lead stage updated successfully.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to move lead.');
    }
    setDraggedLead(null);
  };

  const openItemOpportunityStage = async (item, stageId) => {
    const targetStage = stageList.find(s => s.id === stageId);
    if (!targetStage) return;

    if (targetStage.entity_type === 'LEAD') {
      setMessage('Opportunities cannot be moved to Lead-only stages.');
      setDragged(null);
      return;
    }

    if (item.pipeline_stage === stageId) {
      setDragged(null);
      return;
    }

    try {
      const res = await authRequest('/api/pipeline/move/', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: 'opportunity',
          id: item.backendId || item.id,
          target_stage_id: targetStage.id
        })
      });
      if (isResponseSuccess(res)) {
        fetchAllLeadsAndOpportunities();
        setMessage('Opportunity stage updated successfully.');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to move opportunity.');
    }
    setDragged(null);
  };

  const deletePipelineStageOpportunity = async (opp) => {
    setMessage('Opportunities cannot be deleted directly. They must be managed via CRM lifecycle.');
  };

  // Build filter options dynamically using live owners
  const ownerFilterOptions = useMemo(() => {
    const list = ['All'];
    availableUsers.forEach(u => {
      const name = u.full_name || u.username;
      if (name && !list.includes(name)) list.push(name);
    });
    return list;
  }, [availableUsers]);

  if (activeStagePage && opportunityStage) {
    const pageRecords = stageRecords
      .filter((record) => record.stage === activeStagePage)
      .filter((record) => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        return [record.sourceName, record.sourceId, record.createdAt, ...Object.values(record.values || {})]
          .some((value) => String(value || '').toLowerCase().includes(term));
      });

    return (
      <section className="page salesforce-leads salesforce-pipeline">
        <div className="sf-list-head">
          <div className="sf-title-wrap">
            <div className="sf-object-icon pipeline-icon"><span /></div>
            <div>
              <p>Opportunity Stage</p>
              <button type="button" className="sf-list-title">
                {activeStagePage} <ChevronDown size={18} />
              </button>
              <p className="sf-page-subtitle">Review saved records for this opportunity stage.</p>
            </div>
            <button type="button" className="sf-pin" aria-label="Pin list"><Pin size={15} /></button>
          </div>
        </div>
        <div className="toolbar lead-toolbar">
          <SearchBox value={search} onChange={setSearch} placeholder="Search this list..." />
        </div>
        <div className="sf-list-panel opportunity-stage-page">
          <div className="generated-page-head">
            <div>
              <span>Generated Page</span>
              <h3>{activeStagePage}</h3>
            </div>
            <span className="pill qualified">{opportunityStageMode === 'standard' ? 'Standard Form' : 'Custom Form'}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>SR#</th>
                <th>Source</th>
                <th>Source ID</th>
                <th>Date</th>
                {opportunityStageMode === 'custom'
                  ? customFields.map((field) => <th key={field.id}>{field.label}</th>)
                  : ['Company', 'Contact', 'Value', 'Close Date', 'Owner'].map((field) => <th key={field}>{field}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record, index) => (
                <tr key={record.id}>
                  <td>{index + 1}</td>
                  <td><HighlightedText text={record.sourceName} query={search} /></td>
                  <td><HighlightedText text={record.sourceId} query={search} /></td>
                  <td><HighlightedText text={record.createdAt} query={search} /></td>
                  {opportunityStageMode === 'custom'
                    ? customFields.map((field) => <td key={field.id}><HighlightedText text={record.values[field.id] || '-'} query={search} /></td>)
                    : ['company', 'contact', 'value', 'closeDate', 'owner'].map((field) => <td key={field}><HighlightedText text={field === 'value' && record.values[field] ? formatCurrency(record.values[field]) : record.values[field] || '-'} query={search} /></td>)}
                  <td>
                    <div className="action-menu-wrap">
                      <IconButton label="Record actions" onClick={() => setOpenRecordActionId((current) => current === record.id ? '' : record.id)}><MoreHorizontal size={16} /></IconButton>
                      {openRecordActionId === record.id && (
                        <div className="row-action-menu">
                          <button type="button" onClick={() => { setMessage('Edit record opened.'); setOpenRecordActionId(''); }}><Edit size={15} />Edit</button>
                          <hr />
                          <button type="button" className="danger-menu-item" onClick={() => { deletePipelineStageOpportunity(record); setOpenRecordActionId(''); }}><Trash2 size={15} />Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!pageRecords.length && (
                <tr><td colSpan={opportunityStageMode === 'custom' ? 5 + customFields.length : 10}>No records saved for this stage yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (standardPreviewStage) {
    return (
      <section className="page salesforce-leads salesforce-pipeline">
        <div className="sf-list-head">
          <div className="sf-title-wrap">
            <div className="sf-object-icon pipeline-icon"><span /></div>
            <div>
              <p>{standardPreviewStage.name}</p>
              <button type="button" className="sf-list-title">
                Standard form <ChevronDown size={18} />
              </button>
              <p className="sf-page-subtitle">Preview and save the standard opportunity stage form.</p>
            </div>
            <button type="button" className="sf-pin" aria-label="Pin list"><Pin size={15} /></button>
          </div>
          <div className="sf-action-strip">
            <button className="sf-action back-action" onClick={() => setStandardPreviewStage(null)}>Back</button>
          </div>
        </div>
        <div className="sf-list-panel custom-builder-page">
          <form className="opportunity-form standard-preview-form">
            <label className="field">
              <span>Opportunity ID</span>
              <input value="Auto generated" readOnly />
            </label>
            <label className="field">
              <span>Related Company*</span>
              <input value="Selected lead company" readOnly />
            </label>
            <label className="field">
              <span>Primary Contact*</span>
              <input value="Selected lead contact" readOnly />
            </label>
            <label className="field">
              <span>Deal Amount*</span>
              <input value="0.00" readOnly />
            </label>
            <label className="field">
              <span>Expected Close Date*</span>
              <input value="yyyy-mm-dd" readOnly />
            </label>
            <label className="field">
              <span>Probability (%)</span>
              <input value="Calculated by stage" readOnly />
            </label>
            <label className="field">
              <span>Stage*</span>
              <input value={standardPreviewStage.name} readOnly />
            </label>
            <label className="field">
              <span>Assigned Salesperson*</span>
              <input value="Selected owner" readOnly />
            </label>
            <label className="field wide">
              <span>Notes / Description</span>
              <textarea rows="4" value="Notes entered when the opportunity is created." readOnly />
            </label>
            <PanelActions wide>
              <button type="button" className="button secondary" onClick={() => setStandardPreviewStage(null)}>Back</button>
              <button type="button" className="button primary" onClick={() => makeStandardOpportunityStage(standardPreviewStage)}>Save Standard Form</button>
            </PanelActions>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="page salesforce-leads salesforce-pipeline pipeline-redesign-page">
      <div className="pipeline-main-card">
        <section className="page-panel leads-page-panel pipeline-top-panel">
          <section className="crm-summary-strip pipeline-summary-strip" aria-label="Pipeline summary">
            <article>
              <span>Total Pipeline</span>
              <strong>{totalPipeline}</strong>
            </article>
            <article>
              <span>Open Deals</span>
              <strong>{openDeals}</strong>
            </article>
            <article>
              <span>Total Revenue</span>
              <strong>{formatCurrency(totalRevenue)}</strong>
            </article>
            <article>
              <span>Exp Revenue</span>
              <strong>{formatCurrency(expectedRevenue)}</strong>
            </article>
          </section>

          <section className="page-panel-filters lf-filter-bar pipeline-filter-row" aria-label="Pipeline filters">
            <div className="pipeline-filter-group">
              <label className="pipeline-inline-filter">
                <span>Pipeline:</span>
                <select 
                  value={activePipelineId || ''} 
                  onChange={(event) => {
                    const selectedId = Number(event.target.value);
                    const selectedPipe = pipelinesList.find(p => p.id === selectedId);
                    if (selectedPipe) {
                      setActivePipelineId(selectedId);
                      setActivePipeline({ type: selectedPipe.is_default ? 'standard' : 'custom', name: selectedPipe.name });
                      setFilters((current) => ({ ...current, stage: 'All' }));
                    }
                  }}
                >
                  {pipelinesList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="pipeline-inline-filter">
                <span>Stage:</span>
                <select value={filters.stage} onChange={(event) => updateFilter('stage', event.target.value)}>
                  <option value="All">All</option>
                  {stageList.map((stage) => <option key={stage.id} value={stage.name}>{stage.name}</option>)}
                </select>
              </label>
              <label className="pipeline-inline-filter">
                <span>Owner:</span>
                <select value={filters.owner} onChange={(event) => updateFilter('owner', event.target.value)}>
                  {ownerFilterOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                </select>
              </label>
            </div>

            <div className="pipeline-actions-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" className="button primary add-lead-button" onClick={openNewLead} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '38px', padding: '0 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 600 }}>
                <Plus size={15} />
                Add Lead
              </button>
              <button type="button" className="pipeline-settings-button" onClick={openPipelineSettings}>
                <Settings size={15} />
                Pipeline Settings
              </button>
            </div>
          </section>
        </section>

        <section className="pipeline-stage-panel">
          <header className="pipeline-stage-header">
            <h2>{activePipeline.name} Stages</h2>
            <button type="button" className="pipeline-edit-stages" onClick={() => setShowStages((show) => !show)}>
              {showStages ? 'Hide Stages List' : 'View/Manage Stages'}
            </button>
          </header>

          {showStages && (
            <div style={{ borderBottom: '1px solid #e5eaf1', background: '#f8fafc' }}>
              <div className="pipeline-stage-edit-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Manage the stages in the active pipeline.</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {activePipeline.type === 'custom' && (canEdit || canCreate) && (
                    <button type="button" className="pipeline-secondary-action wizard-launch-btn" onClick={openSetupWizard}>
                      ✨ Setup Wizard
                    </button>
                  )}
                  {canCreate && (
                    <button type="button" className="pipeline-secondary-action" onClick={openCreateManagedStage}>
                      <Plus size={14} /> Add Stage
                    </button>
                  )}
                </div>
              </div>

              <div className="pipeline-stage-list">
                {stageList.map((stage, index) => {
                  const stageCount = filtered.filter((item) => item.stage === stage.name).length
                    + stageLeads.filter((lead) => getOwnerName(lead.owner) === stage.owner || lead.status === stage.name).length;
                  const stageKey = stage.name.toLowerCase();
                  const isWon = stageKey === 'won' || stage.stage_type === 'WON';
                  const isLost = stageKey === 'lost' || stage.stage_type === 'LOST';

                  return (
                    <article
                      key={stage.id}
                      className={`pipeline-stage-row ${isWon ? 'pipeline-stage-won' : ''} ${isLost ? 'pipeline-stage-lost' : ''}`}
                    >
                      <div className="pipeline-stage-index">{index + 1}</div>
                      <div className="pipeline-stage-info">
                        <strong>{stage.name}</strong>
                        <span>
                          {activePipeline.type === 'standard'
                            ? standardStageDescriptions[stage.name] || 'Pipeline stage'
                            : 'Custom pipeline stage'}
                        </span>
                      </div>
                      <div className="pipeline-stage-owner">
                        {isWon || isLost ? <Lock size={13} /> : <Users size={13} />}
                        <span>{isWon || isLost ? 'System Automated' : 'Shared'}</span>
                      </div>
                      <div className="pipeline-stage-actions">
                        <span className="pipeline-stage-count">{stageCount}</span>
                        <>
                          {canEdit && (
                            <button type="button" className="pipeline-row-icon" aria-label={`Edit ${stage.name}`} onClick={() => openEditStage(stage)}>
                              <Edit size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button type="button" className="pipeline-row-icon danger" aria-label={`Delete ${stage.name}`} onClick={() => setDeleteStage(stage)}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {pipelineSettingsOpen && (
        <Modal title="Pipeline Settings" onClose={() => { setPipelineSettingsOpen(false); setPipelineSettingsStep('choose'); }}>
          {pipelineSettingsStep === 'choose' && (
            <div className="pipeline-choice-wrapper">
              <button
                type="button"
                className={`pipeline-choice-card ${activePipeline.type === 'standard' ? 'active' : ''}`}
                onClick={chooseStandardPipeline}
              >
                <strong>Standard Pipeline</strong>
                <span>Use the default sales stages already configured in the CRM.</span>
              </button>
              <button type="button" className="pipeline-choice-card" onClick={startNewPipeline}>
                <strong>New Pipeline</strong>
                <span>Create a named pipeline with your own stages.</span>
              </button>
              {activePipeline.type === 'custom' && (
                <button
                  type="button"
                  className="pipeline-choice-card danger"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete pipeline "${activePipeline.name}"?`)) {
                      deleteSavedCustomPipeline();
                      setPipelineSettingsOpen(false);
                    }
                  }}
                >
                  <strong>Delete Current Pipeline</strong>
                  <span>Delete "${activePipeline.name}" and all of its stages.</span>
                </button>
              )}
            </div>
          )}

          {pipelineSettingsStep === 'name' && (
            <div className="pipeline-new-flow">
              <label className="field wide">
                <span>Pipeline Name*</span>
                <input
                  value={newPipelineName}
                  placeholder="e.g. Enterprise Sales"
                  onChange={(event) => setNewPipelineName(event.target.value)}
                  autoFocus
                />
              </label>
              <PanelActions wide>
                <button type="button" className="button secondary" onClick={() => setPipelineSettingsStep('choose')}>Back</button>
                <button type="button" className="button primary" onClick={continueNewPipeline}>Continue</button>
              </PanelActions>
            </div>
          )}

          {/* Setup Wizard Step 1: Stages List & Ordering */}
          {pipelineSettingsStep === 'wizard-stages' && (
            <div className="pipeline-new-flow">
              <div className="stepper-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Step 1: Pipeline Stages</span>
                <span style={{ color: '#888' }}>Guided Setup Wizard</span>
              </div>
              <div className="pipeline-builder-heading" style={{ marginBottom: '12px' }}>
                <strong>{newPipelineName || activePipeline.name} Stages</strong>
                <span className="small text-muted" style={{ display: 'block', fontSize: '0.85rem' }}>Design your pipeline stages. Use Up/Down arrows to reorder.</span>
              </div>
              <div className="pipeline-custom-stage-list" style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '12px' }}>
                {newPipelineStages.map((stage, index) => (
                  <div key={stage.id} className="pipeline-custom-stage-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge bg-secondary font-monospace" style={{ width: '25px', textAlign: 'center', padding: '4px' }}>{index + 1}</span>
                    <input
                      style={{ flex: 1 }}
                      value={stage.name}
                      placeholder={`Stage ${index + 1}`}
                      onChange={(event) => updateNewPipelineStage(stage.id, event.target.value)}
                    />
                    <input
                      type="color"
                      value={stage.color || '#6c757d'}
                      style={{ width: '36px', height: '36px', padding: 0, border: 'none', cursor: 'pointer' }}
                      onChange={(event) => updateNewPipelineStageColor(stage.id, event.target.value)}
                    />
                    <button
                      type="button"
                      className="button secondary py-1 px-2"
                      disabled={index === 0}
                      onClick={() => moveNewPipelineStageIndex(index, index - 1)}
                    >
                      &uarr;
                    </button>
                    <button
                      type="button"
                      className="button secondary py-1 px-2"
                      disabled={index === newPipelineStages.length - 1}
                      onClick={() => moveNewPipelineStageIndex(index, index + 1)}
                    >
                      &darr;
                    </button>
                    {newPipelineStages.length > 1 && (
                      <button type="button" className="pipeline-remove-stage button danger py-1 px-2" aria-label="Remove stage" onClick={() => removeNewPipelineStage(stage.id)}>
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="pipeline-add-stage button secondary py-1 px-3 mb-3" onClick={addNewPipelineStage}>
                <Plus size={15} /> Add Stage
              </button>
              <PanelActions wide>
                <button type="button" className="button secondary" onClick={() => setPipelineSettingsStep(activePipelineId ? 'choose' : 'name')}>Back</button>
                <button type="button" className="button primary" onClick={() => {
                  const emptyStage = newPipelineStages.find(s => !s.name || !s.name.trim());
                  if (emptyStage) {
                    setMessage("Stage names cannot be empty.");
                    return;
                  }
                  setPipelineSettingsStep('wizard-behavior');
                }}>Next: Sales Flow &rarr;</button>
              </PanelActions>
            </div>
          )}

          {/* Setup Wizard Step 2: Sales Flow Transitions */}
          {pipelineSettingsStep === 'wizard-behavior' && (
            <div className="pipeline-new-flow">
              <div className="stepper-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Step 2: Sales Flow Behavior</span>
                <span style={{ color: '#888' }}>Guided Setup Wizard</span>
              </div>
              
              <div className="card p-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                <label className="field wide mb-1 fw-semibold" style={{ fontWeight: '600' }}>Where does a Lead become an Opportunity?</label>
                <span className="small text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px' }}>
                  Stages prior to this selection represent Lead pipelines. This stage and all subsequent stages represent Opportunity pipelines.
                </span>
                <select 
                  className="form-select border-primary" 
                  value={wizardConversionStageIdx ?? ''} 
                  onChange={(e) => setWizardConversionStageIdx(e.target.value !== '' ? parseInt(e.target.value) : null)}
                >
                  <option value="">Choose conversion stage...</option>
                  {newPipelineStages.map((stage, idx) => (
                    <option key={idx} value={idx}>{stage.name} (Position: {idx + 1})</option>
                  ))}
                </select>
              </div>

              <div className="card p-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: '600', display: 'block' }}>Does this pipeline have a Won stage?</span>
                    <small className="text-muted" style={{ fontSize: '0.8rem' }}>A terminal stage representing successfully closed business.</small>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label><input type="radio" checked={wizardHasWon} onChange={() => setWizardHasWon(true)} /> Yes</label>
                    <label><input type="radio" checked={!wizardHasWon} onChange={() => { setWizardHasWon(false); setWizardWonStageIdx(null); }} /> No</label>
                  </div>
                </div>
                {wizardHasWon && (
                  <select 
                    className="form-select" 
                    value={wizardWonStageIdx ?? ''} 
                    onChange={(e) => setWizardWonStageIdx(e.target.value !== '' ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select Won Stage...</option>
                    {newPipelineStages.map((stage, idx) => (
                      <option key={idx} value={idx}>{stage.name} (Position: {idx + 1})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="card p-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: '600', display: 'block' }}>Does this pipeline have a Lost stage?</span>
                    <small className="text-muted" style={{ fontSize: '0.8rem' }}>A terminal stage representing closed or lost business.</small>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label><input type="radio" checked={wizardHasLost} onChange={() => setWizardHasLost(true)} /> Yes</label>
                    <label><input type="radio" checked={!wizardHasLost} onChange={() => { setWizardHasLost(false); setWizardLostStageIdx(null); }} /> No</label>
                  </div>
                </div>
                {wizardHasLost && (
                  <select 
                    className="form-select" 
                    value={wizardLostStageIdx ?? ''} 
                    onChange={(e) => setWizardLostStageIdx(e.target.value !== '' ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select Lost Stage...</option>
                    {newPipelineStages.map((stage, idx) => (
                      <option key={idx} value={idx}>{stage.name} (Position: {idx + 1})</option>
                    ))}
                  </select>
                )}
              </div>

              <PanelActions wide>
                <button type="button" className="button secondary" onClick={() => setPipelineSettingsStep('wizard-stages')}>Back</button>
                <button type="button" className="button primary" onClick={() => {
                  const err = validateWizardStep2();
                  if (err) {
                    setMessage(err);
                    return;
                  }
                  setPipelineSettingsStep('wizard-form');
                }}>Next: Conversion Form &rarr;</button>
              </PanelActions>
            </div>
          )}

          {/* Setup Wizard Step 3: Custom Conversion Form Builder */}
          {pipelineSettingsStep === 'wizard-form' && (
            <div className="pipeline-new-flow">
              <div className="stepper-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Step 3: Conversion Form</span>
                <span style={{ color: '#888' }}>Guided Setup Wizard</span>
              </div>

              <div className="form-check form-switch mb-3 p-3 bg-light rounded shadow-sm border d-flex justify-content-between align-items-center" style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div>
                  <label className="form-check-label fw-semibold text-dark d-block" style={{ fontWeight: '600' }}>Enable custom conversion form fields</label>
                  <small className="text-muted" style={{ display: 'block', fontSize: '0.8rem' }}>Collect extra information (e.g. Budget, Requirements) when a Lead converts.</small>
                </div>
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={wizardEnableForm} 
                  onChange={(e) => setWizardEnableForm(e.target.checked)} 
                  style={{ width: '2.5em', height: '1.25em', cursor: 'pointer' }}
                />
              </div>

              {wizardEnableForm && (
                <div style={{ marginBottom: '12px' }}>
                  <div className="border rounded bg-white mb-3" style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #e2e8f0' }}>
                    <table className="table table-sm align-middle mb-0" style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '6px' }}>Field Label</th>
                          <th>Data Type</th>
                          <th>Required?</th>
                          <th>Options</th>
                          <th style={{ textAlign: 'center', width: '50px' }}>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wizardFormFields.length === 0 ? (
                          <tr><td colSpan="5" style={{ textAlign: 'center', color: '#888', padding: '12px' }}>No fields configured yet. Add fields below.</td></tr>
                        ) : (
                          wizardFormFields.map((field, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '6px', fontWeight: 'bold' }}>{field.label}</td>
                              <td>{field.field_type}</td>
                              <td>{field.required ? 'Yes' : 'No'}</td>
                              <td style={{ color: '#666', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {field.options && field.options.length ? field.options.join(', ') : '-'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button type="button" className="button danger py-0 px-1" onClick={() => removeWizardFormField(idx)}>&times;</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="card p-3 border-secondary border-opacity-10 bg-light" style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <h6 className="small text-uppercase fw-bold text-secondary mb-2" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Add Custom Field</h6>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label className="small text-muted mb-1" style={{ fontSize: '0.8rem', display: 'block' }}>Field Label Name</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={newFieldDraft.label} 
                          placeholder="e.g. Project Budget" 
                          onChange={(e) => setNewFieldDraft({ ...newFieldDraft, label: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label className="small text-muted mb-1" style={{ fontSize: '0.8rem', display: 'block' }}>Field Type</label>
                        <select 
                          className="form-select" 
                          value={newFieldDraft.type} 
                          onChange={(e) => setNewFieldDraft({ ...newFieldDraft, type: e.target.value })}
                        >
                          <option value="TEXT">Short Text</option>
                          <option value="TEXTAREA">Long Text</option>
                          <option value="NUMBER">Number</option>
                          <option value="DATE">Date</option>
                          <option value="CHECKBOX">Checkbox</option>
                          <option value="DROPDOWN">Dropdown</option>
                        </select>
                      </div>
                    </div>
                    {newFieldDraft.type === 'DROPDOWN' && (
                      <div style={{ marginBottom: '8px' }}>
                        <label className="small text-muted mb-1" style={{ fontSize: '0.8rem', display: 'block' }}>Dropdown Options (comma separated)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={newFieldDraft.options} 
                          placeholder="US, EU, APAC" 
                          onChange={(e) => setNewFieldDraft({ ...newFieldDraft, options: e.target.value })} 
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input 
                          type="checkbox" 
                          checked={newFieldDraft.required} 
                          onChange={(e) => setNewFieldDraft({ ...newFieldDraft, required: e.target.checked })} 
                        /> Required
                      </label>
                      <button type="button" className="button primary py-1 px-3" onClick={addNewWizardFormField}>+ Add Field</button>
                    </div>
                  </div>
                </div>
              )}

              <PanelActions wide>
                <button type="button" className="button secondary" onClick={() => setPipelineSettingsStep('wizard-behavior')}>Back</button>
                <button type="button" className="button primary" onClick={() => setPipelineSettingsStep('wizard-review')}>Next: Review &rarr;</button>
              </PanelActions>
            </div>
          )}

          {/* Setup Wizard Step 4: Flow Review & Confirm */}
          {pipelineSettingsStep === 'wizard-review' && (
            <div className="pipeline-new-flow">
              <div className="stepper-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Step 4: Review Summary</span>
                <span style={{ color: '#888' }}>Guided Setup Wizard</span>
              </div>

              <div className="card p-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #3b82f6', borderRadius: '6px', padding: '12px' }}>
                <h6 style={{ fontWeight: 'bold', color: '#1e3a8a', marginBottom: '12px' }}>📋 Sales Pipeline Summary</h6>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', display: 'block', fontWeight: '500' }}>Lead Phase Stages:</span>
                    <strong>{newPipelineStages.slice(0, parseInt(wizardConversionStageIdx)).map(s => s.name).join(' ➔ ') || 'None'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', display: 'block', fontWeight: '500' }}>Conversion stage Gate:</span>
                    <strong style={{ color: '#2563eb' }}>{newPipelineStages[parseInt(wizardConversionStageIdx)]?.name}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', display: 'block', fontWeight: '500' }}>Opportunity Phase Stages:</span>
                    <strong>{newPipelineStages.slice(parseInt(wizardConversionStageIdx)).map(s => s.name).join(' ➔ ') || 'None'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', display: 'block', fontWeight: '500' }}>Terminal outcome anchors:</span>
                    <div>
                      Won Stage: <strong style={{ color: '#16a34a' }}>{wizardHasWon && wizardWonStageIdx !== null ? newPipelineStages[parseInt(wizardWonStageIdx)]?.name : 'Skipped / None'}</strong> | 
                      Lost Stage: <strong style={{ color: '#dc2626' }}>{wizardHasLost && wizardLostStageIdx !== null ? newPipelineStages[parseInt(wizardLostStageIdx)]?.name : 'Skipped / None'}</strong>
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontWeight: '500' }}>Custom conversion form:</span>
                    <strong>{wizardEnableForm ? `Enabled (${wizardFormFields.length} custom fields)` : 'Disabled'}</strong>
                  </div>
                </div>
              </div>

              {wizardSaveLogs.length > 0 && (
                <div style={{ background: '#0f172a', color: '#38bdf8', fontFamily: 'monospace', padding: '12px', borderRadius: '6px', fontSize: '0.75rem', maxHeight: '120px', overflowY: 'auto', marginBottom: '12px' }}>
                  {wizardSaveLogs.map((log, idx) => (
                    <div key={idx}>{log}</div>
                  ))}
                </div>
              )}

              <PanelActions wide>
                <button type="button" className="button secondary" disabled={wizardSaving} onClick={() => setPipelineSettingsStep('wizard-form')}>Back</button>
                <button type="button" className="button primary" disabled={wizardSaving} onClick={saveGuidedSetupWizard}>
                  {wizardSaving ? 'Saving Configuration...' : 'Confirm & Apply Setup'}
                </button>
              </PanelActions>
            </div>
          )}
        </Modal>
      )}
      {stageModalOpen && (
        <Modal title={editingStage ? 'Edit Stage' : 'Create Stage'} onClose={() => setStageModalOpen(false)}>
          <form className="form-grid stage-form-grid" onSubmit={createStage}>
            <TextField label="Stage Name*" value={stageForm.name} onChange={(name) => setStageForm({ ...stageForm, name })} />
            <PanelActions wide>
              <button type="button" className="button secondary" onClick={() => setStageModalOpen(false)}>Cancel</button>
              <button type="submit" className="button primary">{editingStage ? 'Save Changes' : 'Save Stage'}</button>
            </PanelActions>
          </form>
        </Modal>
      )}
      {leadModalOpen && (
        <Modal title="Add Lead" onClose={() => setLeadModalOpen(false)}>
          <form className="form-grid" onSubmit={saveLead}>
            <TextField label="Full Name*" value={leadForm.customer} onChange={(customer) => setLeadForm({ ...leadForm, customer })} />
            <TextField label="Phone Number*" value={leadForm.phone} onChange={(phone) => setLeadForm({ ...leadForm, phone })} />
            <TextField label="Email" value={leadForm.email} onChange={(email) => setLeadForm({ ...leadForm, email })} />
            <TextField label="Company" value={leadForm.company} onChange={(company) => setLeadForm({ ...leadForm, company })} />
            <SelectField label="Lead Source" value={leadForm.source} options={leadSources.filter((item) => item !== 'All')} onChange={(source) => setLeadForm({ ...leadForm, source })} />
            <SelectField label="Priority" value={leadForm.priority} options={priorities.filter((item) => item !== 'All')} onChange={(priority) => setLeadForm({ ...leadForm, priority })} />
            <label className="field">
              <span>Owner</span>
              <select 
                value={leadForm.assignLead || ''} 
                onChange={(event) => setLeadForm({ ...leadForm, assignLead: event.target.value })}
                disabled={currentUser && !canAssignToOthers('leads')}
              >
                {currentUser && !canAssignToOthers('leads') ? (
                  <option value={currentUser.id}>{currentUser.full_name || currentUser.username}</option>
                ) : (
                  <>
                    <option value="">Decide Later</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                    ))}
                  </>
                )}
              </select>
            </label>
            <label className="field wide">
              <span>Notes</span>
              <textarea rows="4" value={leadForm.notes} onChange={(event) => setLeadForm({ ...leadForm, notes: event.target.value })} />
            </label>
            <PanelActions wide>
              <button type="button" className="button secondary" onClick={() => setLeadModalOpen(false)}>Cancel</button>
              <button type="submit" className="button primary">Save Lead</button>
            </PanelActions>
          </form>
        </Modal>
      )}
      {filtersOpen && (
        <Modal title="Filters" onClose={() => setFiltersOpen(false)}>
          <div className="sf-filter-popup">
            <div className="sf-filter-popup-grid">
              <SearchableSelect className="sf-filter-card" label="Owner" value={filters.owner} options={owners} onChange={(owner) => updateFilter('owner', owner)} placeholder="Search owner" />
              <SearchableSelect className="sf-filter-card" label="Company" value={filters.company} options={companies} onChange={(company) => updateFilter('company', company)} placeholder="Search company" />
            </div>
            <div className="sf-filter-links">
              <button type="button" onClick={() => setFilters({ stage: 'All', owner: 'All', company: 'All', priority: 'All', product: 'All' })}>Remove All</button>
            </div>
            <PanelActions>
              <button className="button secondary" onClick={() => setFiltersOpen(false)}>Cancel</button>
              <button className="button primary" onClick={() => setFiltersOpen(false)}>Apply</button>
            </PanelActions>
          </div>
        </Modal>
      )}
      {stagePrompt && (
        <Modal title={opportunityStageId === stagePrompt.id ? 'Remove Opportunity Stage' : 'Opportunity Stage'} onClose={() => setStagePrompt(null)}>
          <div className="stack">
            {opportunityStageId === stagePrompt.id ? (
              <>
                <p className="modal-text">Do you want to remove opportunity from {stagePrompt.name} stage?</p>
                <PanelActions>
                  <button className="button secondary" onClick={() => setStagePrompt(null)}>Cancel</button>
                  {opportunityStageMode === 'custom' && <button className="button secondary" onClick={() => { setCustomBuilderStage(stagePrompt); setStagePrompt(null); }}>Edit Form</button>}
                  <button className="button danger" onClick={() => { setOpportunityStageConfig({ id: '', name: '', mode: 'standard', fields: [], records: [] }); setDynamicStagePage(''); setActiveStagePage(''); setStagePrompt(null); setMessage('Opportunity stage removed.'); }}>Remove Opportunity</button>
                </PanelActions>
              </>
            ) : (
              <>
                <p className="modal-text">Do you want to make this stage as a Opportunity stage?</p>
                <PanelActions>
                  <button className="button secondary" onClick={() => setStagePrompt(null)}>No</button>
                  <button className="button primary" onClick={() => { setStageFormChoice(stagePrompt); setStagePrompt(null); }}>Yes</button>
                </PanelActions>
              </>
            )}
          </div>
        </Modal>
      )}
      {stageFormChoice && (
        <Modal title={`${stageFormChoice.name} Form Type`} onClose={() => setStageFormChoice(null)}>
          <div className="form-choice-grid">
            <button type="button" className="choice-card" onClick={() => openStandardPreview(stageFormChoice)}>
              <strong>Standard Form</strong>
              <span>Use the existing opportunity details form.</span>
            </button>
            <button type="button" className="choice-card" onClick={() => openCustomBuilder(stageFormChoice)}>
              <strong>Create New Form</strong>
              <span>Create custom fields and data types.</span>
            </button>
          </div>
          {opportunityStageMode === 'custom' && (
            <div className="custom-builder">
              <div className="form-grid custom-field-grid">
                <TextField label="Field Name*" value={fieldDraft.label} onChange={(label) => setFieldDraft({ ...fieldDraft, label })} />
                <SelectField label="Data Type" value={fieldDraft.type} options={customFieldTypes} onChange={(type) => setFieldDraft({ ...fieldDraft, type })} />
                <SelectField label="Required" value={fieldDraft.required} options={['Yes', 'No']} onChange={(required) => setFieldDraft({ ...fieldDraft, required })} />
                <PanelActions>
                  <button type="button" className="button secondary" onClick={addCustomField}><Plus size={16} />Add Field</button>
                </PanelActions>
              </div>
              <div className="field-chip-row">
                {customFields.map((field) => <span key={field.id} className="field-chip">{field.label} · {field.type}</span>)}
              </div>
              <PanelActions>
                <button className="button secondary" onClick={() => setStageFormChoice(null)}>Cancel</button>
                <button className="button primary" onClick={saveCustomStageForm}>Save Custom Form</button>
              </PanelActions>
            </div>
          )}
        </Modal>
      )}
      {customBuilderStage && (
        <Modal title="Create your Custom New Form" onClose={() => setCustomBuilderStage(null)}>
          <div className="custom-builder">
            <div className="form-grid custom-field-grid">
              <TextField label="Field Name*" value={fieldDraft.label} onChange={(label) => setFieldDraft({ ...fieldDraft, label })} />
              <SelectField label="Data Type" value={fieldDraft.type} options={customFieldTypes} onChange={(type) => setFieldDraft({ ...fieldDraft, type })} />
              <SelectField label="Required" value={fieldDraft.required} options={['Yes', 'No']} onChange={(required) => setFieldDraft({ ...fieldDraft, required })} />
              <PanelActions>
                <button type="button" className="button secondary" onClick={addCustomField}><Plus size={16} />{editingFieldId ? 'Update Field' : 'Add Field'}</button>
              </PanelActions>
            </div>
            <div className="custom-fields-table">
              {customFields.length > 0 ? customFields.map((field) => (
                <div key={field.id} className="custom-field-row">
                  <div>
                    <strong>{field.label}</strong>
                    <span className="custom-field-meta">
                      <span>{field.type}</span>
                      <span>{field.required === 'Yes' ? 'Required' : 'Optional'}</span>
                    </span>
                  </div>
                  <div className="row-menu-actions">
                    <IconButton label="Edit Field" onClick={() => editCustomField(field)}><Edit size={15} /></IconButton>
                    <IconButton label="Delete Field" onClick={() => deleteCustomField(field.id)}><Trash2 size={15} /></IconButton>
                  </div>
                </div>
              )) : <div className="empty-field-row">No fields created yet.</div>}
            </div>
            {customBuilderError && <div className="custom-builder-error" role="alert">{customBuilderError}</div>}
            <PanelActions>
              <button className="button secondary" onClick={() => setCustomBuilderStage(null)}>Cancel</button>
              <button className="button primary" onClick={saveCustomStageForm}>Save Custom Form</button>
            </PanelActions>
          </div>
        </Modal>
      )}
      {deleteStage && <Confirm danger title="Delete Stage" text={`Delete stage "${deleteStage.name}"? Stages with opportunities will prompt for card reassignment.`} confirmLabel="Delete" onCancel={() => setDeleteStage(null)} onConfirm={confirmDeleteStage} />}
      {pendingMove && <Confirm title="Move Opportunity" text={`${pendingMove.name}: ${pendingMove.from} to ${pendingMove.to}`} confirmLabel="Move" onCancel={() => setPendingMove(null)} onConfirm={confirmMove} />}

      {/* Center Details Modal */}
      {activeDrawerCard && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            padding: '20px',
            pointerEvents: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveDrawerCard(null);
              setDrawerMode(null);
            }
          }}
        >
          <aside
            style={{
              position: 'relative',
              zIndex: 10001,
              width: '740px',
              maxWidth: '96vw',
              maxHeight: '90vh',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              gap: '16px',
              overflow: 'hidden',
              pointerEvents: 'auto',
            }}
          >
            <header className="lf-drawer-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5eaf1', paddingBottom: '12px' }}>
              <h3 className="font-weight-semibold" style={{ margin: 0, fontSize: '18px' }}>
                {activeDrawerCard.type === 'lead' ? 'Lead Details' : 'Opportunity Details'}
              </h3>
              <button 
                type="button" 
                className="close-button" 
                onClick={() => { setActiveDrawerCard(null); setDrawerMode(null); }}
                style={{ border: 0, background: 'transparent', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </header>
            
            <div className="drawer-body" style={{ flex: 1, overflowY: 'auto' }}>
              {drawerMode === 'view' ? (
                <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeDrawerCard.type === 'lead' ? (
                    <>
                      <DetailGrid items={[
                        ['Lead ID', activeDrawerCard.record.clientId || activeDrawerCard.record.id],
                        ['Full Name', activeDrawerCard.record.customer],
                        ['Company', activeDrawerCard.record.company || 'Not added'],
                        ['Phone', activeDrawerCard.record.phone || 'Not added'],
                        ['Email', activeDrawerCard.record.email || 'Not added'],
                        ['Lead Source', activeDrawerCard.record.source || 'Website'],
                        ['Priority', activeDrawerCard.record.priority || 'Medium'],
                        ['Pipeline', pipelinesList.find(p => p.id === activeDrawerCard.record.pipeline)?.name || 'Standard Pipeline'],
                        ['Stage', activeDrawerCard.record.status || 'New'],
                        ['Assigned Salesperson', getOwnerName(activeDrawerCard.record.owner)],
                      ]} />
                      <DetailBlock title="Notes" text={activeDrawerCard.record.notes || 'No notes added.'} />
                      {canEdit && (
                        <PanelActions style={{ marginTop: '16px' }}>
                          <button className="button success" onClick={() => {
                            const lead = activeDrawerCard.record;
                            const convStage = stageList.find(s => s.stage_type === 'CONVERSION');
                            const stageId = convStage ? convStage.id : (lead.pipeline_stage || stageList[0]?.id);
                            openConversionModal(lead, stageId);
                            setActiveDrawerCard(null);
                          }}>
                            Convert Lead
                          </button>
                          <button className="button primary" onClick={() => setDrawerMode('edit')}>
                            Edit Details
                          </button>
                        </PanelActions>
                      )}
                    </>
                  ) : (
                    <>
                      <DetailGrid items={[
                        ['Opportunity ID', activeDrawerCard.record.id],
                        ['Related Company', activeDrawerCard.record.company || 'None'],
                        ['Primary Contact', activeDrawerCard.record.name || 'None'],
                        ['Deal Amount', formatCurrency(activeDrawerCard.record.value || 0)],
                        ['Expected Close Date', activeDrawerCard.record.closeDate || '-'],
                        ['Probability', (activeDrawerCard.record.probability != null ? activeDrawerCard.record.probability : (stageProbability[activeDrawerCard.record.stage] ?? 10)) + '%'],
                        ['Pipeline', pipelinesList.find(p => p.id === activeDrawerCard.record.pipeline)?.name || 'Standard Pipeline'],
                        ['Stage', activeDrawerCard.record.stage || 'New'],
                        ['Assigned Salesperson', getOwnerName(activeDrawerCard.record.owner)],
                        ...(activeDrawerCard.record.stage.toUpperCase() === 'LOST' && activeDrawerCard.record.notes ? [['Lost Reason', activeDrawerCard.record.notes]] : []),
                      ]} />
                      <DetailBlock title="Notes / Description" text={activeDrawerCard.record.notes || 'No notes added.'} />
                      {canEdit && (
                        <PanelActions style={{ marginTop: '16px' }}>
                          <button className="button primary" onClick={() => setDrawerMode('edit')}>
                            Edit Details
                          </button>
                        </PanelActions>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <form 
                  className="form-grid" 
                  style={{ display: 'grid', gap: '16px' }}
                  onSubmit={activeDrawerCard.type === 'lead' ? saveLeadDrawer : saveOpportunityDrawer}
                >
                  {activeDrawerCard.type === 'lead' ? (
                    <>
                      <TextField label="Full Name*" value={drawerForm.customer} onChange={(val) => setDrawerForm({ ...drawerForm, customer: val })} />
                      <TextField label="Phone Number*" value={drawerForm.phone} onChange={(val) => setDrawerForm({ ...drawerForm, phone: val })} />
                      <TextField label="Email" value={drawerForm.email} onChange={(val) => setDrawerForm({ ...drawerForm, email: val })} />
                      <TextField label="Company" value={drawerForm.company} onChange={(val) => setDrawerForm({ ...drawerForm, company: val })} />
                      
                      <SelectField 
                        label="Lead Source" 
                        value={drawerForm.source} 
                        options={leadSources.filter(s => s !== 'All')} 
                        onChange={(val) => setDrawerForm({ ...drawerForm, source: val })} 
                      />
                      
                      <SelectField 
                        label="Priority" 
                        value={drawerForm.priority} 
                        options={priorities.filter(p => p !== 'All')} 
                        onChange={(val) => setDrawerForm({ ...drawerForm, priority: val })} 
                      />

                      <SelectField 
                        label="Pipeline" 
                        value={pipelinesList.find(p => p.id === drawerForm.pipeline)?.name || ''} 
                        options={pipelinesList.map(p => p.name)} 
                        onChange={async (val) => {
                          const selectedPipe = pipelinesList.find(p => p.name === val);
                          if (selectedPipe) {
                            const newStages = await fetchDrawerStages(selectedPipe.id);
                            setDrawerStages(newStages);
                            const leadStages = newStages.filter(s => s.entity_type === 'LEAD' || s.stage_type === 'CONVERSION' || s.stage_type === 'LOST');
                            setDrawerForm({
                              ...drawerForm,
                              pipeline: selectedPipe.id,
                              pipeline_stage: leadStages[0]?.id || '',
                            });
                          }
                        }} 
                      />

                      <SelectField 
                        label="Pipeline Stage" 
                        value={drawerStages.find(s => String(s.id) === String(drawerForm.pipeline_stage))?.name || ''} 
                        options={drawerStages.filter(s => s.entity_type === 'LEAD' || s.stage_type === 'CONVERSION' || s.stage_type === 'LOST').map(s => s.name)} 
                        onChange={(val) => {
                          const selectedStage = drawerStages.find(s => s.name === val);
                          if (selectedStage) {
                            setDrawerForm({ ...drawerForm, pipeline_stage: selectedStage.id });
                          }
                        }} 
                      />

                      <SearchableSelect 
                        label="Assigned Salesperson" 
                        value={getOwnerName(drawerForm.owner)} 
                        options={
                          (currentUser && !canAssignToOthers('leads'))
                            ? [currentUser.full_name || currentUser.username]
                            : availableUsers.map(u => u.full_name || u.username)
                        } 
                        onChange={(val) => {
                          const found = availableUsers.find(u => (u.full_name || u.username) === val);
                          setDrawerForm({ ...drawerForm, owner: found ? found.id : '' });
                        }}
                        placeholder="Search salesperson" 
                        disabled={currentUser && !canAssignToOthers('leads')}
                      />

                      <TextArea label="Notes" value={drawerForm.notes} onChange={(val) => setDrawerForm({ ...drawerForm, notes: val })} />
                    </>
                  ) : (
                    <>
                      <TextField label="Opportunity Name*" value={drawerForm.dealName} onChange={(val) => setDrawerForm({ ...drawerForm, dealName: val })} />
                      <TextField label="Deal Amount ($)*" value={drawerForm.value} onChange={(val) => setDrawerForm({ ...drawerForm, value: val })} />
                      <TextField type="date" label="Expected Close Date*" value={drawerForm.closeDate} onChange={(val) => setDrawerForm({ ...drawerForm, closeDate: val })} />

                      <SelectField 
                        label="Pipeline" 
                        value={pipelinesList.find(p => p.id === drawerForm.pipeline)?.name || ''} 
                        options={pipelinesList.map(p => p.name)} 
                        onChange={async (val) => {
                          const selectedPipe = pipelinesList.find(p => p.name === val);
                          if (selectedPipe) {
                            const newStages = await fetchDrawerStages(selectedPipe.id);
                            setDrawerStages(newStages);
                            const oppStages = newStages.filter(s => s.entity_type === 'OPPORTUNITY' || s.stage_type === 'CONVERSION' || s.stage_type === 'LOST');
                            setDrawerForm({
                              ...drawerForm,
                              pipeline: selectedPipe.id,
                              pipeline_stage: oppStages[0]?.id || '',
                            });
                          }
                        }} 
                      />

                      <SelectField 
                        label="Stage*" 
                        value={drawerStages.find(s => String(s.id) === String(drawerForm.pipeline_stage))?.name || ''} 
                        options={drawerStages.filter(s => s.entity_type === 'OPPORTUNITY' || s.stage_type === 'CONVERSION' || s.stage_type === 'LOST').map(s => s.name)} 
                        onChange={(val) => {
                          const selectedStage = drawerStages.find(s => s.name === val);
                          if (selectedStage) {
                            setDrawerForm({ ...drawerForm, pipeline_stage: selectedStage.id });
                          }
                        }} 
                      />

                      {drawerStages.find(s => String(s.id) === String(drawerForm.pipeline_stage))?.stage_type === 'LOST' && (
                        <TextField label="Lost Reason*" value={drawerForm.lost_reason} onChange={(val) => setDrawerForm({ ...drawerForm, lost_reason: val })} />
                      )}

                      <SearchableSelect 
                        label="Assigned Salesperson*" 
                        value={getOwnerName(drawerForm.owner)} 
                        options={
                          (currentUser && !canAssignToOthers('opportunities'))
                            ? [currentUser.full_name || currentUser.username]
                            : availableUsers.map(u => u.full_name || u.username)
                        } 
                        onChange={(val) => {
                          const found = availableUsers.find(u => (u.full_name || u.username) === val);
                          setDrawerForm({ ...drawerForm, owner: found ? found.id : '' });
                        }}
                        placeholder="Search salesperson" 
                        disabled={currentUser && !canAssignToOthers('opportunities')}
                      />

                      <TextArea label="Notes / Description" value={drawerForm.notes} onChange={(val) => setDrawerForm({ ...drawerForm, notes: val })} />
                    </>
                  )}
                  
                  <PanelActions wide>
                    <button type="button" className="button secondary" onClick={() => setDrawerMode('view')}>Cancel</button>
                    <button type="submit" className="button primary">Save Changes</button>
                  </PanelActions>
                </form>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Unified Lead Conversion Modal */}
      {conversionModalOpen && (
        <Modal 
          className="convert-opportunity-modal" 
          title="Convert Lead to Opportunity" 
          onClose={() => { setConversionModalOpen(false); setConvertingLeadId(null); setConvertingLeadStageId(null); }}
        >
          <form className="convert-opportunity-form" onSubmit={submitConversion}>
            <section className="convert-linked-summary" aria-label="Auto-linked records summary" style={{ background: '#f8fafc', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>
                Auto-Linked Records Summary
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Company to Link/Create</span>
                  <strong>{opportunityForm.company || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Contact to Link/Create</span>
                  <strong>{opportunityForm.contact || '-'}</strong>
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                  <span style={{ color: '#64748b', display: 'block' }}>Assigned Salesperson</span>
                  <strong>{getOwnerName(opportunityForm.owner)}</strong>
                </div>
              </div>
            </section>

            <TextField label="Deal Name*" value={opportunityForm.dealName} onChange={(val) => updateOpportunityField('dealName', val)} />
            <TextField label="Deal Amount ($)*" value={opportunityForm.value} onChange={(val) => updateOpportunityField('value', val)} />
            <TextField type="date" label="Expected Close Date*" value={opportunityForm.closeDate} onChange={(val) => updateOpportunityField('closeDate', val)} />
            <TextArea label="Description" value={opportunityForm.notes} onChange={(val) => updateOpportunityField('notes', val)} />

            {isCustomFormActive && customFields.length > 0 && (
              <div className="custom-fields-section" style={{ marginTop: '16px', borderTop: '1px solid #e5eaf1', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>
                  Custom Opportunity Information
                </h4>
                {customFields.map((field) => (
                  <label key={field.id} className={`field ${customErrors.includes(field.label) ? 'field-error' : ''}`} style={{ display: 'block', marginBottom: '12px' }}>
                    <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      {field.label}{field.required ? '*' : ''}
                    </span>
                    {renderCustomDropInput(field)}
                  </label>
                ))}
              </div>
            )}

            <PanelActions wide>
              <button 
                type="button" 
                className="button secondary" 
                onClick={() => { setConversionModalOpen(false); setConvertingLeadId(null); setConvertingLeadStageId(null); }}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">Convert & Create Opportunity</button>
            </PanelActions>
          </form>
        </Modal>
      )}

      {/* Stage card reassignment modal */}
      {reassignModalOpen && deleteStage && (
        <Modal 
          title="Reassign Stage Cards" 
          onClose={() => { setReassignModalOpen(false); setDeleteStage(null); setReassignStageId(''); }}
        >
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p className="modal-text">
              Stage <strong>"{deleteStage.name}"</strong> contains active cards. Please select another stage to reassign them to:
            </p>
            <SelectField
              label="Reassignment Stage Target*"
              value={reassignStageId ? stageList.find(s => String(s.id) === String(reassignStageId))?.name || '' : ''}
              options={stageList.filter(s => s.id !== deleteStage.id).map(s => s.name)}
              onChange={(val) => {
                const target = stageList.find(s => s.name === val);
                if (target) setReassignStageId(target.id);
              }}
            />
            <PanelActions>
              <button 
                type="button" 
                className="button secondary" 
                onClick={() => { setReassignModalOpen(false); setDeleteStage(null); setReassignStageId(''); }}
              >
                Cancel
              </button>
              <button type="button" className="button primary" onClick={confirmReassignDelete}>
                Reassign & Delete Stage
              </button>
            </PanelActions>
          </div>
        </Modal>
      )}
      <PipelineKanbanBoard
        isCardEditable={isCardEditable}
        stages={stageList}
        leads={stageLeads}
        opportunities={filtered}
        dragged={dragged}
        draggedLead={draggedLead}
        setDragged={setDragged}
        setDraggedLead={setDraggedLead}
        setLeads={setLeads}
        setOpportunities={setOpportunities}
        moveLeadToStage={moveLeadToStage}
        openItemOpportunityStage={openItemOpportunityStage}
        formatCurrency={formatCurrency}
        getOwnerName={getOwnerName}
        setSelected={(record) => handleCardClick('opportunity', record)}
        setSelectedLead={(record) => handleCardClick('lead', record)}
      />
    </section>
  );
}

function OpportunityStageSummaryStrip({ records, stageName }) {
  const totalAmount = records.reduce((sum, record) => (
    sum + Number(String(record.amount || record.values?.value || 0).replace(/[^0-9.-]/g, ''))
  ), 0);

  return (
    <section className="crm-summary-strip company-summary-strip" aria-label="Opportunity stage summary">
      <article>
        <span>Total Opportunities</span>
        <strong>{records.length}</strong>
      </article>
      <article>
        <span>Stage</span>
        <strong className="company-summary-blue">{stageName}</strong>
      </article>
      <article>
        <span>Open Deals</span>
        <strong className="company-summary-green">{records.length}</strong>
      </article>
      <article>
        <span>Total Amount</span>
        <strong className="company-summary-cyan">{formatCurrency(totalAmount)}</strong>
      </article>
    </section>
  );
}

function OpportunityStageDetailPage({ record, onBack, onEdit, stageName }) {
  return (
    <div className="lf-page leads-page company-record-page">
      <section className="payment-record-detail company-record-detail" aria-label="Opportunity details">
        <header className="payment-record-header">
          <button type="button" className="payment-record-back" aria-label="Back" title="Back" onClick={onBack}><ArrowLeft size={22} /></button>
          <div>
            <h2>{record.dealName || 'Opportunity Detail'}</h2>
            <p>{record.opportunityId || record.id || '-'} / {record.company || '-'}</p>
          </div>
          <button className="payment-record-edit" type="button" onClick={onEdit}>Edit</button>
        </header>

        <section className="payment-record-summary" aria-label="Opportunity summary">
          <div>
            <span>Opportunity ID</span>
            <strong>{record.opportunityId || record.id || '-'}</strong>
          </div>
          <div>
            <span>Stage</span>
            <strong>{record.stage || stageName || '-'}</strong>
          </div>
          <div>
            <span>Deal Amount</span>
            <strong>{record.amount || '-'}</strong>
          </div>
          <div>
            <span>Close Date</span>
            <strong>{record.closeDate || '-'}</strong>
          </div>
        </section>

        <div className="payment-record-sections lead-primary-sections">
          <section className="payment-record-section">
            <h3>Opportunity Information</h3>
            <dl>
              <div><dt>Opportunity ID</dt><dd>{record.opportunityId || record.id || '-'}</dd></div>
              <div><dt>Deal Name</dt><dd>{record.dealName || '-'}</dd></div>
              <div><dt>Company</dt><dd>{record.company || '-'}</dd></div>
              <div><dt>Contact</dt><dd>{record.contact || '-'}</dd></div>
              <div><dt>Deal Amount</dt><dd>{record.amount || '-'}</dd></div>
              <div><dt>Expected Close Date</dt><dd>{record.closeDate || '-'}</dd></div>
              <div><dt>Stage</dt><dd>{record.stage || stageName || '-'}</dd></div>
              <div><dt>Assigned Salesperson</dt><dd>{record.owner || '-'}</dd></div>
              <div><dt>Created Date</dt><dd>{record.date || record.createdAt || '-'}</dd></div>
              <div><dt>Status</dt><dd>{record.status || 'Active'}</dd></div>
              <div><dt>Description</dt><dd>{record.description || '-'}</dd></div>
            </dl>
          </section>
        </div>
      </section>
    </div>
  );
}

function PipelineKanbanBoard({ 
  isCardEditable,
  stages, 
  leads, 
  opportunities, 
  dragged, 
  draggedLead, 
  setDragged, 
  setDraggedLead, 
  setLeads, 
  setOpportunities, 
  moveLeadToStage, 
  openItemOpportunityStage, 
  formatCurrency,
  getOwnerName,
  setSelected,
  setSelectedLead
}) {
  const allowDrop = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const moveToStage = (stageId, event) => {
    const payload = event?.dataTransfer?.getData('application/json');
    let droppedLead = draggedLead;
    let droppedOpportunity = dragged;

    if (payload && !droppedLead && !droppedOpportunity) {
      try {
        const parsed = JSON.parse(payload);
        if (parsed.type === 'lead') {
          droppedLead = leads.find((lead) => lead.id === parsed.id);
        }
        if (parsed.type === 'opportunity') {
          droppedOpportunity = opportunities.find((opportunity) => opportunity.id === parsed.id);
        }
      } catch {
        // Ignore
      }
    }

    if (droppedLead) {
      if (moveLeadToStage) {
        moveLeadToStage(droppedLead, stageId);
        return;
      }
    }
    if (droppedOpportunity) {
      if (openItemOpportunityStage) {
        openItemOpportunityStage(droppedOpportunity, stageId);
        return;
      }
    }
  };

  const getNormalizedStageClass = (stageName) => {
    const name = (stageName || '').toLowerCase();
    if (name.includes('new')) return 'new';
    if (name.includes('contacted')) return 'contacted';
    if (name.includes('follow')) return 'followup';
    if (name.includes('qualified')) return 'qualified';
    if (name.includes('proposal')) return 'proposal';
    if (name.includes('negotiation')) return 'negotiation';
    if (name.includes('won')) return 'won';
    if (name.includes('lost')) return 'lost';
    return 'new';
  };

  return (
    <section className="pipeline-kanban-board" aria-label="Pipeline stage board">
      {stages.map((stage) => {
        const stageLeads = leads.filter((lead) => {
          if (lead.pipeline_stage) return lead.pipeline_stage === stage.id;
          return lead.status === stage.name;
        });
        const stageOpportunities = opportunities.filter((opportunity) => {
          if (opportunity.pipeline_stage) return opportunity.pipeline_stage === stage.id;
          return opportunity.stage === stage.name;
        });
        const cards = [
          ...stageLeads.map((lead) => ({ type: 'lead', record: lead })),
          ...stageOpportunities.map((opportunity) => ({ type: 'opportunity', record: opportunity })),
        ];

        const normClass = getNormalizedStageClass(stage.name);

        return (
          <section
            key={stage.id}
            className="pipeline-kanban-column"
            onDragEnter={allowDrop}
            onDragOver={allowDrop}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              moveToStage(stage.id, event);
            }}
          >
            <header className="pipeline-kanban-column-head">
              <h3 className={`pipeline-stage-title-${normClass}`}>{stage.name}</h3>
              <span className={`column-count-badge pipeline-stage-badge-${normClass}`}>{cards.length}</span>
            </header>
            <div
              className="pipeline-kanban-card-list"
              onDragEnter={allowDrop}
              onDragOver={allowDrop}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                moveToStage(stage.id, event);
              }}
            >
              {cards.length === 0 && (
                <div className="pipeline-empty-drop-zone">
                  Drop lead here
                </div>
              )}
              {cards.map(({ type, record }) => {
                const ownerName = getOwnerName ? getOwnerName(record.owner) : (record.owner || 'Unassigned');
                const editable = isCardEditable ? isCardEditable(record, type) : true;
                return (
                  <article
                    key={`${type}-${record.id}`}
                    className={`pipeline-kanban-card ${!editable ? 'pipeline-kanban-card--locked' : ''}`}
                    draggable={editable}
                    onDragStart={(event) => {
                      if (!editable) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', `${type}:${record.id}`);
                      event.dataTransfer.setData('application/json', JSON.stringify({ type, id: record.id }));
                      if (type === 'lead') {
                        setDraggedLead(record);
                        setDragged(null);
                      } else {
                        setDragged(record);
                        setDraggedLead(null);
                      }
                    }}
                  >
                    <div className="pipeline-card-header-row">
                      <span className={`pipeline-card-badge pipeline-card-badge--${type}`}>
                        {type}
                      </span>
                      <span className="pipeline-card-id">
                        #{record.backendId || record.id}
                      </span>
                      {!editable && <span className="pipeline-card-lock-badge">🔒 Locked</span>}
                    </div>

                    <h4 
                      className="pipeline-card-name" 
                      onClick={() => type === 'lead' ? setSelectedLead(record) : setSelected(record)}
                    >
                      {type === 'lead' ? record.customer : record.name}
                    </h4>

                    <p className="pipeline-card-company">
                      {record.company || 'No company added'}
                    </p>

                    <div className="pipeline-card-details">
                      {type === 'lead' ? (
                        <div className="pipeline-card-detail-line">
                          <strong>Owner:</strong> {ownerName}
                        </div>
                      ) : (
                        <>
                          <div className="pipeline-card-detail-line">
                            <strong>Amount:</strong> {formatCurrency(record.value || 0)}
                          </div>
                          <div className="pipeline-card-detail-line">
                            <strong>Close Date:</strong> {record.closeDate || '-'}
                          </div>
                          <div className="pipeline-card-detail-line">
                            <strong>Probability:</strong> {record.probability != null ? record.probability + '%' : '10%'}
                          </div>
                          <div className="pipeline-card-detail-line">
                            <strong>Owner:</strong> {ownerName}
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </section>
  );
}

