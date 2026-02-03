import api, { BASE_URL } from '../lib/api';

const ENDPOINT = '/office/reports';

export const officeReportsService = {
    // New simplified endpoints
    getDocumentsStatusUrl: (format) => `${BASE_URL}/api${ENDPOINT}/documents-status?format=${format}`,
    getTasksSummaryUrl: (format) => `${BASE_URL}/api${ENDPOINT}/tasks-summary?format=${format}`,
    getEventsTimelineUrl: (format, days = 30) => `${BASE_URL}/api${ENDPOINT}/events-timeline?format=${format}&days=${days}`,
    getStatusQuoUrl: (format) => `${BASE_URL}/api${ENDPOINT}/status-quo?format=${format}`,
    getAuditTrailUrl: (format, days = 7) => `${BASE_URL}/api${ENDPOINT}/audit-trail?format=${format}&days=${days}`,

    // Catalog Exports
    getArtistsExportUrl: (format) => `${BASE_URL}/api/reports/export/artists?format=${format}`,
    getReleasesExportUrl: (format) => `${BASE_URL}/api/reports/export/releases?format=${format}`,
    getWorksExportUrl: (format) => `${BASE_URL}/api/reports/export/works?format=${format}`,
    getTasksExportUrl: (format) => `${BASE_URL}/api/reports/export/tasks?format=${format}`,
    getEventsExportUrl: (format) => `${BASE_URL}/api/reports/export/events?format=${format}`,
};
