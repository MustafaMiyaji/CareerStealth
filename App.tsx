import React, { useState, useCallback, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AnalysisResult, AppStep, AnalysisInput, HistoryItem } from './types';
import { analyzeResumeWithGemini, generateCoverLetter } from './services/geminiService';
import InputSection from './components/InputSection';
import ResultsDashboard from './components/ResultsDashboard';
import ResumeEditor from './components/ResumeEditor';
import CoverLetterGenerator from './components/CoverLetterGenerator';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import JobTracker from './components/JobTracker';

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', info: 'bg-blue-500' };
  return (
    <div className={`fixed top-4 right-4 z-50 ${colors[type]} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center animate-slide-up hover:scale-105 transition-transform`}>
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 hover:bg-white/20 rounded-full p-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
    </div>
  );
};

const ConfirmationModal: React.FC<{ isOpen: boolean; onConfirm: () => void; onCancel: () => void }> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Start New Analysis?</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6">This will clear your current resume data and progress.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-bold shadow-lg shadow-red-500/30">Yes, Clear</button>
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
  return <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-50 transition-all duration-100" style={{ width: `${width * 100}%` }} />;
};

const BackToTop = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const toggleVisibility = () => setVisible(window.pageYOffset > 300);
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={`fixed bottom-8 left-8 z-40 p-3 rounded-full bg-slate-900/80 text-white backdrop-blur shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showJobTracker, setShowJobTracker] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { setMousePos({ x: e.clientX, y: e.clientY }); };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const addToast = (message: string, type: 'success'|'error'|'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); document.body.style.backgroundColor = '#0f172a'; } 
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
          addToast('Session restored', 'success');
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
      addToast('Analysis complete!', 'success');
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
    addToast('Started new session', 'info');
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setInputData(item.inputData);
    setResult(item.result);
    setCoverLetterContent(item.coverLetter || '');
    setStep(AppStep.RESULTS);
    addToast(`Loaded ${item.companyName}`, 'success');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <ScrollProgress />
      
      {/* Background Gradient Blob */}
      <div 
        className="fixed pointer-events-none w-[500px] h-[500px] rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-3xl transition-transform duration-1000 z-0"
        style={{ left: mousePos.x - 250, top: mousePos.y - 250 }}
      />

      {/* Header/Nav */}
      <nav className={`fixed top-0 left-0 w-full z-40 backdrop-blur-md border-b transition-colors duration-300 ${darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer" onClick={() => step !== AppStep.ANALYZING && setStep(AppStep.INPUT)}>
              <span className="text-2xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">CareerStealth</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowJobTracker(true)}
                className="hidden md:flex items-center px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-50 text-indigo-600 border border-indigo-100 transition-colors"
              >
                 <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 Job Tracker
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-12 relative z-10">
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
           <div className="text-center py-20">
             <div className="text-6xl mb-4">😵</div>
             <h2 className="text-2xl font-bold mb-2">Analysis Failed</h2>
             <p className="text-red-500 mb-6">{error}</p>
             <button onClick={() => setStep(AppStep.INPUT)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Try Again</button>
           </div>
        )}
        
        {step === AppStep.PRIVACY && <PrivacyPolicy darkMode={darkMode} onBack={() => setStep(AppStep.INPUT)} />}
        {step === AppStep.TERMS && <TermsOfService darkMode={darkMode} onBack={() => setStep(AppStep.INPUT)} />}
      </main>

      {/* Footer */}
      <footer className={`py-8 text-center text-sm border-t ${darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
        <div className="mb-4">
           <p className="font-semibold text-indigo-500">Powered by Gemini 3</p>
           <p className="flex items-center justify-center gap-2 mt-1">
             Made with ❤️ by 
             <a href="https://github.com/MustafaMiyaji" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 font-bold transition-colors">Mustafa Miyaji</a>
             <a href="https://www.linkedin.com/in/mustafa-alimiyaji-195742327/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
           </p>
        </div>
        <div className="flex justify-center gap-6 mb-4">
          <button onClick={() => setStep(AppStep.PRIVACY)} className="hover:text-indigo-500 transition-colors">Privacy Policy</button>
          <button onClick={() => setStep(AppStep.TERMS)} className="hover:text-indigo-500 transition-colors">Terms of Service</button>
        </div>
        <p className="opacity-60 text-xs">© {new Date().getFullYear()} CareerStealth.</p>
      </footer>

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
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
             <Toast message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
          </div>
        ))}
      </div>
      <BackToTop />
      <Analytics />
    </div>
  );
};

export default App;