import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import Skeleton from './Skeleton';

const DataTable = ({ columns, data, onEdit, onDelete, isLoading, onRowClick }) => {
    const [sortConfig, setSortConfig] = useState(null);

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        let sortableItems = [...(data || [])];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === bValue) return 0;
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
                }

                const aStr = String(aValue).toLowerCase();
                const bStr = String(bValue).toLowerCase();

                if (aStr < bStr) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aStr > bStr) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    if (isLoading) {
        return (
            <div className="bg-premium-glass border border-border rounded-xl shadow-glass overflow-hidden backdrop-blur-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-surface">
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} className="px-lg py-5 text-left text-2xs font-bold text-text-secondary uppercase tracking-widest border-b border-border">{col.label}</th>
                            ))}
                            <th className="px-lg py-5 text-left text-2xs font-bold text-text-secondary uppercase tracking-widest border-b border-border">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, index) => (
                            <tr key={index} className="border-b border-border last:border-0">
                                {columns.map((col, cIndex) => (
                                    <td key={cIndex} className="px-lg py-5">
                                        <Skeleton />
                                    </td>
                                ))}
                                <td className="px-lg py-5">
                                    <Skeleton width="60px" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-premium-glass border border-border rounded-xl py-16 text-center text-text-secondary text-small backdrop-blur-xl">
                No records found.
            </div>
        );
    }

    const renderSortIcon = (col) => {
        if (!col.sortable) return null;
        if (!sortConfig || sortConfig.key !== col.key) {
            return <ArrowUpDown size={12} className="ml-2 text-text-secondary opacity-30" />;
        }
        return sortConfig.direction === 'ascending' ?
            <ArrowUp size={12} className="ml-2 text-accent" /> :
            <ArrowDown size={12} className="ml-2 text-accent" />;
    };

    return (
        <div className="bg-premium-glass border border-border rounded-xl shadow-glass overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead className="bg-surface">
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={col.key || index}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                    className={`px-lg py-5 text-left text-2xs font-bold text-text-secondary uppercase tracking-widest border-b border-border transition-colors ${col.sortable ? 'cursor-pointer hover:text-text-primary select-none' : 'cursor-default'}`}
                                >
                                    <div className="flex items-center">
                                        {col.label}
                                        {renderSortIcon(col)}
                                    </div>
                                </th>
                            ))}
                            <th className="px-lg py-5 text-left text-2xs font-bold text-text-secondary uppercase tracking-widest border-b border-border w-[100px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, index) => (
                            <tr
                                key={row.id || index}
                                className={`border-b border-border last:border-0 hover:bg-surface-elevated transition-colors group ${onRowClick ? 'cursor-pointer' : ''}`}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map((col, cIndex) => (
                                    <td key={`${row.id}-${cIndex}`} className="px-lg py-5 text-small text-text-primary font-medium">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                                <td className="px-lg py-5">
                                    <div className="flex items-center gap-sm opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            className="p-sm text-text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-all focus:outline-none"
                                            onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className="p-sm text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all focus:outline-none"
                                            onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;
