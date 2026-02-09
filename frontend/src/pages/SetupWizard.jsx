import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Monitor, CheckCircle2 } from 'lucide-react';

const SetupWizard = () => {
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Setup Guard: If already configured, redirect to dashboard
    useEffect(() => {
        const nodeRole = localStorage.getItem('OTTO_NODE_ROLE');
        if (nodeRole) {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const handleContinue = () => {
        if (!selectedRole) return;

        setIsSaving(true);

        // Persist to localStorage
        localStorage.setItem('OTTO_NODE_ROLE', selectedRole);
        localStorage.setItem('OTTO_NODE_CONFIGURED_AT', new Date().toISOString());

        // Brief delay to show "Saving..." state
        setTimeout(() => {
            setIsSaving(false);
            navigate('/');
        }, 500);
    };

    return (
        <div className="min-h-screen bg-surface-color flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
                        <Server className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Welcome to OTTO
                    </h1>
                    <p className="text-muted text-lg">
                        Choose how this instance will operate
                    </p>
                </div>

                {/* Role Selection Card */}
                <div className="panel">
                    <div className="panel-content space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-4 text-foreground">
                                Select Operating Mode
                            </h2>
                            <p className="text-sm text-muted mb-6">
                                This choice determines whether this OTTO instance acts as the central authority (Hub) or connects to an existing Hub (Spoke).
                            </p>
                        </div>

                        {/* Role Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Hub Card */}
                            <button
                                onClick={() => setSelectedRole('hub')}
                                className={`
                                    relative p-6 rounded-lg border-2 transition-all text-left
                                    ${selectedRole === 'hub'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50 bg-surface-secondary'
                                    }
                                `}
                            >
                                {selectedRole === 'hub' && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                                <div className="flex items-start gap-4">
                                    <div className={`
                                        p-3 rounded-lg
                                        ${selectedRole === 'hub' ? 'bg-primary' : 'bg-surface-color'}
                                    `}>
                                        <Server className={`w-6 h-6 ${selectedRole === 'hub' ? 'text-white' : 'text-primary'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-1 text-foreground">
                                            Hub
                                        </h3>
                                        <p className="text-sm text-muted">
                                            Authoritative instance. Owns the source of truth and manages data synchronization.
                                        </p>
                                        <div className="mt-3 space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-muted">
                                                <div className="w-1 h-1 rounded-full bg-primary"></div>
                                                <span>Central database authority</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted">
                                                <div className="w-1 h-1 rounded-full bg-primary"></div>
                                                <span>Accepts changes from Spokes</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted">
                                                <div className="w-1 h-1 rounded-full bg-primary"></div>
                                                <span>Runs migrations</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {/* Spoke Card */}
                            <button
                                onClick={() => setSelectedRole('spoke')}
                                className={`
                                    relative p-6 rounded-lg border-2 transition-all text-left
                                    ${selectedRole === 'spoke'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50 bg-surface-secondary'
                                    }
                                `}
                            >
                                {selectedRole === 'spoke' && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                                <div className="flex items-start gap-4">
                                    <div className={`
                                        p-3 rounded-lg
                                        ${selectedRole === 'spoke' ? 'bg-primary' : 'bg-surface-color'}
                                    `}>
                                        <Monitor className={`w-6 h-6 ${selectedRole === 'spoke' ? 'text-white' : 'text-primary'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-1 text-foreground">
                                            Spoke
                                        </h3>
                                        <p className="text-sm text-muted">
                                            Non-authoritative instance. Captures local work and syncs to Hub.
                                        </p>
                                        <div className="mt-3 space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-muted">
                                                <div className="w-1 h-1 rounded-full bg-primary"></div>
                                                <span>Local data capture</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted">
                                                <div className="w-1 h-1 rounded-full bg-primary"></div>
                                                <span>Syncs changes to Hub</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted">
                                                <div className="w-1 h-1 rounded-full bg-primary"></div>
                                                <span>Portable workstation</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Continue Button */}
                        <div className="pt-4 border-t border-border">
                            <button
                                onClick={handleContinue}
                                disabled={!selectedRole || isSaving}
                                className="btn btn-primary btn-lg w-full"
                            >
                                {isSaving ? 'Saving...' : 'Continue'}
                            </button>
                            {!selectedRole && (
                                <p className="text-xs text-muted text-center mt-2">
                                    Please select an operating mode to continue
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-muted">
                        This choice can be changed later in Settings
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SetupWizard;
