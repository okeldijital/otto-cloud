import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

const Autocomplete = ({
    options = [],
    value,
    onChange,
    placeholder = 'Select...',
    labelKey = 'name',
    valueKey = 'id',
    disabled = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt[valueKey] === value);

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
        onChange(opt[valueKey]);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className={`autocomplete-container ${className}`} ref={containerRef}>
            <div
                className={`autocomplete-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'active' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {selectedOption ? (
                    <span className="selected-text">{selectedOption[labelKey]}</span>
                ) : (
                    <span className="placeholder">{placeholder}</span>
                )}
                <div className="trigger-icons">
                    {selectedOption && !disabled && (
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
                                    className={`option-item ${opt[valueKey] === value ? 'selected' : ''}`}
                                    onClick={() => handleSelect(opt)}
                                >
                                    {opt[labelKey]}
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
                    min-height: 40px;
                    transition: all 0.2s;
                }
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
                
                .trigger-icons { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); }
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
                    padding: 0.5rem 0.75rem;
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
                    font-weight: 600; 
                }
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
