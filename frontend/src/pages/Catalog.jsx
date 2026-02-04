import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';

const Catalog = () => {
    const sections = [
        { title: 'Labels', description: 'Manage record labels and subsidiaries.', link: '/catalog/labels' },
        { title: 'Publishers', description: 'Manage music publishers.', link: '/catalog/publishers' },
        { title: 'PROs', description: 'Manage Performance Rights Organizations.', link: '/catalog/pros' },
        { title: 'Artists', description: 'Manage artists, bands, and groups.', link: '/catalog/artists' },
        { title: 'Releases', description: 'Manage albums, EPs, and singles.', link: '/catalog/releases' },
        { title: 'Works', description: 'Manage musical compositions.', link: '/catalog/works' },
        { title: 'Tracks', description: 'Manage master recordings.', link: '/catalog/tracks' }
    ];

    return (
        <div className="catalog-page p-8">
            <PageHeader title="Catalog Management" subtitle="Manage your music catalog entities" />

            <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                {sections.map((section) => (
                    <Link to={section.link} key={section.title} style={{ textDecoration: 'none' }}>
                        <Card title={section.title} subtitle={section.description} className="h-full hover-lift transition-all" />
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Catalog;
