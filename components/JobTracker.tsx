import React, { useEffect, useState } from 'react';
import { HistoryItem, AnalysisResult, AnalysisInput } from '../types';

interface JobTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadHistory: (item: HistoryItem) => void;
  currentData?: { input: AnalysisInput; result: AnalysisResult };
  darkMode: boolean;
}

const JobTracker: React.FC<JobTrackerProps> = ({ isOpen, onClose, onLoadHistory, currentData, darkMode }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('careerStealth_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveCurrent = () => {
    if (!currentData) return;
    const { input, result } = currentData;
    
    const companyMatch = input.jobDescription.match(/(?:at|for) ([A-Z][a-z]+(?: [A-Z][a-z]+)*)/);
    const companyName = companyMatch ? companyMatch[1] : "Unknown Company";

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      companyName: companyName,
      role: result.structuredResume.title || "Target Role",
      inputData: input,
      result: result
    };

    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    localStorage.setItem('careerStealth_history', JSON.stringify(newHistory));
  };

  const deleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('careerStealth_history', JSON.stringify(newHistory));
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose} 
      />
      
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 md:w-96 shadow-2xl transform transition-transform duration-300 ease-out z-[70] flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${darkMode ? 'bg-slate-900/95 border-l border-slate-700' : 'bg-white/95 border-l border-white/20'} backdrop-blur-xl`}>
        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md z-10">
          <h2 className="font-bold text-lg flex items-center tracking-tight">
             <div className="bg-white/20 p-1.5 rounded-lg mr-3 backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
             </div>
             Application Tracker
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className={`p-6 border-b z-10 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/80'}`}>
           <button 
             onClick={saveCurrent} 
             disabled={!currentData}
             className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center shadow-lg active:scale-95 ${!currentData ? 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/25 hover:-translate-y-0.5'}`}
           >
             <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
             Save Current Analysis
           </button>
           {!currentData && <p className="text-[10px] text-center mt-3 font-medium opacity-50 uppercase tracking-wide">Run an analysis first to save</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-40">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <span className="text-4xl grayscale">📂</span>
                    </div>
                    <p className="font-bold">No saved applications</p>
                    <p className="text-xs mt-1">Your history will appear here</p>
                </div>
            ) : (
                history.map((item, idx) => (
                    <div 
                        key={item.id} 
                        onClick={() => { onLoadHistory(item); onClose(); }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] relative group animate-slide-up ${darkMode ? 'bg-slate-800/60 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                        <button 
                            onClick={(e) => deleteItem(item.id, e)}
                            className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-slate-900 rounded-full shadow-sm hover:scale-110"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        
                        <div className="flex items-start justify-between mb-1">
                            <h3 className={`font-bold text-sm truncate pr-8 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{item.companyName}</h3>
                        </div>
                        
                        <p className={`text-xs truncate mb-3 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.role}</p>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 dark:border-slate-700/50">
                            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${item.result.score >= 75 ? 'bg-emerald-100 text-emerald-700' : item.result.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                <span>Score:</span>
                                <span className="text-sm">{item.result.score}</span>
                            </div>
                            <span className="text-[10px] font-mono opacity-40">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </>
  );
};

export default JobTracker;