import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { DocumentsService } from '../services/operations';
import { ReportsService } from '../services/reports';
import { BASE_URL } from '../lib/api';
import { User, Disc, FileText, Music, Link as LinkIcon, Instagram, Twitter, DollarSign, Edit, Camera, ChevronLeft } from 'lucide-react';
import EntityForm from '../components/EntityForm';

const API_URL = BASE_URL;

const ArtistDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [artist, setArtist] = useState(null);
    const [releases, setReleases] = useState([]);
    const [works, setWorks] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [labels, setLabels] = useState([]);
    const [publishers, setPublishers] = useState([]);
    const [pros, setPros] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        aka: '',
        nationality: '',
        id_number: '',
        profile_image_url: '',
        contact_email: '',
        contact_phone: '',
        physical_address: '',
        ipi_number: '',
        label_id: '',
        publisher_id: '',
        pro_id: '',
        instagram: '',
        twitter: '',
        bank_name: '',
        account_number: '',
        branch_code: '',
        spotify_url: '',
        apple_music_url: '',
        youtube_url: ''
    });

    useEffect(() => {
        const fetchArtistData = async () => {
            setIsLoading(true);
            try {
                const [artistData, releasesData, worksData, contractsData, labelsData, publishersData, prosData] = await Promise.all([
                    CatalogService.getById('artists', id),
                    CatalogService.getArtistReleases(id),
                    CatalogService.getArtistWorks(id),
                    CatalogService.getArtistContracts(id),
                    CatalogService.getAll('labels'),
                    CatalogService.getAll('publishers'),
                    CatalogService.getAll('pros')
                ]);
                setArtist(artistData);
                setReleases(releasesData);
                setWorks(worksData);
                setContracts(contractsData);
                setLabels(labelsData);
                setPublishers(publishersData);
                setPros(prosData);
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

    const handleEditClick = () => {
        if (!artist) return;

        setSelectedImage(null);
        setImagePreview(artist.profile_image_url ? (artist.profile_image_url.startsWith('http') ? artist.profile_image_url : `${API_URL}${artist.profile_image_url}`) : null);

        const social = artist.social_media || {};
        const banking = artist.banking_details || {};
        const streaming = artist.streaming_links || {};

        setFormData({
            name: artist.name,
            aka: artist.aka || '',
            nationality: artist.nationality || '',
            id_number: artist.id_number || '',
            profile_image_url: artist.profile_image_url || '',
            contact_email: artist.contact_email || '',
            contact_phone: artist.contact_phone || '',
            physical_address: artist.physical_address || '',
            ipi_number: artist.ipi_number || '',
            label_id: artist.label_id || '',
            publisher_id: artist.publisher_id || '',
            pro_id: artist.pro_id || '',
            instagram: social.instagram || '',
            twitter: social.twitter || '',
            bank_name: banking.bank_name || '',
            account_number: banking.account_number || '',
            branch_code: banking.branch_code || '',
            spotify_url: streaming.spotify || '',
            apple_music_url: streaming.apple_music || '',
            youtube_url: streaming.youtube || ''
        });
        setIsEditModalOpen(true);
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let profileImageUrl = formData.profile_image_url;

            if (selectedImage) {
                try {
                    const uploaded = await DocumentsService.upload(selectedImage);
                    profileImageUrl = uploaded.file_path;
                } catch (err) {
                    console.error('Failed to upload image:', err);
                    alert('Failed to upload image');
                    return;
                }
            }

            const submissionData = {
                name: formData.name,
                aka: formData.aka,
                nationality: formData.nationality,
                id_number: formData.id_number,
                profile_image_url: profileImageUrl,
                contact_email: formData.contact_email,
                contact_phone: formData.contact_phone,
                physical_address: formData.physical_address,
                ipi_number: formData.ipi_number,
                label_id: formData.label_id || null,
                publisher_id: formData.publisher_id || null,
                pro_id: formData.pro_id || null,
                social_media: {
                    instagram: formData.instagram,
                    twitter: formData.twitter
                },
                banking_details: {
                    bank_name: formData.bank_name,
                    account_number: formData.account_number,
                    branch_code: formData.branch_code
                },
                streaming_links: {
                    spotify: formData.spotify_url,
                    apple_music: formData.apple_music_url,
                    youtube: formData.youtube_url
                }
            };

            const updatedArtist = await CatalogService.update('artists', artist.id, submissionData);
            setArtist(updatedArtist);
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Failed to update artist:', error);
            alert('Failed to update artist');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="loading-spinner">Loading...</div>;
    if (!artist) return <div className="error-message">Artist not found</div>;

    const social = artist.social_media || {};
    const banking = artist.banking_details || {};
    const streaming = artist.streaming_links || {};

    return (
        <div className="artist-detail-page">
            <Link to="/catalog/artists" className="back-link">
                <ChevronLeft size={16} /> Back to Artists
            </Link>
            {/* Header / Hero Section */}
            <div className="artist-header">
                <div className="artist-profile-image">
                    {artist.profile_image_url ? (
                        <img src={artist.profile_image_url.startsWith('http') ? artist.profile_image_url : `${BASE_URL}${artist.profile_image_url}`} alt={artist.name} />
                    ) : (
                        <div className="artist-avatar-placeholder">
                            <User size={64} />
                        </div>
                    )}
                </div>
                <div className="artist-info-main">
                    <div className="artist-header-top">
                        <h1 className="artist-name">{artist.name}</h1>
                        <button className="btn-secondary btn-sm" onClick={handleEditClick}>
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
                        <span className="stat-value">{works.length}</span>
                        <span className="stat-label">Works</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{contracts.length}</span>
                        <span className="stat-label">Contracts</span>
                    </div>
                </div>
            </div>

            <div className="artist-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
                <div className="main-content-column">
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
                            className={`tab-btn ${activeTab === 'works' ? 'active' : ''}`}
                            onClick={() => setActiveTab('works')}
                        >
                            Works
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'contracts' ? 'active' : ''}`}
                            onClick={() => setActiveTab('contracts')}
                        >
                            Contracts
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'banking' ? 'active' : ''}`}
                            onClick={() => setActiveTab('banking')}
                        >
                            Banking
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
                                            <label>National ID</label>
                                            <p>{artist.id_number || '-'}</p>
                                        </div>
                                        <div className="info-item">
                                            <label>Nationality</label>
                                            <p>{artist.nationality || '-'}</p>
                                        </div>
                                        <div className="info-item">
                                            <label>Label</label>
                                            <p>{artist.label_id ? labels.find(l => l.id === artist.label_id)?.name || `Label #${artist.label_id}` : 'Independent'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'discography' && (
                            <div className="discography-tab">
                                <div className="section-header">
                                    <h3>Releases</h3>
                                    <button className="btn-primary btn-sm" onClick={() => navigate(`/catalog/releases?action=new&artist_id=${artist.id}`)}>+ Add Release</button>
                                </div>
                                {releases.length === 0 ? (
                                    <div className="empty-state">No releases linked to this artist.</div>
                                ) : (
                                    <div className="releases-grid">
                                        {releases.map(release => (
                                            <Link key={release.id} to={`/catalog/releases/${release.id}`} className="release-card-mini" style={{ textDecoration: 'none', color: 'inherit' }}>
                                                <div className="release-cover">
                                                    {release.cover_art_url ? (
                                                        <img src={release.cover_art_url.startsWith('http') ? release.cover_art_url : `${BASE_URL}${release.cover_art_url}`} alt={release.title} />
                                                    ) : (
                                                        <Disc size={32} />
                                                    )}
                                                </div>
                                                <div className="release-mini-info">
                                                    <h4>{release.title}</h4>
                                                    <p>{release.release_date}</p>
                                                    <span className="release-type-badge">{release.release_type}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'works' && (
                            <div className="works-tab">
                                <div className="section-header">
                                    <h3>Musical Works</h3>
                                    <button className="btn-primary btn-sm" onClick={() => navigate('/catalog/works')}>+ New Work</button>
                                </div>
                                {works.length === 0 ? (
                                    <div className="empty-state">No musical works found for this artist.</div>
                                ) : (
                                    <div className="entity-list">
                                        {works.map(work => (
                                            <div key={work.id} className="entity-card-mini" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '0.75rem', background: 'white' }}>
                                                <div className="entity-icon" style={{ background: '#ecfdf5', color: '#059669', padding: '10px', borderRadius: '8px' }}>
                                                    <Music size={20} />
                                                </div>
                                                <div className="entity-details" style={{ flex: 1 }}>
                                                    <h4 style={{ margin: 0 }}>{work.title}</h4>
                                                    <p style={{ margin: '4px 0', fontSize: '0.8125rem', color: '#64748b' }}>ISWC: {work.iswc_code || 'N/A'}</p>
                                                </div>
                                                <Link to="/catalog/works" className="btn-secondary btn-sm" style={{ textDecoration: 'none' }}>View All</Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'contracts' && (
                            <div className="contracts-tab animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="section-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Linked Contracts</h3>
                                    <button className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-indigo-100" onClick={() => navigate('/contracts')}>+ New Agreement</button>
                                </div>
                                {contracts.length === 0 ? (
                                    <div className="empty-state py-12 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                        <p className="text-slate-400 font-bold italic">No active agreements found for this artist.</p>
                                    </div>
                                ) : (
                                    <div className="entity-list grid grid-cols-1 gap-3">
                                        {contracts.map(contract => (
                                            <Link key={contract.id} to={`/contracts/${contract.id}`} className="entity-card-mini group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '12px', background: 'white', textDecoration: 'none', color: 'inherit', transition: 'all 0.2s' }}>
                                                <div className="entity-icon" style={{ background: '#e0e7ff', color: '#4f46e5', padding: '10px', borderRadius: '10px' }}>
                                                    <FileText size={20} />
                                                </div>
                                                <div className="entity-details" style={{ flex: 1 }}>
                                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }} className="group-hover:text-indigo-600 transition-colors">{contract.title || `Contract #${contract.id}`}</h4>
                                                    <p style={{ margin: '4px 0', fontSize: '0.75rem', color: '#64748b' }} className="font-mono">
                                                        {contract.contract_number} • <span style={{ color: contract.status === 'Active' ? '#059669' : '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>{contract.status}</span>
                                                    </p>
                                                </div>
                                                <div className="text-indigo-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">View Details →</div>
                                            </Link>
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
                                        <div className="banking-card" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                            <div className="bank-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                <label style={{ fontWeight: 600, color: '#64748b' }}>Bank Name:</label>
                                                <span style={{ fontWeight: 600 }}>{banking.bank_name}</span>
                                            </div>
                                            <div className="bank-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                <label style={{ fontWeight: 600, color: '#64748b' }}>Account Number:</label>
                                                <span className="blur-text">{banking.account_number ? '•••• •••• •••• ' + banking.account_number.slice(-4) : '-'}</span>
                                            </div>
                                            <div className="bank-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <label style={{ fontWeight: 600, color: '#64748b' }}>Branch Code:</label>
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

                {/* Sidebar: Quick Actions */}
                <div className="artist-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="quick-actions-sidebar" style={{ background: 'var(--primary-color)', borderRadius: '16px', padding: '1.5rem', color: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800 }}>Quick Actions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                className="btn-secondary btn-sm"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer' }}
                                onClick={() => window.print()}
                            >
                                Generate One-Sheet
                            </button>
                            <button
                                className="btn-secondary btn-sm"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer' }}
                                onClick={() => ReportsService.exportSingle('artist', id, 'excel')}
                            >
                                Export Profile (Excel)
                            </button>
                            <button
                                className="btn-secondary btn-sm"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer' }}
                                onClick={() => ReportsService.exportSingle('artist', id, 'csv')}
                            >
                                Export Profile (CSV)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <EntityForm
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Artist Profile"
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
            >
                <h3 className="form-section-title">Basic Information</h3>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={32} color="#94a3b8" />
                        )}
                    </div>
                    <div>
                        <label htmlFor="edit-image-upload" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Camera size={16} /> Upload Photo
                        </label>
                        <input
                            type="file"
                            id="edit-image-upload"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="name">Artist Name</label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="aka">AKA (Stage Name)</label>
                        <input
                            type="text"
                            id="aka"
                            value={formData.aka}
                            onChange={(e) => setFormData({ ...formData, aka: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="id_number">ID Number</label>
                        <input
                            type="text"
                            id="id_number"
                            value={formData.id_number}
                            onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                            placeholder="National ID / Passport Number"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="nationality">Nationality</label>
                        <input
                            type="text"
                            id="nationality"
                            value={formData.nationality}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                            placeholder="e.g. South African"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="contact_email">Email</label>
                        <input
                            type="email"
                            id="contact_email"
                            value={formData.contact_email}
                            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="contact_phone">Phone</label>
                        <input
                            type="text"
                            id="contact_phone"
                            value={formData.contact_phone}
                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="physical_address">Physical Address</label>
                    <textarea
                        id="physical_address"
                        value={formData.physical_address}
                        onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                        rows={2}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="ipi_number">IPI Number</label>
                    <input
                        type="text"
                        id="ipi_number"
                        value={formData.ipi_number}
                        onChange={(e) => setFormData({ ...formData, ipi_number: e.target.value })}
                    />
                </div>

                <h3 className="form-section-title">Relationships</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="label_id">Label</label>
                        <select
                            id="label_id"
                            value={formData.label_id}
                            onChange={(e) => setFormData({ ...formData, label_id: e.target.value })}
                        >
                            <option value="">Select Label...</option>
                            {labels.map(label => (
                                <option key={label.id} value={label.id}>{label.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="publisher_id">Publisher</label>
                        <select
                            id="publisher_id"
                            value={formData.publisher_id}
                            onChange={(e) => setFormData({ ...formData, publisher_id: e.target.value })}
                        >
                            <option value="">Select Publisher...</option>
                            {publishers.map(pub => (
                                <option key={pub.id} value={pub.id}>{pub.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="pro_id">PRO</label>
                        <select
                            id="pro_id"
                            value={formData.pro_id}
                            onChange={(e) => setFormData({ ...formData, pro_id: e.target.value })}
                        >
                            <option value="">Select PRO...</option>
                            {pros.map(pro => (
                                <option key={pro.id} value={pro.id}>{pro.name} ({pro.country})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <h3 className="form-section-title">Social & Streaming</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="instagram">Instagram</label>
                        <input
                            type="text"
                            id="instagram"
                            value={formData.instagram}
                            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                            placeholder="@artist"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="twitter">Twitter</label>
                        <input
                            type="text"
                            id="twitter"
                            value={formData.twitter}
                            onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                            placeholder="@artist"
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="spotify">Spotify URL</label>
                    <input
                        type="url"
                        id="spotify"
                        value={formData.spotify_url}
                        onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })}
                        placeholder="https://open.spotify.com/artist/..."
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="apple_music">Apple Music URL</label>
                    <input
                        type="url"
                        id="apple_music"
                        value={formData.apple_music_url}
                        onChange={(e) => setFormData({ ...formData, apple_music_url: e.target.value })}
                        placeholder="https://music.apple.com/..."
                    />
                </div>

                <h3 className="form-section-title">Banking Details</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="bank_name">Bank Name</label>
                        <input
                            type="text"
                            id="bank_name"
                            value={formData.bank_name}
                            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="branch_code">Branch Code</label>
                        <input
                            type="text"
                            id="branch_code"
                            value={formData.branch_code}
                            onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="account_number">Account Number</label>
                    <input
                        type="text"
                        id="account_number"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    />
                </div>
            </EntityForm>
            <style>{`
                .back-link { margin-bottom: 2rem; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; color: var(--text-muted); font-weight: 500; }
                .back-link:hover { color: var(--primary-color); }
                .meta-tag { background: #f1f5f9; color: #475569; padding: 4px 12px; borderRadius: 16px; fontSize: 0.75rem; fontWeight: 600; textTransform: uppercase; letterSpacing: 0.05em; }
                .blur-text { filter: blur(4px); transition: filter 0.3s; cursor: pointer; }
                .blur-text:hover { filter: blur(0); }
                
                @media print {
                    .back-link, .artist-sidebar, .detail-tabs, .btn-secondary, .btn-primary { display: none !important; }
                    .artist-detail-page { padding: 0 !important; width: 100% !important; }
                    .artist-content-grid { display: block !important; }
                    .blur-text { filter: none !important; }
                }
                
                @media (max-width: 1024px) {
                    .artist-content-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default ArtistDetail;
