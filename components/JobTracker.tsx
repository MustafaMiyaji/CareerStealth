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
    // Load from local storage on mount
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
    
    // Extract company name heuristically from JD if possible, else "Unknown Company"
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
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={onClose} />
      )}
      
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 md:w-96 shadow-2xl transform transition-transform duration-300 z-[70] flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${darkMode ? 'bg-slate-900 border-l border-slate-700' : 'bg-white'}`}>
        <div className="p-4 border-b flex justify-between items-center bg-indigo-600 text-white">
          <h2 className="font-bold text-lg flex items-center">
             <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
             Job Tracker
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
           <button 
             onClick={saveCurrent} 
             disabled={!currentData}
             className={`w-full py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${!currentData ? 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'}`}
           >
             <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
             Save Current Application
           </button>
           {!currentData && <p className="text-xs text-center mt-2 opacity-50">Run an analysis first to save.</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {history.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                    <p className="text-4xl mb-2">📂</p>
                    <p>No saved applications yet.</p>
                </div>
            ) : (
                history.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => { onLoadHistory(item); onClose(); }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] relative group ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-300 shadow-sm'}`}
                    >
                        <button 
                            onClick={(e) => deleteItem(item.id, e)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h3 className={`font-bold text-sm truncate pr-6 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{item.companyName}</h3>
                        <p className={`text-xs truncate mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.role}</p>
                        <div className="flex justify-between items-end">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.result.score > 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>Score: {item.result.score}</span>
                            <span className="text-[10px] opacity-50">{new Date(item.timestamp).toLocaleDateString()}</span>
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