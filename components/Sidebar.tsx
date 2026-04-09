import React from 'react';
import { Home, Settings, Link as LinkIcon, Briefcase, FileOutput } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  return (
    <aside className="w-64 bg-[#1a1f36] text-slate-300 min-h-screen flex flex-col border-r border-[#2d334a] shadow-2xl">
      <div className="p-6 border-b border-[#2d334a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
            TB
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-wide">TestingBuddy AI</h1>
            <p className="text-xs text-blue-400">Testing Platform</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 py-6">
        <nav className="space-y-1 px-4 mb-8">
          <NavItem 
            icon={<Home size={18} />} 
            label="Dashboard" 
            isActive={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
        </nav>

        <div className="px-4 mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-3">Connections</p>
        </div>
        <nav className="space-y-1 px-4 mb-8">
          <NavItem 
            icon={<Settings size={18} />} 
            label="LLM" 
            isActive={activeTab === 'llm'} 
            onClick={() => setActiveTab('llm')} 
          />
          <NavItem 
            icon={<LinkIcon size={18} />} 
            label="JIRA" 
            isActive={activeTab === 'jira'} 
            onClick={() => setActiveTab('jira')} 
          />
          <NavItem 
            icon={<LinkIcon size={18} />} 
            label="TestLink" 
            isActive={activeTab === 'testlink_conn'} 
            onClick={() => setActiveTab('testlink_conn')} 
          />
        </nav>

        <div className="px-4 mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-3">Generators</p>
        </div>
        <nav className="space-y-1 px-4">
          <NavItem 
            icon={<div className="w-4 h-4 rounded-full border-2 border-red-500" />} 
            label="Test Plan" 
            isActive={activeTab === 'testplan'} 
            onClick={() => setActiveTab('testplan')} 
          />
          <NavItem 
            icon={<FileOutput size={18} />} 
            label="Test Cases" 
            isActive={activeTab === 'testcases'} 
            onClick={() => setActiveTab('testcases')} 
          />
        </nav>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
          : 'hover:bg-[#2d334a] hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
