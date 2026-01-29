import React from 'react';
import { Link } from 'react-router-dom';

const Catalog = () => {
    const sections = [
        {
            title: 'Labels',
            description: 'Manage record labels and subsidiaries.',
            link: '/catalog/labels'
        },
        {
            title: 'Publishers',
            description: 'Manage music publishers.',
            link: '/catalog/publishers'
        },
        {
            title: 'PROs',
            description: 'Manage Performance Rights Organizations.',
            link: '/catalog/pros'
        },
        {
            title: 'Artists',
            description: 'Manage artists, bands, and groups.',
            link: '/catalog/artists'
        },
        {
            title: 'Releases',
            description: 'Manage albums, EPs, and singles.',
            link: '/catalog/releases'
        },
        {
            title: 'Works',
            description: 'Manage musical compositions.',
            link: '/catalog/works'
        },
        {
            title: 'Tracks',
            description: 'Manage master recordings.',
            link: '/catalog/tracks'
        }
    ];

    return (
        <div className="catalog-page">
            <div className="page-header">
                <h1 className="page-title">Catalog Management</h1>
            </div>

            <div className="catalog-grid">
                {sections.map((section) => (
                    <Link to={section.link} key={section.title} className="catalog-card">
                        <h3>{section.title}</h3>
                        <p>{section.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Catalog;
