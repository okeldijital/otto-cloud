import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { BASE_URL } from '../lib/api';
import {
    ChevronLeft,
    Mail,
    Phone,
    MapPin,
    User,
    Music2,
    Landmark,
    Users,
    Music
} from 'lucide-react';

const PublisherDetail = () => {
    const { id } = useParams();
    const [publisher, setPublisher] = useState(null);
    const [artists, setArtists] = useState([]);
    const [works, setWorks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchPublisherData = async () => {
            setIsLoading(true);
            try {
                const [publisherData, artistsData, worksData] = await Promise.all([
                    CatalogService.getById('publishers', id),
                    CatalogService.getPublisherArtists(id),
                    CatalogService.getPublisherWorks(id)
                ]);
                setPublisher(publisherData);
                setArtists(artistsData);
                setWorks(worksData);
            } catch (error) {
                console.error('Failed to fetch publisher details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchPublisherData();
        }
    }, [id]);

    if (isLoading) return <div className="loading-spinner">Loading Publisher Details...</div>;
    if (!publisher) return <div className="error-message">Publisher not found</div>;

    return (
        <div className="entity-page">
            <Link to="/catalog/publishers" className="back-link">
                <ChevronLeft size={16} /> Back to Publishers
            </Link>

            <div className="label-detail-header" style={{ display: 'flex', gap: '2.5rem', marginBottom: '3rem', background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="label-logo-large" style={{ width: '120px', height: '120px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                    <Landmark size={64} />
                </div>

                <div className="label-info-hero" style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary-color)' }}>{publisher.name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{publisher.publisher_id}</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontSize: '0.875rem' }}>Music Publisher</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontSize: '0.875rem', padding: '2px 8px', background: '#ecfdf5', color: '#059669', borderRadius: '4px' }}>{publisher.rights_type}</span>
                    </div>

                    <div className="label-quick-contact" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {publisher.contact_person && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.925rem', color: 'var(--text-color)' }}>
                                <User size={18} className="text-muted" />
                                <span>{publisher.contact_person}</span>
                            </div>
                        )}
                        {publisher.contact_email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.925rem', color: 'var(--text-color)' }}>
                                <Mail size={18} className="text-muted" />
                                <span>{publisher.contact_email}</span>
                            </div>
                        )}
                        {publisher.contact_phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.925rem', color: 'var(--text-color)' }}>
                                <Phone size={18} className="text-muted" />
                                <span>{publisher.contact_phone}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="detail-tabs">
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'artists' ? 'active' : ''}`}
                    onClick={() => setActiveTab('artists')}
                >
                    Linked Artists ({artists.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'works' ? 'active' : ''}`}
                    onClick={() => setActiveTab('works')}
                >
                    Musical Works ({works.length})
                </button>
            </div>

            <div className="tab-content" style={{ marginTop: '2rem' }}>
                {activeTab === 'overview' && (
                    <div className="info-section-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                        <div className="info-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MapPin size={18} /> Physical Address
                            </h3>
                            <p style={{ margin: 0, color: 'var(--text-color)', lineHeight: 1.6 }}>
                                {publisher.address || 'No address provided'}
                            </p>
                        </div>

                        <div className="stats-preview-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0' }}>Rights Administration</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{artists.length}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Writers/Artists</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{works.length}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Total Works</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'artists' && (
                    <div className="artists-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {artists.length === 0 ? (
                            <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                                <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p>No artists are currently linked to this publisher.</p>
                            </div>
                        ) : (
                            artists.map(artist => (
                                <Link
                                    key={artist.id}
                                    to={`/catalog/artists/${artist.id}`}
                                    className="artist-card-link"
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div className="artist-card-mini" style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}>
                                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                                            {artist.profile_image_url ? (
                                                <img src={artist.profile_image_url.startsWith('http') ? artist.profile_image_url : `${BASE_URL}${artist.profile_image_url}`} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={24} color="#94a3b8" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontWeight: 700 }}>{artist.name}</h4>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>{artist.aka || 'Artist'}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'works' && (
                    <div className="works-list" style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        {works.length === 0 ? (
                            <div className="empty-state" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                <Music2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p>No musical works found for this publisher.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Work Title</th>
                                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>ISWC</th>
                                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {works.map(work => (
                                        <tr key={work.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ padding: '6px', background: '#ecfdf5', borderRadius: '6px', color: '#059669' }}>
                                                        <Music size={14} />
                                                    </div>
                                                    <span style={{ fontWeight: 600 }}>{work.title}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b', fontFamily: 'monospace' }}>
                                                {work.iswc_code || '-'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                <Link to={`/catalog/works`} className="btn-secondary btn-sm" style={{ padding: '4px 12px' }}>View</Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublisherDetail;
