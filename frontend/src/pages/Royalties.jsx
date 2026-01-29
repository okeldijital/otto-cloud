import React, { useState, useEffect } from 'react';
import { RoyaltiesService } from '../services/royalties';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';

const Royalties = () => {
    const [royalties, setRoyalties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingRoyalty, setEditingRoyalty] = useState(null);

    const initialFormState = {
        source: '',
        amount: '',
        currency: 'USD',
        statement_date: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchRoyalties = async () => {
        setIsLoading(true);
        try {
            const data = await RoyaltiesService.getAll();
            setRoyalties(data);
        } catch (error) {
            console.error('Failed to fetch royalties:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoyalties();
    }, []);

    const handleCreate = () => {
        setEditingRoyalty(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleEdit = (royalty) => {
        setEditingRoyalty(royalty);
        setFormData({
            source: royalty.source || '',
            amount: royalty.amount || '',
            currency: royalty.currency || 'USD',
            statement_date: royalty.statement_date || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (royalty) => {
        if (window.confirm(`Are you sure you want to delete royalty from "${royalty.source}"?`)) {
            try {
                await RoyaltiesService.delete(royalty.id);
                fetchRoyalties();
            } catch (error) {
                console.error('Failed to delete royalty:', error);
                alert('Failed to delete royalty');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const submitData = { ...formData };
        if (submitData.amount === '') submitData.amount = 0;
        if (submitData.statement_date === '') submitData.statement_date = null;

        try {
            if (editingRoyalty) {
                await RoyaltiesService.update(editingRoyalty.id, submitData);
            } else {
                await RoyaltiesService.create(submitData);
            }
            setIsModalOpen(false);
            fetchRoyalties();
        } catch (error) {
            console.error('Failed to save royalty:', error);
            alert('Failed to save royalty');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'source', label: 'Source' },
        {
            key: 'amount',
            label: 'Amount',
            render: (row) => `${row.amount || 0} ${row.currency}`
        },
        { key: 'statement_date', label: 'Statement Date' }
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Royalty Accounting</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    + Add Data
                </button>
            </div>

            <DataTable
                columns={columns}
                data={royalties}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRoyalty ? 'Edit Royalty' : 'New Royalty Entry'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="source">Source (e.g. Spotify, Apple Music)</label>
                    <input
                        type="text"
                        id="source"
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                        required
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="amount">Amount</label>
                    <input
                        type="number"
                        step="0.01"
                        id="amount"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="currency">Currency</label>
                    <select
                        id="currency"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="ZAR">ZAR</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="statement_date">Statement Date</label>
                    <input
                        type="date"
                        id="statement_date"
                        value={formData.statement_date}
                        onChange={(e) => setFormData({ ...formData, statement_date: e.target.value })}
                    />
                </div>
            </EntityForm>
        </div>
    );
};

export default Royalties;
