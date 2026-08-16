import React from 'react';
import { services } from '../data/jts/dummyData';
import { PrimaryButton, SecondaryButton } from './ui';

export default function ServiceDetails({ slug = 'crm-implementation', onBack, onBuy }) {
    const service = services.find((item) => item.slug === slug) || services[0];

    return (
        <div className="jts-page jts-space-y">
            <div className="jts-back-row">
                <SecondaryButton onClick={onBack}>Back to Services</SecondaryButton>
            </div>

            <section className="jts-detail-hero">
                <img src={service.image} alt={service.name} className="jts-detail-hero-img" />
                <div className="jts-detail-hero-body">
                    <h3 className="jts-detail-hero-title">{service.name}</h3>
                    <p className="jts-detail-hero-desc">{service.description}</p>

                    <div style={{ display: 'grid', gap: 'var(--space-5)', gridTemplateColumns: '1fr 1fr' }}>
                        <div>
                            <p className="jts-tag-label">Features Included</p>
                            <ul className="jts-pricing-feature-list">
                                {service.featuresIncluded.map((feature) => (
                                    <li key={feature}>{feature}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="jts-service-info">
                            <p>Price: {service.currency} {service.price}</p>
                            <p>Billing Cycle: {service.billingCycle}</p>
                            <p>Discount: {service.discount}%</p>
                            <p className="jts-service-final-price">Final Price: {service.currency} {service.finalPrice}</p>
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--space-6)' }}>
                        <PrimaryButton onClick={onBuy}>Contact / Buy</PrimaryButton>
                    </div>
                </div>
            </section>
        </div>
    );
}
