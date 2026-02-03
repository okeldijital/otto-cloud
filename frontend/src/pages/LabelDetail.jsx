import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { BASE_URL } from '../lib/api';
import {
    ChevronLeft,
    Globe,
    Mail,
    Phone,
    MapPin,
    User,
    Disc,
    Music,
    Building2,
    Users
} from 'lucide-react';

const LabelDetail = () => {
    const { id } = useParams();
    const [label, setLabel] = useState(null);
    const [artists, setArtists] = useState([]);
    const [releases, setReleases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchLabelData = async () => {
            setIsLoading(true);
            try {
                const [labelData, artistsData, releasesData] = await Promise.all([
                    CatalogService.getById('labels', id),
                    CatalogService.getLabelArtists(id),
                    CatalogService.getLabelReleases(id)
                ]);
                setLabel(labelData);
                setArtists(artistsData);
                setReleases(releasesData);
            } catch (error) {
                console.error('Failed to fetch label details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchLabelData();
        }
    }, [id]);

    if (isLoading) return <div className="loading-spinner">Loading Label Details...</div>;
    if (!label) return <div className="error-message">Label not found</div>;

    const logoUrl = label.logo_url ? (label.logo_url.startsWith('http') ? label.logo_url : `${BASE_URL}${label.logo_url}`) : null;

    return (
        <div className="entity-page">
            <Link to="/catalog/labels" className="back-link">
                <ChevronLeft size={16} /> Back to Labels
            </Link>

            <div className="label-detail-header" style={{ display: 'flex', gap: '2.5rem', marginBottom: '3rem', background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="label-logo-large" style={{ width: '180px', height: '180px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#f8fafc' }}>
                    {logoUrl ? (
                        <img src={logoUrl} alt={label.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <Building2 size={64} />
                        </div>
                    )}
                </div>

                <div className="label-info-hero" style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary-color)' }}>{label.name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label.label_id}</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontSize: '0.875rem' }}>Record Label</span>
                    </div>

                    <div className="label-quick-contact" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {label.contact_person && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.925rem', color: 'var(--text-color)' }}>
                                <User size={18} className="text-muted" />
                                <span>{label.contact_person}</span>
                            </div>
                        )}
                        {label.contact_email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.925rem', color: 'var(--text-color)' }}>
                                <Mail size={18} className="text-muted" />
                                <span>{label.contact_email}</span>
                            </div>
                        )}
                        {label.website && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.925rem', color: 'var(--text-color)' }}>
                                <Globe size={18} className="text-muted" />
                                <a href={label.website.startsWith('http') ? label.website : `https://${label.website}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{label.website}</a>
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
                    Artists ({artists.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'discography' ? 'active' : ''}`}
                    onClick={() => setActiveTab('discography')}
                >
                    Discography ({releases.length})
                </button>
            </div>

            <div className="tab-content" style={{ marginTop: '2rem' }}>
                {activeTab === 'overview' && (
                    <div className="info-section-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                        <div className="info-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Building2 size={18} /> Company Information
                            </h3>
                            <div className="info-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div className="info-item">
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Address</label>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <MapPin size={16} style={{ marginTop: '2px', color: '#94a3b8' }} />
                                        <p style={{ margin: 0 }}>{label.address || 'No address provided'}</p>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Phone</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Phone size={16} style={{ color: '#94a3b8' }} />
                                        <p style={{ margin: 0 }}>{label.contact_phone || 'No phone provided'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="stats-preview-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0' }}>Catalog Summary</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{artists.length}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Active Artists</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{releases.length}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Releases</div>
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
                                <p>No artists are currently linked to this label.</p>
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

                {activeTab === 'discography' && (
                    <div className="releases-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '2rem' }}>
                        {releases.length === 0 ? (
                            <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                                <Disc size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p>No releases found for this label.</p>
                            </div>
                        ) : (
                            releases.map(release => (
                                <Link
                                    key={release.id}
                                    to={`/catalog/releases/${release.id}`}
                                    className="release-card-link"
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div className="release-card-modern" style={{ transition: 'transform 0.2s' }}>
                                        <div className="release-cover" style={{ width: '100%', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', background: '#f1f5f9', marginBottom: '1rem' }}>
                                            {release.cover_art_url ? (
                                                <img src={release.cover_art_url.startsWith('http') ? release.cover_art_url : `${BASE_URL}${release.cover_art_url}`} alt={release.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                                    <Disc size={48} />
                                                </div>
                                            )}
                                        </div>
                                        <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{release.title}</h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{release.release_date || 'TBA'}</span>
                                            <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>{release.release_type}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabelDetail;
