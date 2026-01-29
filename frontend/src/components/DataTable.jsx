import React from 'react';
import Skeleton from './Skeleton';

const DataTable = ({ columns, data, onEdit, onDelete, isLoading }) => {
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

    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        {columns.map((col, index) => (
                            <th key={col.key || index}>{col.label}</th>
                        ))}
                        <th className="actions-header" style={{ width: '100px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={row.id || index}>
                            {columns.map((col, cIndex) => (
                                <td key={`${row.id}-${cIndex}`}>
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                            <td className="actions-cell">
                                <button
                                    className="btn-icon edit"
                                    onClick={() => onEdit(row)}
                                    title="Edit"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button
                                    className="btn-icon delete"
                                    onClick={() => onDelete(row)}
                                    title="Delete"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
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
