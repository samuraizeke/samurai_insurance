// frontend/hooks/useAgentChat.ts
import { useState } from 'react';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

export function useAgentChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = async (userText: string) => {
        if (!userText.trim()) return;

        // 1. Add User Message immediately
        const newUserMsg: Message = { role: 'user', content: userText };
        setMessages((prev) => [...prev, newUserMsg]);
        setIsLoading(true);
        setError(null);

        try {
            // 2. Call the Backend (Proxied via Next.js rewrites)
            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    history: messages, // Send context if needed
                }),
            });

            if (!res.ok) throw new Error('Failed to reach agent');

            const data = await res.json();

            // 3. Add Agent Response
            const newAgentMsg: Message = { role: 'assistant', content: data.response };
            setMessages((prev) => [...prev, newAgentMsg]);
        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return { messages, isLoading, error, sendMessage };
}