import { describe, it, expect, vi } from 'vitest';
import { formatCreateError } from '../utils/contracts';

describe('formatCreateError', () => {
    it('returns a formatted error with detail string', () => {
        const err = {
            response: {
                status: 400,
                config: { url: '/api/contracts' },
                data: { detail: 'A PDF document is required before activating a contract.' }
            }
        };
        const result = formatCreateError(err);
        expect(result).toBe('Create failed (HTTP 400): A PDF document is required before activating a contract.');
    });

    it('handles list details (FastAPI validation errors)', () => {
        const err = {
            response: {
                status: 422,
                data: {
                    detail: [
                        { msg: 'field required', loc: ['body', 'title'] },
                        { msg: 'invalid type', loc: ['body', 'status'] }
                    ]
                }
            }
        };
        const result = formatCreateError(err);
        expect(result).toContain('field required');
        expect(result).toContain('invalid type');
    });

    it('handles generic network errors', () => {
        const err = {
            message: 'Network Error',
            config: { url: '/api/contracts' }
        };
        const result = formatCreateError(err);
        expect(result).toBe('Create failed: network error or backend unreachable');
    });

    it('surfaces raw object detail if it is not a string or list', () => {
        const err = {
            response: {
                status: 500,
                data: { detail: { error_code: 'UNKNOWN_DB_ERROR', trace: '...' } }
            }
        };
        const result = formatCreateError(err);
        expect(result).toContain('UNKNOWN_DB_ERROR');
    });
});
