import React, { useState, useEffect } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function ListingCard({ item, type, onViewDetails }) {
    const description = item.short_description || item.description || '';
    return (
        <article className="jts-listing-card">
            <img 
                src={item.image || 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=300'} 
                alt={item.name} 
                className="jts-listing-card-img" 
                onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=300';
                }}
            />
            <div className="jts-listing-card-body">
                <p className="jts-listing-card-type">{type}</p>
                <h3 className="jts-listing-card-title">{item.name}</h3>
                <p className="jts-listing-card-desc">{description}</p>
                <button
                    type="button"
                    onClick={() => onViewDetails(item.slug)}
                    className="jts-listing-card-btn cursor-pointer"
                >
                    {type === 'Product' ? 'Configure & Pricing' : 'View Service'}
                </button>
            </div>
        </article>
    );
}

export default function ProductLanding({ onViewProductDetails, onViewServiceDetails }) {
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;
        async function fetchCatalog() {
            try {
                const [prodRes, servRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/products/`),
                    fetch(`${API_BASE_URL}/api/services/`)
                ]);
                
                const prodData = await prodRes.json();
                const servData = await servRes.json();

                if (!isMounted) return;

                if (prodData.success && servData.success) {
                    setProducts(prodData.data || []);
                    setServices(servData.data || []);
                } else {
                    setError('Failed to retrieve catalog listings.');
                }
            } catch (err) {
                if (isMounted) {
                    setError('Network error loading catalog.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }
        fetchCatalog();
        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="max-w-xl mx-auto my-16 text-center text-slate-400">
                <p className="text-sm font-semibold">Loading catalog items...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto my-16 text-center text-red-500 bg-red-950/20 border border-red-900/50 rounded-xl p-4">
                <p className="text-sm font-semibold">{error}</p>
            </div>
        );
    }

    return (
        <div className="jts-page jts-space-y">
            <section className="jts-landing-hero">
                <h1 className="jts-landing-title">
                    <span>Scale Your Operations with </span>
                    <span>CRMPORTAL</span>
                </h1>
                <p className="jts-landing-subtitle">
                    Choose a tailored software system below to discover pricing tiers,
                    modules, and setup workflows.
                </p>
            </section>

            <section>
                <div className="jts-section-head">
                    <h2>Products</h2>
                    <p>Standardized SaaS modules available for subscription.</p>
                </div>
                <div className="jts-products-grid">
                    {products.map((product) => (
                        <ListingCard key={product.id} item={product} type="Product" onViewDetails={onViewProductDetails} />
                    ))}
                    {!products.length && (
                        <p className="text-xs text-slate-500 py-4">No active products available.</p>
                    )}
                </div>
            </section>

            <section>
                <div className="jts-section-head">
                    <h2>Services</h2>
                    <p>Professional onboarding consulting and configuration services.</p>
                </div>
                <div className="jts-products-grid">
                    {services.map((service) => (
                        <ListingCard key={service.id} item={service} type="Service" onViewDetails={onViewServiceDetails} />
                    ))}
                    {!services.length && (
                        <p className="text-xs text-slate-500 py-4">No active services available.</p>
                    )}
                </div>
            </section>
        </div>
    );
}
