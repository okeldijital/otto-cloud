import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, LayoutGrid, List, RefreshCw, Calendar, User, Tag, Trash2, Edit3, AlertCircle } from 'lucide-react';
import EntityForm from '../../components/EntityForm';
import api from '../../lib/api';
import { officeTasksService } from '../../services/officeTasksService';
import PageHeader from '../../components/ui/PageHeader';

const STATUS_COLUMNS = [
    { key: 'todo', label: 'Todo' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'done', label: 'Done' },
];

const PRIORITIES = ['low', 'medium', 'high'];

const LINKED_TYPES = [
    { label: 'None', value: '' },
    { label: 'Artist', value: 'artist' },
    { label: 'Track', value: 'track' },
    { label: 'Release', value: 'release' },
    { label: 'Work', value: 'work' },
    { label: 'Contract', value: 'contract' },
    { label: 'Organization', value: 'organization' },
    { label: 'Event', value: 'event' },
];

const PRIORITY_STYLES = {
    low: 'text-emerald-300 border-emerald-500/40',
    medium: 'text-amber-300 border-amber-500/40',
    high: 'text-rose-300 border-rose-500/40',
};

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [viewMode, setViewMode] = useState('board');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [filters, setFilters] = useState({
        q: '',
        status: '',
        priority: '',
        assigned_to_user_id: '',
        due_before: '',
        due_after: '',
        linked_entity_type: '',
        linked_entity_id: '',
    });
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const params = { ...filters };
            Object.keys(params).forEach((key) => {
                if (params[key] === '' || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });
            const data = await officeTasksService.list(params);
            setTasks(data);
        } catch (error) {
            console.error('Failed to load tasks', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await officeTasksService.syncStatusQuo();
            alert(`Governance Sync Complete: ${res.tasks_created} tasks created.`);
            await fetchTasks();
        } catch (error) {
            console.error('Sync failed', error);
            alert('Governance sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data || []);
        } catch (error) {
            setUsers([]);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [filters]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const openCreate = () => {
        setSelectedTask(null);
        setFormData({
            title: '',
            description: '',
            status: 'todo',
            priority: 'medium',
            due_date: '',
            assigned_to_user_id: '',
            linked_entity_type: '',
            linked_entity_id: '',
        });
        setIsModalOpen(true);
    };

    const openEdit = (task) => {
        setSelectedTask(task);
        setFormData({
            title: task.title || '',
            description: task.description || '',
            status: task.status || 'todo',
            priority: task.priority || 'medium',
            due_date: task.due_date ? task.due_date.slice(0, 10) : '',
            assigned_to_user_id: task.assigned_to_user_id || '',
            linked_entity_type: task.linked_entity_type || '',
            linked_entity_id: task.linked_entity_id || '',
        });
        setIsModalOpen(true);
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        due_date: '',
        assigned_to_user_id: '',
        linked_entity_type: '',
        linked_entity_id: '',
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!formData.title) {
            alert('Title is required.');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                title: formData.title,
                description: formData.description || null,
                status: formData.status,
                priority: formData.priority,
                due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
                assigned_to_user_id: formData.assigned_to_user_id ? Number(formData.assigned_to_user_id) : null,
                linked_entity_type: formData.linked_entity_type || null,
                linked_entity_id: formData.linked_entity_id ? Number(formData.linked_entity_id) : null,
            };
            if (selectedTask) {
                await officeTasksService.update(selectedTask.id, payload);
            } else {
                await officeTasksService.create(payload);
            }
            setIsModalOpen(false);
            await fetchTasks();
        } catch (error) {
            console.error('Save failed', error);
            alert(error.response?.data?.detail || 'Save failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (task) => {
        if (!window.confirm(`Delete "${task.title}"?`)) return;
        try {
            await officeTasksService.remove(task.id);
            await fetchTasks();
        } catch (error) {
            console.error('Delete failed', error);
            alert('Delete failed');
        }
    };

    const handleDrop = async (taskId, newStatus) => {
        const originalTasks = [...tasks];
        const updatedTasks = tasks.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
        );
        setTasks(updatedTasks);
        try {
            await officeTasksService.update(taskId, { status: newStatus });
        } catch (error) {
            console.error('Status update failed', error);
            setTasks(originalTasks);
            alert(error.response?.data?.detail || 'Status update failed');
        }
    };

    const groupedTasks = useMemo(() => {
        const map = {};
        STATUS_COLUMNS.forEach((col) => {
            map[col.key] = [];
        });
        tasks.forEach((task) => {
            const bucket = map[task.status] || map.todo;
            bucket.push(task);
        });
        return map;
    }, [tasks]);

    const now = new Date();

    return (
        <div className="page-container p-8">
            <PageHeader
                title="Office — Tasks"
                subtitle="Internal task tracking for releases and governance."
                actions={
                    <div className="flex items-center gap-3">
                        <button
                            className={`btn btn-secondary btn-md flex items-center gap-2 ${isSyncing ? 'opacity-50' : ''}`}
                            onClick={handleSync}
                            disabled={isSyncing}
                            title="Sync tasks with governance gaps"
                        >
                            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'Syncing...' : 'Sync Governance'}
                        </button>

                        <div className="bg-surface-secondary border border-border rounded-lg p-1 flex">
                            <button
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-white'}`}
                                onClick={() => setViewMode('board')}
                                title="Board View"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-white'}`}
                                onClick={() => setViewMode('list')}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <button className="btn btn-primary btn-md flex items-center gap-2" onClick={openCreate}>
                            <Plus size={18} /> Create Task
                        </button>
                    </div>
                }
            />

            <div className="panel padded mb-8">
                <div className="filters-row flex-wrap">
                    <div className="filter-group flex-1">
                        <div className="search-box-inline w-full">
                            <Search className="text-muted" size={16} />
                            <input
                                type="text"
                                className="w-full"
                                placeholder="Search tasks..."
                                value={filters.q}
                                onChange={(event) => setFilters({ ...filters, q: event.target.value })}
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <Filter className="text-muted" size={16} />
                        <select
                            className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                            value={filters.status}
                            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                        >
                            <option value="">All Statuses</option>
                            {STATUS_COLUMNS.map((col) => (
                                <option key={col.key} value={col.key}>{col.label}</option>
                            ))}
                        </select>
                        <select
                            className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                            value={filters.priority}
                            onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
                        >
                            <option value="">All Priorities</option>
                            {PRIORITIES.map((priority) => (
                                <option key={priority} value={priority}>{priority}</option>
                            ))}
                        </select>
                        <select
                            className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm max-w-[150px]"
                            value={filters.assigned_to_user_id}
                            onChange={(event) => setFilters({ ...filters, assigned_to_user_id: event.target.value })}
                        >
                            <option value="">All Assignees</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                            ))}
                        </select>
                        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                className="bg-transparent border border-border rounded-lg px-2 py-1 text-xs"
                                value={filters.due_after}
                                title="Due After"
                                onChange={(event) => setFilters({ ...filters, due_after: event.target.value })}
                            />
                            <span className="text-muted text-xs">to</span>
                            <input
                                type="date"
                                className="bg-transparent border border-border rounded-lg px-2 py-1 text-xs"
                                value={filters.due_before}
                                title="Due Before"
                                onChange={(event) => setFilters({ ...filters, due_before: event.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="text-gray-400">Loading tasks...</div>
            ) : viewMode === 'board' ? (
                <div className="tasks-board">
                    {STATUS_COLUMNS.map((col) => (
                        <div
                            key={col.key}
                            className="kanban-column"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                const taskId = Number(event.dataTransfer.getData('text/plain'));
                                if (taskId) handleDrop(taskId, col.key);
                            }}
                        >
                            <div className="kanban-column-header">
                                <span>{col.label}</span>
                                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{groupedTasks[col.key].length}</span>
                            </div>
                            <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-[300px]">
                                {groupedTasks[col.key].length === 0 ? (
                                    <div className="text-xs text-gray-500 text-center py-8 border border-dashed border-border rounded-lg">No tasks</div>
                                ) : (
                                    groupedTasks[col.key].map((task) => {
                                        const due = task.due_date ? new Date(task.due_date) : null;
                                        const isOverdue = due && due < now && task.status !== 'done';
                                        return (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}
                                                className="task-card"
                                            >
                                                <div className="task-card-header">
                                                    <h4 className="task-card-title">{task.title}</h4>
                                                    <span className={`task-priority-badge priority-${task.priority}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <div className="task-card-description">{task.description || 'No description provided.'}</div>

                                                <div className="task-card-footer">
                                                    <div className="task-meta">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                        <span className={isOverdue ? 'text-rose-500 font-bold' : ''}>
                                                            {due ? due.toLocaleDateString() : 'No date'}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button className="btn-icon" onClick={() => openEdit(task)} title="Edit">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
                                                        </button>
                                                        <button className="btn-icon delete" onClick={() => handleDelete(task)} title="Delete">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : tasks.length === 0 ? (
                <div className="bg-secondary-bg border border-border border-dashed rounded-xl p-12 text-center text-gray-500">
                    No tasks yet.
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Due</th>
                                <th>Assigned To</th>
                                <th>Linked To</th>
                                <th className="actions-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => {
                                const due = task.due_date ? new Date(task.due_date) : null;
                                const isOverdue = due && due < now && task.status !== 'done';
                                const assignee = users.find((user) => user.id === task.assigned_to_user_id);
                                return (
                                    <tr key={task.id} className={task.status === 'done' ? 'text-gray-500' : ''}>
                                        <td>{task.title}</td>
                                        <td>{STATUS_COLUMNS.find((col) => col.key === task.status)?.label || task.status}</td>
                                        <td>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td>
                                            {due ? due.toLocaleDateString() : '—'}
                                            {isOverdue && <span className="ml-2 text-rose-300">Overdue</span>}
                                        </td>
                                        <td>{assignee ? assignee.full_name || assignee.email : 'Unassigned'}</td>
                                        <td>
                                            {task.linked_entity_type && task.linked_entity_id ? (
                                                <Link
                                                    to={
                                                        task.linked_entity_type === 'artist' ? `/catalog/artists/${task.linked_entity_id}` :
                                                            task.linked_entity_type === 'release' ? `/catalog/releases/${task.linked_entity_id}` :
                                                                task.linked_entity_type === 'track' ? `/catalog/tracks/${task.linked_entity_id}` :
                                                                    task.linked_entity_type === 'work' ? `/catalog/works/${task.linked_entity_id}` :
                                                                        task.linked_entity_type === 'contract' ? `/admin-of-works/contracts/${task.linked_entity_id}` :
                                                                            '#'
                                                    }
                                                    className="text-primary hover:underline"
                                                >
                                                    {task.linked_entity_type}: {task.linked_entity_id}
                                                </Link>
                                            ) : 'None'}
                                        </td>
                                        <td className="actions-cell" style={{ width: '140px' }}>
                                            <button className="btn-icon edit" onClick={() => openEdit(task)} title="Edit">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 20h9"></path>
                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                                                </svg>
                                            </button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(task)} title="Delete">
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
                title={selectedTask ? 'Edit Task' : 'Create Task'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="task-title">Title</label>
                    <input
                        id="task-title"
                        type="text"
                        value={formData.title}
                        onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="task-description">Description</label>
                    <textarea
                        id="task-description"
                        rows="3"
                        value={formData.description}
                        onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="task-status">Status</label>
                    <select
                        id="task-status"
                        value={formData.status}
                        onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                    >
                        {STATUS_COLUMNS.map((col) => (
                            <option key={col.key} value={col.key}>{col.label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="task-priority">Priority</label>
                    <select
                        id="task-priority"
                        value={formData.priority}
                        onChange={(event) => setFormData({ ...formData, priority: event.target.value })}
                    >
                        {PRIORITIES.map((priority) => (
                            <option key={priority} value={priority}>{priority}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="task-due">Due Date</label>
                    <input
                        id="task-due"
                        type="date"
                        value={formData.due_date}
                        onChange={(event) => setFormData({ ...formData, due_date: event.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="task-assignee">Assign to</label>
                    <select
                        id="task-assignee"
                        value={formData.assigned_to_user_id}
                        onChange={(event) => setFormData({ ...formData, assigned_to_user_id: event.target.value })}
                    >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                        ))}
                    </select>
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
        </div>
    );
};

export default Tasks;
