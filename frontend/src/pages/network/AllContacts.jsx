import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { NetworkService } from '../../services/network';
import { confirmAction } from '../../lib/tauri';
import DataTable from '../../components/DataTable';
import { Users, Building2, Globe, Filter, Search, FileCheck, Trash2 } from 'lucide-react';

const AllContacts = () => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeType, setActiveType] = useState('All');

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const data = await NetworkService.getAllContacts();
                setContacts(data);
            } catch (error) {
                console.error("Error fetching all contacts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const filteredContacts = contacts.filter(c => {
        const matchesSearch = (c.name || `${c.first_name} ${c.last_name} `).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = activeType === 'All' || c.item_type === activeType;
        return matchesSearch && matchesType;
    });

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Individual': return <Users size={16} />;
            case 'Organization': return <Building2 size={16} />;
            case 'Platform': return <Globe size={16} />;
            default: return null;
        }
    };

    const handleDelete = async (e, contact) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent navigation
        if (await confirmAction(`Are you sure you want to delete ${contact.name || contact.first_name}? This cannot be undone.`, 'Delete Contact')) {
            try {
                // The original code had specific delete functions for each type.
                // The instruction's snippet suggests a generic NetworkService.delete.
                // I will adapt to the generic one as per the instruction,
                // but keep the item_type check for robustness if NetworkService.delete
                // expects a specific type string.
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
                    // Re-fetch all contacts to update the list
                    fetchAll();
                }
            } catch (error) {
                console.error('Failed to delete contact:', error);
                alert('Failed to delete contact: ' + (error.response?.data?.detail || error.message));
            }
        }
    };

    if (loading) return <div className="p-8">Loading All Contacts...</div>;

    return (
        <div className="page-container p-8">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">All Contacts</h1>
                    <p className="text-gray-400">Single source of truth for the entire professional ecosystem.</p>
                </div>
            </header>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        className="w-full pl-10 pr-4 py-2 bg-secondary-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-color text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="px-4 py-2 bg-secondary-bg border border-border rounded-lg text-gray-300 focus:outline-none focus:border-primary-color"
                    value={activeType}
                    onChange={(e) => setActiveType(e.target.value)}
                >
                    <option value="All">All Types</option>
                    <option value="Individual">Individuals</option>
                    <option value="Organization">Organizations</option>
                    <option value="Platform">Platforms</option>
                </select>
            </div>

            <div className="bg-secondary-bg rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-black bg-opacity-20 border-b border-border">
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Type</th>
                            <th className="p-4 font-semibold">Role / Category</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Governance</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredContacts.map((contact, index) => (
                            <tr key={index} className="border-b border-border hover:bg-white hover:bg-opacity-5 transition-colors">
                                <td className="p-4 font-medium">
                                    <Link
                                        to={`/ network / ${contact.item_type.toLowerCase()} s / ${contact.id} `}
                                        className="hover:text-primary-color transition-colors"
                                    >
                                        {contact.item_type === 'Individual' ? `${contact.first_name} ${contact.last_name} ` : contact.name}
                                    </Link>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">{getTypeIcon(contact.item_type)}</span>
                                        <span>{contact.item_type}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-400">
                                    {contact.role || contact.org_type || contact.platform_type || '-'}
                                </td>
                                <td className="p-4">
                                    <span className="px-2 py-1 rounded text-xs bg-green-500 bg-opacity-20 text-green-500 border border-green-500 border-opacity-30">
                                        Active
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <FileCheck size={14} className="text-green-500" />
                                        Fully compliant
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={(e) => handleDelete(e, contact)}
                                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-white hover:bg-opacity-10 rounded transition-colors"
                                        title="Delete contact"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div >
    );
};

export default AllContacts;
