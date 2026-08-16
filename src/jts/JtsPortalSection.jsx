import React, { useState } from 'react';
import JtsSidebar from './JtsSidebar';
import JtsTopbar from './JtsTopbar';
import ForgotPassword from './ForgotPassword';
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

export default function JtsPortalSection({ onBackToCrm }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [screen, setScreen] = useState('login');
    const [selectedProductSlug, setSelectedProductSlug] = useState('sales-crm');
    const [selectedServiceSlug, setSelectedServiceSlug] = useState('crm-implementation');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
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

    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
        setScreen('landing');
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setScreen('login');
    };

    const activeLabel = navItems.find(([key]) => key === screen)?.[1] || extraLabels[screen] || '';

    if (!isLoggedIn) {
        return (
            <div className="auth-shell font-sans flex flex-col items-center justify-center min-h-screen bg-slate-950">
                <div className="w-full max-w-xl mx-auto p-4">
                    {screen === 'forgot' && <ForgotPassword onBackToLogin={() => setScreen('login')} />}
                    {screen === 'register' && (
                        <RegistrationPage onBackToLogin={() => setScreen('login')} />
                    )}
                    {screen !== 'forgot' && screen !== 'register' && (
                        <JtsLoginPage
                            onForgotPassword={() => setScreen('forgot')}
                            onGoRegister={() => setScreen('register')}
                            onLoginSuccess={handleLoginSuccess}
                        />
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

    return (
        <div className="jts-portal-container flex min-h-screen w-full bg-[#f4f6fb]">
            <JtsSidebar
                navItems={navItems}
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
                />

                <main className="crm-content flex-1 p-6">
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
                            onBuySubscription={() => setScreen('register')}
                        />
                    )}
                    {screen === 'service-details' && (
                        <ServiceDetails
                            slug={selectedServiceSlug}
                            onBack={() => setScreen('landing')}
                            onBuy={() => setScreen('register')}
                        />
                    )}
                    {screen === 'register' && (
                        <RegistrationPage onBackToLogin={() => setScreen('landing')} backLabel="Back to browsing" />
                    )}
                    {screen === 'change-password' && <ChangePassword onComplete={() => setScreen('user-dashboard')} />}
                    {screen === 'user-dashboard' && (
                        <UserDashboard
                            profile={userProfile}
                            onProfileLoad={setUserProfile}
                            onTriggerPasswordChange={() => setScreen('change-password')}
                            onOpenProfile={() => setScreen('profile')}
                            onLogout={handleLogout}
                            searchQuery={globalSearch}
                        />
                    )}
                    {screen === 'profile' && (
                        <ProfilePage
                            profile={userProfile}
                            onProfileUpdate={setUserProfile}
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
                </main>
            </div>
        </div>
    );
}
