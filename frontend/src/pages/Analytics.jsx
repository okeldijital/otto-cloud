import React, { useState, useEffect } from 'react';
import { Responsive } from 'react-grid-layout';
import { WidthProvider } from '../components/WidthProvider';
import { AnalyticsService } from '../services/analytics';
import {
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity, GripVertical } from 'lucide-react';

const ResponsiveGridLayout = WidthProvider(Responsive);

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

const Analytics = () => {
    const [growthData, setGrowthData] = useState([]);
    const [kpis, setKpis] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    // Dynamic Layout
    const [layout, setLayout] = useState(() => {
        const saved = localStorage.getItem('otto_analytics_layout');
        return saved ? JSON.parse(saved) : [
            { i: 'overview', x: 0, y: 0, w: 4, h: 10 },
            { i: 'distribution', x: 0, y: 10, w: 2, h: 10 },
            { i: 'trends', x: 2, y: 10, w: 2, h: 10 }
        ];
    });

    const onLayoutChange = (currentLayout) => {
        setLayout(currentLayout);
        localStorage.setItem('otto_analytics_layout', JSON.stringify(currentLayout));
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                const [growData, kpiData] = await Promise.all([
                    AnalyticsService.getCatalogGrowth(),
                    AnalyticsService.getKPIs()
                ]);
                setGrowthData(growData);
                setKpis(kpiData);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const WidgetHeader = ({ title, icon: Icon }) => (
        <div className="widget-header">
            <h3><Icon size={18} /> {title}</h3>
            <GripVertical size={14} className="text-muted" />
        </div>
    );

    // Mock data for more visual flavor if real data is sparse
    const mockDistribution = [
        { name: 'Pop', value: 400 },
        { name: 'Hip Hop', value: 300 },
        { name: 'Electronic', value: 300 },
        { name: 'Rock', value: 200 }
    ];

    if (isLoading) return <div className="loading-state">Aggregating Global Metrics...</div>;

    return (
        <div className="entity-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Advanced Analytics</h1>
                    <p className="page-subtitle">Visual performance indicators and catalog distribution</p>
                </div>
            </div>

            <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 4, md: 4, sm: 2, xs: 1, xxs: 1 }}
                rowHeight={30}
                draggableHandle=".widget-header"
                onLayoutChange={onLayoutChange}
            >
                <div key="overview" className="dashboard-grid-item">
                    <WidgetHeader title="Catalog Growth Trend" icon={TrendingUp} />
                    <div className="widget-content">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div key="distribution" className="dashboard-grid-item">
                    <WidgetHeader title="Genre Distribution" icon={PieIcon} />
                    <div className="widget-content">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={mockDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {mockDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div key="trends" className="dashboard-grid-item">
                    <WidgetHeader title="System Activity Pulse" icon={Activity} />
                    <div className="widget-content">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="stepAfter" dataKey="value" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </ResponsiveGridLayout>
        </div>
    );
};

export default Analytics;
