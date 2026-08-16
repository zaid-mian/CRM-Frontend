export const RBAC_STORAGE_KEYS = {
  roles: 'leadflow_rbac_roles',
  permissions: 'leadflow_rbac_permissions',
  userRoles: 'leadflow_rbac_user_roles',
};

export const RBAC_MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    actions: ['view'],
  },
  {
    key: 'leads',
    label: 'Leads',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: 'contacts',
    label: 'Contacts',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: 'companies',
    label: 'Companies',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: 'pipeline',
    label: 'Pipeline',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: 'payments',
    label: 'Payments',
    actions: ['view', 'create', 'edit', 'delete'],
  },
];

/* =========================================================
   DEFAULT ROLES
========================================================= */

export const DEFAULT_ROLES = [
  {
    id: 'RL-0001',
    name: 'Administrator',
    description: 'Full administrative access to the CRM workspace.',
    status: 'Active',
    assignedUsers: 0,
    createdDate: '2026-08-01',
  },
  {
    id: 'RL-0002',
    name: 'Sales Manager',
    description: 'Manage sales records, pipeline activity, and team workflows.',
    status: 'Active',
    assignedUsers: 0,
    createdDate: '2026-08-03',
  },
  {
    id: 'RL-0003',
    name: 'Sales Representative',
    description: 'Work with assigned leads, contacts, companies, and opportunities.',
    status: 'Active',
    assignedUsers: 0,
    createdDate: '2026-08-05',
  },
  {
    id: 'RL-0004',
    name: 'Viewer',
    description: 'Read-only access to approved CRM modules.',
    status: 'Active',
    assignedUsers: 0,
    createdDate: '2026-08-07',
  },
];

/* =========================================================
   DEFAULT ROLE PERMISSIONS
========================================================= */

export const DEFAULT_ROLE_PERMISSIONS = {
  Administrator: buildPermissionSet({
    dashboard: ['view'],
    leads: ['view', 'create', 'edit', 'delete'],
    contacts: ['view', 'create', 'edit', 'delete'],
    companies: ['view', 'create', 'edit', 'delete'],
    pipeline: ['view', 'create', 'edit', 'delete'],
    payments: ['view', 'create', 'edit', 'delete'],
  }),

  'Sales Manager': buildPermissionSet({
    dashboard: ['view'],
    leads: ['view', 'create', 'edit', 'delete'],
    contacts: ['view', 'create', 'edit', 'delete'],
    companies: ['view', 'create', 'edit'],
    pipeline: ['view', 'create', 'edit', 'delete'],
    payments: ['view'],
  }),

  'Sales Representative': buildPermissionSet({
    dashboard: ['view'],
    leads: ['view', 'create', 'edit'],
    contacts: ['view', 'create', 'edit'],
    companies: ['view', 'create'],
    pipeline: ['view', 'create', 'edit'],
    payments: [],
  }),

  Viewer: buildPermissionSet({
    dashboard: ['view'],
    leads: ['view'],
    contacts: ['view'],
    companies: ['view'],
    pipeline: ['view'],
    payments: ['view'],
  }),
};

/* =========================================================
   CREATE EMPTY PERMISSION SET
========================================================= */

export function createEmptyPermissionSet() {
  return buildPermissionSet({});
}

/* =========================================================
   BUILD PERMISSION SET
========================================================= */

export function buildPermissionSet(grants = {}) {
  return RBAC_MODULES.reduce((result, module) => {
    result[module.key] =
      module.actions.reduce((actions, action) => {
        actions[action] =
          (grants[module.key] || []).includes(action);

        return actions;
      }, {});

    return result;
  }, {});
}

/* =========================================================
   USERNAME NORMALIZER
========================================================= */

export function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/* =========================================================
   LOCAL STORAGE LOADER
========================================================= */

export function loadStoredValue(key, fallback) {
  try {
    const raw =
      window.localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const parsed =
      JSON.parse(raw);

    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}