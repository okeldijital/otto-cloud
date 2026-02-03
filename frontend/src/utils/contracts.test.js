import { describe, it, expect } from 'vitest';
import { formatCreateError } from './contracts';

describe('formatCreateError', () => {
    it('uses backend detail when present', () => {
        const err = { response: { status: 422, config: { url: '/contracts' }, data: { detail: 'Missing PDF' } } };
        expect(formatCreateError(err)).toBe('Create failed (HTTP 422): Missing PDF');
    });

    it('falls back to status/url', () => {
        const err = { response: { status: 500, config: { url: '/contracts' }, data: {} } };
        expect(formatCreateError(err)).toBe('Create failed (HTTP 500) at /contracts');
    });

    it('handles network error', () => {
        expect(formatCreateError({})).toBe('Create failed: network error');
    });
});
