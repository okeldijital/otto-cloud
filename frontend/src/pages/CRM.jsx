import React, { useState, useEffect } from 'react';
import { CRMService } from '../services/crm';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import { Building2, UserCircle2, Mail, Phone, Globe, Plus, Search } from 'lucide-react';

const CRM = () => {
    const [activeTab, setActiveTab] = useState('companies');
    const [companies, setCompanies] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialCompanyState = { name: '', type: 'Distributor', website: '', address: '' };
    const initialContactState = { first_name: '', last_name: '', email: '', phone: '', role: '', company_id: '' };

    const [formData, setFormData] = useState(initialCompanyState);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [companiesData, contactsData] = await Promise.all([
                CRMService.getCompanies(),
                CRMService.getContacts()
            ]);
            setCompanies(companiesData);
            setContacts(contactsData);
        } catch (error) {
            console.error('Failed to fetch CRM data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = () => {
        setEditingItem(null);
        setFormData(activeTab === 'companies' ? initialCompanyState : initialContactState);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (item) => {
        const name = activeTab === 'companies' ? item.name : `${item.first_name} ${item.last_name}`;
        if (window.confirm(`Delete ${name}?`)) {
            try {
                if (activeTab === 'companies') await CRMService.deleteCompany(item.id);
                else await CRMService.deleteContact(item.id);
                fetchData();
            } catch (error) {
                console.error('Delete failed:', error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (activeTab === 'companies') {
                if (editingItem) await CRMService.updateCompany(editingItem.id, formData);
                else await CRMService.createCompany(formData);
            } else {
                const submitData = { ...formData };
                if (submitData.company_id === '') submitData.company_id = null;
                if (editingItem) await CRMService.updateContact(editingItem.id, submitData);
                else await CRMService.createContact(submitData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const companyColumns = [
        {
            key: 'name',
            label: 'Company',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="crm-icon company"><Building2 size={16} /></div>
                    <span style={{ fontWeight: 600 }}>{row.name}</span>
                </div>
            )
        },
        { key: 'type', label: 'Type' },
        {
            key: 'website',
            label: 'Website',
            render: (row) => row.website ? <a href={row.website} target="_blank" className="link-primary">{row.website}</a> : '-'
        },
        {
            key: 'contacts',
            label: 'Contacts',
            render: (row) => row.contacts?.length || 0
        }
    ];

    const contactColumns = [
        {
            key: 'name',
            label: 'Contact',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="crm-icon contact"><UserCircle2 size={16} /></div>
                    <span style={{ fontWeight: 600 }}>{row.first_name} {row.last_name}</span>
                </div>
            )
        },
        { key: 'role', label: 'Role' },
        {
            key: 'company',
            label: 'Company',
            render: (row) => companies.find(c => c.id === row.company_id)?.name || '-'
        },
        {
            key: 'email',
            label: 'Email',
            render: (row) => row.email ? <a href={`mailto:${row.email}`} className="link-muted"><Mail size={12} /> {row.email}</a> : '-'
        }
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">CRM Dashboard</h1>
                    <p className="page-subtitle">Manage companies and professional contacts</p>
                </div>
                <button className="btn-primary" onClick={handleCreate}>
                    <Plus size={18} />
                    New {activeTab === 'companies' ? 'Company' : 'Contact'}
                </button>
            </div>

            <div className="detail-tabs">
                <button
                    className={`tab-btn ${activeTab === 'companies' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('companies'); setFormData(initialCompanyState); }}
                >
                    Companies
                </button>
                <button
                    className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('contacts'); setFormData(initialContactState); }}
                >
                    Contacts
                </button>
            </div>

            <DataTable
                columns={activeTab === 'companies' ? companyColumns : contactColumns}
                data={activeTab === 'companies' ? companies : contacts}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? `Edit ${activeTab === 'companies' ? 'Company' : 'Contact'}` : `New ${activeTab === 'companies' ? 'Company' : 'Contact'}`}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                {activeTab === 'companies' ? (
                    <>
                        <div className="form-group">
                            <label>Company Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label>Business Type</label>
                                <select
                                    value={formData.type || ''}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="Distributor">Distributor</option>
                                    <option value="Label">Label</option>
                                    <option value="Publisher">Publisher</option>
                                    <option value="PR Agency">PR Agency</option>
                                    <option value="Legal">Legal</option>
                                </select>
                            </div>
                            <div className="form-group flex-1">
                                <label>Website</label>
                                <input
                                    type="url"
                                    value={formData.website || ''}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Office Address</label>
                            <textarea
                                value={formData.address || ''}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                rows="3"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    value={formData.first_name || ''}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group flex-1">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    value={formData.last_name || ''}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group flex-1">
                                <label>Phone Number</label>
                                <input
                                    type="text"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label>Company</label>
                                <select
                                    value={formData.company_id || ''}
                                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                                >
                                    <option value="">Select Company...</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group flex-1">
                                <label>Job Role</label>
                                <input
                                    type="text"
                                    value={formData.role || ''}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    placeholder="e.g. CEO, Manager"
                                />
                            </div>
                        </div>
                    </>
                )}
            </EntityForm>

            <style>{`
                .crm-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .crm-icon.company { background: #eff6ff; color: #2563eb; }
                .crm-icon.contact { background: #fdf2f8; color: #db2777; }
                .link-primary { color: var(--primary-color); text-decoration: none; font-size: 0.875rem; }
                .link-primary:hover { text-decoration: underline; }
                .link-muted { color: var(--text-muted); text-decoration: none; display: flex; align-items: center; gap: 4px; font-size: 0.875rem; }
                .flex-1 { flex: 1; }
            `}</style>
        </div>
    );
};

export default CRM;
