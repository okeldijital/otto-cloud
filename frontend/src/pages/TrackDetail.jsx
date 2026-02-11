import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { NetworkService } from '../services/network';
import { ReportsService } from '../services/reports';
import { BASE_URL } from '../lib/api';
import { confirmAction } from '../lib/tauri';
import { Music, User, Calendar, Tag, FileAudio, ChevronRight, Play, ChevronLeft, Disc, Clock, Hash, ExternalLink, Trash2 } from 'lucide-react';
import { formatDurationForDisplay } from '../utils/formatters';

const TrackDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [track, setTrack] = useState(null);
    const [release, setRelease] = useState(null);
    const [secondaryReleases, setSecondaryReleases] = useState([]);
    const [work, setWork] = useState(null);
    const [artists, setArtists] = useState([]);
    const [allArtists, setAllArtists] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [labels, setLabels] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTrackData = async () => {
            setIsLoading(true);
            try {
                const trackData = await CatalogService.getById('tracks', id);
                setTrack(trackData);

                // Fetch related data
                const promises = [
                    NetworkService.getIndividuals(),
                    CatalogService.getAll('labels'),
                    NetworkService.getOrganizations(),
                    CatalogService.getAll('artists')
                ];

                if (trackData.release_id) {
                    promises.push(CatalogService.getById('releases', trackData.release_id));
                }
                if (trackData.work_id) {
                    promises.push(CatalogService.getById('works', trackData.work_id));
                }

                // Fetch secondary releases if any
                if (trackData.secondary_release_ids && trackData.secondary_release_ids.length > 0) {
                    // We can fetch all releases to be efficient if there are many, or just loop.
                    // For simplicity and to reuse endpoint, let's fetch all releases if there are > 0.
                    // Or better: Promise.all with id.
                    trackData.secondary_release_ids.forEach(rid => {
                        promises.push(CatalogService.getById('releases', rid));
                    });
                }

                const results = await Promise.all(promises);

                setContacts(results[0]);
                setLabels(results[1]);
                setOrganizations(results[2]);
                const allArtistsData = results[3];
                setAllArtists(allArtistsData);

                let resultIdx = 4;
                if (trackData.release_id) setRelease(results[resultIdx++]);
                if (trackData.work_id) setWork(results[resultIdx++]);

                if (trackData.secondary_release_ids && trackData.secondary_release_ids.length > 0) {
                    const secRels = [];
                    for (let i = 0; i < trackData.secondary_release_ids.length; i++) {
                        secRels.push(results[resultIdx++]);
                    }
                    setSecondaryReleases(secRels.filter(Boolean)); // Filter out nulls if fetch failed
                } else {
                    setSecondaryReleases([]);
                }

                if (trackData.artist_ids && trackData.artist_ids.length > 0) {
                    setArtists(allArtistsData.filter(a => trackData.artist_ids.includes(a.id)));
                } else {
                    setArtists([]); // Or keep empty
                }
                // Need to store allArtists somewhere if I want to resolve credit names for artists who are NOT primary artists on the track.
                // Actually, let's just use allArtists for looking up credit names.
                // I will add a `allArtists` state or just use `artists` and store ALL artists there?
                // The current code uses `artists` to display "Artists" section in sidebar (filtered by track.artist_ids).
                // Let's store allArtists in a ref or separate state if needed, or just filter for the sidebar.
                // To minimize changes, let's keep `artists` as the track artists, and use `allArtists` for credits.
                // Wait, I can just fetch all artists and store them in a new state `allArtistsLookup`.


            } catch (error) {
                console.error('Failed to fetch track details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrackData();
    }, [id]);

    if (isLoading) return <div className="loading">Loading track details...</div>;
    if (!track) return <div className="error">Track not found</div>;

    return (
        <div className="entity-page track-detail-page">
            <Link to="/catalog/tracks" className="back-link">
                <ChevronLeft size={16} /> Back to Tracks
            </Link>

            <div className="release-detail-header" style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', alignItems: 'flex-start' }}>
                <div className="release-cover" style={{ width: '200px', height: '200px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                    <FileAudio size={80} />
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <span className="meta-tag" style={{ background: '#f5f3ff', color: '#7c3aed', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600 }}>MASTER RECORDING</span>
                        {track.isrc_code && <span className="meta-tag" style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600 }}>{track.isrc_code}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--text-color)' }}>{track.title}</h1>
                        <button
                            className="btn-secondary btn-icon"
                            style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}
                            onClick={async () => {
                                if (await confirmAction(`Are you sure you want to delete track "${track.title}"?`, 'Delete Track')) {
                                    try {
                                        await CatalogService.delete('tracks', track.id);
                                        navigate('/catalog/tracks');
                                    } catch (err) {
                                        console.error(err);
                                        alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
                                    }
                                }
                            }}
                            title="Delete Track"
                        >
                            <Trash2 size={24} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} />
                            <span>{artists.length > 0 ? artists.map(a => a.name).join(', ') : 'Various Artists'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={18} />
                            <span>{formatDurationForDisplay(track.duration)}</span>
                        </div>
                    </div>
                </div>

                <div className="quick-actions-sidebar" style={{ background: 'var(--primary-color)', borderRadius: '16px', padding: '1.5rem', color: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800 }}>Quick Actions</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                            className="btn-secondary btn-sm"
                            style={{ width: '100%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer' }}
                            onClick={() => window.print()}
                        >
                            Generate One-Sheet
                        </button>
                        {track.streaming_link && (
                            <button
                                className="btn-secondary btn-sm"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer' }}
                                onClick={() => window.open(track.streaming_link, '_blank')}
                            >
                                <ExternalLink size={14} style={{ marginRight: '0.5rem' }} />
                                Play Master
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="release-content-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="main-content">
                    <section className="tracks-section" style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '2rem' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Tag size={20} color="var(--primary-color)" />
                            Recording Credits
                        </h3>
                        <div className="credits-list">
                            {track.credits && track.credits.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Contributor</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {track.credits.map((credit, idx) => {
                                            let name = 'Unknown';
                                            let type = 'Contact';

                                            if (credit.artist_id) {
                                                const artist = allArtists.find(a => a.id === credit.artist_id);
                                                name = artist ? (artist.display_name || artist.name) : `Artist #${credit.artist_id}`;
                                                type = 'Artist';
                                            } else if (credit.contact_id) {
                                                const contact = contacts.find(c => c.id === credit.contact_id);
                                                name = contact ? `${contact.first_name} ${contact.last_name}` : `Indiv #${credit.contact_id}`;
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
                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            background: type === 'Artist' ? '#e0e7ff' : type === 'Label' ? '#fce7f3' : type === 'Org' ? '#dbeafe' : '#f1f5f9',
                                                            color: type === 'Artist' ? '#4338ca' : type === 'Label' ? '#be185d' : type === 'Org' ? '#1d4ed8' : '#64748b',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {type}
                                                        </span>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{name}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{credit.role}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No credits listed for this recording.</p>
                            )}
                        </div>
                    </section>

                    <section className="metadata-section" style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Hash size={20} color="var(--primary-color)" />
                            Technical Metadata
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="meta-item">
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>ISRC Code</label>
                                <div style={{ fontWeight: 600 }}>{track.isrc_code || 'Not assigned'}</div>
                            </div>
                            <div className="meta-item">
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Genre</label>
                                <div style={{ fontWeight: 600 }}>{track.genre || 'Not specified'}</div>
                            </div>
                            <div className="meta-item">
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Release Date</label>
                                <div style={{ fontWeight: 600 }}>{track.release_date || 'Not specified'}</div>
                            </div>
                            <div className="meta-item">
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Duration</label>
                                <div style={{ fontWeight: 600 }}>{formatDurationForDisplay(track.duration)}</div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="sidebar">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationships</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {release && (
                                    <Link to={`/catalog/releases/${release.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', padding: '0.75rem', borderRadius: '12px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="hover-card">
                                        <Disc size={20} color="var(--primary-color)" />
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Parent Release</div>
                                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{release.title}</div>
                                        </div>
                                    </Link>
                                )}

                                {secondaryReleases.length > 0 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>ALSO APPEARS ON</div>
                                        {secondaryReleases.map(sr => (
                                            <Link key={sr.id} to={`/catalog/releases/${sr.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', padding: '0.5rem', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '0.5rem', fontSize: '0.9rem' }} className="hover-card">
                                                <Disc size={16} className="text-muted" />
                                                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sr.title}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {work && (
                                    <Link to={`/catalog/works/${work.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', padding: '0.75rem', borderRadius: '12px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="hover-card">
                                        <Music size={20} color="var(--primary-color)" />
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Musical Work</div>
                                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{work.title}</div>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Artists</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {artists.map(artist => (
                                    <Link key={artist.id} to={`/catalog/artists/${artist.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-color)' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={16} />
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{artist.name}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .back-link { margin-bottom: 2rem; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; color: var(--text-muted); font-weight: 500; }
                .back-link:hover { color: var(--primary-color); }
                .hover-card:hover { border-color: var(--primary-color) !important; background: #f5f3ff !important; }
                
                @media print {
                    .back-link, .quick-actions-sidebar, .sidebar { display: none !important; }
                    .track-detail-page { padding: 0 !important; width: 100% !important; }
                    .release-content-grid { display: block !important; }
                }
            `}</style>
        </div>
    );
};

export default TrackDetail;
