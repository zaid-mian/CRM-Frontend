import React, { useMemo, useState } from 'react';
import { ChevronDown, Filter, Plus, RefreshCw, Search, X } from 'lucide-react';

export function Header({ title, text, action, onAction }) {
  const Icon = action === 'Refresh' ? RefreshCw : Plus;

  return (
    <header className="page-header">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <button className="button primary" onClick={onAction}>
        <Icon size={16} />
        {action}
      </button>
    </header>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="search">
      <Search size={16} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function HighlightedText({ text, query }) {
  const value = String(text ?? '');
  const term = String(query || '').trim();
  if (!term) return value || '-';
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = value.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, index) => part.toLowerCase() === term.toLowerCase()
        ? <mark key={`${part}-${index}`} className="search-highlight">{part}</mark>
        : part)}
    </>
  );
}

export function SearchableSelect({ label, value, options, onChange, placeholder = 'Search', className = 'field', icon, emptyText = 'No options found', disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => String(option).toLowerCase().includes(normalized));
  }, [options, query]);

  const selectOption = (option) => {
    onChange(option);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={`${className} searchable-filter ${disabled ? 'disabled-field' : ''}`} style={disabled ? { opacity: 0.7, pointerEvents: 'none' } : {}}>
      {icon}
      <span>{label}</span>
      <input
        value={open && !disabled ? query : value}
        placeholder={placeholder}
        onFocus={() => !disabled && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          if (disabled) return;
          setQuery(event.target.value);
          setOpen(true);
        }}
        disabled={disabled}
      />
      <ChevronDown className="searchable-chevron" size={15} />
      {open && !disabled && (
        <div className="filter-menu">
          {filteredOptions.length > 0 ? filteredOptions.map((option) => (
            <button type="button" key={option} onMouseDown={() => selectOption(option)}>
              {option}
            </button>
          )) : (
            <div className="filter-empty">{emptyText}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterBox({ label, value, options, onChange }) {
  return <SearchableSelect label={label} value={value} options={options} onChange={onChange} className="filter" icon={<Filter size={14} />} />;
}

export function SearchableFilterBox({ label, value, options, onChange, placeholder = 'Search', fieldClassName = 'filter' }) {
  return <SearchableSelect label={label} value={value} options={options} onChange={onChange} placeholder={placeholder} className={fieldClassName} icon={<Filter size={14} />} />;
}

export function Table({
  columns,
  rows,
  sortBy,
  sortDirection = 'asc',
  onSort,
  sortableKeys = [],
  actions,
  empty,
  onRowClick,
  renderCell,
  expandedRowId,
  renderExpandedRow,
  selectedIds,
  onSelectRow,
  onSelectAll,
  rowClassName,
}) {
  const hasSelection = Boolean(selectedIds && onSelectRow && onSelectAll);
  const allVisibleSelected = hasSelection && rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {hasSelection && (
              <th>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => onSelectAll(event.target.checked, rows)}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map(([key, label]) => (
              <th key={key}>
                {onSort && sortableKeys.includes(key) ? (
                  <button className="sort" onClick={() => onSort(key)}>
                    {label}
                    <span className="sort-indicator">{sortBy === key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </button>
                ) : label}
              </th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <React.Fragment key={row.id}>
              <tr className={`${onRowClick ? 'clickable-row' : ''} ${hasSelection && selectedIds.includes(row.id) ? 'selected-row' : ''} ${rowClassName?.(row) || ''}`.trim()} onClick={() => onRowClick?.(row)}>
                {hasSelection && (
                  <td onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={(event) => onSelectRow(row.id, event.target.checked)}
                      aria-label={`Select ${row.clientId || row.id}`}
                    />
                  </td>
                )}
                {columns.map(([key]) => (
                  <td key={key}>
                    {renderCell?.(row, key, row[key]) ?? (
                      key === 'priority' || key === 'status'
                        ? <span className={`pill ${String(row[key]).toLowerCase()}`}>{row[key]}</span>
                        : row[key]
                    )}
                  </td>
                ))}
                <td onClick={(event) => event.stopPropagation()}>{actions(row)}</td>
              </tr>
              {expandedRowId === row.id && renderExpandedRow && (
                <tr className="expanded-action-row">
                  <td colSpan={columns.length + 1 + (hasSelection ? 1 : 0)}>{renderExpandedRow(row)}</td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && empty}
    </div>
  );
}

export function Drawer({ title, onClose, children }) {
  return (
    <aside className="drawer">
      <div className="panel-head">
        <h3>{title}</h3>
        <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
      </div>
      {children}
    </aside>
  );
}

export function Modal({ title, onClose, children, className = '' }) {
  return (
    <div className="modal-bg">
      <div className={`modal${className ? ` ${className}` : ''}`}>
        <div className="panel-head">
          <h3>{title}</h3>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, text, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="modal-text">{text}</p>
      <PanelActions>
        <button className="button secondary" onClick={onCancel}>Cancel</button>
        <button className={danger ? 'button danger' : 'button success'} onClick={onConfirm}>{confirmLabel}</button>
      </PanelActions>
    </Modal>
  );
}

export function TextField({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function SelectField({ label, value, options, onChange }) {
  return <SearchableSelect label={label} value={value} options={options} onChange={onChange} placeholder={`Search ${label.toLowerCase()}`} />;
}

export function TextArea({ label, value, onChange, wide }) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span>{label}</span>
      <textarea rows="4" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function IconButton({ label, onClick, children }) {
  return (
    <button type="button" className="icon-button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

export function Actions({ children }) {
  return <div className="actions">{children}</div>;
}

export function PanelActions({ children, wide }) {
  return <div className={wide ? 'panel-actions wide' : 'panel-actions'}>{children}</div>;
}

export function DetailGrid({ items }) {
  return (
    <div className="detail-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function DetailBlock({ title, text }) {
  return (
    <div className="detail-block">
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}

export function RelatedOpportunities() {
  return (
    <div className="detail-block">
      <h4>Related Opportunities</h4>
      <table className="small-table">
        <thead>
          <tr>
            <th>Opportunity</th>
            <th>Stage</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CRM Expansion</td>
            <td>Proposal</td>
            <td>PKR 850,000</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ title, action, onAction }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <button className="button primary" onClick={onAction}>
        <Plus size={16} />
        {action}
      </button>
    </div>
  );
}
