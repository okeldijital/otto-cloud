import { isTauri } from '@tauri-apps/api/core';
import api from './api';

export const isTauriEnv = () => isTauri();

/**
 * Downloads a file in the Tauri environment using native dialogs.
 * @param {string} url - The full URL or endpoint path to download.
 * @param {string} filename - The default filename for the save dialog.
 * @returns {Promise<boolean>} - True if saved, false if cancelled.
 */
// ... existing code ...
export const downloadFile = async (url, filename) => {
    // ... existing implementation ...
    try {
        if (!isTauriEnv()) {
            throw new Error('Not in Tauri environment');
        }

        // Dynamically import Tauri plugins to avoid browser crashes
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeBinaryFile } = await import('@tauri-apps/plugin-fs');

        // Fetch the file content
        const response = await api.get(url, {
            responseType: 'arraybuffer',
        });

        // Open the Save dialog
        const savePath = await save({
            defaultPath: filename,
        });

        if (!savePath) return false; // User cancelled

        // Write to file
        await writeBinaryFile(savePath, new Uint8Array(response.data));
        return true;
    } catch (error) {
        console.error('Tauri download failed:', error);
        throw error;
    }
};

/**
 * Shows a confirmation dialog using native Tauri API if available, or window.confirm fallback.
 * @param {string} message - The message to display.
 * @param {string} title - The title of the dialog (Tauri only).
 * @returns {Promise<boolean>} - True if confirmed, false otherwise.
 */
let confirmationHandler = null;

/**
 * Registers a custom confirmation handler (used by React components).
 * @param {Function} handler - A function returning a Promise<boolean>.
 */
export const registerConfirmationHandler = (handler) => {
    confirmationHandler = handler;
};

/**
 * Shows a confirmation dialog.
 * Uses the registered custom handler (React Modal) if available.
 * Falls back to native methods.
 * @param {string} message - The message to display.
 * @param {string} title - The title of the dialog.
 * @returns {Promise<boolean>} - True if confirmed, false otherwise.
 */
export const confirmAction = async (message, title = 'Confirm Action') => {
    // Priority 1: Custom React Handler (most stable UX)
    if (confirmationHandler) {
        return confirmationHandler(message, title);
    }

    // Priority 2: Native Tauri Dialog (if in Tauri and no custom handler)
    if (isTauriEnv()) {
        try {
            const { confirm } = await import('@tauri-apps/plugin-dialog');
            return await confirm(message, { title, kind: 'warning' });
        } catch (error) {
            console.error('Tauri confirm failed, falling back to window.confirm', error);
            return window.confirm(message);
        }
    } else {
        // Priority 3: Browser fallback
        return window.confirm(message);
    }
};
