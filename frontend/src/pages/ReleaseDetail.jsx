import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { NetworkService } from '../services/network';
import { ReportsService } from '../services/reports';
import { BASE_URL } from '../lib/api';
import { confirmAction } from '../lib/tauri';
import { Disc, Music, User, Calendar, Tag, FileText, ChevronRight, Play, ChevronLeft, Trash2 } from 'lucide-react';
import { formatDurationForDisplay } from '../utils/formatters';

const ReleaseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [release, setRelease] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [labels, setLabels] = useState([]);
    const [artists, setArtists] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReleaseData = async () => {
            setIsLoading(true);
            try {
                const [releaseData, tracksData, labelsData, artistsData, orgsData, contactsData] = await Promise.all([
                    CatalogService.getById('releases', id),
                    CatalogService.getReleaseTracks(id),
                    CatalogService.getAll('labels'),
                    CatalogService.getAll('artists'),
                    NetworkService.getOrganizations(),
                    NetworkService.getIndividuals()
                ]);

                setRelease(releaseData);
                setTracks(tracksData);
                setLabels(labelsData);
                setArtists(artistsData);
                setOrganizations(orgsData);
                setContacts(contactsData);
            } catch (error) {
                console.error('Failed to fetch release details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchReleaseData();
        }
    }, [id]);

    if (isLoading) return <div className="loading-spinner">Loading Release Details...</div>;
    if (!release) return <div className="error-message">Release not found</div>;

    const formattedDate = release.release_date ? new Date(release.release_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'TBA';

    // Map label
    const label = labels.find(l => l.id === release.label_id);

    // Map artists
    const releaseArtists = (release.artist_ids || (release.artist_id ? [release.artist_id] : []))
        .map(aid => artists.find(a => a.id === aid))
        .filter(Boolean);

    const artistNames = releaseArtists.length > 0
        ? releaseArtists.map(a => a.name).join(', ')
        : 'Unknown Artist';

    // Credits
    const credits = release.credits || [];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <Link to="/catalog/releases" className="mb-6 inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors font-bold text-sm">
                <ChevronLeft size={16} /> Back to Releases
            </Link>

            {/* Header / Hero Section */}
            <div className="bg-premium-glass border border-white/5 rounded-[32px] p-8 mb-8 flex flex-col lg:flex-row gap-8 shadow-glass backdrop-blur-2xl">
                <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden border border-white/10 shrink-0 flex items-center justify-center bg-white/5 shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                    {release.cover_art_url ? (
                        <img
                            src={release.cover_art_url.startsWith('http') ? release.cover_art_url : `${BASE_URL}${release.cover_art_url}`}
                            alt={release.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Disc size={80} className="text-text-secondary opacity-30" />
                    )}
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-[10px] font-bold uppercase tracking-widest">
                            {release.release_type}
                        </span>
                        {label && (
                            <span className="text-sm text-text-secondary font-bold tracking-wide">
                                {label.name}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{release.title}</h1>
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-danger/10 hover:bg-danger/20 text-danger border border-transparent rounded-xl text-sm font-bold transition-colors shrink-0"
                            onClick={async () => {
                                if (await confirmAction(`Are you sure you want to delete "${release.title}"?`, 'Delete Release')) {
                                    try {
                                        await CatalogService.delete('releases', release.id);
                                        navigate('/catalog/releases');
                                    } catch (err) {
                                        console.error(err);
                                        alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
                                    }
                                }
                            }}
                            title="Delete Release"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>

                    <div className="flex items-center gap-3 text-xl text-accent mb-8 font-bold">
                        <User size={24} />
                        <span>{artistNames}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-auto">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Release Date</label>
                            <div className="flex items-center gap-2 font-bold text-white">
                                <Calendar size={16} className="text-accent" />
                                {formattedDate}
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Catalog #</label>
                            <div className="flex items-center gap-2 font-bold text-white font-mono">
                                <FileText size={16} className="text-accent" />
                                {release.catalog_number || 'N/A'}
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">UPC</label>
                            <div className="flex items-center gap-2 font-bold text-white font-mono">
                                <Tag size={16} className="text-accent" />
                                {release.upc_code || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Main Content: Tracklist */}
                <div className="flex-1 w-full min-w-0 bg-premium-glass border border-white/5 rounded-3xl overflow-hidden shadow-glass">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="text-xl font-bold text-white">Tracklist</h3>
                        <span className="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold text-white">{tracks.length} Tracks</span>
                    </div>

                    <div className="p-0">
                        {tracks.length === 0 ? (
                            <div className="py-16 text-center text-text-secondary">
                                <Music size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-lg mb-4">No tracks added to this release yet.</p>
                                <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all" onClick={() => navigate('/catalog/tracks')}>Manage Tracks</button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                                            <th className="p-4 w-16 text-center">#</th>
                                            <th className="p-4">Title</th>
                                            <th className="p-4">ISRC</th>
                                            <th className="p-4">Duration</th>
                                            <th className="p-4 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tracks.map((track, index) => (
                                            <tr key={track.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                                                <td className="p-4 text-text-secondary font-mono text-xs text-center">{(index + 1).toString().padStart(2, '0')}</td>
                                                <td className="p-4">
                                                    <div className="font-bold text-white text-sm group-hover:text-accent transition-colors">{track.title}</div>
                                                    <div className="text-xs text-text-secondary mt-1">{track.genre || 'Recording'}</div>
                                                </td>
                                                <td className="p-4 font-mono text-xs text-text-secondary">{track.isrc_code || '-'}</td>
                                                <td className="p-4 text-xs text-text-muted">{formatDurationForDisplay(track.duration)}</td>
                                                <td className="p-4 text-right">
                                                    {track.streaming_link && (
                                                        <a href={track.streaming_link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-accent hover:bg-accent hover:text-[#0f1115] transition-colors">
                                                            <Play size={12} fill="currentColor" />
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Contributors & Info */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
                    <div className="bg-premium-glass border border-white/5 rounded-3xl p-6 shadow-glass">
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/5 pb-3">
                            <User size={16} className="text-accent" /> Contributors
                        </h4>

                        {(() => {
                            // Combine artists and credits
                            const artistContributors = releaseArtists.map(artist => ({
                                artist_id: artist.id,
                                role: 'Primary Artist',
                                is_primary: true
                            }));

                            const allContributors = [...artistContributors, ...credits];

                            if (allContributors.length === 0) {
                                return (
                                    <p className="text-sm text-text-secondary text-center py-4">No contributors listed.</p>
                                );
                            }

                            return (
                                <div className="flex flex-col gap-4">
                                    {allContributors.map((credit, idx) => {
                                        let name = 'Unknown';
                                        let type = 'Contact';

                                        if (credit.artist_id) {
                                            const artist = artists.find(a => a.id === credit.artist_id);
                                            name = artist ? (artist.display_name || artist.name) : `Artist #${credit.artist_id}`;
                                            type = 'Artist';
                                        } else if (credit.contact_id) {
                                            const contact = contacts.find(c => c.id === credit.contact_id);
                                            name = contact ? `${contact.first_name} ${contact.last_name}` : `Individual #${credit.contact_id}`;
                                            type = 'Contact';
                                        } else if (credit.label_id) {
                                            const label = labels.find(l => l.id === credit.label_id);
                                            name = label ? label.name : `Label #${credit.label_id}`;
                                            type = 'Label';
                                        } else if (credit.organization_id) {
                                            const org = organizations.find(o => o.id === credit.organization_id);
                                            name = org ? org.name : `Org #${credit.organization_id}`;
                                            type = 'Org';
                                        }

                                        return (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="px-2 py-1 bg-white/5 border border-white/10 text-white rounded text-[9px] font-bold uppercase tracking-widest text-center w-16 shrink-0">
                                                    {type}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-white truncate">
                                                        {name}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest truncate">
                                                        {credit.role}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    <div className="bg-accent/10 border border-accent/20 rounded-[24px] p-6 text-white shadow-[0_0_20px_rgba(14,165,233,0.15)] relative overflow-hidden backdrop-blur-xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h4 className="text-sm font-bold uppercase tracking-widest mb-4 relative z-10">Quick Actions</h4>
                        <div className="flex flex-col gap-3 relative z-10">
                            <button
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold transition-all flex justify-between items-center group"
                                onClick={() => window.print()}
                            >
                                Generate One-Sheet
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </button>
                            <button
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold transition-all flex justify-between items-center group"
                                onClick={() => ReportsService.exportSingle('release', id, 'excel')}
                            >
                                Export Metadata
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </button>
                            <button
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold transition-all flex justify-between items-center group"
                                onClick={() => navigate(`/release/${id}/contract-wizard`)}
                            >
                                Contract Wizard
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReleaseDetail;
