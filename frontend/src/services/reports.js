import api from '../lib/api';

export const ReportsService = {
    exportData: async (path, format = 'excel') => {
        try {
            const response = await api.get(`/reports/export/${path}`, {
                params: { format },
                responseType: 'blob'
            });

            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from content-disposition if possible, or use a default
            const contentDisposition = response.headers['content-disposition'];
            let fileName = `${path}_export.${format === 'excel' ? 'xlsx' : 'csv'}`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch[1]) {
                    fileName = fileNameMatch[1];
                }
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    },

    exportSingle: async (entity, id, format = 'excel') => {
        try {
            const response = await api.get(`/reports/export/${entity}/${id}`, {
                params: { format },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers['content-disposition'];
            let fileName = `${entity}_${id}_export.${format === 'excel' ? 'xlsx' : 'csv'}`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch[1]) {
                    fileName = fileNameMatch[1];
                }
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }
};
