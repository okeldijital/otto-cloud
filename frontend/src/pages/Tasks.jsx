import React, { useState, useEffect } from 'react';
import { TasksService } from '../services/operations';
import EntityForm from '../components/EntityForm';

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const initialFormState = {
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        due_date: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const data = await TasksService.getAll();
            setTasks(data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleCreate = () => {
        setEditingTask(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleEdit = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title || '',
            description: task.description || '',
            status: task.status || 'todo',
            priority: task.priority || 'medium',
            due_date: task.due_date ? task.due_date.slice(0, 16) : ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (task_id) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            // Optimistic update
            const previousTasks = [...tasks];
            setTasks(tasks.filter(t => t.id !== task_id));

            try {
                await TasksService.delete(task_id);
            } catch (error) {
                console.error('Failed to delete task:', error);
                alert('Failed to delete task');
                setTasks(previousTasks); // Revert on error
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const submitData = { ...formData };
        if (!submitData.due_date) submitData.due_date = null;

        try {
            if (editingTask) {
                await TasksService.update(editingTask.id, submitData);
            } else {
                await TasksService.create(submitData);
            }
            setIsModalOpen(false);
            fetchTasks();
        } catch (error) {
            console.error('Failed to save task:', error);
            alert('Failed to save task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateTaskStatus = async (task, newStatus) => {
        try {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
            await TasksService.update(task.id, { status: newStatus });
        } catch (error) {
            console.error('Failed to update status:', error);
            fetchTasks(); // Revert on error
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return '#94a3b8';
        }
    };

    const KanbanColumn = ({ title, status, tasks }) => (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                {title}
                <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{tasks.length}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tasks.map(task => (
                    <div
                        key={task.id}
                        style={{
                            background: 'white',
                            padding: '1rem',
                            borderRadius: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }} onClick={() => handleEdit(task)}>{task.title}</h4>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {/* Simplified Move Icons */}
                                {status !== 'todo' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateTaskStatus(task, status === 'done' ? 'in_progress' : 'todo'); }}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                        title="Move Back"
                                    >←</button>
                                )}
                                {status !== 'done' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateTaskStatus(task, status === 'todo' ? 'in_progress' : 'done'); }}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                        title="Move Forward"
                                    >→</button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                                    title="Delete"
                                >×</button>
                            </div>
                        </div>
                        {task.description && <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#64748b' }}>{task.description}</p>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                            <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
                            <span style={{ textTransform: 'capitalize' }}>{task.priority}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Tasks</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    + Add Task
                </button>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                <KanbanColumn title="To Do" status="todo" tasks={tasks.filter(t => t.status === 'todo')} />
                <KanbanColumn title="In Progress" status="in_progress" tasks={tasks.filter(t => t.status === 'in_progress')} />
                <KanbanColumn title="Done" status="done" tasks={tasks.filter(t => t.status === 'done')} />
            </div>

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingTask ? 'Edit Task' : 'New Task'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="title">Task Title</label>
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
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        rows="3"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>
                <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="status">Status</label>
                        <select
                            id="status"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="priority">Priority</label>
                        <select
                            id="priority"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="due_date">Due Date</label>
                    <input
                        type="datetime-local"
                        id="due_date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                </div>
            </EntityForm>
        </div>
    );
};

export default Tasks;
