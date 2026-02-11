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
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index}>{col.label}</th>
                            ))}
                            <th className="actions-header">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, index) => (
                            <tr key={index}>
                                {columns.map((col, cIndex) => (
                                    <td key={cIndex}>
                                        <Skeleton />
                                    </td>
                                ))}
                                <td className="actions-cell">
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
            <div className="empty-state" style={{
                padding: '3rem',
                textAlign: 'center',
                color: '#64748b',
                background: 'var(--surface-color)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-color)'
            }}>
                No records found.
            </div>
        );
    }

    const renderSortIcon = (col) => {
        if (!col.sortable) return null;
        if (!sortConfig || sortConfig.key !== col.key) {
            return <ArrowUpDown size={14} style={{ marginLeft: '4px', opacity: 0.3 }} />;
        }
        return sortConfig.direction === 'ascending' ?
            <ArrowUp size={14} style={{ marginLeft: '4px' }} /> :
            <ArrowDown size={14} style={{ marginLeft: '4px' }} />;
    };

    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        {columns.map((col, index) => (
                            <th
                                key={col.key || index}
                                onClick={() => col.sortable && handleSort(col.key)}
                                style={{ cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none' }}
                                className={col.sortable ? 'sortable-header' : ''}
                            >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {col.label}
                                    {renderSortIcon(col)}
                                </div>
                            </th>
                        ))}
                        <th className="actions-header" style={{ width: '100px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, index) => (
                        <tr key={row.id || index}>
                            {columns.map((col, cIndex) => (
                                <td key={`${row.id}-${cIndex}`}>
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                            <td className="actions-cell">
                                <button
                                    type="button"
                                    className="btn-icon edit"
                                    onClick={() => onEdit(row)}
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    type="button"
                                    className="btn-icon delete"
                                    onClick={() => onDelete(row)}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;
