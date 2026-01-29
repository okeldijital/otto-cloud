import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Building, Save } from 'lucide-react';

export default function Settings() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        email: user?.email || '',
        organization: 'OTTO Records', // Placeholder
        notifications: true,
        theme: 'light'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage('');

        // Simulate save
        setTimeout(() => {
            setIsSaving(false);
            setSaveMessage('Settings saved successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
        }, 1000);
    };

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Manage your account and preferences</p>
            </div>

            <div className="settings-content">
                <div className="settings-card">
                    <div className="settings-section">
                        <h2 className="section-title">
                            <User size={20} />
                            Profile Information
                        </h2>

                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label htmlFor="email">
                                    <Mail size={16} />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled
                                />
                                <small className="form-hint">Email cannot be changed</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="organization">
                                    <Building size={16} />
                                    Organization
                                </label>
                                <input
                                    type="text"
                                    id="organization"
                                    value={formData.organization}
                                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                />
                            </div>
                        </form>
                    </div>

                    <div className="settings-section">
                        <h2 className="section-title">Preferences</h2>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.notifications}
                                    onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
                                />
                                <span>Email notifications</span>
                            </label>
                            <small className="form-hint">Receive updates about your catalog and contracts</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="theme">Theme</label>
                            <select
                                id="theme"
                                value={formData.theme}
                                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark (Coming Soon)</option>
                            </select>
                        </div>
                    </div>

                    <div className="settings-actions">
                        {saveMessage && (
                            <span className="save-message success">{saveMessage}</span>
                        )}
                        <button
                            className="btn-primary"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            <Save size={18} />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
