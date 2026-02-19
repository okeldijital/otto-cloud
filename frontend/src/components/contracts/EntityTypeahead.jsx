import React, { useEffect, useMemo, useState } from 'react';
import Autocomplete from '../Autocomplete';
import contractService from '../../services/contractService';
import api from '../../lib/api';

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
    mode = 'search',
    partyTypes = 'artist,organization,individual,label',
}) => {
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(multiple ? [] : null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                if (mode === 'party') {
                    if (!query || query.length < 1) {
                        setOptions([]);
                        return;
                    }
                    const res = await contractService.partyLookup(query, partyTypes, 10);
                    const rows = (res.data?.results || []).map((r) => ({
                        id: r.id,
                        label: r.display_name,
                        name: r.display_name,
                        entity_type: (r.entity_type || '').toString(),
                    }));
                    setOptions(rows);
                    return;
                }

                if (mode === 'asset') {
                    if (!query || query.length < 1) {
                        setOptions([]);
                        return;
                    }
                    let res;
                    const at = (assetType || '').toLowerCase();
                    if (at === 'track') res = await contractService.lookupTracks(query, 10);
                    else if (at === 'work') res = await contractService.lookupWorks(query, 10);
                    else res = await contractService.lookupReleases(query, 10);
                    const rows = (res.data?.results || []).map((r) => ({
                        id: r.id,
                        label: r.title || r.name,
                        name: r.title || r.name,
                        entity_type: assetType || 'Asset',
                    }));
                    setOptions(rows);
                    return;
                }

                // Default global search behavior for existing screens.
                const res = await api.get(`/search?q=${encodeURIComponent(query || '')}`);
                const data = res.data || {};
                const aggregated = [
                    ...(data.artists || []).map((a) => ({ ...a, label: a.name, entity_type: 'Artist' })),
                    ...(data.labels || []).map((l) => ({ ...l, label: l.name, entity_type: 'Label' })),
                    ...(data.publishers || []).map((p) => ({ ...p, label: p.name, entity_type: 'Publisher' })),
                    ...(data.network || []).map((n) => ({ ...n, label: n.name, entity_type: 'Network' })),
                    ...(data.releases || []).map((r) => ({ ...r, label: r.title, entity_type: 'Release' })),
                    ...(data.tracks || []).map((t) => ({ ...t, label: t.title, entity_type: 'Track' })),
                    ...(data.works || []).map((w) => ({ ...w, label: w.title, entity_type: 'Work' })),
                ];
                setOptions(aggregated);
            } catch (err) {
                console.error('Typeahead search failed', err);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [query, assetType, mode, partyTypes]);

    const optionProps = useMemo(() => {
        const base = options.map((o) => {
            // Use the backend-provided display string for groups, otherwise format normally
            const displayName = o.display || o.label || o.name || o.title;
            const kindBadge = o.kind === 'group' ? ' [GROUP]' : '';
            return {
                ...o,
                id: o.id,
                name: `${displayName} • ${o.entity_type}${kindBadge}`,
            };
        });

        // Ensure selected items are in the options list so the Autocomplete can display them
        const selectedList = multiple ? (selected || []) : (selected ? [selected] : []);
        const selectedProps = selectedList.map(s => ({
            ...s,
            id: s.id,
            name: `${s.display || s.label || s.name || s.title} • ${s.entity_type}`
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
