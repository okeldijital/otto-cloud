import React, { useState, useEffect } from 'react';
import { NetworkService } from '../../services/network';
import { Link } from 'react-router-dom';
import { Building2, Plus, Search, ExternalLink, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';

const Organizations = () => {
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newOrg, setNewOrg] = useState({ name: '', org_type: 'Distributor', website: '', address: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (loading) return <div className="p-8">Loading Organizations...</div>;

    return (
        <div className="page-container p-8">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Organizations</h1>
                    <p className="text-gray-400">External entities with legal or operational relevance.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-color rounded-lg hover:bg-opacity-90 transition-all font-medium"
                >
                    <Plus size={18} />
                    <span>Add Organization</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orgs.map((org) => (
                    <div key={org.id} className="bg-secondary-bg border border-border rounded-xl p-6 hover:border-primary-color transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white bg-opacity-5 rounded-lg text-primary-color text-opacity-80 group-hover:text-opacity-100 transition-all">
                                <Building2 size={24} />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="px-2 py-1 rounded text-[10px] uppercase font-bold bg-white bg-opacity-10 text-gray-400 tracking-wider">
                                    {org.org_type || 'Other'}
                                </span>
                            </div>
                        </div>

                        <Link to={`/network/organizations/${org.id}`}>
                            <h3 className="text-xl font-bold mb-1 hover:text-primary-color transition-colors">{org.name}</h3>
                        </Link>
                        <p className="text-sm text-gray-500 mb-6 flex items-center gap-1">
                            {org.website ? (
                                <a href={org.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary-color">
                                    {org.website} <ExternalLink size={12} />
                                </a>
                            ) : 'No website listed'}
                        </p>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Contracts</span>
                                <span className="font-medium">1 Active</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Works Administered</span>
                                <span className="font-medium">24 Works</span>
                            </div>
                        </div>

                        <div className="pt-4 border-top border-border">
                            {getGovernanceBadge('Active')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Organization Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-secondary-bg border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold">New Organization</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">×</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Organization Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white"
                                    value={newOrg.name}
                                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                                    placeholder="e.g. Universal Music Group"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                <select
                                    className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white appearance-none"
                                    value={newOrg.org_type}
                                    onChange={(e) => setNewOrg({ ...newOrg, org_type: e.target.value })}
                                >
                                    <option value="Distributor">Distributor</option>
                                    <option value="Publisher">Publisher</option>
                                    <option value="Label">Label</option>
                                    <option value="PRO">PRO</option>
                                    <option value="Legal">Legal</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Website</label>
                                <input
                                    type="url"
                                    className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white"
                                    value={newOrg.website}
                                    onChange={(e) => setNewOrg({ ...newOrg, website: e.target.value })}
                                    placeholder="https://example.com"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 bg-white bg-opacity-5 rounded-lg font-medium hover:bg-opacity-10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-primary-color rounded-lg font-medium hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Organizations;
