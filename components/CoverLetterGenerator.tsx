import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  content: string;
  onBack: () => void;
  darkMode: boolean;
}

const CoverLetterGenerator: React.FC<Props> = ({ content, onBack, darkMode }) => {
  const [text, setText] = useState(content);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    const element = previewRef.current;
    if (!element) return;

    // Temporarily ensure element is visible and properly styled for capture
    const wasEditing = isEditing;
    if(wasEditing) setIsEditing(false);
    
    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.transform = 'none';
        clone.style.margin = '0';
        clone.style.border = 'none';
        clone.style.boxShadow = 'none';
        clone.style.position = 'absolute';
        clone.style.left = '-10000px';
        clone.style.top = '0';
        clone.style.zIndex = '-9999';
        clone.style.width = '816px'; // 8.5 inches at 96 DPI
        clone.style.minHeight = '1056px'; // 11 inches
        clone.style.height = 'auto';
        clone.style.backgroundColor = '#ffffff';
        clone.style.color = '#000000'; // Force black text for print
        
        document.body.appendChild(clone);

        // Extract Links
        const links = Array.from(clone.querySelectorAll('a'));
        const linkCoords = links.map(link => {
            const rect = link.getBoundingClientRect();
            const cloneRect = clone.getBoundingClientRect();
            return {
                url: link.href,
                left: rect.left - cloneRect.left,
                top: rect.top - cloneRect.top,
                width: rect.width,
                height: rect.height
            };
        });

        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        document.body.removeChild(clone);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            unit: 'in',
            format: 'letter',
            orientation: 'portrait',
        });

        const pdfWidth = 8.5;
        const pdfHeight = 11;
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');

        // Add Clickable Links
        const pxToIn = (px: number) => px * (8.5 / 816);
        
        linkCoords.forEach(link => {
             // For single page cover letter usually
             pdf.link(
                 pxToIn(link.left),
                 pxToIn(link.top),
                 pxToIn(link.width),
                 pxToIn(link.height),
                 { url: link.url }
             );
        });

        pdf.save("cover_letter.pdf");
        if(wasEditing) setIsEditing(true);

    } catch (e) {
        console.error("PDF Gen Error", e);
        if(wasEditing) setIsEditing(true);
    }
  };

  const renderTextWithLinks = (inputText: string) => {
      // Regex to find URLs and Email addresses
      const regex = /((?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;
      const parts = inputText.split(regex);

      return parts.map((part, i) => {
          if (regex.test(part)) {
              let href = part;
              if (part.includes('@') && !part.startsWith('mailto:')) {
                  href = `mailto:${part}`;
              } else if (!part.startsWith('http')) {
                  href = `https://${part}`;
              }
              return <a key={i} href={href} className="text-blue-600 underline cursor-pointer" target="_blank" rel="noopener noreferrer">{part}</a>;
          }
          return part;
      });
  };

  return (
    <div className={`w-full max-w-5xl mx-auto px-6 py-12 animate-fade-in ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
      <button onClick={onBack} className="mb-6 flex items-center text-sm font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Dashboard
      </button>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI Cover Letter</h1>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}
            >
                {isEditing ? 'View Preview' : 'Edit Text'}
            </button>
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

      <div className="flex justify-center">
        {isEditing ? (
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`w-full max-w-[8.5in] h-[11in] p-10 rounded-xl resize-none outline-none font-serif text-base leading-relaxed border shadow-inner ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                spellCheck={false}
                placeholder="Start typing your cover letter..."
            />
        ) : (
            <div className="w-full overflow-auto py-4 bg-slate-200/50 dark:bg-slate-900/50 rounded-xl flex justify-center">
                <div 
                    ref={previewRef}
                    className="bg-white text-slate-900 shadow-2xl p-[1in] min-h-[11in] w-[8.5in] font-serif text-[11pt] leading-relaxed whitespace-pre-wrap select-text"
                >
                    {renderTextWithLinks(text)}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CoverLetterGenerator;