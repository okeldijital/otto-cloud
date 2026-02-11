import React, { useState, useEffect, useMemo } from 'react';
import { NetworkService } from '../../services/network';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, ExternalLink, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/DataTable';
import EntityForm from '../../components/EntityForm';
import Input, { Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { confirmAction } from '../../lib/tauri';

const Organizations = () => {
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newOrg, setNewOrg] = useState({ name: '', org_type: 'Distributor', website: '', address: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const fetchOrgs = async () => {
        try {
            setLoading(true);
            const data = await NetworkService.getOrganizations();
            setOrgs(data);
        } catch (error) {
            console.error("Error fetching organizations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await NetworkService.createOrganization(newOrg);
            setShowAddModal(false);
            setNewOrg({ name: '', org_type: 'Distributor', website: '', address: '' });
            fetchOrgs();
        } catch (error) {
            console.error("Error creating organization:", error);
            alert("Failed to create organization. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (org) => {
        if (await confirmAction(`Are you sure you want to delete ${org.name}?`, 'Delete Organization')) {
            try {
                await NetworkService.deleteOrganization(org.id);
                fetchOrgs();
            } catch (error) {
                console.error("Error deleting organization:", error);
                alert("Failed to delete organization.");
            }
        }
    };

    const filteredOrgs = useMemo(() => {
        return orgs.filter(org =>
            org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (org.org_type || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [orgs, searchTerm]);

    const getGovernanceBadge = (status) => {
        switch (status) {
            case 'Active':
                return <span className="flex items-center gap-1 text-xs text-green-500"><ShieldCheck size={14} /> Active agreement</span>;
            case 'Expired':
                return <span className="flex items-center gap-1 text-xs text-amber-500"><Clock size={14} /> Expired agreement</span>;
            case 'None':
                return <span className="flex items-center gap-1 text-xs text-red-500"><ShieldAlert size={14} /> No contract</span>;
            default:
                return <span className="flex items-center gap-1 text-xs text-green-500"><ShieldCheck size={14} /> Active agreement</span>;
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Organization Name',
            sortable: true,
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', background: '#f1f5f9', borderRadius: '6px', color: 'var(--primary-color)' }}>
                        <Building2 size={18} />
                    </div>
                    <div>
                        <Link to={`/network/organizations/${row.id}`} style={{ display: 'block', fontWeight: 600, color: 'var(--primary-color)', textDecoration: 'none' }}>
                            {row.name}
                        </Link>
                        {row.website && (
                            <a href={row.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                                {row.website.replace(/^https?:\/\//, '')} <ExternalLink size={10} />
                            </a>
                        )}
                    </div>
                </div>
            )
        },
        {
            key: 'org_type',
            label: 'Type',
            sortable: true,
            render: (row) => (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                    {row.org_type || 'Other'}
                </span>
            )
        },
        {
            key: 'contracts',
            label: 'Contracts',
            render: () => <span style={{ color: '#64748b' }}>1 Active</span>
        },
        {
            key: 'works',
            label: 'Works',
            render: () => <span style={{ color: '#64748b' }}>24 Works</span>
        },
        {
            key: 'governance',
            label: 'Governance',
            render: () => getGovernanceBadge('Active')
        }
    ];

    return (
        <div className="entity-page">
            <PageHeader
                title="Organizations"
                subtitle="External entities with legal or operational relevance."
                actions={
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div className="relative" style={{ minWidth: '250px' }}>
                            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                style={{ width: '100%', paddingLeft: '2.5rem', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', outline: 'none' }}
                                placeholder="Search organizations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="primary"
                            icon={Plus}
                            onClick={() => setShowAddModal(true)}
                        >
                            Add Organization
                        </Button>
                    </div>
                }
            />

            <DataTable
                columns={columns}
                data={filteredOrgs}
                isLoading={loading}
                onDelete={handleDelete}
                onEdit={(row) => navigate(`/network/organizations/${row.id}`)}
            />

            <EntityForm
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="New Organization"
                onSubmit={handleCreate}
                isSubmitting={isSubmitting}
            >
                <Input
                    label="Organization Name"
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                    required
                    placeholder="e.g. Universal Music Group"
                />
                <Select
                    label="Type"
                    value={newOrg.org_type}
                    onChange={(e) => setNewOrg({ ...newOrg, org_type: e.target.value })}
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
                    value={newOrg.website}
                    onChange={(e) => setNewOrg({ ...newOrg, website: e.target.value })}
                    placeholder="https://example.com"
                />
            </EntityForm>
        </div>
    );
};

export default Organizations;
