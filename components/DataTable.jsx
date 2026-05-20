import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import Skeleton from './Skeleton';

const DataTable = ({ columns, data, onEdit, onDelete, isLoading }) => {
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

                // Handle numbers
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
                }

                // Handle strings (including dates as strings)
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
            <div className="bg-premium-glass border border-white/5 rounded-[24px] shadow-glass overflow-hidden backdrop-blur-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-white/[0.02]">
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} className="px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5">{col.label}</th>
                            ))}
                            <th className="px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, index) => (
                            <tr key={index} className="border-b border-white/5 last:border-0">
                                {columns.map((col, cIndex) => (
                                    <td key={cIndex} className="px-6 py-5">
                                        <Skeleton />
                                    </td>
                                ))}
                                <td className="px-6 py-5">
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
            <div className="bg-premium-glass border border-white/5 rounded-[24px] py-16 text-center text-text-secondary text-sm backdrop-blur-xl">
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
        <div className="bg-premium-glass border border-white/5 rounded-[24px] shadow-glass overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead className="bg-white/[0.02]">
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={col.key || index}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                    className={`px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5 transition-colors ${col.sortable ? 'cursor-pointer hover:text-white select-none' : 'cursor-default'}`}
                                >
                                    <div className="flex items-center">
                                        {col.label}
                                        {renderSortIcon(col)}
                                    </div>
                                </th>
                            ))}
                            <th className="px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5 w-[100px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, index) => (
                            <tr key={row.id || index} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors group">
                                {columns.map((col, cIndex) => (
                                    <td key={`${row.id}-${cIndex}`} className="px-6 py-5 text-sm text-white font-medium">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            className="p-2 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-all focus:outline-none"
                                            onClick={() => onEdit(row)}
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all focus:outline-none"
                                            onClick={() => onDelete(row)}
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
