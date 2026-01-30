import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { BASE_URL } from '../lib/api';
import { Disc, Music, User, Calendar, Tag, FileText, ChevronRight, Play } from 'lucide-react';

const ReleaseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [release, setRelease] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReleaseData = async () => {
            setIsLoading(true);
            try {
                const [releaseData, tracksData] = await Promise.all([
                    CatalogService.getById('releases', id),
                    CatalogService.getReleaseTracks(id)
                ]);
                setRelease(releaseData);
                setTracks(tracksData);
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

    return (
        <div className="entity-page">
            <div className="breadcrumb" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <Link to="/catalog/releases" style={{ color: 'inherit', textDecoration: 'none' }}>Releases</Link>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{release.title}</span>
            </div>

            <div className="release-detail-header" style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
                <div className="release-cover-large" style={{ width: '280px', height: '280px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', background: '#f1f5f9' }}>
                    {release.cover_art_url ? (
                        <img
                            src={release.cover_art_url.startsWith('http') ? release.cover_art_url : `${BASE_URL}${release.cover_art_url}`}
                            alt={release.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justify_content: 'center', color: '#94a3b8' }}>
                            <Disc size={80} />
                        </div>
                    )}
                </div>

                <div className="release-info-hero" style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{
                            padding: '4px 12px',
                            background: '#f1f5f9',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.025em'
                        }}>
                            {release.release_type}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>{release.title}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        <User size={20} />
                        <span>Various Artists</span> {/* TODO: Map names */}
                    </div>

                    <div className="release-metadata-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="meta-item">
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Release Date</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                                <Calendar size={16} />
                                {formattedDate}
                            </div>
                        </div>
                        <div className="meta-item">
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Catalog #</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                                <FileText size={16} />
                                {release.catalog_number || 'N/A'}
                            </div>
                        </div>
                        <div className="meta-item">
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>UPC</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                                <Tag size={16} />
                                {release.upc_code || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tracks-section" style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Tracklist</h3>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{tracks.length} tracks</span>
                </div>

                <div className="tracks-list">
                    {tracks.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Music size={40} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                            <p>No tracks added to this release yet.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '1rem 1.5rem', width: '40px' }}>#</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Title</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>ISRC</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Duration</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tracks.map((track, index) => (
                                    <tr key={track.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.2s' }} className="track-row">
                                        <td style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 500 }}>{index + 1}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ fontWeight: 600 }}>{track.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{track.genre || 'Various'}</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>{track.isrc_code || '-'}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{track.duration || '--:--'}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            {track.streaming_link && (
                                                <a href={track.streaming_link} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>
                                                    <Play size={16} />
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <style>{`
                .track-row:hover { background: #f8fafc; }
                .track-row { cursor: default; }
            `}</style>
        </div>
    );
};

export default ReleaseDetail;
