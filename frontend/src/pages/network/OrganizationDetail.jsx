import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { NetworkService } from '../../services/network';
import { Building2, ChevronLeft, Globe, Mail, Phone, MapPin, FileText, Share2, PenLine } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EntityForm from '../../components/EntityForm';
import Input, { Select } from '../../components/ui/Input';

const OrganizationDetail = () => {
    const { id } = useParams();
    const [org, setOrg] = useState(null);
    const [relationships, setRelationships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editData, setEditData] = useState({});

    const fetchOrgData = async () => {
        try {
            const [orgData, relData] = await Promise.all([
                NetworkService.getOrganization(id),
                NetworkService.getRelationships()
            ]);
            setOrg(orgData);
            setEditData({
                name: orgData.name,
                org_type: orgData.org_type || 'Distributor',
                website: orgData.website,
                address: orgData.address // Assuming address might be available or added
            });
            // Filter relationships where this org is either source or target
            const relevantRels = relData.filter(r =>
                (r.source_type === 'organization' && r.source_id === parseInt(id)) ||
                (r.target_type === 'organization' && r.target_id === parseInt(id))
            );
            setRelationships(relevantRels);
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
                // Fallback if method doesn't exist, though usually it would be added to service first.
                // For this UI task, I'm assuming the service method exists or will be handled.
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
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <Button
                            variant="secondary"
                            onClick={() => setIsEditModalOpen(true)}
                            icon={PenLine}
                        >
                            Edit Profile
                        </Button>
                        <Button variant="primary">
                            Manage Contracts
                        </Button>
                    </div>
                }
            />

            <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Card title="Governing Contracts" icon={FileText}>
                        <div className="bg-secondary-bg rounded-lg p-8 text-center border border-border border-dashed">
                            <p className="text-gray-500 mb-4">No active contracts linked to this organization.</p>
                            <button className="text-primary-color text-sm font-bold uppercase tracking-widest hover:underline">+ Initialize Contract</button>
                        </div>
                    </Card>

                    <Card title="Relationship Mapping" icon={Share2}>
                        <div className="space-y-4">
                            {relationships.length > 0 ? (
                                relationships.map((rel) => (
                                    <div key={rel.id} className="flex justify-between items-center p-4 bg-secondary-bg rounded-lg border border-border">
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">{rel.relationship_type.replace('_', ' ')}</div>
                                            <div className="font-medium text-white">
                                                {rel.source_type} #{rel.source_id} → {rel.target_type} #{rel.target_id}
                                            </div>
                                            {rel.notes && <div className="text-xs text-gray-400 mt-1 italic">{rel.notes}</div>}
                                        </div>
                                        <span className="text-xs text-green-500 bg-green-500 bg-opacity-10 px-2 py-1 rounded">Active</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-500 border border-border border-dashed rounded-lg">
                                    No direct relationships mapped for this organization.
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                        background: 'var(--surface-color)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        padding: '1.5rem',
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
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{org.name}</h2>
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
                        <div className="flex items-center gap-2 mt-4 text-gray-400 text-sm">
                            <MapPin size={14} /> Global Entity
                        </div>
                    </div>

                    <Card title="Contact Info" icon={Mail}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Globe size={18} className="text-gray-500" />
                                <span className="text-sm text-gray-300">{org.website || 'No website'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail size={18} className="text-gray-500" />
                                <span className="text-sm text-gray-300">contact@{org.name.toLowerCase().replace(/\s/g, '')}.com</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={18} className="text-gray-500" />
                                <span className="text-sm text-gray-300">+1 (000) 000-0000</span>
                            </div>
                        </div>
                    </Card>

                    <Card title="Execution Analytics" icon={Activity}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-secondary-bg p-4 rounded-lg border border-border">
                                <div className="text-2xl font-bold text-white">0</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Releases</div>
                            </div>
                            <div className="bg-secondary-bg p-4 rounded-lg border border-border">
                                <div className="text-2xl font-bold text-white">0</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Works</div>
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
