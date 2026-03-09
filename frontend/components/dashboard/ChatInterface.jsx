'use client';

import { useState, useRef, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DEMO_MESSAGES = [
  { role: 'user', content: 'Save $5 whenever I eat out, max $30 a month' },
  {
    role: 'assistant',
    content:
      "Rule created ✓ I'll save $5 each time a food transaction is detected. Monthly limit: $30. Currently saved this month: $23.00",
  },
  { role: 'user', content: 'How much have I saved this week?' },
  {
    role: 'assistant',
    content:
      "This week: $15.00 across 3 saves. You're on track. At this rate you'll hit your monthly cap in 4 days.",
  },
];

export default function ChatInterface({ token, onNewRule }) {
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMsg.content }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || data.message || "I'm here to help with your savings goals.",
        },
      ]);

      if (data.rule && onNewRule) {
        onNewRule(data.rule);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Connection issue. I'm still watching your rules.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="liquid-glass p-4 h-full flex flex-col min-h-[400px] relative">
      <div className="relative z-10 flex flex-col h-full">
        <div className="text-sm text-fafnir-muted mb-3">Chat with Fafnir</div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto chat-scroll space-y-3 mb-4 pr-1"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-fafnir-green/20 text-fafnir-text rounded-2xl rounded-br-md'
                    : 'liquid-glass rounded-2xl rounded-bl-md text-fafnir-text relative z-10'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="liquid-glass px-4 py-3 rounded-2xl rounded-bl-md text-sm text-fafnir-muted relative z-10">
                <span className="inline-flex gap-1">
                  <span
                    className="w-1.5 h-1.5 bg-fafnir-muted rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-fafnir-muted rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-fafnir-muted rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Fafnir anything about your money..."
            className="flex-1 bg-fafnir-black/50 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-fafnir-text placeholder-fafnir-muted focus:outline-none focus:border-fafnir-green/40 transition-colors"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-fafnir-green text-fafnir-black font-medium px-5 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(0,200,150,0.3)] transition-all disabled:opacity-40 disabled:hover:shadow-none"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
