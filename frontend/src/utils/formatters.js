/**
 * Formats a duration string for saving to the backend.
 * If input is MM:SS, converts to 00:MM:SS (HH:MM:SS) for the database TIME column.
 * @param {string} duration 
 * @returns {string|null}
 */
export const formatDurationForSave = (duration) => {
    if (!duration) return null;

    // Clean input
    const cleanDuration = duration.trim();
    if (!cleanDuration) return null;

    const parts = cleanDuration.split(':');

    if (parts.length === 1) {
        // Assume minutes if just a number is provided? Or seconds?
        // Let's assume MM:00 if just a number
        return `00:${parts[0].padStart(2, '0')}:00`;
    }

    if (parts.length === 2) {
        // MM:SS -> 00:MM:SS
        return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }

    if (parts.length === 3) {
        // HH:MM:SS -> ensure padding
        return parts.map(p => p.padStart(2, '0')).join(':');
    }

    return cleanDuration;
};

/**
 * Formats a duration string (HH:MM:SS) for display.
 * If HH is 00, returns MM:SS.
 * @param {string} duration 
 * @returns {string}
 */
export const formatDurationForDisplay = (duration) => {
    if (!duration) return '--:--';

    const parts = duration.split(':');
    if (parts.length === 3) {
        const [h, m, s] = parts;
        if (parseInt(h) === 0) {
            return `${m}:${s}`;
        }
        // If hours > 0, show hours too
        return `${h}:${m}:${s}`;
    }

    return duration;
};
