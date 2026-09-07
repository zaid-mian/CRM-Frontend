import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  CheckCircle2,
  CreditCard,
  Edit3,
  ImagePlus,
  Layers3,
  Plus,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { fetchCatalogBootstrap } from '../data/jts/catalogApi';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

const emptyProduct = {
  name: '',
  slug: '',
  description: '',
  image: '',
  is_active: true,
  display_order: 0,
};

const emptyModule = {
  product: '',
  name: '',
  code: '',
  description: '',
  is_active: true,
  display_order: 0,
};

const emptyPlan = {
  ownerType: 'product',
  product: '',
  service: '',
  name: '',
  price: '',
  currency: '',
  billing_cycle: '',
  is_active: true,
  display_order: 0,
  plan_modules: [],
  discounts: [],
};

function slugPreview(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDate(value) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return '—';
  }
}


function cycleLabel(options, value) {
  return options.billing_cycles.find((item) => item.value === value)?.label || value;
}

function StatusBadge({ active }) {
  return (
    <span className={`admin-badge ${active ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function LoadingRows({ columns = 6 }) {
  return (
    <tbody>
      {[0, 1, 2].map((row) => (
        <tr key={row}>
          {Array.from({ length: columns }).map((_, index) => (
            <td key={index}>
              <span className="admin-skeleton" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function EmptyState({ title }) {
  return (
    <div className="admin-empty">
      <strong>{title}</strong>
    </div>
  );
}

function SummaryStrip({ items }) {
  return (
    <section className="crm-summary-strip contact-summary-strip catalog-summary-strip" aria-label="Catalog summary">
      {items.map((item) => (
        <article key={item.label}>
          <span>{item.label}</span>
          <strong className={item.tone ? `catalog-summary-${item.tone}` : ''}>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="admin-error">
      <span>{message}</span>
      <button type="button" onClick={onRetry}>
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}

function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`admin-toggle ${disabled ? 'disabled' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
      <span />
      {label && <strong>{label}</strong>}
    </label>
  );
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

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="admin-select-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function FieldError({ children }) {
  return children ? <p className="admin-field-error">{children}</p> : null;
}

function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="admin-pagination">
      <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </div>
  );
}

function paginate(rows, page, pageSize = 20) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  return {
    totalPages,
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
  };
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

export default function CatalogAdmin({ screen, onNavigate }) {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productFilters, setProductFilters] = useState({ search: '', status: 'all', name: 'all', dateRange: 'all', dateFrom: '', dateTo: '', sort: 'display_order', page: 1 });
  const [moduleFilters, setModuleFilters] = useState({ search: '', status: 'all', product: 'all', dateRange: 'all', dateFrom: '', dateTo: '', page: 1 });
  const [planFilters, setPlanFilters] = useState({ search: '', status: 'all', owner: 'all', billing: 'all', dateRange: 'all', dateFrom: '', dateTo: '', page: 1 });
  const [productForm, setProductForm] = useState(null);
  const [moduleForm, setModuleForm] = useState(null);
  const [planForm, setPlanForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const loadCatalog = () => {
    setLoading(true);
    setError('');
    fetchCatalogBootstrap()
      .then((data) => setCatalog(data))
      .catch(() => setError('Catalog data could not be loaded.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const products = useMemo(() => catalog?.products || [], [catalog]);
  const modules = useMemo(() => catalog?.modules || [], [catalog]);
  const services = useMemo(() => catalog?.services || [], [catalog]);
  const pricingPlans = useMemo(() => catalog?.pricingPlans || [], [catalog]);
  const options = catalog?.options || { currencies: [], billing_cycles: [], discount_types: [] };
  const capabilities = catalog?.capabilities || { supportsDiscounts: false };

  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);
  const serviceById = useMemo(() => new Map(services.map((item) => [item.id, item])), [services]);
  const updateCatalog = (updater) => setCatalog((current) => ({ ...current, ...updater(current) }));

  const openProductForm = (product) => {
    setFormErrors({});
    setProductForm(product ? { ...product } : { ...emptyProduct });
    onNavigate('products');
  };

  const openModuleForm = (module) => {
    setFormErrors({});
    setModuleForm(module ? { ...module } : { ...emptyModule, product: products[0]?.id || '' });
    onNavigate('modules');
  };

  const openPlanForm = (plan) => {
    setFormErrors({});
    const normalized = plan
      ? { ...plan, ownerType: plan.product ? 'product' : 'service' }
      : {
        ...emptyPlan,
        product: products[0]?.id || '',
        service: services[0]?.id || '',
        currency: options.currencies[0] || '',
        billing_cycle: options.billing_cycles[0]?.value || '',
      };
    setPlanForm(normalized);
    onNavigate('pricing-plans');
  };

  const collectionToEndpoint = {
    products: 'products',
    modules: 'modules',
    pricingPlans: 'pricing-plans',
  };

  const toggleItem = async (collection, id) => {
    const current = catalog[collection].find((item) => item.id === id);
    if (!current) return;
    const action = current.is_active ? 'deactivate' : 'activate';
    const actionLabel = current.is_active ? 'Deactivate' : 'Activate';
    if (!window.confirm(`${actionLabel} ${current.name}?`)) return;

    setLoading(true);
    setError('');
    try {
      const endpoint = collectionToEndpoint[collection];
      const csrfToken = getCookie('csrftoken');
      const response = await fetch(`${API_BASE_URL}/api/admin/${endpoint}/${id}/${action}/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
      });

      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new Error(resData.message || `Failed to ${action} item.`);
      }

      loadCatalog();
    } catch (err) {
      alert(err.message || 'Network request failed.');
      setLoading(false);
    }
  };

  const deleteItem = async (collection, id) => {
    const current = catalog[collection].find((item) => item.id === id);
    if (!current || !window.confirm(`Delete ${current.name}?`)) return;

    setLoading(true);
    setError('');
    try {
      const endpoint = collectionToEndpoint[collection];
      const csrfToken = getCookie('csrftoken');
      const response = await fetch(`${API_BASE_URL}/api/admin/${endpoint}/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
      });

      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new Error(resData.message || 'Failed to delete item.');
      }

      loadCatalog();
    } catch (err) {
      alert(err.message || 'Network request failed.');
      setLoading(false);
    }
  };

  const goFilteredProducts = (status = 'all') => {
    setProductFilters((current) => ({ ...current, status, page: 1 }));
    onNavigate('products');
  };

  const goFilteredModules = (status = 'all') => {
    setModuleFilters((current) => ({ ...current, status, page: 1 }));
    onNavigate('modules');
  };

  const goFilteredPlans = (status = 'all', owner = 'all') => {
    setPlanFilters((current) => ({ ...current, status, owner, page: 1 }));
    onNavigate('pricing-plans');
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (!productForm.name.trim()) {
      setFormErrors({ name: 'Name is required.' });
      return;
    }

    setFormErrors({});
    setIsSaving(true);

    try {
      const csrfToken = getCookie('csrftoken');
      const formData = new FormData();
      formData.append('name', productForm.name);
      formData.append('slug', productForm.id ? productForm.slug : slugPreview(productForm.name));
      formData.append('description', productForm.description || '');
      formData.append('is_active', productForm.is_active);
      formData.append('display_order', productForm.display_order || 0);

      if (productForm.image) {
        if (productForm.image.startsWith('data:')) {
          const res = await fetch(productForm.image);
          const blob = await res.blob();
          formData.append('image', blob, 'product_image.png');
        }
      } else {
        formData.append('image', '');
      }

      const method = productForm.id ? 'PATCH' : 'POST';
      const url = productForm.id 
        ? `${API_BASE_URL}/api/admin/products/${productForm.id}/`
        : `${API_BASE_URL}/api/admin/products/`;

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: formData,
      });

      const resData = await response.json();

      if (!response.ok || resData.success === false) {
        setFormErrors(resData.errors || { general: resData.message || 'Product save failed.' });
      } else {
        setProductForm(null);
        loadCatalog();
      }
    } catch (err) {
      setFormErrors({ general: err.message || 'Network connection failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveModule = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!moduleForm.product) errors.product = 'Product is required.';
    if (!moduleForm.name.trim()) errors.name = 'Name is required.';
    if (!moduleForm.code.trim()) errors.code = 'Code is required.';
    if (moduleForm.code.includes(' ')) errors.code = 'Code cannot contain spaces.';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSaving(true);

    try {
      const csrfToken = getCookie('csrftoken');
      const method = moduleForm.id ? 'PUT' : 'POST';
      const url = moduleForm.id
        ? `${API_BASE_URL}/api/admin/modules/${moduleForm.id}/`
        : `${API_BASE_URL}/api/admin/modules/`;

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify(moduleForm),
      });

      const resData = await response.json();

      if (!response.ok || resData.success === false) {
        setFormErrors(resData.errors || { general: resData.message || 'Module save failed.' });
      } else {
        setModuleForm(null);
        loadCatalog();
      }
    } catch (err) {
      setFormErrors({ general: err.message || 'Network connection failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const validatePlan = () => {
    const errors = {};
    const ownerId = planForm.ownerType === 'product' ? planForm.product : planForm.service;
    if (!ownerId) errors.owner = 'Select a Product or Service.';
    if (!planForm.name.trim()) errors.name = 'Name is required.';
    if (Number(planForm.price) < 0 || planForm.price === '') errors.price = 'Price must be a non-negative number.';
    if (!planForm.currency) errors.currency = 'Currency is required.';
    if (!planForm.billing_cycle) errors.billing_cycle = 'Billing Cycle is required.';

    const selectedModules = planForm.plan_modules.map((row) => row.module).filter(Boolean);
    if (new Set(selectedModules).size !== selectedModules.length) {
      errors.plan_modules = 'Duplicate module selections are not allowed.';
    }

    planForm.discounts.forEach((discount, index) => {
      if (!discount.name.trim()) errors[`discount_${index}_name`] = 'Discount name is required.';
      if (discount.start_date && discount.end_date && discount.end_date <= discount.start_date) {
        errors[`discount_${index}_end_date`] = 'End Date must be after Start Date.';
      }
    });

    return errors;
  };

  const syncPlanModules = async (planId, desired, original) => {
    const csrfToken = getCookie('csrftoken');
    const originalMap = new Map(original.map((item) => [item.id, item]));

    // 1. Delete removed
    for (const orig of original) {
      if (!desired.some((item) => item.id === orig.id)) {
        const delRes = await fetch(`${API_BASE_URL}/api/admin/plan-modules/${orig.id}/`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
          },
        });
        if (!delRes.ok) {
          const errData = await delRes.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to remove old plan module.');
        }
      }
    }

    // 2. Add or Update
    for (const des of desired) {
      const pmPayload = {
        plan: planId,
        module: des.module,
        is_enabled: des.is_enabled,
        limit_value: des.limit_value || '',
      };

      const isNew = typeof des.id === 'string' && des.id.startsWith('pm_');
      if (isNew) {
        const addRes = await fetch(`${API_BASE_URL}/api/admin/plan-modules/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
          },
          body: JSON.stringify(pmPayload),
        });
        if (!addRes.ok) {
          const errData = await addRes.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to link new plan module.');
        }
      } else {
        const orig = originalMap.get(des.id);
        if (orig && (orig.module !== des.module || orig.is_enabled !== des.is_enabled || orig.limit_value !== des.limit_value)) {
          const upRes = await fetch(`${API_BASE_URL}/api/admin/plan-modules/${des.id}/`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
            },
            body: JSON.stringify(pmPayload),
          });
          if (!upRes.ok) {
            const errData = await upRes.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to update plan module.');
          }
        }
      }
    }
  };

  const syncDiscounts = async (planId, desired, original) => {
    const csrfToken = getCookie('csrftoken');
    const originalMap = new Map(original.map((item) => [item.id, item]));

    // 1. Delete removed
    for (const orig of original) {
      if (!desired.some((item) => item.id === orig.id)) {
        const delRes = await fetch(`${API_BASE_URL}/api/admin/discounts/${orig.id}/`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
          },
        });
        if (!delRes.ok) {
          const errData = await delRes.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to remove old discount.');
        }
      }
    }

    // 2. Add or Update
    for (const des of desired) {
      const discPayload = {
        pricing_plan: planId,
        name: des.name,
        discount_type: des.discount_type,
        value: Number(des.value),
        is_active: des.is_active,
        start_date: des.start_date ? new Date(des.start_date).toISOString() : null,
        end_date: des.end_date ? new Date(des.end_date).toISOString() : null,
      };

      const isNew = typeof des.id === 'string' && des.id.startsWith('disc_');
      if (isNew) {
        const addRes = await fetch(`${API_BASE_URL}/api/admin/discounts/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
          },
          body: JSON.stringify(discPayload),
        });
        if (!addRes.ok) {
          const errData = await addRes.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to create discount.');
        }
      } else {
        const orig = originalMap.get(des.id);
        if (orig && (orig.name !== des.name || orig.discount_type !== des.discount_type || Number(orig.value) !== Number(des.value) || orig.is_active !== des.is_active || orig.start_date !== des.start_date || orig.end_date !== des.end_date)) {
          const upRes = await fetch(`${API_BASE_URL}/api/admin/discounts/${des.id}/`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
            },
            body: JSON.stringify(discPayload),
          });
          if (!upRes.ok) {
            const errData = await upRes.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to update discount.');
          }
        }
      }
    }
  };

  const savePlan = async (event) => {
    event.preventDefault();
    const errors = validatePlan();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSaving(true);

    try {
      const csrfToken = getCookie('csrftoken');
      const corePayload = {
        product: planForm.ownerType === 'product' ? planForm.product : null,
        service: planForm.ownerType === 'service' ? planForm.service : null,
        name: planForm.name,
        price: Number(planForm.price),
        currency: planForm.currency,
        billing_cycle: planForm.billing_cycle,
        is_active: planForm.is_active,
        display_order: planForm.display_order || 0,
      };

      const isEdit = !!planForm.id;
      const url = isEdit
        ? `${API_BASE_URL}/api/admin/pricing-plans/${planForm.id}/`
        : `${API_BASE_URL}/api/admin/pricing-plans/`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify(corePayload),
      });

      const resData = await response.json();

      if (!response.ok || resData.success === false) {
        setFormErrors(resData.errors || { general: resData.message || 'Pricing plan core save failed.' });
        setIsSaving(false);
        return;
      }

      const planId = resData.data.id;
      const originalPlan = isEdit 
        ? catalog.pricingPlans.find((item) => item.id === planForm.id)
        : null;

      const originalModules = originalPlan ? originalPlan.plan_modules : [];
      const originalDiscounts = originalPlan ? originalPlan.discounts : [];

      await syncPlanModules(planId, planForm.plan_modules, originalModules);
      await syncDiscounts(planId, planForm.discounts, originalDiscounts);

      setPlanForm(null);
      loadCatalog();
    } catch (err) {
      setFormErrors({ general: err.message || 'Network connection failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return <ErrorBanner message={error} onRetry={loadCatalog} />;
  }

  if (screen === 'products') {
    return productForm ? (
      <ProductForm
        form={productForm}
        setForm={setProductForm}
        errors={formErrors}
        plans={pricingPlans.filter((plan) => plan.product === productForm.id)}
        onCancel={() => setProductForm(null)}
        onSave={saveProduct}
        onManagePlans={() => goFilteredPlans('all', productForm.id)}
        disabled={isSaving}
      />
    ) : (
      <ProductsPage
        loading={loading}
        products={products}
        filters={productFilters}
        setFilters={setProductFilters}
        onAdd={() => openProductForm()}
        onEdit={openProductForm}
        onToggle={(id) => toggleItem('products', id)}
        onDelete={(id) => deleteItem('products', id)}
        onManagePlans={(id) => goFilteredPlans('all', id)}
      />
    );
  }

  if (screen === 'modules') {
    return moduleForm ? (
      <ModuleForm
        form={moduleForm}
        setForm={setModuleForm}
        products={products}
        errors={formErrors}
        onCancel={() => setModuleForm(null)}
        onSave={saveModule}
        disabled={isSaving}
      />
    ) : (
      <ModulesPage
        loading={loading}
        modules={modules}
        productById={productById}
        filters={moduleFilters}
        setFilters={setModuleFilters}
        onAdd={() => openModuleForm()}
        onEdit={openModuleForm}
        onToggle={(id) => toggleItem('modules', id)}
        onDelete={(id) => deleteItem('modules', id)}
      />
    );
  }

  if (screen === 'pricing-plans') {
    return planForm ? (
      <PlanForm
        form={planForm}
        setForm={setPlanForm}
        products={products}
        services={services}
        modules={modules}
        options={options}
        capabilities={capabilities}
        errors={formErrors}
        onCancel={() => setPlanForm(null)}
        onSave={savePlan}
        disabled={isSaving}
      />
    ) : (
      <PricingPlansPage
        loading={loading}
        plans={pricingPlans}
        productById={productById}
        serviceById={serviceById}
        options={options}
        filters={planFilters}
        setFilters={setPlanFilters}
        onAdd={() => openPlanForm()}
        onEdit={openPlanForm}
        onToggle={(id) => toggleItem('pricingPlans', id)}
        onDelete={(id) => deleteItem('pricingPlans', id)}
      />
    );
  }

  return (
    <DashboardPagePro
      loading={loading}
      products={products}
      modules={modules}
      plans={pricingPlans}
      onProducts={goFilteredProducts}
      onModules={goFilteredModules}
      onPlans={goFilteredPlans}
      onAddProduct={() => openProductForm()}
      onAddModule={() => openModuleForm()}
      onAddPlan={() => openPlanForm()}
    />
  );
}

function PageHeader({ title, description, actionLabel, onAction, onBack }) {
  return (
    <div className="admin-page-head">
      {onBack && (
        <button type="button" className="lead-form-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
      )}
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actionLabel && (
        <button type="button" className="admin-primary" onClick={onAction}>
          <Plus size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Toolbar({ children }) {
  return <div className="admin-toolbar">{children}</div>;
}

function DashboardPagePro({ loading, products, modules, plans, onProducts, onModules, onPlans, onAddProduct, onAddModule, onAddPlan }) {
  const recent = useMemo(() => [
    ...products.map((item) => ({ type: 'Product', name: item.name, is_active: item.is_active, updated_at: item.updated_at, updated_by: item.updated_by })),
    ...modules.map((item) => ({ type: 'Module', name: item.name, is_active: item.is_active, updated_at: item.updated_at, updated_by: item.updated_by })),
    ...plans.map((item) => ({ type: 'Plan', name: item.name, is_active: item.is_active, updated_at: item.updated_at, updated_by: item.updated_by })),
  ].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8), [products, modules, plans]);

  const stats = [
    { label: 'Total Products', value: products.length, icon: Boxes, tone: 'blue', helper: 'Configured catalog products', onClick: () => onProducts('all') },
    { label: 'Active Products', value: products.filter((item) => item.is_active).length, icon: CheckCircle2, tone: 'green', helper: 'Published and customer-ready', onClick: () => onProducts('active') },
    { label: 'Total Modules', value: modules.length, icon: Layers3, tone: 'indigo', helper: 'Product capabilities', onClick: () => onModules('all') },
    { label: 'Active Modules', value: modules.filter((item) => item.is_active).length, icon: CheckCircle2, tone: 'green', helper: 'Available for plans', onClick: () => onModules('active') },
    { label: 'Total Pricing Plans', value: plans.length, icon: CreditCard, tone: 'amber', helper: 'Subscription packages', onClick: () => onPlans('all') },
    { label: 'Active Pricing Plans', value: plans.filter((item) => item.is_active).length, icon: CheckCircle2, tone: 'green', helper: 'Plans ready to sell', onClick: () => onPlans('active') },
  ];

  const quickActions = [
    { label: 'Add Product', helper: 'Create a new catalog product', icon: Boxes, onClick: onAddProduct },
    { label: 'Add Module', helper: 'Attach capabilities to products', icon: Layers3, onClick: onAddModule },
    { label: 'Add Pricing Plan', helper: 'Define pricing and entitlements', icon: CreditCard, onClick: onAddPlan },
  ];

  return (
    <section className="catalog-dashboard-pro">
      <section className="catalog-hero-pro">
        <div>
          <span className="catalog-hero-eyebrow"><Sparkles size={16} /> JTS Admin</span>
          <h1>ADMIN DASHBOARD</h1>
          <p>Manage products, modules, and pricing plans from one operational workspace.</p>
        </div>
        <div className="catalog-hero-actions">
          <button type="button" onClick={onAddProduct}><PlusCircle size={17} />Product</button>
          <button type="button" onClick={onAddModule}><PlusCircle size={17} />Module</button>
          <button type="button" onClick={onAddPlan}><PlusCircle size={17} />Pricing Plan</button>
        </div>
      </section>

      <section className="catalog-kpi-grid" aria-label="Catalog summary">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button type="button" className={`catalog-kpi-card catalog-kpi-card--${stat.tone}`} key={stat.label} onClick={stat.onClick}>
              <span className="catalog-kpi-icon"><Icon size={20} /></span>
              <span className="catalog-kpi-label">{stat.label}</span>
              <strong>{loading ? '...' : stat.value}</strong>
              <small>{stat.helper}</small>
            </button>
          );
        })}
      </section>

      <section className="catalog-dashboard-grid">
        <div className="catalog-panel catalog-quick-panel">
          <div className="catalog-panel-head">
            <div>
              <h2>Quick Actions</h2>
              <p>Start common catalog workflows.</p>
            </div>
          </div>
          <div className="catalog-action-list">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button type="button" key={action.label} onClick={action.onClick}>
                  <span><Icon size={18} /></span>
                  <div>
                    <strong>{action.label}</strong>
                    <small>{action.helper}</small>
                  </div>
                  <Plus size={16} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="catalog-panel catalog-activity-panel">
          <div className="catalog-panel-head">
            <div>
              <h2>Recent Catalog Activity</h2>
              <p>Latest product, module, and plan updates.</p>
            </div>
          </div>
          <div className="catalog-activity-table-wrap">
            <table className="catalog-activity-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Updated By</th>
                </tr>
              </thead>
              {loading ? (
                <LoadingRows columns={5} />
              ) : (
                <tbody>
                  {recent.map((item) => (
                    <tr key={`${item.type}-${item.name}`}>
                      <td><span className="catalog-type-pill">{item.type}</span></td>
                      <td>{item.name}</td>
                      <td><StatusBadge active={item.is_active} /></td>
                      <td>{formatDate(item.updated_at)}</td>
                      <td>{item.updated_by || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
          {!loading && recent.length === 0 && <EmptyState title="No catalog activity yet." />}
        </div>
      </section>
    </section>
  );
}

function ClearFiltersButton({ onClick }) {
  return (
    <button type="button" className="lf-clear-filters lf-clear-filters--icon admin-clear-filters" onClick={onClick} aria-label="Clear filters">
      <X size={18} />
    </button>
  );
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const dateOptions = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'last-7-days', label: 'Last 7 Days' },
  { value: 'this-month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
];

function ProductsPage({ loading, products, filters, setFilters, onAdd, onEdit, onToggle, onDelete, onManagePlans }) {
  const filtered = products
    .filter((item) => filters.name === 'all' || item.id === filters.name)
    .filter((item) => matchesDateFilter(item.created_at, filters.dateRange, { from: filters.dateFrom, to: filters.dateTo }))
    .filter((item) => filters.status === 'all' || (filters.status === 'active' ? item.is_active : !item.is_active))
    .filter((item) => item.name.toLowerCase().includes(filters.search.toLowerCase()))
    .sort((a, b) => filters.sort === 'created_at' ? new Date(b.created_at) - new Date(a.created_at) : a.display_order - b.display_order);
  const page = paginate(filtered, filters.page);
  const summary = [
    { label: 'Total Products', value: products.length },
    { label: 'Active', value: products.filter((item) => item.is_active).length, tone: 'green' },
    { label: 'Inactive', value: products.filter((item) => !item.is_active).length, tone: 'red' },
    { label: 'Visible Rows', value: filtered.length, tone: 'blue' },
  ];
  const hasActiveFilters = filters.status !== 'all' || filters.dateRange !== 'all' || filters.sort !== 'display_order';

  return (
    <section className="lf-page leads-page contacts-page catalog-admin-page">
      <section className="lf-table-card sales-table-card admin-table-card">
        <section className="page-panel leads-page-panel">
          <SummaryStrip items={summary} />
          <Toolbar>
            <SelectFilter label="Status" value={filters.status} options={statusOptions} onChange={(value) => setFilters({ ...filters, status: value, page: 1 })} />
            <DateFilter value={filters.dateRange} range={{ from: filters.dateFrom, to: filters.dateTo }} onChange={(value) => setFilters({ ...filters, dateRange: value, page: 1 })} onRangeChange={(range) => setFilters({ ...filters, dateFrom: range.from, dateTo: range.to, dateRange: 'custom', page: 1 })} />
            <SelectFilter label="Sort" value={filters.sort} options={[{ value: 'display_order', label: 'Display Order' }, { value: 'created_at', label: 'Created At' }]} onChange={(value) => setFilters({ ...filters, sort: value, page: 1 })} />
            {hasActiveFilters && <ClearFiltersButton onClick={() => setFilters({ search: '', status: 'all', name: 'all', dateRange: 'all', dateFrom: '', dateTo: '', sort: 'display_order', page: 1 })} />}
          </Toolbar>
          <header className="page-panel-header sales-page-header">
            <button className="lf-btn lf-btn-primary" type="button" onClick={onAdd}>
              <PlusCircle size={17} />
              New Product
            </button>
          </header>
        </section>
        <ListTable loading={loading} empty="No products yet - click Add Product to get started." columns={['#', 'Name', 'Created At', 'Slug', 'Is Active', 'Display Order', 'Actions']} rows={page.rows}>
          {page.rows.map((product) => (
            <tr key={product.id}>
              <td className="lf-sr-col">{products.findIndex((item) => item.id === product.id) + 1}</td>
              <td>{product.name}</td>
              <td>{formatDate(product.created_at)}</td>
              <td>{product.slug}</td>
              <td><StatusBadge active={product.is_active} /></td>
              <td>{product.display_order}</td>
              <td><RowActions canDelete={product.can_delete} onEdit={() => onEdit(product)} onToggle={() => onToggle(product.id)} onDelete={() => onDelete(product.id)} extraLabel="Manage Pricing Plans" onExtra={() => onManagePlans(product.id)} /></td>
            </tr>
          ))}
        </ListTable>
        {!loading && filtered.length > 0 && <Pagination page={filters.page} totalPages={page.totalPages} onPageChange={(next) => setFilters({ ...filters, page: next })} />}
      </section>
    </section>
  );
}

function ModulesPage({ loading, modules, productById, filters, setFilters, onAdd, onEdit, onToggle, onDelete }) {
  const filtered = modules
    .filter((item) => filters.product === 'all' || item.product === filters.product)
    .filter((item) => matchesDateFilter(item.created_at, filters.dateRange, { from: filters.dateFrom, to: filters.dateTo }))
    .filter((item) => filters.status === 'all' || (filters.status === 'active' ? item.is_active : !item.is_active))
    .filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(filters.search.toLowerCase()));
  const page = paginate(filtered, filters.page);
  const summary = [
    { label: 'Total Modules', value: modules.length },
    { label: 'Active', value: modules.filter((item) => item.is_active).length, tone: 'green' },
    { label: 'Inactive', value: modules.filter((item) => !item.is_active).length, tone: 'red' },
    { label: 'Visible Rows', value: filtered.length, tone: 'blue' },
  ];
  const hasActiveFilters = filters.status !== 'all' || filters.dateRange !== 'all';

  return (
    <section className="lf-page leads-page contacts-page catalog-admin-page">
      <section className="lf-table-card sales-table-card admin-table-card">
        <section className="page-panel leads-page-panel">
          <SummaryStrip items={summary} />
          <Toolbar>
            <SelectFilter label="Status" value={filters.status} options={statusOptions} onChange={(value) => setFilters({ ...filters, status: value, page: 1 })} />
            <DateFilter value={filters.dateRange} range={{ from: filters.dateFrom, to: filters.dateTo }} onChange={(value) => setFilters({ ...filters, dateRange: value, page: 1 })} onRangeChange={(range) => setFilters({ ...filters, dateFrom: range.from, dateTo: range.to, dateRange: 'custom', page: 1 })} />
            {hasActiveFilters && <ClearFiltersButton onClick={() => setFilters({ search: '', status: 'all', product: 'all', dateRange: 'all', dateFrom: '', dateTo: '', page: 1 })} />}
          </Toolbar>
          <header className="page-panel-header sales-page-header">
            <button className="lf-btn lf-btn-primary" type="button" onClick={onAdd}>
              <PlusCircle size={17} />
              New Module
            </button>
          </header>
        </section>
        <ListTable loading={loading} empty="No modules yet - click Add Module to get started." columns={['#', 'Product', 'Name', 'Created At', 'Code', 'Is Active', 'Display Order', 'Actions']} rows={page.rows}>
          {page.rows.map((module) => (
            <tr key={module.id}>
              <td className="lf-sr-col">{modules.findIndex((item) => item.id === module.id) + 1}</td>
              <td>{productById.get(module.product)?.name || '—'}</td>
              <td>{module.name}</td>
              <td>{formatDate(module.created_at)}</td>
              <td>{module.code}</td>
              <td><StatusBadge active={module.is_active} /></td>
              <td>{module.display_order}</td>
              <td><RowActions canDelete={module.can_delete} onEdit={() => onEdit(module)} onToggle={() => onToggle(module.id)} onDelete={() => onDelete(module.id)} /></td>
            </tr>
          ))}
        </ListTable>
        {!loading && filtered.length > 0 && <Pagination page={filters.page} totalPages={page.totalPages} onPageChange={(next) => setFilters({ ...filters, page: next })} />}
      </section>
    </section>
  );
}

function PricingPlansPage({ loading, plans, productById, serviceById, options, filters, setFilters, onAdd, onEdit, onToggle, onDelete }) {
  const filtered = plans
    .filter((item) => filters.owner === 'all' || item.product === filters.owner || item.service === filters.owner)
    .filter((item) => matchesDateFilter(item.created_at, filters.dateRange, { from: filters.dateFrom, to: filters.dateTo }))
    .filter((item) => filters.status === 'all' || (filters.status === 'active' ? item.is_active : !item.is_active))
    .filter((item) => filters.billing === 'all' || item.billing_cycle === filters.billing)
    .filter((item) => item.name.toLowerCase().includes(filters.search.toLowerCase()));
  const page = paginate(filtered, filters.page);
  const summary = [
    { label: 'Total Pricing Plans', value: plans.length },
    { label: 'Active', value: plans.filter((item) => item.is_active).length, tone: 'green' },
    { label: 'Inactive', value: plans.filter((item) => !item.is_active).length, tone: 'red' },
    { label: 'Visible Rows', value: filtered.length, tone: 'blue' },
  ];
  const hasActiveFilters = filters.status !== 'all' || filters.billing !== 'all' || filters.dateRange !== 'all';

  return (
    <section className="lf-page leads-page contacts-page catalog-admin-page">
      <section className="lf-table-card sales-table-card admin-table-card">
        <section className="page-panel leads-page-panel">
          <SummaryStrip items={summary} />
          <Toolbar>
            <SelectFilter label="Status" value={filters.status} options={statusOptions} onChange={(value) => setFilters({ ...filters, status: value, page: 1 })} />
            <SearchableFilter label="Billing Cycle" value={filters.billing} options={[{ value: 'all', label: 'All Billing Cycles' }, ...options.billing_cycles]} onChange={(value) => setFilters({ ...filters, billing: value, page: 1 })} />
            <DateFilter value={filters.dateRange} range={{ from: filters.dateFrom, to: filters.dateTo }} onChange={(value) => setFilters({ ...filters, dateRange: value, page: 1 })} onRangeChange={(range) => setFilters({ ...filters, dateFrom: range.from, dateTo: range.to, dateRange: 'custom', page: 1 })} />
            {hasActiveFilters && <ClearFiltersButton onClick={() => setFilters({ search: '', status: 'all', owner: 'all', billing: 'all', dateRange: 'all', dateFrom: '', dateTo: '', page: 1 })} />}
          </Toolbar>
          <header className="page-panel-header sales-page-header">
            <button className="lf-btn lf-btn-primary" type="button" onClick={onAdd}>
              <PlusCircle size={17} />
              New Plan
            </button>
          </header>
        </section>
        <ListTable loading={loading} empty="No pricing plans yet - click Add Pricing Plan to get started." columns={['#', 'Product / Service', 'Name', 'Created At', 'Price', 'Currency', 'Billing Cycle', 'Is Active', 'Display Order', 'Actions']} rows={page.rows}>
          {page.rows.map((plan) => (
            <tr key={plan.id}>
              <td className="lf-sr-col">{plans.findIndex((item) => item.id === plan.id) + 1}</td>
              <td>{plan.product ? productById.get(plan.product)?.name : serviceById.get(plan.service)?.name}</td>
              <td>{plan.name}</td>
              <td>{formatDate(plan.created_at)}</td>
              <td>{Number(plan.price).toLocaleString()}</td>
              <td>{plan.currency}</td>
              <td>{cycleLabel(options, plan.billing_cycle)}</td>
              <td><StatusBadge active={plan.is_active} /></td>
              <td>{plan.display_order}</td>
              <td><RowActions canDelete={plan.can_delete} onEdit={() => onEdit(plan)} onToggle={() => onToggle(plan.id)} onDelete={() => onDelete(plan.id)} /></td>
            </tr>
          ))}
        </ListTable>
        {!loading && filtered.length > 0 && <Pagination page={filters.page} totalPages={page.totalPages} onPageChange={(next) => setFilters({ ...filters, page: next })} />}
      </section>
    </section>
  );
}

function ListTable({ loading, empty, columns, rows, children }) {
  return (
    <>
      <div className="lf-table-scroll">
        <table className="lf-leads-table">
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          {loading ? <LoadingRows columns={columns.length} /> : <tbody>{children}</tbody>}
        </table>
      </div>
      {!loading && rows.length === 0 && <EmptyState title={empty} />}
    </>
  );
}

function RowActions({ onEdit, onToggle, onDelete, extraLabel, onExtra }) {
  void onToggle;
  void extraLabel;
  void onExtra;

  return (
    <div className="inline-row-actions admin-actions">
      <button type="button" className="inline-action inline-action--edit" title="Edit" onClick={onEdit}><Edit3 size={15} /></button>
      <button
        type="button"
        className="inline-action inline-action--delete"
        title="Delete"
        onClick={onDelete}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function ProductForm({ form, setForm, errors, plans, onCancel, onSave, onManagePlans, disabled = false }) {
  const [preview, setPreview] = useState(form.image || '');
  const previewSlug = form.id ? form.slug : slugPreview(form.name);

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      setForm({ ...form, image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <form className="admin-form-page lead-form-page contact-form-page" onSubmit={onSave}>
      <div className="lead-form-page-card">
        <PageHeader title={form.id ? 'Edit Product' : 'Add Product'} description="Slug preview is read-only; final slug is set by the system." onBack={onCancel} />
        {errors.general && (
          <div className="admin-error" style={{ marginBottom: '20px' }}>
            <span>{errors.general}</span>
          </div>
        )}
        <div className="admin-card form-grid">
          <label className="field">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={disabled} /><FieldError>{errors.name}</FieldError></label>
          <label className="field">Slug<input value={previewSlug} disabled readOnly /><FieldError>{errors.slug}</FieldError></label>
          <label className="field wide">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} disabled={disabled} /></label>
          <div className="field wide">
            <span>Image</span>
            <label className={`admin-upload ${disabled ? 'disabled' : ''}`}>
              <Upload size={16} />
              Upload Image
              <input type="file" accept="image/*" onChange={handleImage} disabled={disabled} />
            </label>
            {preview ? <img className="admin-image-preview" src={preview} alt="Product preview" /> : <div className="admin-image-empty"><ImagePlus size={20} />No image selected</div>}
          </div>
          <Toggle checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} label="Is Active" disabled={disabled} />
          <label className="field">Display Order<input type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} disabled={disabled} /></label>
        </div>
        {form.id && (
          <div className="admin-card">
            <div className="admin-section-row">
              <h3>Pricing Plans</h3>
              <button type="button" className="admin-secondary" onClick={onManagePlans} disabled={disabled}>Manage Pricing Plans</button>
            </div>
            {plans.length ? plans.map((plan) => <p key={plan.id} className="admin-summary-row">{plan.name}<StatusBadge active={plan.is_active} /></p>) : <EmptyState title="No pricing plans associated with this product." />}
          </div>
        )}
        <FormActions submitLabel={form.id ? 'Save' : 'Create Product'} onCancel={onCancel} disabled={disabled} />
      </div>
    </form>
  );
}

function ModuleForm({ form, setForm, products, errors, onCancel, onSave, disabled = false }) {
  return (
    <form className="admin-form-page lead-form-page contact-form-page" onSubmit={onSave}>
      <div className="lead-form-page-card">
        <PageHeader title={form.id ? 'Edit Module' : 'Add Module'} description="Product is selected from backend-loaded Products only." onBack={onCancel} />
        {errors.general && (
          <div className="admin-error" style={{ marginBottom: '20px' }}>
            <span>{errors.general}</span>
          </div>
        )}
        <div className="admin-card form-grid">
          <label className="field">Product<select value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} disabled={disabled}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><FieldError>{errors.product}</FieldError></label>
          <label className="field">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={disabled} /><FieldError>{errors.name}</FieldError></label>
          <label className="field">Code<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} disabled={disabled} /><FieldError>{errors.code}</FieldError></label>
          <label className="field wide">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} disabled={disabled} /></label>
          <Toggle checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} label="Is Active" disabled={disabled} />
          <label className="field">Display Order<input type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} disabled={disabled} /></label>
        </div>
        <FormActions submitLabel={form.id ? 'Save' : 'Create Module'} onCancel={onCancel} disabled={disabled} />
      </div>
    </form>
  );
}

function PlanForm({ form, setForm, products, services, modules, options, capabilities, errors, onCancel, onSave, disabled = false }) {
  const availableModules = form.ownerType === 'product' ? modules.filter((module) => Number(module.product) === Number(form.product)) : modules;
  const addModule = () => setForm({ ...form, plan_modules: [...form.plan_modules, { id: `pm_${Date.now()}`, module: '', is_enabled: true, limit_value: '' }] });
  const addDiscount = () => setForm({ ...form, discounts: [...form.discounts, { id: `disc_${Date.now()}`, name: '', discount_type: options.discount_types[0]?.value || '', value: '', is_active: true, start_date: '', end_date: '' }] });

  return (
    <form className="admin-form-page lead-form-page contact-form-page pricing-plan-form-page" onSubmit={onSave}>
      <div className="lead-form-page-card">
        <PageHeader title={form.id ? 'Edit Pricing Plan' : 'Add Pricing Plan'} description="Configure ownership, core plan details, included modules, and discounts." onBack={onCancel} />
        {errors.general && (
          <div className="admin-error" style={{ marginBottom: '20px' }}>
            <span>{errors.general}</span>
          </div>
        )}
        <div className="admin-card form-grid">
          <div className="field wide">
            <span>Plan belongs to</span>
            <div className="admin-radio-row">
              <label><input type="radio" checked={form.ownerType === 'product'} onChange={() => setForm({ ...form, ownerType: 'product', product: products[0]?.id || '', service: null })} disabled={disabled} /> Product</label>
              <label><input type="radio" checked={form.ownerType === 'service'} onChange={() => setForm({ ...form, ownerType: 'service', service: services[0]?.id || '', product: null })} disabled={disabled} /> Service</label>
            </div>
            <FieldError>{errors.owner}</FieldError>
          </div>
          {form.ownerType === 'product' ? (
            <label className="field">Product<select value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} disabled={disabled}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          ) : (
            <label className="field">Service<select value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })} disabled={disabled}>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
          )}
          <label className="field">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={disabled} /><FieldError>{errors.name}</FieldError></label>
          <label className="field">Price<input type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} disabled={disabled} /><FieldError>{errors.price}</FieldError></label>
          <label className="field">Currency<select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} disabled={disabled}>{options.currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select><FieldError>{errors.currency}</FieldError></label>
          <label className="field">Billing Cycle<select value={form.billing_cycle} onChange={(event) => setForm({ ...form, billing_cycle: event.target.value })} disabled={disabled}>{options.billing_cycles.map((cycle) => <option key={cycle.value} value={cycle.value}>{cycle.label}</option>)}</select><FieldError>{errors.billing_cycle}</FieldError></label>
          <Toggle checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} label="Is Active" disabled={disabled} />
          <label className="field">Display Order<input type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} disabled={disabled} /></label>
        </div>
        <NestedModules form={form} setForm={setForm} modules={availableModules} errors={errors} addModule={addModule} disabled={disabled} />
        {capabilities.supportsDiscounts && <NestedDiscounts form={form} setForm={setForm} options={options} errors={errors} addDiscount={addDiscount} disabled={disabled} />}
        <FormActions submitLabel={form.id ? 'Save' : 'Create Pricing Plan'} onCancel={onCancel} disabled={disabled} />
      </div>
    </form>
  );
}

function NestedModules({ form, setForm, modules, errors, addModule, disabled = false }) {
  const updateRow = (index, patch) => {
    const plan_modules = form.plan_modules.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row);
    setForm({ ...form, plan_modules });
  };
  const removeRow = (index) => setForm({ ...form, plan_modules: form.plan_modules.filter((_, rowIndex) => rowIndex !== index) });

  return (
    <div className="admin-card">
      <div className="admin-section-row"><h3>Plan Modules</h3><button type="button" className="admin-secondary" onClick={addModule} disabled={disabled}>+ Add Module</button></div>
      <FieldError>{errors.plan_modules}</FieldError>
      <div className="admin-repeat-list">
        {form.plan_modules.map((row, index) => (
          <div className="admin-repeat-row" key={row.id || index}>
            <label className="field">Module<select value={row.module} onChange={(event) => updateRow(index, { module: event.target.value })} disabled={disabled}><option value="">Select Module</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.name}</option>)}</select></label>
            <Toggle checked={row.is_enabled} onChange={(value) => updateRow(index, { is_enabled: value })} label="Is Enabled" disabled={disabled} />
            <label className="field">Limit Value<input value={row.limit_value} onChange={(event) => updateRow(index, { limit_value: event.target.value })} disabled={disabled} /></label>
            <button type="button" className="admin-secondary" onClick={() => removeRow(index)} disabled={disabled}>Remove</button>
          </div>
        ))}
        {form.plan_modules.length === 0 && <EmptyState title="No plan modules added." />}
      </div>
    </div>
  );
}

function NestedDiscounts({ form, setForm, options, errors, addDiscount, disabled = false }) {
  const updateRow = (index, patch) => {
    const discounts = form.discounts.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row);
    setForm({ ...form, discounts });
  };
  const removeRow = (index) => setForm({ ...form, discounts: form.discounts.filter((_, rowIndex) => rowIndex !== index) });

  return (
    <div className="admin-card">
      <div className="admin-section-row"><h3>Discounts</h3><button type="button" className="admin-secondary" onClick={addDiscount} disabled={disabled}>+ Add Discount</button></div>
      <div className="admin-repeat-list">
        {form.discounts.map((row, index) => (
          <div className="admin-discount-row" key={row.id || index}>
            <label className="field">Name<input value={row.name} onChange={(event) => updateRow(index, { name: event.target.value })} disabled={disabled} /><FieldError>{errors[`discount_${index}_name`]}</FieldError></label>
            <label className="field">Discount Type<select value={row.discount_type} onChange={(event) => updateRow(index, { discount_type: event.target.value })} disabled={disabled}>{options.discount_types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
            <label className="field">Value<input type="number" value={row.value} onChange={(event) => updateRow(index, { value: event.target.value })} disabled={disabled} /></label>
            <Toggle checked={row.is_active} onChange={(value) => updateRow(index, { is_active: value })} label="Is Active" disabled={disabled} />
            <label className="field">Start Date<input type="date" value={row.start_date ? row.start_date.split('T')[0] : ''} onChange={(event) => updateRow(index, { start_date: event.target.value })} disabled={disabled} /></label>
            <label className="field">End Date<input type="date" value={row.end_date ? row.end_date.split('T')[0] : ''} onChange={(event) => updateRow(index, { end_date: event.target.value })} disabled={disabled} /><FieldError>{errors[`discount_${index}_end_date`]}</FieldError></label>
            <button type="button" className="admin-secondary" onClick={() => removeRow(index)} disabled={disabled}>Remove</button>
          </div>
        ))}
        {form.discounts.length === 0 && <EmptyState title="No discounts added." />}
      </div>
    </div>
  );
}

function FormActions({ submitLabel, onCancel, disabled = false }) {
  return (
    <div className="admin-form-actions">
      <button type="button" className="admin-secondary" onClick={onCancel} disabled={disabled}>Cancel</button>
      <button type="submit" className="admin-primary" disabled={disabled}>{disabled ? 'Saving...' : submitLabel}</button>
    </div>
  );
}
