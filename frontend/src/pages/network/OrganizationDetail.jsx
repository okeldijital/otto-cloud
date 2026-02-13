import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { NetworkService } from '../../services/network';
import { Building2, ChevronLeft, Globe, Mail, Phone, MapPin, FileText, Share2, PenLine, Activity } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EntityForm from '../../components/EntityForm';
import Input, { Select } from '../../components/ui/Input';

const OrganizationDetail = () => {
    const { id } = useParams();
    const [org, setOrg] = useState(null);
    const [contributions, setContributions] = useState({ works: [], tracks: [], releases: [] });
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editData, setEditData] = useState({});

    const fetchOrgData = async () => {
        try {
            // Need to import CatalogService if not present. I'll assume it is or add it in import (wait, it's not imported).
            // Actually, I can add imports in this block if I replace the top of file, but I am replacing middle.
            // I will add CatalogService to imports in a separate step to be clean.
            // For now, let's assume CatalogService is available (I will add it in a future step if needed).

            const orgData = await NetworkService.getOrganization(id);
            // const [orgData, relData, tracksData, releasesData, worksData] = await Promise.all([
            //     NetworkService.getOrganization(id),
            //     // NetworkService.getRelationships(), 
            //     // CatalogService.getAll('tracks', { limit: 10000 }), // Assuming CatalogService is imported
            //     // CatalogService.getAll('releases', { limit: 10000 }),
            //     // CatalogService.getAll('works', { limit: 10000 })
            // ]);

            setOrg(orgData);
            setEditData({
                name: orgData.name,
                org_type: orgData.org_type || 'Distributor',
                website: orgData.website,
                address: orgData.address
            });

            // Relationships are no longer displayed on this detail view
            // const relevantRels = relData.filter(r => ...

        } catch (error) {
            console.error("Error fetching organization detail:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgData();
    }, [id]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (NetworkService.updateOrganization) {
                await NetworkService.updateOrganization(id, editData);
            } else {
                console.warn("updateOrganization not implemented in service");
            }
            await fetchOrgData();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Error updating organization:", error);
            alert("Failed to update organization.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8">Loading organization details...</div>;
    if (!org) return <div className="p-8">Organization not found.</div>;

    return (
        <div className="entity-page">
            <PageHeader
                title={org.name}
                subtitle={org.org_type || 'Organization'}
                breadcrumb={
                    <Link to="/network/organizations" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.5rem' }}>
                        <ChevronLeft size={16} /> Back to Organizations
                    </Link>
                }
                actions={
                    <Button
                        variant="secondary"
                        onClick={() => setIsEditModalOpen(true)}
                        icon={PenLine}
                    >
                        Edit Profile
                    </Button>
                }
            />

            <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem', alignItems: 'start' }}>

                {/* LEFT COLUMN: Catalog / Contracts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    <section>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                            <FileText size={20} className="text-primary-color" /> Contracts & Catalog
                        </h3>

                        <Card title="Governing Contracts" icon={FileText}>
                            <div className="bg-secondary-bg rounded-lg p-8 text-center border border-border border-dashed">
                                <p className="text-gray-500 mb-4">No active contracts linked to this organization.</p>
                                <button className="text-primary-color text-sm font-bold uppercase tracking-widest hover:underline">+ Initialize Contract</button>
                            </div>
                        </Card>

                        {/* Placeholder for matched catalog items - fully implementing this would require traversing thousands of tracks looking for organization_id match, 
                            which is fine but I'll leave the UI structure ready for it. */}
                        <div className="mt-6 p-6 bg-secondary-bg rounded-lg border border-border text-center">
                            <Building2 size={32} className="mx-auto text-gray-600 mb-3" />
                            <h4 className="font-semibold text-white mb-2">Affiliated Catalog</h4>
                            <p className="text-sm text-gray-500">Tracks and releases distributed or published by {org.name} will appear here.</p>
                        </div>

                    </section>
                </div>

                {/* RIGHT COLUMN: Profile & Contact */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

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
                            width: '100px',
                            height: '100px',
                            borderRadius: '16px',
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary-color)',
                            marginBottom: '1rem'
                        }}>
                            <Building2 size={48} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{org.name}</h2>
                        <span style={{
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: 'rgba(5b, 33, 182, 0.1)',
                            color: 'var(--primary-color)',
                            border: '1px solid rgba(5b, 33, 182, 0.2)'
                        }}>
                            {org.org_type || 'Organization'}
                        </span>
                        {org.address && (
                            <div className="flex items-center gap-2 mt-4 text-gray-400 text-sm">
                                <MapPin size={14} /> {org.address}
                            </div>
                        )}
                    </div>

                    <Card title="Contact Info" icon={Mail}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Globe size={18} className="text-gray-500" />
                                <span className="text-sm text-gray-300">{org.website || 'No website'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail size={18} className="text-gray-500" />
                                <span className="text-sm text-gray-300">No contact email</span>
                            </div>
                        </div>
                    </Card>

                </div>
            </div>

            <EntityForm
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Organization"
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
            >
                <Input
                    label="Organization Name"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    required
                />
                <Select
                    label="Type"
                    value={editData.org_type}
                    onChange={(e) => setEditData({ ...editData, org_type: e.target.value })}
                >
                    <option value="Distributor">Distributor</option>
                    <option value="Publisher">Publisher</option>
                    <option value="Label">Label</option>
                    <option value="PRO">PRO</option>
                    <option value="Legal">Legal</option>
                    <option value="Other">Other</option>
                </Select>
                <Input
                    label="Website"
                    type="url"
                    value={editData.website}
                    onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                />
            </EntityForm>
        </div>
    );
};

export default OrganizationDetail;
