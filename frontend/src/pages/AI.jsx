import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Send, Bot, User as UserIcon, Loader, Search,
    HelpCircle, FileText, Upload, CheckCircle, AlertTriangle,
    ArrowRight, MapPin, Calendar, Users, Percent
} from 'lucide-react';
import aiClient from '../api/aiClient';

const AI = () => {
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'contract'
    const [messages, setMessages] = useState([]);
    const [chatResults, setChatResults] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Contract Intelligence State
    const [selectedFile, setSelectedFile] = useState(null);
    const [extraction, setExtraction] = useState(null);
    const [proposals, setProposals] = useState(null);
    const [isResolving, setIsResolving] = useState(false);

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
            network: `/network/individuals/${id}` // Or organization depending on data
        };
        const route = routes[type];
        if (route) navigate(route);
    };

    const getResultIcon = (type) => {
        switch (type) {
            case 'tip': return <HelpCircle size={20} color="#7c3aed" />;
            default: return <Search size={20} color="#7c3aed" />;
        }
    };

    return (
        <div style={{
            display: 'flex',
            height: 'calc(100vh - 120px)',
            gap: '1.5rem',
            padding: '1.5rem',
            maxWidth: '1400px',
            margin: '0 auto'
        }}>
            {/* Main Panel */}
            <div style={{
                flex: '1 1 60%',
                display: 'flex',
                flexDirection: 'column',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                border: '1px solid #e5e7eb'
            }}>
                {/* Header with Tabs */}
                <div style={{
                    padding: '1rem 1.5rem 0 1.5rem',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem', fontWeight: 700 }}>
                            <Bot size={28} />
                            AI Assistant
                        </h1>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => setActiveTab('chat')}
                            style={{
                                padding: '0.75rem 1.25rem',
                                background: activeTab === 'chat' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                border: 'none',
                                color: 'white',
                                borderRadius: '8px 8px 0 0',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Send size={18} /> Chat
                        </button>
                        <button
                            onClick={() => setActiveTab('contract')}
                            style={{
                                padding: '0.75rem 1.25rem',
                                background: activeTab === 'contract' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                border: 'none',
                                color: 'white',
                                borderRadius: '8px 8px 0 0',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <FileText size={18} /> Contract Intel
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', position: 'relative' }}>
                    {activeTab === 'chat' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {messages.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
                                    <Bot size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                    <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Welcome to AI Chat</p>
                                    <p style={{ fontSize: '0.9rem' }}>Try: "find: midnight groove" or ask for tips.</p>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', ...(msg.role === 'user' ? { justifyContent: 'flex-end' } : {}) }}>
                                    {msg.role === 'assistant' && (
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Bot size={20} color="white" />
                                        </div>
                                    )}
                                    <div style={{ maxWidth: '70%', padding: '1rem 1.25rem', borderRadius: '12px', ...(msg.role === 'user' ? { background: '#4f46e5', color: 'white' } : { background: '#f3f4f6', color: '#1f2937' }) }}>
                                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{msg.content}</div>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <UserIcon size={20} color="#4f46e5" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && <Loader size={20} className="spin" style={{ margin: '1rem auto' }} />}
                            <div ref={messagesEndRef} />
                        </div>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {!extraction && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            width: '100%',
                                            maxWidth: '400px',
                                            padding: '3rem',
                                            border: '2px dashed #e5e7eb',
                                            borderRadius: '16px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                                    >
                                        <Upload size={48} color="#9ca3af" style={{ marginBottom: '1rem' }} />
                                        <h3>Upload PDF Contract</h3>
                                        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Extract metadata and find matches automatically</p>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" style={{ display: 'none' }} />
                                    </div>
                                </div>
                            )}

                            {extraction && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, color: '#1f2937' }}>Extracted Metadata</h3>
                                        <button onClick={() => setExtraction(null)} style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="meta-card" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                                <FileText size={14} /> Title
                                            </div>
                                            <div style={{ fontWeight: 600 }}>{extraction.contract_title || 'Unknown'}</div>
                                        </div>
                                        <div className="meta-card" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                                <Calendar size={14} /> Effective Date
                                            </div>
                                            <div style={{ fontWeight: 600 }}>{extraction.effective_date || 'N/A'}</div>
                                        </div>
                                        <div className="meta-card" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                                <MapPin size={14} /> Territory
                                            </div>
                                            <div style={{ fontWeight: 600 }}>{extraction.territory || 'N/A'}</div>
                                        </div>
                                        <div className="meta-card" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                                <Bot size={14} /> Confidence
                                            </div>
                                            <div style={{ fontWeight: 600 }}>{(extraction.raw_confidence * 100).toFixed(0)}%</div>
                                        </div>
                                    </div>

                                    {extraction.warnings?.length > 0 && (
                                        <div style={{ padding: '0.75rem 1rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', color: '#92400e', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                                            <AlertTriangle size={16} />
                                            <div>{extraction.warnings[0]}</div>
                                        </div>
                                    )}

                                    {!proposals && (
                                        <button
                                            onClick={handleResolve}
                                            disabled={isResolving}
                                            className="btn-primary"
                                            style={{ padding: '1rem', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                        >
                                            {isResolving ? <Loader size={18} className="spin" /> : <Search size={18} />}
                                            Resolve Entities in Catalog & Network
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {activeTab === 'chat' && (
                    <form onSubmit={handleSendMessage} style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', background: '#fafafa' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Ask about metadata, search catalog..."
                                disabled={isLoading}
                                style={{ flex: 1, padding: '0.875rem 1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none' }}
                            />
                            <button type="submit" disabled={!inputMessage.trim() || isLoading} className="btn-primary" style={{ padding: '0.875rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Send size={18} /> Send
                            </button>
                        </div>
                    </form>
                )}

                {error && <div style={{ padding: '1rem 1.5rem', background: '#fef2f2', borderTop: '1px solid #fecaca', color: '#dc2626', fontSize: '0.9rem' }}>{error}</div>}
            </div>

            {/* Results/Proposals Panel */}
            <div style={{
                flex: '1 1 40%',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '1.5rem',
                overflowY: 'auto',
                border: '1px solid #e5e7eb'
            }}>
                {activeTab === 'chat' ? (
                    <>
                        <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Search size={24} color="#7c3aed" /> Search Results
                        </h2>
                        {chatResults.map((res, i) => (
                            <div key={i} onClick={() => handleResultClick(res)} style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '0.75rem', cursor: 'pointer', background: '#f9fafb' }}>
                                <div style={{ fontWeight: 600 }}>{res.label}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{res.type}</div>
                            </div>
                        ))}
                    </>
                ) : (
                    <>
                        <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <CheckCircle size={24} color="#7c3aed" /> Resolved Proposals
                        </h2>
                        {!proposals ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
                                <AlertTriangle size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p>Extract a contract and click "Resolve" to see match proposals.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {proposals.proposed_network_entity_ids.length > 0 && (
                                    <section>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}><Users size={16} /> Parties</h4>
                                        {proposals.proposed_network_entity_ids.map((p, i) => (
                                            <div key={i} onClick={() => handleEntityClick('network', p.entity_id)} style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '0.5rem', cursor: 'pointer' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                                    {p.label} <span style={{ color: '#059669', fontSize: '0.8rem' }}>{(p.confidence * 100).toFixed(0)}% Match</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.reason}</div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {proposals.proposed_artist_ids.length > 0 && (
                                    <section>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}><UserIcon size={16} /> Artists</h4>
                                        {proposals.proposed_artist_ids.map((p, i) => (
                                            <div key={i} onClick={() => handleEntityClick('artist', p.entity_id)} style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '0.5rem', cursor: 'pointer' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                                    {p.label} <span style={{ color: '#059669', fontSize: '0.8rem' }}>{(p.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}

                                {extraction.splits.length > 0 && (
                                    <section>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}><Percent size={16} /> Extracted Splits</h4>
                                        {extraction.splits.map((s, i) => (
                                            <div key={i} style={{ padding: '0.75rem', border: '1px solid #fee2e2', borderRadius: '8px', marginBottom: '0.5rem', background: '#fff1f1' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                                    {s.party_name} <span style={{ color: '#dc2626' }}>{s.percent}%</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>{s.split_type} - {s.party_role || 'No Role'}</div>
                                            </div>
                                        ))}
                                    </section>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AI;
