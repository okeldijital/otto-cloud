import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User as UserIcon, Loader, Search, HelpCircle } from 'lucide-react';
import aiClient from '../api/aiClient';

const AI = () => {
    const [messages, setMessages] = useState([]);
    const [results, setResults] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');
        setIsLoading(true);
        setError(null);

        // Add user message to UI immediately
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            const response = await aiClient.chat(userMessage, sessionId);

            // Update session ID if new
            if (!sessionId) {
                setSessionId(response.session_id);
            }

            // Update messages with full conversation
            setMessages(response.messages);

            // Update results
            setResults(response.results || []);
        } catch (err) {
            console.error('Chat error:', err);
            setError(err.response?.data?.detail || 'Failed to send message. AI may be disabled.');
            // Remove the optimistic user message on error
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResultClick = (result) => {
        // Navigate to the appropriate detail page
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

    const getResultIcon = (type) => {
        switch (type) {
            case 'tip':
                return <HelpCircle size={20} color="#7c3aed" />;
            default:
                return <Search size={20} color="#7c3aed" />;
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
            {/* Chat Panel */}
            <div style={{
                flex: '1 1 60%',
                display: 'flex',
                flexDirection: 'column',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    color: 'white'
                }}>
                    <h1 style={{
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '1.5rem',
                        fontWeight: 700
                    }}>
                        <Bot size={28} />
                        AI Assistant
                    </h1>
                    <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                        Search your catalog and network, get insights
                    </p>
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    {messages.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: '#9ca3af'
                        }}>
                            <Bot size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Welcome to AI Assistant
                            </p>
                            <p style={{ fontSize: '0.9rem' }}>
                                Try: "find: midnight groove" or "What can you help me with?"
                            </p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                gap: '1rem',
                                alignItems: 'flex-start',
                                ...(msg.role === 'user' ? { justifyContent: 'flex-end' } : {})
                            }}
                        >
                            {msg.role === 'assistant' && (
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Bot size={20} color="white" />
                                </div>
                            )}

                            <div style={{
                                maxWidth: '70%',
                                padding: '1rem 1.25rem',
                                borderRadius: '12px',
                                ...(msg.role === 'user' ? {
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                                    color: 'white'
                                } : {
                                    background: '#f3f4f6',
                                    color: '#1f2937'
                                })
                            }}>
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                    {msg.content}
                                </div>
                            </div>

                            {msg.role === 'user' && (
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: '#e0e7ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <UserIcon size={20} color="#4f46e5" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Loader size={20} color="white" className="spin" />
                            </div>
                            <div style={{
                                padding: '1rem 1.25rem',
                                borderRadius: '12px',
                                background: '#f3f4f6',
                                color: '#6b7280'
                            }}>
                                Thinking...
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Error Display */}
                {error && (
                    <div style={{
                        padding: '1rem 1.5rem',
                        background: '#fef2f2',
                        borderTop: '1px solid #fecaca',
                        color: '#dc2626',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                {/* Input */}
                <form onSubmit={handleSendMessage} style={{
                    padding: '1.5rem',
                    borderTop: '1px solid #e5e7eb',
                    background: '#fafafa'
                }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Ask me anything or use 'find:' to search..."
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '0.875rem 1.25rem',
                                borderRadius: '12px',
                                border: '1px solid #e5e7eb',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />
                        <button
                            type="submit"
                            disabled={!inputMessage.trim() || isLoading}
                            className="btn-primary"
                            style={{
                                padding: '0.875rem 1.5rem',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: (!inputMessage.trim() || isLoading) ? 0.5 : 1
                            }}
                        >
                            <Send size={18} />
                            Send
                        </button>
                    </div>
                </form>
            </div>

            {/* Results Panel */}
            <div style={{
                flex: '1 1 40%',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '1.5rem',
                overflowY: 'auto'
            }}>
                <h2 style={{
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <Search size={24} color="#7c3aed" />
                    Results
                </h2>

                {results.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem 1rem',
                        color: '#9ca3af'
                    }}>
                        <Search size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p>Results will appear here</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {results.map((result, idx) => (
                            <div
                                key={idx}
                                onClick={() => result.type !== 'tip' && handleResultClick(result)}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    cursor: result.type !== 'tip' ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                    background: '#fafafa'
                                }}
                                onMouseEnter={(e) => {
                                    if (result.type !== 'tip') {
                                        e.currentTarget.style.borderColor = '#7c3aed';
                                        e.currentTarget.style.background = '#f5f3ff';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                    e.currentTarget.style.background = '#fafafa';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {getResultIcon(result.type)}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                            {result.label}
                                        </div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: '#6b7280',
                                            textTransform: 'capitalize'
                                        }}>
                                            {result.type.replace('_', ' ')}
                                        </div>
                                        {result.metadata?.description && (
                                            <div style={{
                                                fontSize: '0.85rem',
                                                color: '#6b7280',
                                                marginTop: '0.5rem',
                                                lineHeight: '1.4'
                                            }}>
                                                {result.metadata.description}
                                            </div>
                                        )}
                                        {result.metadata?.example && (
                                            <div style={{
                                                fontSize: '0.8rem',
                                                color: '#7c3aed',
                                                marginTop: '0.25rem',
                                                fontStyle: 'italic'
                                            }}>
                                                Example: {result.metadata.example}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AI;
