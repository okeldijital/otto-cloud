import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { DocumentsService } from '../services/operations';
import { ReportsService } from '../services/reports';
import { BASE_URL } from '../lib/api';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import Autocomplete from '../components/Autocomplete';
import { Camera, User, ChevronLeft, Download, Plus } from 'lucide-react';
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
        if (window.confirm(`Are you sure you want to delete "${artist.name}"?`)) {
            try {
                await CatalogService.delete('artists', artist.id);
                fetchData();
            } catch (error) {
                console.error('Failed to delete artist:', error);
                alert('Failed to delete artist');
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
            alert('Failed to save artist');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Artist Name',
            render: (row) => (
                <Link to={`/catalog/artists/${row.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: 'var(--primary-color)', textDecoration: 'none' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                        {row.profile_image_url ? (
                            <img
                                src={row.profile_image_url.startsWith('http') ? row.profile_image_url : `${API_URL}${row.profile_image_url}`}
                                alt={row.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={16} color="#94a3b8" />
                            </div>
                        )}
                    </div>
                    {row.name}
                </Link>
            )
        },
        { key: 'aka', label: 'AKA' },
        { key: 'contact_email', label: 'Email' },
        {
            key: 'label_id',
            label: 'Label',
            render: (row) => {
                const label = (labels || []).find(l => l.id === row.label_id);
                return label ? label.name : '-';
            }
        },
    ];

    return (
        <div className="entity-page p-8">
            <PageHeader
                title="Artists"
                subtitle="Manage your artist roster"
                breadcrumb={
                    <Link to="/catalog" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.5rem' }}>
                        <ChevronLeft size={16} /> Back to Catalog
                    </Link>
                }
                actions={
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                data={artists || []}
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
                        <label htmlFor="image-upload" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Camera size={16} /> Upload Photo
                        </label>
                        <input
                            type="file"
                            id="image-upload"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                <div className="form-row">
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

                <div className="form-row">
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

                <div className="form-row">
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

                <Textarea
                    label="Physical Address"
                    id="physical_address"
                    value={formData.physical_address}
                    onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                    rows={2}
                />

                <Input
                    label="IPI Number"
                    id="ipi_number"
                    value={formData.ipi_number}
                    onChange={(e) => setFormData({ ...formData, ipi_number: e.target.value })}
                />

                <h3 className="form-section-title">Relationships</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="label_id">Label</label>
                        <Autocomplete
                            options={labels || []}
                            value={formData.label_id}
                            onChange={(val) => setFormData({ ...formData, label_id: val })}
                            placeholder="Select Label..."
                            allowQuickAdd={true}
                            quickAddType="labels"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="publisher_id">Publisher</label>
                        <Autocomplete
                            options={publishers || []}
                            value={formData.publisher_id}
                            onChange={(val) => setFormData({ ...formData, publisher_id: val })}
                            placeholder="Select Publisher..."
                            allowQuickAdd={true}
                            quickAddType="publishers"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="pro_id">PRO</label>
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
        </div>
    );
};

export default Artists;
