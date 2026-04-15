"use client";

import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, XCircle, Activity, Save, Edit3 } from 'lucide-react';
import { getConfig, saveConfig } from '../tools/configStore';

const MODEL_PRESETS: Record<string, string[]> = {
  groq: [
    'llama-3.3-70b-versatile',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'llama-3.2-3b-preview',
    'llama-3.1-405b-reasoning'
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'o1-preview',
    'o1-mini'
  ],
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'qwen/qwen3-coder:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'openai/gpt-oss-120b:free',
    'openai/gpt-oss-20b:free',
    'z-ai/glm-4.5-air:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'arcee-ai/trinity-large-preview:free',
    'nvidia/nemotron-nano-12b-v2-vl:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'liquid/lfm-2.5-1.2b-thinking:free',
    'liquid/lfm-2.5-1.2b-instruct:free',
    'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    'google/gemma-3-4b-it:free',
    'google/gemma-3-12b-it:free',
    'google/gemma-3n-e2b-it:free',
    'google/gemma-3n-e4b-it:free',
    'minimax/minimax-m2.5:free',
    'openrouter/free',
    'google/lyria-3-pro-preview',
    'google/lyria-3-clip-preview',
    'openrouter/elephant-alpha'
  ],
  llama: [
    'gemma3:1b',
    'llama3',
    'mistral',
    'gemma2',
    'phi3',
    'codellama'
  ]
};

export default function LLMConnection() {
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState<{
    llm: string;
    llmKey: string;
    model: string;
  }>({ 
    llm: 'groq', 
    llmKey: '',
    model: 'llama-3.3-70b-versatile'
  });

  useEffect(() => {
    const config = getConfig();
    if (config.llm && config.llm.llm) {
      const savedLlm = config.llm.llm;
      const savedModel = config.llm.model || (MODEL_PRESETS[savedLlm]?.[0] || '');
      setFormData({
        ...config.llm,
        model: savedModel
      });
      // Check if current model is in presets
      if (savedModel && MODEL_PRESETS[savedLlm] && !MODEL_PRESETS[savedLlm].includes(savedModel)) {
        setIsCustomModel(true);
      }
    }
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setStatus('idle');
  };

  const handleTestConnection = async () => {
    setErrorMessage('');
    if (!formData.llmKey) {
      setStatus('error');
      setErrorMessage(formData.llm === 'llama' ? 'Ollama URL is required' : 'API Key is required');
      return;
    }
    setStatus('loading');
    try {
      const resp = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Connection failed');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Network error');
    }
  };

  const handleSave = () => {
    try {
      saveConfig('llm', formData);
      alert('LLM connection settings saved.');
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
        <div className="grid grid-cols-2 gap-4">
          <div>
             <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Provider</label>
             <select 
                value={formData.llm} 
                onChange={e => {
                  const val = e.target.value;
                  const presets = MODEL_PRESETS[val] || [];
                  const defaultModel = presets[0] || '';
                  
                  setFormData(prev => ({ 
                    ...prev, 
                    llm: val, 
                    model: defaultModel,
                    // If switching to Ollama and URL is empty, set default
                    llmKey: (val === 'llama' && !prev.llmKey) ? 'http://localhost:11434' : prev.llmKey
                  }));
                }}
                className="focus:ring-2 focus:ring-purple-500 outline-none w-full mt-1.5 px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm transition-all"
             >
               <option value="groq">Groq</option>
               <option value="openai">OpenAI</option>
               <option value="openrouter">OpenRouter</option>
               <option value="llama">Ollama (Local)</option>
             </select>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Model ID</label>
              <button 
                onClick={() => setIsCustomModel(!isCustomModel)}
                className="text-[10px] text-purple-600 hover:text-purple-700 font-bold uppercase tracking-tight flex items-center gap-1"
              >
                <Edit3 size={10} /> {isCustomModel ? 'Use Presets' : 'Custom Model'}
              </button>
            </div>
            {isCustomModel ? (
              <input 
                type="text" 
                value={formData.model} 
                onChange={e => handleChange('model', e.target.value)} 
                placeholder="e.g. gpt-4o"
                className="focus:ring-2 focus:ring-purple-500 outline-none w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm transition-all" 
              />
            ) : (
              <select 
                value={formData.model} 
                onChange={e => handleChange('model', e.target.value)}
                className="focus:ring-2 focus:ring-purple-500 outline-none w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm transition-all"
              >
                {(MODEL_PRESETS[formData.llm] || []).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {formData.llm === 'llama' ? 'Ollama Server URL' : 'API Key'}
          </label>
          <input 
            type={formData.llm === 'llama' ? "text" : "password"} 
            value={formData.llmKey} 
            onChange={e => handleChange('llmKey', e.target.value)} 
            placeholder={
              formData.llm === 'groq' ? "gsk_..." : 
              formData.llm === 'openai' ? "sk-..." : 
              formData.llm === 'openrouter' ? "sk-or-..." :
              "http://localhost:11434"
            } 
            className="focus:ring-2 focus:ring-purple-500 outline-none w-full mt-1.5 px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm transition-all" 
          />
          <p className="text-[10px] text-slate-400 mt-1.5 italic">
            {formData.llm === 'llama' ? 'Enter your local Ollama URL (Default: http://localhost:11434)' : 'Your API key is stored locally in your browser and never sent to our servers.'}
          </p>
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
              <p className="text-[11px] text-red-700 dark:text-red-500 mt-0.5">{errorMessage || 'Failed to connect to the selected LLM provider.'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
