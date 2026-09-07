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

import { authRequest, apiGet } from '../App';

const permissionActions = [
  { key: 'VIEW', label: 'View' },
  { key: 'CREATE', label: 'Create' },
  { key: 'EDIT', label: 'Edit' },
  { key: 'DELETE', label: 'Delete' },
  { key: 'EXPORT', label: 'Export' },
  { key: 'APPROVE', label: 'Approve' },
  { key: 'ASSIGN', label: 'Assign' },
];

export default function PermissionsPage({
  selectedRole,
  onBack,
  setMessage,
}) {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availableResources, setAvailableResources] = useState([]);
  const [internalSelectedRoleId, setInternalSelectedRoleId] = useState(
    selectedRole?.id || ''
  );
  
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({});
  const [savedPermissions, setSavedPermissions] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');

  // Find active role from list
  const activeRole = useMemo(() => {
    if (selectedRole?.id) {
      const latestRole = availableRoles.find(
        (role) => role.id === selectedRole.id
      );
      return latestRole || selectedRole;
    }

    return (
      availableRoles.find(
        (role) => role.id === Number(internalSelectedRoleId) || role.id === internalSelectedRoleId
      ) || null
    );
  }, [selectedRole, availableRoles, internalSelectedRoleId]);

  // Initial load: roles and resources
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        setLoading(true);
        const [rolesRes, resourcesRes] = await Promise.all([
          apiGet('/api/roles/'),
          apiGet('/api/roles/resources/'),
        ]);
        if (!isMounted) return;
        
        if (rolesRes.success && rolesRes.data) {
          setAvailableRoles(rolesRes.data);
        }
        if (resourcesRes.success && resourcesRes.data) {
          setAvailableResources(resourcesRes.data);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setMessage?.(err.message || 'Failed to load roles and resources.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadInitialData();
    return () => { isMounted = false; };
  }, [setMessage]);

  // Update internalSelectedRoleId from selectedRole prop
  useEffect(() => {
    if (selectedRole?.id) {
      setInternalSelectedRoleId(selectedRole.id);
    }
  }, [selectedRole]);

  // Load permission matrix for active role
  const fetchRolePermissions = async (roleId) => {
    try {
      setLoading(true);
      const res = await apiGet(`/api/roles/${roleId}/permissions/`);
      if (res.success && res.data) {
        // Construct standard mapping: resource_codename -> action -> scope
        const matrix = {};
        // Initialize all resources & actions to NONE
        availableResources.forEach(resObj => {
          matrix[resObj.codename] = {};
          permissionActions.forEach(act => {
            matrix[resObj.codename][act.key] = 'NONE';
          });
        });

        // Fill with backend values
        res.data.forEach(perm => {
          const codename = perm.resource_codename;
          if (matrix[codename]) {
            matrix[codename][perm.action] = perm.scope;
          }
        });

        setPermissions(matrix);
        setSavedPermissions(JSON.parse(JSON.stringify(matrix)));
      }
    } catch (err) {
      console.error('Failed to load role permissions:', err);
      setMessage?.(err.message || 'Failed to load permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRole?.id && availableResources.length > 0) {
      fetchRolePermissions(activeRole.id);
    } else {
      setPermissions({});
      setSavedPermissions({});
    }
  }, [activeRole?.id, availableResources]);

  // Check if permissions modified
  const hasChanges = useMemo(() => {
    return JSON.stringify(permissions) !== JSON.stringify(savedPermissions);
  }, [permissions, savedPermissions]);

  // Summary counts
  const summary = useMemo(() => {
    let enabledPermissions = 0;
    let viewPermissions = 0;
    let managementPermissions = 0;

    availableResources.forEach((module) => {
      permissionActions.forEach((action) => {
        const scope = permissions[module.codename]?.[action.key];
        if (scope && scope !== 'NONE') {
          enabledPermissions += 1;
          if (action.key === 'VIEW') {
            viewPermissions += 1;
          } else {
            managementPermissions += 1;
          }
        }
      });
    });

    return {
      modules: availableResources.length,
      enabledPermissions,
      viewPermissions,
      managementPermissions,
    };
  }, [permissions, availableResources]);

  // Toggle scope: NONE -> ALL, and ALL/OWN -> NONE
  const togglePermission = (moduleCodename, actionKey) => {
    setPermissions((current) => {
      const currentScope = current[moduleCodename]?.[actionKey] || 'NONE';
      const nextScope = currentScope === 'NONE' ? 'ALL' : 'NONE';
      return {
        ...current,
        [moduleCodename]: {
          ...current[moduleCodename],
          [actionKey]: nextScope,
        },
      };
    });
  };

  // Toggle specific permission scope
  const setPermissionScope = (moduleCodename, actionKey, scope) => {
    setPermissions((current) => ({
      ...current,
      [moduleCodename]: {
        ...current[moduleCodename],
        [actionKey]: scope,
      },
    }));
  };

  // Toggle all actions on a module
  const toggleModuleAll = (moduleCodename) => {
    const currentModule = permissions[moduleCodename] || {};
    const allEnabled = permissionActions.every(
      ({ key }) => currentModule[key] && currentModule[key] !== 'NONE'
    );

    setPermissions((current) => ({
      ...current,
      [moduleCodename]: permissionActions.reduce(
        (result, action) => ({
          ...result,
          [action.key]: allEnabled ? 'NONE' : 'ALL',
        }),
        {}
      ),
    }));
  };

  // Enable all permissions across all modules to ALL scope
  const enableAllPermissions = () => {
    const next = {};
    availableResources.forEach((res) => {
      next[res.codename] = {};
      permissionActions.forEach((action) => {
        next[res.codename][action.key] = 'ALL';
      });
    });
    setPermissions(next);
  };

  // Clear all permissions (NONE scope)
  const clearAllPermissions = () => {
    const next = {};
    availableResources.forEach((res) => {
      next[res.codename] = {};
      permissionActions.forEach((action) => {
        next[res.codename][action.key] = 'NONE';
      });
    });
    setPermissions(next);
  };

  // Reset to saved state
  const resetPermissions = () => {
    setPermissions(JSON.parse(JSON.stringify(savedPermissions)));
  };

  // Save permission matrix back to backend
  const savePermissions = async () => {
    if (!activeRole?.id) {
      setMessage?.('Select a role before saving permissions.');
      return;
    }

    try {
      // Put payload is a list of: { resource_codename, action, scope }
      const payload = [];
      Object.entries(permissions).forEach(([resCodename, actions]) => {
        Object.entries(actions).forEach(([actionKey, scope]) => {
          if (scope && scope !== 'NONE') {
            payload.push({
              resource_codename: resCodename,
              action: actionKey,
              scope: scope,
            });
          }
        });
      });

      const res = await authRequest(`/api/roles/${activeRole.id}/permissions/`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setMessage?.(`Permissions saved for ${activeRole.name}.`);
        await fetchRolePermissions(activeRole.id);
      }
    } catch (err) {
      setMessage?.(err.message || 'Failed to save permissions.');
    }
  };

  // Filter modules/resources in list
  const visibleModules = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return availableResources.filter((module) => {
      const modulePermissions = permissions[module.codename] || {};
      
      const hasAnyPermission = permissionActions.some(
        ({ key }) => {
          const scope = modulePermissions[key];
          return scope && scope !== 'NONE';
        }
      );

      const hasFullPermission = permissionActions.every(
        ({ key }) => {
          const scope = modulePermissions[key];
          return scope && scope !== 'NONE';
        }
      );

      if (filter === 'Enabled' && !hasAnyPermission) {
        return false;
      }
      if (filter === 'Full Access' && !hasFullPermission) {
        return false;
      }
      if (filter === 'No Access' && hasAnyPermission) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        module.name || '',
        module.codename || '',
      ].some((value) => value.toLowerCase().includes(search));
    });
  }, [searchTerm, filter, availableResources, permissions]);

  if (loading && availableResources.length === 0) {
    return <div className="text-slate-400 p-8 text-center font-semibold animate-pulse">Loading permissions system...</div>;
  }

  if (!activeRole) {
    return (
      <div className="lf-page leads-page permissions-page">
        <section className="lf-table-card sales-table-card">
          <section className="page-panel leads-page-panel permission-empty-panel">
            <div className="permission-empty-content">
              <span className="permission-empty-icon">
                <ShieldCheck size={30} />
              </span>
              <h2>Role Permissions</h2>
              <p>Select a role to manage its permissions.</p>

              {availableRoles.length > 0 && (
                <label className="lf-field permission-role-select-field">
                  <span>Select Role</span>
                  <select
                    value={internalSelectedRoleId}
                    onChange={(event) => setInternalSelectedRoleId(event.target.value)}
                  >
                    <option value="">Choose a role</option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {onBack && (
                <button type="button" className="lf-btn lf-btn-primary" onClick={onBack}>
                  <ArrowLeft size={16} /> Back to Roles
                </button>
              )}
            </div>
          </section>
        </section>
      </div>
    );
  }

  return (
    <div className="lf-page leads-page permissions-page">
      <section className="lf-table-card sales-table-card">
        <section className="page-panel-banner permission-role-banner">
          <div className="permission-role-banner-left">
            {onBack && (
              <button type="button" className="permission-back-btn" onClick={onBack} aria-label="Back">
                <ArrowLeft size={20} />
              </button>
            )}
            <span className="permission-role-icon">
              <ShieldCheck size={20} />
            </span>
            <div>
              <span className="permission-role-label">MANAGING PERMISSIONS</span>
              <h2>{activeRole.name}</h2>
              <p>{activeRole.description || 'System role access matrix.'}</p>
            </div>
          </div>

          <div className="permission-role-banner-right">
            <label className="permission-role-switcher">
              <span>Role</span>
              <select
                value={activeRole.id}
                onChange={(event) => setInternalSelectedRoleId(event.target.value)}
              >
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            {hasChanges && <span className="permission-unsaved-badge">Unsaved changes</span>}
          </div>
        </section>

        <section className="page-panel-filters lf-filter-bar">
          <label className="permission-search-field">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <PermissionFilterDropdown
            label="Access"
            value={filter}
            options={['All', 'Enabled', 'Full Access', 'No Access']}
            onChange={setFilter}
          />

          {(searchTerm || filter !== 'All') && (
            <button
              type="button"
              className="lf-clear-filters lf-clear-filters--icon"
              onClick={() => {
                setSearchTerm('');
                setFilter('All');
              }}
            >
              <X size={16} />
            </button>
          )}
        </section>

        <header className="page-panel-header sales-page-header permission-page-actions">
          <button type="button" className="lf-btn" onClick={clearAllPermissions}>
            Clear All
          </button>
          <button type="button" className="lf-btn" onClick={enableAllPermissions}>
            <Check size={16} /> Enable All
          </button>
        </header>
      </section>

      <div className="lf-table-scroll">
        {loading && <div className="text-center py-2 text-teal-400 text-xs">Updating matrix...</div>}
        <table className="lf-leads-table permission-table">
          <thead>
            <tr>
              <th className="lf-sr-col">#</th>
              <th>Module</th>
              <th>Description</th>
              {permissionActions.map((action) => (
                <th key={action.key} className="permission-action-column">
                  {action.label}
                </th>
              ))}
              <th className="permission-action-column">All</th>
            </tr>
          </thead>
          <tbody>
            {visibleModules.length > 0 ? (
              visibleModules.map((module, index) => {
                const modulePermissions = permissions[module.codename] || {};
                const allEnabled = permissionActions.every(
                  ({ key }) => modulePermissions[key] && modulePermissions[key] !== 'NONE'
                );

                return (
                  <tr key={module.codename}>
                    <td className="lf-sr-col">{index + 1}</td>
                    <td>
                      <div className="permission-module-name">
                        <span className="permission-module-icon">
                          <ShieldCheck size={15} />
                        </span>
                        <strong>{module.name}</strong>
                      </div>
                    </td>
                    <td className="permission-description">
                      Dynamic CRM resource codename: <code>{module.codename}</code>
                    </td>
                    {permissionActions.map((action) => {
                      const scope = modulePermissions[action.key] || 'NONE';
                      const checked = scope !== 'NONE';

                      return (
                        <td key={action.key} className="permission-checkbox-cell">
                          <div className="flex flex-col items-center justify-center gap-1.5 p-1">
                            <PermissionCheckbox
                              checked={checked}
                              label={`${module.name} ${action.label}`}
                              onChange={() => togglePermission(module.codename, action.key)}
                            />
                            {checked && (
                              <select
                                value={scope}
                                onChange={(e) => setPermissionScope(module.codename, action.key, e.target.value)}
                                className="rounded border border-slate-700 bg-slate-950 text-[10px] px-1 py-0.5 text-teal-300 font-semibold cursor-pointer outline-none focus:border-teal-500"
                              >
                                <option value="ALL">ALL</option>
                                <option value="OWN">OWN</option>
                              </select>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="permission-checkbox-cell">
                      <PermissionCheckbox
                        checked={allEnabled}
                        label={`All ${module.name} permissions`}
                        onChange={() => toggleModuleAll(module.codename)}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4 + permissionActions.length} className="permission-empty-table">
                  No permission modules match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="permission-footer-actions">
        <div>
          {hasChanges ? (
            <span className="permission-change-message">You have unsaved permission changes.</span>
          ) : (
            <span className="permission-saved-message">Permission settings are up to date.</span>
          )}
        </div>
        <div className="permission-footer-buttons">
          <button type="button" className="lf-btn" disabled={!hasChanges} onClick={resetPermissions}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="button" className="lf-btn lf-btn-primary" disabled={!hasChanges} onClick={savePermissions}>
            <Save size={16} /> Save Permissions
          </button>
        </div>
      </footer>
    </div>
  );
}

function PermissionCheckbox({ checked, onChange, label }) {
  return (
    <label className={`permission-checkbox ${checked ? 'permission-checkbox--checked' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} />
      <span aria-hidden="true">{checked && <Check size={14} />}</span>
    </label>
  );
}

function PermissionFilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="lf-select-field searchable"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
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
        onClick={() => setOpen((current) => !current)}
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
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div role="listbox">
            {filteredOptions.map((option) => (
              <button
                type="button"
                key={option}
                role="option"
                aria-selected={value === option}
                className={value === option ? 'selected' : ''}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                  setSearch('');
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}