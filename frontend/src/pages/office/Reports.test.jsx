import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Reports from './Reports';
import { vi } from 'vitest';

vi.mock('../../services/officeReportsService', () => ({
    officeReportsService: {
        listDefinitions: vi.fn().mockResolvedValue([]),
        createDefinition: vi.fn().mockResolvedValue({}),
        updateDefinition: vi.fn().mockResolvedValue({}),
        deleteDefinition: vi.fn().mockResolvedValue({}),
        runReport: vi.fn().mockResolvedValue({ id: 1 }),
        listRuns: vi.fn().mockResolvedValue([{ id: 1, report_type: 'contracts_overview', status: 'done', created_at: new Date().toISOString() }]),
        listArtifacts: vi.fn().mockResolvedValue([{ id: 10, format: 'pdf' }]),
        previewUrl: vi.fn().mockReturnValue('http://localhost/preview'),
        downloadUrl: vi.fn().mockReturnValue('http://localhost/download'),
    },
}));

describe('Office Reports', () => {
    it('renders reports page', async () => {
        render(<Reports />);
        expect(screen.getByText('Office — Reports')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('Recent Runs')).toBeInTheDocument();
        });
    });

    it('opens run modal and mounts preview iframe', async () => {
        render(<Reports />);
        const user = userEvent.setup();
        await waitFor(() => screen.getByText('Preview'));
        await user.click(screen.getByText('Preview'));
        expect(screen.getByTitle('Report preview')).toBeInTheDocument();
    });

    it('opens create modal', async () => {
        render(<Reports />);
        const user = userEvent.setup();
        await user.click(screen.getByText('New Report'));
        expect(screen.getByText('Create Report')).toBeInTheDocument();
    });
});
