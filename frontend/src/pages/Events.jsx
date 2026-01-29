import React, { useState, useEffect } from 'react';
import { EventsService } from '../services/operations';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';

const Events = () => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    const initialFormState = {
        title: '',
        start_datetime: '',
        end_datetime: '',
        location: '',
        description: '',
        all_day: false
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const data = await EventsService.getAll();
            setEvents(data);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleCreate = () => {
        setEditingEvent(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleEdit = (event) => {
        setEditingEvent(event);
        setFormData({
            title: event.title || '',
            start_datetime: event.start_datetime ? event.start_datetime.slice(0, 16) : '',
            end_datetime: event.end_datetime ? event.end_datetime.slice(0, 16) : '',
            location: event.location || '',
            description: event.description || '',
            all_day: event.all_day || false
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (event) => {
        if (window.confirm(`Are you sure you want to delete event "${event.title}"?`)) {
            try {
                await EventsService.delete(event.id);
                fetchEvents();
            } catch (error) {
                console.error('Failed to delete event:', error);
                alert('Failed to delete event');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const submitData = { ...formData };
            // Ensure dates are ISO format or valid for backend
            if (!submitData.end_datetime) submitData.end_datetime = null;

            if (editingEvent) {
                await EventsService.update(editingEvent.id, submitData);
            } else {
                await EventsService.create(submitData);
            }
            setIsModalOpen(false);
            fetchEvents();
        } catch (error) {
            console.error('Failed to save event:', error);
            alert('Failed to save event');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'title', label: 'Event' },
        {
            key: 'start_datetime',
            label: 'Start (Date/Time)',
            render: (row) => new Date(row.start_datetime).toLocaleString()
        },
        { key: 'location', label: 'Location' }
    ];

    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const CalendarView = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Empty cells for days before start of month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minHeight: '100px' }}></div>);
        }

        // Days of month
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const daysEvents = events.filter(e => e.start_datetime && e.start_datetime.startsWith(dateStr));

            days.push(
                <div key={i} style={{ border: '1px solid #e2e8f0', minHeight: '100px', padding: '0.5rem', background: 'white' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#64748b' }}>{i}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {daysEvents.map(e => (
                            <div
                                key={e.id}
                                onClick={() => handleEdit(e)}
                                style={{
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                                title={e.title}
                            >
                                {e.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={prevMonth} className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>&lt;</button>
                            <button onClick={nextMonth} className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>&gt;</button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0', background: '#e2e8f0', border: '1px solid #e2e8f0' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} style={{ background: '#f1f5f9', padding: '0.5rem', fontWeight: 600, textAlign: 'center' }}>{d}</div>
                    ))}
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Calendar & Events</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '6px' }}>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                background: viewMode === 'list' ? 'white' : 'transparent',
                                border: 'none',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: viewMode === 'list' ? 600 : 400
                            }}
                        >
                            List
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            style={{
                                background: viewMode === 'calendar' ? 'white' : 'transparent',
                                border: 'none',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: viewMode === 'calendar' ? 600 : 400
                            }}
                        >
                            Calendar
                        </button>
                    </div>
                    <button className="btn-primary" onClick={handleCreate}>
                        + Add Event
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <DataTable
                    columns={columns}
                    data={events}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            ) : (
                <CalendarView />
            )}

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingEvent ? 'Edit Event' : 'New Event'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="title">Event Title</label>
                    <input
                        type="text"
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="start_datetime">Start Time</label>
                    <input
                        type="datetime-local"
                        id="start_datetime"
                        value={formData.start_datetime}
                        onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="end_datetime">End Time</label>
                    <input
                        type="datetime-local"
                        id="end_datetime"
                        value={formData.end_datetime}
                        onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="location">Location</label>
                    <input
                        type="text"
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        rows="3"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>
            </EntityForm>
        </div>
    );
};

export default Events;
