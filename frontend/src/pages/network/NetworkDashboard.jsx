import React, { useState, useEffect } from 'react';
import { NetworkService } from '../../services/network';
import { Users, Building2, Globe, Share2, AlertCircle, FileCheck, Clock } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
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
        <div className="entity-page">
            <PageHeader
                title="Network"
                subtitle="Ecosystem governance and professional relationships."
            />

            <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {statCards.map((stat, index) => (
                    <div key={index} className="stats-card" style={{
                        padding: '1.5rem',
                        background: 'var(--surface-color)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                background: `${stat.color}20`,
                                color: stat.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                            {stat.value}
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {stat.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {stat.description}
                        </div>
                    </div>
                ))}
            </div>

            <section style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Network Health Overview</h2>
                <div style={{
                    background: 'var(--surface-color)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileCheck size={20} className="text-green-500" />
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Governance Status: V1 Lock</span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>All data points aligned with Status Quo module</div>
                    </div>
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        "Ecosystem awareness + governance"
                    </div>
                </div>
            </section>
        </div>
    );
};

export default NetworkDashboard;
