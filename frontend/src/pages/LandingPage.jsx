import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Zap, 
    Shield, 
    BarChart3, 
    Globe, 
    ArrowRight, 
    CheckCircle2,
    Music2,
    LayoutDashboard,
    Cpu,
    Workflow
} from 'lucide-react';
import Button from '../components/ui/Button';
import Logo from '../components/layout/Logo';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-app-default text-text-primary selection:bg-accent/30 selection:text-accent font-sans overflow-x-hidden">
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <Logo size="sm" />
                        <span className="text-xl font-bold tracking-tighter uppercase hidden sm:block">OTTO</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">Features</a>
                        <a href="#solutions" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">Solutions</a>
                        <a href="#pricing" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">Pricing</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/login')}
                            className="text-sm font-semibold text-text-secondary hover:text-white transition-colors px-4 py-2"
                        >
                            Sign In
                        </button>
                        <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => navigate('/register')}
                            className="rounded-full px-6"
                        >
                            Get Started
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-hero-glow pointer-events-none opacity-80" />

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-elevated border border-border shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Zap size={16} className="text-accent" />
                        <span className="text-xs font-bold tracking-widest uppercase">The Future of Music Operations</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        Operational Intelligence <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">for the Music Era</span>
                    </h1>
                    
                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-text-secondary mb-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                        Scale your label, publisher, or agency with OTTO. The only all-in-one SaaS for contract intelligence, automated royalty distribution, and rights governance.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
                        <Button 
                            variant="primary" 
                            size="lg" 
                            className="rounded-full px-10 h-14 text-base font-bold shadow-glow hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] transition-all"
                            onClick={() => navigate('/register')}
                        >
                            Start Free Trial <ArrowRight size={20} className="ml-2" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="lg" 
                            className="rounded-full px-10 h-14 border border-border/50 bg-surface hover:bg-surface-elevated transition-colors"
                        >
                            Book a Demo
                        </Button>
                    </div>

                    {/* Dashboard Preview */}
                    <div className="mt-24 relative max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-1000 delay-500">
                        {/* Glow behind the dashboard */}
                        <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full pointer-events-none" />
                        <div className="relative rounded-[32px] border border-border/80 bg-premium-glass p-2 shadow-glass overflow-hidden backdrop-blur-xl">
                            <img 
                                src="/assets/dashboard-preview.png" 
                                alt="OTTO Dashboard Preview" 
                                className="w-full rounded-[24px] shadow-inner opacity-90 border border-white/5"
                            />
                        </div>
                    </div>

                    {/* Trusted By Section */}
                    <div className="mt-24 max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border text-[10px] text-text-secondary uppercase tracking-widest mb-6">
                            Trusted
                        </div>
                        <h2 className="text-2xl font-medium text-white mb-8">Trusted by 300+ businesses</h2>
                        <div className="flex flex-wrap justify-center items-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                            {/* Music Industry Placeholders */}
                            <span className="text-xl font-bold tracking-tighter">SONY MUSIC</span>
                            <span className="text-xl font-bold tracking-tighter">UNIVERSAL</span>
                            <span className="text-xl font-bold tracking-tighter">WARNER</span>
                            <span className="text-xl font-bold tracking-tighter">believe</span>
                            <span className="text-xl font-bold tracking-tighter">AWAL</span>
                            <span className="text-xl font-bold tracking-tighter">EMPIRE</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 px-6 bg-background relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border text-[10px] text-text-secondary uppercase tracking-widest mb-4">
                            Features
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Built for Scale. Powered by AI.</h2>
                        <p className="text-text-secondary max-w-xl mx-auto">Everything you need to manage complex music rights and operations in a single, unified cloud workspace.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon={<Cpu className="text-accent" />}
                            title="Contract Intelligence"
                            description="AI-driven extraction of payment schedules, territory rights, and term dates from any document."
                        />
                        <FeatureCard 
                            icon={<Workflow className="text-purple-400" />}
                            title="Release Orchestration"
                            description="From distribution setup to royalty splitting, OTTO automates the entire release lifecycle."
                        />
                        <FeatureCard 
                            icon={<LayoutDashboard className="text-emerald-400" />}
                            title="Rights Governance"
                            description="Real-time monitoring of compliance gaps and catalog integrity across your organization."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-6 relative overflow-hidden bg-background">
                <div className="max-w-5xl mx-auto rounded-[48px] bg-premium-glass border border-accent/20 p-16 md:p-24 text-center relative overflow-hidden shadow-glass">
                    <div className="absolute inset-0 bg-hero-glow pointer-events-none opacity-40" />
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 relative z-10 text-white">Ready to modernize your <br /> music business?</h2>
                    <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto relative z-10">Join 500+ labels and agencies using OTTO to automate their back-office.</p>
                    <div className="relative z-10">
                        <Button 
                            variant="primary" 
                            size="lg" 
                            className="rounded-full px-12 h-16 text-lg font-bold shadow-glow"
                            onClick={() => navigate('/register')}
                        >
                            Get Started Free
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-border/40 bg-background relative z-10">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-6" onClick={() => navigate('/')}>
                            <Logo size="sm" />
                            <span className="text-lg font-bold uppercase tracking-tight">OTTO</span>
                        </div>
                        <p className="text-text-secondary max-w-xs">2026 SaaS platform for music industry operations and rights management.</p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-text-secondary">Platform</h4>
                        <ul className="space-y-4 text-sm text-text-secondary">
                            <li><a href="#" className="hover:text-white transition-colors">Catalog Management</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Royalty Engine</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">AI Analysis</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-text-secondary">Company</h4>
                        <ul className="space-y-4 text-sm text-text-secondary">
                            <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-sm text-text-secondary">&copy; 2026 OKEL DIJITAL. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <div className="w-5 h-5 bg-surface-elevated rounded-full" />
                        <div className="w-5 h-5 bg-surface-elevated rounded-full" />
                        <div className="w-5 h-5 bg-surface-elevated rounded-full" />
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <div className="p-8 rounded-[24px] bg-premium-glass border border-border hover:bg-white/5 hover:border-accent/40 transition-all duration-500 group shadow-sm hover:shadow-glow hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-8 border border-white/10 group-hover:bg-accent/20 transition-colors">
                {React.cloneElement(icon, { size: 24 })}
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
            <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
        </div>
    );
}
