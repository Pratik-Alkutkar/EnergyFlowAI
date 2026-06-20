'use client';

import { useState, useRef, useEffect } from 'react';
import { askCopilot, type CopilotResponse } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Bot, User, Send, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role:   'user' | 'assistant';
  text:   string;
  source?: string;
}

const SUGGESTIONS = [
  'What is the current battery status?',
  'How much have we saved today?',
  'Is the ERCOT price high right now?',
  'What is our solar generation?',
  'Are there any price anomalies?',
  'Should I charge or discharge the battery?',
];

export default function CopilotPage() {
  const [messages,  setMessages]  = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hi! I\'m EnergyFlow AI Copilot. I can answer questions about your energy system — battery status, ERCOT prices, solar generation, savings, and more. What would you like to know?',
      source: 'system',
    },
  ]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const res: CopilotResponse = await askCopilot(q);
      setMessages((prev) => [...prev, { role: 'assistant', text: res.answer, source: res.source }]);
    } catch (e: unknown) {
      setMessages((prev) => [...prev, {
        role:   'assistant',
        text:   `Error: ${e instanceof Error ? e.message : String(e)}. Make sure the backend is running and data has been seeded.`,
        source: 'error',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-screen flex flex-col">
      <PageHeader
        title="AI Copilot"
        subtitle="Natural-language energy intelligence · GPT-4o-mini or rule-based"
      />

      {/* Chat window */}
      <div className="flex-1 overflow-hidden flex flex-col card min-h-0">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3',
                m.role === 'user' ? 'flex-row-reverse' : '',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                m.role === 'user'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-green-500/20 text-green-400',
              )}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={cn(
                'max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-blue-600/20 text-blue-100 border border-blue-500/20'
                  : 'bg-gray-800 text-gray-200 border border-gray-700',
              )}>
                {m.text}
                {m.source && m.source !== 'system' && m.source !== 'error' && (
                  <span className="block text-xs text-gray-600 mt-1 font-mono">via {m.source}</span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <div
                      key={d}
                      className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${d * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length < 3 && (
          <div className="pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-600 mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors border border-gray-700 flex items-center gap-1.5"
                >
                  <Zap className="w-3 h-3 text-green-500" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="pt-4 border-t border-gray-800 mt-4">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about your energy system…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="px-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-700 mt-2">
            Set OPENAI_API_KEY in backend .env for GPT-4o-mini. Without it, a rule-based engine answers from live DB data.
          </p>
        </div>
      </div>
    </div>
  );
}
