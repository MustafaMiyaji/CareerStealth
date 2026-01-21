import React, { useState, useRef, useEffect } from 'react';
import { AnalysisInput, HiringPersona } from '../types';
import mammoth from 'mammoth';

interface InputSectionProps {
  onAnalyze: (data: AnalysisInput) => void;
  isAnalyzing: boolean;
  darkMode: boolean;
  addToast: (msg: string, type: 'success'|'error'|'info') => void;
}

const PERSONAS: { id: string; label: string; icon: string; desc: string }[] = [
  { id: 'Standard', label: 'Balanced', icon: '⚖️', desc: 'Standard ATS & Human review.' },
  { id: 'Senior DevOps Manager', label: 'DevOps Lead', icon: '🐳', desc: 'Obsessed with uptime, CI/CD, and clouds.' },
  { id: 'Startup Recruiter', label: 'Startup', icon: '🚀', desc: 'Values speed, impact, & culture.' },
  { id: 'Corporate HR', label: 'Corp HR', icon: '🏢', desc: 'Strict keyword & formatting check.' },
  { id: 'Ruthless Tech Lead', label: 'Tech Lead', icon: '💻', desc: 'Technical depth, harsh on fluff.' },
  { id: 'Custom', label: 'Custom', icon: '✨', desc: 'Define your own hiring manager.' },
];

const LOADING_TIPS = [
  "Tip: Quantifying achievements increases interview chances by 40%.",
  "Tip: ATS systems often struggle with columns and graphics.",
  "Tip: Hiring managers spend avg. 6 seconds on a resume.",
  "Tip: Tailoring keywords is the #1 way to beat the bot.",
  "Tip: Use active voice (e.g., 'Led' not 'Was responsible for')."
];

const InputSection: React.FC<InputSectionProps> = ({ onAnalyze, isAnalyzing, darkMode, addToast }) => {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState<{data: string, mimeType: string, fileName: string} | undefined>(undefined);
  const [persona, setPersona] = useState<string>('Standard');
  const [customPersonaText, setCustomPersonaText] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [extractionPreview, setExtractionPreview] = useState<string | null>(null);
  const [currentTip, setCurrentTip] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [shake, setShake] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cycle tips during loading
  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setCurrentTip(prev => (prev + 1) % LOADING_TIPS.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPersona = persona === 'Custom' ? customPersonaText.trim() : persona;

    if (!selectedPersona && persona === 'Custom') {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        addToast("Please describe your custom persona.", "error");
        return;
    }

    if ((resumeText.trim() || resumeFile) && jobDescription.trim()) {
      onAnalyze({ resumeText, resumeFile, jobDescription, persona: selectedPersona });
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      addToast("Please upload a resume and paste a job description.", "error");
    }
  };

  const loadDemoData = () => {
    if (isAnalyzing) return;
    setResumeText("Experienced Software Engineer with 5 years in React and Node.js. Built scalable apps.");
    setJobDescription("We are looking for a Senior Frontend Developer with React, TypeScript, and AWS experience. Must be a team player.");
    setPersona('Ruthless Tech Lead');
    addToast("Demo data loaded!", "info");
  };

  const handleDrag = (e: React.DragEvent) => {
    if (isAnalyzing) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (isAnalyzing) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAnalyzing) return;
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    if (isAnalyzing) return;
    setIsProcessingFile(true);
    setResumeFile(undefined);
    setExtractionPreview(null);
    setResumeText('');

    try {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          setResumeFile({
            data: base64Data,
            mimeType: 'application/pdf',
            fileName: file.name
          });
          setIsProcessingFile(false);
          addToast("PDF processed successfully", "success");
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setResumeText(result.value); 
        const plainText = result.value.replace(/<[^>]*>/g, ' ');
        setExtractionPreview(plainText.substring(0, 300) + "...");
        setIsProcessingFile(false);
        addToast("DOCX content extracted", "success");
      } else if (file.type === 'text/plain') {
        const text = await file.text();
        setResumeText(text);
        setExtractionPreview(text.substring(0, 300) + "...");
        setIsProcessingFile(false);
      } else {
        addToast("Unsupported file type. Please upload PDF, DOCX, or TXT.", "error");
        setIsProcessingFile(false);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      addToast("Failed to process file. Please try again.", "error");
      setIsProcessingFile(false);
    }
  };

  const clearFile = () => {
    if (isAnalyzing) return;
    setResumeFile(undefined);
    setResumeText('');
    setExtractionPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full mx-auto pb-16">
      {/* Hero Section */}
      <div className="text-center mb-16 animate-fade-in relative pt-16">
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 leading-none">
          <span className={darkMode ? 'text-white' : 'text-slate-900'}>Career</span><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Stealth</span>
        </h1>
        <p className={`text-xl md:text-2xl font-medium mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Bypass the ATS and decode the Hiring Manager's mind.
        </p>
        <p className={`text-lg opacity-90 max-w-2xl mx-auto leading-relaxed px-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Upload your resume, paste the JD, and let AI do the heavy lifting.
        </p>
        <div className="mt-8 flex justify-center gap-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
           <button 
             onClick={loadDemoData} 
             disabled={isAnalyzing}
             className={`text-sm px-6 py-2.5 rounded-full font-bold transition-all border ${darkMode ? 'text-slate-300 border-slate-700 hover:bg-slate-800' : 'text-slate-600 border-slate-300 hover:bg-slate-50'}`}
           >
             Try with Demo Data →
           </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto ${shake ? 'animate-shake' : ''}`}>
        
        {/* RESUME SECTION */}
        <div className="space-y-4 opacity-0 animate-slide-up relative group z-10" style={{ animationDelay: '0.3s' }}>
          <div className="flex justify-between items-center mb-2 px-1">
             <label className={`block text-xs font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
               01. Upload Resume
             </label>
             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-white/50 border-slate-200 text-slate-500'}`}>PDF / DOCX / TXT</span>
          </div>
          
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
            relative w-full h-[400px] rounded-[2rem] border-2 border-dashed transition-all duration-300 overflow-hidden flex flex-col backdrop-blur-sm
            ${dragActive ? 'border-indigo-500 bg-indigo-500/5 scale-[1.02] shadow-2xl' : ''}
            ${resumeFile ? 'border-indigo-500/30 bg-indigo-500/5' : darkMode ? 'border-slate-800 bg-slate-900/40 hover:border-slate-600' : 'border-slate-300/60 bg-white/40 hover:border-indigo-300 hover:bg-white/60'}
            ${isAnalyzing ? 'opacity-60 pointer-events-none grayscale-[0.5]' : ''}
          `}>
            
            {/* File Upload Overlay */}
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              disabled={isAnalyzing}
            />

            {/* SCANNING ANIMATION BEAM */}
            {isAnalyzing && (
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[2rem]">
                <div className="w-full h-1 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.8)] absolute top-0 animate-scan"></div>
              </div>
            )}
            
            {resumeFile || extractionPreview || resumeText ? (
                <div className="h-full flex flex-col">
                    <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-indigo-500/10 bg-indigo-500/5' : 'border-indigo-100 bg-indigo-50/50'}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                                <span className="text-xs font-bold">{resumeFile?.mimeType.includes('pdf') ? 'PDF' : 'DOC'}</span>
                             </div>
                             <div className="min-w-0">
                                <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{resumeFile?.fileName || "Pasted Text"}</p>
                                <p className="text-xs text-indigo-500 font-medium">Ready for analysis</p>
                             </div>
                        </div>
                        <button 
                            type="button"
                            onClick={clearFile}
                            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-slate-400"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    {resumeFile ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                             <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ4LCAxNjMsIDE4NCwgMC4xNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none"></div>
                             <div className="w-24 h-32 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 shadow-2xl relative mb-6 rotate-3 transition-transform group-hover:rotate-0 hover:scale-110 duration-500">
                                 <div className="absolute top-0 right-0 w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-bl-xl border-l border-b border-slate-200 dark:border-slate-600"></div>
                                 <span className="text-4xl filter drop-shadow-sm">📄</span>
                             </div>
                             <p className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Visual Analysis Enabled</p>
                             <p className="text-xs text-slate-400 mt-1">We'll scan layout and structure.</p>
                        </div>
                    ) : (
                        <textarea
                            value={resumeText}
                            onChange={(e) => { setResumeText(e.target.value); setExtractionPreview(null); setResumeFile(undefined); }}
                            className={`flex-1 w-full p-6 resize-none font-mono text-xs leading-relaxed outline-none bg-transparent custom-scrollbar ${darkMode ? 'text-slate-300 placeholder:text-slate-700' : 'text-slate-600 placeholder:text-slate-300'}`}
                            placeholder="// Paste your resume text content here..."
                        />
                    )}
                </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="h-full flex flex-col items-center justify-center cursor-pointer group/upload"
              >
                  <div className="relative">
                      <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl group-hover/upload:blur-2xl transition-all opacity-0 group-hover/upload:opacity-100"></div>
                      <div className="relative w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-6 transition-all duration-300 group-hover/upload:scale-110 group-hover/upload:bg-indigo-50 dark:group-hover/upload:bg-indigo-900/30 group-hover/upload:text-indigo-500 border border-transparent group-hover/upload:border-indigo-500/30">
                        <svg className="w-10 h-10 text-slate-400 group-hover/upload:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </div>
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Upload Resume</h3>
                  <p className={`text-sm mb-8 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Drag & drop or click to browse</p>
                  
                  <div className="w-full px-12 relative">
                     <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent mb-8"></div>
                     <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-3 text-[10px] text-slate-400 uppercase font-bold tracking-widest">OR</div>
                     <textarea
                        value={resumeText}
                        onChange={(e) => {
                            setResumeText(e.target.value);
                            e.stopPropagation(); 
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full h-24 bg-transparent resize-none text-center text-sm outline-none font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600 ${darkMode ? 'text-white' : 'text-slate-800'}`}
                        placeholder="Paste text directly here"
                     />
                  </div>
              </div>
            )}
            
            {dragActive && (
              <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-md flex items-center justify-center z-20 animate-fade-in">
                 <div className="bg-white dark:bg-slate-800 px-8 py-6 rounded-3xl shadow-2xl transform scale-110 border-2 border-indigo-500 animate-pulse">
                    <p className="text-indigo-600 dark:text-indigo-400 font-black text-2xl tracking-tight">Drop File Now!</p>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* JOB DESCRIPTION SECTION */}
        <div className="space-y-4 opacity-0 animate-slide-up z-10" style={{ animationDelay: '0.4s' }}>
          <label className={`block text-xs font-black uppercase tracking-widest px-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            02. Target Job Description
          </label>
          <div className="relative group h-[400px]">
            <div className={`absolute -inset-0.5 rounded-[2rem] opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-md`}></div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={isAnalyzing}
              className={`relative w-full h-full p-8 rounded-[2rem] border transition-all duration-300 resize-none font-mono text-sm leading-relaxed custom-scrollbar
                ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-300 placeholder:text-slate-700' : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-300'}
                focus:outline-none focus:bg-white dark:focus:bg-slate-950 focus:border-transparent focus:shadow-inner
                ${isAnalyzing ? 'opacity-60 cursor-not-allowed grayscale-[0.5]' : ''}
              `}
              placeholder="// Paste the full job description here..."
              required
            />
            <div className={`absolute bottom-6 right-6 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider transition-all duration-300 ${jobDescription.length > 50 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {jobDescription.length} chars
            </div>
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div className="lg:col-span-2 space-y-10 opacity-0 animate-slide-up pt-12" style={{ animationDelay: '0.5s' }}>
           
           {/* Persona Selector */}
           <div className={`max-w-5xl mx-auto ${isAnalyzing ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
              <div className="text-center mb-8">
                <label className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    03. Select Hiring Persona
                </label>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 px-4">
                 {PERSONAS.map((p, idx) => (
                   <button
                     key={p.id}
                     type="button"
                     disabled={isAnalyzing}
                     onClick={() => setPersona(p.id)}
                     className={`
                       group relative flex flex-col items-center justify-center p-4 rounded-3xl border transition-all duration-300 h-32 animate-pop
                       ${persona === p.id 
                         ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500 scale-105' 
                         : darkMode 
                            ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800' 
                            : 'border-slate-200 bg-white/50 text-slate-500 hover:border-indigo-200 hover:bg-white hover:-translate-y-1 hover:shadow-lg'
                       }
                     `}
                     style={{ animationDelay: `${0.6 + (idx * 0.05)}s` }}
                   >
                      <span className="text-3xl sm:text-4xl mb-3 filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">{p.icon}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight uppercase tracking-wide">{p.label}</span>
                   </button>
                 ))}
              </div>
              
              <div className="h-20 mt-8 flex justify-center items-center px-4">
                {persona === 'Custom' ? (
                    <div className="w-full max-w-md animate-scale-in relative">
                        <input 
                            type="text"
                            value={customPersonaText}
                            onChange={(e) => setCustomPersonaText(e.target.value)}
                            disabled={isAnalyzing}
                            placeholder="e.g. 'Skeptical VP of Engineering'"
                            className={`w-full px-6 py-4 rounded-full border text-sm font-bold text-center outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-lg ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'}`}
                            autoFocus
                        />
                    </div>
                ) : (
                    <div className="glass-panel px-6 py-3 rounded-full animate-fade-in shadow-sm max-w-lg transition-all hover:scale-105">
                        <p className={`text-center text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {PERSONAS.find(p => p.id === persona)?.desc}
                        </p>
                    </div>
                )}
              </div>
           </div>

           {/* Submit Action */}
           <div className="flex flex-col items-center justify-center pt-8 pb-12">
            <button
              type="submit"
              disabled={isAnalyzing || isProcessingFile || (!resumeText && !resumeFile) || !jobDescription}
              className={`
                relative group overflow-hidden px-12 py-6 rounded-full text-xl font-black text-white shadow-2xl transition-all duration-300
                ${(isAnalyzing || isProcessingFile) 
                  ? 'bg-slate-500 cursor-not-allowed scale-95 opacity-80' 
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:scale-105 hover:shadow-indigo-500/40 active:scale-95'
                }
              `}
            >
              <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 -skew-x-12 transform origin-left"></div>
              
              {isAnalyzing ? (
                <span className="flex items-center justify-center relative z-10 gap-3">
                  <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Deconstructing Resume...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center relative z-10 gap-3 tracking-wide">
                   Run Stealth Analysis <span className="text-2xl group-hover:rotate-12 transition-transform filter drop-shadow-md">🚀</span>
                </span>
              )}
            </button>
            
            {isAnalyzing && (
              <div className="mt-12 flex flex-col items-center animate-fade-in w-full max-w-md px-4">
                <p className="text-sm font-bold text-indigo-500 mb-4 animate-pulse text-center bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-lg">
                   <span className="mr-2">💡</span> {LOADING_TIPS[currentTip]}
                </p>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-[shimmer_1.5s_linear_infinite]" style={{ width: '50%', backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default InputSection;