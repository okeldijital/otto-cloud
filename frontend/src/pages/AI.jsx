import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Send, Bot, User as UserIcon, Loader, Search,
    HelpCircle, FileText, Upload, CheckCircle, AlertTriangle,
    ArrowRight, MapPin, Calendar, Users, Percent
} from 'lucide-react';
import aiClient from '../api/aiClient';

const AI = () => {
    const [activeTab, setActiveTab] = useState('chat');
    const [messages, setMessages] = useState([]);
    const [chatResults, setChatResults] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [selectedFile, setSelectedFile] = useState(null);
    const [extraction, setExtraction] = useState(null);
    const [proposals, setProposals] = useState(null);
    const [isResolving, setIsResolving] = useState(false);

    const [suggestions, setSuggestions] = useState(null);
    const [isSuggesting, setIsSuggesting] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (activeTab === 'chat') {
            scrollToBottom();
        }
    }, [messages, activeTab]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');
        setIsLoading(true);
        setError(null);

        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            const response = await aiClient.chat(userMessage, sessionId);
            if (!sessionId) setSessionId(response.session_id);
            setMessages(response.messages);
            setChatResults(response.results || []);
        } catch (err) {
            console.error('Chat error:', err);
            setError(err.response?.data?.detail || 'Failed to send message. AI may be disabled.');
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            setError('Please upload a valid PDF file.');
            return;
        }

        setSelectedFile(file);
        setIsLoading(true);
        setError(null);
        setExtraction(null);
        setProposals(null);
        setSuggestions(null);

        try {
            const result = await aiClient.extractContract(file);
            setExtraction(result);
        } catch (err) {
            console.error('Extraction error:', err);
            setError(err.response?.data?.detail || 'Failed to extract contract. Check if Contract Intelligence is enabled.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!extraction) return;

        setIsResolving(true);
        setError(null);
        setSuggestions(null);

        try {
            const result = await aiClient.resolveContract(extraction);
            setProposals(result);
        } catch (err) {
            console.error('Resolution error:', err);
            setError(err.response?.data?.detail || 'Failed to resolve matches.');
        } finally {
            setIsResolving(false);
        }
    };

    const handleSuggestLinks = async () => {
        if (!extraction) return;
        setIsSuggesting(true);
        setError(null);
        setProposals(null);
        setSuggestions(null);

        try {
            const result = await aiClient.linkSuggest(extraction);
            setSuggestions(result.suggestions);
        } catch (err) {
            console.error('Link Suggest error:', err);
            setError(err.response?.data?.detail || 'Failed to suggest links.');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleResultClick = (result) => {
        const routes = {
            artist: `/catalog/artists/${result.id}`,
            track: `/catalog/tracks/${result.id}`,
            work: `/catalog/works/${result.id}`,
            release: `/catalog/releases/${result.id}`,
            individual: `/network/individuals/${result.id}`,
            organization: `/network/organizations/${result.id}`
        };

        const route = routes[result.type];
        if (route) {
            navigate(route);
        }
    };

    const handleEntityClick = (type, id) => {
        const routes = {
            artist: `/catalog/artists/${id}`,
            track: `/catalog/tracks/${id}`,
            release: `/catalog/releases/${id}`,
            network: `/network/individuals/${id}`
        };
        const route = routes[type];
        if (route) navigate(route);
    };

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6 p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Main Panel */}
            <div className="flex-[3] flex flex-col bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden shadow-glass backdrop-blur-xl">
                {/* Header with Tabs */}
                <div className="p-1 px-1 bg-white/[0.02] border-b border-white/5">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 text-sm font-bold uppercase tracking-widest transition-all ${
                                activeTab === 'chat' 
                                ? 'text-accent bg-accent/5' 
                                : 'text-text-secondary hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Bot size={18} /> Chat Assistant
                        </button>
                        <button
                            onClick={() => setActiveTab('contract')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 text-sm font-bold uppercase tracking-widest transition-all ${
                                activeTab === 'contract' 
                                ? 'text-accent bg-accent/5' 
                                : 'text-text-secondary hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <FileText size={18} /> Contract Intelligence
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'chat' ? (
                        <div className="flex flex-col gap-6">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 border border-accent/20">
                                        <Bot size={40} className="text-accent" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-2">Neural Link Active</h2>
                                    <p className="text-text-secondary text-sm max-w-sm">
                                        Ask me to search the catalog, analyze metadata, or provide industry insights.
                                    </p>
                                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                                        {['"find: midnight groove"', '"latest releases"', '"active contracts"'].map((hint) => (
                                            <span key={hint} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-text-secondary font-bold hover:border-accent/30 cursor-pointer transition-all">
                                                {hint}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-4 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                                        msg.role === 'assistant' 
                                        ? 'bg-accent/10 border-accent/20 text-accent' 
                                        : 'bg-primary/20 border-primary/20 text-primary'
                                    }`}>
                                        {msg.role === 'assistant' ? <Bot size={18} /> : <UserIcon size={18} />}
                                    </div>
                                    <div className={`max-w-[80%] px-5 py-4 rounded-[20px] shadow-sm text-sm leading-relaxed ${
                                        msg.role === 'user' 
                                        ? 'bg-primary/80 text-white rounded-tr-none' 
                                        : 'bg-white/[0.03] text-white border border-white/5 rounded-tl-none backdrop-blur-md'
                                    }`}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-4 items-start animate-pulse">
                                    <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                                        <Bot size={18} className="text-accent" />
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    ) : (
                        <div className="h-full">
                            {!extraction && (
                                <div className="h-full flex flex-col items-center justify-center">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full max-w-lg p-12 border-2 border-dashed border-white/10 rounded-[32px] bg-white/[0.02] hover:bg-white/[0.05] hover:border-accent/40 transition-all cursor-pointer group text-center"
                                    >
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform border border-white/10 group-hover:border-accent/20">
                                            <Upload size={32} className="text-text-secondary group-hover:text-accent" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">Initialize Extraction</h3>
                                        <p className="text-text-secondary text-sm mb-8">Upload a PDF contract to begin metadata parsing</p>
                                        <button className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white hover:bg-white/10 transition-colors uppercase tracking-widest">
                                            Select PDF File
                                        </button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
                                    </div>
                                </div>
                            )}

                            {extraction && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <CheckCircle size={16} className="text-success" />
                                            Extracted Records
                                        </h3>
                                        <button onClick={() => setExtraction(null)} className="text-[10px] font-black text-text-secondary hover:text-white uppercase tracking-widest transition-colors">Reset Session</button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Title', value: extraction.contract_title || 'N/A', icon: FileText },
                                            { label: 'Effective Date', value: extraction.effective_date || 'N/A', icon: Calendar },
                                            { label: 'Territory', value: extraction.territory || 'Universal', icon: MapPin },
                                            { label: 'Confidence', value: `${(extraction.raw_confidence * 100).toFixed(0)}%`, icon: Bot, highlight: true }
                                        ].map((item, i) => (
                                            <div key={i} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">
                                                    <item.icon size={12} className={item.highlight ? 'text-accent' : ''} />
                                                    {item.label}
                                                </div>
                                                <div className={`text-sm font-bold truncate ${item.highlight ? 'text-accent' : 'text-white'}`}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {extraction.warnings?.length > 0 && (
                                        <div className="p-4 bg-warning/10 border border-warning/20 rounded-2xl flex gap-3 text-warning">
                                            <AlertTriangle size={18} className="shrink-0" />
                                            <div className="text-xs font-bold leading-relaxed">{extraction.warnings[0]}</div>
                                        </div>
                                    )}

                                    {!proposals && !suggestions && (
                                        <div className="flex gap-4">
                                            <button
                                                onClick={handleResolve}
                                                disabled={isResolving || isSuggesting}
                                                className="flex-1 flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                                            >
                                                {isResolving ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
                                                Deep Resolution
                                            </button>
                                            <button
                                                onClick={handleSuggestLinks}
                                                disabled={isResolving || isSuggesting}
                                                className="flex-1 flex items-center justify-center gap-2 p-4 bg-accent text-[#0f1115] rounded-2xl text-xs font-black hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-accent/10"
                                            >
                                                {isSuggesting ? <Loader size={16} className="animate-spin" /> : <Bot size={16} />}
                                                AI Synthesis (V2)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {activeTab === 'chat' && (
                    <div className="p-6 pt-0">
                        <form onSubmit={handleSendMessage} className="relative group">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Command AI assistant..."
                                disabled={isLoading}
                                className="w-full bg-white/5 border border-white/10 rounded-[20px] pl-6 pr-14 py-5 text-white text-sm outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-text-secondary/30"
                            />
                            <button 
                                type="submit" 
                                disabled={!inputMessage.trim() || isLoading}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-accent text-[#0f1115] rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-90 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                <Send size={18} strokeWidth={3} />
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Results/Proposals Panel */}
            <div className="flex-[2] flex flex-col bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden shadow-glass backdrop-blur-xl animate-in slide-in-from-right-4 duration-500">
                <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <Search size={18} className="text-accent" />
                        Live Analysis
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'chat' ? (
                        <div className="space-y-4">
                            {chatResults.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
                                    <Search size={48} className="mb-4 text-text-secondary" />
                                    <p className="text-xs font-black uppercase tracking-widest text-text-secondary">No current context</p>
                                </div>
                            ) : (
                                chatResults.map((res, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => handleResultClick(res)} 
                                        className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.08] hover:border-accent/30 cursor-pointer transition-all group"
                                    >
                                        <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 group-hover:text-accent transition-colors">{res.type}</div>
                                        <div className="text-sm font-bold text-white flex items-center justify-between">
                                            {res.label}
                                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {!proposals && !suggestions ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 opacity-30">
                                        <AlertTriangle size={32} className="text-text-secondary" />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest text-text-secondary opacity-50">Awaiting Extraction</p>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    {suggestions && (
                                        <>
                                            {(suggestions.parties?.length > 0 || suggestions.artists?.length > 0) && (
                                                <section>
                                                    <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4 border-l-2 border-accent pl-3">Parties & Entities</h4>
                                                    <div className="space-y-3">
                                                        {suggestions.parties?.map((p, i) => (
                                                            <div key={`p-${i}`} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="text-sm font-bold text-white">{p.display_name}</div>
                                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                                                                        p.confidence > 0.8 ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                                                                    }`}>
                                                                        {(p.confidence * 100).toFixed(0)}% MATCH
                                                                    </span>
                                                                </div>
                                                                <div className="text-[10px] font-bold text-text-secondary italic uppercase tracking-tighter opacity-60">
                                                                    {p.rationale}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {suggestions.artists?.map((a, i) => (
                                                            <div key={`a-${i}`} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="text-sm font-bold text-white">{a.display_name}</div>
                                                                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-success/20 text-success">
                                                                        {(a.confidence * 100).toFixed(0)}% MATCH
                                                                    </span>
                                                                </div>
                                                                <div className="text-[10px] font-bold text-text-secondary italic uppercase tracking-tighter opacity-60">
                                                                    {a.rationale} • Artist Record
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}

                                            {(suggestions.tracks?.length > 0 || suggestions.works?.length > 0) && (
                                                <section>
                                                    <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4 border-l-2 border-accent pl-3">Linked Assets</h4>
                                                    <div className="space-y-3">
                                                        {suggestions.tracks?.map((t, i) => (
                                                            <div key={`t-${i}`} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="text-sm font-bold text-white">{t.display_name}</div>
                                                                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-success/20 text-success">
                                                                        {(t.confidence * 100).toFixed(0)}% MATCH
                                                                    </span>
                                                                </div>
                                                                <div className="text-[10px] font-bold text-text-secondary italic uppercase tracking-tighter opacity-60">
                                                                    {t.rationale} • Track Meta
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}
                                        </>
                                    )}

                                    {proposals && (
                                        <div className="space-y-8">
                                            {proposals.proposed_network_entity_ids.length > 0 && (
                                                <section>
                                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 border-l-2 border-white/20 pl-3">Legacy Matches</h4>
                                                    <div className="space-y-3">
                                                        {proposals.proposed_network_entity_ids.map((p, i) => (
                                                            <div key={i} onClick={() => handleEntityClick('network', p.entity_id)} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] cursor-pointer transition-all group">
                                                                <div className="flex justify-between items-start mb-1 text-sm font-bold text-white group-hover:text-accent">
                                                                    {p.label} <span className="text-success text-[10px]">{(p.confidence * 100).toFixed(0)}%</span>
                                                                </div>
                                                                <div className="text-[10px] text-text-secondary font-medium">{p.reason}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }`}</style>
        </div>
    );
};

export default AI;
