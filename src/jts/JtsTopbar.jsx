import React, { useMemo, useRef, useState } from 'react';
import {
  Bell,
  Boxes,
  Building2,
  CreditCard,
  HelpCircle,
  LayoutGrid,
  Menu,
  Package,
  Power,
  Search,
  ShieldCheck,
} from 'lucide-react';

const pageIcons = {
  Home: LayoutGrid,
  'Product Details': Package,
  'Service Details': Building2,
  Profile: LayoutGrid,
  'User Profile': LayoutGrid,
  'Admin Dashboard': LayoutGrid,
  'Catalog Dashboard': LayoutGrid,
  Products: Package,
  Modules: Building2,
  'Pricing Plans': CreditCard,
  Approvals: ShieldCheck,
};

const adminUser = {
  fullName: 'JTS Admin',
  role: 'User',
};

function getInitials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function highlightMatch(text, query) {
  if (!query) {
    return text;
  }

  const matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
  if (matchIndex === -1) {
    return text;
  }

  return (
    <>
      {text.slice(0, matchIndex)}
      <mark className="search-highlight">{text.slice(matchIndex, matchIndex + query.length)}</mark>
      {text.slice(matchIndex + query.length)}
    </>
  );
}

export default function Topbar({ onMenuClick, pageLabel, onLogout, onNavigate }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const blurTimer = useRef(null);
  const initials = getInitials(adminUser.fullName);
  const pageTitle = pageLabel || 'Dashboard';
  const CurrentPageIcon = pageIcons[pageTitle] || LayoutGrid;
  const isCatalogDashboard = pageTitle === 'Catalog Dashboard';

  const records = useMemo(() => [
    { type: 'Page', title: 'Home', meta: 'Product and service browsing', screen: 'landing' },
    { type: 'Page', title: 'Product Details', meta: 'Product modules and pricing plans', screen: 'product-details' },
    { type: 'Page', title: 'Service Details', meta: 'Service pricing and features', screen: 'service-details' },
    { type: 'Page', title: 'User Profile', meta: 'User dashboard and account summary', screen: 'user-dashboard' },
    { type: 'Page', title: 'Approvals', meta: 'Company approval requests', screen: 'admin-dashboard' },
    { type: 'Page', title: 'Catalog Dashboard', meta: 'Catalog counts and recent activity', screen: 'catalog-dashboard' },
    { type: 'Page', title: 'Products', meta: 'Product list and product forms', screen: 'products' },
    { type: 'Page', title: 'Modules', meta: 'Module list and module forms', screen: 'modules' },
    { type: 'Page', title: 'Pricing Plans', meta: 'Plan list, modules, and discounts', screen: 'pricing-plans' },
  ], []);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return [];
    }

    return records
      .filter((record) => `${record.type} ${record.title} ${record.meta}`.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [query, records]);

  const closeSearchLater = () => {
    blurTimer.current = window.setTimeout(() => setSearchOpen(false), 120);
  };

  const keepSearchOpen = () => {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
    }
    setSearchOpen(true);
  };

  const handleResultClick = (screen) => {
    onNavigate?.(screen);
    setQuery('');
    setSearchOpen(false);
  };

  return (
    <>
      {searchOpen && <div className="crm-search-backdrop" aria-hidden="true" />}

      <header className="crm-navbar" role="banner">
        <button
          className="crm-navbar-menu-btn"
          type="button"
          aria-label="Toggle sidebar"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>

        <div className="crm-navbar-brand" aria-hidden="true">
          <span className="crm-navbar-page-icon">
            <CurrentPageIcon size={18} />
          </span>
          <span>{pageTitle}</span>
        </div>

        <div className="crm-navbar-brand-mobile" aria-hidden="true">
          <Boxes size={20} />
          <span>
            Lead<span>Flow</span>
          </span>
        </div>

        {isCatalogDashboard ? (
          <div className="crm-navbar-portal-label">JTS Administration Portal</div>
        ) : (
          <div
            className={`crm-navbar-search ${searchOpen ? 'crm-navbar-search--active' : ''}`}
            role="search"
            onFocus={keepSearchOpen}
            onBlur={closeSearchLater}
          >
            <Search size={15} aria-hidden="true" />
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              aria-label="Global CRM search"
            />

            {searchOpen && (
              <div className="crm-search-popover">
                <div className="crm-search-popover-head">
                  <strong>Search Results</strong>
                  {query.trim() && <span>{results.length} found</span>}
                </div>

                {query.trim() ? (
                  <div className="crm-search-results">
                    {results.length > 0 ? (
                      results.map((result) => (
                        <button
                          type="button"
                          key={`${result.type}-${result.title}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleResultClick(result.screen)}
                        >
                          <span>{result.type}</span>
                          <strong>{highlightMatch(result.title, query)}</strong>
                          <small>{highlightMatch(result.meta, query)}</small>
                        </button>
                      ))
                    ) : (
                      <p className="crm-search-empty">No matching records.</p>
                    )}
                  </div>
                ) : (
                  <p className="crm-search-empty">Type a name, ID, company, phone, email, status, or amount.</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="crm-navbar-right">
          <button
            className="crm-navbar-icon-btn"
            type="button"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="crm-notif-dot" aria-label="3 unread notifications" />
          </button>

          <button
            className="crm-navbar-icon-btn"
            type="button"
            aria-label="Help"
            title="Help"
          >
            <HelpCircle size={18} />
          </button>

          <div className="crm-profile-wrap">
            <button
              className="crm-navbar-profile"
              type="button"
              aria-label="Open account panel"
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((current) => !current)}
            >
              <div className="crm-avatar" aria-hidden="true">{initials}</div>
              <div className="crm-profile-meta">
                <span className="crm-profile-name">{adminUser.fullName}</span>
                <span className="crm-profile-role">{adminUser.role}</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {profileOpen && (
        <div className="account-drawer-layer" role="presentation">
          <button
            className="account-drawer-backdrop"
            type="button"
            aria-label="Close account panel"
            onClick={() => setProfileOpen(false)}
          />
          <aside className="account-drawer account-drawer--simple" role="menu" aria-label="Account menu">
            <header className="account-drawer-head">
              <div className="account-drawer-avatar">{initials}</div>
              <div>
                <h2>{adminUser.fullName}</h2>
                <p>User Id: 4</p>
              </div>
            </header>

            <footer className="account-drawer-footer">
              <button type="button" className="account-signout-button" role="menuitem" onClick={onLogout}>
                <Power size={18} />
                Sign Out
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
