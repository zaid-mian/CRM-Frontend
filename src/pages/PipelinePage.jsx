import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Edit, FileCog, FileText, Filter, Lock, MoreHorizontal, Pin, Plus, Settings, Trash2, Users } from 'lucide-react';
import { Confirm, DetailBlock, DetailGrid, HighlightedText, IconButton, Modal, PanelActions, SearchableSelect, SearchBox, SelectField, TextField } from '../components/ui';
import { assignLeadOptions, companies, emptyLead, leadSources, owners, priorities, products, stages } from '../data/crmData';
import { formatCurrency } from '../utils/format';
import CompaniesPage from './CompaniesPage';
import ContactsPage from './ContactsPage';

const standardPipelineStageNames = ['New', 'Contacted', 'Confirm', 'Proposal', 'Negotiation', 'Won', 'Lost'];

const standardStageDescriptions = {
  New: 'Initial contact pending',
  Contacted: 'Outreach initiated',
  Confirm: 'Requirements gathered',
  Proposal: 'Quote delivered to client',
  Negotiation: 'Finalizing terms',
  Won: 'Deal closed successfully',
  Lost: 'Deal lost or abandoned',
};

const makeStandardStageList = () => standardPipelineStageNames.map((stage) => ({
  id: stage,
  name: stage,
  owner: owners.find((item) => item !== 'All') || 'Ali Raza',
}));

const customFieldTypes = ['Short Text', 'Long Text', 'Number', 'Date', 'Checkbox', 'Dropdown'];

const getCustomFieldInputType = (type) => (
  type === 'Date' ? 'date' : type === 'Number' ? 'number' : 'text'
);

const normalizeCustomFieldType = (type) => (type === 'Text' ? 'Short Text' : type);

const pipelineDummyLeads = [
  { id: 'DLD-2001', clientId: 'CL-2004', customer: 'Omar Farooq', company: 'Cedar Labs', phone: '+92 333 4455667', owner: 'Ali Raza', priority: 'Medium', status: 'New' },
  { id: 'DLD-2002', clientId: 'CL-2005', customer: 'Sana Mir', company: 'Metro Health', phone: '+92 321 1122445', owner: 'Sara Ahmed', priority: 'High', status: 'Contacted' },
  { id: 'DLD-2003', clientId: 'CL-2006', customer: 'Bilal Khan', company: 'Northstar Foods', phone: '+92 300 7788991', owner: 'Ali Raza', priority: 'Low', status: 'Confirm' },
  { id: 'DLD-2004', clientId: 'CL-2007', customer: 'Nadia Sheikh', company: 'Cedar Labs', phone: '+92 333 2211009', owner: 'Sara Ahmed', priority: 'Medium', status: 'Proposal' },
  { id: 'DLD-2005', clientId: 'CL-2008', customer: 'Tariq Mehmood', company: 'Metro Health', phone: '+92 321 6677889', owner: 'Ali Raza', priority: 'High', status: 'Negotiation' },
  { id: 'DLD-2006', clientId: 'CL-2009', customer: 'Hira Nadeem', company: 'Cedar Labs', phone: '+92 333 1122334', owner: 'Sara Ahmed', priority: 'Low', status: 'Won' },
  { id: 'DLD-2007', clientId: 'CL-2010', customer: 'Zain Qureshi', company: 'Northstar Foods', phone: '+92 300 9988776', owner: 'Ali Raza', priority: 'Medium', status: 'Lost' },
  { id: 'DLD-2008', clientId: 'CL-2011', customer: 'Mehwish Ali', company: 'Metro Health', phone: '+92 321 4567890', owner: 'Sara Ahmed', priority: 'Medium', status: 'New' },
  { id: 'DLD-2009', clientId: 'CL-2012', customer: 'Danish Iqbal', company: 'Cedar Labs', phone: '+92 333 7654321', owner: 'Ali Raza', priority: 'High', status: 'Contacted' },
  { id: 'DLD-2010', clientId: 'CL-2013', customer: 'Rabia Noor', company: 'Northstar Foods', phone: '+92 300 5566778', owner: 'Sara Ahmed', priority: 'Low', status: 'Proposal' },
];


export default function PipelinePage({ leads, setLeads, opportunities, setOpportunities, setMessage, dynamicStagePage, setDynamicStagePage, activeStagePage, setActiveStagePage, opportunityStageConfig, setOpportunityStageConfig, canCreate = true, canEdit = true, canDelete = true }) {
  const [stageList, setStageList] = useState(makeStandardStageList);
  const [dummyPipelineLeads, setDummyPipelineLeads] = useState(pipelineDummyLeads);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ stage: 'All', owner: 'All', company: 'All', priority: 'All', product: 'All' });
  const [dragged, setDragged] = useState(null);
  const [draggedLead, setDraggedLead] = useState(null);
  const [draggedStageId, setDraggedStageId] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageForm, setStageForm] = useState({ name: '', owner: owners[1] });
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false);
  const [opportunityForm, setOpportunityForm] = useState({
    dealName: '',
    company: companies.find((item) => item !== 'All') || '',
    contact: '',
    value: '',
    closeDate: '',
    stage: 'New',
    owner: owners.find((item) => item !== 'All') || '',
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
  const [newPipelineStages, setNewPipelineStages] = useState([{ id: 'custom-stage-1', name: '' }]);
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
    { key: 'owner', label: 'Assigned Salesperson', kind: 'select', options: owners.filter((item) => item !== 'All') },
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

  const updateOpportunityField = (field, value) => {
    setOpportunityForm((current) => ({ ...current, [field]: value }));
    if (String(value).trim()) {
      setOpportunityErrors((current) => current.filter((error) => error !== opportunityFieldLabels[field]));
    }
  };
  const renderCustomDropInput = (field) => {
    const fieldType = normalizeCustomFieldType(field.type);
    const updateValue = (value) => {
      setCustomValues((current) => ({ ...current, [field.id]: value }));
      setCustomErrors((current) => current.filter((id) => id !== field.id));
    };

    if (fieldType === 'Long Text') {
      return <textarea rows="4" value={customValues[field.id] || ''} onChange={(event) => updateValue(event.target.value)} />;
    }

    if (fieldType === 'Checkbox') {
      return (
        <label className="custom-checkbox-field">
          <input type="checkbox" checked={customValues[field.id] === 'Yes'} onChange={(event) => updateValue(event.target.checked ? 'Yes' : '')} />
          <span>Yes</span>
        </label>
      );
    }

    if (fieldType === 'Dropdown') {
      return (
        <select value={customValues[field.id] || ''} onChange={(event) => updateValue(event.target.value)}>
          <option value="">Select option</option>
          <option value="Option 1">Option 1</option>
          <option value="Option 2">Option 2</option>
          <option value="Option 3">Option 3</option>
        </select>
      );
    }

    return <input type={getCustomFieldInputType(fieldType)} value={customValues[field.id] || ''} onChange={(event) => updateValue(event.target.value)} />;
  };

  const filtered = useMemo(() => opportunities
    .filter((item) => [item.id, item.name, item.company, item.contact, item.owner, item.stage, item.priority, item.product, item.closeDate]
      .some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())))
    .filter((item) => filters.stage === 'All' || item.stage === filters.stage)
    .filter((item) => filters.owner === 'All' || item.owner === filters.owner)
    .filter((item) => filters.company === 'All' || item.company === filters.company)
    .filter((item) => filters.priority === 'All' || item.priority === filters.priority)
    .filter((item) => filters.product === 'All' || item.product === filters.product), [opportunities, search, filters]);
  const stageLeads = useMemo(() => leads
    .filter((lead) => !lead.isConverted)
    .filter((lead) => [lead.clientId, lead.customer, lead.company, lead.phone, lead.email, lead.owner, lead.status, lead.priority]
      .some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (!duplicateLeadId) return 0;
      if (a.id === duplicateLeadId) return -1;
      if (b.id === duplicateLeadId) return 1;
      return 0;
    }), [leads, search, duplicateLeadId]);

  const totalValue = filtered.reduce((sum, item) => sum + item.value, 0);
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
    const usedNumbers = [
      ...opportunities.map((item) => item.id),
      ...stageRecords.map((record) => record.opportunityId || record.id),
    ]
      .map((id) => Number(String(id || '').match(/^OP-(\d+)$/)?.[1]))
      .filter(Number.isFinite);
    return `OP-${Math.max(3000, ...usedNumbers) + 1}`;
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
  const syncLeadStatus = (leadId, stageName) => {
    if (!leadId) return;
    setLeads((current) => current.map((lead) => lead.id === leadId
      ? { ...lead, status: stageName, lastActivity: `Pipeline stage: ${stageName}` }
      : lead));
    setDummyPipelineLeads((current) => current.map((lead) => lead.id === leadId
      ? { ...lead, status: stageName, lastActivity: `Pipeline stage: ${stageName}` }
      : lead));
  };
  const completeLeadConversion = (leadId, stageName) => {
    if (!leadId) return;
    setLeads((current) => current.map((lead) => lead.id === leadId
      ? { ...lead, status: stageName, isConverted: true, lastActivity: `Converted to opportunity: ${stageName}` }
      : lead));
    setDummyPipelineLeads((current) => current.filter((lead) => lead.id !== leadId));
  };
  const resolveLeadOwner = (assignLead) => assignLead === 'Decide Later' ? 'Not Assign' : assignLead;
  const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
  const getNextClientId = (currentLeads) => {
    const allIds = currentLeads.map((record) => Number(String(record.clientId || '').replace('CL-', ''))).filter(Number.isFinite);
    return `CL-${Math.max(1000, ...allIds) + 1}`;
  };
  const openNewLead = () => {
    setLeadForm(emptyLead);
    setDuplicateLeadId(null);
    setLeadModalOpen(true);
  };
  const saveLead = (event) => {
    event.preventDefault();
    if (!leadForm.customer.trim() || !leadForm.phone.trim()) {
      setMessage('Full Name and Phone Number are required.');
      return;
    }
    const duplicateLead = leads.find((lead) => normalizePhone(lead.phone) === normalizePhone(leadForm.phone));
    if (duplicateLead) {
      setLeads((current) => [duplicateLead, ...current.filter((lead) => lead.id !== duplicateLead.id)]);
      setDuplicateLeadId(duplicateLead.id);
      setSearch('');
      setLeadModalOpen(false);
      setMessage('User already exists with this phone number.');
      return;
    }
    setLeads((current) => [{
      ...leadForm,
      id: `LD-${1000 + current.length + 1}`,
      clientId: getNextClientId(current),
      date: new Date().toISOString().slice(0, 10),
      owner: resolveLeadOwner(leadForm.assignLead),
      status: stageList[0]?.name || 'New',
      leadValue: 0,
      lastActivity: 'Lead created',
      nextFollowUp: '',
    }, ...current]);
    setLeadModalOpen(false);
    setMessage('Lead created successfully.');
  };

  const createStage = (event) => {
    event.preventDefault();
    const name = stageForm.name.trim();
    if (!name || !stageForm.owner) {
      setMessage('Stage Name and Owner are required.');
      return;
    }
    if (stageList.some((stage) => stage.id !== editingStage?.id && stage.name.toLowerCase() === name.toLowerCase())) {
      setMessage('Stage already exists.');
      return;
    }
    if (editingStage) {
      setStageList((current) => {
        const nextStages = current.map((stage) => stage.id === editingStage.id ? { ...stage, name, owner: stageForm.owner } : stage);
        if (activePipeline.type === 'custom') {
          setSavedCustomPipeline((currentPipeline) => currentPipeline ? { ...currentPipeline, stages: nextStages } : currentPipeline);
        }
        return nextStages;
      });
      setOpportunities((current) => current.map((item) => item.stage === editingStage.name ? { ...item, stage: name } : item));
      setMessage('Stage updated successfully.');
    } else {
      setStageList((current) => {
        const nextStages = [...current, { id: name, name, owner: stageForm.owner }];
        if (activePipeline.type === 'custom') {
          setSavedCustomPipeline((currentPipeline) => currentPipeline ? { ...currentPipeline, stages: nextStages } : currentPipeline);
        }
        return nextStages;
      });
      setMessage('Stage created successfully.');
    }
    setStageForm({ name: '', owner: owners[1] });
    setStageModalOpen(false);
    setEditingStage(null);
  };

  const openCreateStage = () => {
    setEditingStage(null);
    setStageForm({ name: '', owner: owners[1] });
    setStageModalOpen(true);
  };

  const openLeadOpportunity = (lead, stageName) => {
    if (isConfiguredOpportunityStage(stageName) && opportunityStageMode === 'custom') {
      setCustomErrors([]);
      setCustomValues(customFields.reduce((values, field) => ({ ...values, [field.id]: '' }), {}));
      setCustomDrop({ type: 'lead', lead, stageName });
      setDraggedLead(null);
      return;
    }
    setOpportunityErrors([]);
    setConvertingLeadId(lead.id);
    setOpportunityForm({
      dealName: makeInitialDealName(lead),
      company: lead.company || companies.find((item) => item !== 'All') || '',
      contact: lead.customer || '',
      value: lead.leadValue ? String(lead.leadValue) : '0.00',
      closeDate: lead.nextFollowUp || lead.expectedCloseDate || defaultOpportunityCloseDate(),
      stage: stageName,
      owner: lead.owner && lead.owner !== 'Not Assign' ? lead.owner : owners.find((item) => item !== 'All') || '',
      notes: lead.notes || '',
    });
    setOpportunityModalOpen(true);
    setDraggedLead(null);
  };

  const moveLeadToStage = (lead, stageName) => {
    if (isConfiguredOpportunityStage(stageName)) {
      openLeadOpportunity(lead, stageName);
      return;
    }
    syncLeadStatus(lead.id, stageName);
    setDraggedLead(null);
    setMessage('Lead stage updated successfully.');
  };

  const openItemOpportunityStage = (item, stageName) => {
    if (isConfiguredOpportunityStage(stageName) && opportunityStageMode === 'custom') {
      setCustomErrors([]);
      setCustomValues(customFields.reduce((values, field) => ({
        ...values,
        [field.id]: field.label.toLowerCase().includes('company') ? item.company : field.label.toLowerCase().includes('contact') ? item.contact : '',
      }), {}));
      setCustomDrop({ type: 'opportunity', item, stageName });
      setDragged(null);
      return;
    }
    if (isConfiguredOpportunityStage(stageName) && opportunityStageMode === 'standard') {
      setOpportunityErrors([]);
      setSelected(null);
      setConvertingLeadId(null);
      setEditingOpportunityId(item.id);
      setOpportunityForm({
        dealName: item.name,
        company: item.company,
        contact: item.contact,
        value: String(item.value),
        closeDate: item.closeDate,
        stage: stageName,
        owner: item.owner,
        notes: item.notes || '',
      });
      setOpportunityModalOpen(true);
      setDragged(null);
      return;
    }
    if (item.stage === stageName) {
      setDragged(null);
      return;
    }
    setOpportunities((current) => current.map((opportunity) => (
      opportunity.id === item.id ? { ...opportunity, stage: stageName } : opportunity
    )));
    syncLeadStatus(item.leadId, stageName);
    setDragged(null);
    setMessage('Opportunity stage updated successfully.');
  };

  const openEditOpportunity = (opportunity) => {
    setOpportunityErrors([]);
    setSelected(null);
    setConvertingLeadId(null);
    setEditingOpportunityId(opportunity.id);
    setOpportunityForm({
      dealName: opportunity.name,
      company: opportunity.company,
      contact: opportunity.contact,
      value: String(opportunity.value),
      closeDate: opportunity.closeDate,
      stage: opportunity.stage,
      owner: opportunity.owner,
      notes: opportunity.notes || '',
    });
    setOpportunityModalOpen(true);
  };

  const saveOpportunity = (event) => {
    event.preventDefault();
    const amount = Number(opportunityForm.value);
    const missing = [
      !opportunityForm.dealName.trim() && 'Deal Name',
      !opportunityForm.company && 'Related Company',
      !opportunityForm.contact.trim() && 'Primary Contact',
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
    const nextOpportunityId = editingOpportunityId || makeNextOpportunityId();
    const nextOpportunity = {
      name: opportunityForm.dealName.trim(),
      company: opportunityForm.company,
      contact: opportunityForm.contact,
      value: amount,
      priority: amount >= 800000 ? 'High' : amount >= 400000 ? 'Medium' : 'Low',
      closeDate: opportunityForm.closeDate,
      owner: opportunityForm.owner,
      stage: opportunityForm.stage,
      product: 'CRM Suite',
      notes: opportunityForm.notes,
      leadId: convertingLeadId || opportunities.find((item) => item.id === editingOpportunityId)?.leadId,
    };
    setOpportunities((current) => editingOpportunityId
      ? current.map((item) => item.id === editingOpportunityId ? { ...item, ...nextOpportunity } : item)
      : [{ id: nextOpportunityId, ...nextOpportunity }, ...current]);
    if (stageList.find((stage) => stage.id === opportunityStageId)?.name === opportunityForm.stage) {
      setStageRecords((current) => [{
        id: nextOpportunityId,
        opportunityId: nextOpportunityId,
        stage: opportunityForm.stage,
        date: new Date().toISOString().slice(0, 10),
        dealName: nextOpportunity.name,
        company: opportunityForm.company,
        contact: opportunityForm.contact,
        amount: formatCurrency(amount),
        closeDate: opportunityForm.closeDate,
        owner: opportunityForm.owner,
        description: opportunityForm.notes,
        leadId: convertingLeadId || opportunities.find((item) => item.id === editingOpportunityId)?.leadId,
        status: 'Active',
        sourceName: nextOpportunity.name,
        sourceId: editingOpportunityId || convertingLeadId || nextOpportunityId,
        createdAt: new Date().toISOString().slice(0, 10),
        values: {
          dealName: nextOpportunity.name,
          company: opportunityForm.company,
          contact: opportunityForm.contact,
          value: amount,
          closeDate: opportunityForm.closeDate,
          owner: opportunityForm.owner,
          description: opportunityForm.notes,
        },
      }, ...current]);
      setDynamicStagePage(opportunityForm.stage);
    }
    if (convertingLeadId) {
      completeLeadConversion(convertingLeadId, opportunityForm.stage);
    }
    setOpportunityModalOpen(false);
    setConvertingLeadId(null);
    setEditingOpportunityId(null);
    setMessage(editingOpportunityId ? 'Opportunity updated successfully.' : 'Opportunity created successfully.');
  };

  const openEditStage = (stage) => {
    setEditingStage(stage);
    setStageForm({ name: stage.name, owner: stage.owner === 'System' ? owners[1] : stage.owner });
    setStageModalOpen(true);
  };

  const openCreateManagedStage = () => {
    setEditingStage(null);
    setStageForm({ name: '', owner: owners.find((item) => item !== 'All') || 'Ali Raza' });
    setStageModalOpen(true);
  };

  const openRenamePipeline = () => {
    setPipelineNameDraft(activePipeline.name);
    setRenamePipelineOpen(true);
  };

  const savePipelineName = (event) => {
    event.preventDefault();
    const name = pipelineNameDraft.trim();
    if (!name) {
      setMessage('Pipeline name is required.');
      return;
    }
    setActivePipeline((current) => ({ ...current, name }));
    if (activePipeline.type === 'custom') {
      setSavedCustomPipeline((currentPipeline) => currentPipeline ? { ...currentPipeline, name } : currentPipeline);
      setNewPipelineName(name);
    }
    setRenamePipelineOpen(false);
    setMessage('Pipeline name updated.');
  };

  const setStageAsWon = (stage) => {
    setStageList((current) => {
      const nextStages = current.map((item) => (
        item.id === stage.id ? { ...item, role: 'won' } : { ...item, role: item.role === 'won' ? undefined : item.role }
      ));
      if (activePipeline.type === 'custom') {
        setSavedCustomPipeline((currentPipeline) => currentPipeline ? { ...currentPipeline, stages: nextStages } : currentPipeline);
      }
      return nextStages;
    });
  };

  const setStageAsLost = (stage) => {
    setStageList((current) => {
      const nextStages = current.map((item) => (
        item.id === stage.id ? { ...item, role: 'lost' } : { ...item, role: item.role === 'lost' ? undefined : item.role }
      ));
      if (activePipeline.type === 'custom') {
        setSavedCustomPipeline((currentPipeline) => currentPipeline ? { ...currentPipeline, stages: nextStages } : currentPipeline);
      }
      return nextStages;
    });
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

  const submitCustomDrop = (event) => {
    event.preventDefault();
    const missing = customFields
      .filter((field) => field.required === 'Yes' && !String(customValues[field.id] || '').trim())
      .map((field) => field.id);
    if (missing.length) {
      setCustomErrors(missing);
      return;
    }
    const source = customDrop?.lead || customDrop?.item;
    const nextOpportunityId = customDrop.type === 'lead' ? makeNextOpportunityId() : customDrop.item.id;
    const dealName = source?.name || makeInitialDealName(source || {});
    const amountField = customFields.find((field) => /amount|value|deal/i.test(field.label));
    const closeDateField = customFields.find((field) => /close|date/i.test(field.label));
    const amount = Number(customValues[amountField?.id] || source?.leadValue || source?.value || 0);
    const closeDate = customValues[closeDateField?.id] || source?.expectedCloseDate || source?.closeDate || defaultOpportunityCloseDate();
    setStageRecords((current) => [{
      id: nextOpportunityId,
      opportunityId: nextOpportunityId,
      stage: customDrop.stageName,
      date: new Date().toISOString().slice(0, 10),
      dealName,
      company: source?.company || '',
      contact: source?.customer || source?.contact || '',
      amount: amount ? formatCurrency(amount) : '',
      closeDate,
      owner: source?.owner || owners.find((item) => item !== 'All') || '',
      description: source?.notes || '',
      leadId: customDrop.type === 'lead' ? customDrop.lead.id : customDrop.item.leadId,
      sourceName: dealName,
      sourceId: source?.clientId || source?.id,
      createdAt: new Date().toISOString().slice(0, 10),
      values: customValues,
    }, ...current]);
    if (customDrop.type === 'lead') {
      setOpportunities((current) => [{
        id: nextOpportunityId,
        name: dealName,
        company: customDrop.lead.company || '',
        contact: customDrop.lead.customer || '',
        value: amount || Number(customDrop.lead.leadValue || 0),
        priority: (amount || Number(customDrop.lead.leadValue || 0)) >= 800000 ? 'High' : (amount || Number(customDrop.lead.leadValue || 0)) >= 400000 ? 'Medium' : 'Low',
        closeDate,
        owner: customDrop.lead.owner && customDrop.lead.owner !== 'Not Assign' ? customDrop.lead.owner : owners.find((item) => item !== 'All') || '',
        stage: customDrop.stageName,
        product: 'CRM Suite',
        notes: customDrop.lead.notes || '',
        leadId: customDrop.lead.id,
        customValues,
      }, ...current]);
      completeLeadConversion(customDrop.lead.id, customDrop.stageName);
    } else {
      setOpportunities((current) => current.map((item) => item.id === customDrop.item.id ? { ...item, stage: customDrop.stageName, customValues } : item));
      syncLeadStatus(customDrop.item.leadId, customDrop.stageName);
    }
    setCustomDrop(null);
    setDragged(null);
    setDraggedLead(null);
    setDynamicStagePage(customDrop.stageName);
    setMessage('Opportunity stage form saved successfully.');
  };

  const confirmDeleteStage = () => {
    setStageList((current) => {
      const nextStages = current.filter((stage) => stage.id !== deleteStage.id);
      if (activePipeline.type === 'custom') {
        setSavedCustomPipeline((currentPipeline) => currentPipeline ? { ...currentPipeline, stages: nextStages } : currentPipeline);
      }
      return nextStages;
    });
    setMessage('Stage deleted successfully.');
    setDeleteStage(null);
  };

  const confirmMove = () => {
    const movedOpportunity = opportunities.find((item) => item.id === pendingMove.id);
    setOpportunities((current) => current.map((item) => item.id === pendingMove.id ? { ...item, stage: pendingMove.to } : item));
    syncLeadStatus(movedOpportunity?.leadId, pendingMove.to);
    setMessage('Opportunity stage updated successfully.');
    setPendingMove(null);
    setDragged(null);
  };
  const moveStage = (targetStageId) => {
    if (!draggedStageId || draggedStageId === targetStageId) return;
    setStageList((current) => {
      const fromIndex = current.findIndex((stage) => stage.id === draggedStageId);
      const toIndex = current.findIndex((stage) => stage.id === targetStageId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      if (activePipeline.type === 'custom') {
        setSavedCustomPipeline((currentPipeline) => currentPipeline ? { ...currentPipeline, stages: next } : currentPipeline);
      }
      return next;
    });
    setDraggedStageId(null);
    setMessage('Pipeline stage order updated.');
  };

  const openPipelineSettings = () => {
    setPipelineSettingsStep('choose');
    setPipelineSettingsOpen(true);
  };

  const chooseStandardPipeline = () => {
    setActivePipeline({ type: 'standard', name: 'Standard Pipeline' });
    setStageList(makeStandardStageList());
    setFilters((current) => ({ ...current, stage: 'All' }));
    setPipelineSettingsOpen(false);
    setPipelineSettingsStep('choose');
    setMessage('Standard Pipeline selected.');
  };

  const startNewPipeline = () => {
    if (savedCustomPipeline) {
      setActivePipeline({ type: 'custom', name: savedCustomPipeline.name });
      setStageList(savedCustomPipeline.stages);
      setNewPipelineName(savedCustomPipeline.name);
      setNewPipelineStages(savedCustomPipeline.stages);
      setFilters((current) => ({ ...current, stage: 'All' }));
      setPipelineSettingsOpen(false);
      setPipelineSettingsStep('choose');
      setMessage(`${savedCustomPipeline.name} pipeline selected.`);
      return;
    }
    setNewPipelineName('');
    setNewPipelineStages([{ id: `custom-${Date.now()}-1`, name: '' }]);
    setPipelineSettingsStep('name');
  };

  const deleteSavedCustomPipeline = () => {
    setSavedCustomPipeline(null);
    setNewPipelineName('');
    setNewPipelineStages([{ id: `custom-${Date.now()}-1`, name: '' }]);
    if (activePipeline.type === 'custom') {
      setActivePipeline({ type: 'standard', name: 'Standard Pipeline' });
      setStageList(makeStandardStageList());
    }
    setPipelineSettingsStep('name');
    setMessage('Previous custom pipeline deleted. Create a new pipeline.');
  };

  const continueNewPipeline = () => {
    if (!newPipelineName.trim()) {
      setMessage('Pipeline name is required.');
      return;
    }
    setPipelineSettingsStep('stages');
  };

  const addNewPipelineStage = () => {
    setNewPipelineStages((current) => [
      ...current,
      { id: `custom-${Date.now()}-${current.length + 1}`, name: '' },
    ]);
  };

  const updateNewPipelineStage = (id, value) => {
    setNewPipelineStages((current) => current.map((stage) => (
      stage.id === id ? { ...stage, name: value } : stage
    )));
  };

  const removeNewPipelineStage = (id) => {
    setNewPipelineStages((current) => current.filter((stage) => stage.id !== id));
  };

  const createCustomPipeline = () => {
    const validStages = newPipelineStages
      .map((stage) => ({ ...stage, name: stage.name.trim() }))
      .filter((stage) => stage.name);

    if (!validStages.length) {
      setMessage('Create at least one pipeline stage.');
      return;
    }

    const duplicateStage = validStages.find((stage, index) => (
      validStages.findIndex((item) => item.name.toLowerCase() === stage.name.toLowerCase()) !== index
    ));
    if (duplicateStage) {
      setMessage('Stage names must be unique.');
      return;
    }

    const customPipeline = {
      name: newPipelineName.trim(),
      stages: validStages.map((stage) => ({ ...stage, owner: owners.find((item) => item !== 'All') || 'Ali Raza' })),
    };
    setSavedCustomPipeline(customPipeline);
    setStageList(customPipeline.stages);
    setActivePipeline({ type: 'custom', name: customPipeline.name });
    setFilters((current) => ({ ...current, stage: 'All' }));
    setPipelineSettingsOpen(false);
    setPipelineSettingsStep('choose');
    setMessage(`${newPipelineName.trim()} pipeline created successfully.`);
  };

  if (activeStagePage && opportunityStage) {
    const customStageColumns = customFields.map((field) => [field.id, field.label]);
    const dynamicStageColumns = opportunityStageMode === 'custom' && customFields.length
      ? [
        ['opportunityId', 'Opportunity ID', 'link-cell'],
        ['date', 'Date'],
        ['dealName', 'Deal Name'],
        ...customStageColumns,
        ['stage', 'Stage'],
        ['owner', 'Assigned Salesperson'],
      ]
      : opportunityStageColumns;
    const dynamicStageFormFields = opportunityStageMode === 'custom' && customFields.length
      ? [
        { key: 'dealName', label: 'Deal Name' },
        ...customFields.map((field) => ({
          key: field.id,
          label: field.label,
          type: getCustomFieldInputType(normalizeCustomFieldType(field.type)),
        })),
        { key: 'stage', label: 'Stage', kind: 'select', options: stageList.map((stage) => stage.name) },
        { key: 'owner', label: 'Assigned Salesperson', kind: 'select', options: owners.filter((item) => item !== 'All') },
      ]
      : opportunityStageFormFields;
    const dynamicStageDetailFields = opportunityStageMode === 'custom' && customFields.length
      ? [
        { key: 'opportunityId', label: 'Opportunity ID' },
        { key: 'dealName', label: 'Deal Name' },
        ...customFields.map((field) => ({ key: field.id, label: field.label })),
        { key: 'stage', label: 'Stage' },
        { key: 'owner', label: 'Assigned Salesperson' },
      ]
      : opportunityStageDetailFields;
    const pageRecords = stageRecords
      .filter((record) => record.stage === activeStagePage)
      .map((record) => ({
        ...record,
        ...(record.values || {}),
        contactId: record.opportunityId || record.id,
        id: record.opportunityId || record.id,
        date: record.date || record.createdAt,
        amount: record.amount || formatCurrency(record.values?.value || 0),
        dealName: record.dealName || record.values?.dealName || record.sourceName || 'Opportunity',
        company: record.company || record.values?.company || '',
        contact: record.contact || record.values?.contact || '',
        closeDate: record.closeDate || record.values?.closeDate || '',
        owner: record.owner || record.values?.owner || '',
        description: record.description || record.values?.description || '',
      }));

    return (
      <div className="crm-legacy-page">
        <ContactsPage
          contacts={pageRecords}
          setContacts={(updater) => {
            const nextRows = typeof updater === 'function' ? updater(pageRecords) : updater;
            const nextIds = new Set(nextRows.map((row) => row.id));
            const normalized = nextRows.map((row) => ({
              ...row,
              opportunityId: row.opportunityId || row.id,
              stage: row.stage || activeStagePage,
              createdAt: row.createdAt || row.date || new Date().toISOString().slice(0, 10),
              values: {
                ...(row.values || {}),
                ...Object.fromEntries(customFields.map((field) => [field.id, row[field.id] ?? row.values?.[field.id] ?? ''])),
                dealName: row.dealName || row.sourceName || '',
                company: row.company || '',
                contact: row.contact || '',
                value: Number(String(row.amount || '').replace(/[^0-9.-]/g, '')) || 0,
                closeDate: row.closeDate || '',
                owner: row.owner || '',
                description: row.description || '',
              },
            }));

            setStageRecords((current) => {
              const untouched = current.filter((record) => record.stage !== activeStagePage);
              return [...normalized, ...untouched].filter((record) => record.stage !== activeStagePage || nextIds.has(record.id));
            });

            setOpportunities((current) => {
              const rowsById = new Map(normalized.map((row) => [row.opportunityId || row.id, row]));
              const currentIds = new Set(current.map((opportunity) => opportunity.id));
              const updated = current.map((opportunity) => {
                const row = rowsById.get(opportunity.id);
                if (!row) return opportunity;
                const amount = Number(String(row.amount || '').replace(/[^0-9.-]/g, '')) || 0;
                return {
                  ...opportunity,
                  name: row.dealName || opportunity.name,
                  company: row.company || opportunity.company,
                  contact: row.contact || opportunity.contact,
                  value: amount,
                  priority: amount >= 800000 ? 'High' : amount >= 400000 ? 'Medium' : 'Low',
                  closeDate: row.closeDate || opportunity.closeDate,
                  stage: row.stage || opportunity.stage,
                  owner: row.owner || opportunity.owner,
                  notes: row.description || opportunity.notes,
                };
              });
              const additions = normalized
                .filter((row) => !currentIds.has(row.opportunityId || row.id))
                .map((row) => {
                  const amount = Number(String(row.amount || '').replace(/[^0-9.-]/g, '')) || 0;
                  return {
                    id: row.opportunityId || row.id,
                    name: row.dealName || 'Opportunity',
                    company: row.company || '',
                    contact: row.contact || '',
                    value: amount,
                    priority: amount >= 800000 ? 'High' : amount >= 400000 ? 'Medium' : 'Low',
                    closeDate: row.closeDate || '',
                    owner: row.owner || owners.find((item) => item !== 'All') || '',
                    stage: row.stage || activeStagePage,
                    product: 'CRM Suite',
                    notes: row.description || '',
                    leadId: row.leadId,
                  };
                });
              return [...additions, ...updated];
            });

            normalized.forEach((row) => syncLeadStatus(row.leadId, row.stage || activeStagePage));
          }}
          setMessage={setMessage}
          pageClassName="companies-copy-page opportunity-stage-records-page"
          tableColumns={dynamicStageColumns}
          showSerialColumn
          addButtonLabel="New Opportunity"
          blankFormValue={{
            dealName: '',
            company: '',
            contact: '',
            amount: '',
            closeDate: '',
            stage: activeStagePage,
            owner: owners.find((item) => item !== 'All') || 'Ali Raza',
            description: '',
          }}
          formFields={dynamicStageFormFields}
          formSectionTitle="Opportunity Information"
          addFormTitle={`Add ${activeStagePage} Opportunity`}
          addFormDescription="Create a record for this opportunity stage."
          editFormTitle="Edit Opportunity"
          editFormDescription="Update this opportunity stage record."
          saveButtonLabel="Save Opportunity"
          updateButtonLabel="Save Changes"
          idPrefix="OP"
          allowManualId={false}
          formPageClassName="company-form-page"
          detailTitle="Opportunity Detail"
          detailAriaLabel="Opportunity details"
          detailFields={dynamicStageDetailFields}
          showActivitySections={false}
          filterConfig={[
            { key: 'stage', label: 'Stage', options: ['All', activeStagePage] },
            { key: 'owner', label: 'Owner', options: owners },
            { key: 'dateRange', label: 'Date range', type: 'dateRange', options: ['All', 'Today', 'Last 7 Days', 'This Month', 'Custom Range'], defaultValue: 'All' },
          ]}
          filterTopContent={<OpportunityStageSummaryStrip records={pageRecords} stageName={activeStagePage} />}
          customDetailRenderer={(props) => <OpportunityStageDetailPage {...props} stageName={activeStagePage} />}
          useFallbackRows={false}
        />
      </div>
    );
  }

  return (
    <div className="crm-legacy-page">
      <CompaniesPage
        setMessage={setMessage}
        addButtonLabel={showStages && activePipeline.type === 'custom' ? 'Edit Stages' : 'Pipeline Settings'}
        addButtonIcon={Settings}
        onAddButtonClick={showStages && activePipeline.type === 'custom' ? () => setCustomStageActionsOpen(true) : openPipelineSettings}
        actionExtraContent={(
          <button type="button" className="lf-btn lf-btn-secondary pipeline-manage-stages-btn" onClick={() => setShowStages((current) => !current)}>
            {showStages ? 'Hide Stages' : 'Manage Stages'}
          </button>
        )}
        panelAfterContent={(
          <>
            {showStages ? (
              <PipelineStagesPreview
                activePipeline={activePipeline}
                stages={stageList}
                editMode={showStages}
                openEditStage={openEditStage}
                openCustomStageActions={() => setCustomStageActionsOpen(true)}
                setStageFormChoice={setStageFormChoice}
                setStageAsWon={setStageAsWon}
                setStageAsLost={setStageAsLost}
                opportunityStageId={opportunityStageId}
                opportunityStageMode={opportunityStageMode}
                setDeleteStage={setDeleteStage}
                setDraggedStageId={setDraggedStageId}
                moveStage={moveStage}
              />
            ) : (
              <PipelineKanbanBoard
                stages={stageList}
                leads={[...stageLeads, ...dummyPipelineLeads]}
                opportunities={filtered}
                dragged={dragged}
                draggedLead={draggedLead}
                setDragged={setDragged}
                setDraggedLead={setDraggedLead}
                setLeads={setLeads}
                setDummyPipelineLeads={setDummyPipelineLeads}
                setOpportunities={setOpportunities}
                moveLeadToStage={moveLeadToStage}
                openItemOpportunityStage={openItemOpportunityStage}
                formatCurrency={formatCurrency}
              />
            )}
          </>
        )}
        hideTable
        filterConfig={[
          { key: 'type', label: 'Stage', options: ['All', ...stageList.map((stage) => stage.name)] },
          { key: 'owner', label: 'Owner', options: owners },
          { key: 'dateRange', label: 'Date range', type: 'dateRange', options: ['All', 'Today', 'Last 7 Days', 'This Month', 'Custom Range'], defaultValue: 'All' },
        ]}
        summaryItems={[
          { label: 'Total Pipeline', value: '20' },
          { label: 'Open Deals', value: '19', className: 'company-summary-blue' },
          { label: 'Total Revenue', value: '1', className: 'company-summary-green' },
          { label: 'Exp Revenue', value: '0', className: 'company-summary-cyan' },
        ]}
      />

      {pipelineSettingsOpen && (
        <Modal title="Pipeline Setting" onClose={() => { setPipelineSettingsOpen(false); setPipelineSettingsStep('choose'); }}>
          {pipelineSettingsStep === 'choose' && (
            <div className="pipeline-choice-wrapper">
              <button
                type="button"
                className={`pipeline-choice-card ${activePipeline.type === 'standard' ? 'active' : ''}`}
                onClick={chooseStandardPipeline}
              >
                <strong>Standard Pipeline</strong>
                <span>Use the default CRM stages already shown on this page.</span>
              </button>
              <button type="button" className={`pipeline-choice-card ${activePipeline.type === 'custom' ? 'active' : ''}`} onClick={startNewPipeline}>
                <strong>New Pipeline</strong>
                <span>{savedCustomPipeline ? `Open ${savedCustomPipeline.name} with its saved stages.` : 'Create a named pipeline with your own stages.'}</span>
              </button>
              {savedCustomPipeline && (
                <button type="button" className="pipeline-choice-card danger" onClick={deleteSavedCustomPipeline}>
                  <strong>Delete Previous Pipeline</strong>
                  <span>Remove {savedCustomPipeline.name} and create a new pipeline from zero.</span>
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

          {pipelineSettingsStep === 'stages' && (
            <div className="pipeline-new-flow">
              <div className="pipeline-builder-heading">
                <strong>{newPipelineName}</strong>
                <span>Add the stages you want to show on the Pipeline page.</span>
              </div>
              <div className="pipeline-custom-stage-list">
                {newPipelineStages.map((stage, index) => (
                  <div key={stage.id} className="pipeline-custom-stage-row">
                    <span>{index + 1}</span>
                    <input
                      value={stage.name}
                      placeholder={`Stage ${index + 1}`}
                      onChange={(event) => updateNewPipelineStage(stage.id, event.target.value)}
                    />
                    {newPipelineStages.length > 1 && (
                      <button type="button" className="pipeline-remove-stage" aria-label="Remove stage" onClick={() => removeNewPipelineStage(stage.id)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="pipeline-add-stage" onClick={addNewPipelineStage}>
                <Plus size={15} /> Add Stage
              </button>
              <PanelActions wide>
                <button type="button" className="button secondary" onClick={() => setPipelineSettingsStep('name')}>Back</button>
                <button type="button" className="button primary" onClick={createCustomPipeline}>Create Pipeline</button>
              </PanelActions>
            </div>
          )}
        </Modal>
      )}
      {customStageActionsOpen && (
        <Modal title="Edit Stages" onClose={() => setCustomStageActionsOpen(false)}>
          <div className="pipeline-stage-action-picker">
            <button
              type="button"
              className="pipeline-form-option"
              onClick={() => {
                setCustomStageActionsOpen(false);
                openCreateManagedStage();
              }}
            >
              <strong>Add Stage</strong>
              <span>Create one more stage in this pipeline.</span>
            </button>
            <button
              type="button"
              className="pipeline-form-option"
              onClick={() => {
                setCustomStageActionsOpen(false);
                openRenamePipeline();
              }}
            >
              <strong>Edit Pipeline Name</strong>
              <span>Rename the current custom pipeline.</span>
            </button>
          </div>
        </Modal>
      )}
      {stageModalOpen && (
        <Modal className="stage-edit-modal" title={editingStage ? 'Edit Stage' : 'Create Stage'} onClose={() => setStageModalOpen(false)}>
          <form className="form-grid stage-form-grid" onSubmit={createStage}>
            <TextField label="Stage Name*" value={stageForm.name} onChange={(name) => setStageForm({ ...stageForm, name })} />
            <SearchableSelect
              className="field stage-owner-select"
              label="Owner*"
              value={stageForm.owner}
              options={owners.filter((item) => item !== 'All')}
              onChange={(owner) => setStageForm({ ...stageForm, owner })}
              placeholder="Search owner"
            />
            <PanelActions wide>
              <button type="button" className="button secondary" onClick={() => setStageModalOpen(false)}>Cancel</button>
              <button type="submit" className="button primary">Save Changes</button>
            </PanelActions>
          </form>
        </Modal>
      )}
      {renamePipelineOpen && (
        <Modal title="Edit Pipeline Name" onClose={() => setRenamePipelineOpen(false)}>
          <form className="form-grid" onSubmit={savePipelineName}>
            <label className="field wide">
              <span>Pipeline Name*</span>
              <input value={pipelineNameDraft} onChange={(event) => setPipelineNameDraft(event.target.value)} autoFocus />
            </label>
            <PanelActions wide>
              <button type="button" className="button secondary" onClick={() => setRenamePipelineOpen(false)}>Cancel</button>
              <button type="submit" className="button primary">Save Name</button>
            </PanelActions>
          </form>
        </Modal>
      )}
      {stageFormChoice && (
        <Modal className="confirm-opportunity-form-modal" title="Confirm Opportunity Form" onClose={() => setStageFormChoice(null)}>
          <div className="pipeline-opportunity-form-picker">
            <div className="pipeline-opportunity-form-copy">
              <span>Configure Opportunity Stage</span>
              <h3>{stageFormChoice.name}</h3>
              <p>Select the form that should open when a record enters this stage. This will replace the current opportunity-stage form selection.</p>
            </div>
            <div className="pipeline-opportunity-form-options">
              <button type="button" className="pipeline-form-option" onClick={() => makeStandardOpportunityStage(stageFormChoice)}>
                <span className="pipeline-form-option-kicker">Recommended</span>
                <FileText size={21} aria-hidden="true" />
                <span className="pipeline-form-option-copy">
                  <strong>Use Standard Form</strong>
                  <span>Company, contact, deal amount, close date, stage, and owner.</span>
                </span>
              </button>
              <button type="button" className="pipeline-form-option" onClick={() => openCustomBuilder(stageFormChoice)}>
                <FileCog size={22} aria-hidden="true" />
                <span className="pipeline-form-option-copy">
                  <strong>Create a New Form</strong>
                  <span>Define custom fields, data types, and required inputs for this stage.</span>
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}
      {customBuilderStage && (
        <Modal title="Confirm Custom Form" onClose={() => { setCustomBuilderStage(null); setCustomBuilderError(''); }}>
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
              <button className="button secondary" onClick={() => { setCustomBuilderStage(null); setCustomBuilderError(''); }}>Cancel</button>
              <button className="button primary" onClick={saveCustomStageForm}>Save Custom Form</button>
            </PanelActions>
          </div>
        </Modal>
      )}
      {opportunityModalOpen && (
        <Modal className="convert-opportunity-modal" title={convertingLeadId ? 'Convert Lead to Opportunity' : 'Opportunity Details'} onClose={() => setOpportunityModalOpen(false)}>
          <form className="convert-opportunity-form" onSubmit={saveOpportunity}>
            <section className="convert-linked-summary" aria-label="Auto-linked records summary">
              <h4>Auto-Linked Records Summary</h4>
              <div>
                <span>Company to Link/Create</span>
                <strong>{opportunityForm.company || '-'}</strong>
              </div>
              <div>
                <span>Contact to Link/Create</span>
                <strong>{opportunityForm.contact || '-'}</strong>
              </div>
              <div>
                <span>Assigned Salesperson</span>
                <strong>{opportunityForm.owner || '-'}</strong>
              </div>
            </section>

            <label className={`field wide ${opportunityErrors.includes('Deal Name') ? 'field-error' : ''}`}>
              <span>Deal Name *</span>
              <input value={opportunityForm.dealName} onChange={(event) => updateOpportunityField('dealName', event.target.value)} />
            </label>
            <label className={`field wide ${opportunityErrors.includes('Deal Amount') ? 'field-error' : ''}`}>
              <span>Deal Amount ($) *</span>
              <input type="number" step="0.01" value={opportunityForm.value} onChange={(event) => updateOpportunityField('value', event.target.value)} />
            </label>
            <label className={`field wide ${opportunityErrors.includes('Expected Close Date') ? 'field-error' : ''}`}>
              <span>Expected Close Date *</span>
              <input type="date" value={opportunityForm.closeDate} onChange={(event) => updateOpportunityField('closeDate', event.target.value)} />
            </label>
            <label className="field wide">
              <span>Description</span>
              <textarea rows="4" value={opportunityForm.notes} onChange={(event) => setOpportunityForm({ ...opportunityForm, notes: event.target.value })} />
            </label>
            <p className="convert-custom-empty">No custom fields configured for this opportunity type.</p>
            <PanelActions wide>
              <button type="button" className="button secondary" onClick={() => { setOpportunityModalOpen(false); setEditingOpportunityId(null); setConvertingLeadId(null); setOpportunityErrors([]); }}>Cancel</button>
              <button type="submit" className="button primary">{editingOpportunityId ? 'Save Changes' : 'Save Opportunity'}</button>
            </PanelActions>
          </form>
        </Modal>
      )}
      {customDrop && (
        <Modal className="convert-opportunity-modal custom-opportunity-drop-modal" title={`${customDrop.stageName} Opportunity Form`} onClose={() => setCustomDrop(null)}>
          <form className="convert-opportunity-form" onSubmit={submitCustomDrop}>
            <section className="convert-linked-summary" aria-label="Auto-linked records summary">
              <h4>Auto-Linked Records Summary</h4>
              <div>
                <span>Company to Link/Create</span>
                <strong>{(customDrop.lead || customDrop.item)?.company || '-'}</strong>
              </div>
              <div>
                <span>Contact to Link/Create</span>
                <strong>{customDrop.lead?.customer || customDrop.item?.contact || '-'}</strong>
              </div>
              <div>
                <span>Assigned Salesperson</span>
                <strong>{(customDrop.lead || customDrop.item)?.owner || '-'}</strong>
              </div>
            </section>
            {customFields.map((field) => (
              <label key={field.id} className={`field ${customErrors.includes(field.id) ? 'field-error' : ''}`}>
                <span>{field.label}{field.required === 'Yes' ? ' *' : ''}</span>
                {renderCustomDropInput(field)}
              </label>
            ))}
            {customErrors.length > 0 && <div className="custom-builder-error" role="alert">Fill all required custom fields.</div>}
            <PanelActions wide>
              <button type="button" className="button secondary" onClick={() => setCustomDrop(null)}>Cancel</button>
              <button type="submit" className="button primary">Save Opportunity</button>
            </PanelActions>
          </form>
        </Modal>
      )}
      {deleteStage && (
        <Confirm
          danger
          title="Delete Stage"
          text={`Delete stage "${deleteStage.name}"?`}
          confirmLabel="Delete"
          onCancel={() => setDeleteStage(null)}
          onConfirm={confirmDeleteStage}
        />
      )}
    </div>
  );

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
                          <button type="button" className="danger-menu-item" onClick={() => { setStageRecords((current) => current.filter((item) => item.id !== record.id)); setOpenRecordActionId(''); }}><Trash2 size={15} />Delete</button>
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

  if (customBuilderStage) {
    return (
      <section className="page salesforce-leads salesforce-pipeline">
        <div className="sf-list-head">
          <div className="sf-title-wrap">
            <div className="sf-object-icon pipeline-icon"><span /></div>
            <div>
              <p>{customBuilderStage.name}</p>
              <button type="button" className="sf-list-title">
                Create your Custom New Form <ChevronDown size={18} />
              </button>
              <p className="sf-page-subtitle">Build custom fields for this opportunity stage.</p>
            </div>
            <button type="button" className="sf-pin" aria-label="Pin list"><Pin size={15} /></button>
          </div>
        </div>
        <div className="sf-list-panel custom-builder-page">
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
                <span>Stage:</span>
                <select value={filters.stage} onChange={(event) => updateFilter('stage', event.target.value)}>
                  <option value="All">All</option>
                  {stageList.map((stage) => <option key={stage.id} value={stage.name}>{stage.name}</option>)}
                </select>
              </label>
              <label className="pipeline-inline-filter">
                <span>Owner:</span>
                <select value={filters.owner} onChange={(event) => updateFilter('owner', event.target.value)}>
                  {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                </select>
              </label>
              <label className="pipeline-inline-filter">
                <span>Priority:</span>
                <select value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
                  {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
            </div>

            <button type="button" className="pipeline-settings-button" onClick={openPipelineSettings}>
              <Settings size={15} />
              Pipeline Settings
            </button>
          </section>
        </section>

        <section className="pipeline-stage-panel">
          <header className="pipeline-stage-header">
            <h2>{activePipeline.name} Stages</h2>
            <button type="button" className="pipeline-edit-stages" onClick={() => setShowStages((show) => !show)}>
              {showStages ? 'Close Edit' : 'Edit Stages'}
            </button>
          </header>

          {showStages && (
            <div className="pipeline-stage-edit-bar">
              <span>Manage the stages in the active pipeline.</span>
              <button type="button" className="pipeline-secondary-action" onClick={openCreateStage}>
                <Plus size={14} /> Add Stage
              </button>
            </div>
          )}

          <div className="pipeline-stage-list">
            {stageList.map((stage, index) => {
              const stageCount = filtered.filter((item) => item.stage === stage.name).length
                + stageLeads.filter((lead) => lead.status === stage.name).length;
              const stageKey = stage.name.toLowerCase();
              const isWon = stageKey === 'won';
              const isLost = stageKey === 'lost';

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
                    <span>{isWon || isLost ? 'System Automated' : stage.owner === 'System' ? 'Shared' : stage.owner}</span>
                  </div>
                  <div className="pipeline-stage-actions">
                    <span className="pipeline-stage-count">{stageCount}</span>
                    {showStages && (
                      <>
                        <button type="button" className="pipeline-row-icon" aria-label={`Edit ${stage.name}`} onClick={() => openEditStage(stage)}>
                          <Edit size={14} />
                        </button>
                        <button type="button" className="pipeline-row-icon danger" aria-label={`Delete ${stage.name}`} onClick={() => setDeleteStage(stage)}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
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

          {pipelineSettingsStep === 'stages' && (
            <div className="pipeline-new-flow">
              <div className="pipeline-builder-heading">
                <strong>{newPipelineName}</strong>
                <span>Add the stages you want to use in this pipeline.</span>
              </div>
              <div className="pipeline-custom-stage-list">
                {newPipelineStages.map((stage, index) => (
                  <div key={stage.id} className="pipeline-custom-stage-row">
                    <span>{index + 1}</span>
                    <input
                      value={stage.name}
                      placeholder={`Stage ${index + 1}`}
                      onChange={(event) => updateNewPipelineStage(stage.id, event.target.value)}
                    />
                    {newPipelineStages.length > 1 && (
                      <button type="button" className="pipeline-remove-stage" aria-label="Remove stage" onClick={() => removeNewPipelineStage(stage.id)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="pipeline-add-stage" onClick={addNewPipelineStage}>
                <Plus size={15} /> Add Stage
              </button>
              <PanelActions wide>
                <button type="button" className="button secondary" onClick={() => setPipelineSettingsStep('name')}>Back</button>
                <button type="button" className="button primary" onClick={createCustomPipeline}>Create Pipeline</button>
              </PanelActions>
            </div>
          )}
        </Modal>
      )}
      {stageModalOpen && (
        <Modal title={editingStage ? 'Edit Stage' : 'Create Stage'} onClose={() => setStageModalOpen(false)}>
          <form className="form-grid stage-form-grid" onSubmit={createStage}>
            <TextField label="Stage Name*" value={stageForm.name} onChange={(name) => setStageForm({ ...stageForm, name })} />
            <SelectField label="Owner*" value={stageForm.owner} options={owners.filter((item) => item !== 'All')} onChange={(owner) => setStageForm({ ...stageForm, owner })} />
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
            <SelectField label="Owner" value={leadForm.assignLead} options={assignLeadOptions} onChange={(assignLead) => setLeadForm({ ...leadForm, assignLead })} />
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
      {opportunityModalOpen && (
        <Modal title="Opportunity Details" onClose={() => setOpportunityModalOpen(false)}>
          <form className="opportunity-form" onSubmit={saveOpportunity}>
            <label className="field">
              <span>Opportunity ID</span>
              <input value={opportunityId} readOnly />
            </label>
            <div className="related-row">
              <span>Related Company</span>
              <strong>{opportunityForm.company || 'Select a company'}</strong>
              <button type="button">Open Profile »</button>
            </div>
            <div className="related-row">
              <span>Primary Contact</span>
              <strong>{opportunityForm.contact || opportunityForm.company || 'Company'}</strong>
              <button type="button">Open Profile »</button>
            </div>
            <SearchableSelect className={`field ${opportunityErrors.includes('Related Company') ? 'field-error' : ''}`} label="Related Company*" value={opportunityForm.company} options={companies.filter((item) => item !== 'All')} onChange={(company) => updateOpportunityField('company', company)} placeholder="Search company" />
            <label className={`field ${opportunityErrors.includes('Primary Contact') ? 'field-error' : ''}`}>
              <span>Primary Contact*</span>
              <input value={opportunityForm.contact} onChange={(event) => updateOpportunityField('contact', event.target.value)} />
            </label>
            <label className={`field ${opportunityErrors.includes('Deal Amount') ? 'field-error' : ''}`}>
              <span>Deal Amount*</span>
              <input value={opportunityForm.value} onChange={(event) => updateOpportunityField('value', event.target.value)} />
            </label>
            <label className={`field ${opportunityErrors.includes('Expected Close Date') ? 'field-error' : ''}`}>
              <span>Expected Close Date*</span>
              <input type="date" value={opportunityForm.closeDate} onChange={(event) => updateOpportunityField('closeDate', event.target.value)} />
            </label>
            <label className="field">
              <span>Probability (%)</span>
              <input value={probability} readOnly />
              <small>Calculated dynamically based on column stage.</small>
            </label>
            <SearchableSelect className={`field ${opportunityErrors.includes('Stage') ? 'field-error' : ''}`} label="Stage*" value={opportunityForm.stage} options={stageList.map((stage) => stage.name)} onChange={(stage) => updateOpportunityField('stage', stage)} placeholder="Search stage" />
            <SearchableSelect className={`field ${opportunityErrors.includes('Assigned Salesperson') ? 'field-error' : ''}`} label="Assigned Salesperson*" value={opportunityForm.owner} options={owners.filter((item) => item !== 'All')} onChange={(owner) => updateOpportunityField('owner', owner)} placeholder="Search salesperson" />
            <label className="field wide">
              <span>Notes / Description</span>
              <textarea rows="4" value={opportunityForm.notes} onChange={(event) => setOpportunityForm({ ...opportunityForm, notes: event.target.value })} />
            </label>
            <PanelActions wide>
              <button type="button" className="button secondary" onClick={() => { setOpportunityModalOpen(false); setEditingOpportunityId(null); setConvertingLeadId(null); setOpportunityErrors([]); }}>Cancel</button>
              <button type="submit" className="button primary">{editingOpportunityId ? 'Save Changes' : 'Save Opportunity'}</button>
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
              <SearchableSelect className="sf-filter-card" label="Priority" value={filters.priority} options={priorities} onChange={(priority) => updateFilter('priority', priority)} placeholder="Search priority" />
              <SearchableSelect className="sf-filter-card" label="Product" value={filters.product} options={products} onChange={(product) => updateFilter('product', product)} placeholder="Search product" />
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
      {customDrop && (
        <Modal className="convert-opportunity-modal custom-opportunity-drop-modal" title={`${customDrop.stageName} Opportunity Form`} onClose={() => setCustomDrop(null)}>
          <form className="convert-opportunity-form" onSubmit={submitCustomDrop}>
            <section className="convert-linked-summary" aria-label="Auto-linked records summary">
              <h4>Auto-Linked Records Summary</h4>
              <div>
                <span>Company to Link/Create</span>
                <strong>{(customDrop.lead || customDrop.item)?.company || '-'}</strong>
              </div>
              <div>
                <span>Contact to Link/Create</span>
                <strong>{customDrop.lead?.customer || customDrop.item?.contact || '-'}</strong>
              </div>
              <div>
                <span>Assigned Salesperson</span>
                <strong>{(customDrop.lead || customDrop.item)?.owner || '-'}</strong>
              </div>
            </section>
            {customFields.map((field) => (
              <label key={field.id} className={`field ${customErrors.includes(field.id) ? 'field-error' : ''}`}>
                <span>{field.label}{field.required === 'Yes' ? '*' : ''}</span>
                {renderCustomDropInput(field)}
              </label>
            ))}
            {customErrors.length > 0 && <div className="custom-builder-error" role="alert">Fill all required custom fields.</div>}
            <PanelActions wide>
              <button type="button" className="button secondary" onClick={() => setCustomDrop(null)}>Cancel</button>
              <button type="submit" className="button primary">Save Opportunity</button>
            </PanelActions>
          </form>
        </Modal>
      )}
      {deleteStage && <Confirm danger title="Delete Stage" text={`Delete stage "${deleteStage.name}"? Stages with opportunities cannot be deleted.`} confirmLabel="Delete" onCancel={() => setDeleteStage(null)} onConfirm={confirmDeleteStage} />}
      {pendingMove && <Confirm title="Move Opportunity" text={`${pendingMove.name}: ${pendingMove.from} to ${pendingMove.to}`} confirmLabel="Move" onCancel={() => setPendingMove(null)} onConfirm={confirmMove} />}
      {selected && (
        <Modal title="Opportunity Details" onClose={() => setSelected(null)}>
          <div className="stack">
            <DetailGrid items={[
              ['Opportunity', selected.name],
              ['Company', selected.company],
              ['Contact', selected.contact],
              ['Stage', selected.stage],
              ['Estimated Value', formatCurrency(selected.value)],
              ['Priority', selected.priority],
              ['Expected Closing Date', selected.closeDate],
              ['Assigned Salesperson', selected.owner],
            ]} />
            <DetailBlock title="Notes" text={selected.notes || 'No notes added.'} />
            <PanelActions>
              <button className="button secondary" onClick={() => setMessage('Note popup opened for opportunity.')}>Add Note</button>
              <button className="button primary" onClick={() => openEditOpportunity(selected)}>Edit</button>
            </PanelActions>
          </div>
        </Modal>
      )}
      {selectedLead && (
        <Modal title="Lead Details" onClose={() => setSelectedLead(null)}>
          <div className="stack">
            <DetailGrid items={[
              ['Client ID', selectedLead.clientId],
              ['Customer', selectedLead.customer],
              ['Company', selectedLead.company || 'Not added'],
              ['Phone', selectedLead.phone],
              ['Email', selectedLead.email || 'Not added'],
              ['Priority', selectedLead.priority],
              ['Owner', selectedLead.owner],
            ]} />
            <DetailBlock title="Notes" text={selectedLead.notes || 'No notes added.'} />
          </div>
        </Modal>
      )}
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

function PipelineStagesPreview({ activePipeline, stages, editMode, openEditStage, openCustomStageActions, setStageFormChoice, setStageAsWon, setStageAsLost, opportunityStageId, opportunityStageMode, setDeleteStage, setDraggedStageId, moveStage }) {
  const stageRows = stages.map((stage) => {
    const lowerName = stage.name.toLowerCase();
    const locked = lowerName === 'won' || lowerName === 'lost' || stage.role === 'won' || stage.role === 'lost';
    return {
      name: stage.name,
      description: activePipeline.type === 'standard'
        ? standardStageDescriptions[stage.name] || 'Pipeline stage'
        : 'Custom pipeline stage',
      owner: stage.owner || owners.find((item) => item !== 'All') || 'Ali Raza',
      tone: stage.role === 'won' ? 'won' : stage.role === 'lost' ? 'lost' : lowerName.replace(/\s+/g, '-'),
      locked,
    };
  });

  return (
    <section className="pipeline-stage-preview" aria-label="Standard pipeline stages">
      <header className="pipeline-stage-preview-head">
        <h2>{activePipeline.type === 'standard' ? 'Standard Pipeline Stages' : `${activePipeline.name} Pipeline`}</h2>
        <div className="pipeline-stage-preview-head-actions">
          <span>Drag stages to change priority</span>
        </div>
      </header>
      <div className={`pipeline-stage-preview-column-head${editMode ? ' pipeline-stage-preview-column-head--editing' : ''}`}>
        <span>Stage</span>
        <span>Owner</span>
        {editMode && <span>Actions</span>}
      </div>
      <div className="pipeline-stage-preview-list">
        {stageRows.map((stage, index) => (
          <article
            key={stage.name}
            className={`pipeline-stage-preview-row pipeline-stage-preview-row--${stage.tone}${stages[index].role === 'won' ? ' pipeline-stage-preview-row--won-active' : ''}${stages[index].role === 'lost' ? ' pipeline-stage-preview-row--lost-active' : ''}${opportunityStageId === stages[index].id ? ' pipeline-stage-preview-row--opportunity' : ''}${editMode ? ' pipeline-stage-preview-row--editing' : ''}`}
            draggable={editMode}
            onDragStart={() => editMode && setDraggedStageId(stages[index].id)}
            onDragOver={(event) => editMode && event.preventDefault()}
            onDrop={() => editMode && moveStage(stages[index].id)}
          >
            <span className="pipeline-stage-preview-index">{index + 1}</span>
            <div className="pipeline-stage-preview-info">
              <strong>
                {stage.name}
              </strong>
              <span>{stage.description}</span>
            </div>
            <div className="pipeline-stage-preview-owner">
              {stage.locked ? <Lock size={13} /> : <Users size={13} />}
              <span>{stage.owner}</span>
            </div>
            {editMode && (
              <div className="pipeline-stage-preview-actions">
                <button type="button" className={`wide-action ${opportunityStageId === stages[index].id ? 'active' : ''}`} onClick={() => setStageFormChoice(stages[index])}>
                  Opportunity
                </button>
                <button type="button" className={`wide-action ${stages[index].role === 'won' ? 'active won' : ''}`} onClick={() => setStageAsWon(stages[index])}>
                  Won
                </button>
                <button type="button" className={`wide-action ${stages[index].role === 'lost' ? 'active lost' : ''}`} onClick={() => setStageAsLost(stages[index])}>
                  Lost
                </button>
                <button type="button" aria-label={`Edit ${stage.name}`} onClick={() => openEditStage(stages[index])}>
                  <Edit size={14} />
                </button>
                <button type="button" className="danger" aria-label={`Delete ${stage.name}`} onClick={() => setDeleteStage(stages[index])}>
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function PipelineKanbanBoard({ stages, leads, opportunities, dragged, draggedLead, setDragged, setDraggedLead, setLeads, setDummyPipelineLeads, setOpportunities, moveLeadToStage, openItemOpportunityStage, formatCurrency }) {
  const firstStageName = stages[0]?.name || 'New';
  const stageNames = new Set(stages.map((stage) => stage.name));
  const getLeadStage = (lead) => stageNames.has(lead.status) ? lead.status : firstStageName;
  const getOpportunityStage = (opportunity) => stageNames.has(opportunity.stage) ? opportunity.stage : firstStageName;

  const allowDrop = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const moveToStage = (stageName, event) => {
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
        // Ignore malformed drag payloads and fall back to React drag state.
      }
    }

    if (droppedLead) {
      if (moveLeadToStage) {
        moveLeadToStage(droppedLead, stageName);
        return;
      }
      const updateLeadStage = (lead) => (
        lead.id === droppedLead.id ? { ...lead, status: stageName, lastActivity: `Pipeline stage: ${stageName}` } : lead
      );
      if (String(droppedLead.id).startsWith('DLD-')) {
        setDummyPipelineLeads((current) => current.map(updateLeadStage));
      } else {
        setLeads((current) => current.map(updateLeadStage));
      }
      setDraggedLead(null);
      return;
    }
    if (droppedOpportunity) {
      if (openItemOpportunityStage) {
        openItemOpportunityStage(droppedOpportunity, stageName);
        return;
      }
      setOpportunities((current) => current.map((opportunity) => (
        opportunity.id === droppedOpportunity.id ? { ...opportunity, stage: stageName } : opportunity
      )));
      setDragged(null);
    }
  };

  return (
    <section className="pipeline-kanban-board" aria-label="Pipeline stage board">
      {stages.map((stage) => {
        const stageLeads = leads.filter((lead) => getLeadStage(lead) === stage.name);
        const stageOpportunities = opportunities.filter((opportunity) => getOpportunityStage(opportunity) === stage.name);
        const cards = [
          ...stageLeads.map((lead) => ({ type: 'lead', record: lead })),
          ...stageOpportunities.map((opportunity) => ({ type: 'opportunity', record: opportunity })),
        ];

        return (
          <section
            key={stage.id}
            className="pipeline-kanban-column"
            onDragEnter={allowDrop}
            onDragOver={allowDrop}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              moveToStage(stage.name, event);
            }}
          >
            <header className="pipeline-kanban-column-head">
              <h3>{stage.name}</h3>
              <span>{cards.length}</span>
            </header>
            <div
              className="pipeline-kanban-card-list"
              onDragEnter={allowDrop}
              onDragOver={allowDrop}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                moveToStage(stage.name, event);
              }}
            >
              {cards.length === 0 && (
                <div className="pipeline-empty-drop-zone">
                  Drop lead here
                </div>
              )}
              {cards.map(({ type, record }) => (
                <article
                  key={`${type}-${record.id}`}
                  className="pipeline-kanban-card"
                  draggable
                  onDragStart={(event) => {
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
                  <div className="pipeline-kanban-card-top">
                    <strong>{type === 'lead' ? record.customer : record.name}</strong>
                    <span className={`pipeline-priority pipeline-priority--${String(record.priority || 'medium').toLowerCase()}`}>{record.priority || 'Medium'}</span>
                  </div>
                  <p>{record.company || 'No company added'}</p>
                  <dl>
                    {type === 'lead' ? (
                      <>
                        <div><dt>Client ID</dt><dd>{record.clientId || record.id}</dd></div>
                        <div><dt>Phone</dt><dd>{record.phone || '-'}</dd></div>
                        <div><dt>Owner</dt><dd>{record.owner || '-'}</dd></div>
                      </>
                    ) : (
                      <>
                        <div><dt>Contact</dt><dd>{record.contact || '-'}</dd></div>
                        <div><dt>Value</dt><dd>{formatCurrency(record.value || 0)}</dd></div>
                        <div><dt>Close Date</dt><dd>{record.closeDate || '-'}</dd></div>
                        <div><dt>Salesperson</dt><dd>{record.owner || '-'}</dd></div>
                      </>
                    )}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

function PipelineStageColumn({ stage, items, leads, duplicateLeadId, dragged, draggedLead, setPendingMove, moveLeadToStage, openItemOpportunityStage, setSelected, setSelectedLead, setDragged, setDraggedLead, formatCurrency, search }) {
  return (
    <section
      className="kanban-column"
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => {
        if (draggedLead) {
          if (draggedLead.status === stage.name) {
            setDraggedLead(null);
            return;
          }
          moveLeadToStage(draggedLead, stage.name);
          return;
        }
        if (dragged && dragged.stage !== stage.name) {
          openItemOpportunityStage(dragged, stage.name);
        }
      }}
    >
      <header><h3>{stage.name}</h3><span>{items.length + leads.length}</span></header>
      <div className="kanban-list">
        {leads.map((lead) => (
          <article
            key={lead.id}
            className={`opportunity-card lead-opportunity-card ${lead.id === duplicateLeadId ? 'duplicate-card' : ''}`}
            draggable
            onDragStart={() => { setDraggedLead(lead); setDragged(null); }}
            onClick={() => setSelectedLead(lead)}
          >
            <div className="card-top">
              <strong><HighlightedText text={lead.customer} query={search} /></strong>
              <span className={`pill ${lead.priority.toLowerCase()}`}>{lead.priority}</span>
            </div>
            <p><HighlightedText text={lead.company || 'No company added'} query={search} /></p>
            <dl>
              <div><dt>Client ID</dt><dd><HighlightedText text={lead.clientId} query={search} /></dd></div>
              <div><dt>Phone</dt><dd><HighlightedText text={lead.phone} query={search} /></dd></div>
              <div><dt>Owner</dt><dd><HighlightedText text={lead.owner} query={search} /></dd></div>
            </dl>
          </article>
        ))}
        {items.map((item) => (
          <article
            key={item.id}
            className="opportunity-card"
            draggable
            onDragStart={() => { setDragged(item); setDraggedLead(null); }}
            onClick={() => setSelected(item)}
          >
            <div className="card-top">
              <strong><HighlightedText text={item.name} query={search} /></strong>
              <span className={`pill ${item.priority.toLowerCase()}`}>{item.priority}</span>
            </div>
            <p><HighlightedText text={item.company} query={search} /></p>
            <dl>
              <div><dt>Contact</dt><dd><HighlightedText text={item.contact} query={search} /></dd></div>
              <div><dt>Value</dt><dd>{formatCurrency(item.value)}</dd></div>
              <div><dt>Close Date</dt><dd><HighlightedText text={item.closeDate} query={search} /></dd></div>
              <div><dt>Salesperson</dt><dd><HighlightedText text={item.owner} query={search} /></dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
