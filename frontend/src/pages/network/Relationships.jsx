import React, { useState, useEffect } from 'react';
import { NetworkService } from '../../services/network';
import { Share2, Plus, ArrowRight, Calendar, Info, FileText } from 'lucide-react';

const Relationships = () => {
    const [relationships, setRelationships] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRelationships = async () => {
            try {
                const data = await NetworkService.getRelationships();
                setRelationships(data);
            } catch (error) {
                console.error("Error fetching relationships:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRelationships();
    }, []);

    const RelationshipCard = ({ rel }) => (
        <div className="bg-secondary-bg border border-border rounded-xl p-6 hover:border-primary-color transition-all">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-white bg-opacity-5 rounded-full text-[10px] uppercase font-bold text-gray-400 tracking-wider border border-white border-opacity-10">
                        {rel.source_type}
                    </div>
                    <ArrowRight size={14} className="text-gray-600" />
                    <div className="px-3 py-1 bg-primary-color bg-opacity-10 rounded-full text-[10px] uppercase font-bold text-primary-color tracking-wider border border-primary-color border-opacity-20">
                        {rel.target_type}
                    </div>
                </div>
                <div className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {rel.start_date ? new Date(rel.start_date).getFullYear() : 'Ongoing'}
                </div>
            </div>

            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                <span className="text-gray-400 text-sm font-normal uppercase tracking-widest">{rel.relationship_type.replace('_', ' ')}</span>
            </h3>

            <div className="flex items-center gap-2 mb-4">
                <span className="font-semibold text-white">Entity #{rel.source_id}</span>
                <span className="text-gray-500 font-normal italic">governs</span>
                <span className="font-semibold text-white">Entity #{rel.target_id}</span>
            </div>

            <div className="bg-black bg-opacity-20 p-3 rounded-lg text-sm text-gray-500 italic mb-6">
                "{rel.notes || 'No notes provided for this relationship.'}"
            </div>

            <div className="flex justify-between items-center">
                <button className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1 transition-colors uppercase tracking-widest">
                    <FileText size={14} /> View Contract
                </button>
                <div className="px-2 py-0.5 rounded text-[10px] bg-green-500 bg-opacity-10 text-green-500 border border-green-500 border-opacity-20">
                    Governed
                </div>
            </div>
        </div>
    );

    if (loading) return <div className="p-8">Loading Relationships...</div>;

    return (
        <div className="page-container p-8">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Relationships</h1>
                    <p className="text-gray-400">The intelligence layer mapping professional connections.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-color rounded-lg hover:bg-opacity-90 transition-all font-medium">
                    <Plus size={18} />
                    <span>Define Relationship</span>
                </button>
            </header>

            {relationships.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {relationships.map((rel) => (
                        <RelationshipCard key={rel.id} rel={rel} />
                    ))}
                </div>
            ) : (
                <div className="bg-secondary-bg border border-border border-dashed rounded-xl p-12 text-center">
                    <Share2 size={48} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-bold mb-2">No relationships defined yet</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Relationships are the connections between artists, publishers, distributors, and more.
                        Define them to unlock ecosystem awareness.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 text-xs">
                        <span className="px-3 py-1 bg-white bg-opacity-5 rounded-full border border-border text-gray-400">Artist signed TO Publisher</span>
                        <span className="px-3 py-1 bg-white bg-opacity-5 rounded-full border border-border text-gray-400">Work registered WITH PRO</span>
                        <span className="px-3 py-1 bg-white bg-opacity-5 rounded-full border border-border text-gray-400">Artist released VIA Distributor</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Relationships;
