import React, { useMemo, useState, useEffect } from 'react';

import {
  ArrowLeft,
  ChevronDown,
  Edit3,
  KeyRound,
  PlusCircle,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import { authRequest, apiGet } from '../App';

const blankRoleForm = {
  name: '',
  description: '',
  status: 'Active',
};

export default function RolesPage({
  setMessage,
  onManagePermissions,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const [localRoles, setLocalRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const roles = localRoles;

  const [filters, setFilters] = useState({
    status: 'All',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);

  const [form, setForm] = useState({
    ...blankRoleForm,
  });

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/api/roles/');
      if (res.success && res.data) {
        const mapped = res.data.map(role => ({
          ...role,
          createdDate: role.created_at ? role.created_at.slice(0, 10) : '',
          status: 'Active',
          assignedUsers: role.assigned_users || 0
        }));
        setLocalRoles(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setMessage?.(err.message || 'Failed to fetch roles from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    return {
      total: roles.length,

      active: roles.filter(
        (role) => role.status === 'Active'
      ).length,

      inactive: roles.filter(
        (role) => role.status === 'Inactive'
      ).length,

      assignedUsers: roles.reduce(
        (total, role) =>
          total + Number(role.assignedUsers || 0),
        0
      ),
    };
  }, [roles]);

  /* =======================================================
     FILTER ROLES
  ======================================================= */

  const filteredRoles = useMemo(() => {
    const search =
      searchTerm.trim().toLowerCase();

    return roles.filter((role) => {
      const statusMatches =
        filters.status === 'All' ||
        role.status === filters.status;

      if (!statusMatches) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        role.id,
        role.name,
        role.description,
        role.status,
        role.createdDate,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(search)
      );
    });
  }, [roles, filters, searchTerm]);

  const filtersActive =
    filters.status !== 'All' ||
    searchTerm.trim() !== '';

  /* =======================================================
     ADD ROLE
  ======================================================= */

  const openAddRole = () => {
    setSelectedRole(null);

    setEditingRole(null);

    setForm({
      ...blankRoleForm,
    });

    setAddOpen(true);
  };

  /* =======================================================
     EDIT ROLE
  ======================================================= */

  const openEditRole = (role) => {
    setSelectedRole(null);

    setAddOpen(false);

    setEditingRole(role);

    setForm({
      name: role.name || '',
      description: role.description || '',
      status: role.status || 'Active',
    });
  };

  /* =======================================================
     CLOSE FORM
  ======================================================= */

  const closeRoleForm = () => {
    setAddOpen(false);

    setEditingRole(null);

    setForm({
      ...blankRoleForm,
    });
  };

  /* =======================================================
     SAVE ROLE
  ======================================================= */

  const saveRole = async (event) => {
    event.preventDefault();

    const trimmedName = form.name.trim();

    if (!trimmedName) {
      setMessage?.('Role name is required.');
      return;
    }

    const duplicate = roles.some(
      (role) =>
        role.name
          ?.trim()
          .toLowerCase() ===
          trimmedName.toLowerCase() &&
        role.id !== editingRole?.id
    );

    if (duplicate) {
      setMessage?.('A role with this name already exists.');
      return;
    }

    try {
      const payload = {
        name: trimmedName,
        description: form.description.trim()
      };

      if (editingRole) {
        const res = await authRequest(`/api/roles/${editingRole.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res.success) {
          setMessage?.('Role updated successfully.');
          setEditingRole(null);
          fetchRoles();
        }
      } else {
        const res = await authRequest('/api/roles/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.success) {
          setMessage?.('Role created successfully.');
          setAddOpen(false);
          fetchRoles();
        }
      }
    } catch (err) {
      setMessage?.(err.message || 'Failed to save role.');
    }
  };

  /* =======================================================
     DELETE ROLE
  ======================================================= */

  const confirmDeleteRole = async () => {
    if (!deletingRole) {
      return;
    }

    try {
      await authRequest(`/api/roles/${deletingRole.id}/`, {
        method: 'DELETE'
      });
      setMessage?.('Role deleted successfully.');
      if (selectedRole?.id === deletingRole.id) {
        setSelectedRole(null);
      }
      setDeletingRole(null);
      fetchRoles();
    } catch (err) {
      setMessage?.(err.message || 'Failed to delete role.');
      setDeletingRole(null);
    }
  };

  /* =======================================================
     PERMISSIONS NAVIGATION
  ======================================================= */

  const managePermissions = (role) => {
    if (typeof onManagePermissions === 'function') {
      onManagePermissions(role);
      return;
    }

    setMessage?.('Permission navigation is not configured.');
  };

  if (loading && roles.length === 0) {
    return <div className="text-slate-400 p-8 text-center font-semibold animate-pulse">Loading roles...</div>;
  }

  if (addOpen) {
    return (
      <RoleFormPage
        mode="add"
        form={form}
        setForm={setForm}
        onBack={closeRoleForm}
        onSubmit={saveRole}
      />
    );
  }

  if (editingRole) {
    return (
      <RoleFormPage
        mode="edit"
        form={form}
        setForm={setForm}
        onBack={closeRoleForm}
        onSubmit={saveRole}
      />
    );
  }

  if (selectedRole) {
    const latestSelectedRole =
      roles.find(
        (role) =>
          role.id === selectedRole.id
      ) || selectedRole;

    return (
      <RoleDetailPage
        role={latestSelectedRole}
        onBack={() => setSelectedRole(null)}
        onEdit={() => openEditRole(latestSelectedRole)}
        onManagePermissions={() => managePermissions(latestSelectedRole)}
        onDelete={() => setDeletingRole(latestSelectedRole)}
        deletingRole={deletingRole}
        onCancelDelete={() => setDeletingRole(null)}
        onConfirmDelete={confirmDeleteRole}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    );
  }

  /* =======================================================
     ROLE LIST
  ======================================================= */

  return (
    <div className="lf-page leads-page roles-page">

      <section className="lf-table-card sales-table-card">

        {/* =========================================
            TOP PANEL
        ========================================= */}

        <section className="page-panel leads-page-panel">

          {/* SUMMARY */}

          <section
            className="crm-summary-strip contact-summary-strip role-summary-strip"
            aria-label="Role summary"
          >
            <article>
              <span>
                Total Roles
              </span>

              <strong>
                {summary.total}
              </strong>
            </article>

            <article>
              <span>
                Active Roles
              </span>

              <strong className="contact-summary-blue">
                {summary.active}
              </strong>
            </article>

            <article>
              <span>
                Inactive Roles
              </span>

              <strong className="contact-summary-red">
                {summary.inactive}
              </strong>
            </article>

            <article>
              <span>
                Assigned Users
              </span>

              <strong className="contact-summary-green">
                {summary.assignedUsers}
              </strong>
            </article>
          </section>

          {/* =========================================
              FILTERS
          ========================================= */}

          <section
            className="page-panel-filters lf-filter-bar"
            aria-label="Role filters"
          >

            {/* SEARCH */}

            <label className="role-search-field">

              <Search size={15} />

              <input
                type="search"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />

            </label>

            {/* STATUS */}

            <RoleFilterDropdown
              label="Status"
              value={filters.status}
              options={[
                'All',
                'Active',
                'Inactive',
              ]}
              onChange={(value) =>
                setFilters(
                  (current) => ({
                    ...current,
                    status: value,
                  })
                )
              }
            />

            {/* CLEAR */}

            {filtersActive && (
              <button
                type="button"
                className="lf-clear-filters lf-clear-filters--icon"
                aria-label="Clear filters"
                title="Clear filters"
                onClick={() => {
                  setSearchTerm('');

                  setFilters({
                    status: 'All',
                  });
                }}
              >
                <X size={16} />
              </button>
            )}

          </section>

          {/* =========================================
              NEW ROLE BUTTON
          ========================================= */}

          <header
            className="page-panel-header sales-page-header"
            aria-label="Role actions"
          >
            {canCreate && (
              <button
                type="button"
                className="lf-btn lf-btn-primary"
                onClick={openAddRole}
              >
                <PlusCircle size={17} />

                New Role
              </button>
            )}
          </header>

        </section>

        {/* =========================================
            ROLE TABLE
        ========================================= */}

        <div className="lf-table-scroll">

          <table className="lf-leads-table">

            <thead>
              <tr>
                <th className="lf-sr-col">
                  #
                </th>

                <th>
                  Role ID
                </th>

                <th>
                  Role Name
                </th>

                <th>
                  Description
                </th>

                <th>
                  Assigned Users
                </th>

                <th>
                  Status
                </th>

                <th>
                  Created Date
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRoles.length > 0 ? (
                filteredRoles.map(
                  (role, index) => (
                    <tr
                      key={role.id}
                      className="clickable-row"
                      onClick={() => setSelectedRole(role)}
                    >

                      {/* SERIAL */}

                      <td className="lf-sr-col">
                        {index + 1}
                      </td>

                      {/* ROLE ID */}

                      <td>
                        <button
                          type="button"
                          className="link-cell"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedRole(role);
                          }}
                        >
                          {role.id}
                        </button>
                      </td>

                      {/* NAME */}

                      <td>
                        <strong>
                          {role.name}
                        </strong>
                      </td>

                      {/* DESCRIPTION */}

                      <td>
                        <span title={role.description || ''}>
                          {truncateText(role.description, 52)}
                        </span>
                      </td>

                      {/* USERS */}

                      <td>
                        <span className="role-user-count">

                          <Users size={14} />

                          {role.assignedUsers ?? 0}

                        </span>
                      </td>

                      {/* STATUS */}

                      <td>
                        <RoleStatusBadge status={role.status} />
                      </td>

                      {/* DATE */}

                      <td>
                        {formatDate(role.createdDate)}
                      </td>

                      {/* ACTIONS */}

                      <td>
                        <div className="inline-row-actions">

                          {/* PERMISSIONS */}

                          <button
                            type="button"
                            className="inline-action role-permission-action"
                            title="Manage Permissions"
                            aria-label={`Manage permissions for ${role.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              managePermissions(role);
                            }}
                          >
                            <KeyRound size={15} />
                          </button>

                          {/* EDIT */}

                          {canEdit && (
                            <button
                              type="button"
                              className="inline-action inline-action--edit"
                              title="Edit Role"
                              aria-label={`Edit ${role.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditRole(role);
                              }}
                            >
                              <Edit3 size={14} />
                            </button>
                          )}

                          {/* DELETE */}

                          {canDelete && (
                            <button
                              type="button"
                              className="inline-action inline-action--delete"
                              title="Delete Role"
                              aria-label={`Delete ${role.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeletingRole(role);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td colSpan={8} className="payment-empty-table text-center py-8">
                    No roles match the current filters.
                  </td>
                </tr>
              )}
            </tbody>

          </table>

        </div>

      </section>

      {/* =========================================
          DELETE MODAL
      ========================================= */}

      {deletingRole && (
        <DeleteRoleModal
          role={deletingRole}
          onCancel={() => setDeletingRole(null)}
          onConfirm={confirmDeleteRole}
        />
      )}

    </div>
  );
}

/* =========================================================
   ROLE FORM PAGE
========================================================= */

function RoleFormPage({
  mode,
  form,
  setForm,
  onBack,
  onSubmit,
}) {
  const isEditing = mode === 'edit';

  return (
    <div className="lf-page leads-page roles-page">

      <section className="lead-form-page role-form-page">

        <div className="lead-form-page-card">

          {/* =========================================
              HEADER
          ========================================= */}

          <header className="lead-form-page-head">

            <div>
              <h2>
                {isEditing ? 'Edit Role' : 'Add Role'}
              </h2>

              <p>
                {isEditing ? 'Update role information.' : 'Create a new CRM role.'}
              </p>
            </div>

            <button
              type="button"
              className="lead-form-back"
              aria-label="Back"
              title="Back"
              onClick={onBack}
            >
              <ArrowLeft size={22} />
            </button>

          </header>

          {/* =========================================
              FORM
          ========================================= */}

          <form
            className="lf-lead-form"
            id="role-form"
            onSubmit={onSubmit}
          >

            <div className="contact-form-section-title role-form-section-title">
              <h3>
                Role Information
              </h3>
            </div>

            {/* ROLE NAME */}

            <label className="lf-field">

              <span>
                Role Name *
              </span>

              <input
                type="text"
                required
                placeholder="e.g. Sales Manager"
                value={form.name}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      name: event.target.value,
                    })
                  )
                }
              />

            </label>

            {/* STATUS */}

            <label className="lf-field">

              <span>
                Status
              </span>

              <select
                value={form.status}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      status: event.target.value,
                    })
                  )
                }
              >
                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>
              </select>

            </label>

            {/* DESCRIPTION */}

            <label className="lf-field role-description-field">

              <span>
                Description
              </span>

              <textarea
                rows={5}
                placeholder="Describe the purpose of this role..."
                value={form.description}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      description: event.target.value,
                    })
                  )
                }
              />

            </label>

          </form>

          {/* =========================================
              FOOTER
          ========================================= */}

          <div className="lf-modal-actions">

            <button
              type="button"
              onClick={onBack}
            >
              Cancel
            </button>

            <button
              type="submit"
              form="role-form"
              className="primary"
            >
              <ShieldCheck size={16} />

              {isEditing ? 'Update Role' : 'Save Role'}
            </button>

          </div>

        </div>
      </section>
    </div>
  );
}

/* =========================================================
   ROLE DETAIL PAGE
========================================================= */

function RoleDetailPage({
  role,
  onBack,
  onEdit,
  onManagePermissions,
  onDelete,
  deletingRole,
  onCancelDelete,
  onConfirmDelete,
  canEdit = true,
  canDelete = true,
}) {
  return (
    <div className="lf-page leads-page role-record-page">

      <section
        className="payment-record-detail contact-record-detail role-record-detail"
        aria-label="Role details"
      >

        {/* =========================================
            HEADER
        ========================================= */}

        <header className="payment-record-header">

          {/* BACK */}

          <button
            type="button"
            className="payment-record-back"
            aria-label="Back"
            title="Back"
            onClick={onBack}
          >
            <ArrowLeft size={22} />
          </button>

          {/* TITLE */}

          <div>
            <h2>
              {role.name || 'Role Detail'}
            </h2>

            <p>
              {role.id || '-'}
              {' / '}
              {role.description || 'No description available.'}
            </p>
          </div>

          {/* ACTIONS */}

          <div className="contact-record-actions role-record-actions">

            <button
              type="button"
              className="role-permission-detail-btn"
              onClick={onManagePermissions}
            >
              <KeyRound size={15} />

              Permissions
            </button>

            {canEdit && (
              <button
                type="button"
                className="payment-record-edit"
                onClick={onEdit}
              >
                Edit
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                className="inline-action inline-action--delete"
                title="Delete Role"
                aria-label="Delete Role"
                onClick={onDelete}
              >
                <Trash2 size={16} />
              </button>
            )}

          </div>

        </header>

        {/* =========================================
            SUMMARY
        ========================================= */}

        <section
          className="payment-record-summary"
          aria-label="Role summary"
        >

          <div>
            <span>
              Role ID
            </span>

            <strong>
              {role.id || '-'}
            </strong>
          </div>

          <div>
            <span>
              Status
            </span>

            <strong>
              {role.status || '-'}
            </strong>
          </div>

          <div>
            <span>
              Assigned Users
            </span>

            <strong>
              {role.assignedUsers ?? 0}
            </strong>
          </div>

          <div>
            <span>
              Created Date
            </span>

            <strong>
              {formatDate(role.createdDate)}
            </strong>
          </div>

        </section>

        {/* =========================================
            ROLE INFORMATION
        ========================================= */}

        <div className="payment-record-sections lead-primary-sections">

          <section className="payment-record-section">

            <h3>
              Role Information
            </h3>

            <dl>

              <div>
                <dt>
                  Role Name
                </dt>

                <dd>
                  {role.name || '-'}
                </dd>
              </div>

              <div>
                <dt>
                  Role ID
                </dt>

                <dd>
                  {role.id || '-'}
                </dd>
              </div>

              <div>
                <dt>
                  Status
                </dt>

                <dd>
                  {role.status || '-'}
                </dd>
              </div>

              <div>
                <dt>
                  Assigned Users
                </dt>

                <dd>
                  {role.assignedUsers ?? 0}
                </dd>
              </div>

              <div>
                <dt>
                  Created Date
                </dt>

                <dd>
                  {formatDate(role.createdDate)}
                </dd>
              </div>

              <div>
                <dt>
                  Description
                </dt>

                <dd>
                  {role.description || '-'}
                </dd>
              </div>

            </dl>

          </section>

        </div>

        {/* =========================================
            PERMISSIONS SECTION
        ========================================= */}

        <section className="payment-record-section payment-record-history role-permissions-detail">

          <h3>
            Role Permissions
          </h3>

          <p>
            Permission settings are managed on the separate Permissions page.
          </p>

          <button
            type="button"
            className="lf-btn lf-btn-primary role-manage-permissions-btn"
            onClick={onManagePermissions}
          >
            <KeyRound size={16} />

            Manage Permissions
          </button>

        </section>

      </section>

      {/* =========================================
          DELETE MODAL
      ========================================= */}

      {deletingRole && (
        <DeleteRoleModal
          role={deletingRole}
          onCancel={() => setDeletingRole(null)}
          onConfirm={onConfirmDelete}
        />
      )}

    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function RoleStatusBadge({
  status,
}) {
  const active = status === 'Active';

  return (
    <span
      className={`lf-badge role-status ${
        active
          ? 'role-status--active contact-status--active'
          : 'role-status--inactive contact-status--inactive'
      }`}
    >
      {status || '-'}
    </span>
  );
}

/* =========================================================
   FILTER DROPDOWN
========================================================= */

function RoleFilterDropdown({
  label,
  value,
  options,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [optionSearch, setOptionSearch] = useState('');

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(optionSearch.toLowerCase())
  );

  return (
    <div
      className="lf-select-field searchable"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setOptionSearch('');
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
              value={optionSearch}
              placeholder={`Search ${label.toLowerCase()}...`}
              onChange={(event) =>
                setOptionSearch(event.target.value)
              }
            />

          </label>

          <div role="listbox">

            {filteredOptions.map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  className={option === value ? 'selected' : ''}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setOptionSearch('');
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
   DELETE ROLE MODAL
========================================================= */

function DeleteRoleModal({
  role,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="lf-modal-backdrop"
      role="presentation"
    >

      <section
        className="lf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-role-title"
      >

        <div className="lf-modal-head">

          <div>
            <h2 id="delete-role-title">
              Delete this role?
            </h2>

            <p>
              Delete {role.name}? This action cannot be undone.
            </p>
          </div>

          <button
            type="button"
            className="lf-modal-close"
            aria-label="Close"
            title="Close"
            onClick={onCancel}
          >
            <X size={20} />
          </button>

        </div>

        <div className="lf-modal-actions">

          <button
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary danger-btn"
            onClick={onConfirm}
          >
            Delete Role
          </button>

        </div>

      </section>

    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function truncateText(
  value,
  maxLength
) {
  const text = String(value || '');

  if (!text) {
    return '—';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const text = String(value).slice(0, 10);

  const date = new Date(`${text}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return text || '—';
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  ).format(date);
}