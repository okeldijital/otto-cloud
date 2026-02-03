import React, { useState, useEffect } from 'react';
import { NetworkService } from '../../services/network';
import { Link } from 'react-router-dom';
import { UserCircle, Plus, Mail, Phone, Building2, Star } from 'lucide-react';

const Individuals = () => {
    const [individuals, setIndividuals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newInd, setNewInd] = useState({ first_name: '', last_name: '', email: '', role: '', relationship_strength: 'Regular' });
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (loading) return <div className="p-8">Loading Individuals...</div>;

    return (
        <div className="page-container p-8">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Individuals</h1>
                    <p className="text-gray-400">Human collaborators and role-first identities.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-color rounded-lg hover:bg-opacity-90 transition-all font-medium"
                >
                    <Plus size={18} />
                    <span>Add Individual</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {individuals.map((ind) => (
                    <div key={ind.id} className="bg-secondary-bg border border-border rounded-xl overflow-hidden hover:border-primary-color transition-all group">
                        <div className="h-24 bg-gradient-to-r from-primary-color to-blue-600 opacity-20 group-hover:opacity-30 transition-all"></div>
                        <div className="px-6 pb-6 -mt-12">
                            <div className="w-20 h-20 rounded-xl bg-secondary-bg border-4 border-secondary-bg mb-4 overflow-hidden relative">
                                {ind.image_url ? (
                                    <img src={ind.image_url} alt={ind.first_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-white bg-opacity-5 text-gray-500">
                                        <UserCircle size={48} />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-start mb-2">
                                <Link to={`/network/individuals/${ind.id}`}>
                                    <h3 className="text-lg font-bold hover:text-primary-color transition-colors">{ind.first_name} {ind.last_name}</h3>
                                </Link>
                                <StrengthBadge strength={ind.relationship_strength || 'Regular'} />
                            </div>

                            <div className="text-sm font-medium text-primary-color opacity-80 mb-4">{ind.role || 'Professional'}</div>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Mail size={14} />
                                    <span className="truncate">{ind.email || 'No email'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Building2 size={14} />
                                    <span>{ind.organizations?.length > 0 ? ind.organizations[0].name : 'No affiliation'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Link
                                    to={`/network/individuals/${ind.id}`}
                                    className="flex-1 text-center py-2 bg-white bg-opacity-5 rounded-lg text-xs font-semibold hover:bg-opacity-10 transition-all text-white no-underline"
                                >
                                    View Profile
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Individual Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-secondary-bg border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold">New Individual</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">×</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white"
                                        value={newInd.first_name}
                                        onChange={(e) => setNewInd({ ...newInd, first_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white"
                                        value={newInd.last_name}
                                        onChange={(e) => setNewInd({ ...newInd, last_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white"
                                    value={newInd.email}
                                    onChange={(e) => setNewInd({ ...newInd, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role / Title</label>
                                <input
                                    type="text"
                                    className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white"
                                    value={newInd.role}
                                    onChange={(e) => setNewInd({ ...newInd, role: e.target.value })}
                                    placeholder="e.g. Mixing Engineer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Relationship</label>
                                <select
                                    className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white appearance-none"
                                    value={newInd.relationship_strength}
                                    onChange={(e) => setNewInd({ ...newInd, relationship_strength: e.target.value })}
                                >
                                    <option value="Core">Core</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Ad-hoc">Ad-hoc</option>
                                </select>
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

export default Individuals;
