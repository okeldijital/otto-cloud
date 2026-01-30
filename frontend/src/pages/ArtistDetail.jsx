import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { DocumentsService } from '../services/operations';
import { BASE_URL } from '../lib/api';
import { User, Disc, FileText, Music, Link as LinkIcon, Instagram, Twitter, DollarSign, Edit, Camera } from 'lucide-react';
import EntityForm from '../components/EntityForm';

const API_URL = BASE_URL;

const ArtistDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [artist, setArtist] = useState(null);
    const [releases, setReleases] = useState([]);
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
                const [artistData, releasesData, labelsData, publishersData, prosData] = await Promise.all([
                    CatalogService.getById('artists', id),
                    CatalogService.getArtistReleases(id),
                    CatalogService.getAll('labels'),
                    CatalogService.getAll('publishers'),
                    CatalogService.getAll('pros')
                ]);
                setArtist(artistData);
                setReleases(releasesData);
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
                                    <label>National ID</label>
                                    <p>{artist.id_number || '-'}</p>
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
                            <button className="btn-primary btn-sm" onClick={() => navigate('/catalog/releases')}>+ Add Release</button>
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
        </div >
    );
};

export default ArtistDetail;
