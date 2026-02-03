import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { NetworkService } from '../../services/network';
import { Globe, ChevronLeft, Key, MapPin, Database, ExternalLink, Activity, Settings, ShieldCheck } from 'lucide-react';

const PlatformDetail = () => {
    const { id } = useParams();
    const [platform, setPlatform] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlatform = async () => {
            try {
                const data = await NetworkService.getPlatforms();
                const found = data.find(p => p.id === parseInt(id));
                setPlatform(found);
            } catch (error) {
                console.error("Error fetching platform detail:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlatform();
    }, [id]);

    if (loading) return <div className="p-8">Loading platform technical metadata...</div>;
    if (!platform) return <div className="p-8">Platform not found.</div>;

    return (
        <div className="page-container p-8">
            <Link to="/network/platforms" className="flex items-center gap-2 text-primary-color mb-6 hover:underline">
                <ChevronLeft size={16} /> Back to Platforms
            </Link>

            <header className="flex justify-between items-start mb-10">
                <div className="flex gap-6 items-center">
                    <div className="w-20 h-20 bg-secondary-bg border border-border rounded-2xl flex items-center justify-center text-blue-400">
                        <Database size={40} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-4xl font-bold">{platform.name}</h1>
                            <span className="px-3 py-1 bg-blue-500 bg-opacity-10 rounded-full text-xs font-bold text-blue-400 uppercase tracking-widest">
                                {platform.platform_type || 'Platform'}
                            </span>
                        </div>
                        <p className="text-gray-400 flex items-center gap-2">
                            <Activity size={14} className="text-green-500" /> Technical Resource
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-secondary-bg border border-border rounded-lg text-sm font-medium hover:bg-opacity-80">Sync Data</button>
                    <button className="px-4 py-2 bg-primary-color rounded-lg text-sm font-medium hover:bg-opacity-90">Credential Settings</button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-secondary-bg border border-border rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Settings size={20} className="text-primary-color" /> Technical Configuration
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-black bg-opacity-20 rounded-lg">
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Platform Portal</div>
                                <div className="flex items-center gap-2">
                                    {platform.portal_url ? (
                                        <a href={platform.portal_url} target="_blank" rel="noreferrer" className="text-primary-color truncate flex items-center gap-1">
                                            {platform.portal_url} <ExternalLink size={12} />
                                        </a>
                                    ) : (
                                        <span className="text-gray-400 italic font-normal">Not configured</span>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 bg-black bg-opacity-20 rounded-lg">
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Account Reference</div>
                                <div className="font-mono text-white text-lg">{platform.account_reference || 'NONE'}</div>
                            </div>
                            <div className="p-4 bg-black bg-opacity-20 rounded-lg">
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Territory Coverage</div>
                                <div className="text-white">{platform.territory_coverage || 'Worldwide'}</div>
                            </div>
                            <div className="p-4 bg-black bg-opacity-20 rounded-lg">
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Integration Status</div>
                                <div className="text-green-500 font-bold">LEGACY (MANUAL)</div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section className="bg-secondary-bg border border-border rounded-xl p-6">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Execution Log</h2>
                        <div className="space-y-4">
                            <div className="text-xs text-gray-500 py-4 text-center border-t border-border">
                                No recent activity logged for this platform resource.
                            </div>
                        </div>
                    </section>

                    <section className="bg-secondary-bg border border-border rounded-xl p-6 text-center">
                        <ShieldCheck size={32} className="mx-auto text-green-500 mb-4" />
                        <h3 className="font-bold mb-1">Validated Resource</h3>
                        <p className="text-xs text-gray-500">This platform is a confirmed node in your label's supply chain.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PlatformDetail;
