import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NetworkService } from '../../services/network';
import { confirmAction } from '../../lib/tauri';
import DataTable from '../../components/DataTable';
import { Users, Building2, Globe, Search } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';

const AllContacts = () => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeType, setActiveType] = useState('All');
    const navigate = useNavigate();

    const fetchAll = async () => {
        setLoading(true);
        try {
            const data = await NetworkService.getAllContacts();
            setContacts(data);
        } catch (error) {
            console.error("Error fetching all contacts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => {
            const matchesSearch = (c.name || `${c.first_name} ${c.last_name}`).toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = activeType === 'All' || c.item_type === activeType;
            return matchesSearch && matchesType;
        });
    }, [contacts, searchTerm, activeType]);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Individual': return <Users size={16} />;
            case 'Organization': return <Building2 size={16} />;
            case 'Platform': return <Globe size={16} />;
            default: return null;
        }
    };

    const handleDelete = async (contact) => {
        if (await confirmAction(`Are you sure you want to delete ${contact.name || contact.first_name}? This cannot be undone.`, 'Delete Contact')) {
            try {
                let deleteSuccess = false;
                if (contact.item_type === 'Organization') {
                    await NetworkService.deleteOrganization(contact.id);
                    deleteSuccess = true;
                } else if (contact.item_type === 'Individual') {
                    await NetworkService.deleteIndividual(contact.id);
                    deleteSuccess = true;
                } else if (contact.item_type === 'Platform') {
                    await NetworkService.deletePlatform(contact.id);
                    deleteSuccess = true;
                }

                if (deleteSuccess) {
                    fetchAll();
                }
            } catch (error) {
                console.error('Failed to delete contact:', error);
                alert('Failed to delete contact: ' + (error.response?.data?.detail || error.message));
            }
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (row) => (
                <Link
                    to={`/network/${row.item_type.toLowerCase()}s/${row.id}`}
                    style={{ fontWeight: 600, color: 'var(--primary-color)', textDecoration: 'none' }}
                >
                    {row.item_type === 'Individual' ? `${row.first_name} ${row.last_name}` : row.name}
                </Link>
            )
        },
        {
            key: 'item_type',
            label: 'Type',
            sortable: true,
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
                    <span style={{ color: '#94a3b8' }}>{getTypeIcon(row.item_type)}</span>
                    <span>{row.item_type}</span>
                </div>
            )
        },
        {
            key: 'role',
            label: 'Role / Category',
            render: (row) => (
                <span style={{ color: '#94a3b8' }}>
                    {row.role || row.org_type || row.platform_type || '-'}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: () => (
                <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                    Active
                </span>
            )
        }
    ];

    return (
        <div className="entity-page">
            <PageHeader
                title="All Contacts"
                subtitle="Single source of truth for the entire professional ecosystem."
                actions={
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div className="relative" style={{ minWidth: '200px' }}>
                            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                style={{ width: '100%', paddingLeft: '2.5rem', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', outline: 'none' }}
                                placeholder="Search contacts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            style={{
                                height: '40px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--surface-color)',
                                color: 'var(--text-color)',
                                padding: '0 1rem',
                                outline: 'none'
                            }}
                            value={activeType}
                            onChange={(e) => setActiveType(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            <option value="Individual">Individuals</option>
                            <option value="Organization">Organizations</option>
                            <option value="Platform">Platforms</option>
                        </select>
                    </div>
                }
            />

            <DataTable
                columns={columns}
                data={filteredContacts}
                isLoading={loading}
                onDelete={handleDelete}
                onEdit={(row) => navigate(`/network/${row.item_type.toLowerCase()}s/${row.id}`)}
            />
        </div>
    );
};

export default AllContacts;
