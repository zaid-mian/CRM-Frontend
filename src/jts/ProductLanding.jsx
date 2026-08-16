import React from 'react';
import { products, services } from '../data/jts/dummyData';

function ListingCard({ item, type, onViewDetails }) {
    return (
        <article className="jts-listing-card">
            <img src={item.image} alt={item.name} className="jts-listing-card-img" />
            <div className="jts-listing-card-body">
                <p className="jts-listing-card-type">{type}</p>
                <h3 className="jts-listing-card-title">{item.name}</h3>
                <p className="jts-listing-card-desc">{item.shortDescription}</p>
                <button
                    type="button"
                    onClick={() => onViewDetails(item.slug)}
                    className="jts-listing-card-btn"
                >
                    {type === 'Product' ? 'Configure & Pricing' : 'View Service'}
                </button>
            </div>
        </article>
    );
}

export default function ProductLanding({ onViewProductDetails, onViewServiceDetails }) {
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
                    <p>Dummy product cards prepared for later API integration.</p>
                </div>
                <div className="jts-products-grid">
                    {products.map((product) => (
                        <ListingCard key={product.id} item={product} type="Product" onViewDetails={onViewProductDetails} />
                    ))}
                </div>
            </section>

            <section>
                <div className="jts-section-head">
                    <h2>Services</h2>
                    <p>Service placeholders with pricing and detail navigation.</p>
                </div>
                <div className="jts-products-grid">
                    {services.map((service) => (
                        <ListingCard key={service.id} item={service} type="Service" onViewDetails={onViewServiceDetails} />
                    ))}
                </div>
            </section>
        </div>
    );
}
