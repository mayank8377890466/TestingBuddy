"use client";

import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, XCircle, Activity, Save } from 'lucide-react';

export default function LLMConnection() {
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [formData, setFormData] = useState({ llm: 'groq', llmKey: '' });

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const config = await res.json();
          if (config.llm && config.llm.llm) {
             setFormData(config.llm);
          }
        }
      } catch {}
    }
    loadConfig();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setStatus('idle');
  };

  const handleTestConnection = async () => {
    if (!formData.llmKey) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const resp = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (resp.ok) setStatus('success');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  const handleSave = async () => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'llm', data: formData })
      });
      alert('LLM connection settings saved globally.');
    } catch {
      alert('Failed to save settings.');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-4 fade-in duration-500 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800 p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings size={24} className="text-purple-500" /> LLM Configuration
        </h2>
        <p className="text-sm text-slate-500 mt-1">Configure your AI Provider for generating test plans and cases.</p>
      </div>

      <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
        <div className="w-1/2">
           <label className="text-xs font-medium text-slate-500">Provider</label>
           <select 
              value={formData.llm} 
              onChange={e => handleChange('llm', e.target.value)}
              className="focus:ring-2 focus:ring-purple-500 outline-none w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm transition-shadow"
           >
             <option value="groq">Groq</option>
             <option value="llama">Llama</option>
           </select>
        </div>
        
        <div>
          <label className="text-xs font-medium text-slate-500">API Key</label>
          <input type="password" value={formData.llmKey} onChange={e => handleChange('llmKey', e.target.value)} placeholder={formData.llm === 'groq' ? "gsk_..." : "http://localhost:11434"} className="focus:ring-2 focus:ring-purple-500 outline-none w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm transition-shadow" />
        </div>

        <div className="pt-4 flex flex-row items-center gap-4">
           <button 
             onClick={handleTestConnection}
             className="w-[180px] flex justify-center items-center gap-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-all"
           >
             {status === 'loading' && <Activity size={16} className="animate-pulse text-purple-600" />}
             Test Connection
           </button>
           
           <button 
             onClick={handleSave}
             className="w-[180px] flex justify-center items-center gap-1.5 text-sm font-medium bg-blue-600 text-white shadow-md hover:bg-blue-700 px-4 py-2.5 rounded-lg transition-all"
           >
             <Save size={16} /> Save Connection
           </button>
        </div>

        {status === 'success' && (
          <div className="w-full mt-4 p-3 bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2 animate-in fade-in zoom-in-95">
            <CheckCircle2 size={16} className="text-green-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-green-800 dark:text-green-400">Connection Successful</p>
              <p className="text-[11px] text-green-700 dark:text-green-500 mt-0.5">API connection verified! You can now generate plans.</p>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="w-full mt-4 p-3 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 animate-in fade-in zoom-in-95">
            <XCircle size={16} className="text-red-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-800 dark:text-red-400">Connection Failed</p>
              <p className="text-[11px] text-red-700 dark:text-red-500 mt-0.5">Failed to connect to the selected LLM provider.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
