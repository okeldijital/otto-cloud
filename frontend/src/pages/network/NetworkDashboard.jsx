import React, { useState, useEffect } from 'react';
import { NetworkService } from '../../services/network';
import { Users, Building2, Globe, Share2, AlertCircle, FileCheck, Clock } from 'lucide-react';
import '../../App.css';

const NetworkDashboard = () => {
    const [stats, setStats] = useState({
        active_relationships: 0,
        missing_contracts: 0,
        expired_agreements: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await NetworkService.getHealth();
                setStats(data);
            } catch (error) {
                console.error("Error fetching network health:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statCards = [
        {
            label: 'Active Relationships',
            value: stats.active_relationships,
            icon: Share2,
            color: 'var(--primary-color)',
            description: 'Currently governed by active agreements'
        },
        {
            label: 'Missing Contracts',
            value: stats.missing_contracts,
            icon: AlertCircle,
            color: '#ef4444',
            description: 'Engagement without legal documentation'
        },
        {
            label: 'Expired Agreements',
            value: stats.expired_agreements,
            icon: Clock,
            color: '#f59e0b',
            description: 'Relationships requiring renewal'
        }
    ];

    if (loading) return <div className="p-8">Loading Network Health...</div>;

    return (
        <div className="page-container p-8">
            <header className="mb-8 ">
                <h1 className="text-3xl font-bold mb-2">Network</h1>
                <p className="text-gray-400">Ecosystem governance and professional relationships.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {statCards.map((stat, index) => (
                    <div key={index} className="stats-card p-6 bg-secondary-bg rounded-xl border border-border shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 rounded-lg" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                        <div className="text-4xl font-bold mb-1">{stat.value}</div>
                        <div className="text-gray-400 font-medium mb-1">{stat.label}</div>
                        <div className="text-sm text-gray-500">{stat.description}</div>
                    </div>
                ))}
            </div>

            <section className="mt-12">
                <h2 className="text-xl font-semibold mb-6">Network Health Overview</h2>
                <div className="bg-secondary-bg rounded-xl border border-border overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileCheck size={20} className="text-green-500" />
                            <span className="font-medium">Governance Status: V1 Lock</span>
                        </div>
                        <div className="text-sm text-gray-400">All data points aligned with Status Quo module</div>
                    </div>
                    <div className="p-8 text-center text-gray-400 italic">
                        "Ecosystem awareness + governance"
                    </div>
                </div>
            </section>
        </div>
    );
};

export default NetworkDashboard;
