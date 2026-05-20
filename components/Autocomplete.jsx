import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Check, Plus } from 'lucide-react';
import QuickAddModal from './QuickAddModal';

const Autocomplete = ({
    options = [],
    value, // id or array of ids
    onChange,
    onSearchChange,
    placeholder = 'Select...',
    labelKey = 'name',
    valueKey = 'id',
    disabled = false,
    multiple = false,
    allowQuickAdd = false,
    quickAddType = '',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [localOptions, setLocalOptions] = useState([]);
    const containerRef = useRef(null);

    // Merge prop options with locally added ones
    const safeOptions = Array.isArray(options) ? options : [];
    const allOptions = [...safeOptions, ...localOptions];

    // Helper to get selected options
    const getSelectedOptions = () => {
        if (multiple) {
            return Array.isArray(value)
                ? allOptions.filter(opt => opt && value.includes(opt[valueKey]))
                : [];
        }
        return allOptions.find(opt => opt && opt[valueKey] == value) || null;
    };

    const selectedOptions = getSelectedOptions();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = onSearchChange
        ? allOptions
        : allOptions.filter(opt =>
            opt && opt[labelKey] && String(opt[labelKey]).toLowerCase().includes(search.toLowerCase())
        );

    const handleSelect = (opt) => {
        if (!opt) return;
        const optValue = opt[valueKey];
        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            if (currentValues.includes(optValue)) {
                onChange(currentValues.filter(v => v !== optValue));
            } else {
                onChange([...currentValues, optValue]);
            }
        } else {
            onChange(optValue);
            setIsOpen(false);
        }
        setSearch('');
    };

    const handleRemove = (e, optValue) => {
        e.stopPropagation();
        if (multiple) {
            onChange(value.filter(v => v !== optValue));
        } else {
            onChange('');
        }
    };

    const isSelected = (optValue) => {
        if (multiple) {
            return Array.isArray(value) && value.includes(optValue);
        }
        return value === optValue;
    };

    return (
        <div className={`relative w-full ${className}`} ref={containerRef}>
            <div
                className={`flex items-center justify-between min-h-[44px] px-4 py-2 bg-white/5 border border-white/10 rounded-xl cursor-pointer transition-all hover:bg-white/[0.08] hover:border-white/20 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isOpen ? 'ring-2 ring-accent/20 border-accent/40' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex-1 flex flex-wrap gap-2 overflow-hidden">
                    {multiple ? (
                        selectedOptions.length > 0 ? (
                            selectedOptions.map(opt => (
                                <span key={opt[valueKey]} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs font-bold whitespace-nowrap">
                                    {opt[labelKey]}
                                    {!disabled && (
                                        <button className="hover:text-white transition-colors" onClick={(e) => handleRemove(e, opt[valueKey])}>
                                            <X size={12} />
                                        </button>
                                    )}
                                </span>
                            ))
                        ) : (
                            <span className="text-text-secondary text-sm font-medium">{placeholder}</span>
                        )
                    ) : (
                        selectedOptions ? (
                            <span className="text-white text-sm font-semibold">{selectedOptions[labelKey]}</span>
                        ) : (
                            <span className="text-text-secondary text-sm font-medium">{placeholder}</span>
                        )
                    )}
                </div>

                <div className="flex items-center gap-2 ml-2 shrink-0">
                    {!multiple && selectedOptions && !disabled && (
                        <button
                            className="p-1 hover:bg-white/10 rounded-full text-text-secondary hover:text-danger transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown size={16} className={`text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-premium-glass border border-white/10 rounded-2xl shadow-glass z-[1002] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/[0.03]">
                        <Search size={14} className="text-text-secondary" />
                        <input
                            autoFocus
                            placeholder="Type to filter..."
                            className="bg-transparent border-none text-white text-sm w-full focus:outline-none placeholder:text-text-secondary/50"
                            value={search}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearch(val);
                                onSearchChange?.(val);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="max-h-[250px] overflow-y-auto py-1 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt[valueKey]}
                                    className={`px-4 py-3 text-sm cursor-pointer transition-colors flex items-center justify-between group ${isSelected(opt[valueKey]) ? 'bg-accent/10 text-accent font-bold' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                                    onClick={() => handleSelect(opt)}
                                >
                                    <span className="truncate">{opt[labelKey]}</span>
                                    {isSelected(opt[valueKey]) && <Check size={14} className="shrink-0" />}
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center">
                                <p className="text-text-secondary text-sm mb-4">No matches found</p>
                                {allowQuickAdd && (
                                    <button
                                        type="button"
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-[#0f1115] rounded-xl text-xs font-black transition-all hover:scale-[1.02] active:scale-95"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsQuickAddOpen(true);
                                        }}
                                    >
                                        <Plus size={14} strokeWidth={3} /> Quick Add "{search}"
                                    </button>
                                )}
                            </div>
                        )}
                        {allowQuickAdd && filteredOptions.length > 0 && (
                            <div className="p-2 border-t border-white/5 bg-white/[0.02]">
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-dashed border-white/20 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsQuickAddOpen(true);
                                    }}
                                >
                                    <Plus size={14} /> Add New Entry
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <QuickAddModal
                isOpen={isQuickAddOpen}
                onClose={() => setIsQuickAddOpen(false)}
                entityType={quickAddType}
                initialName={search}
                onAdd={(newEntity) => {
                    if (!newEntity) return;
                    const normalizedEntity = {
                        ...newEntity,
                        id: newEntity.id || Date.now(),
                        name: newEntity.name || newEntity.title || 'Unknown',
                        title: newEntity.title || newEntity.name || 'Unknown'
                    };
                    setLocalOptions(prev => [...prev, normalizedEntity]);
                    if (multiple) {
                        onChange([...(value || []), normalizedEntity.id]);
                    } else {
                        onChange(normalizedEntity.id);
                    }
                    setIsOpen(false);
                    setSearch('');
                }}
            />
        </div>
    );
};

export default Autocomplete;
