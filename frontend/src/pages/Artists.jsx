import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { DocumentsService } from '../services/operations';
import { ReportsService } from '../services/reports';
import { BASE_URL } from '../lib/api';
import { confirmAction } from '../lib/tauri';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import Autocomplete from '../components/Autocomplete';
import { Camera, User, ChevronLeft, Download, Plus, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import Input, { Select, Textarea } from '../components/ui/Input';
import Card from '../components/ui/Card';

const API_URL = BASE_URL;

const Artists = () => {
    const [artists, setArtists] = useState([]);
    const [labels, setLabels] = useState([]);
    const [publishers, setPublishers] = useState([]);
    const [pros, setPros] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingArtist, setEditingArtist] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        aka: '',
        artist_kind: 'solo',
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
        // Banking
        bank_name: '',
        account_number: '',
        branch_code: '',
        // Streaming
        spotify_url: '',
        apple_music_url: '',
        youtube_url: ''
    });

    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [artistsData, labelsData, publishersData, prosData] = await Promise.all([
                CatalogService.getAll('artists'),
                CatalogService.getAll('labels'),
                CatalogService.getAll('publishers'),
                CatalogService.getAll('pros')
            ]);
            setArtists(artistsData || []);
            setLabels(labelsData || []);
            setPublishers(publishersData || []);
            setPros(prosData || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = () => {
        setEditingArtist(null);
        setEditingArtist(null);
        setSelectedImage(null);
        setImagePreview(null);
        setFormData({
            name: '',
            aka: '',
            artist_kind: 'solo',
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
        setIsModalOpen(true);
    };

    const handleEdit = (artist) => {
        setEditingArtist(artist);
        setSelectedImage(null);
        setImagePreview(artist.profile_image_url ? (artist.profile_image_url.startsWith('http') ? artist.profile_image_url : `${API_URL}${artist.profile_image_url}`) : null);

        const social = artist.social_media || {};
        const banking = artist.banking_details || {};
        const streaming = artist.streaming_links || {};
        setFormData({
            name: artist.name,
            aka: artist.aka || '',
            artist_kind: artist.artist_kind || 'solo',
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
        setIsModalOpen(true);
    };

    const handleDelete = async (artist) => {
        if (await confirmAction(`Are you sure you want to delete "${artist.name}"?`, 'Delete Artist')) {
            try {
                await CatalogService.delete('artists', artist.id);
                fetchData();
            } catch (error) {
                console.error('Failed to delete artist:', error);
                alert(error.response?.data?.detail || 'Failed to delete artist');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Prepare data
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
            artist_kind: formData.artist_kind || 'solo',
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

        try {
            if (editingArtist) {
                await CatalogService.update('artists', editingArtist.id, submissionData);
            } else {
                await CatalogService.create('artists', submissionData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save artist:', error);
            alert(error.response?.data?.detail || 'Failed to save artist');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Artist Name',
            sortable: true,
            render: (row) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Link to={`/catalog/artists/${row.id}`} className="font-bold text-accent hover:text-white transition-colors">
                            {row.display_name || row.aka || row.name}
                        </Link>
                        {(row.artist_kind === 'group') && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success/20 text-success uppercase tracking-wider">GROUP</span>
                        )}
                    </div>
                    {row.aka && row.name !== row.aka && (
                        <span className="text-xs text-text-secondary">
                            Real Name: {row.name}
                        </span>
                    )}
                    {row.artist_kind === 'group' && row.members?.length > 0 && (
                        <span className="text-[10px] text-text-secondary italic">
                            Members: {row.members.map(m => m.name).join(', ')}
                        </span>
                    )}
                </div>
            )
        },
        { key: 'aka', label: 'Stage Name', sortable: true },
        {
            key: 'artist_kind',
            label: 'Kind',
            sortable: true,
            render: (row) => {
                const kind = row.artist_kind || 'solo';
                return (
                    <span className="capitalize text-xs font-bold text-text-secondary">
                        {kind}{kind === 'group' && row.member_count ? ` (${row.member_count})` : ''}
                    </span>
                );
            }
        },
        { key: 'contact_email', label: 'Email', sortable: true },
        {
            key: 'label_id',
            label: 'Label',
            render: (row) => {
                const label = (labels || []).find(l => l.id === row.label_id);
                return label ? (
                    <span className="text-white font-medium">{label.name}</span>
                ) : <span className="text-text-secondary/50">-</span>;
            }
        },
    ];

    const filteredArtists = (artists || []).filter(artist => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (artist.name?.toLowerCase().includes(searchLower)) ||
            (artist.aka?.toLowerCase().includes(searchLower)) ||
            (artist.contact_email?.toLowerCase().includes(searchLower)) ||
            (artist.ipi_number?.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <PageHeader
                title="Artists"
                subtitle="Manage your artist roster"
                breadcrumb={
                    <Link to="/catalog" className="inline-flex items-center gap-1 text-text-secondary hover:text-white transition-colors font-bold text-sm mb-2">
                        <ChevronLeft size={16} /> Back to Catalog
                    </Link>
                }
                actions={
                    <div className="flex gap-3 items-center">
                        <div className="relative min-w-[250px]">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 h-10 rounded-xl border border-white/10 bg-white/5 text-white text-sm outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all placeholder:text-text-secondary/50"
                                placeholder="Quick search artists..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="secondary"
                            icon={Download}
                            onClick={() => ReportsService.exportData('artists', 'excel')}
                        >
                            Export
                        </Button>
                        <Button
                            variant="primary"
                            icon={Plus}
                            onClick={handleCreate}
                        >
                            Add Artist
                        </Button>
                    </div>
                }
            />

            <DataTable
                columns={columns}
                data={filteredArtists}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingArtist ? 'Edit Artist' : 'New Artist'}
                onSubmit={handleSubmit}
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
                                <label htmlFor="image-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white cursor-pointer transition-colors">
                                    <Camera size={16} /> Upload Photo
                                </label>
                                <input
                                    type="file"
                                    id="image-upload"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <Input
                                label="Artist Name"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                autoFocus
                            />
                            <Input
                                label="AKA (Stage Name)"
                                id="aka"
                                value={formData.aka}
                                onChange={(e) => setFormData({ ...formData, aka: e.target.value })}
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="artist_kind" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Kind</label>
                            <Select
                                id="artist_kind"
                                value={formData.artist_kind || 'solo'}
                                onChange={(e) => setFormData({ ...formData, artist_kind: e.target.value })}
                            >
                                <option value="solo">Solo</option>
                                <option value="group">Group</option>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <Input
                                label="ID Number"
                                id="id_number"
                                value={formData.id_number}
                                onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                                placeholder="National ID / Passport Number"
                            />
                            <Input
                                label="Nationality"
                                id="nationality"
                                value={formData.nationality}
                                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                                placeholder="e.g. South African"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <Input
                                label="Email"
                                type="email"
                                id="contact_email"
                                value={formData.contact_email}
                                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                            />
                            <Input
                                label="Phone"
                                id="contact_phone"
                                value={formData.contact_phone}
                                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                            />
                        </div>

                        <div className="mb-4">
                            <Textarea
                                label="Physical Address"
                                id="physical_address"
                                value={formData.physical_address}
                                onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                                rows={2}
                            />
                        </div>

                        <div className="mb-4">
                            <Input
                                label="IPI Number"
                                id="ipi_number"
                                value={formData.ipi_number}
                                onChange={(e) => setFormData({ ...formData, ipi_number: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Relationships Section */}
                    <div>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Relationships</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="label_id" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Label</label>
                                <Autocomplete
                                    options={labels || []}
                                    value={formData.label_id}
                                    onChange={(val) => setFormData({ ...formData, label_id: val })}
                                    placeholder="Select Label..."
                                    allowQuickAdd={true}
                                    quickAddType="labels"
                                />
                            </div>
                            <div>
                                <label htmlFor="publisher_id" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Publisher</label>
                                <Autocomplete
                                    options={publishers || []}
                                    value={formData.publisher_id}
                                    onChange={(val) => setFormData({ ...formData, publisher_id: val })}
                                    placeholder="Select Publisher..."
                                    allowQuickAdd={true}
                                    quickAddType="publishers"
                                />
                            </div>
                            <div>
                                <label htmlFor="pro_id" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">PRO</label>
                                <Autocomplete
                                    options={pros || []}
                                    value={formData.pro_id}
                                    onChange={(val) => setFormData({ ...formData, pro_id: val })}
                                    placeholder="Select PRO..."
                                    allowQuickAdd={true}
                                    quickAddType="pros"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Social & Streaming Section */}
                    <div>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Social & Streaming</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <Input
                                label="Instagram"
                                id="instagram"
                                value={formData.instagram}
                                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                placeholder="@artist"
                            />
                            <Input
                                label="Twitter"
                                id="twitter"
                                value={formData.twitter}
                                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                placeholder="@artist"
                            />
                        </div>
                        <div className="space-y-4">
                            <Input
                                label="Spotify URL"
                                type="url"
                                id="spotify"
                                value={formData.spotify_url}
                                onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })}
                                placeholder="https://open.spotify.com/artist/..."
                            />
                            <Input
                                label="Apple Music URL"
                                type="url"
                                id="apple_music"
                                value={formData.apple_music_url}
                                onChange={(e) => setFormData({ ...formData, apple_music_url: e.target.value })}
                                placeholder="https://music.apple.com/..."
                            />
                        </div>
                    </div>

                    {/* Banking Details Section */}
                    <div>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Banking Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <Input
                                label="Bank Name"
                                id="bank_name"
                                value={formData.bank_name}
                                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                            />
                            <Input
                                label="Branch Code"
                                id="branch_code"
                                value={formData.branch_code}
                                onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                            />
                        </div>
                        <Input
                            label="Account Number"
                            id="account_number"
                            value={formData.account_number}
                            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        />
                    </div>
                </div>
            </EntityForm>
        </div>
    );
};

export default Artists;
