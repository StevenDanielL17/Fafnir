import { useState, useRef, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * ChatInterface — Primary UI for Fafnir.
 * 
 * User types plain English → backend parses & executes.
 * This component only handles UI. All logic lives in backend services.
 */
export default function ChatInterface({ token, onNewRule }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm Fafnir, your AI savings agent. Tell me your financial goal in plain English and I'll handle the rest.\n\nTry: \"Save $5 whenever I spend on food, max $30 per month\"",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Detect intent: is this a goal, a question, or a command?
      const intent = detectIntent(userMessage);

      let reply = '';

      if (intent === 'goal') {
        // Create a new saving rule
        const res = await fetch(`${API_URL}/api/goals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ goalText: userMessage }),
        });

        const data = await res.json();
        if (res.ok) {
          reply = data.message;
          if (onNewRule) onNewRule(data.rule);
        } else {
          reply = `Sorry, I couldn't process that: ${data.error}`;
        }
      } else if (intent === 'status') {
        // Check savings status
        const res = await fetch(`${API_URL}/api/history/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          const s = data.summary;
          reply = `Here's your savings summary:\n\n• Total saved: $${s.totalSaved.toFixed(2)}\n• This month: $${s.savedThisMonth.toFixed(2)}\n• Recent actions: ${s.recentActions.length}`;
        } else {
          reply = "I couldn't fetch your savings data right now.";
        }
      } else if (intent === 'list_rules') {
        const res = await fetch(`${API_URL}/api/goals`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.rules.length > 0) {
          reply = 'Your active rules:\n\n' + data.rules.map((r, i) =>
            `${i + 1}. ${r.description} — $${r.amount} per trigger (${r.isActive ? '✅ Active' : '⏸ Paused'})`
          ).join('\n');
        } else {
          reply = "You don't have any rules yet. Tell me your savings goal!";
        }
      } else if (intent === 'trigger') {
        // Manually trigger agent cycle (demo)
        const res = await fetch(`${API_URL}/api/history/trigger`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        reply = res.ok
          ? "Done! I just ran the agent cycle. Check your history to see what happened."
          : "Couldn't trigger the agent right now.";
      } else {
        // General chat — for now, provide helpful guidance
        reply = "I understand you said: \"" + userMessage + "\"\n\nI can help you with:\n• Setting savings goals (\"Save $5 on food\")\n• Checking your status (\"How much have I saved?\")\n• Viewing your rules (\"Show my rules\")\n• Running the agent now (\"Run agent\")";
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Something went wrong: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-lg rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-fafnir-blue text-white'
                  : 'bg-fafnir-card border border-fafnir-border text-fafnir-text'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="text-fafnir-gold text-xs font-semibold mb-1">🐉 Fafnir</div>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-fafnir-card border border-fafnir-border rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <span className="typing-dot w-2 h-2 bg-fafnir-gold rounded-full inline-block"></span>
                <span className="typing-dot w-2 h-2 bg-fafnir-gold rounded-full inline-block"></span>
                <span className="typing-dot w-2 h-2 bg-fafnir-gold rounded-full inline-block"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-fafnir-border p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me your savings goal..."
            disabled={loading}
            className="flex-1 bg-fafnir-card border border-fafnir-border rounded-lg px-4 py-3 text-fafnir-text placeholder-fafnir-muted focus:outline-none focus:border-fafnir-gold transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-fafnir-gold text-fafnir-darker font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Simple client-side intent detection.
 * Week 2: Replace with LLM-powered intent detection on the backend.
 */
function detectIntent(text) {
  const lower = text.toLowerCase();

  // Status queries
  if (
    lower.includes('how much') ||
    lower.includes('status') ||
    lower.includes('summary') ||
    lower.includes('what did you do') ||
    lower.includes('my savings')
  ) {
    return 'status';
  }

  // List rules
  if (
    lower.includes('show my rules') ||
    lower.includes('my rules') ||
    lower.includes('list rules') ||
    lower.includes('active rules')
  ) {
    return 'list_rules';
  }

  // Manual trigger
  if (
    lower.includes('run agent') ||
    lower.includes('trigger') ||
    lower.includes('execute now') ||
    lower.includes('run now')
  ) {
    return 'trigger';
  }

  // Goal setting (contains saving-related keywords)
  if (
    lower.includes('save') ||
    lower.includes('put away') ||
    lower.includes('set aside') ||
    lower.includes('move') ||
    lower.includes('whenever') ||
    lower.includes('every time') ||
    lower.match(/\$\d+/)
  ) {
    return 'goal';
  }

  return 'unknown';
}
