import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { ReportsService } from '../services/reports';
import { BASE_URL } from '../lib/api';
import { confirmAction } from '../lib/tauri';
import { Music, User, Calendar, Tag, FileAudio, ChevronRight, Play, ChevronLeft, Landmark, Hash, Info, Trash2 } from 'lucide-react';
import AttachmentsSection from '../components/AttachmentsSection';

const WorkDetail = () => {
    const { id } = useParams();
    const [work, setWork] = useState(null);
    const [publisher, setPublisher] = useState(null);
    const [pro, setPro] = useState(null);
    const [composers, setComposers] = useState([]);
    const [arrangers, setArrangers] = useState([]);
    const [tracks, setTracks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchWorkData = async () => {
            setIsLoading(true);
            try {
                const workData = await CatalogService.getById('works', id);
                setWork(workData);

                const promises = [];

                // Fetch tracks linked to this work
                promises.push(CatalogService.getAll('tracks'));

                if (workData.publisher_id) {
                    promises.push(CatalogService.getById('publishers', workData.publisher_id));
                } else {
                    promises.push(Promise.resolve(null));
                }

                if (workData.pro_id) {
                    promises.push(CatalogService.getById('pros', workData.pro_id));
                } else {
                    promises.push(Promise.resolve(null));
                }

                if ((workData.composers && workData.composers.length > 0) ||
                    (workData.arrangers && workData.arrangers.length > 0)) {
                    promises.push(CatalogService.getAll('artists'));
                } else {
                    promises.push(Promise.resolve([]));
                }

                const [allTracks, pubData, proData, allArtists] = await Promise.all(promises);

                setPublisher(pubData);
                setPro(proData);

                // Filter linked tracks (backend doesn't have a direct getWorkTracks yet, so we filter)
                setTracks(allTracks.filter(t => t.work_id === parseInt(id)));

                if (workData.composers) {
                    setComposers(allArtists.filter(a => workData.composers.includes(a.id)));
                }
                if (workData.arrangers) {
                    setArrangers(allArtists.filter(a => workData.arrangers.includes(a.id)));
                }

            } catch (error) {
                console.error('Failed to fetch work details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWorkData();
    }, [id]);

    if (isLoading) return <div className="loading">Loading work details...</div>;
    if (!work) return <div className="error">Musical work not found</div>;

    return (
        <div className="entity-page work-detail-page">
            <Link to="/catalog/works" className="back-link">
                <ChevronLeft size={16} /> Back to Works
            </Link>

            <div className="release-detail-header" style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', alignItems: 'flex-start' }}>
                <div className="release-cover" style={{ width: '160px', height: '160px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                    <Music size={70} />
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <span className="meta-tag" style={{ background: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600 }}>MUSICAL WORK</span>
                        {work.iswc_code && <span className="meta-tag" style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600 }}>{work.iswc_code}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--text-color)' }}>{work.title}</h1>
                        <button
                            className="btn-secondary btn-icon"
                            style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}
                            onClick={async () => {
                                if (await confirmAction(`Are you sure you want to delete musical work "${work.title}"?`, 'Delete Work')) {
                                    try {
                                        await CatalogService.delete('works', work.id);
                                        navigate('/catalog/works');
                                    } catch (err) {
                                        console.error(err);
                                        alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
                                    }
                                }
                            }}
                            title="Delete Work"
                        >
                            <Trash2 size={24} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} />
                            <span>{composers.length > 0 ? composers.map(a => a.name).join(', ') : (work.composers_text || 'Unknown Composer')}</span>
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
                    </div>
                </div>
            </div>

            <div className="release-content-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="main-content">
                    <section className="tracks-section" style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '2rem' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <FileAudio size={20} color="var(--primary-color)" />
                            Exploited Recordings
                        </h3>
                        <div className="tracks-list">
                            {tracks.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recording Title</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>ISRC</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tracks.map((track) => (
                                            <tr key={track.id} style={{ borderBottom: '1px solid #f8fafc' }} className="track-row">
                                                <td style={{ padding: '1rem', fontWeight: 600 }}>{track.title}</td>
                                                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{track.isrc_code || '-'}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <Link to={`/catalog/tracks/${track.id}`} className="btn-secondary btn-sm" style={{ padding: '4px 8px' }}>View Detail</Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No master recordings are currently linked to this composition.</p>
                            )}
                        </div>
                    </section>

                    <AttachmentsSection
                        entityType="work"
                        entityId={id}
                        entityTitle={work.title}
                    />

                    <section className="metadata-section" style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Info size={20} color="var(--primary-color)" />
                            Composition Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>Creators</h4>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Composers</label>
                                    <div style={{ fontWeight: 500 }}>
                                        {composers.length > 0 ? composers.map(a => a.name).join(', ') : (work.composers_text || 'Unknown')}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Arrangers</label>
                                    <div style={{ fontWeight: 500 }}>
                                        {arrangers.length > 0 ? arrangers.map(a => a.name).join(', ') : (work.arrangers_text || 'None')}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>Identifiers</h4>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ISWC Code</label>
                                    <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{work.iswc_code || 'Not Registered'}</div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="sidebar">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rights Management</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {publisher && (
                                    <Link to={`/catalog/publishers/${publisher.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', padding: '0.75rem', borderRadius: '12px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="hover-card">
                                        <Landmark size={20} color="var(--primary-color)" />
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Publisher</div>
                                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{publisher.name}</div>
                                        </div>
                                    </Link>
                                )}

                                {pro && (
                                    <Link to={`/catalog/pros`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', padding: '0.75rem', borderRadius: '12px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="hover-card">
                                        <Tag size={20} color="var(--primary-color)" />
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Collection Society</div>
                                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pro.name}</div>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .back-link { margin-bottom: 2rem; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; color: var(--text-muted); font-weight: 500; }
                .back-link:hover { color: var(--primary-color); }
                .hover-card:hover { border-color: var(--primary-color) !important; background: #f5f3ff !important; }
                .track-row { transition: background 0.2s; }
                .track-row:hover { background: #f8fafc; }
                
                @media print {
                    .back-link, .quick-actions-sidebar, .sidebar, .btn-sm { display: none !important; }
                    .work-detail-page { padding: 0 !important; width: 100% !important; }
                    .release-content-grid { display: block !important; }
                }
            `}</style>
        </div>
    );
};

export default WorkDetail;
