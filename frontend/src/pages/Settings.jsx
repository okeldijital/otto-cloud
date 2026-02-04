import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Building, Save, Camera, Upload, X, Check, AlertCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import api, { BASE_URL } from '../lib/api';

export default function Settings() {
    const { user, refreshUser } = useAuth();
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        organization: 'OTTO Records',
        notifications: true,
        theme: 'light'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(
        user?.avatar_url
            ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`)
            : null
    );
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                full_name: user.full_name || '',
                email: user.email || ''
            }));

            if (user.avatar_url) {
                const avatarUrl = user.avatar_url.startsWith('http')
                    ? user.avatar_url
                    : `${BASE_URL}${user.avatar_url}`;
                setPreviewUrl(avatarUrl);
            }
        }
    }, [user]);

    const handleAvatarChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setSaveStatus({
                    type: 'error',
                    message: 'Please select a valid image file (JPG, PNG, GIF, or WebP)'
                });
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setSaveStatus({
                    type: 'error',
                    message: 'Image size must be less than 5MB'
                });
                return;
            }

            setSelectedAvatar(file);
            setPreviewUrl(URL.createObjectURL(file));
            setSaveStatus({ type: '', message: '' });
        }
    };

    const handleRemoveAvatar = () => {
        setSelectedAvatar(null);
        setPreviewUrl(null);
        setSaveStatus({ type: '', message: '' });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveStatus({ type: '', message: '' });

        try {
            let avatarUrl = user?.avatar_url;

            // Upload avatar if a new one was selected
            if (selectedAvatar) {
                setIsUploading(true);
                const formData = new FormData();
                formData.append('file', selectedAvatar);

                const uploadResponse = await api.post('/documents/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                avatarUrl = uploadResponse.data.file_path;
                setIsUploading(false);
            }

            // Update user profile
            const updateData = {
                full_name: formData.full_name,
                avatar_url: avatarUrl,
            };

            await api.put('/auth/me', updateData);

            setSaveStatus({
                type: 'success',
                message: 'Settings saved successfully!'
            });

            // Refresh user data in context
            if (refreshUser) {
                await refreshUser();
            }

            // Clear selected avatar after successful save
            setSelectedAvatar(null);

        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveStatus({
                type: 'error',
                message: error.response?.data?.detail || 'Failed to save settings. Please try again.'
            });
        } finally {
            setIsSaving(false);
            setIsUploading(false);
        }
    };

    return (
        <div className="page-container p-8">
            <PageHeader
                title="Settings"
                subtitle="Manage your account and preferences"
            />

            <div className="max-w-3xl">
                <div className="panel">
                    <div className="panel-header bg-surface-secondary">
                        <h2 className="font-bold flex items-center gap-2">
                            <User size={20} />
                            Profile Information
                        </h2>
                    </div>

                    <div className="panel-content">
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Avatar Upload Section */}
                            <div className="flex items-start gap-6 pb-6 border-b border-border">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-surface-secondary border-2 border-border flex items-center justify-center group">
                                        {previewUrl ? (
                                            <img
                                                src={previewUrl}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User size={40} className="text-muted" />
                                        )}
                                        {previewUrl && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveAvatar}
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                title="Remove avatar"
                                            >
                                                <X size={24} className="text-white" />
                                            </button>
                                        )}
                                    </div>
                                    {selectedAvatar && (
                                        <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1">
                                            <Check size={14} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-semibold mb-2">Profile Photo</h3>
                                    <p className="text-sm text-muted mb-4">
                                        Upload a photo to personalize your account. JPG, PNG, GIF or WebP. Max 5MB.
                                    </p>
                                    <div className="flex gap-3">
                                        <label
                                            htmlFor="avatar-upload"
                                            className="btn btn-secondary btn-sm cursor-pointer"
                                        >
                                            <Camera size={16} />
                                            {previewUrl ? 'Change Photo' : 'Upload Photo'}
                                        </label>
                                        <input
                                            type="file"
                                            id="avatar-upload"
                                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                        {previewUrl && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveAvatar}
                                                className="btn btn-ghost btn-sm text-status-critical-text"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Full Name */}
                            <div className="form-group">
                                <label htmlFor="full_name" className="flex items-center gap-2 mb-2 font-medium">
                                    <User size={16} />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-surface-color border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary/50 transition-colors"
                                    placeholder="Enter your full name"
                                />
                            </div>

                            {/* Email */}
                            <div className="form-group">
                                <label htmlFor="email" className="flex items-center gap-2 mb-2 font-medium">
                                    <Mail size={16} />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    disabled
                                    className="w-full bg-surface-secondary border border-border rounded-lg px-4 py-2.5 outline-none opacity-60 cursor-not-allowed"
                                />
                                <small className="text-xs text-muted mt-1 block">
                                    Email cannot be changed
                                </small>
                            </div>

                            {/* Organization */}
                            <div className="form-group">
                                <label htmlFor="organization" className="flex items-center gap-2 mb-2 font-medium">
                                    <Building size={16} />
                                    Organization
                                </label>
                                <input
                                    type="text"
                                    id="organization"
                                    value={formData.organization}
                                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                    className="w-full bg-surface-color border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary/50 transition-colors"
                                    placeholder="Organization name"
                                />
                            </div>

                            {/* Status Messages */}
                            {saveStatus.message && (
                                <div className={`p-4 rounded-lg flex items-start gap-3 ${saveStatus.type === 'success'
                                    ? 'bg-status-success-bg border border-status-success-text/20'
                                    : 'bg-status-critical-bg border border-status-critical-text/20'
                                    }`}>
                                    {saveStatus.type === 'success' ? (
                                        <Check size={20} className="text-status-success-text flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle size={20} className="text-status-critical-text flex-shrink-0 mt-0.5" />
                                    )}
                                    <p className={`text-sm font-medium ${saveStatus.type === 'success'
                                        ? 'text-status-success-text'
                                        : 'text-status-critical-text'
                                        }`}>
                                        {saveStatus.message}
                                    </p>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="flex justify-end pt-4 border-t border-border">
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-md"
                                    disabled={isSaving || isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <Upload size={18} className="animate-pulse" />
                                            Uploading...
                                        </>
                                    ) : isSaving ? (
                                        <>
                                            <Save size={18} className="animate-pulse" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="panel mt-6">
                    <div className="panel-header bg-surface-secondary">
                        <h2 className="font-bold">Preferences</h2>
                    </div>

                    <div className="panel-content space-y-6">
                        <div className="form-group">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.notifications}
                                    onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <div>
                                    <span className="font-medium">Email Notifications</span>
                                    <p className="text-xs text-muted mt-0.5">
                                        Receive updates about your catalog and contracts
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="form-group">
                            <label htmlFor="theme" className="block mb-2 font-medium">
                                Theme
                            </label>
                            <select
                                id="theme"
                                value={formData.theme}
                                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                                className="w-full bg-surface-color border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary/50 transition-colors"
                            >
                                <option value="light">Light</option>
                                <option value="dark" disabled>Dark (Coming Soon)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
