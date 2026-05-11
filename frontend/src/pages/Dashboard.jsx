import React, { useState, useEffect } from 'react';
import { Responsive } from 'react-grid-layout';
import { WidthProvider } from '../components/WidthProvider';
import { AnalyticsService } from '../services/analytics';
import { BASE_URL } from '../lib/api';
import { TrendingUp, Music, FileText, Calendar, Activity as ActivityIcon, Layout, GripVertical, Users, Disc, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';

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

    if (isLoading) return <div className="h-screen flex items-center justify-center font-medium text-text-secondary bg-background">Initializing Welcome to Otto...</div>;

    return (
        <div className="bg-background min-h-screen">
            <PageHeader
                title="Welcome to Otto"
                subtitle="Data Management System for Record Labels"
                actions={
                    <Button variant="secondary" onClick={resetLayout}>Reset Layout</Button>
                }
            />

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
                <Card key="kpi-artists" title="Artists" headerAction={<Users size={18} className="text-text-secondary" />} contentClassName="flex items-center justify-center">
                    <div className="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(14,165,233,0.5)] tracking-tight">{kpis.total_artists}</div>
                </Card>

                <Card key="kpi-releases" title="Releases" headerAction={<Disc size={18} className="text-text-secondary" />} contentClassName="flex items-center justify-center">
                    <div className="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(14,165,233,0.5)] tracking-tight">{kpis.total_releases}</div>
                </Card>

                <Card key="kpi-works" title="Works" headerAction={<FileText size={18} className="text-text-secondary" />} contentClassName="flex items-center justify-center">
                    <div className="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(14,165,233,0.5)] tracking-tight">{kpis.total_works}</div>
                </Card>

                <Card key="kpi-pending" title="Pending" headerAction={<Clock size={18} className="text-text-secondary" />} contentClassName="flex items-center justify-center">
                    <div className="text-5xl font-bold text-danger drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] tracking-tight">{pendingContracts}</div>
                </Card>

                {/* Catalog Growth */}
                <Card key="growth" title="Catalog Overview" headerAction={<TrendingUp size={18} className="text-text-secondary" />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={growthData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                            <Tooltip 
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                                contentStyle={{ backgroundColor: 'rgba(10, 15, 28, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(8px)' }} 
                            />
                            <Bar dataKey="value" fill="url(#colorUv)" radius={[4, 4, 0, 0]} />
                            <defs>
                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={1}/>
                                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.2}/>
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Recent Activity */}
                <Card key="activity" title="Recent Activity" headerAction={<ActivityIcon size={18} className="text-text-secondary" />}>
                    <div className="flex flex-col gap-4">
                        {recentActivity.map(activity => (
                            <div key={activity.id} className="flex gap-3 items-start group">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                    activity.action === 'created' ? 'bg-success' : 
                                    activity.action === 'updated' ? 'bg-accent' : 'bg-danger'
                                }`} />
                                <div className="flex-1">
                                    <div className="text-xs text-text-primary leading-tight">
                                        <span className="font-bold uppercase text-[10px] mr-1">{activity.action}</span> 
                                        <span className="text-text-secondary">{activity.entity_type}</span>
                                        {activity.entity_name && <span className="font-medium">: {activity.entity_name}</span>}
                                    </div>
                                    <div className="text-[10px] text-text-secondary mt-0.5">{formatDate(activity.timestamp)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Upcoming Events */}
                <Card key="events" title="Upcoming Events" headerAction={<Calendar size={18} className="text-text-secondary" />}>
                    <div className="flex flex-col gap-4">
                        {upcomingEvents.map(event => (
                            <div key={event.id} className="flex gap-4 items-center">
                                <div className="bg-surface-elevated border border-border rounded-lg px-2 py-1 text-center min-w-[48px] shadow-sm">
                                    <div className="text-[9px] font-bold text-text-secondary uppercase">{formatMonthAbbr(event.start_time)}</div>
                                    <div className="text-lg font-bold text-text-primary leading-none">{formatDay(event.start_time)}</div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-sm font-semibold text-text-primary truncate">{event.title}</div>
                                    <div className="text-[10px] text-text-secondary uppercase tracking-wider">{event.event_type} • {formatTime(event.start_time)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Latest Release */}
                <Card key="release" title="Latest Release" headerAction={<Layout size={18} className="text-text-secondary" />}>
                    {latestRelease ? (
                        <div className="flex gap-4 items-center h-full">
                            {latestRelease.cover_art_url ? (
                                <img src={latestRelease.cover_art_url.startsWith('http') ? latestRelease.cover_art_url : `${BASE_URL}${latestRelease.cover_art_url}`} alt="" className="w-20 h-20 rounded-lg object-cover shadow-md" />
                            ) : (
                                <div className="w-20 h-20 rounded-lg bg-surface-elevated flex items-center justify-center text-text-secondary shadow-inner"><Disc size={32} /></div>
                            )}
                            <div className="flex-1 overflow-hidden">
                                <h4 className="text-sm font-bold text-text-primary truncate mb-1">{latestRelease.title}</h4>
                                <p className="text-xs text-text-secondary mb-2">{formatDate(latestRelease.release_date)}</p>
                                <Badge variant="primary" size="sm">{latestRelease.release_type}</Badge>
                            </div>
                        </div>
                    ) : <p className="text-text-secondary text-sm">No releases found</p>}
                </Card>
            </ResponsiveGridLayout>
        </div>
    );
};

export default Dashboard;
