import React from 'react';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Home,
  LayoutGrid,
  LockKeyhole,
  LogIn,
  Package,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';

const iconMap = {
  landing: Home,
  'product-details': Package,
  'service-details': Building2,
  register: UserPlus,
  login: LogIn,
  forgot: LockKeyhole,
  'user-dashboard': LayoutGrid,
  profile: Users,
  'change-password': LockKeyhole,
  'admin-dashboard': ShieldCheck,
  products: Package,
  modules: LayoutGrid,
  'pricing-plans': CreditCard,
  'back-to-crm': ArrowLeft,
};

export default function Sidebar({ navItems, activeScreen, onNavigate, isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop – reuses CRM class */}
      <div
        className={`crm-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`crm-sidebar ${isOpen ? 'is-open' : ''}`}>
        {/* Brand / logo block – mirrors CRM crm-sb-logo structure */}
        <button type="button" className="crm-sb-logo" onClick={() => onNavigate('landing')}>
          <span className="crm-sb-logo-icon">
            <CreditCard size={19} />
          </span>
          <span className="crm-sb-logo-name">
            <span>JTS</span>
            <strong>
              <span>Portal</span>
            </strong>
          </span>
        </button>

        <p className="crm-sb-section-label">Main Menu</p>

        <nav className="crm-sb-nav">
          {navItems.map(([key, label]) => {
            const Icon = iconMap[key] || LayoutGrid;
            const isActive = activeScreen === key;

            return (
              <button
                key={key}
                type="button"
                className={`crm-sb-item${isActive ? ' crm-sb-item--active' : ''}`}
                onClick={() => onNavigate(key)}
              >
                <span className="crm-sb-item-icon">
                  <Icon size={18} />
                </span>
                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 650 }}>{label}</span>
                {isActive && <span className="crm-sb-item-dot" />}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
