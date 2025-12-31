import React, { useState } from 'react';
import { jsPDF } from 'jspdf';

interface Props {
  content: string;
  onBack: () => void;
  darkMode: boolean;
}

const CoverLetterGenerator: React.FC<Props> = ({ content, onBack, darkMode }) => {
  const [text, setText] = useState(content);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(text, 180);
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(splitText, 15, 20);
    doc.save("cover_letter.pdf");
  };

  return (
    <div className={`w-full max-w-4xl mx-auto px-6 py-12 animate-fade-in ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
      <button onClick={onBack} className="mb-6 flex items-center text-sm font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Dashboard
      </button>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI Cover Letter</h1>
        <div className="flex gap-3 w-full md:w-auto">
            <button 
                onClick={handleCopy}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}
            >
                {copied ? 'Copied!' : 'Copy Text'}
            </button>
            <button 
                onClick={handleDownloadPDF}
                className="flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-transform active:scale-95"
            >
                Download PDF
            </button>
        </div>
      </div>

      <div className={`w-full p-8 rounded-xl shadow-lg border min-h-[60vh] transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`w-full h-[60vh] resize-none outline-none font-serif text-base leading-relaxed bg-transparent ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
            spellCheck={false}
        />
      </div>
    </div>
  );
};

export default CoverLetterGenerator;