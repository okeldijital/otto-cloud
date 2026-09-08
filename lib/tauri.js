export const isTauriEnv = () => false;

export const downloadFile = async (url, filename = 'download') => {
    if (typeof window === 'undefined') return false;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
};

let confirmationHandler = null;

export const registerConfirmationHandler = (handler) => {
    confirmationHandler = handler;
};

export const confirmAction = async (message) => {
    if (confirmationHandler) return confirmationHandler(message, 'Confirm Action');
    if (typeof window === 'undefined') return false;
    return window.confirm(message);
};
