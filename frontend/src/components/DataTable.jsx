import { Edit2, Trash2 } from 'lucide-react';
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
