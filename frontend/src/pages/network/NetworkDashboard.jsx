import React, { useState, useEffect } from 'react';
import { NetworkService } from '../../services/network';
import { Users, Building2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import '../../App.css';

const NetworkDashboard = () => {
    const [counts, setCounts] = useState({
        individuals: 0,
        organizations: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                // Fetch simple lists to get counts. Optimized endpoints would be better but this works for now.
                const [inds, orgs] = await Promise.all([
                    NetworkService.getIndividuals(),
                    NetworkService.getOrganizations()
                ]);
                setCounts({
                    individuals: inds.length,
                    organizations: orgs.length
                });
            } catch (error) {
                console.error("Error fetching network counts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCounts();
    }, []);

    const directoryCards = [
        {
            label: 'Individuals',
            count: counts.individuals,
            icon: Users,
            path: '/network/individuals',
            description: 'Collaborators, artists, and personnel.'
        },
        {
            label: 'Organizations',
            count: counts.organizations,
            icon: Building2,
            path: '/network/organizations',
            description: 'Labels, publishers, and companies.'
        }
    ];

    if (loading) return <div className="p-8">Loading Directory...</div>;

    return (
        <div className="entity-page">
            <PageHeader
                title="Network Directory"
                subtitle="Collaborators and organizations."
            />

            <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {directoryCards.map((card, index) => (
                    <Link key={index} to={card.path} style={{ textDecoration: 'none' }}>
                        <div className="stats-card hover:border-primary-color transition-colors" style={{
                            padding: '2rem',
                            background: 'var(--surface-color)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            justifyContent: 'space-between',
                            height: '100%',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '12px',
                                    background: 'var(--bg-color)',
                                    color: 'var(--primary-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <card.icon size={24} />
                                </div>
                                <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                            </div>

                            <div>
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, marginBottom: '0.5rem' }}>
                                    {card.count}
                                </div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                                    {card.label}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    {card.description}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default NetworkDashboard;
