import React, {
    useEffect,
    useMemo,
    useState,
  } from 'react';
  
  import {
    ArrowLeft,
    Check,
    ChevronDown,
    RotateCcw,
    Save,
    Search,
    ShieldCheck,
    X,
  } from 'lucide-react';
  
  /* =========================================================
     FRONTEND STORAGE
  
     Later replace with backend:
  
     GET /api/roles/:id/permissions/
     PUT /api/roles/:id/permissions/
  ========================================================= */
  
  const PERMISSIONS_STORAGE_KEY =
    'leadflow_role_permissions';
  
  const ROLES_STORAGE_KEY =
    'leadflow_roles';
  
  /* =========================================================
     MODULES
  ========================================================= */
  
  const permissionModules = [
    {
      key: 'leads',
      label: 'Leads',
      description:
        'Manage lead records and lead activity.',
    },
    {
      key: 'contacts',
      label: 'Contacts',
      description:
        'Manage CRM contacts and customer information.',
    },
    {
      key: 'companies',
      label: 'Companies',
      description:
        'Manage companies and business accounts.',
    },
    {
      key: 'pipeline',
      label: 'Pipeline',
      description:
        'Manage opportunities and pipeline stages.',
    },
    {
      key: 'payments',
      label: 'Payments',
      description:
        'View and manage payment records.',
    },
  ];
  
  const permissionActions = [
    {
      key: 'view',
      label: 'View',
    },
    {
      key: 'create',
      label: 'Create',
    },
    {
      key: 'edit',
      label: 'Edit',
    },
    {
      key: 'delete',
      label: 'Delete',
    },
  ];
  
  /* =========================================================
     EMPTY PERMISSIONS
  ========================================================= */
  
  const defaultPermissions = {
    leads: {
      view: false,
      create: false,
      edit: false,
      delete: false,
    },
  
    contacts: {
      view: false,
      create: false,
      edit: false,
      delete: false,
    },
  
    companies: {
      view: false,
      create: false,
      edit: false,
      delete: false,
    },
  
    pipeline: {
      view: false,
      create: false,
      edit: false,
      delete: false,
    },
  
    payments: {
      view: false,
      create: false,
      edit: false,
      delete: false,
    },
  };
  
  /* =========================================================
     DEFAULT FRONTEND PERMISSIONS
  ========================================================= */
  
  const defaultRolePermissionMap = {
    'RL-0001': makeAllPermissions(true),
  
    'RL-0002': {
      leads: {
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
  
      contacts: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
  
      companies: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
  
      pipeline: {
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
  
      payments: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
    },
  
    'RL-0003': {
      leads: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
  
      contacts: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
  
      companies: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
  
      pipeline: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
  
      payments: {
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
  
    'RL-0004': {
      leads: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
  
      contacts: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
  
      companies: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
  
      pipeline: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
  
      payments: {
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
  };
  
  /* =========================================================
     MAIN COMPONENT
  ========================================================= */
  
  export default function PermissionsPage({
    selectedRole,
    onBack,
    setMessage,
  }) {
    /*
      Role chosen from RolesPage.
  
      If user opens Permissions directly from sidebar,
      they can also select a role here.
    */
  
    const [availableRoles, setAvailableRoles] =
      useState(() => loadRoles());
  
    const [
      internalSelectedRoleId,
      setInternalSelectedRoleId,
    ] = useState(
      selectedRole?.id || ''
    );
  
    const activeRole = useMemo(() => {
      if (selectedRole?.id) {
        const latestRole =
          availableRoles.find(
            (role) =>
              role.id === selectedRole.id
          );
  
        return latestRole || selectedRole;
      }
  
      return (
        availableRoles.find(
          (role) =>
            role.id ===
            internalSelectedRoleId
        ) || null
      );
    }, [
      selectedRole,
      availableRoles,
      internalSelectedRoleId,
    ]);
  
    const [permissions, setPermissions] =
      useState(
        clonePermissions(
          defaultPermissions
        )
      );
  
    const [
      savedPermissions,
      setSavedPermissions,
    ] = useState(
      clonePermissions(
        defaultPermissions
      )
    );
  
    const [searchTerm, setSearchTerm] =
      useState('');
  
    const [filter, setFilter] =
      useState('All');
  
    /* =======================================================
       REFRESH AVAILABLE ROLES
    ======================================================= */
  
    useEffect(() => {
      setAvailableRoles(loadRoles());
    }, [selectedRole]);
  
    /* =======================================================
       UPDATE ROLE FROM PROP
    ======================================================= */
  
    useEffect(() => {
      if (selectedRole?.id) {
        setInternalSelectedRoleId(
          selectedRole.id
        );
      }
    }, [selectedRole]);
  
    /* =======================================================
       LOAD PERMISSIONS FOR ACTIVE ROLE
    ======================================================= */
  
    useEffect(() => {
      if (!activeRole?.id) {
        setPermissions(
          clonePermissions(
            defaultPermissions
          )
        );
  
        setSavedPermissions(
          clonePermissions(
            defaultPermissions
          )
        );
  
        return;
      }
  
      const allStoredPermissions =
        loadPermissionMap();
  
      const rolePermissions =
        allStoredPermissions[
          activeRole.id
        ] ||
        defaultRolePermissionMap[
          activeRole.id
        ] ||
        defaultPermissions;
  
      const cloned =
        clonePermissions(
          rolePermissions
        );
  
      setPermissions(cloned);
  
      setSavedPermissions(
        clonePermissions(
          rolePermissions
        )
      );
  
      setSearchTerm('');
  
      setFilter('All');
    }, [activeRole?.id]);
  
    /* =======================================================
       SUMMARY
    ======================================================= */
  
    const summary =
      useMemo(() => {
        let enabledPermissions = 0;
        let viewPermissions = 0;
        let managementPermissions = 0;
  
        permissionModules.forEach(
          (module) => {
            permissionActions.forEach(
              (action) => {
                const enabled =
                  permissions[
                    module.key
                  ]?.[
                    action.key
                  ];
  
                if (!enabled) {
                  return;
                }
  
                enabledPermissions += 1;
  
                if (
                  action.key === 'view'
                ) {
                  viewPermissions += 1;
                } else {
                  managementPermissions += 1;
                }
              }
            );
          }
        );
  
        return {
          modules:
            permissionModules.length,
  
          enabledPermissions,
  
          viewPermissions,
  
          managementPermissions,
        };
      }, [permissions]);
  
    /* =======================================================
       FILTER MODULES
    ======================================================= */
  
    const visibleModules =
      useMemo(() => {
        const search =
          searchTerm
            .trim()
            .toLowerCase();
  
        return permissionModules.filter(
          (module) => {
            const modulePermissions =
              permissions[
                module.key
              ];
  
            const hasAnyPermission =
              permissionActions.some(
                ({ key }) =>
                  Boolean(
                    modulePermissions?.[
                      key
                    ]
                  )
              );
  
            const hasFullPermission =
              permissionActions.every(
                ({ key }) =>
                  Boolean(
                    modulePermissions?.[
                      key
                    ]
                  )
              );
  
            if (
              filter === 'Enabled' &&
              !hasAnyPermission
            ) {
              return false;
            }
  
            if (
              filter === 'Full Access' &&
              !hasFullPermission
            ) {
              return false;
            }
  
            if (
              filter === 'No Access' &&
              hasAnyPermission
            ) {
              return false;
            }
  
            if (!search) {
              return true;
            }
  
            return [
              module.label,
              module.description,
            ].some((value) =>
              value
                .toLowerCase()
                .includes(search)
            );
          }
        );
      }, [
        searchTerm,
        filter,
        permissions,
      ]);
  
    /* =======================================================
       HAS CHANGES
    ======================================================= */
  
    const hasChanges =
      JSON.stringify(permissions) !==
      JSON.stringify(savedPermissions);
  
    /* =======================================================
       SINGLE PERMISSION
    ======================================================= */
  
    const togglePermission = (
      moduleKey,
      actionKey
    ) => {
      setPermissions(
        (current) => ({
          ...current,
  
          [moduleKey]: {
            ...current[
              moduleKey
            ],
  
            [actionKey]:
              !current[
                moduleKey
              ][actionKey],
          },
        })
      );
    };
  
    /* =======================================================
       MODULE ALL
    ======================================================= */
  
    const toggleModuleAll = (
      moduleKey
    ) => {
      const currentModule =
        permissions[moduleKey];
  
      const allEnabled =
        permissionActions.every(
          ({ key }) =>
            currentModule[key]
        );
  
      setPermissions(
        (current) => ({
          ...current,
  
          [moduleKey]:
            permissionActions.reduce(
              (
                result,
                action
              ) => ({
                ...result,
  
                [action.key]:
                  !allEnabled,
              }),
              {}
            ),
        })
      );
    };
  
    /* =======================================================
       ENABLE ALL
    ======================================================= */
  
    const enableAllPermissions =
      () => {
        setPermissions(
          makeAllPermissions(true)
        );
      };
  
    /* =======================================================
       CLEAR ALL
    ======================================================= */
  
    const clearAllPermissions =
      () => {
        setPermissions(
          clonePermissions(
            defaultPermissions
          )
        );
      };
  
    /* =======================================================
       RESET
    ======================================================= */
  
    const resetPermissions =
      () => {
        setPermissions(
          clonePermissions(
            savedPermissions
          )
        );
      };
  
    /* =======================================================
       SAVE
    ======================================================= */
  
    const savePermissions =
      () => {
        if (!activeRole?.id) {
          setMessage?.(
            'Select a role before saving permissions.'
          );
  
          return;
        }
  
        const permissionMap =
          loadPermissionMap();
  
        permissionMap[
          activeRole.id
        ] =
          clonePermissions(
            permissions
          );
  
        savePermissionMap(
          permissionMap
        );
  
        setSavedPermissions(
          clonePermissions(
            permissions
          )
        );
  
        setMessage?.(
          `Permissions saved for ${activeRole.name}.`
        );
  
        /*
          BACKEND LATER:
  
          await fetch(
            `/api/roles/${activeRole.id}/permissions/`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                permissions,
              }),
            }
          );
        */
      };
  
    /* =======================================================
       NO ROLE SELECTED
    ======================================================= */
  
    if (!activeRole) {
      return (
        <div className="lf-page leads-page permissions-page">
  
          <section className="lf-table-card sales-table-card">
  
            <section className="page-panel leads-page-panel permission-empty-panel">
  
              <div className="permission-empty-content">
  
                <span className="permission-empty-icon">
                  <ShieldCheck size={30} />
                </span>
  
                <h2>
                  Role Permissions
                </h2>
  
                <p>
                  Select a role to manage its permissions.
                </p>
  
                {/* DIRECT ROLE SELECT */}
  
                {availableRoles.length > 0 && (
                  <label className="lf-field permission-role-select-field">
  
                    <span>
                      Select Role
                    </span>
  
                    <select
                      value={
                        internalSelectedRoleId
                      }
                      onChange={(event) =>
                        setInternalSelectedRoleId(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Choose a role
                      </option>
  
                      {availableRoles.map(
                        (role) => (
                          <option
                            key={role.id}
                            value={role.id}
                          >
                            {role.name} ({role.id})
                          </option>
                        )
                      )}
                    </select>
                  </label>
                )}
  
                {onBack && (
                  <button
                    type="button"
                    className="lf-btn"
                    onClick={onBack}
                  >
                    <ArrowLeft size={16} />
  
                    Back to Roles
                  </button>
                )}
              </div>
            </section>
          </section>
        </div>
      );
    }
  
    /* =======================================================
       MAIN PERMISSION PAGE
    ======================================================= */
  
    return (
      <div className="lf-page leads-page permissions-page">
  
        <section className="lf-table-card sales-table-card">
  
          {/* TOP PANEL */}
  
          <section className="page-panel leads-page-panel permission-page-panel">
  
            {/* SUMMARY */}
  
            <section
              className="crm-summary-strip contact-summary-strip permission-summary-strip"
              aria-label="Permission summary"
            >
              <article>
                <span>
                  Modules
                </span>
  
                <strong>
                  {summary.modules}
                </strong>
              </article>
  
              <article>
                <span>
                  Enabled Permissions
                </span>
  
                <strong className="contact-summary-blue">
                  {
                    summary.enabledPermissions
                  }
                </strong>
              </article>
  
              <article>
                <span>
                  View Access
                </span>
  
                <strong className="contact-summary-green">
                  {
                    summary.viewPermissions
                  }
                </strong>
              </article>
  
              <article>
                <span>
                  Management Access
                </span>
  
                <strong>
                  {
                    summary.managementPermissions
                  }
                </strong>
              </article>
            </section>
  
            {/* ROLE BANNER */}
  
            <section className="permission-role-banner">
  
              <div className="permission-role-banner-left">
  
                {onBack && (
                  <button
                    type="button"
                    className="lead-form-back"
                    onClick={onBack}
                    aria-label="Back to roles"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
  
                <span className="permission-role-icon">
                  <ShieldCheck size={20} />
                </span>
  
                <div>
                  <span className="permission-role-label">
                    MANAGING PERMISSIONS
                  </span>
  
                  <h2>
                    {activeRole.name}
                  </h2>
  
                  <p>
                    {activeRole.id}
  
                    {activeRole.status && (
                      <>
                        {' · '}
                        {activeRole.status}
                      </>
                    )}
                  </p>
                </div>
              </div>
  
              <div className="permission-role-banner-right">
  
                {/* CHANGE ROLE */}
  
                <label className="permission-role-switcher">
  
                  <span>
                    Role
                  </span>
  
                  <select
                    value={activeRole.id}
                    onChange={(event) =>
                      setInternalSelectedRoleId(
                        event.target.value
                      )
                    }
                  >
                    {availableRoles.map(
                      (role) => (
                        <option
                          key={role.id}
                          value={role.id}
                        >
                          {role.name}
                        </option>
                      )
                    )}
                  </select>
                </label>
  
                {hasChanges && (
                  <span className="permission-unsaved-badge">
                    Unsaved changes
                  </span>
                )}
              </div>
            </section>
  
            {/* FILTERS */}
  
            <section className="page-panel-filters lf-filter-bar">
  
              <label className="permission-search-field">
                <Search size={15} />
  
                <input
                  type="search"
                  placeholder="Search modules..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                />
              </label>
  
              <PermissionFilterDropdown
                label="Access"
                value={filter}
                options={[
                  'All',
                  'Enabled',
                  'Full Access',
                  'No Access',
                ]}
                onChange={setFilter}
              />
  
              {(searchTerm ||
                filter !== 'All') && (
                <button
                  type="button"
                  className="lf-clear-filters lf-clear-filters--icon"
                  aria-label="Clear filters"
                  title="Clear filters"
                  onClick={() => {
                    setSearchTerm('');
  
                    setFilter('All');
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </section>
  
            {/* BULK ACTIONS */}
  
            <header className="page-panel-header sales-page-header permission-page-actions">
  
              <button
                type="button"
                className="lf-btn"
                onClick={
                  clearAllPermissions
                }
              >
                Clear All
              </button>
  
              <button
                type="button"
                className="lf-btn"
                onClick={
                  enableAllPermissions
                }
              >
                <Check size={16} />
  
                Enable All
              </button>
            </header>
          </section>
  
          {/* PERMISSIONS TABLE */}
  
          <div className="lf-table-scroll">
  
            <table className="lf-leads-table permission-table">
  
              <thead>
                <tr>
                  <th className="lf-sr-col">
                    #
                  </th>
  
                  <th>
                    Module
                  </th>
  
                  <th>
                    Description
                  </th>
  
                  {permissionActions.map(
                    (action) => (
                      <th
                        key={action.key}
                        className="permission-action-column"
                      >
                        {action.label}
                      </th>
                    )
                  )}
  
                  <th className="permission-action-column">
                    All
                  </th>
                </tr>
              </thead>
  
              <tbody>
                {visibleModules.length > 0 ? (
                  visibleModules.map(
                    (
                      module,
                      index
                    ) => {
                      const modulePermissions =
                        permissions[
                          module.key
                        ];
  
                      const allEnabled =
                        permissionActions.every(
                          ({ key }) =>
                            modulePermissions[
                              key
                            ]
                        );
  
                      return (
                        <tr
                          key={
                            module.key
                          }
                        >
                          <td className="lf-sr-col">
                            {index + 1}
                          </td>
  
                          <td>
                            <div className="permission-module-name">
  
                              <span className="permission-module-icon">
                                <ShieldCheck size={15} />
                              </span>
  
                              <strong>
                                {module.label}
                              </strong>
                            </div>
                          </td>
  
                          <td className="permission-description">
                            {module.description}
                          </td>
  
                          {permissionActions.map(
                            (action) => (
                              <td
                                key={
                                  action.key
                                }
                                className="permission-checkbox-cell"
                              >
                                <PermissionCheckbox
                                  checked={
                                    modulePermissions[
                                      action.key
                                    ]
                                  }
                                  label={`${module.label} ${action.label}`}
                                  onChange={() =>
                                    togglePermission(
                                      module.key,
                                      action.key
                                    )
                                  }
                                />
                              </td>
                            )
                          )}
  
                          <td className="permission-checkbox-cell">
                            <PermissionCheckbox
                              checked={
                                allEnabled
                              }
                              label={`All ${module.label} permissions`}
                              onChange={() =>
                                toggleModuleAll(
                                  module.key
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    }
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={
                        4 +
                        permissionActions.length
                      }
                      className="permission-empty-table"
                    >
                      No permission modules match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
  
          {/* FOOTER */}
  
          <footer className="permission-footer-actions">
  
            <div>
              {hasChanges ? (
                <span className="permission-change-message">
                  You have unsaved permission changes.
                </span>
              ) : (
                <span className="permission-saved-message">
                  Permission settings are up to date.
                </span>
              )}
            </div>
  
            <div className="permission-footer-buttons">
  
              <button
                type="button"
                className="lf-btn"
                disabled={!hasChanges}
                onClick={
                  resetPermissions
                }
              >
                <RotateCcw size={15} />
  
                Reset
              </button>
  
              <button
                type="button"
                className="lf-btn lf-btn-primary"
                disabled={!hasChanges}
                onClick={
                  savePermissions
                }
              >
                <Save size={16} />
  
                Save Permissions
              </button>
            </div>
          </footer>
        </section>
      </div>
    );
  }
  
  /* =========================================================
     PERMISSION CHECKBOX
  ========================================================= */
  
  function PermissionCheckbox({
    checked,
    onChange,
    label,
  }) {
    return (
      <label
        className={`permission-checkbox ${
          checked
            ? 'permission-checkbox--checked'
            : ''
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          aria-label={label}
        />
  
        <span aria-hidden="true">
          {checked && (
            <Check size={14} />
          )}
        </span>
      </label>
    );
  }
  
  /* =========================================================
     FILTER DROPDOWN
  ========================================================= */
  
  function PermissionFilterDropdown({
    label,
    value,
    options,
    onChange,
  }) {
    const [open, setOpen] =
      useState(false);
  
    const [search, setSearch] =
      useState('');
  
    const filteredOptions =
      options.filter((option) =>
        option
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
      );
  
    return (
      <div
        className="lf-select-field searchable"
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(
              event.relatedTarget
            )
          ) {
            setOpen(false);
  
            setSearch('');
          }
        }}
      >
        <button
          type="button"
          className="lf-combo-button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() =>
            setOpen(
              (current) => !current
            )
          }
        >
          <span>
            {label}: {value}
          </span>
  
          <ChevronDown size={15} />
        </button>
  
        {open && (
          <div className="lf-combo-menu">
  
            <label className="lf-combo-search">
              <Search size={14} />
  
              <input
                autoFocus
                value={search}
                placeholder="Search access..."
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </label>
  
            <div role="listbox">
              {filteredOptions.map(
                (option) => (
                  <button
                    type="button"
                    key={option}
                    role="option"
                    aria-selected={
                      value === option
                    }
                    className={
                      value === option
                        ? 'selected'
                        : ''
                    }
                    onClick={() => {
                      onChange(option);
  
                      setOpen(false);
  
                      setSearch('');
                    }}
                  >
                    {option}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  /* =========================================================
     HELPERS
  ========================================================= */
  
  function makeAllPermissions(
    value
  ) {
    return permissionModules.reduce(
      (result, module) => {
        result[module.key] =
          permissionActions.reduce(
            (
              actions,
              action
            ) => {
              actions[
                action.key
              ] = value;
  
              return actions;
            },
            {}
          );
  
        return result;
      },
      {}
    );
  }
  
  function clonePermissions(
    permissions
  ) {
    return Object.fromEntries(
      Object.entries(
        permissions
      ).map(
        ([
          moduleKey,
          actions,
        ]) => [
          moduleKey,
          { ...actions },
        ]
      )
    );
  }
  
  /* =========================================================
     PERMISSION STORAGE
  ========================================================= */
  
  function loadPermissionMap() {
    try {
      const stored =
        window.localStorage.getItem(
          PERMISSIONS_STORAGE_KEY
        );
  
      if (!stored) {
        return {
          ...defaultRolePermissionMap,
        };
      }
  
      const parsed =
        JSON.parse(stored);
  
      return parsed &&
        typeof parsed === 'object'
        ? parsed
        : {
            ...defaultRolePermissionMap,
          };
    } catch {
      return {
        ...defaultRolePermissionMap,
      };
    }
  }
  
  function savePermissionMap(
    permissionMap
  ) {
    try {
      window.localStorage.setItem(
        PERMISSIONS_STORAGE_KEY,
        JSON.stringify(
          permissionMap
        )
      );
    } catch {
      // Ignore localStorage errors during frontend development.
    }
  }
  
  /* =========================================================
     ROLE STORAGE
  
     Same key used by RolesPage.jsx
  ========================================================= */
  
  function loadRoles() {
    try {
      const stored =
        window.localStorage.getItem(
          ROLES_STORAGE_KEY
        );
  
      if (!stored) {
        return [];
      }
  
      const parsed =
        JSON.parse(stored);
  
      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }