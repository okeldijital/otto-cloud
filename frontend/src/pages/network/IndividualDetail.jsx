import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { NetworkService } from '../../services/network';
import { CatalogService } from '../../services/catalog';
import { UserCircle, ChevronLeft, Mail, Phone, Building2, Star, Share2, Activity, PenLine, Play, Disc, Music2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EntityForm from '../../components/EntityForm';
import Input, { Select } from '../../components/ui/Input';

const IndividualDetail = () => {
    const { id } = useParams();
    const [individual, setIndividual] = useState(null);
    const [relationships, setRelationships] = useState([]);
    const [contributions, setContributions] = useState({ works: [], tracks: [], releases: [] });
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editData, setEditData] = useState({});

    const fetchIndividualData = async () => {
        try {
            const [indData, relData, artistsData, worksData, tracksData, releasesData] = await Promise.all([
                NetworkService.getIndividual(id),
                NetworkService.getRelationships(),
                CatalogService.getAll('artists', { limit: 10000 }),
                CatalogService.getAll('works', { limit: 10000 }),
                CatalogService.getAll('tracks', { limit: 10000 }),
                CatalogService.getAll('releases', { limit: 10000 })
            ]);
            setIndividual(indData);
            setEditData({
                first_name: indData.first_name,
                last_name: indData.last_name,
                email: indData.email,
                phone: indData.phone,
                role: indData.role,
                relationship_strength: indData.relationship_strength
            });
            // Filter relationships where this individual is either source or target
            const relevantRels = relData.filter(r =>
                (r.source_type === 'individual' && r.source_id === parseInt(id)) ||
                (r.target_type === 'individual' && r.target_id === parseInt(id))
            );
            setRelationships(relevantRels);

            // Calculate Contributions
            const fullName = `${indData.first_name} ${indData.last_name}`;
            const matchedArtist = (artistsData || []).find(a =>
                (a.name || '').toLowerCase() === fullName.toLowerCase() ||
                (a.display_name || '').toLowerCase() === fullName.toLowerCase() ||
                (a.aka || '').toLowerCase() === fullName.toLowerCase()
            );
            const artistId = matchedArtist ? matchedArtist.id : null;
            const linkId = id.toString(); // Ensure string comparison

            const contribs = {
                works: (worksData || []).filter(w => {
                    if (!artistId) return false;
                    const comp = (w.composers || []).includes(artistId);
                    const arr = (w.arrangers || []).includes(artistId);
                    return comp || arr;
                }),
                tracks: (tracksData || []).filter(t => {
                    const isArtist = artistId && (t.artist_ids || []).includes(artistId);
                    const isCredited = (t.credits || []).some(c => String(c.contact_id) === linkId);
                    return isArtist || isCredited;
                }),
                releases: (releasesData || []).filter(r => {
                    // Check main artist_id and artist_ids array
                    const isMainArtist = artistId && (r.artist_id === artistId);
                    const isInArtistList = artistId && (r.artist_ids || []).includes(artistId);
                    const isCredited = (r.credits || []).some(c => String(c.contact_id) === linkId);
                    return isMainArtist || isInArtistList || isCredited;
                })
            };
            setContributions(contribs);

        } catch (error) {
            console.error("Error fetching individual detail:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIndividualData();
    }, [id]);

    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // ... existing fetch logic ...

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
            let imageUrl = individual.image_url;

            if (selectedImage) {
                // Import DocumentsService if not already imported (I will ensure imports are correct in a separate step if needed, but assuming I can use it)
                // Actually need to check imports. I'll add the logic assuming DocumentsService needs to be imported or is available.
                // Wait, DocumentsService is NOT imported in the original file. I need to add it. 
                // I will add the import in a separate tool call to be safe, or just use what I have.
                // For now, let's assume I can add the import.
                const { DocumentsService } = await import('../../services/operations');
                const uploaded = await DocumentsService.upload(selectedImage);
                imageUrl = uploaded.file_path;
            }

            const updatePayload = { ...editData, image_url: imageUrl };

            if (NetworkService.updateIndividual) {
                await NetworkService.updateIndividual(id, updatePayload);
            } else {
                console.warn("updateIndividual not implemented in service");
            }

            await fetchIndividualData();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Error updating individual:", error);
            alert("Failed to update individual.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8">Loading individual details...</div>;
    if (!individual) return <div className="p-8">Individual not found.</div>;

    const fullName = `${individual.first_name} ${individual.last_name}`;

    return (
        <div className="entity-page">
            <PageHeader
                title={fullName}
                subtitle={individual.role || 'Professional'}
                breadcrumb={
                    <Link to="/network/individuals" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.5rem' }}>
                        <ChevronLeft size={16} /> Back to Individuals
                    </Link>
                }
                actions={
                    <Button
                        variant="primary"
                        onClick={() => setIsEditModalOpen(true)}
                        icon={PenLine}
                    >
                        Edit Profile
                    </Button>
                }
            />

            <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem', alignItems: 'start' }}>

                {/* LEFT COLUMN: Contributions (Promoted) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    <section>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                            <Activity size={20} className="text-primary-color" /> Contribution Catalog
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {/* Tracks */}
                            <Card title={`Tracks (${contributions.tracks.length})`} icon={Play}>
                                <div className="space-y-2">
                                    {contributions.tracks.length > 0 ? (
                                        contributions.tracks.slice(0, 5).map(track => (
                                            <div key={track.id} className="flex justify-between items-center p-3 bg-secondary-bg rounded-lg border border-border">
                                                <Link to={`/catalog/tracks/${track.id}`} className="font-medium hover:underline text-white truncate flex-1">
                                                    {track.title}
                                                </Link>
                                                <span className="text-xs text-gray-500 ml-2">{track.isrc_code || '-'}</span>
                                            </div>
                                        ))
                                    ) : <div className="text-sm text-gray-500 italic">No tracks found.</div>}
                                    {contributions.tracks.length > 5 && (
                                        <div className="text-center pt-2">
                                            <span className="text-xs text-primary-color cursor-pointer">View All {contributions.tracks.length} Tracks</span>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Releases */}
                            <Card title={`Releases (${contributions.releases.length})`} icon={Disc}>
                                <div className="space-y-2">
                                    {contributions.releases.length > 0 ? (
                                        contributions.releases.slice(0, 5).map(release => (
                                            <div key={release.id} className="flex justify-between items-center p-3 bg-secondary-bg rounded-lg border border-border">
                                                <Link to={`/catalog/releases/${release.id}`} className="font-medium hover:underline text-white truncate flex-1">
                                                    {release.title}
                                                </Link>
                                                <span className="text-xs text-gray-500 ml-2">{release.catalog_number || '-'}</span>
                                            </div>
                                        ))
                                    ) : <div className="text-sm text-gray-500 italic">No releases found.</div>}
                                    {contributions.releases.length > 5 && (
                                        <div className="text-center pt-2">
                                            <span className="text-xs text-primary-color cursor-pointer">View All {contributions.releases.length} Releases</span>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Works */}
                            <Card title={`Works (${contributions.works.length})`} icon={Music2}>
                                <div className="space-y-2">
                                    {contributions.works.length > 0 ? (
                                        contributions.works.slice(0, 5).map(work => (
                                            <div key={work.id} className="flex justify-between items-center p-3 bg-secondary-bg rounded-lg border border-border">
                                                <Link to={`/catalog/works/${work.id}`} className="font-medium hover:underline text-white truncate flex-1">
                                                    {work.title}
                                                </Link>
                                                <span className="text-xs text-gray-500 ml-2">{work.iswc_code || '-'}</span>
                                            </div>
                                        ))
                                    ) : <div className="text-sm text-gray-500 italic">No works found.</div>}
                                    {contributions.works.length > 5 && (
                                        <div className="text-center pt-2">
                                            <span className="text-xs text-primary-color cursor-pointer">View All {contributions.works.length} Works</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: Profile & Contact */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Profile Card */}
                    <div style={{
                        background: 'var(--surface-color)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        padding: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            marginBottom: '1rem',
                            border: '4px solid var(--background-color)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            position: 'relative',
                            background: '#f1f5f9'
                        }}>
                            {individual.image_url ? (
                                <img src={individual.image_url} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                    <UserCircle size={64} />
                                </div>
                            )}
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{fullName}</h2>
                        <div style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>{individual.role || 'Contributor'}</div>

                        {/* Status / Tags */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', background: 'var(--bg-color)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                #{individual.id}
                            </span>
                        </div>
                    </div>

                    <Card title="Contact Details" icon={Mail}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Mail size={18} className="text-gray-500" />
                                <span className="text-sm text-gray-300">{individual.email || 'No email provided'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={18} className="text-gray-500" />
                                <span className="text-sm text-gray-300">{individual.phone || 'No phone provided'}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <EntityForm
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Individual"
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
            >
                {/* Image Upload in Form */}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <UserCircle size={32} color="#94a3b8" />
                        )}
                    </div>
                    <div>
                        <label htmlFor="image-upload" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.875rem' }}>
                            <PenLine size={14} /> Upload Photo
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
                        label="First Name"
                        value={editData.first_name}
                        onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                        required
                    />
                    <Input
                        label="Last Name"
                        value={editData.last_name}
                        onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                        required
                    />
                </div>
                <Input
                    label="Email"
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    required
                />
                <Input
                    label="Phone"
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
                <Input
                    label="Role / Title"
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                />
            </EntityForm>
        </div>
    );
};

export default IndividualDetail;
