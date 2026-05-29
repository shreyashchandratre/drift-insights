import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Loader2, Send } from 'lucide-react';
import * as api from '../api';

export default function ChatWidget({ currentPhase }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything about the ML pipeline.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.sendChatMessage({ message: userMessage.content, phase: currentPhase });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}. Please check your API key and backend connection.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-72 h-80 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-slate-200 flex flex-col z-50 overflow-hidden text-sm">
      {/* Header */}
      <div className="bg-[#0F172A] text-white px-3 py-2 flex items-center gap-2 shadow-sm">
        <Bot className="text-[#6C63FF]" size={16} />
        <div>
          <h3 className="font-semibold text-xs leading-none">Cerebras AI</h3>
          <p className="text-[9px] text-slate-300 mt-0.5">Llama 3.1 8B</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 text-xs">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#0D9488] text-white' : 'bg-white border border-slate-200 text-[#6C63FF]'}`}>
              {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
            </div>
            <div className={`px-3 py-2 rounded-xl max-w-[85%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#0D9488] text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-white border border-slate-200 text-[#6C63FF] flex items-center justify-center shrink-0">
              <Bot size={12} />
            </div>
            <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 rounded-tl-sm shadow-sm flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-[#6C63FF]" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask AI..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#6C63FF] focus:border-[#6C63FF] min-w-0"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-full bg-[#6C63FF] text-white flex items-center justify-center hover:bg-[#5B54E6] disabled:opacity-50 disabled:hover:bg-[#6C63FF] transition-colors shrink-0"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
