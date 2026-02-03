import React, { useState, useEffect } from 'react';
import { NetworkService } from '../../services/network';
import { Globe, Plus, ExternalLink, Key, MapPin, Database } from 'lucide-react';

const Platforms = () => {
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPlatform, setNewPlatform] = useState({ name: '', platform_type: 'Distribution', portal_url: '', account_reference: '', territory_coverage: 'Worldwide' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPlatforms = async () => {
        try {
            setLoading(true);
            const data = await NetworkService.getPlatforms();
            setPlatforms(data);
        } catch (error) {
            console.error("Error fetching platforms:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlatforms();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await NetworkService.createPlatform(newPlatform);
            setShowAddModal(false);
            setNewPlatform({ name: '', platform_type: 'Distribution', portal_url: '', account_reference: '', territory_coverage: 'Worldwide' });
            fetchPlatforms();
        } catch (error) {
            console.error("Error creating platform:", error);
            alert("Failed to create platform. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8">Loading Platforms...</div>;

    return (
        <div className="page-container p-8">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Platforms</h1>
                    <p className="text-gray-400">Non-human but critical actors in the label ecosystem.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-color rounded-lg hover:bg-opacity-90 transition-all font-medium"
                >
                    <Plus size={18} />
                    <span>Add Platform</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {platforms.map((platform) => (
                    <div key={platform.id} className="bg-secondary-bg border border-border rounded-xl p-6 hover:border-primary-color transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-white bg-opacity-5 rounded-lg text-blue-400">
                                <Database size={24} />
                            </div>
                            <span className="px-2 py-1 rounded text-[10px] uppercase font-bold bg-blue-500 bg-opacity-10 text-blue-400">
                                {platform.platform_type || 'Other'}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold mb-2">{platform.name}</h3>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <div className="flex items-start gap-3 text-sm">
                                <Globe size={16} className="text-gray-500 mt-0.5" />
                                <div>
                                    <div className="text-gray-500 text-xs">Portal URL</div>
                                    {platform.portal_url ? (
                                        <a href={platform.portal_url} target="_blank" rel="noreferrer" className="text-primary-color flex items-center gap-1">
                                            {platform.portal_url} <ExternalLink size={12} />
                                        </a>
                                    ) : 'Not specified'}
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-sm">
                                <Key size={16} className="text-gray-500 mt-0.5" />
                                <div>
                                    <div className="text-gray-500 text-xs">Account Ref</div>
                                    <div className="font-mono text-gray-300">{platform.account_reference || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-sm">
                                <MapPin size={16} className="text-gray-500 mt-0.5" />
                                <div>
                                    <div className="text-gray-500 text-xs">Territory Coverage</div>
                                    <div className="text-gray-300">{platform.territory_coverage || 'Worldwide'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between text-xs text-gray-500 uppercase tracking-widest font-bold">
                            <span>Linked Releases: 0</span>
                            <span className="text-green-500">Contract ✅</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Platform Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-secondary-bg border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold">New Platform Resource</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">×</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Platform Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white"
                                    value={newPlatform.name}
                                    onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
                                    placeholder="e.g. Spotify for Artists"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Platform Type</label>
                                <select
                                    className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white appearance-none"
                                    value={newPlatform.platform_type}
                                    onChange={(e) => setNewPlatform({ ...newPlatform, platform_type: e.target.value })}
                                >
                                    <option value="Distribution">Distribution</option>
                                    <option value="Rights Collection">Rights Collection</option>
                                    <option value="Analytics">Analytics</option>
                                    <option value="Payments">Payments</option>
                                    <option value="Social">Social</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Portal URL</label>
                                <input
                                    type="url"
                                    className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white"
                                    value={newPlatform.portal_url}
                                    onChange={(e) => setNewPlatform({ ...newPlatform, portal_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Reference</label>
                                <input
                                    type="text"
                                    className="w-full bg-white bg-opacity-5 border border-border rounded-lg px-4 py-2 focus:border-primary-color outline-none text-white"
                                    value={newPlatform.account_reference}
                                    onChange={(e) => setNewPlatform({ ...newPlatform, account_reference: e.target.value })}
                                    placeholder="e.g. USER-12345"
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

export default Platforms;
