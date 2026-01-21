import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Analytics } from "@vercel/analytics/react";
import { AnalysisResult, AppStep, AnalysisInput, HistoryItem } from './types';
import { analyzeResumeWithGemini, generateCoverLetter } from './services/geminiService';
import InputSection from './components/InputSection';
import ResultsDashboard from './components/ResultsDashboard';
import ResumeEditor from './components/ResumeEditor';
import CoverLetterGenerator from './components/CoverLetterGenerator';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import JobTracker from './components/JobTracker';

const AnimatedBackground: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 transition-opacity duration-1000">
    <div className={`absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-drift ${darkMode ? 'bg-indigo-900/40 mix-blend-screen' : 'bg-indigo-200'}`}></div>
    <div className={`absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-drift-slow animation-delay-2000 ${darkMode ? 'bg-purple-900/40 mix-blend-screen' : 'bg-purple-200'}`}></div>
    <div className={`absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-drift animation-delay-4000 ${darkMode ? 'bg-blue-900/40 mix-blend-screen' : 'bg-pink-200'}`}></div>
  </div>
);

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const enterTimer = requestAnimationFrame(() => setIsVisible(true));
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
    }, 3500); 

    const closeTimer = setTimeout(onClose, 4000);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);
  
  const styles = { 
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10', 
    error: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 shadow-red-500/10', 
    info: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-indigo-500/10' 
  };
  const icon = {
    success: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    error: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    info: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  };

  return (
    <div className={`glass-panel px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-3 transition-all duration-500 ease-out transform ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'} cursor-pointer backdrop-blur-md ${styles[type]}`}>
      <span className="shrink-0">{icon[type]}</span>
      <span className="font-semibold text-sm tracking-wide">{message}</span>
      <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 animate-[shimmer_4s_linear] w-full"></div>
    </div>
  );
};

const ConfirmationModal: React.FC<{ isOpen: boolean; onConfirm: () => void; onCancel: () => void }> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-fade-in">
      <div className="glass-panel rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-5 mx-auto shadow-lg shadow-red-500/20">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h3 className="text-xl font-bold mb-2 text-center text-slate-900 dark:text-white tracking-tight">Start New Analysis?</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center leading-relaxed">This will clear your current resume data and progress. <br/>Are you sure you want to proceed?</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="px-4 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 hover:-translate-y-0.5 active:scale-95">Yes, Clear</button>
        </div>
      </div>
    </div>
  );
};

const ScrollProgress = () => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setWidth(total / windowHeight);
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-[100] transition-all duration-100 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${width * 100}%` }} />;
};

const BackToTop = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const toggleVisibility = () => setVisible(window.pageYOffset > 300);
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={`fixed bottom-8 left-8 z-40 p-3 rounded-full bg-slate-900/90 text-white backdrop-blur-lg shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 transform hover:scale-110 active:scale-90 border border-white/10 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
    </button>
  );
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [inputData, setInputData] = useState<AnalysisInput | null>(null);
  const [coverLetterContent, setCoverLetterContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success'|'error'|'info'}[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showJobTracker, setShowJobTracker] = useState(false);

  const addToast = (message: string, type: 'success'|'error'|'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); document.body.style.backgroundColor = '#020617'; } 
    else { document.documentElement.classList.remove('dark'); document.body.style.backgroundColor = '#f8fafc'; }
  }, [darkMode]);

  useEffect(() => {
    const saved = localStorage.getItem('careerStealth_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.result && parsed.step) {
          setResult(parsed.result);
          setInputData(parsed.inputData);
          setCoverLetterContent(parsed.coverLetterContent || '');
          setStep(parsed.step === AppStep.ANALYZING ? AppStep.INPUT : parsed.step); 
          addToast('Session restored successfully', 'info');
        }
      } catch (e) { console.error("Restore failed", e); }
    }
  }, []);

  useEffect(() => {
    if (result && step !== AppStep.INPUT && step !== AppStep.PRIVACY && step !== AppStep.TERMS && step !== AppStep.ERROR) {
       localStorage.setItem('careerStealth_data', JSON.stringify({ result, step, inputData, coverLetterContent }));
    }
  }, [result, step, inputData, coverLetterContent]);

  const handleAnalyze = async (data: AnalysisInput) => {
    setStep(AppStep.ANALYZING);
    setInputData(data);
    setError(null);
    try {
      const res = await analyzeResumeWithGemini(data);
      setResult(res);
      setStep(AppStep.RESULTS);
      addToast('Resume analysis complete!', 'success');
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setStep(AppStep.ERROR);
      addToast(err.message || "Analysis failed", 'error');
    }
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = () => {
    setResult(null);
    setInputData(null);
    setStep(AppStep.INPUT);
    localStorage.removeItem('careerStealth_data');
    setShowResetModal(false);
    addToast('Ready for a new analysis', 'info');
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setInputData(item.inputData);
    setResult(item.result);
    setCoverLetterContent(item.coverLetter || '');
    setStep(AppStep.RESULTS);
    addToast(`Loaded profile for ${item.companyName}`, 'success');
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans relative overflow-x-hidden`}>
      <Analytics />
      <ScrollProgress />
      
      {/* Background with Toggle Awareness */}
      <AnimatedBackground darkMode={darkMode} />

      {/* Floating Island Navbar - HIDDEN IN EDITOR MODE */}
      {step !== AppStep.EDITOR && (
        <div className="fixed top-6 left-0 w-full z-50 flex justify-center px-4 pointer-events-none">
          <nav className={`nav-island pointer-events-auto rounded-full px-5 py-3 flex items-center justify-between w-full max-w-5xl transition-all duration-300 animate-slide-up shadow-xl`}>
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => step !== AppStep.ANALYZING && setStep(AppStep.INPUT)}>
              <span className="text-xl md:text-2xl group-hover:scale-110 transition-transform duration-300">🚀</span>
              <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">CareerStealth</span>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => setShowJobTracker(true)}
                className={`hidden md:flex items-center px-4 py-2 rounded-full text-xs font-bold transition-all border group active:scale-95 ${darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="mr-2 group-hover:rotate-12 transition-transform">📂</span> Tracker
              </button>
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className={`p-2.5 rounded-full transition-all active:scale-90 hover:rotate-45 duration-500 ${darkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-indigo-600'}`}
              >
                {darkMode ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content Area - ADAPTIVE LAYOUT */}
      <main className={step === AppStep.EDITOR ? 'relative z-10 w-full h-full' : 'pt-32 pb-12 relative z-10 px-4 max-w-7xl mx-auto min-h-[calc(100vh-200px)]'}>
        {step === AppStep.INPUT && (
          <InputSection 
            onAnalyze={handleAnalyze} 
            isAnalyzing={false} 
            darkMode={darkMode}
            addToast={addToast}
          />
        )}

        {step === AppStep.ANALYZING && (
           <InputSection 
            onAnalyze={() => {}} 
            isAnalyzing={true} 
            darkMode={darkMode}
            addToast={addToast}
          />
        )}

        {step === AppStep.RESULTS && result && (
          <ResultsDashboard 
            result={result} 
            onReset={handleReset} 
            onEdit={() => setStep(AppStep.EDITOR)} 
            onGenerateCoverLetter={async () => {
              if (!coverLetterContent) {
                try {
                  addToast("Drafting cover letter...", "info");
                  const letter = await generateCoverLetter(result.structuredResume, inputData?.jobDescription || "");
                  setCoverLetterContent(letter);
                  setStep(AppStep.COVER_LETTER);
                } catch(e) { addToast("Failed to generate letter", "error"); }
              } else {
                setStep(AppStep.COVER_LETTER);
              }
            }}
            darkMode={darkMode}
            addToast={addToast}
            jobDescription={inputData?.jobDescription}
            persona={inputData?.persona}
          />
        )}

        {step === AppStep.EDITOR && result && inputData && (
          <ResumeEditor 
            initialData={result.structuredResume} 
            jobDescription={inputData.jobDescription}
            onBack={() => setStep(AppStep.RESULTS)} 
            darkMode={darkMode}
            toggleDarkMode={() => setDarkMode(!darkMode)}
            addToast={addToast}
            missingKeywords={result.missingKeywords}
          />
        )}

        {step === AppStep.COVER_LETTER && (
          <CoverLetterGenerator 
            content={coverLetterContent} 
            onBack={() => setStep(AppStep.RESULTS)} 
            darkMode={darkMode}
          />
        )}

        {step === AppStep.ERROR && (
           <div className="flex flex-col items-center justify-center py-32 animate-fade-in glass-panel rounded-3xl mx-auto max-w-2xl text-center p-12">
             <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-5xl mb-6 shadow-xl shadow-red-500/10 animate-shake">😵</div>
             <h2 className={`text-3xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Analysis Failed</h2>
             <p className={`max-w-md text-center mb-8 opacity-70 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{error}</p>
             <button onClick={() => setStep(AppStep.INPUT)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/50 transition-all hover:-translate-y-1 active:scale-95">Try Again</button>
           </div>
        )}
        
        {step === AppStep.PRIVACY && <PrivacyPolicy darkMode={darkMode} onBack={() => setStep(AppStep.INPUT)} />}
        {step === AppStep.TERMS && <TermsOfService darkMode={darkMode} onBack={() => setStep(AppStep.INPUT)} />}
      </main>

      {/* Modern Footer - HIDDEN IN EDITOR MODE */}
      {step !== AppStep.EDITOR && (
        <footer className={`py-12 relative z-10 border-t ${darkMode ? 'border-white/5' : 'border-slate-200/50'}`}>
          <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-indigo-500 font-bold mb-4">Powered by Gemini 3</p>
              
              <div className={`flex items-center justify-center gap-2 mb-8 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span>Made with ❤️ by</span>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Mustafa Miyaji</span>
                  <a 
                      href="https://www.linkedin.com/in/mustafa-alimiyaji-195742327/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#0077b5] hover:scale-110 transition-transform inline-flex"
                  >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  </a>
              </div>

              <div className={`flex justify-center gap-6 mb-6 text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <button onClick={() => setStep(AppStep.PRIVACY)} className="hover:text-indigo-500 transition-colors">Privacy Policy</button>
                  <button onClick={() => setStep(AppStep.TERMS)} className="hover:text-indigo-500 transition-colors">Terms of Service</button>
              </div>

              <p className={`text-xs opacity-60 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>© 2026 CareerStealth.</p>
          </div>
        </footer>
      )}

      {/* Job Tracker Sidebar */}
      <JobTracker 
         isOpen={showJobTracker} 
         onClose={() => setShowJobTracker(false)} 
         onLoadHistory={loadHistoryItem}
         currentData={result && inputData ? { input: inputData, result } : undefined}
         darkMode={darkMode}
      />

      {/* Modals & Toasts */}
      <ConfirmationModal isOpen={showResetModal} onConfirm={confirmReset} onCancel={() => setShowResetModal(false)} />
      <div className="fixed top-24 right-4 z-[110] flex flex-col gap-3 pointer-events-none p-4">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
             <Toast message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
          </div>
        ))}
      </div>
      <BackToTop />
    </div>
  );
};

export default App;