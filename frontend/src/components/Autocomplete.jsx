import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

const Autocomplete = ({
    options = [],
    value, // id or array of ids
    onChange,
    placeholder = 'Select...',
    labelKey = 'name',
    valueKey = 'id',
    disabled = false,
    multiple = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    // Helper to get selected options
    const getSelectedOptions = () => {
        if (multiple) {
            return Array.isArray(value)
                ? options.filter(opt => value.includes(opt[valueKey]))
                : [];
        }
        return options.find(opt => opt[valueKey] === value);
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

    const filteredOptions = options.filter(opt =>
        String(opt[labelKey]).toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (opt) => {
        const optValue = opt[valueKey];
        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            if (currentValues.includes(optValue)) {
                onChange(currentValues.filter(v => v !== optValue));
            } else {
                onChange([...currentValues, optValue]);
            }
            // Keep open for multiple selection
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
        <div className={`autocomplete-container ${className} ${multiple ? 'is-multiple' : ''}`} ref={containerRef}>
            <div
                className={`autocomplete-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'active' : ''} ${multiple && selectedOptions.length > 0 ? 'has-chips' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="trigger-main">
                    {multiple ? (
                        <div className="chips-container">
                            {selectedOptions.length > 0 ? (
                                selectedOptions.map(opt => (
                                    <span key={opt[valueKey]} className="chip">
                                        {opt[labelKey]}
                                        {!disabled && (
                                            <button className="chip-remove" onClick={(e) => handleRemove(e, opt[valueKey])}>
                                                <X size={12} />
                                            </button>
                                        )}
                                    </span>
                                ))
                            ) : (
                                <span className="placeholder">{placeholder}</span>
                            )}
                        </div>
                    ) : (
                        selectedOptions ? (
                            <span className="selected-text">{selectedOptions[labelKey]}</span>
                        ) : (
                            <span className="placeholder">{placeholder}</span>
                        )
                    )}
                </div>

                <div className="trigger-icons">
                    {!multiple && selectedOptions && !disabled && (
                        <button
                            className="clear-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown size={16} className={`chevron ${isOpen ? 'rotated' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="autocomplete-dropdown">
                    <div className="search-box">
                        <Search size={14} />
                        <input
                            autoFocus
                            placeholder="Type to filter..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="options-list">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt[valueKey]}
                                    className={`option-item ${isSelected(opt[valueKey]) ? 'selected' : ''}`}
                                    onClick={() => handleSelect(opt)}
                                >
                                    <div className="option-content">
                                        {opt[labelKey]}
                                        {multiple && isSelected(opt[valueKey]) && <Check size={14} className="check-icon" />}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-options">No matches found</div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .autocomplete-container {
                    position: relative;
                    width: 100%;
                }
                .autocomplete-trigger {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid var(--border-color);
                    border-radius: 0.375rem;
                    background: white;
                    cursor: pointer;
                    min-height: 42px;
                    transition: all 0.2s;
                }
                .autocomplete-trigger.has-chips {
                    padding: 0.375rem;
                }
                .trigger-main {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    overflow: hidden;
                }
                .chips-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.375rem;
                }
                .chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    background: #eff6ff;
                    color: var(--accent-color);
                    border: 1px solid #dbeafe;
                    padding: 0.125rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.8125rem;
                    font-weight: 500;
                }
                .chip-remove {
                    border: none;
                    background: none;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    color: #60a5fa;
                }
                .chip-remove:hover { color: var(--accent-color); }
                
                .autocomplete-trigger:hover:not(.disabled) {
                    border-color: var(--accent-color);
                }
                .autocomplete-trigger.active {
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
                .autocomplete-trigger.disabled {
                    background: #f8fafc;
                    cursor: not-allowed;
                    opacity: 0.7;
                }
                .selected-text { color: var(--text-color); font-weight: 500; }
                .placeholder { color: var(--text-muted); font-size: 0.875rem; }
                
                .trigger-icons { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); padding-left: 0.5rem; }
                .clear-btn {
                    border: none;
                    background: none;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .clear-btn:hover { background: #f1f5f9; color: var(--danger-color); }
                .chevron { transition: transform 0.2s; }
                .chevron.rotated { transform: rotate(180deg); }

                .autocomplete-dropdown {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid var(--border-color);
                    border-radius: 0.375rem;
                    box-shadow: var(--shadow-lg);
                    z-index: 1002;
                    overflow: hidden;
                    animation: slideDown 0.1s ease-out;
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.55rem 0.75rem;
                    border-bottom: 1px solid var(--border-color);
                    background: #f8fafc;
                }
                .search-box input {
                    border: none;
                    background: none;
                    flex: 1;
                    font-size: 0.875rem;
                    outline: none;
                    padding: 2px 0;
                }
                .options-list {
                    max-height: 250px;
                    overflow-y: auto;
                }
                .option-item {
                    padding: 0.625rem 0.75rem;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.1s;
                }
                .option-item:hover { background: #f1f5f9; }
                .option-item.selected { 
                    background: #eff6ff; 
                    color: var(--accent-color); 
                }
                .option-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .check-icon { color: var(--accent-color); }
                
                .no-options {
                    padding: 1.5rem;
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 0.875rem;
                }
            `}</style>
        </div>
    );
};

export default Autocomplete;
