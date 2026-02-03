import React, { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import Autocomplete from '../Autocomplete';

/**
 * Thin wrapper around global search to provide association memory style lookup.
 * Supports single or multiple selection. Returns full entity objects.
 */
const EntityTypeahead = ({
    placeholder = 'Search entities…',
    multiple = false,
    onSelect,
    onChange,
    assetType,
}) => {
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(multiple ? [] : null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query || query.length < 1) {
                setOptions([]);
                return;
            }
            try {
                // Optional: show a loading state in the results
                // setOptions([{ id: 'loading', name: 'Searching...', loading: true }]);
                const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
                const data = res.data || {};
                const aggregated = [
                    ...(data.artists || []).map((a) => ({ ...a, label: a.name, entity_type: 'Artist' })),
                    ...(data.labels || []).map((l) => ({ ...l, label: l.name, entity_type: 'Label' })),
                    ...(data.publishers || []).map((p) => ({ ...p, label: p.name, entity_type: 'Publisher' })),
                    ...(data.releases || []).map((r) => ({ ...r, label: r.title, entity_type: 'Release' })),
                    ...(data.tracks || []).map((t) => ({ ...t, label: t.title, entity_type: 'Track' })),
                    ...(data.works || []).map((w) => ({ ...w, label: w.title, entity_type: 'Work' })),
                ];

                // Asset filter
                const filtered =
                    assetType && ['Work', 'Track', 'Release'].includes(assetType)
                        ? aggregated.filter((o) => o.entity_type === assetType)
                        : aggregated;
                setOptions(filtered);
            } catch (err) {
                console.error('Typeahead search failed', err);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [query, assetType]);

    const optionProps = useMemo(() => {
        const base = options.map((o) => ({
            ...o,
            id: o.id,
            name: `${o.label || o.name || o.title} • ${o.entity_type}`,
        }));

        // Ensure selected items are in the options list so the Autocomplete can display them
        const selectedList = multiple ? (selected || []) : (selected ? [selected] : []);
        const selectedProps = selectedList.map(s => ({
            ...s,
            id: s.id,
            name: `${s.label || s.name || s.title} • ${s.entity_type}`
        }));

        // Merge and unique by ID
        const merged = [...selectedProps, ...base];
        return Array.from(new Map(merged.map(m => [m.id, m])).values());
    }, [options, selected, multiple]);

    return (
        <div className="typeahead">
            <Autocomplete
                options={optionProps}
                value={multiple ? selected?.map((s) => s.id) : selected?.id}
                onSearchChange={setQuery}
                onChange={(val) => {
                    if (multiple) {
                        // In multiple mode, val is an array of IDs
                        const mapped = [...(selected || []), ...optionProps].filter((o) => val.includes(o.id));
                        // Remove duplicates by ID
                        const unique = Array.from(new Map(mapped.map(m => [m.id, m])).values());
                        setSelected(unique);
                        onChange?.(unique);
                    } else {
                        const match = optionProps.find((o) => o.id === val) || null;
                        setSelected(match);
                        onSelect?.(match);
                    }
                }}
                placeholder={placeholder}
                allowQuickAdd={false}
                multiple={multiple}
                className="w-full"
                labelKey="name"
                valueKey="id"
            />
            {/* Horizontal chips for quick selection of search results */}
            <div className="options-inline" style={{ marginTop: '0.5rem' }}>
                {optionProps.slice(0, 6).map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        className="chip-button"
                        onClick={() => {
                            if (multiple) {
                                const isAlreadySelected = selected.some((s) => s.id === opt.id);
                                const next = isAlreadySelected
                                    ? selected.filter((s) => s.id !== opt.id)
                                    : [...selected, opt];
                                setSelected(next);
                                onChange?.(next);
                            } else {
                                setSelected(opt);
                                onSelect?.(opt);
                            }
                        }}
                    >
                        {opt.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EntityTypeahead;
