import React, { useState, useEffect } from 'react';
import { PrimaryButton, SecondaryButton } from './ui';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function getCookie(name) {
    return document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`))
        ?.split('=')[1];
}

export default function ServiceDetails({ slug = 'crm-implementation', onBack, onBuy }) {
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);

    // Feedback form state
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const loadDetails = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/services/${slug}/`, {
                credentials: 'include'
            });
            const resData = await response.json();
            if (resData.success && resData.data) {
                setService(resData.data);
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
            const response = await fetch(`${API_BASE_URL}/api/services/${slug}/feedback/`, {
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
                // Refresh details
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
                <p className="text-sm font-semibold">Loading service details...</p>
            </div>
        );
    }

    if (error || !service) {
        return (
            <div className="max-w-xl mx-auto my-16 text-center text-red-500 bg-red-950/20 border border-red-900/50 rounded-xl p-4">
                <p className="text-sm font-semibold">{error || 'Service not found.'}</p>
                <div className="mt-4">
                    <SecondaryButton onClick={onBack}>Back to Services</SecondaryButton>
                </div>
            </div>
        );
    }

    return (
        <div className="jts-page jts-space-y">
            <div className="jts-back-row">
                <SecondaryButton onClick={onBack}>Back to Services</SecondaryButton>
            </div>

            <section className="jts-detail-hero">
                <img 
                    src={service.image || 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=300'} 
                    alt={service.name} 
                    className="jts-detail-hero-img" 
                    onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=300';
                    }}
                />
                <div className="jts-detail-hero-body">
                    <h3 className="jts-detail-hero-title">{service.name}</h3>
                    <p className="jts-detail-hero-desc">{service.full_description || service.short_description}</p>
                    


                    <div style={{ display: 'grid', gap: 'var(--space-5)', gridTemplateColumns: '1fr 1fr', marginTop: 'var(--space-6)' }}>
                        <div>
                            <p className="jts-tag-label">Features Included</p>
                            <ul className="jts-pricing-feature-list">
                                {service.features && service.features.map((feat) => (
                                    <li key={feat.id}>{feat.name}</li>
                                ))}
                                {(!service.features || !service.features.length) && (
                                    <li className="text-xs text-slate-500">No custom features mapped.</li>
                                )}
                            </ul>
                        </div>
                        
                        <div className="jts-service-info">
                            {service.pricing_plans && service.pricing_plans.map((plan) => {
                                const discountVal = plan.active_discount ? parseFloat(plan.active_discount.value) : 0;
                                return (
                                    <div key={plan.id} className="border-b border-slate-800/50 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
                                        <p className="font-bold text-sm text-slate-200">{plan.name}</p>
                                        <p>Base Price: {plan.currency} {plan.price}</p>
                                        <p>Billing Cycle: {plan.billing_cycle}</p>
                                        {discountVal > 0 && (
                                            <p className="text-emerald-400">Discount: {discountVal}%</p>
                                        )}
                                        <p className="jts-service-final-price">Final Price: {plan.currency} {plan.final_price}</p>
                                    </div>
                                );
                            })}
                            {(!service.pricing_plans || !service.pricing_plans.length) && (
                                <p className="text-xs text-slate-500">No pricing plans configured.</p>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--space-6)' }}>
                        <PrimaryButton onClick={() => onBuy({
                            type: 'service',
                            serviceSlug: service.slug,
                            serviceName: service.name,
                            planId: service.pricing_plans?.[0]?.id,
                            planName: service.pricing_plans?.[0]?.name
                        })}>Contact / Buy</PrimaryButton>
                    </div>
                </div>
            </section>


        </div>
    );
}
