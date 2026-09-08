import api from './api';

export const isTauriEnv = () =>
    typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);

export const downloadFile = async (url, filename) => {
    if (!isTauriEnv()) {
        throw new Error('Not in Tauri environment');
    }

    try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeBinaryFile } = await import('@tauri-apps/plugin-fs');
        const response = await api.get(url, { responseType: 'arraybuffer' });
        const savePath = await save({ defaultPath: filename });
        if (!savePath) return false;
        await writeBinaryFile(savePath, new Uint8Array(response.data));
        return true;
    } catch (error) {
        console.error('Tauri download failed:', error);
        throw error;
    }
};

let confirmationHandler = null;

export const registerConfirmationHandler = (handler) => {
    confirmationHandler = handler;
};

export const confirmAction = async (message, title = 'Confirm Action') => {
    if (confirmationHandler) return confirmationHandler(message, title);
    if (typeof window === 'undefined') return false;

    if (isTauriEnv()) {
        try {
            const { confirm } = await import('@tauri-apps/plugin-dialog');
            return await confirm(message, { title, kind: 'warning' });
        } catch (error) {
            console.error('Tauri confirm failed, falling back to window.confirm', error);
        }
    }

    return window.confirm(message);
};
