import React, { useEffect, useMemo, useState } from 'react';
import EntityForm from '../../components/EntityForm';
import { officeEventsService } from '../../services/officeEventsService';

const EVENT_TYPES = [
    'Release',
    'Contract Milestone',
    'Registration',
    'Deadline',
    'Meeting',
    'Reminder',
    'Other',
];

const EVENT_STATUSES = ['Planned', 'Completed', 'Cancelled'];

const LINKED_TYPES = [
    { label: 'None', value: '' },
    { label: 'Artist', value: 'ARTIST' },
    { label: 'Track', value: 'TRACK' },
    { label: 'Release', value: 'RELEASE' },
    { label: 'Work', value: 'WORK' },
    { label: 'Contract', value: 'CONTRACT' },
    { label: 'Organization', value: 'ORG' },
];

const EVENT_COLORS = {
    Release: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
    'Contract Milestone': 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40',
    Registration: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    Deadline: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
    Meeting: 'bg-sky-500/20 text-sky-200 border-sky-500/40',
    Reminder: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
    Other: 'bg-slate-500/20 text-slate-200 border-slate-500/40',
};

const Events = () => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState('calendar');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [filters, setFilters] = useState({
        date_from: '',
        date_to: '',
        event_type: '',
        status: '',
        linked_entity_type: '',
        linked_entity_id: '',
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        event_type: 'Release',
        status: 'Planned',
        start_datetime: '',
        end_datetime: '',
        all_day: false,
        description: '',
        linked_entity_type: '',
        linked_entity_id: '',
    });

    const monthLabel = useMemo(() => {
        return currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    }, [currentMonth]);

    const monthRange = useMemo(() => {
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        return { start, end };
    }, [currentMonth]);

    const fetchEvents = async (override = {}) => {
        setIsLoading(true);
        try {
            const params = { ...filters, ...override };
            Object.keys(params).forEach((key) => {
                if (params[key] === '' || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });
            const data = await officeEventsService.list(params);
            setEvents(data);
        } catch (error) {
            console.error('Failed to load events', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'calendar') {
            fetchEvents({
                date_from: monthRange.start.toISOString(),
                date_to: monthRange.end.toISOString(),
            });
        } else {
            fetchEvents();
        }
    }, [viewMode, currentMonth, filters]);

    const openCreate = () => {
        setSelectedEvent(null);
        setFormData({
            title: '',
            event_type: 'Release',
            status: 'Planned',
            start_datetime: '',
            end_datetime: '',
            all_day: false,
            description: '',
            linked_entity_type: '',
            linked_entity_id: '',
        });
        setIsModalOpen(true);
    };

    const openEdit = (event) => {
        setSelectedEvent(event);
        setIsDetailOpen(false);
        setFormData({
            title: event.title || '',
            event_type: event.event_type || 'Other',
            status: event.status || 'Planned',
            start_datetime: event.start_datetime ? event.start_datetime.slice(0, 16) : '',
            end_datetime: event.end_datetime ? event.end_datetime.slice(0, 16) : '',
            all_day: !!event.all_day,
            description: event.description || '',
            linked_entity_type: event.linked_entity_type || '',
            linked_entity_id: event.linked_entity_id || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!formData.title || !formData.event_type || !formData.start_datetime) {
            alert('Title, type, and start date are required.');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                title: formData.title,
                event_type: formData.event_type,
                status: formData.status,
                start_datetime: new Date(formData.start_datetime).toISOString(),
                end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : null,
                all_day: formData.all_day,
                description: formData.description || null,
                linked_entity_type: formData.linked_entity_type || null,
                linked_entity_id: formData.linked_entity_id ? Number(formData.linked_entity_id) : null,
            };
            if (selectedEvent) {
                await officeEventsService.update(selectedEvent.id, payload);
            } else {
                await officeEventsService.create(payload);
            }
            setIsModalOpen(false);
            await fetchEvents();
        } catch (error) {
            console.error('Save failed', error);
            alert(error.response?.data?.detail || 'Save failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (event) => {
        if (!window.confirm(`Delete "${event.title}"?`)) return;
        try {
            await officeEventsService.remove(event.id);
            await fetchEvents();
        } catch (error) {
            console.error('Delete failed', error);
            alert('Delete failed');
        }
    };

    const openDetail = (event) => {
        setSelectedEvent(event);
        setIsDetailOpen(true);
    };

    const calendarDays = useMemo(() => {
        const start = new Date(monthRange.start);
        const end = new Date(monthRange.end);
        const startDay = start.getDay();
        const totalDays = end.getDate();
        const days = [];

        for (let i = 0; i < startDay; i += 1) {
            const date = new Date(start);
            date.setDate(start.getDate() - (startDay - i));
            days.push({ date, isCurrentMonth: false });
        }
        for (let day = 1; day <= totalDays; day += 1) {
            days.push({ date: new Date(start.getFullYear(), start.getMonth(), day), isCurrentMonth: true });
        }
        while (days.length % 7 !== 0) {
            const last = days[days.length - 1].date;
            const date = new Date(last);
            date.setDate(last.getDate() + 1);
            days.push({ date, isCurrentMonth: false });
        }
        return days;
    }, [monthRange]);

    const eventsByDay = useMemo(() => {
        const map = {};
        events.forEach((event) => {
            const dateKey = new Date(event.start_datetime).toDateString();
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(event);
        });
        return map;
    }, [events]);

    const now = new Date();

    return (
        <div className="page-container p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Office — Events</h1>
                    <p className="text-gray-400">Internal operational calendar for releases, milestones, and deadlines.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-secondary-bg border border-border rounded-lg p-1 flex">
                        <button
                            className={`px-3 py-1 text-sm rounded-md ${viewMode === 'calendar' ? 'bg-primary text-white' : 'text-gray-400'}`}
                            onClick={() => setViewMode('calendar')}
                        >
                            Calendar
                        </button>
                        <button
                            className={`px-3 py-1 text-sm rounded-md ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400'}`}
                            onClick={() => setViewMode('list')}
                        >
                            List
                        </button>
                    </div>
                    <button className="btn-primary" onClick={openCreate}>Create Event</button>
                </div>
            </div>

            <div className="bg-secondary-bg border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
                <input
                    type="date"
                    className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                    value={filters.date_from}
                    onChange={(event) => setFilters({ ...filters, date_from: event.target.value })}
                />
                <input
                    type="date"
                    className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                    value={filters.date_to}
                    onChange={(event) => setFilters({ ...filters, date_to: event.target.value })}
                />
                <select
                    className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                    value={filters.event_type}
                    onChange={(event) => setFilters({ ...filters, event_type: event.target.value })}
                >
                    <option value="">All Types</option>
                    {EVENT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                <select
                    className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                    value={filters.status}
                    onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                >
                    <option value="">All Statuses</option>
                    {EVENT_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                    <option value="Overdue">Overdue</option>
                </select>
                <select
                    className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                    value={filters.linked_entity_type}
                    onChange={(event) => setFilters({ ...filters, linked_entity_type: event.target.value })}
                >
                    {LINKED_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
                <input
                    type="number"
                    className="w-32 bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Linked ID"
                    value={filters.linked_entity_id}
                    onChange={(event) => setFilters({ ...filters, linked_entity_id: event.target.value })}
                />
            </div>

            {isLoading ? (
                <div className="text-gray-400">Loading events...</div>
            ) : viewMode === 'calendar' ? (
                <div className="bg-secondary-bg border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            className="btn-secondary"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                        >
                            Prev
                        </button>
                        <div className="text-lg font-semibold">{monthLabel}</div>
                        <button
                            className="btn-secondary"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                        >
                            Next
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-xs text-gray-400 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="text-center">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day) => {
                            const key = day.date.toDateString();
                            const dayEvents = eventsByDay[key] || [];
                            return (
                                <div
                                    key={key}
                                    className={`border border-border rounded-lg p-2 min-h-[110px] ${day.isCurrentMonth ? 'bg-black/10' : 'bg-black/5 text-gray-500'}`}
                                >
                                    <div className="text-xs mb-2">{day.date.getDate()}</div>
                                    <div className="space-y-1">
                                        {dayEvents.slice(0, 3).map((event) => (
                                            (() => {
                                                const isOverdue = new Date(event.start_datetime) < now && event.status !== 'Completed';
                                                return (
                                                    <button
                                                        key={event.id}
                                                        className={`w-full text-left text-xs px-2 py-1 rounded border ${EVENT_COLORS[event.event_type] || EVENT_COLORS.Other} ${isOverdue ? 'ring-1 ring-rose-400/70' : ''}`}
                                                        onClick={() => openDetail(event)}
                                                    >
                                                        {event.title}
                                                    </button>
                                                );
                                            })()
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : events.length === 0 ? (
                <div className="bg-secondary-bg border border-border border-dashed rounded-xl p-12 text-center text-gray-500">
                    No events yet.
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Linked To</th>
                                <th>Status</th>
                                <th className="actions-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((event) => {
                                const eventDate = new Date(event.start_datetime);
                                const isOverdue = eventDate < now && event.status !== 'Completed';
                                return (
                                    <tr key={event.id} className={event.status === 'Completed' ? 'text-gray-500' : ''}>
                                        <td>{eventDate.toLocaleDateString()}</td>
                                        <td>{event.title}</td>
                                        <td>{event.event_type}</td>
                                        <td>
                                            {event.linked_entity_type && event.linked_entity_id
                                                ? `${event.linked_entity_type}: ${event.linked_entity_id}`
                                                : 'None'}
                                        </td>
                                        <td>
                                            <span className={`px-2 py-1 rounded-full text-xs border ${isOverdue ? 'border-rose-500/50 text-rose-300' : 'border-border text-gray-300'}`}>
                                                {isOverdue ? 'Overdue' : event.status}
                                            </span>
                                        </td>
                                        <td className="actions-cell" style={{ width: '140px' }}>
                                            <button className="btn-icon edit" onClick={() => openEdit(event)} title="Edit">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 20h9"></path>
                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                                                </svg>
                                            </button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(event)} title="Delete">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedEvent ? 'Edit Event' : 'Create Event'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="event-title">Title</label>
                    <input
                        id="event-title"
                        type="text"
                        value={formData.title}
                        onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="event-type">Type</label>
                    <select
                        id="event-type"
                        value={formData.event_type}
                        onChange={(event) => setFormData({ ...formData, event_type: event.target.value })}
                        required
                    >
                        {EVENT_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="event-status">Status</label>
                    <select
                        id="event-status"
                        value={formData.status}
                        onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                    >
                        {EVENT_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="event-start">Start Date/Time</label>
                    <input
                        id="event-start"
                        type="datetime-local"
                        value={formData.start_datetime}
                        onChange={(event) => setFormData({ ...formData, start_datetime: event.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="event-end">End Date/Time (optional)</label>
                    <input
                        id="event-end"
                        type="datetime-local"
                        value={formData.end_datetime}
                        onChange={(event) => setFormData({ ...formData, end_datetime: event.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.all_day}
                            onChange={(event) => setFormData({ ...formData, all_day: event.target.checked })}
                        />
                        All day
                    </label>
                </div>
                <div className="form-group">
                    <label htmlFor="event-description">Description (optional)</label>
                    <textarea
                        id="event-description"
                        rows="3"
                        value={formData.description}
                        onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="linked-type">Link to (optional)</label>
                    <select
                        id="linked-type"
                        value={formData.linked_entity_type}
                        onChange={(event) => setFormData({ ...formData, linked_entity_type: event.target.value })}
                    >
                        {LINKED_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="linked-id">Linked Entity ID (optional)</label>
                    <input
                        id="linked-id"
                        type="number"
                        value={formData.linked_entity_id}
                        onChange={(event) => setFormData({ ...formData, linked_entity_id: event.target.value })}
                    />
                </div>
            </EntityForm>

            {isDetailOpen && selectedEvent && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
                    <div className="bg-secondary-bg border border-border rounded-xl w-full max-w-3xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-semibold">{selectedEvent.title}</h2>
                                <p className="text-gray-400 text-sm">{selectedEvent.event_type}</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsDetailOpen(false)}>×</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                            <div>
                                <div className="text-gray-500">Start</div>
                                <div>{new Date(selectedEvent.start_datetime).toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">End</div>
                                <div>{selectedEvent.end_datetime ? new Date(selectedEvent.end_datetime).toLocaleString() : '—'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Status</div>
                                <div>{selectedEvent.status}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Linked To</div>
                                <div>
                                    {selectedEvent.linked_entity_type && selectedEvent.linked_entity_id
                                        ? `${selectedEvent.linked_entity_type}: ${selectedEvent.linked_entity_id}`
                                        : 'None'}
                                </div>
                            </div>
                            {selectedEvent.description && (
                                <div className="md:col-span-2">
                                    <div className="text-gray-500">Description</div>
                                    <div>{selectedEvent.description}</div>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex gap-3 justify-end">
                            <button className="btn-secondary" onClick={() => openEdit(selectedEvent)}>Edit</button>
                            <button className="btn-secondary" onClick={() => handleDelete(selectedEvent)}>Delete</button>
                            <button className="btn-primary" onClick={() => setIsDetailOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Events;
