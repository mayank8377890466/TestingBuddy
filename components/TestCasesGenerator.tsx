"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, Download, Server, Upload, X } from 'lucide-react';
import { getConfig } from '../tools/configStore';

export default function TestCasesGenerator() {
  const [jiraProjectId, setJiraProjectId] = useState('');
  const [jiraTicketId, setJiraTicketId] = useState('');
  const [testLinkProject, setTestLinkProject] = useState('');
  const [testSuite, setTestSuite] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [prdFileName, setPrdFileName] = useState('');
  const [prdContent, setPrdContent] = useState('');
  const [isParsingPrd, setIsParsingPrd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [xmlContent, setXmlContent] = useState('');

  const [globalConfig, setGlobalConfig] = useState<any>({ jira: {}, llm: {}, testlink: {} });

  useEffect(() => {
    const config = getConfig();
    setGlobalConfig(config);
  }, []);

  const handlePrdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPrdFileName(file.name);
    setErrorMsg('');
    
    const fileName = file.name.toLowerCase();
    
    // For TXT and MD, use local reader for speed
    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPrdContent((ev.target?.result as string) || '');
      };
      reader.readAsText(file);
      return;
    }

    // For PDF, DOCX and DOC, use server-side parser
    if (fileName.endsWith('.pdf') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      setIsParsingPrd(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const resp = await fetch('/api/parse', {
          method: 'POST',
          body: formData
        });
        
        const contentType = resp.headers.get("content-type");
        if (!resp.ok) {
          if (contentType && contentType.includes("application/json")) {
            const data = await resp.json();
            throw new Error(data.error || 'Failed to parse document');
          } else {
            const text = await resp.text();
            throw new Error(`Server Error: ${resp.status} - ${text.substring(0, 100)}...`);
          }
        }
        
        const data = await resp.json();
        setPrdContent(data.text || '');
      } catch (err: any) {
        setErrorMsg(`Document parsing failed: ${err.message}`);
        setPrdFileName('');
      } finally {
        setIsParsingPrd(false);
      }
      return;
    }

    setErrorMsg('Unsupported file format. Please upload PDF, DOCX, DOC, TXT, or MD.');
    setPrdFileName('');
  };

  const clearPrd = () => {
    setPrdFileName('');
    setPrdContent('');
    setIsParsingPrd(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    const keys = jiraTicketId.split(/[,\n]+/).map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      setErrorMsg('Enter at least one JIRA Ticket ID.');
      return;
    }
    
    const llmCreds = globalConfig.llm || {};
    const jiraCreds = globalConfig.jira || {};
    const tlCreds = globalConfig.testlink || {};
    
    if (!llmCreds.llmKey) {
      setErrorMsg('LLM Credentials missing. Configure LLM API first.');
      return;
    }

    setGenerating(true);
    setErrorMsg('');
    setXmlContent('');

    try {
      const resp = await fetch('/api/testlink/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jiraCredentials: jiraCreds.url ? { url: jiraCreds.url, email: jiraCreds.email, token: jiraCreds.token } : null,
          issueKeys: keys,
          llmConfig: { llm: llmCreds.llm || 'groq', llmKey: llmCreds.llmKey },
          testSuiteName: testSuite || 'Generated Test Cases',
          additionalContext: additionalContext || '',
          prdContent: prdContent || ''
        })
      });

      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || 'Generation failed.');

      setXmlContent(data.xml || '');
      
      // Trigger TestLink Auto-Upload
      if (tlCreds.devKey && tlCreds.url) {
        try {
          alert("Uploading directly to TestLink...");
          const uploadResp = await fetch('/api/testlink/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              testCases: data.testCases,
              testSuiteName: testSuite || 'Generated Test Cases',
              projectName: testLinkProject || '',
              testlinkCredentials: { url: tlCreds.url, devKey: tlCreds.devKey }
            })
          });
          const uploadData = await uploadResp.json();
          if (uploadResp.ok) {
             alert(`Successfully uploaded to TestLink! Created/Updated ${uploadData.count || 0} cases.`);
          } else {
             throw new Error(uploadData.error || 'Failed to upload to TestLink');
          }
        } catch (upErr: any) {
          setErrorMsg(`Generated XML locally, but Upload failed: ${upErr.message}`);
        }
      } else {
        alert("TestLink Credentials missing in config. Showing XML only.");
      }

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadXml = () => {
    if (!xmlContent) return;
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `testlink_import_${dateStr}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4 fade-in duration-500 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800 p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="text-emerald-500" size={24} /> Test Cases
        </h2>
        <p className="text-sm text-slate-500 mt-1">Generate Test Cases from Jira and export directly to TestLink.</p>
      </div>

      {errorMsg && (
         <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg shadow-inner">
           <strong>Error: </strong> {errorMsg}
         </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-400">JIRA Project ID</label>
            <input type="text" value={jiraProjectId} onChange={(e)=>setJiraProjectId(e.target.value)} placeholder="e.g., VWOAPP" className="focus:ring-2 focus:ring-emerald-500 outline-none w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm transition-shadow uppercase" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-400">JIRA Ticket ID</label>
            <textarea value={jiraTicketId} onChange={(e)=>setJiraTicketId(e.target.value)} placeholder="Comma-separated ticket keys (e.g., VWOAPP-100, VWOAPP-101)" className="focus:ring-2 focus:ring-emerald-500 outline-none w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm min-h-[80px] resize-y"></textarea>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-400">TestLink Project</label>
            <input type="text" value={testLinkProject} onChange={(e)=>setTestLinkProject(e.target.value)} placeholder="e.g., VWO Core Platform" className="focus:ring-2 focus:ring-emerald-500 outline-none w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm transition-shadow" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-400">Test Suite</label>
            <input type="text" value={testSuite} onChange={(e)=>setTestSuite(e.target.value)} placeholder="e.g., Sprint 15 Login Tests" className="focus:ring-2 focus:ring-emerald-500 outline-none w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm transition-shadow" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-400">Additional Context</label>
            <textarea
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              placeholder="Any additional instructions or context for AI test case generation..."
              className="focus:ring-2 focus:ring-emerald-500 outline-none w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm shadow-sm min-h-[100px] resize-y"
            ></textarea>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-400">Upload PRD (Optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx"
              onChange={handlePrdUpload}
              className="hidden"
              id="prd-upload"
            />
            {prdFileName ? (
              <div className="mt-1 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                {isParsingPrd ? <Loader2 size={16} className="text-emerald-600 animate-spin" /> : <FileText size={16} className="text-emerald-600 shrink-0" />}
                <span className="text-sm text-emerald-800 dark:text-emerald-300 font-medium truncate flex-1">
                  {isParsingPrd ? `Extracting from ${prdFileName}...` : prdFileName}
                </span>
                {!isParsingPrd && (
                  <button onClick={clearPrd} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded transition-colors" title="Remove file">
                    <X size={14} className="text-emerald-600" />
                  </button>
                )}
              </div>
            ) : (
              <label
                htmlFor="prd-upload"
                className="mt-1 flex items-center justify-center gap-2 px-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all"
              >
                <Upload size={16} className="text-slate-400" />
                <span className="text-sm text-slate-500">Click to upload PRD (.txt, .md, .pdf, .doc, .docx)</span>
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 items-center">
        <button 
          onClick={() => handleGenerate()}
          disabled={generating}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-emerald-500/30"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
          Generate to TestLink
        </button>
      </div>

      {xmlContent && (
        <div className="mt-8 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Generated XML Preview</h3>
             <button 
                onClick={handleDownloadXml}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md font-semibold text-xs transition-colors"
                title="Download this file and import into TestLink"
              >
                <Download size={14} /> Download XML
             </button>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4">
            <pre className="text-emerald-400 font-mono text-[11px] leading-snug overflow-x-auto max-h-[300px]">
              {xmlContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
