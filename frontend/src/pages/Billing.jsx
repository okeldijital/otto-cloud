import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
    CreditCard, 
    Zap, 
    Check, 
    AlertCircle, 
    TrendingUp, 
    ShieldCheck,
    ArrowUpRight,
    History
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../lib/api';

export default function Billing() {
    const { user } = useAuth();
    const [billingInfo, setBillingInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpgrading, setIsUpgrading] = useState(false);

    const fetchBilling = async () => {
        try {
            const res = await api.get('/billing/info');
            setBillingInfo(res.data.data);
        } catch (error) {
            console.error('Failed to fetch billing info', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBilling();
    }, []);

    const handleUpgrade = async (planId) => {
        setIsUpgrading(true);
        try {
            const res = await api.post('/billing/checkout', { plan_id: planId });
            if (res.data.url) {
                window.location.href = res.data.url;
            }
        } catch (error) {
            console.error('Upgrade failed', error);
            alert('Failed to initiate checkout. Please try again.');
        } finally {
            setIsUpgrading(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-text-secondary">Loading subscription details...</div>;
    }

    const { plan, usage } = billingInfo || { plan: null, usage: { jobs: 0, limit: 100 } };
    const usagePercent = Math.min(100, (usage.jobs / usage.limit) * 100);

    return (
        <div className="page-container p-8 max-w-6xl mx-auto">
            <div className="text-center mb-16 mt-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border text-[10px] text-text-secondary uppercase tracking-widest mb-4">
                    Pricing
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">Plans for Every Business Need</h1>
                <p className="text-text-secondary">Manage your Otto Cloud plan and resource usage.</p>
            </div>

            {/* 3-Tier Pricing Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                
                {/* Tier 1: Free */}
                <div className="rounded-[24px] bg-premium-glass border border-white/5 p-8 flex flex-col hover:border-white/10 transition-colors shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-4 h-4 rounded-full bg-surface-elevated border border-white/10" />
                        <h3 className="text-white font-medium">Free Tier</h3>
                    </div>
                    <div className="mb-4">
                        <span className="text-4xl font-bold text-white">$0</span>
                        <span className="text-text-secondary">/month</span>
                    </div>
                    <p className="text-text-secondary text-sm h-12 mb-6">Lifetime free access for community members.</p>
                    
                    <div className="flex-grow space-y-4 mb-8">
                        <div className="flex items-center gap-3 text-sm text-text-secondary">
                            <Check size={16} className="text-white" /> Basic Contract Management
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-secondary">
                            <Check size={16} className="text-white" /> 100 Jobs per month
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-secondary">
                            <Check size={16} className="text-white" /> Standard Support
                        </div>
                    </div>
                    
                    <Button variant={!plan ? "primary" : "secondary"} className="w-full h-12 rounded-full" disabled>
                        {!plan ? "Current Plan" : "Downgrade"}
                    </Button>
                </div>

                {/* Tier 2: Pro (Highlighted) */}
                <div className="rounded-[24px] bg-premium-glass border border-accent/40 p-8 flex flex-col shadow-glow relative transform md:-translate-y-4">
                    <div className="absolute inset-0 bg-accent/5 rounded-[24px] pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-4 h-4 rounded-full bg-accent border border-accent/50 shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
                            <h3 className="text-white font-medium">Pro</h3>
                        </div>
                        <div className="mb-4">
                            <span className="text-4xl font-bold text-white">$49</span>
                            <span className="text-text-secondary">/month</span>
                        </div>
                        <p className="text-text-secondary text-sm h-12 mb-6">For growing labels that need advanced AI insights and automation.</p>
                        
                        <div className="flex-grow space-y-4 mb-8">
                            <div className="flex items-center gap-3 text-sm text-text-secondary">
                                <Check size={16} className="text-white" /> AI Contract Analysis
                            </div>
                            <div className="flex items-center gap-3 text-sm text-text-secondary">
                                <Check size={16} className="text-white" /> Bulk Release Generation
                            </div>
                            <div className="flex items-center gap-3 text-sm text-text-secondary">
                                <Check size={16} className="text-white" /> Priority Governance Scans
                            </div>
                            <div className="flex items-center gap-3 text-sm text-text-secondary">
                                <Check size={16} className="text-white" /> API Access & Webhooks
                            </div>
                        </div>
                        
                        <Button variant="primary" className="w-full h-12 rounded-full shadow-glow" onClick={() => handleUpgrade('pro')}>
                            Choose this plan
                        </Button>
                    </div>
                </div>

                {/* Tier 3: Enterprise */}
                <div className="rounded-[24px] bg-premium-glass border border-white/5 p-8 flex flex-col hover:border-white/10 transition-colors shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-4 h-4 rounded-full bg-surface-elevated border border-white/10" />
                        <h3 className="text-white font-medium">Enterprise</h3>
                    </div>
                    <div className="mb-4">
                        <span className="text-4xl font-bold text-white">Custom</span>
                    </div>
                    <p className="text-text-secondary text-sm h-12 mb-6">For enterprises requiring tailored solutions and full scalability.</p>
                    
                    <div className="flex-grow space-y-4 mb-8">
                        <div className="flex items-center gap-3 text-sm text-text-secondary">
                            <Check size={16} className="text-white" /> Custom Integrations
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-secondary">
                            <Check size={16} className="text-white" /> Dedicated Account Manager
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-secondary">
                            <Check size={16} className="text-white" /> 24/7 Premium Support
                        </div>
                    </div>
                    
                    <Button variant="secondary" className="w-full h-12 rounded-full bg-white/5">
                        Contact Us
                    </Button>
                </div>
            </div>

            {/* Current Usage Section */}
            <div className="rounded-[24px] bg-premium-glass border border-white/10 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                        <Zap size={16} className="text-accent" />
                    </div>
                    <h3 className="text-xl font-medium text-white">Current Usage</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-text-secondary uppercase tracking-widest">Job Usage</span>
                        <span className="text-sm font-bold text-white">{usage.jobs} / {usage.limit} <span className="text-text-secondary font-medium">units</span></span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${usagePercent > 90 ? 'bg-danger shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-accent shadow-[0_0_15px_rgba(14,165,233,0.5)]'}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                    <p className="text-xs text-text-secondary italic">
                        {usagePercent > 80 ? '⚠️ You are approaching your monthly limit.' : 'Resets on the 1st of next month.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon, text }) {
    return (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            {icon}
            <span className="text-sm font-medium text-white">{text}</span>
        </div>
    );
}
