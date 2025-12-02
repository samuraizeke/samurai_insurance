// frontend/components/ChatWidget.tsx
'use client';

import { useAgentChat } from '../hooks/useAgentChat';
import { useState, useRef, useEffect } from 'react';

export default function ChatWidget() {
    const { messages, isLoading, error, sendMessage } = useAgentChat();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-[500px] w-full max-w-md border rounded-xl shadow-lg bg-white overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white font-semibold">
                Samurai Agent 🥷
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                    <p className="text-center text-gray-400 mt-10">
                        Ask me about your insurance policy...
                    </p>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border text-gray-800 shadow-sm'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-500 rounded-lg p-3 text-xs animate-pulse">
                            Thinking...
                        </div>
                    </div>
                )}

                {error && <div className="text-red-500 text-xs text-center">{error}</div>}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t bg-white flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    Send
                </button>
            </form>
        </div>
    );
}