import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { NetworkService } from '../../services/network';
import { UserCircle, ChevronLeft, Mail, Phone, Building2, Star, Share2, FileText, Activity } from 'lucide-react';

const IndividualDetail = () => {
    const { id } = useParams();
    const [individual, setIndividual] = useState(null);
    const [relationships, setRelationships] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIndividualData = async () => {
            try {
                const [indData, relData] = await Promise.all([
                    NetworkService.getIndividual(id),
                    NetworkService.getRelationships()
                ]);
                setIndividual(indData);
                // Filter relationships where this individual is either source or target
                const relevantRels = relData.filter(r =>
                    (r.source_type === 'individual' && r.source_id === parseInt(id)) ||
                    (r.target_type === 'individual' && r.target_id === parseInt(id))
                );
                setRelationships(relevantRels);
            } catch (error) {
                console.error("Error fetching individual detail:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchIndividualData();
    }, [id]);

    if (loading) return <div className="p-8">Loading individual details...</div>;
    if (!individual) return <div className="p-8">Individual not found.</div>;

    const fullName = `${individual.first_name} ${individual.last_name}`;

    return (
        <div className="page-container p-8">
            <Link to="/network/individuals" className="flex items-center gap-2 text-primary-color mb-6 hover:underline">
                <ChevronLeft size={16} /> Back to Individuals
            </Link>

            <header className="flex justify-between items-start mb-10">
                <div className="flex gap-6 items-center">
                    <div className="w-24 h-24 bg-secondary-bg border-4 border-secondary-bg rounded-3xl overflow-hidden relative shadow-2xl">
                        {individual.image_url ? (
                            <img src={individual.image_url} alt={fullName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white bg-opacity-5 text-gray-500">
                                <UserCircle size={56} />
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-4xl font-bold">{fullName}</h1>
                            <span className="px-3 py-1 bg-primary-color bg-opacity-10 border border-primary-color border-opacity-20 rounded-full text-xs font-bold text-primary-color uppercase tracking-widest">
                                {individual.relationship_strength || 'Regular'}
                            </span>
                        </div>
                        <p className="text-gray-400 flex items-center gap-2 font-medium">
                            <Activity size={14} className="text-blue-400" /> {individual.role || 'Label Contributor'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-secondary-bg border border-border rounded-lg text-sm font-medium hover:bg-opacity-80">Update Identity</button>
                    <button className="px-4 py-2 bg-primary-color rounded-lg text-sm font-medium hover:bg-opacity-90">Manage Affiliations</button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-secondary-bg border border-border rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Building2 size={20} className="text-primary-color" /> Primary Affiliations
                        </h2>
                        <div className="space-y-4">
                            {individual.organizations && individual.organizations.length > 0 ? (
                                individual.organizations.map((org, index) => (
                                    <div key={index} className="flex justify-between items-center p-4 bg-white bg-opacity-5 rounded-lg border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-black bg-opacity-20 rounded-lg text-gray-400">
                                                <Building2 size={16} />
                                            </div>
                                            <div className="font-semibold text-white">{org.name}</div>
                                        </div>
                                        <Link to={`/network/organizations/${org.id}`} className="text-xs text-primary-color hover:underline">View Organization</Link>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-500 border border-border border-dashed rounded-lg">
                                    No organization affiliations recorded.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="bg-secondary-bg border border-border rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Share2 size={20} className="text-primary-color" /> Recent Relationships
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
                                        <div className="px-2 py-0.5 rounded text-[10px] bg-primary-color bg-opacity-10 text-primary-color border border-primary-color border-opacity-20 uppercase font-bold">
                                            Governed
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-black bg-opacity-20 rounded-lg border border-border border-dashed">
                                    <Share2 size={32} className="mx-auto text-gray-600 mb-3" />
                                    <p className="text-gray-400">No active network relationships tracked for this individual.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section className="bg-secondary-bg border border-border rounded-xl p-6">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Contact Layer</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Mail size={18} className="text-gray-600" />
                                <span className="text-sm text-gray-300">{individual.email || 'No email provided'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={18} className="text-gray-600" />
                                <span className="text-sm text-gray-300">{individual.phone || 'No phone provided'}</span>
                            </div>
                        </div>
                    </section>

                    <section className="bg-secondary-bg border border-border rounded-xl p-6">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Governance Status</h2>
                        <div className="p-4 bg-green-500 bg-opacity-10 border border-green-500 border-opacity-20 rounded-lg">
                            <div className="flex items-center gap-2 text-green-500 font-bold text-sm mb-1">
                                <Star size={14} fill="currentColor" /> Fully Compliant
                            </div>
                            <p className="text-xs text-gray-500">All necessary agreements and data points are present.</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default IndividualDetail;
