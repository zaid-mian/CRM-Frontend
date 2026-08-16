import React from 'react';

export function StatCard({ title, children }) {
    return (
        <div className="lf-card">
            <h3 className="lf-section-label">{title}</h3>
            <div className="lf-card-body">{children}</div>
        </div>
    );
}

export function StatusBadge({ status }) {
    const tone = status === 'Approved' || status === 'Resolved' || status === 'Reviewed'
        ? 'success'
        : status === 'Rejected' || status === 'Closed'
            ? 'danger'
            : status === 'Open' || status === 'In Progress' || status === 'New'
                ? 'info'
                : 'warning';

    return <span className={`lf-badge lf-badge--${tone}`}>{status}</span>;
}

export function PrimaryButton({ children, onClick, type = 'button' }) {
    return (
        <button type={type} onClick={onClick} className="button primary">
            {children}
        </button>
    );
}

export function SecondaryButton({ children, onClick, type = 'button' }) {
    return (
        <button type={type} onClick={onClick} className="button secondary">
            {children}
        </button>
    );
}

export function TextInput({ label, value, onChange, type = 'text', placeholder, required = false }) {
    return (
        <div className="field">
            <label>
                {label}
                {required && <span>*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder || label}
            />
        </div>
    );
}

export function JtsTextArea({ label, value, onChange, placeholder, required = false }) {
    return (
        <div className="field wide">
            <label>
                {label}
                {required && <span>*</span>}
            </label>
            <textarea
                rows="4"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder || label}
            />
        </div>
    );
}

export function DataTable({ columns, rows, renderActions }) {
    return (
        <div className="lf-table-scroll">
            <table className="lf-leads-table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                        ))}
                        {renderActions && <th>Action</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id}>
                            {columns.map((column) => (
                                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                            ))}
                            {renderActions && <td>{renderActions(row)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
