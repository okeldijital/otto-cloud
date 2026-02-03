export function formatCreateError(err) {
    const status = err?.response?.status;
    const url = err?.response?.config?.url || err?.config?.url;
    const detailRaw = err?.response?.data?.detail ?? err?.response?.data;

    // Log the truth for debugging
    console.error('Contract Action Failed:', {
        status,
        url,
        detail: detailRaw,
        fullError: err
    });

    const normalizedDetail = (() => {
        if (typeof detailRaw === 'string' || typeof detailRaw === 'number') return String(detailRaw);
        if (Array.isArray(detailRaw)) {
            return detailRaw
                .map((d) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d)))
                .join('; ');
        }
        if (typeof detailRaw === 'object' && detailRaw !== null) {
            return JSON.stringify(detailRaw);
        }
        return null;
    })();

    if (normalizedDetail) return `Create failed (HTTP ${status ?? '—'}): ${normalizedDetail}`;

    if (status) {
        return `Create failed (HTTP ${status}) at ${url || 'unknown endpoint'}`;
    }

    return 'Create failed: network error or backend unreachable';
}
