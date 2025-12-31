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
  { id: 'Ruthless Tech Lead', label: 'Tech Lead', icon: '💻', desc: 'Technical depth, harsh on fluff.' },
  { id: 'Chill Startup Founder', label: 'Founder', icon: '🚀', desc: 'Values speed, impact, & culture.' },
  { id: 'Corporate HR', label: 'Corp HR', icon: '🏢', desc: 'Strict keyword & formatting check.' },
  { id: 'Nitpicky Senior Dev', label: 'Senior Dev', icon: '🧐', desc: 'Catches every tiny mistake.' },
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
        const result = await mammoth.extractRawText({ arrayBuffer });
        setResumeText(result.value);
        setExtractionPreview(result.value.substring(0, 300) + "...");
        setIsProcessingFile(false);
        addToast("DOCX text extracted", "success");
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
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10 animate-fade-in">
        <h1 className={`text-4xl md:text-6xl font-extrabold tracking-tight mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Career<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-shimmer">Stealth</span>
        </h1>
        <p className={`text-base md:text-lg max-w-2xl mx-auto transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Bypass the ATS and decode the Hiring Manager's mind. <br className="hidden md:block"/>
          Upload your resume, paste the JD, and let AI do the heavy lifting.
        </p>
        <div className="mt-4 flex justify-center gap-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
           <button 
             onClick={loadDemoData} 
             disabled={isAnalyzing}
             className={`text-xs px-3 py-1 rounded border border-indigo-300 text-indigo-500 hover:bg-indigo-50 transition-colors ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
             Use Demo Data
           </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${shake ? 'animate-shake' : ''}`}>
        
        {/* RESUME SECTION */}
        <div className="space-y-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex justify-between items-end">
             <label className={`block text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
               1. Your Resume
             </label>
             <span className={`text-xs px-2 py-1 rounded-full font-mono ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>PDF / DOCX / TXT</span>
          </div>
          
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
            relative group w-full h-64 md:h-80 rounded-2xl border border-dashed transition-all duration-300 overflow-hidden flex flex-col hover-card
            ${dragActive ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : ''}
            ${resumeFile ? 'border-indigo-500 bg-indigo-50/10' : darkMode ? 'border-slate-700 bg-slate-800 hover:border-indigo-500' : 'border-slate-300 bg-white hover:border-indigo-400'}
            ${isAnalyzing ? 'opacity-60 pointer-events-none grayscale-[0.5]' : ''}
          `}>
            
            {/* File Upload Overlay */}
            <div className={`flex-none p-4 border-b flex items-center justify-between transition-colors ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                disabled={isAnalyzing}
              />
              
              {resumeFile || extractionPreview || resumeText ? (
                <div className="flex items-center w-full animate-pop">
                  <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-3 shadow-sm">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" /><path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0 mr-2">
                     <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                       {resumeFile?.fileName || "Pasted Text / Extracted"}
                     </p>
                     <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                       {resumeFile ? "PDF Analysis Mode" : "Text Analysis Mode"}
                     </p>
                  </div>
                  <button 
                    type="button"
                    onClick={clearFile}
                    disabled={isAnalyzing}
                    className="text-slate-400 hover:text-red-500 p-1 transition-colors hover:scale-110 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <div className="w-full flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    Upload Resume
                  </button>
                  {isProcessingFile && <span className="text-xs text-indigo-500 animate-pulse font-medium">Processing...</span>}
                </div>
              )}
            </div>

            {/* Text Area fallback or preview */}
            {resumeFile ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                 <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-4 animate-pulse">
                    <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 </div>
                 <p className="text-sm font-bold">PDF Ready</p>
                 <p className="text-xs text-center mt-1 max-w-xs opacity-70">Visual layout analysis enabled.</p>
              </div>
            ) : (
              <textarea
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  setExtractionPreview(null);
                  setResumeFile(undefined);
                }}
                disabled={isAnalyzing}
                className={`flex-1 w-full p-4 resize-none font-mono text-sm leading-relaxed focus:outline-none transition-colors 
                  ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'}
                  ${isAnalyzing ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}
                `}
                placeholder="Or paste resume text here..."
              />
            )}
            
            {/* Drag Overlay */}
            {dragActive && (
              <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-sm flex items-center justify-center z-10 animate-fade-in">
                 <p className="text-indigo-600 font-bold text-lg bg-white px-4 py-2 rounded-lg shadow-lg">Drop File Here</p>
              </div>
            )}
          </div>
        </div>

        {/* JOB DESCRIPTION SECTION */}
        <div className="space-y-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <label className={`block text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            2. Target Job Description
          </label>
          <div className="relative group">
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={isAnalyzing}
              className={`w-full h-64 md:h-80 p-4 rounded-2xl border transition-all duration-300 resize-none font-mono text-sm leading-relaxed hover-card
                ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-700 focus:border-indigo-500'}
                focus:ring-0 focus:shadow-xl outline-none
                ${isAnalyzing ? 'opacity-60 cursor-not-allowed grayscale-[0.5]' : ''}
              `}
              placeholder="Paste the job description here..."
              required
            />
            <div className={`absolute top-4 right-4 text-xs px-2 py-1 rounded font-bold transition-opacity group-focus-within:opacity-100 opacity-50 ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              JD
            </div>
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div className="md:col-span-2 space-y-6 opacity-0 animate-slide-up" style={{ animationDelay: '0.5s' }}>
           
           {/* Persona Selector */}
           <div className={`max-w-4xl mx-auto ${isAnalyzing ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
              <label className={`block text-center text-sm font-bold uppercase tracking-wider mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                 3. Select Hiring Manager Persona
              </label>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                 {PERSONAS.map((p) => (
                   <button
                     key={p.id}
                     type="button"
                     disabled={isAnalyzing}
                     onClick={() => setPersona(p.id)}
                     className={`
                       flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 transform
                       ${persona === p.id 
                         ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-xl scale-110 -translate-y-2' 
                         : darkMode 
                            ? 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:border-slate-500 hover:-translate-y-1' 
                            : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/30 hover:-translate-y-1'
                       }
                     `}
                   >
                      <span className="text-2xl mb-1">{p.icon}</span>
                      <span className="text-xs font-bold text-center leading-tight">{p.label}</span>
                   </button>
                 ))}
              </div>
              <div className="h-14 mt-4 transition-all duration-300">
                {persona === 'Custom' ? (
                    <div className="max-w-md mx-auto animate-scale-in">
                        <input 
                            type="text"
                            value={customPersonaText}
                            onChange={(e) => setCustomPersonaText(e.target.value)}
                            disabled={isAnalyzing}
                            placeholder="E.g., Grumpy Finance Director, Detail-Obsessed Architect..."
                            className={`w-full px-4 py-2 rounded-lg border text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-center ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} ${isAnalyzing ? 'cursor-not-allowed opacity-60' : ''}`}
                            autoFocus
                        />
                    </div>
                ) : (
                    <p className={`text-center text-xs italic transition-all duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        "{PERSONAS.find(p => p.id === persona)?.desc}"
                    </p>
                )}
              </div>
           </div>

           <div className="flex flex-col items-center justify-center pt-4 pb-10">
            <button
              type="submit"
              disabled={isAnalyzing || isProcessingFile || (!resumeText && !resumeFile) || !jobDescription}
              className={`
                relative overflow-hidden group w-full md:w-auto px-8 py-4 md:px-16 md:py-6 rounded-full text-lg md:text-xl font-bold text-white shadow-2xl transition-all transform duration-300
                ${(isAnalyzing || isProcessingFile) 
                  ? 'bg-slate-400 cursor-not-allowed scale-95 opacity-80' 
                  : 'bg-shimmer hover:scale-105 hover:shadow-indigo-500/50 animate-shimmer'
                }
              `}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center relative z-10">
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Initializing Agents...
                </span>
              ) : (
                <span className="flex items-center justify-center relative z-10">
                   Run Stealth Analysis <span className="ml-3 text-2xl group-hover:rotate-12 transition-transform">🚀</span>
                </span>
              )}
            </button>
            
            {isAnalyzing && (
              <div className="w-full max-w-md mt-8 space-y-3 mx-auto">
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-[shimmer_2s_linear_infinite]" style={{ backgroundSize: '200% 100%' }}></div>
                </div>
                <p className="text-sm text-indigo-500 font-medium text-center animate-pulse">
                  {LOADING_TIPS[currentTip]}
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default InputSection;