import React, { useState, useEffect } from 'react';
import { UsersService, AdminService } from '../services/operations';
import { BASE_URL } from '../lib/api';
import { confirmAction, isTauriEnv } from '../lib/tauri';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import { Shield, Users, Database, History, RefreshCcw, HardDrive, Settings, Activity, Upload, Download, Timer } from 'lucide-react';

const Admin = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [backups, setBackups] = useState([]);
    const [stats, setStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [backupSchedule, setBackupSchedule] = useState('weekly');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = React.useRef(null);

    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        password: '',
        role: 'member',
        is_active: true
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'users') {
                const data = await UsersService.getAll();
                setUsers(data);
            } else if (activeTab === 'backups') {
                const [data, scheduleData] = await Promise.all([
                    AdminService.getBackups(),
                    AdminService.getBackupSchedule()
                ]);
                setBackups(data);
                setBackupSchedule(scheduleData.frequency);
            } else if (activeTab === 'system') {
                const [statsData, logsData] = await Promise.all([
                    AdminService.getStats(),
                    AdminService.getAuditLogs()
                ]);
                setStats(statsData);
                setAuditLogs(logsData);
            }
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleCreateUser = () => {
        setEditingUser(null);
        setFormData({ email: '', full_name: '', password: '', role: 'member', is_active: true });
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            full_name: user.full_name || '',
            password: '', // Don't show password
            role: user.role || 'member',
            is_active: user.is_active
        });
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (user) => {
        if (await confirmAction(`Are you sure you want to delete user ${user.email}?`, 'Delete User')) {
            try {
                await UsersService.delete(user.id);
                fetchData();
            } catch (error) {
                alert('Failed to delete user');
            }
        }
    };

    const handleSubmitUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            if (editingUser) {
                const updateData = { ...formData };
                if (!updateData.password) delete updateData.password;
                await UsersService.update(editingUser.id, updateData);
            } else {
                await UsersService.create(formData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackup = async () => {
        try {
            await AdminService.backup();
            fetchData();
            alert('Backup created successfully');
        } catch (error) {
            alert('Backup failed');
        }
    };

    const handleRestore = async (filename) => {
        if (await confirmAction(`RESTORE SYSTEM from ${filename}? This will overwrite current data.`, 'Restore System')) {
            try {
                const res = await AdminService.restore(filename);
                alert(res.message || 'System restored successfully');
            } catch (error) {
                alert('Restore failed');
            }
        }
    };

    const handleDownload = async (filename) => {
        try {
            await AdminService.downloadBackup(filename);
        } catch (error) {
            alert('Download failed');
        }
    };

    const handleUploadClick = async () => {
        if (isTauriEnv()) {
            // Use Tauri file dialog
            try {
                const { open } = await import('@tauri-apps/plugin-dialog');
                const { readFile } = await import('@tauri-apps/plugin-fs');

                const filePath = await open({
                    multiple: false,
                    filters: [{
                        name: 'Backup Files',
                        extensions: ['zip']
                    }]
                });

                if (!filePath) return; // User cancelled

                // Read the file
                const fileData = await readFile(filePath);

                // Create a File object from the data
                const fileName = filePath.split('/').pop();
                const file = new File([fileData], fileName, { type: 'application/zip' });

                // Upload to backend
                const response = await AdminService.uploadBackup(file);
                alert(response.message || 'Backup uploaded and restored successfully');
                window.location.reload();
            } catch (error) {
                console.error('Tauri file import failed:', error);
                alert('Failed to import backup: ' + (error.message || 'Unknown error'));
            }
        } else {
            // Browser environment - use HTML file input
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            alert('Please upload a valid .zip backup file');
            return;
        }

        try {
            const response = await AdminService.uploadBackup(file);
            alert(response.message || 'Backup uploaded and restored successfully');
            // Reload the page to reflect restored data
            window.location.reload();
        } catch (error) {
            alert('Failed to upload backup: ' + (error.response?.data?.detail || error.message));
        }
        // Reset input
        event.target.value = null;
    };

    const handleScheduleUpdate = async (e) => {
        const newFreq = e.target.value;
        try {
            await AdminService.updateBackupSchedule(newFreq);
            setBackupSchedule(newFreq);
            alert(`Backup schedule updated to: ${newFreq}`);
        } catch (error) {
            alert('Failed to update schedule');
            fetchData(); // Revert
        }
    };

    const userColumns = [
        { key: 'email', label: 'Email' },
        { key: 'full_name', label: 'Full Name' },
        {
            key: 'role',
            label: 'Role',
            render: (row) => (
                <span className={`badge ${row.role === 'admin' ? 'admin' : 'member'}`}>
                    {row.role}
                </span>
            )
        },
        {
            key: 'is_active',
            label: 'Status',
            render: (row) => (
                <span className={`status-pill ${row.is_active ? 'active' : 'inactive'}`}>
                    {row.is_active ? 'Active' : 'Disabled'}
                </span>
            )
        }
    ];

    const backupColumns = [
        { key: 'filename', label: 'Backup Name' },
        { key: 'timestamp', label: 'Created At' },
        { key: 'size', label: 'Size' },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn-restore"
                        onClick={() => handleDownload(row.filename)}
                        title="Download Backup"
                    >
                        <Download size={14} /> Download
                    </button>
                    <button
                        className="btn-restore"
                        onClick={() => handleRestore(row.filename)}
                        title="Restore System"
                    >
                        <RefreshCcw size={14} /> Restore
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Admin Control Panel</h1>
                    <p className="page-subtitle">System governance and infrastructure management</p>
                </div>
                {activeTab === 'users' && (
                    <button className="btn-primary" onClick={handleCreateUser}>
                        <Users size={18} /> Add User
                    </button>
                )}
                {activeTab === 'backups' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            accept=".zip"
                        />
                        <button className="btn-secondary" onClick={handleUploadClick}>
                            <Upload size={18} /> Import Backup
                        </button>
                        <button className="btn-primary" onClick={handleBackup}>
                            <HardDrive size={18} /> Run System Backup
                        </button>
                    </div>
                )}
            </div>

            <div className="detail-tabs">
                <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                    <Users size={16} /> User Management
                </button>
                <button className={`tab-btn ${activeTab === 'backups' ? 'active' : ''}`} onClick={() => setActiveTab('backups')}>
                    <Database size={16} /> Data Backups
                </button>
                <button className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
                    <Activity size={16} /> System Health
                </button>
            </div>

            <div className="admin-content">
                {activeTab === 'users' && (
                    <DataTable
                        columns={userColumns}
                        data={users}
                        isLoading={isLoading}
                        onEdit={handleEditUser}
                        onDelete={handleDeleteUser}
                    />
                )}

                {activeTab === 'backups' && (
                    <>
                        <div className="stats-board" style={{ marginBottom: '2rem' }}>
                            <h3><Timer size={18} /> Auto-Backup Settings</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Frequency:</span>
                                <select
                                    value={backupSchedule}
                                    onChange={handleScheduleUpdate}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.9rem',
                                        minWidth: '150px'
                                    }}
                                >
                                    <option value="daily">Daily (Midnight)</option>
                                    <option value="weekly">Weekly (Sunday)</option>
                                    <option value="monthly">Monthly (1st)</option>
                                </select>
                            </div>
                        </div>
                        <DataTable
                            columns={backupColumns}
                            data={backups}
                            isLoading={isLoading}
                        />
                    </>
                )}

                {activeTab === 'system' && (
                    <div className="system-grid">
                        <div className="stats-board">
                            <h3><Shield size={18} /> Database Statistics</h3>
                            <div className="stats-cards">
                                {stats && Object.entries(stats).map(([k, v]) => (
                                    <div key={k} className="stat-pill">
                                        <span className="stat-label">{k}</span>
                                        <span className="stat-val">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="logs-board">
                            <h3><History size={18} /> Security Audit Logs</h3>
                            <div className="logs-list">
                                {auditLogs.map(log => (
                                    <div key={log.id} className="log-item">
                                        <span className="log-time">{new Date(log.created_at).toLocaleString()}</span>
                                        <span className="log-msg"><strong>{log.user_email}</strong>: {log.action} on {log.target_type}</span>
                                    </div>
                                ))}
                                {auditLogs.length === 0 && <p className="text-muted">No audit logs available</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? 'Edit User' : 'Add New User'}
                onSubmit={handleSubmitUser}
                isSubmitting={isSubmitting}
                error={error}
            >
                <div className="form-group">
                    <label>Full Name</label>
                    <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Email Address</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled={editingUser}
                    />
                </div>
                <div className="form-group">
                    <label>{editingUser ? 'New Password (leave blank to keep current)' : 'Password'}</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingUser}
                    />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>System Role</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: '1.2rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            Account Active
                        </label>
                    </div>
                </div>
            </EntityForm>

            <style>{`
                .admin-page { padding-bottom: 2rem; }
                .badge { padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
                .badge.admin { background: #fee2e2; color: #991b1b; }
                .badge.member { background: #e0f2fe; color: #0369a1; }
                .status-pill { font-size: 0.75rem; display: flex; align-items: center; gap: 4px; }
                .status-pill.active::before { content: ""; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; }
                .status-pill.inactive::before { content: ""; width: 8px; height: 8px; background: #94a3b8; border-radius: 50%; }
                .btn-restore { display: flex; align-items: center; gap: 4px; border: 1px solid #e2e8f0; background: white; padding: 4px 8px; border-radius: 6px; cursor: pointer; color: #64748b; font-size: 0.8125rem; }
                .btn-restore:hover { border-color: var(--accent-color); color: var(--accent-color); }
                .system-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; margin-top: 1rem; }
                .stats-board, .logs-board { background: white; border-radius: var(--radius); border: 1px solid var(--border-color); padding: 1.5rem; }
                .stats-board h3, .logs-board h3 { margin-top: 0; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
                .stats-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                .stat-pill { background: #f8fafc; border: 1px solid #f1f5f9; padding: 1rem; border-radius: 12px; text-align: center; }
                .stat-label { display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
                .stat-val { font-size: 1.5rem; font-weight: 700; color: var(--primary-color); }
                .logs-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 400px; overflow-y: auto; }
                .log-item { padding: 0.75rem; border-bottom: 1px solid #f1f5f9; font-size: 0.8125rem; }
                .log-time { color: var(--text-muted); margin-right: 1rem; font-family: monospace; }
            `}</style>
        </div>
    );
};

export default Admin;
