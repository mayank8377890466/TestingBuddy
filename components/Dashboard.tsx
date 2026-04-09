"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import LLMConnection from './LLMConnection';
import JiraConnection from './JiraConnection';
import TestLinkConnection from './TestLinkConnection';
import TestPlanGenerator from './TestPlanGenerator';
import TestCasesGenerator from './TestCasesGenerator';
import { History, X, Trash2, Eye, Clock, FileText, ChevronRight } from 'lucide-react';

interface HistoryEntry {
  id: string;
  timestamp: string;
  issueCount: number;
  issueKeys?: string[];
  preview: string;
  fullMarkdown: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('agent');
  const [currentStep, setStep] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [viewingEntry, setViewingEntry] = useState<HistoryEntry | null>(null);

  // Load history from localStorage unconditionally for dashboard stats
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('testPlanHistory') || '[]');
      setHistory(stored);
    } catch {
      setHistory([]);
    }
  }, [showHistory, activeTab]);

  const deleteEntry = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('testPlanHistory', JSON.stringify(updated));
    if (viewingEntry?.id === id) setViewingEntry(null);
  };

  const clearAllHistory = () => {
    setHistory([]);
    setViewingEntry(null);
    localStorage.removeItem('testPlanHistory');
  };

  const exportEntry = (entry: HistoryEntry) => {
    const blob = new Blob([entry.fullMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_plan_${entry.timestamp.split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0f111a] font-sans antialiased text-slate-900 dark:text-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col items-center p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-5xl animate-in fade-in duration-500 mb-6 flex justify-end">
          {(activeTab === 'testplan' || activeTab === 'testcases') && (
            <button 
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 group px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <History size={16} className="text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
              View History
            </button>
          )}
        </div>

        {activeTab === 'dashboard' ? (
          <div className="w-full max-w-5xl animate-in fade-in duration-500">
             <header className="mb-8">
               <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dashboard Insights</h1>
               <p className="text-sm text-slate-500 mt-1">Overview of your TestingBuddy AI generation activities.</p>
             </header>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                   <FileText size={24} />
                 </div>
                 <div>
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Plans Generated</p>
                   <p className="text-3xl font-bold text-slate-900 dark:text-white">{history ? history.length : 0}</p>
                 </div>
               </div>
               
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                   <History size={24} />
                 </div>
                 <div>
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Total Features Mapped</p>
                   <p className="text-3xl font-bold text-slate-900 dark:text-white">
                     {history ? history.reduce((acc, curr) => acc + (curr.issueCount || 0), 0) : 0}
                   </p>
                 </div>
               </div>
             </div>

             <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Recent Activity</h3>
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No generation history found. Try creating a new Test Plan!</p>
                ) : (
                  <div className="space-y-3">
                    {history.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <div>
                           <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                             {entry.issueCount} ticket(s) analyzed
                           </p>
                           <p className="text-xs text-slate-500 mt-1">{entry.preview?.substring(0, 80)}...</p>
                        </div>
                        <span className="text-[10px] bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 font-medium">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        ) : activeTab === 'llm' ? (
          <LLMConnection />
        ) : activeTab === 'jira' ? (
          <JiraConnection />
        ) : activeTab === 'testlink_conn' ? (
          <TestLinkConnection />
        ) : activeTab === 'testplan' ? (
          <TestPlanGenerator />
        ) : activeTab === 'testcases' ? (
          <TestCasesGenerator />
        ) : (
           <div className="w-full h-full flex items-center justify-center opacity-50">
             <h2 className="text-xl font-medium tracking-wide">Select an option from the sidebar.</h2>
           </div>
        )}
      </main>

      {/* History Slide-Over Panel */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => { setShowHistory(false); setViewingEntry(null); }}
          />
          
          {/* Panel */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <History size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Generation History</h2>
                  <p className="text-xs text-slate-500">{history.length} saved plan{history.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button 
                    onClick={clearAllHistory}
                    className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button 
                  onClick={() => { setShowHistory(false); setViewingEntry(null); }}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {viewingEntry ? (
                /* Full Plan View */
                <div className="p-6">
                  <button 
                    onClick={() => setViewingEntry(null)} 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-4 flex items-center gap-1"
                  >
                    ← Back to list
                  </button>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-slate-500">{formatDate(viewingEntry.timestamp)}</p>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">{viewingEntry.issueCount} issue{viewingEntry.issueCount !== 1 ? 's' : ''} analyzed</p>
                    </div>
                    <button 
                      onClick={() => exportEntry(viewingEntry)}
                      className="flex items-center gap-1.5 text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <FileText size={12} /> Export .md
                    </button>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[65vh] overflow-y-auto">
                    {viewingEntry.fullMarkdown}
                  </div>
                </div>
              ) : history.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Clock size={48} className="mb-4 opacity-40" />
                  <p className="font-medium text-slate-600 dark:text-slate-400">No history yet</p>
                  <p className="text-xs mt-1">Generated test plans will appear here</p>
                </div>
              ) : (
                /* History List */
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((entry) => (
                    <div 
                      key={entry.id} 
                      className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                              {entry.issueCount} issue{entry.issueCount !== 1 ? 's' : ''}
                            </span>
                            {entry.issueKeys && entry.issueKeys.length > 0 && (
                              <span className="text-[11px] text-slate-400 font-mono truncate">
                                {entry.issueKeys.join(', ')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">{entry.preview}</p>
                          <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                            <Clock size={10} /> {formatDate(entry.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button 
                            onClick={() => setViewingEntry(entry)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 transition-colors"
                            title="View full plan"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={() => exportEntry(entry)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                            title="Export as .md"
                          >
                            <FileText size={14} />
                          </button>
                          <button 
                            onClick={() => deleteEntry(entry.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <button 
                          onClick={() => setViewingEntry(entry)}
                          className="p-1 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
