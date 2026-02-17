import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UsersService, AdminService } from '../services/operations';
import { confirmAction, isTauriEnv } from '../lib/tauri';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import {
    Activity,
    Database,
    Download,
    HardDrive,
    History,
    RefreshCcw,
    Shield,
    Timer,
    Upload,
    Users,
    Server,
    Building2,
} from 'lucide-react';

const Admin = () => {
    const [activeTab, setActiveTab] = useState('status');
    const [users, setUsers] = useState([]);
    const [backups, setBackups] = useState([]);
    const [stats, setStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [backupSchedule, setBackupSchedule] = useState('weekly');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRunningBackup, setIsRunningBackup] = useState(false);
    const [restoringBackupId, setRestoringBackupId] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const [sccHealth, setSccHealth] = useState(null);
    const [sccRuntime, setSccRuntime] = useState(null);
    const [sccInventory, setSccInventory] = useState({ files: [] });
    const [sccOrgs, setSccOrgs] = useState({ organizations: [] });
    const [dbSwitchPath, setDbSwitchPath] = useState('');
    const [dbSwitchResult, setDbSwitchResult] = useState(null);

    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        password: '',
        role: 'member',
        is_active: true,
    });

    const backendConnected = !!sccHealth?.backend_connected;

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'users') {
                setUsers(await UsersService.getAll());
            } else if (activeTab === 'backups') {
                const [data, scheduleData] = await Promise.all([
                    AdminService.getBackups(),
                    AdminService.getBackupSchedule(),
                ]);
                setBackups(data);
                setBackupSchedule(scheduleData.frequency);
            } else if (activeTab === 'system') {
                const [statsData, logsData] = await Promise.all([
                    AdminService.getStats(),
                    AdminService.getAuditLogs(),
                ]);
                setStats(statsData);
                setAuditLogs(logsData);
            } else if (activeTab === 'status') {
                setSccHealth(await AdminService.getSCCHealth());
            } else if (activeTab === 'runtime') {
                setSccRuntime(await AdminService.getSCCRuntime());
            } else if (activeTab === 'db') {
                setSccInventory(await AdminService.getSCCDBInventory());
            } else if (activeTab === 'orgs') {
                setSccOrgs(await AdminService.getSCCOrgs());
            }
        } catch (fetchError) {
            console.error('Failed to fetch admin data:', fetchError);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        AdminService.getSCCHealth()
            .then(setSccHealth)
            .catch(() => setSccHealth({ backend_connected: false }));
    }, []);

    const handleRetryConnectivity = async () => {
        try {
            const next = await AdminService.getSCCHealth();
            setSccHealth(next);
        } catch (retryError) {
            console.error('Connectivity retry failed:', retryError);
            setSccHealth({ backend_connected: false });
        }
    };

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
            password: '',
            role: user.role || 'member',
            is_active: user.is_active,
        });
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (user) => {
        if (await confirmAction(`Are you sure you want to delete user ${user.email}?`, 'Delete User')) {
            try {
                await UsersService.delete(user.id);
                fetchData();
            } catch (_e) {
                alert('Failed to delete user');
            }
        }
    };

    const handleSubmitUser = async (event) => {
        event.preventDefault();
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
        } catch (submitErr) {
            setError(submitErr.response?.data?.detail || 'Failed to save user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackup = async () => {
        setIsRunningBackup(true);
        try {
            const res = await AdminService.runSystemBackup();
            await fetchData();
            alert(`Backup created: ${res?.filename ?? 'ok'}`);
        } catch (backupError) {
            console.error('Run backup failed:', backupError);
            alert(backupError?.response?.data?.detail || backupError?.message || 'Backup failed');
        } finally {
            setIsRunningBackup(false);
        }
    };

    const handleRestore = async (backup) => {
        const confirmed = await confirmAction(
            `RESTORE SYSTEM from ${backup.filename}? This will overwrite current data.`,
            'Restore System'
        );
        if (!confirmed) return;
        setRestoringBackupId(backup.id);
        try {
            const res = await AdminService.restore(backup.id);
            await fetchData();
            alert(res.message || 'Restore complete — you may need to reload app');
        } catch (restoreError) {
            console.error('Restore failed:', restoreError);
            alert(
                `Restore failed — system rolled back to pre-restore snapshot (${restoreError?.response?.data?.detail || restoreError?.message || 'unknown'})`
            );
        } finally {
            setRestoringBackupId(null);
        }
    };

    const handleDownload = async (backup) => {
        try {
            await AdminService.downloadBackup(backup.id, backup.filename);
        } catch (_e) {
            alert('Download failed');
        }
    };

    const handleUploadClick = async () => {
        if (isTauriEnv()) {
            try {
                const { open } = await import('@tauri-apps/plugin-dialog');
                const { readFile } = await import('@tauri-apps/plugin-fs');
                const filePath = await open({
                    multiple: false,
                    filters: [{ name: 'Backup Files', extensions: ['zip'] }],
                });
                if (!filePath) return;
                const fileData = await readFile(filePath);
                const fileName = filePath.split('/').pop();
                const file = new File([fileData], fileName, { type: 'application/zip' });
                const response = await AdminService.uploadBackup(file);
                alert(response.message || 'Backup uploaded successfully');
                await fetchData();
            } catch (uploadErr) {
                console.error('Tauri file import failed:', uploadErr);
                alert(`Failed to import backup: ${uploadErr.message || 'Unknown error'}`);
            }
        } else {
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
            alert(response.message || 'Backup uploaded successfully');
            await fetchData();
        } catch (uploadError) {
            alert(`Failed to upload backup: ${uploadError.response?.data?.detail || uploadError.message}`);
        }
        event.target.value = null;
    };

    const handleScheduleUpdate = async (event) => {
        const newFreq = event.target.value;
        try {
            await AdminService.updateBackupSchedule(newFreq);
            setBackupSchedule(newFreq);
            alert(`Backup schedule updated to: ${newFreq}`);
        } catch (_err) {
            alert('Failed to update schedule');
            fetchData();
        }
    };

    const handleSwitchDB = async () => {
        if (!dbSwitchPath) {
            alert('Please provide a sqlite path');
            return;
        }
        const confirmed = await confirmAction(
            `Set active DB pointer to:\n${dbSwitchPath}\n\nThis does not modify DB content and requires restart.`,
            'Switch Active DB'
        );
        if (!confirmed) return;
        try {
            const response = await AdminService.switchSCCDB(dbSwitchPath);
            setDbSwitchResult(response);
            alert(response.restart_required ? 'Active DB pointer updated. Restart required.' : 'Active DB pointer updated.');
            await fetchData();
        } catch (switchErr) {
            alert(switchErr.response?.data?.detail || switchErr.message || 'DB switch failed');
        }
    };

    const handleSwitchOrg = async (organizationId) => {
        const confirmed = await confirmAction(
            `Switch active org to ${organizationId}?\n\nThis is session-scoped and does not rewrite data.`,
            'Switch Organization'
        );
        if (!confirmed) return;
        try {
            const response = await AdminService.switchSCCOrg(organizationId);
            alert(`Active org switched to ${response.active_org_name || response.active_org_id}`);
            await fetchData();
            if (activeTab !== 'runtime') {
                setActiveTab('runtime');
            }
        } catch (switchErr) {
            alert(switchErr.response?.data?.detail || switchErr.message || 'Org switch failed');
        }
    };

    const userColumns = [
        { key: 'email', label: 'Email' },
        { key: 'full_name', label: 'Full Name' },
        {
            key: 'role',
            label: 'Role',
            render: (row) => <span className={`badge ${row.role === 'admin' ? 'admin' : 'member'}`}>{row.role}</span>,
        },
        {
            key: 'is_active',
            label: 'Status',
            render: (row) => <span className={`status-pill ${row.is_active ? 'active' : 'inactive'}`}>{row.is_active ? 'Active' : 'Disabled'}</span>,
        },
    ];

    const backupColumns = [
        { key: 'filename', label: 'Backup Name' },
        { key: 'created_at', label: 'Created At' },
        { key: 'size_bytes', label: 'Size (bytes)' },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-restore" onClick={() => handleDownload(row)} title="Download Backup">
                        <Download size={14} /> Download
                    </button>
                    <button
                        className="btn-restore"
                        disabled={restoringBackupId === row.id}
                        onClick={() => handleRestore(row)}
                        title="Restore System"
                    >
                        <RefreshCcw size={14} /> {restoringBackupId === row.id ? 'Restoring…' : 'Restore'}
                    </button>
                </div>
            ),
        },
    ];

    const runtimeRows = useMemo(() => {
        if (!sccRuntime) return [];
        return [
            ['Backend Base URL', sccHealth?.backend_base_url || 'n/a'],
            ['Active DB Path', sccRuntime.sqlite_path || 'n/a'],
            ['Database URL', sccRuntime.database_url || 'n/a'],
            ['DB Writable', String(!!sccRuntime.db_writable)],
            ['Active Org ID', sccRuntime.active_org_id || 'n/a'],
            ['Active Org Name', sccRuntime.active_org_name || 'n/a'],
            ['Last Backup Timestamp', sccRuntime.last_backup_timestamp || 'none'],
            ['Alembic Current', sccRuntime.alembic_current || 'n/a'],
            ['Alembic Head', sccRuntime.alembic_head || 'n/a'],
            ['App Data Dir', sccRuntime.app_data_dir || 'n/a'],
            ['Storage Root', sccRuntime.storage_root || 'n/a'],
        ];
    }, [sccHealth, sccRuntime]);

    return (
        <div className="admin-page">
            {!backendConnected && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <strong>Backend connection lost.</strong> Some controls are unavailable.
                    <button className="btn-secondary" onClick={handleRetryConnectivity} style={{ marginLeft: 12 }}>
                        Retry
                    </button>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">System Control Center v1</h1>
                    <p className="page-subtitle">Governed system operations, runtime identity, org scope, and backups</p>
                </div>
                {activeTab === 'users' && (
                    <button className="btn-primary" onClick={handleCreateUser}>
                        <Users size={18} /> Add User
                    </button>
                )}
                {activeTab === 'backups' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".zip" />
                        <button className="btn-secondary" onClick={handleUploadClick}>
                            <Upload size={18} /> Import Backup
                        </button>
                        <button className="btn-primary" onClick={handleBackup} disabled={isRunningBackup}>
                            <HardDrive size={18} /> {isRunningBackup ? 'Running Backup…' : 'Run System Backup'}
                        </button>
                    </div>
                )}
            </div>

            <div className="detail-tabs">
                <button className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
                    <Server size={16} /> System Status
                </button>
                <button className={`tab-btn ${activeTab === 'runtime' ? 'active' : ''}`} onClick={() => setActiveTab('runtime')}>
                    <Activity size={16} /> Runtime & Database
                </button>
                <button className={`tab-btn ${activeTab === 'db' ? 'active' : ''}`} onClick={() => setActiveTab('db')}>
                    <Database size={16} /> Database Manager
                </button>
                <button className={`tab-btn ${activeTab === 'orgs' ? 'active' : ''}`} onClick={() => setActiveTab('orgs')}>
                    <Building2 size={16} /> Organizations
                </button>
                <button className={`tab-btn ${activeTab === 'backups' ? 'active' : ''}`} onClick={() => setActiveTab('backups')}>
                    <HardDrive size={16} /> Backups
                </button>
                <button className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
                    <Shield size={16} /> System Health
                </button>
                <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                    <Users size={16} /> User Management
                </button>
            </div>

            <div className="admin-content">
                {activeTab === 'status' && (
                    <div className="stats-board">
                        <h3><Server size={18} /> Backend Connectivity</h3>
                        <div className="stat-pill"><span className="stat-label">Connected</span><span className="stat-val">{String(!!sccHealth?.backend_connected)}</span></div>
                        <div className="stat-pill"><span className="stat-label">Backend Base URL</span><span className="stat-val">{sccHealth?.backend_base_url || 'n/a'}</span></div>
                        <div className="stat-pill"><span className="stat-label">Environment</span><span className="stat-val">{sccHealth?.env || 'n/a'}</span></div>
                        <div className="stat-pill"><span className="stat-label">Build</span><span className="stat-val">{sccHealth?.build || 'n/a'}</span></div>
                        <div className="stat-pill"><span className="stat-label">Server Time</span><span className="stat-val">{sccHealth?.server_time || 'n/a'}</span></div>
                        <button className="btn-secondary" onClick={handleRetryConnectivity} style={{ marginTop: 12 }}>
                            <RefreshCcw size={14} /> Retry Connectivity Check
                        </button>
                    </div>
                )}

                {activeTab === 'runtime' && (
                    <div className="stats-board">
                        <h3><Activity size={18} /> Runtime Identity</h3>
                        {runtimeRows.map(([key, value]) => (
                            <div className="stat-pill" key={key}>
                                <span className="stat-label">{key}</span>
                                <span className="stat-val" style={{ maxWidth: 700, overflowWrap: 'anywhere', textAlign: 'right' }}>{value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'db' && (
                    <>
                        <div className="stats-board" style={{ marginBottom: '1rem' }}>
                            <h3><Database size={18} /> Set Active DB Pointer</h3>
                            <p style={{ color: '#64748b', marginBottom: 12 }}>No DB content is modified. This only updates the active DB pointer and requires restart.</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    value={dbSwitchPath}
                                    onChange={(e) => setDbSwitchPath(e.target.value)}
                                    placeholder="/absolute/path/to/otto.sqlite"
                                    style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <button className="btn-primary" onClick={handleSwitchDB}>Set Active DB</button>
                            </div>
                            {dbSwitchResult && (
                                <div className="stat-pill" style={{ marginTop: 12 }}>
                                    <span className="stat-label">Switch Result</span>
                                    <span className="stat-val">restart_required={String(!!dbSwitchResult.restart_required)}</span>
                                </div>
                            )}
                        </div>
                        <div className="stats-board">
                            <h3><Database size={18} /> DB Inventory</h3>
                            <p style={{ color: '#64748b', marginBottom: 12 }}>Detected sqlite files under app data directory; current DB is marked.</p>
                            {sccInventory?.files?.map((row) => (
                                <div className="stat-pill" key={row.path}>
                                    <span className="stat-label" style={{ maxWidth: 600, overflowWrap: 'anywhere' }}>{row.path}</span>
                                    <span className="stat-val">{row.is_current ? 'current' : 'candidate'} | {row.size_bytes} bytes</span>
                                </div>
                            ))}
                            {!sccInventory?.files?.length && !isLoading && <p className="text-muted">No sqlite files found.</p>}
                        </div>
                    </>
                )}

                {activeTab === 'orgs' && (
                    <div className="stats-board">
                        <h3><Building2 size={18} /> Active Organization (Session Scoped)</h3>
                        <div className="stat-pill"><span className="stat-label">Active Org ID</span><span className="stat-val">{sccOrgs?.active_org_id || 'n/a'}</span></div>
                        <div className="stat-pill"><span className="stat-label">Active Org Name</span><span className="stat-val">{sccOrgs?.active_org_name || 'n/a'}</span></div>
                        <div style={{ marginTop: 12 }}>
                            {sccOrgs?.organizations?.map((org) => (
                                <div key={`${org.organization_id}-${org.name}`} className="stat-pill">
                                    <span className="stat-label">{org.name} ({org.organization_id})</span>
                                    <button className="btn-secondary" onClick={() => handleSwitchOrg(org.organization_id)}>
                                        Switch
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <DataTable columns={userColumns} data={users} isLoading={isLoading} onEdit={handleEditUser} onDelete={handleDeleteUser} />
                )}

                {activeTab === 'backups' && (
                    <>
                        <div className="stats-board" style={{ marginBottom: '1rem' }}>
                            <h3><Timer size={18} /> Auto-Backup Settings</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Frequency:</span>
                                <select value={backupSchedule} onChange={handleScheduleUpdate} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 180 }}>
                                    <option value="daily">Daily (Midnight)</option>
                                    <option value="weekly">Weekly (Sunday)</option>
                                    <option value="monthly">Monthly (1st)</option>
                                </select>
                            </div>
                        </div>
                        <DataTable columns={backupColumns} data={backups} isLoading={isLoading} />
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
                                {auditLogs.map((log) => (
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
                    <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
                </div>
                <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={editingUser} />
                </div>
                <div className="form-group">
                    <label>{editingUser ? 'New Password (leave blank to keep current)' : 'Password'}</label>
                    <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Role</label>
                        <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Status</label>
                        <select
                            value={formData.is_active ? 'active' : 'disabled'}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                        >
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                        </select>
                    </div>
                </div>
            </EntityForm>
        </div>
    );
};

export default Admin;
