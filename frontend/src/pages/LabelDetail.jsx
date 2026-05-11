import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { BASE_URL } from '../lib/api';
import {
    ChevronLeft,
    Globe,
    Mail,
    Phone,
    MapPin,
    User,
    Disc,
    Music,
    Building2,
    Users
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const LabelDetail = () => {
    const { id } = useParams();
    const [label, setLabel] = useState(null);
    const [artists, setArtists] = useState([]);
    const [releases, setReleases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchLabelData = async () => {
            setIsLoading(true);
            try {
                const [labelData, artistsData, releasesData] = await Promise.all([
                    CatalogService.getById('labels', id),
                    CatalogService.getLabelArtists(id),
                    CatalogService.getLabelReleases(id)
                ]);
                setLabel(labelData);
                setArtists(artistsData);
                setReleases(releasesData);
            } catch (error) {
                console.error('Failed to fetch label details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchLabelData();
        }
    }, [id]);

    if (isLoading) return <div className="p-8 text-center text-text-secondary animate-pulse">Loading Label Details...</div>;
    if (!label) return <div className="p-8"><div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl">Label not found</div></div>;

    const logoUrl = label.logo_url ? (label.logo_url.startsWith('http') ? label.logo_url : `${BASE_URL}${label.logo_url}`) : null;

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            <Link to="/catalog/labels" className="mb-6 inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors font-bold text-sm">
                <ChevronLeft size={16} /> Back to Labels
            </Link>

            <div className="bg-premium-glass border border-white/5 rounded-[32px] p-8 mb-8 flex flex-col md:flex-row gap-8 shadow-glass backdrop-blur-2xl">
                <div className="w-[180px] h-[180px] shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-glow flex items-center justify-center text-text-muted relative group">
                    {logoUrl ? (
                        <img src={logoUrl} alt={label.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                        <Building2 size={64} className="opacity-50 group-hover:scale-110 transition-transform duration-500" />
                    )}
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none"></div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <h1 className="text-4xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] tracking-tight mb-3">{label.name}</h1>
                    <div className="flex items-center gap-3 mb-6">
                        <Badge variant="accent" className="font-mono">{label.label_id}</Badge>
                        <span className="text-white/20">•</span>
                        <span className="text-text-secondary text-sm font-bold tracking-widest uppercase">Record Label</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {label.contact_person && (
                            <div className="flex items-center gap-3 text-text-primary bg-white/5 p-3 rounded-xl border border-white/5">
                                <User size={18} className="text-accent shrink-0" />
                                <span className="font-medium truncate">{label.contact_person}</span>
                            </div>
                        )}
                        {label.contact_email && (
                            <div className="flex items-center gap-3 text-text-primary bg-white/5 p-3 rounded-xl border border-white/5">
                                <Mail size={18} className="text-accent shrink-0" />
                                <span className="font-medium truncate">{label.contact_email}</span>
                            </div>
                        )}
                        {label.website && (
                            <div className="flex items-center gap-3 text-text-primary bg-white/5 p-3 rounded-xl border border-white/5 hover:border-accent/30 hover:bg-white/10 transition-colors">
                                <Globe size={18} className="text-accent shrink-0" />
                                <a href={label.website.startsWith('http') ? label.website : `https://${label.website}`} target="_blank" rel="noreferrer" className="font-medium truncate hover:text-white transition-colors">{label.website}</a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex overflow-x-auto bg-premium-glass border border-white/5 rounded-2xl p-1 mb-8 hide-scrollbar shadow-sm">
                <button
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap flex-1 text-center ${activeTab === 'overview' ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap flex-1 text-center ${activeTab === 'artists' ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                    onClick={() => setActiveTab('artists')}
                >
                    Artists ({artists.length})
                </button>
                <button
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap flex-1 text-center ${activeTab === 'discography' ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                    onClick={() => setActiveTab('discography')}
                >
                    Discography ({releases.length})
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card title={<><Building2 size={18} className="mr-2 inline text-accent" /> Company Information</>}>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Address</label>
                                    <div className="flex items-start gap-3">
                                        <MapPin size={16} className="text-text-muted shrink-0 mt-0.5" />
                                        <p className="text-white">{label.address || <span className="text-text-secondary italic">No address provided</span>}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Phone</label>
                                    <div className="flex items-center gap-3">
                                        <Phone size={16} className="text-text-muted shrink-0" />
                                        <p className="text-white font-mono">{label.contact_phone || <span className="text-text-secondary italic font-sans">No phone provided</span>}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card title="Catalog Summary">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/5 p-6 rounded-2xl text-center flex flex-col items-center justify-center">
                                    <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] mb-2">{artists.length}</div>
                                    <div className="text-xs font-bold text-text-secondary uppercase tracking-widest">Active Artists</div>
                                </div>
                                <div className="bg-white/5 border border-white/5 p-6 rounded-2xl text-center flex flex-col items-center justify-center">
                                    <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] mb-2">{releases.length}</div>
                                    <div className="text-xs font-bold text-text-secondary uppercase tracking-widest">Releases</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'artists' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {artists.length === 0 ? (
                            <div className="col-span-full py-16 bg-premium-glass border border-white/5 rounded-3xl text-center text-text-secondary flex flex-col items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Users size={32} className="text-text-muted" />
                                </div>
                                <p className="font-medium">No artists are currently linked to this label.</p>
                            </div>
                        ) : (
                            artists.map(artist => (
                                <Link
                                    key={artist.id}
                                    to={`/catalog/artists/${artist.id}`}
                                    className="group"
                                >
                                    <div className="bg-premium-glass p-4 rounded-2xl border border-white/5 flex items-center gap-4 transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20 group-hover:-translate-y-1 group-hover:shadow-glow">
                                        <div className="w-14 h-14 rounded-full overflow-hidden bg-white/5 shrink-0 border border-white/10 group-hover:border-accent/50 transition-colors">
                                            {artist.profile_image_url ? (
                                                <img src={artist.profile_image_url.startsWith('http') ? artist.profile_image_url : `${BASE_URL}${artist.profile_image_url}`} alt={artist.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-text-muted">
                                                    <User size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-white truncate group-hover:text-accent transition-colors">{artist.name}</h4>
                                            <p className="text-xs text-text-secondary mt-1 truncate font-medium">{artist.aka || 'Artist'}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'discography' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {releases.length === 0 ? (
                            <div className="col-span-full py-16 bg-premium-glass border border-white/5 rounded-3xl text-center text-text-secondary flex flex-col items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Disc size={32} className="text-text-muted" />
                                </div>
                                <p className="font-medium">No releases found for this label.</p>
                            </div>
                        ) : (
                            releases.map(release => (
                                <Link
                                    key={release.id}
                                    to={`/catalog/releases/${release.id}`}
                                    className="group"
                                >
                                    <div className="bg-premium-glass p-3 rounded-2xl border border-white/5 transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20 group-hover:-translate-y-2 group-hover:shadow-glow">
                                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/5 mb-3 border border-white/10 group-hover:border-accent/50 transition-colors relative">
                                            {release.cover_art_url ? (
                                                <img src={release.cover_art_url.startsWith('http') ? release.cover_art_url : `${BASE_URL}${release.cover_art_url}`} alt={release.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-text-muted">
                                                    <Disc size={32} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-1">
                                            <h4 className="font-bold text-white text-sm truncate group-hover:text-accent transition-colors mb-2">{release.title}</h4>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-text-secondary font-medium">{release.release_date || 'TBA'}</span>
                                                <Badge variant="neutral" size="xs" className="uppercase tracking-widest text-[9px]">{release.release_type}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabelDetail;
