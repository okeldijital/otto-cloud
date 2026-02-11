import React, { useState, useEffect, useMemo } from 'react';
import { NetworkService } from '../../services/network';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircle, Plus, Search, Star, Mail, Building2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/DataTable';
import EntityForm from '../../components/EntityForm';
import Input, { Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { confirmAction } from '../../lib/tauri';

const Individuals = () => {
    const [individuals, setIndividuals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newInd, setNewInd] = useState({ first_name: '', last_name: '', email: '', role: '', relationship_strength: 'Regular' });
    const navigate = useNavigate();

    const fetchIndividuals = async () => {
        try {
            setLoading(true);
            const data = await NetworkService.getIndividuals();
            setIndividuals(data);
        } catch (error) {
            console.error("Error fetching individuals:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIndividuals();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await NetworkService.createIndividual(newInd);
            setShowAddModal(false);
            setNewInd({ first_name: '', last_name: '', email: '', role: '', relationship_strength: 'Regular' });
            fetchIndividuals();
        } catch (error) {
            console.error("Error creating individual:", error);
            alert("Failed to create individual. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (individual) => {
        if (await confirmAction(`Are you sure you want to delete ${individual.first_name} ${individual.last_name}?`, 'Delete Individual')) {
            try {
                await NetworkService.deleteIndividual(individual.id);
                fetchIndividuals();
            } catch (error) {
                console.error("Error deleting individual:", error);
                alert("Failed to delete individual.");
            }
        }
    };

    const filteredIndividuals = useMemo(() => {
        return individuals.filter(ind =>
            (ind.first_name + ' ' + ind.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ind.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [individuals, searchTerm]);

    const StrengthBadge = ({ strength }) => {
        let color = 'text-gray-400 bg-gray-400';
        if (strength === 'Core') color = 'text-primary-color bg-primary-color';
        if (strength === 'Regular') color = 'text-blue-400 bg-blue-400';

        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-tighter border border-opacity-30 flex items-center gap-1 ${color.split(' ')[0]} ${color.split(' ')[1]} bg-opacity-10 border-current`}>
                {strength === 'Core' && <Star size={10} fill="currentColor" />}
                {strength}
            </span>
        );
    };

    const columns = [
        {
            key: 'image_url',
            label: '',
            render: (row) => (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {row.image_url ? (
                        <img src={row.image_url} alt={row.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <UserCircle size={24} color="#cbd5e1" />
                    )}
                </div>
            )
        },
        {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (row) => (
                <Link to={`/network/individuals/${row.id}`} style={{ fontWeight: 600, color: 'var(--primary-color)', textDecoration: 'none' }}>
                    {row.first_name} {row.last_name}
                </Link>
            )
        },
        {
            key: 'role',
            label: 'Role',
            sortable: true,
            render: (row) => <span style={{ color: 'var(--text-color)' }}>{row.role || 'Professional'}</span>
        },
        {
            key: 'email',
            label: 'Email',
            render: (row) => row.email ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                    <Mail size={14} />
                    {row.email}
                </div>
            ) : '-'
        },
        {
            key: 'organization',
            label: 'Organization',
            render: (row) => row.organizations?.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                    <Building2 size={14} />
                    {row.organizations[0].name}
                </div>
            ) : '-'
        },
        {
            key: 'relationship_strength',
            label: 'Relationship',
            sortable: true,
            render: (row) => <StrengthBadge strength={row.relationship_strength || 'Regular'} />
        }
    ];

    return (
        <div className="entity-page">
            <PageHeader
                title="Individuals"
                subtitle="Human collaborators and role-first identities."
                actions={
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div className="relative" style={{ minWidth: '250px' }}>
                            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                style={{ width: '100%', paddingLeft: '2.5rem', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', outline: 'none' }}
                                placeholder="Search individuals..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="primary"
                            icon={Plus}
                            onClick={() => setShowAddModal(true)}
                        >
                            Add Individual
                        </Button>
                    </div>
                }
            />

            <DataTable
                columns={columns}
                data={filteredIndividuals}
                isLoading={loading}
                onDelete={handleDelete}
                onEdit={(row) => navigate(`/network/individuals/${row.id}`)}
            />

            <EntityForm
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="New Individual"
                onSubmit={handleCreate}
                isSubmitting={isSubmitting}
            >
                <div className="form-row">
                    <Input
                        label="First Name"
                        value={newInd.first_name}
                        onChange={(e) => setNewInd({ ...newInd, first_name: e.target.value })}
                        required
                    />
                    <Input
                        label="Last Name"
                        value={newInd.last_name}
                        onChange={(e) => setNewInd({ ...newInd, last_name: e.target.value })}
                        required
                    />
                </div>
                <Input
                    label="Email"
                    type="email"
                    value={newInd.email}
                    onChange={(e) => setNewInd({ ...newInd, email: e.target.value })}
                    required
                />
                <Input
                    label="Role / Title"
                    value={newInd.role}
                    onChange={(e) => setNewInd({ ...newInd, role: e.target.value })}
                    placeholder="e.g. Mixing Engineer"
                />
                <Select
                    label="Relationship Strength"
                    value={newInd.relationship_strength}
                    onChange={(e) => setNewInd({ ...newInd, relationship_strength: e.target.value })}
                >
                    <option value="Core">Core</option>
                    <option value="Regular">Regular</option>
                    <option value="Ad-hoc">Ad-hoc</option>
                </Select>
            </EntityForm>
        </div>
    );
};

export default Individuals;
