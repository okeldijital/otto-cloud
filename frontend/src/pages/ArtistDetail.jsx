import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { DocumentsService } from '../services/operations';
import { ReportsService } from '../services/reports';
import { BASE_URL } from '../lib/api';
import { confirmAction } from '../lib/tauri';
import { User, Disc, FileText, Music, Link as LinkIcon, Instagram, Twitter, DollarSign, Edit, Camera, ChevronLeft, Trash2 } from 'lucide-react';
import EntityForm from '../components/EntityForm';
import GroupMembersManager from '../components/catalog/GroupMembersManager';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';

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
        youtube_url: '',
        artist_kind: 'solo'
    });

    const fetchArtistData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
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
            if (!silent) setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchArtistData();
        }
    }, [fetchArtistData, id]);

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
            youtube_url: streaming.youtube || '',
            artist_kind: artist.artist_kind || 'solo'
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
                },
                artist_kind: formData.artist_kind
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
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            <Link to="/catalog/artists" className="mb-6 inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors font-bold text-sm">
                <ChevronLeft size={16} /> Back to Artists
            </Link>
            
            {/* Header / Hero Section */}
            <div className="bg-premium-glass border border-white/5 rounded-[32px] p-8 mb-8 flex flex-col lg:flex-row gap-8 shadow-glass backdrop-blur-2xl">
                <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border border-white/10 shrink-0 flex items-center justify-center bg-white/5 shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                    {artist.profile_image_url ? (
                        <img src={artist.profile_image_url.startsWith('http') ? artist.profile_image_url : `${BASE_URL}${artist.profile_image_url}`} alt={artist.name} className="w-full h-full object-cover" />
                    ) : (
                        <User size={64} className="text-text-secondary opacity-30" />
                    )}
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] tracking-tight">{artist.name}</h1>
                            {(artist.artist_kind === 'group') && (
                                <Badge variant="success">GROUP</Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="danger" className="bg-danger/10 hover:bg-danger/20 text-danger border-transparent" size="sm" onClick={async () => {
                                if (await confirmAction(`Are you sure you want to delete ${artist.name}?`, 'Delete Artist')) {
                                    try {
                                        await CatalogService.delete('artists', artist.id);
                                        navigate('/catalog/artists');
                                    } catch (err) {
                                        console.error(err);
                                        alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
                                    }
                                }
                            }}>
                                <Trash2 size={16} className="mr-1.5" /> Delete
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleEditClick}>
                                <Edit size={16} className="mr-1.5" /> Edit Profile
                            </Button>
                        </div>
                    </div>
                    
                    {artist.aka && <p className="text-text-secondary text-lg mb-4">aka <span className="text-white font-medium">{artist.aka}</span></p>}

                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <div className="flex gap-2">
                            {artist.label_id && <Badge variant="info">Label Artist</Badge>}
                            {artist.writer ? <Badge variant="warning">Songwriter</Badge> : null}
                        </div>
                        
                        {(social.instagram || social.twitter || streaming.spotify) && <div className="w-px h-6 bg-white/10 hidden md:block"></div>}

                        <div className="flex gap-3 text-text-secondary">
                            {social.instagram && (
                                <a href={`https://instagram.com/${social.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="hover:text-white hover:scale-110 transition-all" title="Instagram">
                                    <Instagram size={20} />
                                </a>
                            )}
                            {social.twitter && (
                                <a href={`https://twitter.com/${social.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" className="hover:text-white hover:scale-110 transition-all" title="Twitter">
                                    <Twitter size={20} />
                                </a>
                            )}
                            {streaming.spotify && (
                                <a href={streaming.spotify} target="_blank" rel="noreferrer" className="hover:text-accent hover:scale-110 transition-all" title="Spotify">
                                    <Music size={20} />
                                </a>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-auto">
                        <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">{releases.length}</span>
                            <span className="text-xs text-text-secondary uppercase tracking-widest font-bold">Releases</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">{works.length}</span>
                            <span className="text-xs text-text-secondary uppercase tracking-widest font-bold">Works</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">{contracts.length}</span>
                            <span className="text-xs text-text-secondary uppercase tracking-widest font-bold">Contracts</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="flex-1 w-full min-w-0">
                    {/* Navigation Tabs */}
                    <div className="flex overflow-x-auto bg-premium-glass border border-white/5 rounded-2xl p-1 mb-6 hide-scrollbar shadow-sm">
                        {['overview', 'discography', 'works', 'contracts', 'banking'].map((tab) => (
                            <button
                                key={tab}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap flex-1 text-center ${activeTab === tab ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {activeTab === 'overview' && (
                            <div className="flex flex-col gap-6">
                                <Card title="Contact Information" noPadding contentClassName="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">Email</label>
                                            <p className="text-white text-sm">{artist.contact_email || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">Phone</label>
                                            <p className="text-white text-sm">{artist.contact_phone || '-'}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">Physical Address</label>
                                            <p className="text-white text-sm">{artist.physical_address || '-'}</p>
                                        </div>
                                    </div>
                                </Card>

                                <Card title="Identifiers" noPadding contentClassName="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">IPI Number</label>
                                            <p className="text-white text-sm font-mono">{artist.ipi_number || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">National ID</label>
                                            <p className="text-white text-sm font-mono">{artist.id_number || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">Nationality</label>
                                            <p className="text-white text-sm">{artist.nationality || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">Label</label>
                                            <p className="text-white text-sm">{artist.label_id ? labels.find(l => l.id === artist.label_id)?.name || `Label #${artist.label_id}` : 'Independent'}</p>
                                        </div>
                                    </div>
                                </Card>

                                {/* Members Section (Groups only) */}
                                {artist.artist_kind === 'group' && (
                                    <div className="mt-6">
                                        <GroupMembersManager artist={artist} onUpdate={() => fetchArtistData(true)} />
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'discography' && (
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-white">Releases</h3>
                                    <Button variant="primary" size="sm" onClick={() => navigate(`/catalog/releases?action=new&artist_id=${artist.id}`)}>+ Add Release</Button>
                                </div>
                                {releases.length === 0 ? (
                                    <div className="bg-premium-glass border border-white/5 rounded-[24px] py-16 text-center text-text-secondary">No releases linked to this artist.</div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {releases.map(release => (
                                            <Link key={release.id} to={`/catalog/releases/${release.id}`} className="flex flex-col group">
                                                <div className="aspect-square bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-3 relative group-hover:border-accent/50 group-hover:shadow-glow transition-all">
                                                    {release.cover_art_url ? (
                                                        <img src={release.cover_art_url.startsWith('http') ? release.cover_art_url : `${BASE_URL}${release.cover_art_url}`} alt={release.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-text-secondary opacity-30 group-hover:text-accent group-hover:opacity-100 transition-colors">
                                                            <Disc size={48} />
                                                        </div>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-bold text-white truncate group-hover:text-accent transition-colors">{release.title}</h4>
                                                <p className="text-xs text-text-secondary mt-1">{release.release_date}</p>
                                                <div className="mt-2"><Badge variant="gray" size="xs">{release.release_type}</Badge></div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'works' && (
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-white">Musical Works</h3>
                                    <Button variant="primary" size="sm" onClick={() => navigate('/catalog/works')}>+ New Work</Button>
                                </div>
                                {works.length === 0 ? (
                                    <div className="bg-premium-glass border border-white/5 rounded-[24px] py-16 text-center text-text-secondary">No musical works found for this artist.</div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {works.map(work => (
                                            <div key={work.id} className="bg-premium-glass border border-white/5 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white/[0.03] transition-colors">
                                                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                                                    <Music size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-white truncate">{work.title}</h4>
                                                    <p className="text-xs text-text-secondary font-mono mt-1">ISWC: {work.iswc_code || 'N/A'}</p>
                                                </div>
                                                <Link to="/catalog/works" className="text-xs font-bold text-text-secondary group-hover:text-accent transition-colors px-4 py-2 border border-white/10 rounded-lg whitespace-nowrap">View Details</Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'contracts' && (
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-white">Linked Contracts</h3>
                                    <Button variant="primary" size="sm" onClick={() => navigate('/contracts')}>+ New Agreement</Button>
                                </div>
                                {contracts.length === 0 ? (
                                    <div className="bg-premium-glass border border-white/5 rounded-[24px] py-16 text-center text-text-secondary border-dashed">No active agreements found for this artist.</div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {contracts.map(contract => (
                                            <Link key={contract.id} to={`/contracts/${contract.id}`} className="bg-premium-glass border border-white/5 rounded-2xl p-4 flex items-center gap-4 group hover:border-accent/40 transition-all hover:shadow-glow">
                                                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-white truncate group-hover:text-accent transition-colors">{contract.title || `Contract #${contract.id}`}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-text-secondary font-mono">{contract.contract_number}</span>
                                                        <span className="text-white/20">•</span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${contract.status === 'Active' ? 'text-success' : 'text-text-secondary'}`}>{contract.status}</span>
                                                    </div>
                                                </div>
                                                <div className="text-accent text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">View Details →</div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'banking' && (
                            <div className="flex flex-col gap-4">
                                <Card title="Banking Details" headerAction={<DollarSign size={16} className="text-text-secondary" />} noPadding contentClassName="p-6">
                                    {banking.bank_name ? (
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Bank Name</label>
                                                <span className="text-sm font-bold text-white">{banking.bank_name}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Account Number</label>
                                                <span className="text-sm font-mono text-white blur-[4px] hover:blur-none transition-all cursor-pointer">{banking.account_number ? '•••• •••• •••• ' + banking.account_number.slice(-4) : '-'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Branch Code</label>
                                                <span className="text-sm font-mono text-white">{banking.branch_code}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-text-secondary italic text-center py-8">No banking details provided.</p>
                                    )}
                                </Card>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Quick Actions */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
                    <div className="bg-accent/10 border border-accent/20 rounded-[24px] p-6 text-white shadow-[0_0_20px_rgba(14,165,233,0.15)] relative overflow-hidden backdrop-blur-xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h4 className="text-sm font-bold uppercase tracking-widest mb-4 relative z-10">Quick Actions</h4>
                        <div className="flex flex-col gap-3 relative z-10">
                            <button
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold transition-all flex justify-between items-center group"
                                onClick={() => window.print()}
                            >
                                Generate One-Sheet
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </button>
                            <button
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold transition-all flex justify-between items-center group"
                                onClick={() => ReportsService.exportSingle('artist', id, 'excel')}
                            >
                                Export Profile (Excel)
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </button>
                            <button
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold transition-all flex justify-between items-center group"
                                onClick={() => ReportsService.exportSingle('artist', id, 'csv')}
                            >
                                Export Profile (CSV)
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
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
                <div className="space-y-8">
                    {/* Basic Information Section */}
                    <div>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Basic Information</h3>
                        
                        <div className="flex items-center gap-6 mb-6">
                            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-white/5 border border-white/10 shadow-sm flex items-center justify-center shrink-0">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={32} className="text-text-muted" />
                                )}
                            </div>
                            <div>
                                <label htmlFor="edit-image-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white cursor-pointer transition-colors">
                                    <Camera size={16} /> Upload Photo
                                </label>
                                <input
                                    type="file"
                                    id="edit-image-upload"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="name" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Artist Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="aka" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">AKA (Stage Name)</label>
                                <input
                                    type="text"
                                    id="aka"
                                    value={formData.aka}
                                    onChange={(e) => setFormData({ ...formData, aka: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Artist Type</label>
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${formData.artist_kind === 'solo' ? 'border-accent bg-accent/10 text-white' : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10'}`}>
                                    <input type="radio" name="artist_kind" value="solo" checked={formData.artist_kind === 'solo'} onChange={() => setFormData({ ...formData, artist_kind: 'solo' })} className="hidden" />
                                    <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                                        {formData.artist_kind === 'solo' && <span className="w-2 h-2 rounded-full bg-current"></span>}
                                    </span>
                                    <span className="text-sm font-bold">Solo Artist</span>
                                </label>
                                <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${formData.artist_kind === 'group' ? 'border-accent bg-accent/10 text-white' : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10'}`}>
                                    <input type="radio" name="artist_kind" value="group" checked={formData.artist_kind === 'group'} onChange={() => setFormData({ ...formData, artist_kind: 'group' })} className="hidden" />
                                    <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                                        {formData.artist_kind === 'group' && <span className="w-2 h-2 rounded-full bg-current"></span>}
                                    </span>
                                    <span className="text-sm font-bold">Band / Group</span>
                                </label>
                            </div>
                            {artist.artist_kind === 'group' && formData.artist_kind === 'solo' && (
                                <p className="text-warning text-xs mt-2 font-bold">
                                    ⚠️ Warning: Changing to Solo will hide group member management.
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="id_number" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">ID Number</label>
                                <input
                                    type="text"
                                    id="id_number"
                                    value={formData.id_number}
                                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                                    placeholder="National ID / Passport Number"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="nationality" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Nationality</label>
                                <input
                                    type="text"
                                    id="nationality"
                                    value={formData.nationality}
                                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                                    placeholder="e.g. South African"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="contact_email" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Email</label>
                                <input
                                    type="email"
                                    id="contact_email"
                                    value={formData.contact_email}
                                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="contact_phone" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Phone</label>
                                <input
                                    type="text"
                                    id="contact_phone"
                                    value={formData.contact_phone}
                                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="physical_address" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Physical Address</label>
                            <textarea
                                id="physical_address"
                                value={formData.physical_address}
                                onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                                rows={2}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors resize-none"
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="ipi_number" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">IPI Number</label>
                            <input
                                type="text"
                                id="ipi_number"
                                value={formData.ipi_number}
                                onChange={(e) => setFormData({ ...formData, ipi_number: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                    </div>

                    {/* Relationships Section */}
                    <div>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Relationships</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="label_id" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Label</label>
                                <select
                                    id="label_id"
                                    value={formData.label_id}
                                    onChange={(e) => setFormData({ ...formData, label_id: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent transition-all appearance-none"
                                >
                                    <option value="" className="bg-[#0f1115]">Select Label...</option>
                                    {labels.map(label => (
                                        <option key={label.id} value={label.id} className="bg-[#0f1115]">{label.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="publisher_id" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Publisher</label>
                                <select
                                    id="publisher_id"
                                    value={formData.publisher_id}
                                    onChange={(e) => setFormData({ ...formData, publisher_id: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent transition-all appearance-none"
                                >
                                    <option value="" className="bg-[#0f1115]">Select Publisher...</option>
                                    {publishers.map(pub => (
                                        <option key={pub.id} value={pub.id} className="bg-[#0f1115]">{pub.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="pro_id" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">PRO</label>
                                <select
                                    id="pro_id"
                                    value={formData.pro_id}
                                    onChange={(e) => setFormData({ ...formData, pro_id: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent transition-all appearance-none"
                                >
                                    <option value="" className="bg-[#0f1115]">Select PRO...</option>
                                    {pros.map(pro => (
                                        <option key={pro.id} value={pro.id} className="bg-[#0f1115]">{pro.name} ({pro.country})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Social & Streaming Section */}
                    <div>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Social & Streaming</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="instagram" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Instagram</label>
                                <input
                                    type="text"
                                    id="instagram"
                                    value={formData.instagram}
                                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                    placeholder="@artist"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="twitter" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Twitter</label>
                                <input
                                    type="text"
                                    id="twitter"
                                    value={formData.twitter}
                                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                    placeholder="@artist"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="spotify" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Spotify URL</label>
                                <input
                                    type="url"
                                    id="spotify"
                                    value={formData.spotify_url}
                                    onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })}
                                    placeholder="https://open.spotify.com/artist/..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="apple_music" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Apple Music URL</label>
                                <input
                                    type="url"
                                    id="apple_music"
                                    value={formData.apple_music_url}
                                    onChange={(e) => setFormData({ ...formData, apple_music_url: e.target.value })}
                                    placeholder="https://music.apple.com/..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Banking Details Section */}
                    <div>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Banking Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="bank_name" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    id="bank_name"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="branch_code" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Branch Code</label>
                                <input
                                    type="text"
                                    id="branch_code"
                                    value={formData.branch_code}
                                    onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="account_number" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Account Number</label>
                            <input
                                type="text"
                                id="account_number"
                                value={formData.account_number}
                                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </EntityForm>
        </div>
    );
};

export default ArtistDetail;
