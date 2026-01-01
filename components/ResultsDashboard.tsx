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
  jobDescription?: string; // Passed to generate roadmap
  persona?: string; // Passed to roast headshot
}

const TypewriterText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 20 }) => {
  const [displayedLength, setDisplayedLength] = useState(0);
  
  useEffect(() => {
    // Reset when text changes
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
    addToast("Text copied to clipboard", "success");
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

  // Trigger roadmap generation when tab is clicked
  useEffect(() => {
      if (activeTab === 'roadmap' && roadmap.length === 0 && !isGeneratingRoadmap) {
          handleGenerateRoadmap();
      }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-8 pb-20 relative">
         <div className="flex justify-between items-center mb-8">
            <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
            <div className="flex gap-2">
               <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
               <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
            </div>
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse"></div>
            <div className="col-span-2 h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse"></div>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 pb-20 relative">
      
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
        <div>
           <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Analysis Report</h2>
           <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Review insights or prepare for the interview.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleExportJSON}
            className={`flex-1 md:flex-none text-sm px-4 py-2 border rounded-lg transition-colors hover:scale-105 active:scale-95 ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            Export JSON
          </button>
          <button 
            onClick={onReset}
            className={`flex-1 md:flex-none text-sm px-4 py-2 border rounded-lg transition-colors hover:scale-105 active:scale-95 ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            Start New
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Score Card */}
        <div className="relative group hover-card opacity-0 animate-slide-up h-full" style={{ animationDelay: '0.1s' }}>
            <div className="absolute inset-0 rounded-2xl overflow-hidden z-0">
               {result.score >= 70 && (
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%]">
                    <div className="w-full h-full bg-[conic-gradient(transparent_0deg,transparent_20deg,#6366f1_100deg,#ec4899_200deg,transparent_360deg)] animate-border-spin opacity-100"></div>
                 </div>
               )}
            </div>
            
            <div className={`relative z-10 m-[2px] h-[calc(100%-4px)] rounded-[14px] glass p-6 flex flex-col items-center justify-between overflow-hidden ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                {result.score >= 85 && (
                    <div className="absolute top-0 right-0 -mr-8 mt-4 w-32 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-bold text-center rotate-45 shadow-md py-1 z-10">
                        Top Candidate
                    </div>
                )}

                <div className="w-full text-center">
                    <h3 className={`text-lg font-semibold mb-4 uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>ATS Compatibility</h3>
                    <AnalysisChart score={result.score} />
                    <div className="mt-4">
                    {result.score >= 80 ? (
                        <span className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-bold text-sm animate-pop inline-block">Target Acquired 🎯</span>
                    ) : result.score >= 50 ? (
                        <span className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full font-bold text-sm animate-pop inline-block">Optimization Needed ⚠️</span>
                    ) : (
                        <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-bold text-sm animate-pop inline-block">High Risk 🚨</span>
                    )}
                    </div>
                </div>
                
                <div className="w-full mt-8 space-y-3">
                    <button 
                        onClick={onEdit}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center group"
                    >
                        <span className="mr-2 group-hover:rotate-12 transition-transform">⚡</span> Open Stealth Editor
                    </button>
                    <button 
                        onClick={onGenerateCoverLetter}
                        className={`w-full py-3 border rounded-xl font-semibold transition-all hover:shadow-md flex items-center justify-center ${darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-indigo-100 hover:bg-indigo-50 text-indigo-600'}`}
                    >
                        <span className="mr-2">📝</span> Draft Cover Letter
                    </button>
                </div>
            </div>
        </div>

        {/* Tabbed Content Area */}
        <div className={`glass rounded-2xl shadow-lg border lg:col-span-2 hover-card opacity-0 animate-slide-up flex flex-col overflow-hidden ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-white/50'}`} style={{ animationDelay: '0.2s' }}>
           
           <div className={`flex border-b overflow-x-auto ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              {[
                  { id: 'analysis', label: 'Analysis & Roast', color: 'bg-indigo-500' },
                  { id: 'interview', label: 'Interview Prep', color: 'bg-purple-500' },
                  { id: 'headshot', label: '📸 Headshot', color: 'bg-rose-500' },
                  { id: 'roadmap', label: '🗺️ Skill Roadmap', color: 'bg-emerald-500' }
              ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-4 px-4 text-sm font-bold tracking-wide transition-colors relative whitespace-nowrap ${activeTab === tab.id ? (darkMode ? 'text-white bg-slate-700/50' : 'text-slate-900 bg-slate-50') : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
                  >
                     {tab.label}
                     {activeTab === tab.id && <div className={`absolute bottom-0 left-0 w-full h-1 ${tab.color}`}></div>}
                  </button>
              ))}
           </div>

           <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
             
             {activeTab === 'analysis' && (
                 <>
                    <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Detected Keyword Gaps</h3>
                    <div className="flex flex-wrap gap-2 mb-8">
                        {result.missingKeywords.length > 0 ? (
                        result.missingKeywords.map((keyword, idx) => (
                            <div 
                            key={idx} 
                            className={`group relative px-3 py-1.5 rounded-lg border text-sm font-medium cursor-help transition-all duration-300 hover:scale-110 opacity-0 animate-pop
                                ${darkMode ? 'bg-red-900/20 text-red-300 border-red-800/50' : 'bg-red-50 text-red-600 border-red-100'}
                            `}
                            style={{ animationDelay: `${0.3 + (idx * 0.05)}s` }}
                            >
                            + {keyword}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 bg-black/90 backdrop-blur text-white text-xs p-2 rounded shadow-xl z-20 animate-fade-in pointer-events-none">
                                Add this to Experience or Skills section.
                            </div>
                            </div>
                        ))
                        ) : (
                        <span className="text-emerald-600 font-medium flex items-center animate-pop">
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            Perfect Keyword Match!
                        </span>
                        )}
                    </div>
                    
                    <div className="border-t pt-6 border-slate-200/20">
                        <div className="space-y-6">
                            {/* Roast Section */}
                            <div className="bg-red-50 border-l-2 border-red-500 p-6 rounded-r-lg shadow-sm transition-transform hover:translate-x-1 relative group">
                            <button 
                                onClick={() => copyToClipboard(result.managerRoast, 'roast')}
                                className="absolute top-2 right-2 p-1.5 rounded-md text-red-400 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy"
                            >
                                {copiedRoast ? <span className="text-xs font-bold">Copied!</span> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                            </button>
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div className="ml-4">
                                <h3 className="text-lg font-bold text-red-800">Hiring Manager's Roast</h3>
                                <p className="mt-2 text-red-700 italic font-serif leading-relaxed">
                                    "<TypewriterText text={result.managerRoast} delay={10} />"
                                </p>
                                </div>
                            </div>
                            </div>

                            {/* Fix Strategy Section */}
                            <div className="bg-emerald-50 border-l-2 border-emerald-500 p-6 rounded-r-lg shadow-sm transition-transform hover:translate-x-1 relative group">
                            <button 
                                onClick={() => copyToClipboard(result.fixStrategy, 'fix')}
                                className="absolute top-2 right-2 p-1.5 rounded-md text-emerald-600 hover:bg-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy"
                            >
                                {copiedFix ? <span className="text-xs font-bold">Copied!</span> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                            </button>
                            <div className="flex items-start">
                                <div className="flex-shrink-0 pt-1">
                                <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div className="ml-4 w-full">
                                <h3 className="text-lg font-bold text-emerald-800">The Fix Strategy</h3>
                                <div className="mt-2 text-emerald-700 text-sm leading-relaxed markdown-content">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({node, ...props}) => <h3 className="text-base font-bold text-emerald-900 mt-4 mb-2 uppercase tracking-wide border-b border-emerald-200 pb-1" {...props} />,
                                            h2: ({node, ...props}) => <h4 className="text-sm font-bold text-emerald-900 mt-3 mb-2 uppercase" {...props} />,
                                            h3: ({node, ...props}) => <h5 className="text-sm font-bold text-emerald-800 mt-2 mb-1" {...props} />,
                                            ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 space-y-1 mb-2" {...props} />,
                                            ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 space-y-1 mb-2" {...props} />,
                                            li: ({node, ...props}) => <li className="pl-1 marker:text-emerald-500" {...props} />,
                                            strong: ({node, ...props}) => <span className="font-bold text-emerald-900" {...props} />,
                                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                        }}
                                    >
                                        {result.fixStrategy}
                                    </ReactMarkdown>
                                </div>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                 </>
             )}

             {activeTab === 'interview' && (
                <div className="animate-fade-in space-y-6">
                    <div className={`p-4 rounded-lg border-l-4 border-indigo-500 ${darkMode ? 'bg-indigo-900/20 text-indigo-200' : 'bg-indigo-50 text-indigo-800'}`}>
                        <h4 className="font-bold text-lg mb-1 flex items-center">
                            <span className="text-2xl mr-2">🤖</span> The Nemesis Interview
                        </h4>
                        <p className="text-sm opacity-90">Based on your resume gaps and the persona you selected, expect these questions to come up.</p>
                    </div>

                    {result.interviewPrep?.map((item, idx) => (
                        <div key={idx} className={`p-6 rounded-xl border transition-all duration-300 hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                    {idx + 1}
                                </div>
                                <div>
                                    <h5 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                        "{item.question}"
                                    </h5>
                                    
                                    <div className="mb-4">
                                        <span className={`text-xs font-bold uppercase tracking-wide opacity-50 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Why they are asking:</span>
                                        <p className={`text-sm mt-1 italic ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {item.context}
                                        </p>
                                    </div>

                                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-100'}`}>
                                        <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">Pro Tip (STAR Method):</span>
                                        <p className={`text-sm mt-1 ${darkMode ? 'text-emerald-200' : 'text-emerald-800'}`}>
                                            {item.idealAnswer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             )}

             {activeTab === 'headshot' && (
                 <div className="animate-fade-in flex flex-col items-center justify-center min-h-[300px]">
                     {!headshotFile ? (
                         <div className="text-center p-8 border-2 border-dashed rounded-2xl border-slate-300 dark:border-slate-600 hover:border-indigo-500 transition-colors">
                             <div className="mb-4 text-6xl">📸</div>
                             <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Upload LinkedIn Headshot</h3>
                             <p className="text-sm text-slate-500 mb-6">Let the {persona} analyze your vibe.</p>
                             <input type="file" accept="image/*" onChange={handleHeadshotUpload} className="hidden" id="headshot-upload" />
                             <label htmlFor="headshot-upload" className="cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-full font-bold hover:bg-indigo-700 transition-colors">Select Photo</label>
                         </div>
                     ) : (
                        <div className="w-full max-w-md">
                            <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-white shadow-xl mb-6">
                                <img src={headshotFile} alt="Headshot" className="w-full h-full object-cover" />
                                {isRoastingHeadshot && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    </div>
                                )}
                            </div>
                            
                            {headshotRoast && (
                                <div className={`p-6 rounded-xl border relative ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
                                        {persona} says...
                                    </div>
                                    <p className={`text-center italic ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>"{headshotRoast}"</p>
                                    <button onClick={() => setHeadshotFile(null)} className="block mx-auto mt-4 text-xs text-slate-500 hover:text-red-500">Remove & Try Another</button>
                                </div>
                            )}
                        </div>
                     )}
                 </div>
             )}

             {activeTab === 'roadmap' && (
                 <div className="animate-fade-in space-y-6">
                    <div className={`p-4 rounded-lg border-l-4 border-indigo-500 ${darkMode ? 'bg-indigo-900/20 text-indigo-200' : 'bg-indigo-50 text-indigo-800'}`}>
                        <h4 className="font-bold text-lg mb-1 flex items-center">
                            <span className="text-2xl mr-2">🗺️</span> Skill Gap Roadmap
                        </h4>
                        <p className="text-sm opacity-90">A 1-week crash course plan to fill your missing keywords.</p>
                    </div>

                    {isGeneratingRoadmap ? (
                        <div className="py-20 flex flex-col items-center">
                             <svg className="animate-spin h-10 w-10 text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             <p className="text-slate-500 animate-pulse">Designing your curriculum...</p>
                        </div>
                    ) : roadmap.length === 0 ? (
                        <div className="text-center py-10">
                            <p>No major skill gaps detected! You are ready to apply.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {roadmap.map((item, idx) => (
                                <div key={idx} className={`p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-start ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                     <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${item.priority === 'High' ? 'bg-red-100 text-red-700' : item.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                         {item.priority} Priority
                                     </div>
                                     <div className="flex-1">
                                         <h4 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.skill}</h4>
                                         <p className={`mt-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{item.plan}</p>
                                     </div>
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