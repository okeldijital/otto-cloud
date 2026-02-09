/**
 * Frontend Integration Guide for OTTO V1.0.1
 * 
 * This file provides the API integration points and component examples
 * for the new features: Hub/Spoke config wizard and Backup/Restore
 * 
 * Add these to your React frontend components
 */

// ============================================================================
// 1. CONFIG WIZARD COMPONENT (First Run)
// ============================================================================
// Path: src/pages/FirstRunWizard.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function FirstRunWizard() {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    mode: 'hub',
    node_name: 'OTTO Node',
    hub_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleModeChange = (mode) => {
    setConfig({ ...config, mode });
  };

  const handleNodeNameChange = (e) => {
    setConfig({ ...config, node_name: e.target.value });
  };

  const handleHubUrlChange = (e) => {
    setConfig({ ...config, hub_url: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/config', config);
      // Redirect to main dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const isValid = config.node_name && (config.mode === 'hub' || config.hub_url);

  return (
    <div className="first-run-wizard">
      <h1>Welcome to OTTO</h1>
      <p>Let's configure your node for Hub/Spoke collaboration</p>

      {error && <div className="error">{error}</div>}

      {/* Step 1: Mode Selection */}
      {step === 1 && (
        <div>
          <h2>Step 1: Select Mode</h2>
          <div className="mode-selector">
            <label>
              <input
                type="radio"
                value="hub"
                checked={config.mode === 'hub'}
                onChange={(e) => handleModeChange(e.target.value)}
              />
              <span>Hub (Main Node)</span>
              <p>Primary database, aggregates data from Spokes</p>
            </label>
            <label>
              <input
                type="radio"
                value="spoke"
                checked={config.mode === 'spoke'}
                onChange={(e) => handleModeChange(e.target.value)}
              />
              <span>Spoke (Satellite Node)</span>
              <p>Connects to a Hub, local caching</p>
            </label>
          </div>
          <button onClick={() => setStep(2)}>Next</button>
        </div>
      )}

      {/* Step 2: Node Name */}
      {step === 2 && (
        <div>
          <h2>Step 2: Node Name</h2>
          <input
            type="text"
            placeholder="e.g., HQ, Studio A, Field Office"
            value={config.node_name}
            onChange={handleNodeNameChange}
          />
          <p>This name identifies your node in the network</p>
          <button onClick={() => setStep(3)}>Next</button>
          <button onClick={() => setStep(1)}>Back</button>
        </div>
      )}

      {/* Step 3: Hub URL (if Spoke) */}
      {step === 3 && (
        <div>
          <h2>Step 3: {config.mode === 'spoke' ? 'Hub URL' : 'Complete'}</h2>
          {config.mode === 'spoke' && (
            <input
              type="url"
              placeholder="https://hub.example.com"
              value={config.hub_url}
              onChange={handleHubUrlChange}
            />
          )}
          {config.mode === 'hub' && (
            <p>Your hub is ready! Other nodes can connect to you.</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
          <button onClick={() => setStep(config.mode === 'spoke' ? 2 : 1)}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. BACKUP/RESTORE COMPONENT
// ============================================================================
// Path: src/components/BackupRestore.jsx

import React, { useState } from 'axios';
import axios from 'axios';

export default function BackupRestore() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch available backups
  const loadBackups = async () => {
    try {
      const response = await axios.get('/api/backups');
      setBackups(response.data.backups);
    } catch (err) {
      setError('Failed to load backups');
    }
  };

  // Create new backup
  const handleCreateBackup = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/backup');
      setMessage(`✅ Backup created: ${response.data.backup_path}`);
      setTimeout(() => loadBackups(), 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  // Restore from backup
  const handleRestore = async (backupPath) => {
    if (!window.confirm(
      'This will restore your database from the backup.\n' +
      'Your current data will be saved first.\n\n' +
      'Continue?'
    )) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.post('/api/restore', { backup_path: backupPath });
      setMessage('✅ Restore completed! App will refresh...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to restore');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadBackups();
  }, []);

  return (
    <div className="backup-restore">
      <h2>Backup & Restore</h2>

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <section>
        <h3>Create Backup</h3>
        <button
          onClick={handleCreateBackup}
          disabled={loading}
        >
          {loading ? '⏳ Creating...' : '💾 Create Backup'}
        </button>
        <p>Creates a .zip file with your database and all files</p>
      </section>

      <section>
        <h3>Recent Backups</h3>
        {backups.length === 0 ? (
          <p>No backups yet. Create one to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.path}>
                  <td>{backup.name}</td>
                  <td>{(backup.size / 1024 / 1024).toFixed(2)} MB</td>
                  <td>{new Date(backup.created).toLocaleString()}</td>
                  <td>
                    <button
                      onClick={() => handleRestore(backup.path)}
                      disabled={loading}
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// 3. APP SHELL INTEGRATION
// ============================================================================
// Path: src/App.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import FirstRunWizard from './pages/FirstRunWizard';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [isFirstRun, setIsFirstRun] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFirstRun();
  }, []);

  const checkFirstRun = async () => {
    try {
      const response = await axios.get('/api/config/is-first-run');
      setIsFirstRun(response.data.is_first_run);
    } catch (err) {
      console.error('Failed to check first run status', err);
      setIsFirstRun(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">OTTO is starting...</div>;
  }

  return isFirstRun ? <FirstRunWizard /> : <Dashboard />;
}

// ============================================================================
// 4. API SERVICE HELPER
// ============================================================================
// Path: src/services/backupService.js

import axios from 'axios';

const API_BASE = '/api';

export const backupService = {
  async createBackup() {
    const response = await axios.post(`${API_BASE}/backup`);
    return response.data;
  },

  async listBackups() {
    const response = await axios.get(`${API_BASE}/backups`);
    return response.data.backups;
  },

  async restoreBackup(backupPath) {
    const response = await axios.post(`${API_BASE}/restore`, {
      backup_path: backupPath,
    });
    return response.data;
  },
};

export const configService = {
  async getConfig() {
    const response = await axios.get(`${API_BASE}/config`);
    return response.data;
  },

  async setConfig(mode, nodeName, hubUrl) {
    const response = await axios.post(`${API_BASE}/config`, {
      mode,
      node_name: nodeName,
      hub_url: hubUrl,
    });
    return response.data;
  },

  async isFirstRun() {
    const response = await axios.get(`${API_BASE}/config/is-first-run`);
    return response.data.is_first_run;
  },
};

// ============================================================================
// 5. INTEGRATION CHECKLIST
// ============================================================================

/*
TO INTEGRATE THESE FEATURES:

1. Copy FirstRunWizard component to src/pages/FirstRunWizard.jsx
2. Copy BackupRestore component to src/components/BackupRestore.jsx
3. Add services to src/services/backupService.js and src/services/configService.js
4. Update App.jsx to check first run and route appropriately
5. Add BackupRestore component to Settings page
6. Update main.py routes import (already done):
   - from routes import backup, config
   - app.include_router(backup.router)
   - app.include_router(config.router)

7. CSS: Add styling for:
   - .first-run-wizard
   - .mode-selector
   - .backup-restore
   - .success, .error, .loading classes

8. Test:
   - Fresh install shows wizard
   - Wizard persists config
   - Dashboard loads after config
   - Backup button creates zip
   - Restore loads backup
   - Data persists after restore

EXPECTED BEHAVIOR:

First Run:
1. App starts
2. /api/config/is-first-run returns true
3. FirstRunWizard component renders
4. User selects mode, enters name, (and hub URL if spoke)
5. User clicks Complete
6. POST /api/config saves config to {APP_DATA_DIR}/config.json
7. Redirect to /dashboard
8. Dashboard loads

Backup:
1. User clicks "Create Backup"
2. POST /api/backup
3. Backend creates {APP_DATA_DIR}/.backups/otto_backup_YYYYMMDD_HHMMSS.zip
4. Returns backup_path
5. UI shows success message
6. User can download or auto-download

Restore:
1. User selects a backup from list
2. User clicks "Restore"
3. Confirmation dialog appears
4. POST /api/restore with backup_path
5. Backend:
   - Creates safety backup (pre_restore_backup_*)
   - Extracts backup zip to temp dir
   - Copies files to app data dir
   - Cleans up temp
6. Frontend reloads
7. Data from backup is now active

*/
