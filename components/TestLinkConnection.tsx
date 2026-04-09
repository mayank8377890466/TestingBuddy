"use client";

import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, CheckCircle2, XCircle, Activity, Save } from 'lucide-react';

export default function TestLinkConnection() {
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [formData, setFormData] = useState({ provider: 'testlink', devKey: '', url: '' });

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const config = await res.json();
          if (config.testlink && config.testlink.devKey) {
             setFormData(config.testlink);
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
    if (!formData.devKey || !formData.url) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      // Mocking TestLink test endpoint for now or using existing one
      const resp = await fetch('/api/testlink/test', {
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
        body: JSON.stringify({ type: 'testlink', data: formData })
      });
      alert('TestLink connection settings saved globally.');
    } catch {
      alert('Failed to save settings.');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-4 fade-in duration-500 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800 p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <LinkIcon size={24} className="text-pink-500" /> TestLink Connection
        </h2>
        <p className="text-sm text-slate-500 mt-1">Configure your TestLink instance to automatically export test cases.</p>
      </div>

      <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
        <div className="w-1/2">
           <label className="text-xs font-medium text-slate-500">Provider</label>
           <select 
              value={formData.provider} 
              onChange={e => handleChange('provider', e.target.value)}
              className="focus:ring-2 focus:ring-pink-500 outline-none w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm transition-shadow"
           >
             <option value="testlink">TestLink</option>
           </select>
        </div>
        
        <div>
          <label className="text-xs font-medium text-slate-500">Developer Key</label>
          <input type="password" value={formData.devKey} onChange={e => handleChange('devKey', e.target.value)} placeholder="Enter 32-character DevKey" className="focus:ring-2 focus:ring-pink-500 outline-none w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm transition-shadow" />
        </div>
        
        <div>
          <label className="text-xs font-medium text-slate-500">XML-RPC URL</label>
          <input type="text" value={formData.url} onChange={e => handleChange('url', e.target.value)} placeholder="https://your-testlink.com/lib/api/xmlrpc/v1/xmlrpc.php" className="focus:ring-2 focus:ring-pink-500 outline-none w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm transition-shadow" />
        </div>

        <div className="pt-4 flex flex-row items-center gap-4">
           <button 
             onClick={handleTestConnection}
             className="w-[180px] flex justify-center items-center gap-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-all"
           >
             {status === 'loading' && <Activity size={16} className="animate-pulse text-pink-600" />}
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
              <p className="text-[11px] text-green-700 dark:text-green-500 mt-0.5">TestLink is connected.</p>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="w-full mt-4 p-3 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 animate-in fade-in zoom-in-95">
            <XCircle size={16} className="text-red-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-800 dark:text-red-400">Connection Failed</p>
              <p className="text-[11px] text-red-700 dark:text-red-500 mt-0.5">Authentication Failed. Check DevKey and XML-RPC URL.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
