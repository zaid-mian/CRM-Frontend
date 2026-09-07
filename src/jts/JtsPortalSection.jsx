import React, { useState, useEffect } from 'react';
import JtsSidebar from './JtsSidebar';
import JtsTopbar from './JtsTopbar';
import ForgotPassword from './ForgotPassword';
import PasswordResetConfirm from './PasswordResetConfirm';
import ChangePassword from './ChangePassword';
import UserDashboard from './UserDashboard';
import AdminDashboard from './AdminDashboard';
import ProductLanding from './ProductLanding';
import ProductDetails from './ProductDetails';
import ServiceDetails from './ServiceDetails';
import RegistrationPage from './RegistrationPage';
import JtsLoginPage from './JtsLoginPage';
import ProfilePage from './ProfilePage';
import CatalogAdmin from './CatalogAdmin';

const navItems = [
    ['landing', 'Home'],
    ['product-details', 'Product Details'],
    ['service-details', 'Service Details'],
    ['login', 'Login'],
    ['register', 'Register'],
    ['user-dashboard', 'User Dashboard'],
    ['admin-dashboard', 'Approvals'],
    ['catalog-dashboard', 'Admin Dashboard'],
    ['products', 'Products'],
    ['modules', 'Modules'],
    ['pricing-plans', 'Pricing Plans'],
    ['back-to-crm', 'Back to CRM'],
];

const extraLabels = {
    profile: 'User Profile',
    register: 'Register',
    'change-password': 'Change Password',
};

const catalogScreens = new Set(['catalog-dashboard', 'products', 'modules', 'pricing-plans']);

export default function JtsPortalSection({ currentUser, setCurrentUser, onLogin, onLogout, initialScreen, onBackToCrm, reapplyEmail: propReapplyEmail, onReapplyHandled }) {
    const isLoggedIn = !!currentUser;

    const getInitialScreen = () => {
        if (!currentUser) return initialScreen || 'login';
        if (initialScreen && initialScreen !== 'login') return initialScreen;
        const isJtsAdmin = !!(currentUser.is_staff || currentUser.is_superuser);
        if (isJtsAdmin) return 'admin-dashboard';
        const isJtsUser = !isJtsAdmin && !!(currentUser.profile && currentUser.profile.organization && currentUser.profile.cnic !== "");
        if (isJtsUser) return 'user-dashboard';
        return 'landing';
    };

    const [screen, setScreen] = useState(getInitialScreen());
    const [resetParams, setResetParams] = useState(null);
    const [registrationContext, setRegistrationContext] = useState(null);
    const [localReapplyEmail, setLocalReapplyEmail] = useState('');
    const reapplyEmail = propReapplyEmail || localReapplyEmail;

    const handleBackToLogin = () => {
        setRegistrationContext(null);
        setLocalReapplyEmail('');
        if (onReapplyHandled) onReapplyHandled();
        setScreen('login');
    };

    useEffect(() => {
        if (currentUser) {
            if (screen === 'login' || screen === 'forgot' || screen === 'register' || screen === 'reset-password-confirm') {
                const isJtsAdmin = !!(currentUser.is_staff || currentUser.is_superuser);
                const isJtsUser = !isJtsAdmin && !!(currentUser.profile && currentUser.profile.organization && currentUser.profile.cnic !== "");
                if (isJtsAdmin) {
                    setScreen('admin-dashboard');
                } else if (isJtsUser) {
                    setScreen('user-dashboard');
                } else {
                    setScreen('landing');
                }
            }
        } else {
            const isPublic = screen === 'landing' || screen === 'product-details' || screen === 'service-details' || screen === 'login' || screen === 'register' || screen === 'forgot' || screen === 'reset-password-confirm';
            if (!isPublic) {
                setScreen('login');
            }
            if (screen === 'login') {
                onBackToCrm();
            }
        }
    }, [currentUser, screen, onBackToCrm]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const view = urlParams.get('view');
        const uid = urlParams.get('uid');
        const token = urlParams.get('token');

        if (view === 'reset-password' && uid && token) {
            setResetParams({ uid, token });
            setScreen('reset-password-confirm');
            // Clean up query parameters immediately
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);
    const [selectedProductSlug, setSelectedProductSlug] = useState('sales-crm');
    const [selectedServiceSlug, setSelectedServiceSlug] = useState('crm-implementation-consulting');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isJtsAdmin = !!(currentUser?.is_staff || currentUser?.is_superuser);
    const isJtsUser = !isJtsAdmin && !!(currentUser?.profile && currentUser?.profile.organization && currentUser?.profile.cnic !== "");
    const hasCrmAccess = !isJtsAdmin && (!isJtsUser || currentUser?.user_type === 'ADMIN');

    const jtsProfile = currentUser ? {
        name: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username,
        email: currentUser.email || currentUser.username,
        organization: currentUser.profile?.organization?.name || '',
        phone: currentUser.profile?.phone_number || '',
        address: currentUser.profile?.address || '',
        country: currentUser.profile?.country || '',
        cnic: currentUser.profile?.cnic || '',
    } : null;
    const [globalSearch, setGlobalSearch] = useState('');

    const openProductDetails = (slug) => {
        setSelectedProductSlug(slug);
        setScreen('product-details');
    };

    const openServiceDetails = (slug) => {
        setSelectedServiceSlug(slug);
        setScreen('service-details');
    };

    const navigateTo = (key) => {
        if (key === 'back-to-crm') {
            onBackToCrm();
            return;
        }
        setScreen(key);
        setIsSidebarOpen(false);
    };



    const handleLogout = async () => {
        try {
            await onLogout();
        } catch (err) {
            // Ignore error since UI should clear state anyway
        }
    };

    const visibleNavItems = navItems.filter(([key]) => {
        if (!isLoggedIn) {
            return key === 'landing' || key === 'login' || key === 'register';
        }
        if (key === 'login' || key === 'register') return false;
        if (key === 'product-details' || key === 'service-details') return false;
        if (key === 'profile' || key === 'change-password') return false;

        if (key === 'back-to-crm') return hasCrmAccess;

        const isAdminScreen = key === 'admin-dashboard' || catalogScreens.has(key);

        if (isJtsAdmin) {
            return isAdminScreen || key === 'landing';
        } else {
            return key === 'user-dashboard' || key === 'landing';
        }
    });

    const activeLabel = navItems.find(([key]) => key === screen)?.[1] || extraLabels[screen] || '';

    const isAuthScreen = screen === 'login' || screen === 'register' || screen === 'forgot' || screen === 'reset-password-confirm';

    if (!isLoggedIn && isAuthScreen) {
        return (
            <div className="auth-shell font-sans flex flex-col items-center justify-center min-h-screen bg-slate-950">
                <div className="w-full max-w-xl mx-auto p-4">
                    {screen === 'forgot' && <ForgotPassword onBackToLogin={() => setScreen('login')} />}
                    {screen === 'register' && (
                        <RegistrationPage 
                            onBackToLogin={handleBackToLogin} 
                            backLabel="Back to Login"
                            registrationContext={registrationContext}
                            reapplyEmail={reapplyEmail}
                        />
                    )}
                    {screen === 'reset-password-confirm' && (
                        <PasswordResetConfirm
                            uidb64={resetParams?.uid}
                            token={resetParams?.token}
                            onBackToLogin={() => setScreen('login')}
                        />
                    )}
                    {screen === 'login' && (
                        <div className="text-slate-400 text-center text-xs">Redirecting to login...</div>
                    )}

                    <div className="text-center mt-6">
                        <button
                            onClick={onBackToCrm}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 bg-slate-900/50 hover:bg-slate-900 hover:text-white transition cursor-pointer"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Return to CRM Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isAdminScreen = screen === 'admin-dashboard' || catalogScreens.has(screen);

    return (
        <div className="jts-portal-container flex min-h-screen w-full bg-[#f4f6fb]">
            <JtsSidebar
                navItems={visibleNavItems}
                activeScreen={screen}
                onNavigate={navigateTo}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div className="crm-main flex-1 flex flex-col">
                <JtsTopbar
                    onMenuClick={() => setIsSidebarOpen((current) => !current)}
                    pageLabel={activeLabel}
                    onLogout={handleLogout}
                    onNavigate={navigateTo}
                    searchValue={globalSearch}
                    onSearchChange={setGlobalSearch}
                    currentUser={currentUser}
                />

                <main className="crm-content flex-1 p-6">
                    {isAdminScreen && !isJtsAdmin ? (
                        <JtsAccessRestrictedScreen 
                            pageName={activeLabel} 
                            onGoBack={() => setScreen('landing')} 
                        />
                    ) : (
                        <>
                            {screen === 'landing' && (
                                <ProductLanding
                                    onViewProductDetails={openProductDetails}
                                    onViewServiceDetails={openServiceDetails}
                                />
                            )}
                            {screen === 'product-details' && (
                                <ProductDetails
                                    slug={selectedProductSlug}
                                    onBack={() => setScreen('landing')}
                                    onBuySubscription={(context) => {
                                        setRegistrationContext(context);
                                        setScreen('register');
                                    }}
                                />
                            )}
                            {screen === 'service-details' && (
                                <ServiceDetails
                                    slug={selectedServiceSlug}
                                    onBack={() => setScreen('landing')}
                                    onBuy={(context) => {
                                        setRegistrationContext(context);
                                        setScreen('register');
                                    }}
                                />
                            )}
                            {screen === 'register' && (
                                <RegistrationPage 
                                    onBackToLogin={handleBackToLogin} 
                                    backLabel="Back to Login"
                                    registrationContext={registrationContext}
                                    reapplyEmail={reapplyEmail}
                                />
                            )}
                            {screen === 'change-password' && <ChangePassword onComplete={() => setScreen('user-dashboard')} />}
                            {screen === 'user-dashboard' && (
                                <UserDashboard
                                    profile={jtsProfile}
                                    onTriggerPasswordChange={() => setScreen('change-password')}
                                    onOpenProfile={() => setScreen('profile')}
                                    onLogout={handleLogout}
                                    searchQuery={globalSearch}
                                    onLaunchCrm={onBackToCrm}
                                    hasCrmAccess={hasCrmAccess}
                                />
                            )}
                            {screen === 'profile' && (
                                <ProfilePage
                                    profile={jtsProfile}
                                    setCurrentUser={setCurrentUser}
                                    onBack={() => setScreen('user-dashboard')}
                                />
                            )}
                            {screen === 'admin-dashboard' && <AdminDashboard />}
                            {catalogScreens.has(screen) && (
                                <CatalogAdmin
                                    screen={screen === 'catalog-dashboard' ? 'admin-dashboard' : screen}
                                    onNavigate={(key) => navigateTo(key === 'admin-dashboard' ? 'catalog-dashboard' : key)}
                                />
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

function JtsAccessRestrictedScreen({ pageName, onGoBack }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="bg-red-50 text-red-600 p-5 rounded-full mb-5">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">
        Access Restricted
      </h2>
      <p className="text-slate-500 max-w-md mb-6 text-sm leading-relaxed">
        Your account role does not have permission to view the JTS <strong>{pageName || 'requested'}</strong> administration module. Please contact your platform administrator.
      </p>
      <button 
        type="button"
        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition cursor-pointer border-0" 
        onClick={onGoBack}
      >
        Return to Home
      </button>
    </div>
  );
}
