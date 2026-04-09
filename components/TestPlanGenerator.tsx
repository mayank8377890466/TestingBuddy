"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, DownloadCloud, Sparkles, Download, ArrowLeft, Loader2, CheckCircle, Search } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import { getConfig } from '../tools/configStore';

export default function TestPlanGenerator() {
  const [step, setStep] = useState(1);
  const [jiraUrl, setJiraUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [context, setContext] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [issues, setIssues] = useState<any[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [fetchedRawIssues, setFetchedRawIssues] = useState<any[]>([]);
  const [selectedIssueKeys, setSelectedIssueKeys] = useState<Set<string>>(new Set());
  const [generatedPlan, setGeneratedPlan] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load credentials from localStorage
  const [globalConfig, setGlobalConfig] = useState<any>({ jira: {}, llm: {} });

  useEffect(() => {
    const config = getConfig();
    setGlobalConfig(config);
    if (config.jira?.url) setJiraUrl(config.jira.url);
  }, []);

  // Suppress harmless React 19 key warnings from markdown-to-jsx
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes('unique "key" prop')) return;
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  const handleFetchDetails = async () => {
    const jiraCreds = globalConfig.jira || {};
    if (!jiraCreds.url || !jiraCreds.token) {
      setErrorMsg("JIRA Credentials missing. Configure JIRA Connection first.");
      return;
    }
    setErrorMsg('');
    setIsFetching(true);

    try {
      const resp = await fetch('/api/jira/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: jiraCreds.url,
          email: jiraCreds.email,
          token: jiraCreds.token,
          projectKey: projectId
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to fetch issues');
      
      if (!data.issues || data.issues.length === 0) {
        setErrorMsg("No tickets found for the specified criteria.");
        return;
      }
      
      setFetchedRawIssues(data.issues);
      setSelectedIssueKeys(new Set()); // All unchecked by default
      setTicketSearch(''); // Reset search
      setShowModal(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const saveToHistory = useCallback((markdown: string) => {
    try {
      const history = JSON.parse(localStorage.getItem('testPlanHistory') || '[]');
      const entry = {
        id: `plan_${Date.now()}`,
        timestamp: new Date().toISOString(),
        issueCount: issues?.length || 0,
        issueKeys: (issues || []).slice(0, 5).map((i: any) => i.key),
        preview: markdown.substring(0, 200).replace(/[#*\n]/g, ' ').trim(),
        fullMarkdown: markdown,
      };
      history.unshift(entry);
      if (history.length > 20) history.length = 20;
      localStorage.setItem('testPlanHistory', JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save history', e);
    }
  }, [issues]);

  const handleGeneratePlan = async () => {
    const llmCreds = globalConfig.llm || {};
    const jiraCreds = globalConfig.jira || {};
    // Use the combined creds format the generator expects
    const credentials = { ...jiraCreds, ...llmCreds };

    if (!llmCreds.llmKey) {
      setErrorMsg("LLM Credentials missing. Configure LLM API first.");
      return;
    }

    if (!issues || issues.length === 0) {
      setErrorMsg("No issues fetched. Please click 'Fetch Details' first.");
      return;
    }

    setErrorMsg('');
    setIsGenerating(true);
    setStep(2);

    try {
      const resp = await fetch('/api/llm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials, issues: issues.map(i => ({...i, customContext: context})) })
      });
      const data = await resp.json();
      if (!resp.ok || data.status === 'error') throw new Error(data.error || 'Failed to generate plan');
      const markdown = data.test_plan_markdown || data.markdown || 'No content generated.';
      setGeneratedPlan(markdown);
      saveToHistory(markdown);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep(1); // Go back if error
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!generatedPlan) return;
    const blob = new Blob([generatedPlan], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `test_plan_${dateStr}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleIssueSelection = (key: string) => {
    const newKeys = new Set(selectedIssueKeys);
    if (newKeys.has(key)) newKeys.delete(key);
    else newKeys.add(key);
    setSelectedIssueKeys(newKeys);
  };

  const confirmSelection = () => {
    const finalized = fetchedRawIssues.filter(i => selectedIssueKeys.has(i.key));
    if (finalized.length === 0) {
      setErrorMsg("You must select at least one ticket.");
      setShowModal(false);
      return;
    }
    setIssues(finalized);
    setShowModal(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 animate-in slide-in-from-right-4 fade-in duration-500 relative">
      
      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-lg z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Select Tickets to Analyze</h3>
              <p className="text-sm text-slate-500 mb-2">Choose which fetched tickets should be included in the AI context.</p>
              
              {/* Search bar */}
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={e => setTicketSearch(e.target.value)}
                  placeholder="Search by ticket key or summary..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                />
              </div>

              {/* Select All / Deselect All */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setSelectedIssueKeys(new Set(fetchedRawIssues.map(i => i.key)))}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >Select All</button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => setSelectedIssueKeys(new Set())}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >Deselect All</button>
                <span className="ml-auto text-xs text-slate-400">{fetchedRawIssues.length} tickets</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-6">
                 {fetchedRawIssues
                   .filter(issue => {
                     if (!ticketSearch.trim()) return true;
                     const q = ticketSearch.toLowerCase();
                     return issue.key.toLowerCase().includes(q) || (issue.summary || '').toLowerCase().includes(q);
                   })
                   .map(issue => (
                   <label key={issue.key} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedIssueKeys.has(issue.key)}
                        onChange={() => toggleIssueSelection(issue.key)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                         <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{issue.key}</p>
                         <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{issue.summary}</p>
                      </div>
                   </label>
                 ))}
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                 <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                 <button onClick={confirmSelection} className="px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors">
                    Confirm Selection ({selectedIssueKeys.size})
                 </button>
              </div>
           </div>
        </div>
      )}
      
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800 p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="text-blue-500" size={24} /> Step 1: Test Plan Generator
            </h2>
            <p className="text-sm text-slate-500 mt-1">Provide Jira details to fetch user stories and generate an intelligent test plan.</p>
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wider">JIRA INSTANCE</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{jiraUrl || 'Not Configured (Go to JIRA Connection)'}</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg shadow-inner">
              <strong>Error: </strong> {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-400">Project ID</label>
              <input type="text" value={projectId} onChange={(e)=>setProjectId(e.target.value)} placeholder="e.g., VWOAPP" className="focus:ring-2 focus:ring-blue-500 outline-none w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm transition-shadow uppercase" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-400">Additional Context</label>
              <textarea 
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Any additional instructions or boundaries for the AI..." 
                className="focus:ring-2 focus:ring-blue-500 outline-none w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm min-h-[120px] resize-y"
              ></textarea>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 items-center border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={handleFetchDetails}
              disabled={isFetching || isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium text-sm transition-colors text-slate-700 dark:text-slate-200 shadow-sm"
            >
              {isFetching ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <DownloadCloud size={18} />}
              Fetch Details
            </button>
            <button 
              onClick={handleGeneratePlan}
              disabled={isGenerating || isFetching}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-blue-500/30"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Generate Test Plan
            </button>
          </div>
          
          {issues && issues.length > 0 && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" /> Fetched Requirements ({issues.length})
              </h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {issues.map((issue: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex gap-3 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                    <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">{issue.key}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{issue.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setStep(1)}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                title="Back to Setup"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={20} />
                  Step 2: Generated Test Plan
                </h2>
              </div>
            </div>
            
            {!isGenerating && (
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-colors"
              >
                <Download size={16} /> Export
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl min-h-[500px] p-8 overflow-hidden relative">
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">AI is generating your plan...</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This might take a moment.</p>
              </div>
            ) : (
                <Markdown options={{
                  overrides: {
                    h1: { component: 'h1', props: { className: 'text-2xl font-bold mb-4 mt-6 text-slate-900 dark:text-white' } },
                    h2: { component: 'h2', props: { className: 'text-xl font-bold mb-3 mt-5 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1' } },
                    h3: { component: 'h3', props: { className: 'text-lg font-semibold mb-2 mt-4 text-slate-800 dark:text-slate-200' } },
                    p: { component: 'p', props: { className: 'text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed' } },
                    ul: { component: 'ul', props: { className: 'list-disc pl-5 mb-4 text-sm text-slate-700 dark:text-slate-300 space-y-1' } },
                    ol: { component: 'ol', props: { className: 'list-decimal pl-5 mb-4 text-sm text-slate-700 dark:text-slate-300 space-y-1' } },
                    li: { component: 'li', props: { className: 'mb-1 marker:text-slate-400' } },
                    table: { component: 'table', props: { className: 'min-w-full text-sm text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden my-6 block overflow-x-auto shadow-sm tracking-wide' } },
                    thead: { component: 'thead', props: { className: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 font-semibold' } },
                    th: { component: 'th', props: { className: 'px-6 py-4 border-b border-slate-200 dark:border-slate-700' } },
                    td: { component: 'td', props: { className: 'px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300' } },
                    strong: { component: 'strong', props: { className: 'font-bold text-slate-900 dark:text-white' } },
                    code: { component: 'code', props: { className: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1 py-0.5 rounded text-xs font-mono' } },
                  }
                }}>
                  {generatedPlan}
                </Markdown>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
