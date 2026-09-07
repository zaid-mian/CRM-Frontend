import React, { useState, useEffect } from 'react';
import { PrimaryButton, SecondaryButton } from './ui';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function getCookie(name) {
    return document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`))
        ?.split('=')[1];
}

export default function ProductDetails({ slug = 'sales-crm', onBack, onBuySubscription }) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);

    // Feedback form state
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const loadDetails = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${slug}/`, {
                credentials: 'include'
            });
            const resData = await response.json();
            if (resData.success && resData.data) {
                setProduct(resData.data);
            } else {
                setError(resData.message || 'Failed to load details.');
            }
        } catch (err) {
            setError('Network error loading specifications.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDetails();
    }, [slug]);

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setSubmitLoading(true);

        const csrfToken = getCookie('csrftoken');
        const payload = {
            rating: parseInt(rating, 10),
            comment: comment.trim()
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${slug}/feedback/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {})
                },
                body: JSON.stringify(payload)
            });

            const resData = await response.json();

            if (!response.ok || resData.success === false) {
                setSubmitError(resData.message || 'Failed to submit review.');
            } else {
                setComment('');
                setRating(5);
                // Refresh product details
                await loadDetails();
            }
        } catch (err) {
            setSubmitError('Network error submitting feedback.');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-xl mx-auto my-16 text-center text-slate-400">
                <p className="text-sm font-semibold">Loading product specifications...</p>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="max-w-xl mx-auto my-16 text-center text-red-500 bg-red-950/20 border border-red-900/50 rounded-xl p-4">
                <p className="text-sm font-semibold">{error || 'Product not found.'}</p>
                <div className="mt-4">
                    <SecondaryButton onClick={onBack}>Back to Products</SecondaryButton>
                </div>
            </div>
        );
    }

    return (
        <div className="jts-page jts-space-y">
            <div className="jts-back-row">
                <SecondaryButton onClick={onBack}>Back to Products</SecondaryButton>
            </div>

            <section className="jts-detail-hero">
                <img 
                    src={product.image || 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=300'} 
                    alt={product.name} 
                    className="jts-detail-hero-img" 
                    onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=300';
                    }}
                />
                <div className="jts-detail-hero-body">
                    <h3 className="jts-detail-hero-title">{product.name}</h3>
                    <p className="jts-detail-hero-desc">{product.description}</p>
                    


                    <p className="jts-tag-label mt-4">Modules Included</p>
                    <div className="jts-tag-list">
                        {product.modules && product.modules.map((module) => (
                            <span key={module.id} className="jts-tag">{module.name}</span>
                        ))}
                        {(!product.modules || !product.modules.length) && (
                            <span className="text-xs text-slate-500">No modules mapped.</span>
                        )}
                    </div>
                </div>
            </section>

            <section className="jts-pricing-grid">
                {product.pricing_plans && product.pricing_plans.map((plan) => {
                    const discountVal = plan.active_discount ? parseFloat(plan.active_discount.value) : 0;
                    return (
                        <div key={plan.id} className="jts-pricing-card">
                            <div className="jts-pricing-card-head">
                                <div>
                                    <h4 className="jts-pricing-card-name">{plan.name}</h4>
                                    <p className="jts-pricing-card-meta">Billing: {plan.billing_cycle}</p>
                                    <p className="jts-pricing-card-meta">Currency: {plan.currency}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p className="jts-pricing-card-meta">Base Price: {plan.price}</p>
                                    {discountVal > 0 && (
                                        <p className="jts-pricing-card-meta text-emerald-400">Discount: {discountVal}%</p>
                                    )}
                                    <p className="jts-pricing-card-final">Final: {plan.final_price}</p>
                                </div>
                            </div>

                            <div className="jts-pricing-card-cta" style={{ marginTop: 'var(--space-6)' }}>
                                <PrimaryButton onClick={() => onBuySubscription({
                                    type: 'product',
                                    productSlug: product.slug,
                                    productName: product.name,
                                    planId: plan.id,
                                    planName: plan.name
                                })}>Select Plan/Continue Registration</PrimaryButton>
                            </div>
                        </div>
                    );
                })}
                {(!product.pricing_plans || !product.pricing_plans.length) && (
                    <div className="col-span-full text-center text-slate-500 py-8">
                        No pricing plans configured.
                    </div>
                )}
            </section>


        </div>
    );
}
