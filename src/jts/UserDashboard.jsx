import React, { useEffect, useState } from 'react';

import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  LogOut,
  Mail,
  Megaphone,
  Phone,
  Search,
  User,
} from 'lucide-react';

import { fetchUserDashboard } from '../data/jts/userDashboardApi';

const PRODUCTS_PER_PAGE = 8;



export default function UserDashboard({
  profile,
  onProfileLoad,
  onTriggerPasswordChange,
  onOpenProfile,
  onLogout,
  searchQuery = '',
}) {
  /* =====================================================
     STATE
  ===================================================== */

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const [accountOpen, setAccountOpen] = useState(false);

  const [productPage, setProductPage] = useState(1);

  /* =====================================================
     LOAD DASHBOARD
  ===================================================== */
  useEffect(() => {
    setProductPage(1);
  }, [searchQuery]);

  useEffect(() => {
    let mounted = true;

    fetchUserDashboard()
      .then((data) => {
        if (!mounted) return;

        setDashboard(data);

        if (!profile && data?.user && onProfileLoad) {
          onProfileLoad(data.user);
        }
      })
      .catch((error) => {
        console.error(
          'Failed to load user dashboard:',
          error
        );
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <section className="jts-user-dashboard">
        <div className="jts-user-loading">
          Loading dashboard...
        </div>
      </section>
    );
  }

  /* =====================================================
     ERROR / NO DATA
  ===================================================== */

  if (!dashboard) {
    return (
      <section className="jts-user-dashboard">
        <div className="jts-user-loading">
          Unable to load dashboard.
        </div>
      </section>
    );
  }

  /* =====================================================
     DATA
  ===================================================== */

  const user = profile || dashboard.user || {};

  const subscriptions = dashboard.subscriptions || [];

  /* =====================================================
     PROFILE INITIALS
  ===================================================== */

  const getInitials = (name = '') => {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return 'U';
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  /* =====================================================
     PRODUCT SEARCH
  ===================================================== */

  const normalizedSearch = searchQuery
    .trim()
    .toLowerCase();

  const filteredProducts = subscriptions.filter(
    (item) => {
      if (!normalizedSearch) {
        return true;
      }

      const product = String(
        item.product || ''
      ).toLowerCase();

      const plan = String(
        item.pricingPlan || ''
      ).toLowerCase();

      const status = String(
        item.status || ''
      ).toLowerCase();

      return (
        product.includes(normalizedSearch) ||
        plan.includes(normalizedSearch) ||
        status.includes(normalizedSearch)
      );
    }
  );

  /* =====================================================
     PAGINATION
  ===================================================== */

  const totalProductPages = Math.max(
    1,
    Math.ceil(
      filteredProducts.length /
      PRODUCTS_PER_PAGE
    )
  );

  const safeProductPage = Math.min(
    productPage,
    totalProductPages
  );

  const productStartIndex =
    (safeProductPage - 1) *
    PRODUCTS_PER_PAGE;

  const visibleProducts =
    filteredProducts.slice(
      productStartIndex,
      productStartIndex +
      PRODUCTS_PER_PAGE
    );

  const firstVisibleProduct =
    filteredProducts.length === 0
      ? 0
      : productStartIndex + 1;

  const lastVisibleProduct = Math.min(
    productStartIndex +
    PRODUCTS_PER_PAGE,
    filteredProducts.length
  );


  /* =====================================================
     ACCOUNT ACTIONS
  ===================================================== */

  const closeAccountMenu = () => {
    setAccountOpen(false);
  };

  const handleOpenProfile = () => {
    closeAccountMenu();

    onOpenProfile?.();
  };

  const handlePasswordChange = () => {
    closeAccountMenu();

    onTriggerPasswordChange?.();
  };

  const handleLogout = () => {
    closeAccountMenu();

    onLogout?.();
  };

  /* =====================================================
     PRODUCT ACTION
  ===================================================== */

  const handleProductAction = (item) => {
    if (item.hasCrm) {
      console.log(
        'Launch CRM:',
        item.product
      );

      /*
        Later you can replace the console.log
        with navigation.

        Example:

        window.location.href = '/crm';

        OR

        onLaunchProduct?.(item);
      */

      return;
    }

    console.log(
      'View Product:',
      item.product
    );
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <section className="jts-user-dashboard">

      {/* =================================================
          USER PROFILE / HERO
      ================================================= */}

      <header className="jts-user-hero">

        <div className="jts-user-profile-summary">

          {/* Avatar */}
          <div className="jts-user-avatar">

            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt={`${user.name || 'User'} profile`}
              />
            ) : (
              <span>
                {getInitials(user.name)}
              </span>
            )}

          </div>


          {/* User details */}
          <div className="jts-user-profile-content">

            <p className="jts-user-kicker">
              Account Overview
            </p>

            <h1>
              Welcome, {user.name || 'User'}
            </h1>

            <p className="jts-user-description">
              Manage your products,
              subscriptions and account
              information from one place.
            </p>


            <div className="jts-user-meta">

              {user.organization && (
                <span>
                  <Building2 size={14} />

                  {user.organization}
                </span>
              )}


              {user.email && (
                <span>
                  <Mail size={14} />

                  {user.email}
                </span>
              )}


              {user.phone && (
                <span>
                  <Phone size={14} />

                  {user.phone}
                </span>
              )}

            </div>

          </div>

        </div>


        {/* ===============================================
            MANAGE ACCOUNT
        =============================================== */}

        <div className="jts-manage-wrap">

          <button
            type="button"
            className="jts-manage-button"
            aria-expanded={accountOpen}
            onClick={() =>
              setAccountOpen(
                (current) => !current
              )
            }
          >
            <Edit3 size={16} />

            Manage Account
          </button>


          {accountOpen && (

            <div className="jts-manage-menu">

              <button
                type="button"
                onClick={handleOpenProfile}
              >
                <User size={16} />

                My Profile
              </button>


              <button
                type="button"
                onClick={
                  handlePasswordChange
                }
              >
                <Edit3 size={16} />

                Change Password
              </button>


              <button
                type="button"
                className="logout"
                onClick={handleLogout}
              >
                <LogOut size={16} />

                Logout
              </button>

            </div>

          )}

        </div>

      </header>


      {/* =================================================
          PRODUCTS & SERVICES
      ================================================= */}

      <section className="jts-section jts-products-section">

        {/* Section heading */}

        <div className="jts-section-header">

          <div>

            <h2>
              My Products &amp; Services
            </h2>

            <p className="jts-section-description">
              Quickly access and manage the
              products assigned to your
              account.
            </p>

          </div>


          <span className="jts-product-count">

            {subscriptions.length}{' '}

            {subscriptions.length === 1
              ? 'Product'
              : 'Products'}

          </span>

        </div>


        {/* ===============================================
            PRODUCT TOOLBAR
        =============================================== */}
        <div className="jts-product-results-bar">

          <span className="jts-results-count">
            {searchQuery ? (
              <>
                {filteredProducts.length}{' '}
                {filteredProducts.length === 1
                  ? 'result'
                  : 'results'}
                {' '}for "{searchQuery}"
              </>
            ) : (
              <>
                Showing {firstVisibleProduct}–
                {lastVisibleProduct} of{' '}
                {filteredProducts.length}
              </>
            )}
          </span>

        </div>



        {/* ===============================================
            PRODUCT GRID
        =============================================== */}

        {visibleProducts.length > 0 ? (

          <div className="jts-product-grid">

            {visibleProducts.map(
              (item) => {

                const isActive =
                  String(
                    item.status || ''
                  ).toLowerCase() ===
                  'active';

                return (

                  <article
                    className="jts-product-card"
                    key={item.id}
                  >

                    {/* Card header */}

                    <div className="jts-product-card-head">

                      <span className="jts-product-icon">

                        {item.hasCrm ? (
                          <BarChart3
                            size={20}
                          />
                        ) : (
                          <Megaphone
                            size={20}
                          />
                        )}

                      </span>


                      <span
                        className={`jts-user-status ${isActive
                            ? 'active'
                            : ''
                          }`}
                      >
                        {item.status ||
                          'Unknown'}
                      </span>

                    </div>


                    {/* Product info */}

                    <div className="jts-product-card-body">

                      <h4
                        title={
                          item.product
                        }
                      >
                        {item.product ||
                          'Product'}
                      </h4>


                      <p>
                        Plan:{' '}

                        <strong>
                          {item.pricingPlan ||
                            'Not assigned'}
                        </strong>
                      </p>

                    </div>


                    {/* Action */}

                    <button
                      type="button"
                      className={
                        item.hasCrm
                          ? 'jts-product-button primary'
                          : 'jts-product-button secondary'
                      }
                      onClick={() =>
                        handleProductAction(
                          item
                        )
                      }
                    >
                      {item.hasCrm
                        ? 'Launch CRM'
                        : 'View Product'}
                    </button>

                  </article>

                );
              }
            )}

          </div>

        ) : (

          /* =============================================
             EMPTY SEARCH RESULT
          ============================================= */

          <div className="jts-empty-state">

            <Search size={30} />

            <strong>
              No products found
            </strong>

            <span>
              Try searching with a
              different product name,
              plan or status.
            </span>

          </div>

        )}


        {/* ===============================================
            PRODUCT PAGINATION
        =============================================== */}

        {filteredProducts.length >
          PRODUCTS_PER_PAGE && (

            <div className="jts-product-pagination">

              <span>
                Page {safeProductPage}{' '}
                of {totalProductPages}
              </span>


              <div>

                <button
                  type="button"
                  disabled={
                    safeProductPage === 1
                  }
                  onClick={() =>
                    setProductPage(
                      Math.max(
                        1,
                        safeProductPage - 1
                      )
                    )
                  }
                >
                  <ChevronLeft
                    size={15}
                  />

                  Previous
                </button>


                <button
                  type="button"
                  disabled={
                    safeProductPage ===
                    totalProductPages
                  }
                  onClick={() =>
                    setProductPage(
                      Math.min(
                        totalProductPages,
                        safeProductPage + 1
                      )
                    )
                  }
                >
                  Next

                  <ChevronRight
                    size={15}
                  />
                </button>

              </div>

            </div>

          )}

      </section>


      {/* =================================================
          SUBSCRIPTION INFORMATION
      ================================================= */}

      <section className="jts-section jts-subscription-section">

        <div className="jts-section-header">

          <div>

            <h2>
              Subscription Information
            </h2>

            <p className="jts-section-description">
              Review your pricing plans,
              subscription status and
              renewal information.
            </p>

          </div>

        </div>


        {/* ===============================================
            SUBSCRIPTION TABLE
        =============================================== */}

        <div className="jts-subscription-table-wrap">

          <table className="jts-subscription-table">

            <thead>

              <tr>
                <th>
                  Product
                </th>

                <th>
                  Pricing Plan
                </th>

                <th>
                  Status
                </th>

                <th>
                  Start Date
                </th>

                <th>
                  Renewal Date
                </th>
              </tr>

            </thead>


            <tbody>

              {subscriptions.length >
                0 ? (

                subscriptions.map(
                  (item) => {

                    const isActive =
                      String(
                        item.status || ''
                      ).toLowerCase() ===
                      'active';

                    return (

                      <tr key={item.id}>

                        <td>
                          {item.product ||
                            '-'}
                        </td>


                        <td>
                          {item.pricingPlan ||
                            '-'}
                        </td>


                        <td>

                          <span
                            className={`jts-user-status ${isActive
                                ? 'active'
                                : ''
                              }`}
                          >
                            {item.status ||
                              'Unknown'}
                          </span>

                        </td>


                        <td>
                          {item.startDate ||
                            '-'}
                        </td>


                        <td>
                          {item.renewalDate ||
                            '-'}
                        </td>

                      </tr>

                    );
                  }
                )

              ) : (

                <tr>

                  <td
                    colSpan="5"
                    className="jts-table-empty"
                  >
                    No subscription
                    information available.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>

    </section>
  );
}