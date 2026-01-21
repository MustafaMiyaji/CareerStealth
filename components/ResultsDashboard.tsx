import React, { useEffect, useState, useRef } from 'react';
import { AnalysisResult, LearningResource } from '../types';
import { roastHeadshot, generateLearningPlan } from '../services/geminiService';
import AnalysisChart from './AnalysisChart';
import ReactMarkdown from 'react-markdown';

interface ResultsDashboardProps {
  result: AnalysisResult;
  onReset: () => void;
  onEdit: () => void;
  onGenerateCoverLetter: () => void;
  darkMode: boolean;
  addToast: (msg: string, type: 'success'|'error'|'info') => void;
  jobDescription?: string; 
  persona?: string; 
}

const TypewriterText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 15 }) => {
  const [displayedLength, setDisplayedLength] = useState(0);
  
  useEffect(() => {
    setDisplayedLength(0);
    const intervalId = setInterval(() => {
      setDisplayedLength(prev => {
        if (prev >= text.length) {
          clearInterval(intervalId);
          return prev;
        }
        return prev + 1;
      });
    }, delay);
    return () => clearInterval(intervalId);
  }, [text, delay]);

  return <span>{text.slice(0, displayedLength)}</span>;
};

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, onReset, onEdit, onGenerateCoverLetter, darkMode, addToast, jobDescription = "", persona = "Hiring Manager" }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedRoast, setCopiedRoast] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'interview' | 'headshot' | 'roadmap'>('analysis');
  
  // Headshot State
  const [headshotFile, setHeadshotFile] = useState<string | null>(null);
  const [headshotRoast, setHeadshotRoast] = useState<string | null>(null);
  const [isRoastingHeadshot, setIsRoastingHeadshot] = useState(false);

  // Roadmap State
  const [roadmap, setRoadmap] = useState<LearningResource[]>([]);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 500);
    if (result.score >= 75) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [result.score]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "resume_analysis.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addToast("Analysis exported to JSON", "success");
  };

  const copyToClipboard = (text: string, type: 'roast' | 'fix') => {
    navigator.clipboard.writeText(text);
    if (type === 'roast') {
      setCopiedRoast(true);
      setTimeout(() => setCopiedRoast(false), 2000);
    } else {
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2000);
    }
    addToast("Copied to clipboard", "success");
  };

  const handleHeadshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              setHeadshotFile(reader.result as string);
              setIsRoastingHeadshot(true);
              setHeadshotRoast(null);
              const roast = await roastHeadshot(base64, persona);
              setHeadshotRoast(roast);
              setIsRoastingHeadshot(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerateRoadmap = async () => {
      if (roadmap.length > 0) return;
      setIsGeneratingRoadmap(true);
      try {
          const plan = await generateLearningPlan(result.missingKeywords || [], jobDescription);
          setRoadmap(plan);
      } catch (e) {
          addToast("Failed to generate roadmap", "error");
      } finally {
          setIsGeneratingRoadmap(false);
      }
  };

  useEffect(() => {
      if (activeTab === 'roadmap' && roadmap.length === 0 && !isGeneratingRoadmap) {
          handleGenerateRoadmap();
      }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8 pb-20 relative animate-pulse">
         <div className="flex justify-between items-center mb-8">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <div className="flex gap-2">
               <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
               <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
            <div className="col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 pb-20 relative">
      
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div 
              key={i} 
              className="confetti" 
              style={{
                left: `${Math.random() * 100}vw`,
                backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 2}s`
              }} 
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4 animate-fade-in border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 uppercase tracking-widest animate-scale-in">Analysis Report</span>
           </div>
           <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Results Dashboard</h2>
           <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>AI-driven insights tailored to your target persona.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleExportJSON}
            className={`flex-1 md:flex-none text-xs font-bold px-4 py-2.5 rounded-lg border transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 hover:shadow-lg ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-600'}`}
          >
            Export Data
          </button>
          <button 
            onClick={onReset}
            className={`flex-1 md:flex-none text-xs font-bold px-4 py-2.5 rounded-lg border transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 hover:shadow-lg ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-600'}`}
          >
            Start New
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
        {/* Score Card with Spinning Border */}
        <div className="opacity-0 animate-slide-up h-full" style={{ animationDelay: '0.1s' }}>
            {/* Fluid Spinning Border Container */}
            <div className="relative overflow-hidden rounded-[2rem] p-[1.5px] h-full shadow-2xl transition-transform hover:-translate-y-2 duration-500 group">
                {/* The Conic Gradient Spinner */}
                <div className={`absolute inset-[-50%] animate-[spin_4s_linear_infinite] ${darkMode ? 'bg-[conic-gradient(from_0deg,transparent_0_300deg,#6366f1_360deg)]' : 'bg-[conic-gradient(from_0deg,transparent_0_300deg,#4f46e5_360deg)]'}`} />
                
                {/* Card Content */}
                <div className={`relative h-full w-full rounded-[calc(2rem-1.5px)] backdrop-blur-xl p-6 md:p-8 flex flex-col items-center justify-between ${darkMode ? 'bg-slate-900/95' : 'bg-white/95'}`}>
                    {result.score >= 85 && (
                        <div className="absolute top-4 right-4 animate-bounce">
                            <span className="text-2xl">🏆</span>
                        </div>
                    )}

                    <div className="w-full text-center">
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ATS Compatibility Score</h3>
                        <div className="relative z-10 scale-110 transition-transform duration-500 group-hover:scale-125">
                            <AnalysisChart score={result.score} />
                        </div>
                        <div className="mt-4">
                            {result.score >= 80 ? (
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs uppercase tracking-wide animate-pop">Target Acquired 🎯</span>
                            ) : result.score >= 50 ? (
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-xs uppercase tracking-wide animate-pop">Optimization Needed ⚠️</span>
                            ) : (
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold text-xs uppercase tracking-wide animate-pop">High Risk 🚨</span>
                            )}
                        </div>
                    </div>
                    
                    <div className="w-full mt-10 space-y-3">
                        <button 
                            onClick={onEdit}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <span className="relative flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Open Editor
                            </span>
                        </button>
                        <button 
                            onClick={onGenerateCoverLetter}
                            className={`w-full py-3.5 border rounded-2xl font-bold text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2 active:scale-95 ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}
                        >
                            <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            Generate Cover Letter
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Tabbed Content Area */}
        <div className={`rounded-[2rem] shadow-xl border lg:col-span-2 opacity-0 animate-slide-up flex flex-col overflow-hidden relative backdrop-blur-md ${darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-white/40 bg-white/70'}`} style={{ animationDelay: '0.2s' }}>
           
           <div className={`flex border-b p-2 gap-1 overflow-x-auto ${darkMode ? 'border-slate-800' : 'border-slate-200/50'}`}>
              {[
                  { id: 'analysis', label: 'Roast & Fix', icon: '🔥' },
                  { id: 'interview', label: 'Interview Prep', icon: '🎤' },
                  { id: 'headshot', label: 'Headshot AI', icon: '📸' },
                  { id: 'roadmap', label: 'Skill Roadmap', icon: '🗺️' }
              ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all relative whitespace-nowrap flex items-center justify-center gap-2 min-w-[140px] hover:scale-105 active:scale-95
                    ${activeTab === tab.id 
                        ? (darkMode ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200') 
                        : (darkMode ? 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300' : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-700')
                    }`}
                  >
                     <span>{tab.icon}</span> <span>{tab.label}</span>
                     {activeTab === tab.id && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500 animate-scale-in"></div>}
                  </button>
              ))}
           </div>

           <div className="p-6 md:p-10 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar bg-slate-50/30 dark:bg-slate-950/30">
             
             {activeTab === 'analysis' && (
                 <>
                    <div className="mb-10">
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Missing Keywords
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {result.missingKeywords.length > 0 ? (
                            result.missingKeywords.map((keyword, idx) => (
                                <div 
                                key={idx} 
                                className={`group relative px-4 py-2 rounded-lg border text-xs font-bold cursor-help transition-all duration-300 hover:-translate-y-1 opacity-0 animate-pop hover:shadow-md
                                    ${darkMode ? 'bg-red-500/10 text-red-300 border-red-500/20 hover:border-red-500/50' : 'bg-white text-red-600 border-red-100 hover:border-red-300 shadow-sm'}
                                `}
                                style={{ animationDelay: `${0.3 + (idx * 0.05)}s` }}
                                >
                                <span className="opacity-50 mr-1">+</span> {keyword}
                                </div>
                            ))
                            ) : (
                            <span className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs flex items-center animate-pop">
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                Perfect Keyword Match!
                            </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="grid gap-6">
                        {/* Roast Section */}
                        <div className={`relative p-8 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1 duration-300 opacity-0 animate-slide-up ${darkMode ? 'bg-red-950/10 border-red-900/30' : 'bg-white border-red-100 shadow-sm'}`} style={{ animationDelay: '0.4s' }}>
                            <div className="absolute -top-3 left-6">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${darkMode ? 'bg-red-900 text-red-100 border-red-700' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    The Roast
                                </span>
                            </div>
                            <button 
                                onClick={() => copyToClipboard(result.managerRoast, 'roast')}
                                className="absolute top-4 right-4 text-slate-400 hover:text-indigo-500 transition-colors"
                            >
                                {copiedRoast ? <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                            </button>
                            <div className="flex gap-6">
                                <div className="text-4xl shrink-0 grayscale opacity-80 animate-bounce" style={{ animationDuration: '3s' }}>😤</div>
                                <div>
                                    <p className={`font-serif text-lg leading-relaxed italic ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                                        "<TypewriterText text={result.managerRoast} delay={10} />"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Fix Strategy Section */}
                        <div className={`relative p-8 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1 duration-300 opacity-0 animate-slide-up ${darkMode ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-white border-emerald-100 shadow-sm'}`} style={{ animationDelay: '0.5s' }}>
                             <div className="absolute -top-3 left-6">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${darkMode ? 'bg-emerald-900 text-emerald-100 border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                    The Fix
                                </span>
                            </div>
                            <button 
                                onClick={() => copyToClipboard(result.fixStrategy, 'fix')}
                                className="absolute top-4 right-4 text-slate-400 hover:text-indigo-500 transition-colors"
                            >
                                {copiedFix ? <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                            </button>
                            <div className="flex gap-6">
                                <div className="text-4xl shrink-0 grayscale opacity-80 animate-pulse-slow">🩹</div>
                                <div className={`prose prose-sm max-w-none 
                                    ${darkMode ? 'prose-invert prose-p:text-slate-300 prose-headings:text-emerald-400' : 'prose-p:text-slate-600 prose-headings:text-emerald-700'}
                                    prose-h3:text-lg prose-h3:font-bold prose-h3:mt-6 prose-h3:mb-2 prose-h3:flex prose-h3:items-center prose-h3:gap-2 prose-h3:uppercase prose-h3:tracking-wide
                                    prose-ul:list-disc prose-ul:pl-4 prose-li:mb-1
                                `}>
                                    <ReactMarkdown>{result.fixStrategy}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                 </>
             )}

             {activeTab === 'interview' && (
                <div className="animate-fade-in space-y-6">
                    <div className={`p-4 rounded-xl border flex items-center gap-4 ${darkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                        <span className="text-2xl animate-pulse">⚡</span>
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-wide">The Nemesis Interview</h4>
                            <p className="text-xs opacity-70">Prepare for these curveballs.</p>
                        </div>
                    </div>

                    {result.interviewPrep?.map((item, idx) => (
                        <div key={idx} className={`p-6 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-lg opacity-0 animate-slide-up ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`} style={{ animationDelay: `${idx * 0.1}s` }}>
                            <div className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-black shrink-0 mt-1 shadow-inner">
                                    {idx + 1}
                                </div>
                                <div className="space-y-4 w-full">
                                    <h5 className={`text-xl font-bold leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        "{item.question}"
                                    </h5>
                                    
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className={`p-4 rounded-xl text-xs ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                                            <span className="font-bold uppercase tracking-wider block mb-2 opacity-50 text-[10px]">Why they ask this</span>
                                            {item.context}
                                        </div>
                                        <div className={`p-4 rounded-xl text-xs ${darkMode ? 'bg-emerald-950/20 border border-emerald-900/30' : 'bg-emerald-50 border border-emerald-100'}`}>
                                            <span className="font-bold uppercase tracking-wider block mb-2 text-emerald-600 dark:text-emerald-400 text-[10px]">Winning Answer</span>
                                            {item.idealAnswer}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             )}

             {activeTab === 'headshot' && (
                 <div className="animate-fade-in flex flex-col items-center justify-center min-h-[400px]">
                     {!headshotFile ? (
                         <div className={`text-center p-12 border-2 border-dashed rounded-[2rem] transition-all group hover:scale-[1.02] ${darkMode ? 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-white'}`}>
                             <div className="w-24 h-24 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors shadow-inner">
                                <span className="text-5xl filter drop-shadow-sm group-hover:rotate-12 transition-transform">📸</span>
                             </div>
                             <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Check Your Vibe</h3>
                             <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">Upload your LinkedIn photo for a roast from the {persona}.</p>
                             <input type="file" accept="image/*" onChange={handleHeadshotUpload} className="hidden" id="headshot-upload" />
                             <label htmlFor="headshot-upload" className="cursor-pointer bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95">Select Photo</label>
                         </div>
                     ) : (
                        <div className="w-full max-w-sm mx-auto text-center">
                            <div className="relative w-48 h-48 mx-auto mb-8">
                                <div className="absolute inset-0 rounded-full border-[6px] border-indigo-500/20 animate-[spin_10s_linear_infinite]"></div>
                                <div className="absolute inset-0 rounded-full border-[6px] border-t-indigo-500 animate-[spin_3s_linear_infinite]"></div>
                                <div className="absolute inset-2 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
                                    <img src={headshotFile} alt="Headshot" className="w-full h-full object-cover" />
                                </div>
                                {isRoastingHeadshot && (
                                    <div className="absolute inset-2 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
                                        <div className="text-white font-bold animate-pulse">Analyzing...</div>
                                    </div>
                                )}
                            </div>
                            
                            {headshotRoast && (
                                <div className={`p-8 rounded-2xl border relative animate-scale-in ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-lg'}`}>
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                                        {persona} says...
                                    </div>
                                    <p className={`mt-2 text-lg italic font-serif leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>"{headshotRoast}"</p>
                                    <button onClick={() => setHeadshotFile(null)} className="mt-6 text-xs font-bold text-red-500 hover:underline">Remove & Try Again</button>
                                </div>
                            )}
                        </div>
                     )}
                 </div>
             )}

             {activeTab === 'roadmap' && (
                 <div className="animate-fade-in space-y-6">
                    <div className={`p-4 rounded-xl border flex items-center gap-4 ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
                        <span className="text-2xl animate-float">🗺️</span>
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-wide">Skill Gap Roadmap</h4>
                            <p className="text-xs opacity-70">7-day crash course to fill your gaps.</p>
                        </div>
                    </div>

                    {isGeneratingRoadmap ? (
                        <div className="py-20 flex flex-col items-center">
                             <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                             <p className="text-slate-500 font-medium animate-pulse">Designing curriculum...</p>
                        </div>
                    ) : roadmap.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <p>No major skill gaps detected!</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-8 pl-8 py-4">
                            {roadmap.map((item, idx) => (
                                <div key={idx} className={`relative p-6 rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-lg group opacity-0 animate-slide-up ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`} style={{ animationDelay: `${idx * 0.1}s` }}>
                                     {/* Timeline Dot */}
                                     <div className={`absolute -left-[41px] top-6 w-5 h-5 rounded-full border-4 border-white dark:border-slate-950 shadow-sm z-10 transition-transform group-hover:scale-125 ${item.priority === 'High' ? 'bg-red-500' : item.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                     
                                     <div className="flex justify-between items-start mb-2">
                                         <h4 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.skill}</h4>
                                         <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${item.priority === 'High' ? 'bg-red-100 text-red-700' : item.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                             {item.priority}
                                         </span>
                                     </div>
                                     <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.plan}</p>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
             )}
             
           </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;