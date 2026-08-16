import React from 'react';
import { products } from '../data/jts/dummyData';
import { PrimaryButton, SecondaryButton } from './ui';

export default function ProductDetails({ slug = 'sales-crm', onBack, onBuySubscription }) {
    const product = products.find((item) => item.slug === slug) || products[0];

    return (
        <div className="jts-page jts-space-y">
            <div className="jts-back-row">
                <SecondaryButton onClick={onBack}>Back to Products</SecondaryButton>
            </div>

            <section className="jts-detail-hero">
                <img src={product.image} alt={product.name} className="jts-detail-hero-img" />
                <div className="jts-detail-hero-body">
                    <h3 className="jts-detail-hero-title">{product.name}</h3>
                    <p className="jts-detail-hero-desc">{product.description}</p>
                    <p className="jts-tag-label">Modules</p>
                    <div className="jts-tag-list">
                        {product.modules.map((module) => (
                            <span key={module} className="jts-tag">{module}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="jts-pricing-grid">
                {product.pricingPlans.map((plan) => (
                    <div key={plan.name} className="jts-pricing-card">
                        <div className="jts-pricing-card-head">
                            <div>
                                <h4 className="jts-pricing-card-name">{plan.name}</h4>
                                <p className="jts-pricing-card-meta">Billing Cycle: {plan.billingCycle}</p>
                                <p className="jts-pricing-card-meta">Currency: {plan.currency}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p className="jts-pricing-card-meta">Base Price: {plan.price}</p>
                                <p className="jts-pricing-card-meta">Discount: {plan.discount}%</p>
                                <p className="jts-pricing-card-final">Final: {plan.finalPrice}</p>
                            </div>
                        </div>

                        <div className="jts-pricing-card-features-grid">
                            <div>
                                <p className="jts-pricing-section-label">Features</p>
                                <ul className="jts-pricing-feature-list">
                                    {plan.features.map((feature) => (
                                        <li key={feature}>{feature}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="jts-pricing-section-label">Usage Limits</p>
                                <ul className="jts-pricing-feature-list">
                                    {plan.usageLimits.map((limit) => (
                                        <li key={limit}>{limit}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="jts-pricing-card-cta">
                            <PrimaryButton onClick={onBuySubscription}>Buy Subscription</PrimaryButton>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}
