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
        const sortableItems = [...(data || [])];
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
                if (aStr < bStr) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aStr > bStr) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    if (isLoading) {
        return (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <table className="w-full border-collapse">
                    <thead className="bg-surface-elevated">
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} className="border-b border-border px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">{col.label}</th>
                            ))}
                            <th className="border-b border-border px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, index) => (
                            <tr key={index} className="border-b border-border last:border-0">
                                {columns.map((col, cIndex) => (
                                    <td key={cIndex} className="px-4 py-4"><Skeleton /></td>
                                ))}
                                <td className="px-4 py-4"><Skeleton width="60px" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-surface px-6 py-16 text-center text-sm text-text-secondary">
                No records found.
            </div>
        );
    }

    const renderSortIcon = (col) => {
        if (!col.sortable) return null;
        if (!sortConfig || sortConfig.key !== col.key) {
            return <ArrowUpDown size={12} className="ml-2 text-text-secondary/60" />;
        }
        return sortConfig.direction === 'ascending'
            ? <ArrowUp size={12} className="ml-2 text-accent" />
            : <ArrowDown size={12} className="ml-2 text-accent" />;
    };

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead className="bg-surface-elevated">
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={col.key || index}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                    className={`border-b border-border px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary ${col.sortable ? 'cursor-pointer select-none hover:text-text-primary' : ''}`}
                                >
                                    <div className="flex items-center">{col.label}{renderSortIcon(col)}</div>
                                </th>
                            ))}
                            <th className="w-[100px] border-b border-border px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, index) => (
                            <tr
                                key={row.id || index}
                                className={`border-b border-border last:border-0 transition-colors hover:bg-surface-elevated/70 ${onRowClick ? 'cursor-pointer' : ''}`}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map((col, cIndex) => (
                                    <td key={`${row.id}-${cIndex}`} className="px-4 py-4 text-sm font-medium text-text-primary">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-1">
                                        <button type="button" className="rounded-md p-2 text-text-secondary transition-colors hover:bg-accent/10 hover:text-accent focus:outline-none" onClick={(e) => { e.stopPropagation(); onEdit?.(row); }} title="Edit">
                                            <Edit2 size={15} />
                                        </button>
                                        <button type="button" className="rounded-md p-2 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger focus:outline-none" onClick={(e) => { e.stopPropagation(); onDelete?.(row); }} title="Delete">
                                            <Trash2 size={15} />
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
