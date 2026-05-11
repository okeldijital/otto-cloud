import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ShieldCheck,
    RefreshCcw,
    AlertTriangle,
    Info,
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    ChevronDown,
    Search
} from 'lucide-react';
import officeStatusQuoService from '../../services/officeStatusQuoService';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import Input from '../../components/ui/Input';

import { useToastStore } from '../../store/useToastStore';

const SEVERITY_VARIANTS = {
    critical: 'critical',
    warn: 'warn',
    info: 'primary'
};

const SEVERITY_ICONS = {
    critical: AlertCircle,
    warn: AlertTriangle,
    info: Info
};

const StatusQuo = () => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRecomputing, setIsRecomputing] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const { addToast } = useToastStore();

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const res = await officeStatusQuoService.list();
            setItems(res.data);
        } catch (error) {
            console.error('Failed to fetch status quo items', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleRecompute = async () => {
        setIsRecomputing(true);
        try {
            const res = await officeStatusQuoService.recompute();
            addToast(`Recompute complete. Found ${res.data.items_found} governance gaps.`, 'success');
            await fetchItems();
        } catch (error) {
            console.error('Recompute failed', error);
            alert('Recompute failed');
        } finally {
            setIsRecomputing(false);
        }
    };

    const handleResolve = async (id) => {
        const note = prompt('Resolution note (optional):');
        try {
            await officeStatusQuoService.resolve(id, note);
            await fetchItems();
        } catch (error) {
            console.error('Resolve failed', error);
            alert('Resolve failed');
        }
    };

    const filteredItems = items.filter(item => {
        if (filter !== 'all' && item.severity !== filter) return false;
        if (search && !item.summary.toLowerCase().includes(search.toLowerCase()) && !item.issue_type.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="page-container p-8">
            <PageHeader
                title="Office — Status Quo"
                subtitle="Consensus-driven governance and compliance monitoring."
                actions={
                    <div className="flex gap-2">
                        <Link to="/admin-of-works/status-quo">
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                                <ExternalLink size={16} /> View Dashboard
                            </Button>
                        </Link>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleRecompute}
                            disabled={isRecomputing}
                            className="flex items-center gap-2"
                        >
                            <RefreshCcw size={16} className={isRecomputing ? 'animate-spin' : ''} />
                            {isRecomputing ? 'Recomputing...' : 'Recompute Gaps'}
                        </Button>
                    </div>
                }
            />

            <Card noPadding>
                <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap bg-surface-secondary">
                    <div className="flex items-center gap-2">
                        <Button
                            variant={filter === 'all' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setFilter('all')}
                        >
                            All Gaps
                        </Button>
                        <Button
                            variant={filter === 'critical' ? 'danger' : 'ghost'}
                            size="sm"
                            onClick={() => setFilter('critical')}
                        >
                            Critical
                        </Button>
                        <Button
                            variant={filter === 'warn' ? 'orange' : 'ghost'}
                            size="sm"
                            onClick={() => setFilter('warn')}
                        >
                            Warnings
                        </Button>
                    </div>

                    <div className="relative">
                        <Input
                            placeholder="Filter by summary..."
                            className="w-64 mb-0"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            icon={Search}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-secondary-bg/50 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-medium">Severity</th>
                                <th className="px-6 py-4 font-medium">Issue</th>
                                <th className="px-6 py-4 font-medium">Entity</th>
                                <th className="px-6 py-4 font-medium">Summary</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <RefreshCcw className="animate-spin mx-auto mb-2" size={24} />
                                        Running compliance scan...
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={32} />
                                        No compliance gaps found. Status Quo is healthy.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const SeverityIcon = SEVERITY_ICONS[item.severity];
                                    return (
                                        <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <Badge variant={SEVERITY_VARIANTS[item.severity]} size="sm">
                                                    <SeverityIcon size={14} className="mr-1" />
                                                    {item.severity.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-mono text-gray-300">{item.issue_type}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-400 uppercase tracking-tighter">
                                                    {item.entity_type}
                                                    <span className="text-gray-600">#{item.entity_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-200 line-clamp-1">{item.summary}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
                                                        title="Mark as Resolved"
                                                        onClick={() => handleResolve(item.id)}
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                    <Link
                                                        to={
                                                            item.entity_type === 'artist' ? `/catalog/artists/${item.entity_id}` :
                                                                item.entity_type === 'release' ? `/catalog/releases/${item.entity_id}` :
                                                                    item.entity_type === 'track' ? `/catalog/tracks/${item.entity_id}` :
                                                                        item.entity_type === 'work' ? `/catalog/works/${item.entity_id}` :
                                                                            item.entity_type === 'contract' ? `/admin-of-works/contracts/${item.entity_id}` :
                                                                                `/catalog/${item.entity_type}s/${item.entity_id}`
                                                        }
                                                        className="p-2 text-gray-400 hover:text-primary transition-colors"
                                                        title="Open Entity"
                                                    >
                                                        <ExternalLink size={18} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default StatusQuo;
