import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { NetworkService } from '../../services/network';
import { Building2, ChevronLeft, Globe, Mail, Phone, MapPin, FileText, Share2, List } from 'lucide-react';

const OrganizationDetail = () => {
    const { id } = useParams();
    const [org, setOrg] = useState(null);
    const [relationships, setRelationships] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrgData = async () => {
            try {
                const [orgData, relData] = await Promise.all([
                    NetworkService.getOrganization(id),
                    NetworkService.getRelationships()
                ]);
                setOrg(orgData);
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
        fetchOrgData();
    }, [id]);

    if (loading) return <div className="p-8">Loading organization details...</div>;
    if (!org) return <div className="p-8">Organization not found.</div>;

    return (
        <div className="page-container p-8">
            <Link to="/network/organizations" className="flex items-center gap-2 text-primary-color mb-6 hover:underline">
                <ChevronLeft size={16} /> Back to Organizations
            </Link>

            <header className="flex justify-between items-start mb-10">
                <div className="flex gap-6 items-center">
                    <div className="w-20 h-20 bg-secondary-bg border border-border rounded-2xl flex items-center justify-center text-primary-color">
                        <Building2 size={40} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-4xl font-bold">{org.name}</h1>
                            <span className="px-3 py-1 bg-white bg-opacity-10 rounded-full text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {org.org_type || 'Organization'}
                            </span>
                        </div>
                        <p className="text-gray-400 flex items-center gap-2">
                            <MapPin size={14} /> Global Entity
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-secondary-bg border border-border rounded-lg text-sm font-medium hover:bg-opacity-80">Edit Profile</button>
                    <button className="px-4 py-2 bg-primary-color rounded-lg text-sm font-medium hover:bg-opacity-90">Manage Contracts</button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-secondary-bg border border-border rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <FileText size={20} className="text-primary-color" /> Governing Contracts
                        </h2>
                        <div className="bg-black bg-opacity-20 rounded-lg p-8 text-center border border-border border-dashed">
                            <p className="text-gray-500 mb-4">No active contracts linked to this organization.</p>
                            <button className="text-primary-color text-sm font-bold uppercase tracking-widest">+ Initialize Contract</button>
                        </div>
                    </section>

                    <section className="bg-secondary-bg border border-border rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Share2 size={20} className="text-primary-color" /> Relationship Mapping
                        </h2>
                        <div className="space-y-4">
                            {relationships.length > 0 ? (
                                relationships.map((rel) => (
                                    <div key={rel.id} className="flex justify-between items-center p-4 bg-white bg-opacity-5 rounded-lg border border-border border-opacity-50">
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
                    </section>
                </div>

                <div className="space-y-8">
                    <section className="bg-secondary-bg border border-border rounded-xl p-6">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Contact Info</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Globe size={18} className="text-gray-600" />
                                <span className="text-sm text-gray-300">{org.website || 'No website'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail size={18} className="text-gray-600" />
                                <span className="text-sm text-gray-300">contact@{org.name.toLowerCase().replace(/\s/g, '')}.com</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={18} className="text-gray-600" />
                                <span className="text-sm text-gray-300">+1 (000) 000-0000</span>
                            </div>
                        </div>
                    </section>

                    <section className="bg-secondary-bg border border-border rounded-xl p-6">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Execution Analytics</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black bg-opacity-20 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-white">0</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Releases</div>
                            </div>
                            <div className="bg-black bg-opacity-20 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-white">0</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Works</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default OrganizationDetail;
