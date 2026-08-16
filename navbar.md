# CRM Navbar Design Guide

This document describes the current LeadFlow CRM navbar so the same theme and behavior can be reused in another project.

## Purpose

The navbar is a compact, professional CRM top bar. It provides:

- Current page title.
- Mobile sidebar toggle.
- Global CRM search.
- Notification/help icon buttons.
- User profile button.
- Account dropdown with sign out.

It is designed for an admin/workspace product, not a marketing website.

## Required Tokens

The navbar depends on these theme variables from `src/styles.css`:

```css
:root {
  --color-primary: #2563eb;
  --color-primary-600: #1d4ed8;
  --color-primary-50: #eff6ff;
  --color-secondary: #0f172a;
  --color-bg: #f6f8fb;
  --color-surface: #ffffff;
  --color-surface-2: #f8fafc;
  --color-text: #172033;
  --color-muted: #64748b;
  --color-soft: #94a3b8;
  --color-border: #dbe3ef;
  --color-error: #dc2626;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-lg: 0 24px 56px rgba(15, 23, 42, 0.16);
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --sidebar-width: 236px;
  --header-height: 64px;
  --font-xs: 12px;
  --font-sm: 13px;
}
```

## Layout

The navbar lives inside `.crm-main`, after the fixed sidebar.

```jsx
<div className="crm-main">
  {globalSearchOpen && <div className="crm-search-backdrop" aria-hidden="true" />}

  <header className="crm-navbar" role="banner">
    ...
  </header>
</div>
```

Navbar layout rules:

- Sticky at the top.
- Height: `64px`.
- White translucent background.
- Bottom border.
- Light backdrop blur.
- Horizontal flex layout.
- Page title left.
- Search centered on desktop.
- Actions right.

```css
.crm-navbar {
  position: sticky;
  top: 0;
  z-index: 30;
  min-height: var(--header-height);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: 0 var(--space-6);
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(14px);
}
```

## Desktop Structure

Current navbar JSX pattern:

```jsx
<header className="crm-navbar" role="banner">
  <button className="crm-navbar-menu-btn" type="button" aria-label="Toggle sidebar">
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
    <span>Lead<span>Flow</span></span>
  </div>

  <div className="crm-navbar-search" role="search">
    <Search size={15} aria-hidden="true" />
    <input id="global-search" type="search" placeholder="Search..." aria-label="Global CRM search" />
  </div>

  <div className="crm-navbar-right">
    <button className="crm-navbar-icon-btn" type="button" aria-label="Notifications" title="Notifications">
      <Bell size={18} />
      <span className="crm-notif-dot" aria-label="3 unread notifications" />
    </button>

    <button className="crm-navbar-icon-btn" type="button" aria-label="Help and support" title="Help">
      <HelpCircle size={18} />
    </button>

    <div className="crm-profile-wrap">
      <button className="crm-navbar-profile" type="button" aria-label="Open account panel" aria-haspopup="dialog">
        <div className="crm-avatar" aria-hidden="true">S</div>
        <div className="crm-profile-meta">
          <span className="crm-profile-name">Salesperson2</span>
          <span className="crm-profile-role">User</span>
        </div>
      </button>
    </div>
  </div>
</header>
```

## Page Title

The page title appears on the left:

- Text is dark navy.
- Font size is `24px`.
- Weight is intentionally lighter than table/page headings: `400`.
- Page icon wrapper exists but is hidden with `display: none !important`.

```css
.crm-navbar-brand {
  order: 1;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  width: auto;
  min-height: 42px;
  padding: 0;
  color: var(--color-secondary);
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  font-size: 24px;
  font-weight: 400;
  line-height: 1;
  white-space: nowrap;
}
```

## Icon Buttons

Navbar icon buttons are used for menu, notifications, and help.

Style:

- Size: `38px x 38px`.
- White background.
- Blue-gray border.
- Muted icon color.
- Small shadow.
- Hover turns blue with pale blue background.

```css
.crm-navbar-menu-btn,
.crm-navbar-icon-btn {
  width: 38px;
  height: 38px;
  display: inline-grid;
  place-items: center;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: background 150ms ease, color 150ms ease, border 150ms ease, transform 150ms ease;
}

.crm-navbar-icon-btn:hover,
.crm-navbar-menu-btn:hover {
  color: var(--color-primary);
  border-color: #bfdbfe;
  background: var(--color-primary-50);
}
```

The mobile menu button is hidden on desktop:

```css
.crm-navbar-menu-btn {
  display: none;
}
```

## Global Search

The global search is centered on desktop with absolute positioning.

Default state:

- Width: `min(460px, 32vw)`.
- Height: `38px`.
- Pale surface background.
- Rounded `8px`.
- Muted icon and placeholder.

Active state:

- Width grows to `min(620px, 46vw)`.
- Height grows to `44px`.
- Background becomes white.
- Border becomes pale blue.
- Shadow becomes stronger.
- Slight scale effect.

```css
.crm-navbar-search {
  position: absolute;
  left: 50%;
  z-index: 45;
  width: min(460px, 32vw);
  max-width: calc(100vw - var(--sidebar-width) - 600px);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 38px;
  padding: 0 var(--space-3);
  color: var(--color-muted);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: width 180ms ease, height 180ms ease, box-shadow 180ms ease, background 180ms ease, transform 180ms ease;
}

.crm-navbar-search--active {
  width: min(620px, 46vw);
  height: 44px;
  background: var(--color-surface);
  border-color: #bfdbfe;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.16);
  transform: translateX(-50%) scale(0.98);
}
```

Input style:

```css
.crm-navbar-search input {
  width: 100%;
  min-width: 0;
  color: var(--color-text);
  background: transparent;
  border: 0;
  outline: 0;
}
```

## Search Popover

When search is active, a popover opens below the search field.

Behavior:

- Shows a header: `Search Results`.
- Shows count when query exists.
- Shows result rows for matching CRM records.
- Shows empty helper text when query is empty.
- Clicking a result navigates to the related page.

Popover style:

```css
.crm-search-popover {
  position: absolute;
  z-index: 80;
  top: calc(100% + 10px);
  left: 0;
  width: min(620px, calc(100vw - 32px));
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.crm-search-popover-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.crm-search-results {
  display: grid;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.crm-search-results button {
  width: 100%;
  display: grid;
  align-items: start;
  gap: var(--space-2);
  min-height: 34px;
  padding: 0 10px;
  color: var(--color-text);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  text-align: left;
  font-size: 13px;
  font-weight: 750;
}

.crm-search-results button:hover {
  background: var(--color-primary-50);
}
```

Search backdrop:

```css
.crm-search-backdrop {
  position: fixed;
  inset: var(--header-height) 0 0 var(--sidebar-width);
  z-index: 20;
  background: rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(1px);
  pointer-events: none;
}
```

## Right Controls

Right controls are grouped with `.crm-navbar-right`.

```css
.crm-navbar-right {
  order: 3;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}
```

The notification dot is positioned inside the notification button:

```css
.crm-notif-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  margin: -18px 0 0 16px;
  border-radius: 50%;
  background: var(--color-error);
}
```

## User Profile Button

The user button shows avatar, name, and role.

Style:

- Height around `42px`.
- Avatar on left.
- Name and role stacked.
- White background with border.
- Compact rounded rectangle.

```css
.crm-navbar-profile {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 4px var(--space-3) 4px 4px;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.crm-avatar {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary), #0f766e);
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: 800;
}

.crm-profile-meta {
  min-width: 0;
  display: grid;
}

.crm-profile-name {
  overflow: hidden;
  color: inherit;
  font-size: var(--font-sm);
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crm-profile-role {
  color: var(--color-soft);
  font-size: var(--font-xs);
}
```

## Account Dropdown

Clicking the profile button opens a compact dropdown menu below the navbar.

It contains:

- Avatar.
- User name.
- User ID.
- Sign Out button.

It should not be a full-height drawer.

Markup pattern:

```jsx
{profileOpen && (
  <div className="account-drawer-layer" role="presentation">
    <button className="account-drawer-backdrop" type="button" aria-label="Close account panel" onClick={onClose} />
    <aside className="account-drawer account-drawer--simple" role="menu" aria-label="Account menu">
      <header className="account-drawer-head">
        <div className="account-drawer-avatar">S</div>
        <div>
          <h2>Salesperson2</h2>
          <p>User Id: 4</p>
        </div>
      </header>

      <footer className="account-drawer-footer">
        <button type="button" className="account-signout-button" role="menuitem">
          <Power size={18} />
          Sign Out
        </button>
      </footer>
    </aside>
  </div>
)}
```

Dropdown style:

```css
.account-drawer-layer {
  display: block;
  padding: 0;
  background: transparent;
  pointer-events: none;
}

.account-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: transparent;
  border: 0;
  pointer-events: auto;
}

.account-drawer.account-drawer--simple {
  position: fixed;
  inset: 72px 20px auto auto;
  z-index: 110;
  width: min(280px, calc(100vw - 40px));
  max-height: calc(100vh - 88px);
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
  pointer-events: auto;
}

.account-drawer--simple .account-drawer-head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: 0 0 12px;
  border-bottom: 1px solid var(--color-border);
}

.account-drawer--simple .account-drawer-avatar {
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary), #0f766e);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 850;
}

.account-drawer--simple .account-drawer-head h2 {
  margin: 0;
  color: var(--color-secondary);
  font-size: 15px;
  line-height: 1.2;
}

.account-drawer--simple .account-drawer-head p {
  margin-top: 6px;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 650;
}

.account-drawer--simple .account-signout-button {
  width: 100%;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: #ffffff;
  background: #2563eb;
  border: 1px solid #2563eb;
  border-radius: var(--radius-md);
  font-weight: 850;
}

.account-drawer--simple .account-signout-button:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}
```

## Mobile Behavior

At tablet/mobile widths:

- Sidebar becomes hidden off-canvas.
- Menu button appears.
- Main content no longer has left margin.
- Search becomes relative and flexes inside the navbar.
- User profile metadata is hidden, leaving only avatar.

```css
@media (max-width: 900px) {
  .crm-main {
    margin-left: 0;
  }

  .crm-navbar-menu-btn {
    display: inline-grid;
  }

  .crm-navbar {
    padding: 0 var(--space-4);
  }

  .crm-navbar-search {
    position: relative;
    left: auto;
    flex: 1;
    width: auto;
    max-width: none;
    transform: none;
  }

  .crm-navbar-search--active {
    width: auto;
    transform: none;
  }

  .crm-search-backdrop {
    inset: var(--header-height) 0 0 0;
  }

  .crm-profile-meta {
    display: none;
  }
}
```

At small mobile widths:

- Navbar wraps.
- Search takes full width on the second row.
- Notification/help buttons are hidden.

```css
@media (max-width: 700px) {
  .crm-navbar {
    min-height: auto;
    flex-wrap: wrap;
    padding-block: var(--space-3);
  }

  .crm-navbar-search {
    order: 5;
    flex-basis: 100%;
  }

  .crm-navbar-icon-btn {
    display: none;
  }
}
```

## Interaction Rules

- Clicking search focuses and expands it.
- Search popover closes when focus leaves the search container.
- Search result click should navigate to the related record/page.
- Profile button toggles account dropdown.
- Clicking outside account dropdown closes it.
- Sign Out should clear user session and return to login.
- Mobile menu button toggles the sidebar.

## Icon Set

Use `lucide-react`.

Recommended navbar icons:

- `Menu` for mobile sidebar toggle.
- `Search` for global search.
- `Bell` for notifications.
- `HelpCircle` for help.
- `Boxes` for mobile brand.
- `Power` for sign out.
- Page icons can use `LayoutGrid`, `Users`, `Building2`, `BarChart3`, or `CreditCard`.

## Copy Guidelines

Keep navbar text short:

- Page title: one or two words, such as `Dashboard`, `Leads`, `Contacts`.
- Search placeholder: `Search...`.
- Search popover title: `Search Results`.
- Empty search helper: `Type a name, ID, company, phone, email, status, or amount.`
- Account action: `Sign Out`.

## Reuse Checklist

To reuse this navbar in another project:

1. Copy the token variables.
2. Build the `.crm-navbar` structure with brand, search, right controls, and profile button.
3. Use a fixed or sticky sidebar offset with `--sidebar-width`.
4. Keep search centered on desktop and flexible on mobile.
5. Use the compact account dropdown, not a full drawer.
6. Use `lucide-react` icons at `15px` to `20px`.
7. Keep icon buttons `38px x 38px`.
8. Keep the visual style white, bordered, softly shadowed, and restrained.
