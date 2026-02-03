import React, { useState, useEffect } from 'react';
import { Responsive } from 'react-grid-layout';
import { WidthProvider } from '../components/WidthProvider';
import { AnalyticsService } from '../services/analytics';
import { BASE_URL } from '../lib/api';
import { TrendingUp, Music, FileText, Calendar, Activity as ActivityIcon, Layout, GripVertical, Users, Disc, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard = () => {
    const [kpis, setKpis] = useState({ total_artists: 0, total_releases: 0, total_works: 0, active_contracts: 0 });
    const [growthData, setGrowthData] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [latestRelease, setLatestRelease] = useState(null);
    const [pendingContracts, setPendingContracts] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Grid Layout State
    const [layout, setLayout] = useState(() => {
        const saved = localStorage.getItem('otto_dashboard_layout_v3'); // Use v3 to force reset to the new requested order
        return saved ? JSON.parse(saved) : [
            { i: 'kpi-artists', x: 0, y: 0, w: 4, h: 6 },
            { i: 'kpi-releases', x: 4, y: 0, w: 4, h: 6 },
            { i: 'activity', x: 0, y: 6, w: 4, h: 6 },
            { i: 'events', x: 4, y: 6, w: 4, h: 6 },
            { i: 'kpi-works', x: 0, y: 12, w: 4, h: 6 },
            { i: 'kpi-pending', x: 4, y: 12, w: 4, h: 6 },
            { i: 'growth', x: 0, y: 18, w: 4, h: 6 },
            { i: 'release', x: 4, y: 18, w: 4, h: 6 }
        ];
    });

    const resetLayout = () => {
        const defaultLayout = [
            { i: 'kpi-artists', x: 0, y: 0, w: 4, h: 6 },
            { i: 'kpi-releases', x: 4, y: 0, w: 4, h: 6 },
            { i: 'activity', x: 0, y: 6, w: 4, h: 6 },
            { i: 'events', x: 4, y: 6, w: 4, h: 6 },
            { i: 'kpi-works', x: 0, y: 12, w: 4, h: 6 },
            { i: 'kpi-pending', x: 4, y: 12, w: 4, h: 6 },
            { i: 'growth', x: 0, y: 18, w: 4, h: 6 },
            { i: 'release', x: 4, y: 18, w: 4, h: 6 }
        ];
        setLayout(defaultLayout);
        localStorage.setItem('otto_dashboard_layout_v3', JSON.stringify(defaultLayout));
    };

    const onLayoutChange = (currentLayout) => {
        setLayout(currentLayout);
        localStorage.setItem('otto_dashboard_layout_v3', JSON.stringify(currentLayout));
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const [kpiData, growData, events, activity, release, pending] = await Promise.all([
                    AnalyticsService.getKPIs(),
                    AnalyticsService.getCatalogGrowth(),
                    AnalyticsService.getUpcomingEvents(),
                    AnalyticsService.getRecentActivity(),
                    AnalyticsService.getLatestRelease(),
                    AnalyticsService.getPendingContracts()
                ]);
                setKpis(kpiData);
                setGrowthData(growData);
                setUpcomingEvents(events);
                setRecentActivity(activity);
                setLatestRelease(release);
                setPendingContracts(pending.pending_count);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDay = (dateString) => new Date(dateString).getDate();
    const formatMonthAbbr = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const WidgetHeader = ({ title, icon: Icon }) => (
        <div className="widget-header">
            <h3><Icon size={18} /> {title}</h3>
            <GripVertical size={14} className="text-muted" />
        </div>
    );

    if (isLoading) return <div className="loading-state">Initializing Welcome to Otto...</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Welcome to Otto</h1>
                    <p className="dashboard-subtitle">Data Management System for Record Labels</p>
                </div>
                <button className="btn-secondary" onClick={resetLayout}>Reset Layout</button>
            </div>

            <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layout, md: layout, sm: layout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 8, md: 8, sm: 4, xs: 2, xxs: 1 }}
                rowHeight={30}
                draggableHandle=".widget-header"
                onLayoutChange={(current) => onLayoutChange(current)}
                margin={[16, 16]}
                containerPadding={[20, 20]}
                compactType="vertical"
                preventCollision={true}
                allowOverlap={false}
            >
                {/* Individual KPI Widgets */}
                <div key="kpi-artists" className="dashboard-grid-item">
                    <WidgetHeader title="Artists" icon={Users} />
                    <div className="widget-content kpi-widget-content">
                        <div className="kpi-value">{kpis.total_artists}</div>
                    </div>
                </div>

                <div key="kpi-releases" className="dashboard-grid-item">
                    <WidgetHeader title="Releases" icon={Disc} />
                    <div className="widget-content kpi-widget-content">
                        <div className="kpi-value">{kpis.total_releases}</div>
                    </div>
                </div>

                <div key="kpi-works" className="dashboard-grid-item">
                    <WidgetHeader title="Works" icon={FileText} />
                    <div className="widget-content kpi-widget-content">
                        <div className="kpi-value">{kpis.total_works}</div>
                    </div>
                </div>

                <div key="kpi-pending" className="dashboard-grid-item">
                    <WidgetHeader title="Pending" icon={Clock} />
                    <div className="widget-content kpi-widget-content">
                        <div className="kpi-value">{pendingContracts}</div>
                    </div>
                </div>

                {/* Catalog Growth */}
                <div key="growth" className="dashboard-grid-item">
                    <WidgetHeader title="Catalog Overview" icon={TrendingUp} />
                    <div className="widget-content">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="value" fill="var(--accent-color)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div key="activity" className="dashboard-grid-item">
                    <WidgetHeader title="Recent Activity" icon={ActivityIcon} />
                    <div className="widget-content">
                        <div className="activity-list compact">
                            {recentActivity.map(activity => (
                                <div key={activity.id} className="activity-item">
                                    <div className={`activity-status-dot ${activity.action}`} />
                                    <div className="activity-details">
                                        <div className="activity-text">
                                            <strong>{activity.action}</strong> {activity.entity_type}
                                            {activity.entity_name && <span className="entity-name">: {activity.entity_name}</span>}
                                        </div>
                                        <div className="activity-time">{formatDate(activity.timestamp)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Upcoming Events */}
                <div key="events" className="dashboard-grid-item">
                    <WidgetHeader title="Upcoming Events" icon={Calendar} />
                    <div className="widget-content">
                        <div className="events-list">
                            {upcomingEvents.map(event => (
                                <div key={event.id} className="event-item">
                                    <div className="event-date-small">
                                        {formatMonthAbbr(event.start_time)} <strong>{formatDay(event.start_time)}</strong>
                                    </div>
                                    <div className="event-details">
                                        <div className="event-title">{event.title}</div>
                                        <div className="event-meta">{event.event_type} • {formatTime(event.start_time)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Latest Release */}
                <div key="release" className="dashboard-grid-item">
                    <WidgetHeader title="Latest Release" icon={Layout} />
                    <div className="widget-content kpi-widget-content">
                        {latestRelease ? (
                            <div className="release-widget">
                                {latestRelease.cover_art_url ? (
                                    <img src={latestRelease.cover_art_url.startsWith('http') ? latestRelease.cover_art_url : `${BASE_URL}${latestRelease.cover_art_url}`} alt="" className="release-thumb" />
                                ) : (
                                    <div className="release-thumb placeholder"><Disc size={32} /></div>
                                )}
                                <div className="release-info">
                                    <h4>{latestRelease.title}</h4>
                                    <p>{formatDate(latestRelease.release_date)}</p>
                                    <span className="badge-small">{latestRelease.release_type}</span>
                                </div>
                            </div>
                        ) : <p className="text-muted">No releases found</p>}
                    </div>
                </div>
            </ResponsiveGridLayout>

            <style>{`
                .dashboard-container {
                    padding: 0;
                    background: #f8fafc;
                    min-height: 100vh;
                }
                .dashboard-header {
                    padding: 2rem;
                    background: white;
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: 1rem;
                }
                .dashboard-grid-item {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    transition: box-shadow 0.2s ease, transform 0.2s ease;
                }
                .dashboard-grid-item:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }
                .react-grid-placeholder {
                    background: var(--accent-color) !important;
                    border-radius: 12px !important;
                    opacity: 0.1 !important;
                }
                .react-resizable-handle {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    bottom: 0;
                    right: 0;
                    cursor: se-resize;
                }
                .react-resizable-handle::after {
                    content: "";
                    position: absolute;
                    right: 5px;
                    bottom: 5px;
                    width: 8px;
                    height: 8px;
                    border-right: 2px solid #cbd5e1;
                    border-bottom: 2px solid #cbd5e1;
                }
                .activity-status-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; }
                .activity-status-dot.created { background: #22c55e; }
                .activity-status-dot.updated { background: #3b82f6; }
                .activity-status-dot.deleted { background: #ef4444; }
                .activity-list.compact { display: flex; flex-direction: column; gap: 0.75rem; }
                .activity-text { font-size: 0.8125rem; }
                .entity-name { color: var(--text-muted); font-weight: normal; }
                .event-date-small { 
                    background: #f8fafc; border: 1px solid var(--border-color);
                    border-radius: 6px; padding: 4px 8px; text-align: center;
                    font-size: 0.625rem; min-width: 40px;
                }
                .event-date-small strong { display: block; font-size: 1rem; }
                .release-widget { display: flex; gap: 1rem; align-items: center; }
                .release-thumb { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; }
                .release-thumb.placeholder { background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
                .badge-small { font-size: 0.625rem; background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
                .loading-state { height: 100vh; display: flex; align-items: center; justify-content: center; font-weight: 500; color: var(--text-muted); }
                .widget-header {
                    padding: 1rem;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: grab;
                }
                .widget-header:active {
                    cursor: grabbing;
                }
                .widget-header h3 {
                    margin: 0;
                    font-size: 0.875rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #1e293b;
                }
                .widget-content {
                    flex: 1;
                    padding: 1rem;
                    overflow: auto;
                }
                .kpi-widget-content {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .kpi-widget-content .kpi-value {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: var(--primary-color);
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
