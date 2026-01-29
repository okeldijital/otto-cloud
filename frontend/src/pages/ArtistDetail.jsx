import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { User, Disc, FileText, Music, Link as LinkIcon, Instagram, Twitter, DollarSign, Edit } from 'lucide-react';

const ArtistDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [artist, setArtist] = useState(null);
    const [releases, setReleases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchArtistData = async () => {
            setIsLoading(true);
            try {
                const [artistData, releasesData] = await Promise.all([
                    CatalogService.getById('artists', id),
                    CatalogService.getArtistReleases(id)
                ]);
                setArtist(artistData);
                setReleases(releasesData);
            } catch (error) {
                console.error('Failed to fetch artist details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchArtistData();
        }
    }, [id]);

    if (isLoading) return <div className="loading-spinner">Loading...</div>;
    if (!artist) return <div className="error-message">Artist not found</div>;

    const social = artist.social_media || {};
    const banking = artist.banking_details || {};
    const streaming = artist.streaming_links || {};

    return (
        <div className="artist-detail-page">
            {/* Header / Hero Section */}
            <div className="artist-header">
                <div className="artist-profile-image">
                    {artist.profile_image_url ? (
                        <img src={artist.profile_image_url} alt={artist.name} />
                    ) : (
                        <div className="artist-avatar-placeholder">
                            <User size={64} />
                        </div>
                    )}
                </div>
                <div className="artist-info-main">
                    <div className="artist-header-top">
                        <h1 className="artist-name">{artist.name}</h1>
                        <button className="btn-secondary btn-sm" onClick={() => navigate('/catalog/artists')}>
                            <Edit size={16} /> Edit Profile
                        </button>
                    </div>
                    {artist.aka && <p className="artist-aka">aka {artist.aka}</p>}

                    <div className="artist-meta-tags">
                        {artist.label_id && <span className="meta-tag">Label Artist</span>}
                        {artist.writer ? <span className="meta-tag">Songwriter</span> : null}
                    </div>

                    <div className="artist-socials">
                        {social.instagram && (
                            <a href={`https://instagram.com/${social.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" title="Instagram">
                                <Instagram size={20} />
                            </a>
                        )}
                        {social.twitter && (
                            <a href={`https://twitter.com/${social.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" title="Twitter">
                                <Twitter size={20} />
                            </a>
                        )}
                        {streaming.spotify && (
                            <a href={streaming.spotify} target="_blank" rel="noreferrer" title="Spotify">
                                <Music size={20} />
                            </a>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="artist-stats-grid">
                    <div className="stat-card">
                        <span className="stat-value">{releases.length}</span>
                        <span className="stat-label">Releases</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{/* TODO: Fetch works count */} -</span>
                        <span className="stat-label">Works</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{/* TODO: Fetch contracts count */} -</span>
                        <span className="stat-label">Contracts</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="detail-tabs">
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'discography' ? 'active' : ''}`}
                    onClick={() => setActiveTab('discography')}
                >
                    Discography
                </button>
                <button
                    className={`tab-btn ${activeTab === 'banking' ? 'active' : ''}`}
                    onClick={() => setActiveTab('banking')}
                >
                    Banking & Legal
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        <div className="info-section">
                            <h3>Contact Information</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Email</label>
                                    <p>{artist.contact_email || '-'}</p>
                                </div>
                                <div className="info-item">
                                    <label>Phone</label>
                                    <p>{artist.contact_phone || '-'}</p>
                                </div>
                                <div className="info-item full-width">
                                    <label>Physical Address</label>
                                    <p>{artist.physical_address || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="info-section">
                            <h3>Identifiers</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>IPI Number</label>
                                    <p>{artist.ipi_number || '-'}</p>
                                </div>
                                <div className="info-item">
                                    <label>Label</label>
                                    <p>{artist.label_id ? `Label #${artist.label_id}` : 'Independent'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'discography' && (
                    <div className="discography-tab">
                        <div className="section-header">
                            <h3>Releases</h3>
                            <button className="btn-primary btn-sm">+ Add Release</button>
                        </div>
                        {releases.length === 0 ? (
                            <div className="empty-state">No releases linked to this artist.</div>
                        ) : (
                            <div className="releases-grid">
                                {releases.map(release => (
                                    <div key={release.id} className="release-card-mini">
                                        <div className="release-cover">
                                            {release.cover_art_url ? (
                                                <img src={release.cover_art_url} alt={release.title} />
                                            ) : (
                                                <Disc size={32} />
                                            )}
                                        </div>
                                        <div className="release-mini-info">
                                            <h4>{release.title}</h4>
                                            <p>{release.release_date}</p>
                                            <span className="release-type-badge">{release.release_type}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'banking' && (
                    <div className="banking-tab">
                        <div className="info-section">
                            <h3><DollarSign size={18} /> Banking Details</h3>
                            {banking.bank_name ? (
                                <div className="banking-card">
                                    <div className="bank-row">
                                        <label>Bank Name:</label>
                                        <span>{banking.bank_name}</span>
                                    </div>
                                    <div className="bank-row">
                                        <label>Account Number:</label>
                                        <span className="blur-text">{banking.account_number ? '•••• •••• •••• ' + banking.account_number.slice(-4) : '-'}</span>
                                    </div>
                                    <div className="bank-row">
                                        <label>Branch Code:</label>
                                        <span>{banking.branch_code}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="empty-text">No banking details provided.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArtistDetail;
