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

const COLORS = ['#7c3aed', '#4f46e5', '#3b82f6', '#ec4899', '#f43f5e', '#8b5cf6'];

const Analytics = () => {
    const [growthData, setGrowthData] = useState([]);
    const [kpis, setKpis] = useState({});
    const [isLoading, setIsLoading] = useState(true);

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
        <div className="flex items-center justify-between p-4 bg-white/[0.03] border-b border-white/5 cursor-move">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Icon size={16} className="text-accent" />
                {title}
            </h3>
            <GripVertical size={14} className="text-text-secondary opacity-30" />
        </div>
    );

    const mockDistribution = [
        { name: 'Pop', value: 400 },
        { name: 'Hip Hop', value: 300 },
        { name: 'Electronic', value: 300 },
        { name: 'Rock', value: 200 }
    ];

    if (isLoading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-700">
            <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
            <p className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Aggregating Global Metrics...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                        <BarChart3 size={32} className="text-accent" />
                        Intelligence Terminal
                    </h1>
                    <p className="mt-2 text-text-secondary text-sm font-medium">Visual performance indicators and catalog distribution</p>
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
                <div key="overview" className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden shadow-glass flex flex-col">
                    <WidgetHeader title="Catalog Growth Trend" icon={TrendingUp} />
                    <div className="flex-1 p-6 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1a1d23', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '700'
                                    }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div key="distribution" className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden shadow-glass flex flex-col">
                    <WidgetHeader title="Genre Distribution" icon={PieIcon} />
                    <div className="flex-1 p-6 min-h-0">
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
                                    stroke="none"
                                >
                                    {mockDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1a1d23', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '700'
                                    }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div key="trends" className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden shadow-glass flex flex-col">
                    <WidgetHeader title="System Activity Pulse" icon={Activity} />
                    <div className="flex-1 p-6 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1a1d23', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '700'
                                    }}
                                />
                                <Line type="stepAfter" dataKey="value" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, fill: '#ec4899', strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </ResponsiveGridLayout>
        </div>
    );
};

export default Analytics;
