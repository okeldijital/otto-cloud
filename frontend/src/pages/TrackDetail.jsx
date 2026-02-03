import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { NetworkService } from '../services/network';
import { ReportsService } from '../services/reports';
import { BASE_URL } from '../lib/api';
import { Music, User, Calendar, Tag, FileAudio, ChevronRight, Play, ChevronLeft, Disc, Clock, Hash, ExternalLink } from 'lucide-react';

const TrackDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [track, setTrack] = useState(null);
    const [release, setRelease] = useState(null);
    const [work, setWork] = useState(null);
    const [artists, setArtists] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTrackData = async () => {
            setIsLoading(true);
            try {
                const trackData = await CatalogService.getById('tracks', id);
                setTrack(trackData);

                // Fetch related data
                const promises = [
                    NetworkService.getIndividuals()
                ];

                if (trackData.release_id) {
                    promises.push(CatalogService.getById('releases', trackData.release_id));
                }
                if (trackData.work_id) {
                    promises.push(CatalogService.getById('works', trackData.work_id));
                }
                if (trackData.artist_ids && trackData.artist_ids.length > 0) {
                    promises.push(CatalogService.getAll('artists'));
                }

                const results = await Promise.all(promises);

                setContacts(results[0]);

                let resultIdx = 1;
                if (trackData.release_id) setRelease(results[resultIdx++]);
                if (trackData.work_id) setWork(results[resultIdx++]);
                if (trackData.artist_ids && trackData.artist_ids.length > 0) {
                    const allArtists = results[resultIdx++];
                    setArtists(allArtists.filter(a => trackData.artist_ids.includes(a.id)));
                }

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
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>{track.title}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} />
                            <span>{artists.length > 0 ? artists.map(a => a.name).join(', ') : 'Various Artists'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={18} />
                            <span>{track.duration || '--:--'}</span>
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
                                            const contact = contacts.find(c => c.id === credit.contact_id);
                                            return (
                                                <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                                                        {contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown Contributor'}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                            {credit.role}
                                                        </span>
                                                    </td>
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
                                <div style={{ fontWeight: 600 }}>{track.duration || 'Not specified'}</div>
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
