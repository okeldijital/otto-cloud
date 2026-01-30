import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Building, Save, Camera } from 'lucide-react';
import { DocumentsService } from '../services/operations';
import api from '../lib/api';

const API_URL = 'http://localhost:8000'; // Or import from config

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

    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(user?.avatar_url ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`) : null);

    const handleAvatarChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedAvatar(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage('');

        try {
            let avatarUrl = user?.avatar_url;

            if (selectedAvatar) {
                const uploaded = await DocumentsService.upload(selectedAvatar);
                avatarUrl = uploaded.file_path;
            }

            const updateData = {
                full_name: user?.full_name, // Maintain existing if not in form
                avatar_url: avatarUrl,
                // Add other fields if editable
            };

            // Also update organization/preferences if backend supports it (mocked here or handled via separate endpoint)
            // For now, only persisting avatar via /auth/me

            await api.put('/auth/me', updateData);

            setSaveMessage('Settings saved successfully! Reloading...');
            setTimeout(() => window.location.reload(), 1500); // Reload to reflect changes in TopBar
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveMessage('Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
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

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={40} className="text-muted" />
                                )}
                            </div>
                            <div>
                                <label htmlFor="avatar-upload" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Camera size={16} /> Change Photo
                                </label>
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>

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
