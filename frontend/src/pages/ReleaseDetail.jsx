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
        <div className="entity-page">
            <Link to="/catalog/releases" className="back-link">
                <ChevronLeft size={16} /> Back to Releases
            </Link>

            <div className="release-detail-header" style={{ display: 'flex', gap: '2.5rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
                <div className="release-cover-large" style={{
                    width: '320px',
                    height: '320px',
                    flexShrink: 0,
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    background: '#f1f5f9',
                    border: '1px solid var(--border-color)'
                }}>
                    {release.cover_art_url ? (
                        <img
                            src={release.cover_art_url.startsWith('http') ? release.cover_art_url : `${BASE_URL}${release.cover_art_url}`}
                            alt={release.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <Disc size={80} />
                        </div>
                    )}
                </div>

                <div className="release-info-hero" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{
                            padding: '4px 12px',
                            background: 'var(--primary-color)',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'white',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {release.release_type}
                        </span>
                        {label && (
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {label.name}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.025em', color: 'var(--text-main)' }}>{release.title}</h1>
                        <button
                            className="btn-secondary btn-icon"
                            style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}
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
                            <Trash2 size={24} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', color: 'var(--primary-color)', marginBottom: '2rem', fontWeight: 600 }}>
                        <User size={24} />
                        <span>{artistNames}</span>
                    </div>

                    <div className="release-metadata-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                        <div className="meta-item">
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Release Date</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                <Calendar size={18} color="var(--primary-color)" />
                                {formattedDate}
                            </div>
                        </div>
                        <div className="meta-item">
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Catalog #</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                <FileText size={18} color="var(--primary-color)" />
                                {release.catalog_number || 'N/A'}
                            </div>
                        </div>
                        <div className="meta-item">
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>UPC</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                <Tag size={18} color="var(--primary-color)" />
                                {release.upc_code || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="release-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
                {/* Main Content: Tracklist */}
                <div className="tracks-section" style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>Tracklist</h3>
                        <span style={{ background: '#e2e8f0', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{tracks.length} Tracks</span>
                    </div>

                    <div className="tracks-list">
                        {tracks.length === 0 ? (
                            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Music size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                                <p style={{ fontSize: '1.125rem' }}>No tracks added to this release yet.</p>
                                <button className="btn-secondary btn-sm" style={{ marginTop: '1rem' }} onClick={() => navigate('/catalog/tracks')}>Manage Tracks</button>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                                        <th style={{ padding: '1.25rem 1.5rem', width: '60px' }}>#</th>
                                        <th style={{ padding: '1.25rem 1.5rem' }}>Title</th>
                                        <th style={{ padding: '1.25rem 1.5rem' }}>ISRC</th>
                                        <th style={{ padding: '1.25rem 1.5rem' }}>Duration</th>
                                        <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tracks.map((track, index) => (
                                        <tr key={track.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="track-row">
                                            <td style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.875rem' }}>{(index + 1).toString().padStart(2, '0')}</td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>{track.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{track.genre || 'Recording'}</div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'monospace', fontSize: '0.875rem', color: '#64748b' }}>{track.isrc_code || '-'}</td>
                                            <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{formatDurationForDisplay(track.duration)}</td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                                {track.streaming_link ? (
                                                    <a href={track.streaming_link} target="_blank" rel="noreferrer" style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: '#f1f5f9',
                                                        color: 'var(--primary-color)'
                                                    }}>
                                                        <Play size={14} fill="currentColor" />
                                                    </a>
                                                ) : <div style={{ width: '32px' }} />}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Sidebar: Contributors & Info */}
                <div className="release-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="contributors-section" style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} /> Contributors
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
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No contributors listed.</p>
                                );
                            }

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    padding: '2px 6px',
                                                    background: type === 'Artist' ? '#e0e7ff' : type === 'Label' ? '#fce7f3' : type === 'Org' ? '#dbeafe' : '#f1f5f9',
                                                    color: type === 'Artist' ? '#4338ca' : type === 'Label' ? '#be185d' : type === 'Org' ? '#1d4ed8' : '#64748b',
                                                    borderRadius: '4px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    textAlign: 'center',
                                                    minWidth: '60px'
                                                }}>
                                                    {type}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                        {name}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
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

                    <div className="links-section" style={{ background: 'var(--primary-color)', borderRadius: '16px', padding: '1.5rem', color: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800 }}>Quick Actions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                className="btn-secondary btn-sm"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer' }}
                                onClick={() => window.print()}
                            >
                                Generate One-Sheet
                            </button>
                            <button
                                className="btn-secondary btn-sm"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer' }}
                                onClick={() => ReportsService.exportSingle('release', id, 'excel')}
                            >
                                Export Metadata
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .track-row:hover { background: #f8fafc !important; }
                .track-row:hover td { color: var(--primary-color) !important; }
                .back-link { margin-bottom: 2rem; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; color: var(--text-muted); font-weight: 500; }
                .back-link:hover { color: var(--primary-color); }
                
                @media print {
                    .back-link, .release-sidebar, .play-button-cell, th:last-child, td:last-child { display: none !important; }
                    .entity-page { padding: 0 !important; width: 100% !important; }
                    .release-detail-header { margin-bottom: 2rem !important; }
                    .tracks-section { border: none !important; box-shadow: none !important; }
                    .release-content-grid { display: block !important; }
                }
                
                @media (max-width: 1024px) {
                    .release-content-grid { grid-template_columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};


export default ReleaseDetail;
