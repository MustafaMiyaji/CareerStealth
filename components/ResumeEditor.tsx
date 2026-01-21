import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ResumeData, ExperienceItem, ProjectItem, EducationItem, CertificationItem, SocialLink } from '../types';
import { reEvaluateResume, improveSection, parseLinkedInProfile, generateLatex } from '../services/geminiService';
import AnalysisChart from './AnalysisChart';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ResumeEditorProps {
  initialData: ResumeData;
  jobDescription: string;
  onBack: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  addToast: (msg: string, type: 'success'|'error'|'info') => void;
  missingKeywords?: string[];
}

const COLORS = {
  slate: { primary: 'text-slate-900', accent: 'text-slate-600', bg: 'bg-slate-900', border: 'border-slate-900', light: 'bg-slate-100', skeleton: 'bg-slate-300', thumb: 'bg-slate-800' },
  blue: { primary: 'text-blue-900', accent: 'text-blue-600', bg: 'bg-blue-900', border: 'border-blue-900', light: 'bg-blue-50', skeleton: 'bg-blue-200', thumb: 'bg-blue-800' },
  indigo: { primary: 'text-indigo-900', accent: 'text-indigo-600', bg: 'bg-indigo-900', border: 'border-indigo-900', light: 'bg-indigo-50', skeleton: 'bg-indigo-200', thumb: 'bg-indigo-800' },
  emerald: { primary: 'text-emerald-900', accent: 'text-emerald-600', bg: 'bg-emerald-900', border: 'border-emerald-900', light: 'bg-emerald-50', skeleton: 'bg-emerald-200', thumb: 'bg-emerald-800' },
  rose: { primary: 'text-rose-900', accent: 'text-rose-600', bg: 'bg-rose-900', border: 'border-rose-900', light: 'bg-rose-50', skeleton: 'bg-rose-200', thumb: 'bg-rose-800' },
  amber: { primary: 'text-amber-900', accent: 'text-amber-700', bg: 'bg-amber-900', border: 'border-amber-900', light: 'bg-amber-50', skeleton: 'bg-amber-200', thumb: 'bg-amber-800' },
  purple: { primary: 'text-purple-900', accent: 'text-purple-700', bg: 'bg-purple-900', border: 'border-purple-900', light: 'bg-purple-50', skeleton: 'bg-purple-200', thumb: 'bg-purple-800' },
  cyan: { primary: 'text-cyan-900', accent: 'text-cyan-700', bg: 'bg-cyan-900', border: 'border-cyan-900', light: 'bg-cyan-50', skeleton: 'bg-cyan-200', thumb: 'bg-cyan-800' },
};

type ColorTheme = keyof typeof COLORS;

interface TemplateConfig {
  id: string;
  name: string;
  layout: 'modern' | 'classic' | 'minimal' | 'ivy' | 'sidebar-left' | 'sidebar-right' | 'executive' | 'compact' | 'creative';
  color: ColorTheme;
  font: 'sans' | 'serif' | 'mono';
  tags: string[];
  description: string;
}

// 40+ TEMPLATES LIBRARY
const TEMPLATE_GALLERY: TemplateConfig[] = [
  // --- TECH / ENGINEERING ---
  { id: 'tech-lead-slate', name: 'The Tech Lead', layout: 'sidebar-left', color: 'slate', font: 'mono', tags: ['engineering', 'developer', 'data'], description: 'Clean sidebar layout preferred by senior engineers.' },
  { id: 'fullstack-indigo', name: 'Full Stack Pro', layout: 'modern', color: 'indigo', font: 'sans', tags: ['engineering', 'developer'], description: 'Modern standard for SaaS startups.' },
  { id: 'backend-mono', name: 'Terminal Output', layout: 'minimal', color: 'slate', font: 'mono', tags: ['engineering', 'backend'], description: 'No-nonsense, code-like aesthetic.' },
  { id: 'frontend-creative', name: 'UI Architect', layout: 'creative', color: 'rose', font: 'sans', tags: ['design', 'frontend'], description: 'Showcases creativity without losing readability.' },
  { id: 'data-science-blue', name: 'Data Insights', layout: 'sidebar-right', color: 'blue', font: 'sans', tags: ['data', 'analyst'], description: 'Highlights skills and education on the right.' },
  { id: 'devops-emerald', name: 'DevOps Pipeline', layout: 'modern', color: 'emerald', font: 'mono', tags: ['devops', 'cloud'], description: 'Structured and reliable look.' },
  { id: 'silicon-valley', name: 'Silicon Valley', layout: 'minimal', color: 'slate', font: 'sans', tags: ['engineering', 'startup'], description: 'The standard YC applicant format.' },
  
  // --- EXECUTIVE / MANAGEMENT ---
  { id: 'executive-gold', name: 'The Chairman', layout: 'executive', color: 'amber', font: 'serif', tags: ['executive', 'management'], description: 'Authoritative serif typography for leadership.' },
  { id: 'director-slate', name: 'Director Suite', layout: 'executive', color: 'slate', font: 'sans', tags: ['management', 'director'], description: 'Bold headers with clean content structure.' },
  { id: 'manager-blue', name: 'People Manager', layout: 'modern', color: 'blue', font: 'sans', tags: ['management', 'hr'], description: 'Approachabe yet professional.' },
  { id: 'vp-classic', name: 'VP Strategy', layout: 'classic', color: 'slate', font: 'serif', tags: ['executive', 'strategy'], description: 'Timeless elegance for high-level roles.' },
  { id: 'chief-staff', name: 'Chief of Staff', layout: 'minimal', color: 'indigo', font: 'sans', tags: ['management', 'operations'], description: 'Highly organized and dense.' },

  // --- ACADEMIC / IVY LEAGUE ---
  { id: 'harvard-standard', name: 'Harvard Classic', layout: 'ivy', color: 'slate', font: 'serif', tags: ['academic', 'law', 'finance'], description: 'The gold standard for consulting and finance.' },
  { id: 'stanford-modern', name: 'Stanford Modern', layout: 'ivy', color: 'rose', font: 'sans', tags: ['academic', 'student'], description: 'A modern take on the academic CV.' },
  { id: 'mit-engineer', name: 'MIT Technical', layout: 'compact', color: 'slate', font: 'mono', tags: ['engineering', 'academic'], description: 'Maximizes information density.' },
  { id: 'research-fellow', name: 'Research Fellow', layout: 'classic', color: 'blue', font: 'serif', tags: ['academic', 'science'], description: 'Focus on publications and research.' },

  // --- CREATIVE / DESIGN ---
  { id: 'product-designer', name: 'Product Grid', layout: 'creative', color: 'indigo', font: 'sans', tags: ['design', 'product'], description: 'Uses a subtle grid system.' },
  { id: 'creative-director', name: 'Studio Head', layout: 'sidebar-left', color: 'purple', font: 'sans', tags: ['design', 'creative'], description: 'Bold color blocks.' },
  { id: 'minimal-noir', name: 'Minimal Noir', layout: 'minimal', color: 'slate', font: 'sans', tags: ['design', 'fashion'], description: 'High whitespace, high impact.' },
  { id: 'ux-researcher', name: 'UX Researcher', layout: 'modern', color: 'cyan', font: 'sans', tags: ['design', 'research'], description: 'Clean and accessible.' },

  // --- MARKETING / SALES ---
  { id: 'marketing-pro', name: 'Growth Hacker', layout: 'modern', color: 'rose', font: 'sans', tags: ['marketing', 'sales'], description: 'High energy layout.' },
  { id: 'sales-closer', name: 'The Closer', layout: 'executive', color: 'blue', font: 'sans', tags: ['sales', 'business'], description: 'Results-oriented layout.' },
  { id: 'brand-manager', name: 'Brand Voice', layout: 'sidebar-right', color: 'amber', font: 'serif', tags: ['marketing', 'branding'], description: 'Sophisticated typography.' },

  // --- GENERAL / ENTRY LEVEL ---
  { id: 'entry-clean', name: 'Clean Start', layout: 'compact', color: 'slate', font: 'sans', tags: ['student', 'entry'], description: 'Great for 1-page resumes.' },
  { id: 'modern-slate-2', name: 'Modern Slate', layout: 'modern', color: 'slate', font: 'sans', tags: ['general'], description: 'A safe bet for any industry.' },
  { id: 'classic-serif-2', name: 'Classic Times', layout: 'classic', color: 'slate', font: 'serif', tags: ['general'], description: 'Traditional and reliable.' },
  { id: 'sidebar-teal', name: 'Teal Sidebar', layout: 'sidebar-left', color: 'cyan', font: 'sans', tags: ['general'], description: 'Fresh and organized.' },
  
  // --- VARIATIONS ---
  { id: 'tech-minimal-dark', name: 'Code Block', layout: 'minimal', color: 'slate', font: 'mono', tags: ['engineering'], description: 'For code-heavy profiles.' },
  { id: 'ivy-blue', name: 'Yale Blue', layout: 'ivy', color: 'blue', font: 'serif', tags: ['academic', 'finance'], description: 'Prestigious academic look.' },
  { id: 'saas-purple', name: 'SaaS Purple', layout: 'modern', color: 'purple', font: 'sans', tags: ['tech', 'marketing'], description: 'Vibrant tech aesthetic.' },
  { id: 'exec-green', name: 'Sustainable Exec', layout: 'executive', color: 'emerald', font: 'serif', tags: ['executive', 'green'], description: 'Eco-conscious leadership.' },
  { id: 'compact-dense-2', name: 'The Crammer', layout: 'compact', color: 'blue', font: 'sans', tags: ['general'], description: 'Fits maximum content.' },
  { id: 'creative-rose', name: 'Rose Portfolio', layout: 'creative', color: 'rose', font: 'sans', tags: ['design'], description: 'Soft artistic touch.' },
  { id: 'sidebar-amber', name: 'Warm Sidebar', layout: 'sidebar-right', color: 'amber', font: 'sans', tags: ['general'], description: 'Friendly and approachable.' },
  { id: 'modern-cyan', name: 'Cyan Future', layout: 'modern', color: 'cyan', font: 'sans', tags: ['tech'], description: 'Futuristic clean look.' },
  { id: 'classic-emerald', name: 'Emerald Classic', layout: 'classic', color: 'emerald', font: 'serif', tags: ['general'], description: 'Traditional with a twist.' },
  { id: 'minimal-indigo', name: 'Indigo Minimal', layout: 'minimal', color: 'indigo', font: 'sans', tags: ['general'], description: 'Just the essentials.' },
  { id: 'ivy-slate', name: 'Princeton Grey', layout: 'ivy', color: 'slate', font: 'serif', tags: ['academic'], description: 'Serious and academic.' },
  { id: 'tech-purple', name: 'Dev Purple', layout: 'sidebar-left', color: 'purple', font: 'mono', tags: ['engineering'], description: 'Developer favorite.' },
];

const CopyAction: React.FC<{ text: string; darkMode?: boolean }> = ({ text, darkMode }) => {
  const [copied, setCopied] = useState(false);
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={onClick} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-600 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`} title="Copy content">
      {copied ? <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
    </button>
  );
};

// IMPROVED HIGHLIGHTER FOR DIFF MODE
const HighlightText: React.FC<{ text: string; keywords: string[] }> = ({ text, keywords }) => {
  if (!keywords || keywords.length === 0 || !text) return <>{text}</>;

  // Escape special regex characters in keywords to prevent crashes
  const escapedKeywords = keywords
    .filter(k => k && k.trim().length > 0)
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (escapedKeywords.length === 0) return <>{text}</>;

  // Create a regex that matches any of the keywords, case-insensitive
  const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
         const isMatch = keywords.some(k => k.toLowerCase() === part.toLowerCase());
         return isMatch 
           ? <span key={i} className="bg-emerald-200 text-emerald-900 rounded px-0.5 box-decoration-clone font-semibold border-b-2 border-emerald-400">{part}</span> 
           : part;
      })}
    </>
  );
};

// THE ACTUAL RENDERER FOR THE RESUME (Used in Main Preview)
const UniversalRenderer: React.FC<{ data: ResumeData; config: TemplateConfig; spacing: 'compact' | 'normal' | 'open'; diffMode: boolean; missingKeywords: string[]; }> = ({ data, config, spacing, diffMode, missingKeywords }) => {
  const theme = COLORS[config.color] || COLORS.slate;
  const spacingClass = spacing === 'compact' ? 'space-y-[0.25em]' : spacing === 'open' ? 'space-y-[1em]' : 'space-y-[0.5em]';
  const marginClass = spacing === 'compact' ? 'mb-[0.5em]' : spacing === 'open' ? 'mb-[1.5em]' : 'mb-[1em]';
  const paddingClass = spacing === 'compact' ? 'p-[1.5em]' : 'p-[2.5em]';
  
  const fontClass = config.font === 'serif' ? 'font-serif' : config.font === 'mono' ? 'font-mono' : 'font-sans';
  
  // Layout Logic Flags
  const isSidebarLeft = config.layout === 'sidebar-left' || config.layout === 'creative';
  const isSidebarRight = config.layout === 'sidebar-right';
  const isCentered = config.layout === 'modern' || config.layout === 'minimal';
  const isClassic = config.layout === 'classic' || config.layout === 'ivy';
  const isExecutive = config.layout === 'executive';
  
  const RenderText = ({ text }: { text: string }) => {
      if (!text) return null;
      if (!diffMode) return <>{text}</>;
      return <HighlightText text={text} keywords={missingKeywords} />;
  };

  const LinkText = ({ text, url, className }: { text: string; url?: string; className?: string }) => {
     if (!text) return null;
     if (url) {
         return <a href={url} target="_blank" rel="noopener noreferrer" className={`underline decoration-dotted hover:decoration-solid ${className}`}><RenderText text={text} /></a>;
     }
     return <span className={className}><RenderText text={text} /></span>;
  };

  const Header = () => (
    <div className={`resume-section-item ${marginClass} ${isCentered ? 'text-center' : ''} ${config.layout === 'ivy' ? 'border-b pb-4 ' + theme.border : ''} ${isExecutive ? 'border-b-2 ' + theme.border + ' pb-4' : ''}`}>
       <h1 className={`${isExecutive ? 'text-[2.25em]' : 'text-[1.875em]'} font-bold uppercase tracking-tight leading-none ${theme.primary}`}>{data.fullName}</h1>
       <p className={`${isExecutive ? 'text-[1.25em]' : 'text-[1.125em]'} font-medium ${theme.accent} mt-[0.25em]`}>{data.title}</p>
       <div className={`text-[0.875em] text-slate-500 mt-[0.25em] ${isExecutive ? 'font-bold' : ''}`}>
          <span>{data.contactInfo}</span>
          {(data.socialLinks && data.socialLinks.length > 0) && (
              <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[0.9em] ${isCentered ? 'justify-center' : ''}`}>
                  {data.socialLinks.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-indigo-600 transition-colors group">
                          <span className="opacity-70 font-bold text-[0.8em] uppercase tracking-wider underline decoration-dotted hover:decoration-solid">
                              {link.platform}
                          </span>
                      </a>
                  ))}
              </div>
          )}
       </div>
    </div>
  );

  const SectionTitle = ({ title }: { title: string }) => (
     <h2 className={`
        resume-section-item
        text-[0.85em] font-bold uppercase tracking-wider mb-[0.5em] ${theme.primary} 
        ${isClassic ? 'border-b border-slate-300 pb-1' : ''}
        ${config.layout === 'modern' ? `border-l-4 ${theme.border} pl-3` : ''}
        ${isExecutive ? `border-b-2 ${theme.border} pb-1 text-[1em]` : ''}
     `}>
       {title}
     </h2>
  );
  
  const safeSkills = data.skills || [];
  const safeExperience = data.experience || [];
  const safeEducation = data.education || [];
  const safeProjects = data.projects || [];
  const safeCertifications = data.certifications || [];
  const safeLinks = data.socialLinks || [];

  const SidebarContent = () => (
      <>
        <div className="mb-[1.5em] resume-section-item">
            <SectionTitle title="Contact" />
            <div className="text-[0.75em] space-y-[0.25em] text-slate-600 break-words">
                {(data.contactInfo || '').split('|').map((info, i) => <div key={i} className="mb-1">{info.trim()}</div>)}
                {safeLinks.map((link, i) => (
                    <div key={i} className="mb-1">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-bold opacity-70 text-[9px] uppercase tracking-wider hover:text-indigo-600 underline decoration-dotted hover:decoration-solid">
                            {link.platform}
                        </a>
                    </div>
                ))}
            </div>
        </div>
        <div className="mb-[1.5em] resume-section-item">
            <SectionTitle title="Skills" />
            <div className="flex flex-wrap gap-[0.25em]">
                {safeSkills.map((skill, i) => ( <span key={i} className={`text-[0.7em] px-[0.5em] py-[0.25em] bg-white rounded shadow-sm border ${theme.border} border-opacity-10 block w-full`}><RenderText text={skill} /></span> ))}
            </div>
        </div>
        <div className="mb-[1.5em]">
            <SectionTitle title="Education" />
            {safeEducation.map((edu, i) => (
                <div key={i} className="mb-[0.75em] text-[0.75em] resume-section-item">
                <div className="font-bold">{edu.degree}</div>
                <div className="text-slate-600">{edu.school}</div>
                <div className="text-slate-400 mb-[0.25em]">{edu.year}</div>
                </div>
            ))}
        </div>
        {safeCertifications.length > 0 && (
            <div className="mb-[1.5em]">
                <SectionTitle title="Certifications" />
                {safeCertifications.map((cert, i) => (
                    <div key={i} className="mb-[0.75em] text-[0.75em] resume-section-item">
                    <div className="font-bold leading-tight mb-[0.1em]"><LinkText text={cert.name} url={cert.url} /></div>
                    <div className="text-slate-600">{cert.issuer}</div>
                    <div className="text-slate-400">{cert.date}</div>
                    </div>
                ))}
            </div>
        )}
      </>
  );

  const MainContent = () => (
      <>
        <div className={marginClass}>
            <SectionTitle title="Summary" />
            <p className="text-[0.875em] leading-relaxed text-slate-700 text-justify resume-section-item"><RenderText text={data.summary} /></p>
        </div>
        <div className={marginClass}>
            <SectionTitle title="Experience" />
            <div className={spacingClass}>
                {safeExperience.map((exp) => (
                <div key={exp.id} className="mb-[1em] resume-section-item">
                    <div className="flex justify-between items-baseline mb-[0.25em]">
                        <h3 className="font-bold text-[0.875em]">{exp.role}</h3>
                        <span className="text-[0.75em] text-slate-500 font-mono text-right shrink-0 ml-2">{exp.duration}</span>
                    </div>
                    <div className={`text-[0.75em] font-semibold ${theme.accent} mb-[0.5em]`}>{exp.company}</div>
                    <ul className="list-disc list-outside ml-[1em] space-y-[0.25em]">
                        {(exp.points || []).map((pt, i) => ( <li key={i} className="text-[0.85em] text-slate-700 pl-1 marker:text-slate-400 leading-relaxed"><RenderText text={pt} /></li> ))}
                    </ul>
                </div>
                ))}
            </div>
        </div>
        {safeProjects.length > 0 && 
            <div className={marginClass}>
                <SectionTitle title="Projects" />
                <div className={spacingClass}>
                    {safeProjects.map((proj) => (
                        <div key={proj.id} className="mb-[0.75em] resume-section-item">
                            <div className="flex justify-between items-baseline">
                                <h3 className="font-bold text-[0.875em]"><LinkText text={proj.title} url={proj.link} /></h3>
                            </div>
                            <ul className="list-disc list-outside ml-[1em] mt-[0.25em] space-y-[0.25em]">
                                {proj.points.map((pt, i) => (<li key={i} className="text-[0.85em] text-slate-700 pl-1 marker:text-slate-400 leading-relaxed"><RenderText text={pt} /></li>))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        }
      </>
  );

  return (
    <div className={`${paddingClass} w-full min-h-[inherit] ${fontClass} bg-white text-slate-800 box-border leading-normal`}>
       {isSidebarLeft ? (
          <div className="grid grid-cols-12 gap-8 h-full">
             <div className={`col-span-4 ${theme.light} p-[1.5em] rounded-lg h-full`}>
                <div className="mb-[2em] resume-section-item">
                    <h1 className={`text-[1.5em] font-bold ${theme.primary} leading-tight`}>{data.fullName}</h1>
                    <p className={`text-[0.875em] ${theme.accent} mt-[0.25em]`}>{data.title}</p>
                </div>
                <SidebarContent />
             </div>
             <div className="col-span-8">
                <MainContent />
             </div>
          </div>
       ) : isSidebarRight ? (
          <div className="grid grid-cols-12 gap-8 h-full">
             <div className="col-span-8">
                <div className="mb-[2em] resume-section-item">
                    <h1 className={`text-[2em] font-bold ${theme.primary} leading-tight`}>{data.fullName}</h1>
                    <p className={`text-[1em] ${theme.accent} mt-[0.25em]`}>{data.title}</p>
                </div>
                <MainContent />
             </div>
             <div className={`col-span-4 ${theme.light} p-[1.5em] rounded-lg h-full`}>
                <SidebarContent />
             </div>
          </div>
       ) : (
          <>
             <Header />
             <MainContent />
             
             {/* Bottom Columns for Single Col Layouts */}
             <div className="grid grid-cols-2 gap-8 mt-4 pt-4 border-t border-slate-100">
                 <div>
                    <SectionTitle title="Education" />
                    {safeEducation.map((edu, i) => (
                        <div key={i} className="mb-2 text-[0.85em] resume-section-item">
                            <div className="font-bold">{edu.school}</div>
                            <div>{edu.degree}</div>
                            <div className="text-slate-500 text-[0.8em]">{edu.year}</div>
                        </div>
                    ))}
                    
                    {/* FIXED: Add Certifications here for non-sidebar layouts */}
                    {safeCertifications.length > 0 && (
                        <div className="mt-6">
                            <SectionTitle title="Certifications" />
                            {safeCertifications.map((cert, i) => (
                                <div key={i} className="mb-2 text-[0.85em] resume-section-item">
                                    <div className="font-bold leading-tight"><LinkText text={cert.name} url={cert.url} /></div>
                                    <div className="text-slate-600">{cert.issuer}</div>
                                    <div className="text-slate-400 text-[0.8em]">{cert.date}</div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
                 <div>
                    <SectionTitle title="Skills" />
                    <div className="text-[0.85em] text-slate-700 leading-relaxed resume-section-item">
                        {safeSkills.map((skill, i) => <span key={i}><RenderText text={skill} />{i < safeSkills.length -1 ? ' • ' : ''}</span>)}
                    </div>
                 </div>
             </div>
          </>
        )}
    </div>
  );
};

// ... (Thumbnail and Card components remain unchanged) ...
// SIMPLIFIED VISUAL THUMBNAIL
const TemplateThumbnail: React.FC<{ config: TemplateConfig }> = ({ config }) => {
    const theme = COLORS[config.color];
    const isSidebar = config.layout.includes('sidebar');
    const isSidebarRight = config.layout === 'sidebar-right';
    const isCentered = config.layout === 'modern' || config.layout === 'minimal';
    
    return (
        <div className="w-full h-full bg-white p-2 text-[4px] leading-tight select-none overflow-hidden relative border border-slate-100 rounded-sm">
            {isSidebar ? (
                <div className={`flex h-full gap-1 ${isSidebarRight ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-1/3 h-full rounded-sm opacity-20 ${theme.thumb}`}></div>
                    <div className="w-2/3 h-full flex flex-col gap-1">
                        <div className={`h-2 w-3/4 rounded-sm ${theme.thumb} opacity-80 mb-1`}></div>
                        <div className="h-1 w-full bg-slate-200 rounded-sm"></div>
                        <div className="h-1 w-full bg-slate-200 rounded-sm"></div>
                        <div className="h-1 w-2/3 bg-slate-200 rounded-sm mb-2"></div>
                        <div className="h-1 w-1/2 bg-slate-300 rounded-sm"></div>
                        <div className="h-1 w-full bg-slate-200 rounded-sm"></div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-1.5 h-full">
                    <div className={`flex flex-col ${isCentered ? 'items-center' : 'items-start'} mb-1`}>
                        <div className={`h-2.5 w-1/2 rounded-sm ${theme.thumb} mb-0.5`}></div>
                        <div className="h-1 w-1/3 bg-slate-300 rounded-sm"></div>
                    </div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex flex-col gap-0.5">
                            <div className="h-1 w-1/4 bg-slate-300 rounded-sm"></div>
                            <div className="h-0.5 w-full bg-slate-100 rounded-sm"></div>
                            <div className="h-0.5 w-full bg-slate-100 rounded-sm"></div>
                            <div className="h-0.5 w-2/3 bg-slate-100 rounded-sm"></div>
                        </div>
                    ))}
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-50"></div>
        </div>
    );
};

const TemplateCard: React.FC<{ config: TemplateConfig; isActive: boolean; onSelect: (id: string) => void; recommended?: boolean }> = ({ config, isActive, onSelect, recommended }) => {
  return (
    <div onClick={() => onSelect(config.id)} className={`cursor-pointer group relative rounded-xl border transition-all duration-300 ease-out overflow-hidden hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full bg-white ${isActive ? 'border-indigo-500 ring-4 ring-indigo-200/50 scale-[1.02]' : 'border-slate-200 hover:border-indigo-400 hover:ring-4 hover:ring-indigo-50 dark:hover:ring-indigo-900/20'}`}>
      <div className="flex-1 bg-slate-50 relative overflow-hidden p-4">
         {recommended && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] px-2 py-1 rounded-bl-lg font-bold z-10 shadow-sm animate-pulse">BEST MATCH</div>}
         <div className="w-full h-full shadow-md transform group-hover:scale-105 transition-transform duration-500">
            <TemplateThumbnail config={config} />
         </div>
         {isActive && <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-indigo-500 shadow-sm animate-pulse"></div>}
      </div>
      <div className="p-3 bg-white border-t border-slate-100 relative z-20">
        <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-slate-800 text-xs truncate pr-2">{config.name}</h3>
            {config.tags.includes('premium') && <span className="text-[8px] uppercase font-bold text-amber-500">PRO</span>}
        </div>
        <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight opacity-70 group-hover:opacity-100 transition-opacity">{config.description}</p>
      </div>
    </div>
  );
};

const SectionAccordion: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; onToggle: () => void; darkMode: boolean }> = ({ title, children, isOpen, onToggle, darkMode }) => (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'} ${isOpen ? 'ring-1 ring-indigo-500/10 shadow-lg' : 'hover:border-indigo-300/50 hover:shadow-md'}`}>
        <button onClick={onToggle} className="w-full flex justify-between items-center p-4 focus:outline-none group active:bg-slate-50 dark:active:bg-slate-800 transition-colors">
            <span className={`font-bold text-sm uppercase tracking-wider flex items-center ${darkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-indigo-600'}`}>
                {title}
            </span>
            <span className={`transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'rotate-180' : ''} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </span>
        </button>
        <div className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 pt-0 border-t border-transparent">
                {children}
            </div>
        </div>
    </div>
);

const ResumeEditor: React.FC<ResumeEditorProps> = ({ 
    initialData, 
    jobDescription, 
    onBack, 
    darkMode, 
    toggleDarkMode, 
    addToast,
    missingKeywords = []
}) => {
    const [data, setData] = useState<ResumeData>({ ...initialData, projects: initialData.projects || [], certifications: initialData.certifications || [], activities: initialData.activities || [], softSkills: initialData.softSkills || [], socialLinks: initialData.socialLinks || [] });
    const [activeTemplateId, setActiveTemplateId] = useState<string>('modern-blue');
    const previewRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [spacing, setSpacing] = useState<'compact' | 'normal' | 'open'>('normal');
    const [focusMode, setFocusMode] = useState(false);
    const [fontSize, setFontSize] = useState(10.5); 
    const [viewZoom, setViewZoom] = useState(100); 
    const [newSkill, setNewSkill] = useState('');
    const [newSoftSkill, setNewSoftSkill] = useState('');
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showOptimizationBanner, setShowOptimizationBanner] = useState(true);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [isCheckingScore, setIsCheckingScore] = useState(false);
    const [currentScore, setCurrentScore] = useState<number | null>(null);
    const [scoreFeedback, setScoreFeedback] = useState<string | null>(null);
    const [isImproving, setIsImproving] = useState<string | null>(null);
    const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
    const [diffMode, setDiffMode] = useState(false);
    const [showLinkedInModal, setShowLinkedInModal] = useState(false);
    const [linkedInText, setLinkedInText] = useState('');
    const [isImportingLinkedIn, setIsImportingLinkedIn] = useState(false);
    const [customLinkUrl, setCustomLinkUrl] = useState('');
    const [customLinkPlatform, setCustomLinkPlatform] = useState('');
    const [templateFilter, setTemplateFilter] = useState('all');

    // Drag and Drop State
    const draggedItemRef = useRef<{ section: keyof ResumeData; index: number } | null>(null);

    // Calculate Recommendations
    const recommendedTemplates = useMemo(() => {
        const jobTitle = (initialData.title || jobDescription).toLowerCase();
        const keywords: string[] = [];
        
        if (jobTitle.includes('engineer') || jobTitle.includes('developer') || jobTitle.includes('data')) keywords.push('engineering', 'tech', 'data');
        if (jobTitle.includes('manager') || jobTitle.includes('director') || jobTitle.includes('vp') || jobTitle.includes('head') || jobTitle.includes('chief')) keywords.push('management', 'executive');
        if (jobTitle.includes('designer') || jobTitle.includes('creative') || jobTitle.includes('art')) keywords.push('design', 'creative');
        if (jobTitle.includes('student') || jobTitle.includes('intern')) keywords.push('student', 'academic');
        if (jobTitle.includes('marketing') || jobTitle.includes('sales')) keywords.push('marketing', 'sales');
        if (jobTitle.includes('consultant') || jobTitle.includes('analyst')) keywords.push('finance', 'academic');

        if (keywords.length === 0) keywords.push('general');

        return TEMPLATE_GALLERY.filter(t => t.tags.some(tag => keywords.includes(tag)));
    }, [initialData.title, jobDescription]);

    // Accordion State
    const [sectionsOpen, setSectionsOpen] = useState({
        personal: true,
        experience: true,
        education: false,
        projects: false,
        skills: false,
        certifications: false,
        activities: false
    });

    const toggleSection = (section: keyof typeof sectionsOpen) => setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
    const activeTemplateConfig = TEMPLATE_GALLERY.find(t => t.id === activeTemplateId) || TEMPLATE_GALLERY[0];

    useEffect(() => { const timer = setTimeout(() => setShowOptimizationBanner(false), 5000); return () => clearTimeout(timer); }, []);
    useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setShowDownloadMenu(false); } }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);

    const handleCheckScore = async () => { setIsCheckingScore(true); try { const result = await reEvaluateResume(data, jobDescription); setCurrentScore(result.score); setScoreFeedback(result.feedback); addToast(`New Score: ${result.score}%`, result.score > 70 ? 'success' : 'info'); } catch (e) { addToast("Failed to check score.", "error"); } finally { setIsCheckingScore(false); } };
    const handleImproveSummary = async () => { setIsImproving('summary'); try { const newText = await improveSection(data.summary, 'summary', jobDescription); setData(prev => ({ ...prev, summary: newText })); addToast("Summary improved!", "success"); } catch (e) { addToast("AI busy, try again.", "error"); } finally { setIsImproving(null); } };
    const handleImproveExpPoint = async (expId: string, pointIndex: number, text: string) => { const loadingId = `${expId}-pt-${pointIndex}`; setIsImproving(loadingId); try { const newText = await improveSection(text, 'experience', jobDescription); handleExpPointChange(expId, pointIndex, newText); addToast("Bullet point optimized!", "success"); } catch (e) { addToast("AI busy, try again.", "error"); } finally { setIsImproving(null); } };
    const handleImproveProjectPoint = async (projId: string, pointIndex: number, text: string) => { const loadingId = `${projId}-pt-${pointIndex}`; setIsImproving(loadingId); try { const newText = await improveSection(text, 'experience', jobDescription); handleProjectPointChange(projId, pointIndex, newText); addToast("Bullet point optimized!", "success"); } catch (e) { addToast("AI busy, try again.", "error"); } finally { setIsImproving(null); } };

    // Data Handlers
    const handleBasicInfoChange = (field: keyof ResumeData, value: string) => { setData(prev => ({ ...prev, [field]: value })); };
    const handleExperienceChange = (id: string, field: string, value: string) => { setData(prev => ({ ...prev, experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp) })); };
    const handleExpPointChange = (expId: string, pointIndex: number, value: string) => { setData(prev => ({ ...prev, experience: prev.experience.map(exp => { if (exp.id === expId) { const newPoints = [...exp.points]; newPoints[pointIndex] = value; return { ...exp, points: newPoints }; } return exp; }) })); };
    const handleEducationChange = (id: string, field: string, value: string) => { setData(prev => ({ ...prev, education: (prev.education || []).map(edu => edu.id === id ? { ...edu, [field]: value } : edu) })); };
    const handleCertificationChange = (id: string, field: string, value: string) => { setData(prev => ({ ...prev, certifications: (prev.certifications || []).map(cert => cert.id === id ? { ...cert, [field]: value } : cert) })); };
    const handleProjectChange = (id: string, field: string, value: string) => { setData(prev => ({ ...prev, projects: (prev.projects || []).map(proj => proj.id === id ? { ...proj, [field]: value } : proj) })); };
    const handleProjectPointChange = (projId: string, pointIndex: number, value: string) => { setData(prev => ({ ...prev, projects: (prev.projects || []).map(proj => { if (proj.id === projId) { const newPoints = [...proj.points]; newPoints[pointIndex] = value; return { ...proj, points: newPoints }; } return proj; }) })); };
    const handleActivityChange = (id: string, field: string, value: string) => { setData(prev => ({ ...prev, activities: (prev.activities || []).map(act => act.id === id ? { ...act, [field]: value } : act) })); };
    const handleActivityPointChange = (actId: string, pointIndex: number, value: string) => { setData(prev => ({ ...prev, activities: (prev.activities || []).map(act => { if (act.id === actId) { const newPoints = [...act.points]; newPoints[pointIndex] = value; return { ...act, points: newPoints }; } return act; }) })); };

    // ... (Drag handlers remain same) ...
    const handleDragStart = (e: React.DragEvent, section: keyof ResumeData, index: number) => {
        draggedItemRef.current = { section, index };
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragOver = (e: React.DragEvent, section: keyof ResumeData, index: number) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, section: keyof ResumeData, dropIndex: number) => {
        e.preventDefault();
        e.currentTarget.classList.remove('opacity-50');
        
        const draggedItem = draggedItemRef.current;
        if (!draggedItem || draggedItem.section !== section) return;

        const dragIndex = draggedItem.index;
        if (dragIndex === dropIndex) return;

        const list = [...(data[section] as any[])];
        const [removed] = list.splice(dragIndex, 1);
        list.splice(dropIndex, 0, removed);

        setData(prev => ({ ...prev, [section]: list }));
        draggedItemRef.current = null;
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('opacity-50');
        draggedItemRef.current = null;
    };

    const deleteItem = (section: keyof ResumeData, index: number) => { const list = data[section]; if (Array.isArray(list)) { const newList = list.filter((_, i) => i !== index); setData(prev => ({ ...prev, [section]: newList })); } };
    const addItem = (section: 'experience' | 'projects' | 'activities' | 'certifications' | 'education') => { const id = Date.now().toString(); if (section === 'experience' || section === 'activities') { const newItem: ExperienceItem = { id, role: '', company: '', duration: '', points: [''] }; setData(prev => ({ ...prev, [section]: [...prev[section], newItem] })); } else if (section === 'projects') { const newItem: ProjectItem = { id, title: '', link: '', points: [''] }; setData(prev => ({ ...prev, projects: [...prev.projects, newItem] })); } else if (section === 'certifications') { const newItem: CertificationItem = { id, name: '', issuer: '', date: '' }; setData(prev => ({ ...prev, certifications: [...(prev.certifications || []), newItem] })); } else if (section === 'education') { const newItem: EducationItem = { id, degree: '', school: '', year: '' }; setData(prev => ({ ...prev, education: [...(prev.education || []), newItem] })); } };
    const addSkill = () => { if (newSkill.trim()) { const skill = newSkill.trim(); setData(prev => ({ ...prev, skills: [...(prev.skills || []), skill] })); if (missingKeywords.some(k => k.toLowerCase() === skill.toLowerCase())) { addToast("Great! Keyword Match Found!", "success"); } setNewSkill(''); } };
    const removeSkill = (index: number) => { setData(prev => ({ ...prev, skills: (prev.skills || []).filter((_, i) => i !== index) })); };
    const addSoftSkill = () => { if (newSoftSkill.trim()) { const skill = newSoftSkill.trim(); setData(prev => ({ ...prev, softSkills: [...(prev.softSkills || []), skill] })); setNewSoftSkill(''); } };
    const removeSoftSkill = (index: number) => { setData(prev => ({ ...prev, softSkills: (prev.softSkills || []).filter((_, i) => i !== index) })); };
    const addSocialLink = (platform: string, url: string) => { if (!url.trim()) return; const newLink: SocialLink = { id: Date.now().toString(), platform, url }; setData(prev => ({ ...prev, socialLinks: [...(prev.socialLinks || []), newLink] })); };
    const removeSocialLink = (index: number) => { setData(prev => ({ ...prev, socialLinks: (prev.socialLinks || []).filter((_, i) => i !== index) })); };

    // DEDUPLICATION HELPERS
    const isDuplicateExperience = (a: ExperienceItem, b: ExperienceItem) => a.company.trim().toLowerCase() === b.company.trim().toLowerCase() && a.role.trim().toLowerCase() === b.role.trim().toLowerCase();
    const isDuplicateEducation = (a: EducationItem, b: EducationItem) => a.school.trim().toLowerCase() === b.school.trim().toLowerCase() && a.degree.trim().toLowerCase() === b.degree.trim().toLowerCase();
    const isDuplicateProject = (a: ProjectItem, b: ProjectItem) => a.title.trim().toLowerCase() === b.title.trim().toLowerCase();
    const isDuplicateCert = (a: CertificationItem, b: CertificationItem) => a.name.trim().toLowerCase() === b.name.trim().toLowerCase();

    const handleLinkedInImport = async () => { 
        if (!linkedInText.trim()) return; 
        setIsImportingLinkedIn(true); 
        try { 
            const importedData = await parseLinkedInProfile(linkedInText); 
            
            setData(prev => {
                // Smart Merge Logic
                const newExperience = importedData.experience.filter(imp => !prev.experience.some(exist => isDuplicateExperience(exist, imp)));
                const newEducation = importedData.education.filter(imp => !prev.education.some(exist => isDuplicateEducation(exist, imp)));
                const newProjects = importedData.projects.filter(imp => !prev.projects.some(exist => isDuplicateProject(exist, imp)));
                const newCerts = importedData.certifications.filter(imp => !prev.certifications.some(exist => isDuplicateCert(exist, imp)));
                const uniqueSkills = [...new Set([...(prev.skills || []), ...(importedData.skills || [])])];

                const addedCount = newExperience.length + newEducation.length + newProjects.length + newCerts.length;
                if (addedCount === 0 && (importedData.skills?.length || 0) === 0) {
                    addToast("No new data found to import.", "info");
                    return prev;
                }

                addToast(`Imported: ${addedCount} new items & merged skills.`, "success");

                return { 
                    ...prev, 
                    fullName: prev.fullName || importedData.fullName, 
                    title: prev.title || importedData.title, 
                    summary: prev.summary || importedData.summary, 
                    skills: uniqueSkills, 
                    experience: [...prev.experience, ...newExperience], 
                    education: [...prev.education, ...newEducation], 
                    projects: [...prev.projects, ...newProjects], 
                    certifications: [...prev.certifications, ...newCerts] 
                };
            });
            
            setShowLinkedInModal(false); 
            setLinkedInText(''); 
        } catch (e) { 
            console.error(e); 
            addToast("Failed to parse LinkedIn text.", "error"); 
        } finally { 
            setIsImportingLinkedIn(false); 
        } 
    };

    const downloadPDF = async () => {
        const element = previewRef.current;
        if (!element) return;
    
        setIsDownloading(true);
        setShowDownloadMenu(false);
    
        try {
          const clone = element.cloneNode(true) as HTMLElement;
          
          // Styling to ensure consistent capture
          clone.style.transform = 'none';
          clone.style.margin = '0';
          clone.style.border = 'none'; 
          clone.style.boxShadow = 'none';
          clone.style.position = 'absolute';
          clone.style.left = '-10000px';
          clone.style.top = '0';
          clone.style.zIndex = '-9999';
          clone.style.width = '816px'; 
          clone.style.minHeight = '1056px'; 
          clone.style.height = 'auto';
          
          document.body.appendChild(clone);

          // --- PAGE BREAK LOGIC ---
          const PAGE_HEIGHT = 1056; 
          const items = Array.from(clone.querySelectorAll('.resume-section-item'));
          
          for (const item of items) {
              const el = item as HTMLElement;
              // Force reflow/read
              const rect = el.getBoundingClientRect();
              const cloneRect = clone.getBoundingClientRect();
              const top = rect.top - cloneRect.top;
              const height = rect.height;
              const bottom = top + height;

              const startPage = Math.floor(top / PAGE_HEIGHT);
              const endPage = Math.floor(bottom / PAGE_HEIGHT);

              if (startPage !== endPage && height < PAGE_HEIGHT) {
                  const nextPageStart = (startPage + 1) * PAGE_HEIGHT;
                  const marginTop = nextPageStart - top + 20; // 20px buffer
                  el.style.marginTop = `${marginTop}px`;
              }
          }
          // ------------------------
    
          // --- LINK EXTRACTION ---
          // (Keep existing link extraction logic, but perform it AFTER layout shift)
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

          // Wait for images/fonts
          await new Promise(resolve => setTimeout(resolve, 200));
    
          const canvas = await html2canvas(clone, {
            scale: 3, // High quality
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1200 
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
    
          let heightLeft = imgHeight;
          let position = 0;
          
          // Use SLOW compression for quality
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'SLOW');
          heightLeft -= pdfHeight;
    
          while (heightLeft >= 0.1) { // 0.1 tolerance
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'SLOW');
            heightLeft -= pdfHeight;
          }
    
          // Add Links
          const pxToIn = (px: number) => px * (8.5 / 816);
          const pageHeightPx = 1056;
    
          linkCoords.forEach(link => {
              const pageIndex = Math.floor(link.top / pageHeightPx);
              if (pageIndex < pdf.getNumberOfPages()) {
                  pdf.setPage(pageIndex + 1);
                  const relativeTop = link.top - (pageIndex * pageHeightPx);
                  pdf.link(pxToIn(link.left), pxToIn(relativeTop), pxToIn(link.width), pxToIn(link.height), { url: link.url });
              }
          });
    
          pdf.save(`${data.fullName.replace(/\s+/g, '_')}_Resume.pdf`);
          addToast("PDF Downloaded Successfully!", "success");
    
        } catch (error: any) {
            console.error('PDF Generation Error:', error);
            addToast(`PDF Error: ${error.message || 'Unknown error'}`, "error");
        } finally {
            setIsDownloading(false);
        }
    };

  const downloadDOCX = () => { if (!previewRef.current) return; setShowDownloadMenu(false); const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Resume</title></head><body>"; const postHtml = "</body></html>"; const html = preHtml + previewRef.current.innerHTML + postHtml; const link = document.createElement('a'); link.href = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html); link.download = `${data.fullName.replace(/\s+/g, '_')}_Resume.doc`; document.body.appendChild(link); link.click(); document.body.removeChild(link); addToast("DOCX Downloaded!", "success"); };
  const downloadJSON = () => { setShowDownloadMenu(false); const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2)); const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", `${data.fullName.replace(/\s+/g, '_')}_Resume.json`); document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove(); addToast("JSON Downloaded!", "success"); };
  const downloadLatex = () => { setShowDownloadMenu(false); try { const latex = generateLatex(data); const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(latex); const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", `${data.fullName.replace(/\s+/g, '_')}_Resume.tex`); document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove(); addToast("LaTeX Downloaded!", "success"); } catch(e) { addToast("Failed to generate LaTeX", "error"); } };

  // Common Input Style
  const inputStyle = `w-full p-3 border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all duration-200 border-transparent focus:border-transparent ${darkMode ? 'bg-slate-800 text-white shadow-inner' : 'bg-slate-50 text-slate-900 shadow-inner'}`;

  // Filter Logic for Gallery
  const filteredTemplates = useMemo(() => {
      if (templateFilter === 'all') return TEMPLATE_GALLERY;
      if (templateFilter === 'recommended') return recommendedTemplates;
      return TEMPLATE_GALLERY.filter(t => t.tags.includes(templateFilter));
  }, [templateFilter, recommendedTemplates]);

  return (
    <div className={`flex flex-col h-screen overflow-hidden relative ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Template Gallery Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-panel bg-white/95 dark:bg-slate-900/95 rounded-3xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in border border-white/20">
            <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                  <div> <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Template Gallery</h2> <p className="text-slate-500 text-sm mt-1">Choose from {TEMPLATE_GALLERY.length} ATS-optimized designs.</p> </div>
                  <button onClick={() => setShowTemplateModal(false)} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-3 transition-colors hover:rotate-90 duration-300"> <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg> </button>
              </div>
              
              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['all', 'recommended', 'engineering', 'management', 'academic', 'design', 'student'].map(tag => (
                      <button 
                        key={tag} 
                        onClick={() => setTemplateFilter(tag)}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                        ${templateFilter === tag 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      >
                          {tag === 'recommended' ? '🔥 Recommended' : tag}
                      </button>
                  ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
               {templateFilter === 'all' && recommendedTemplates.length > 0 && (
                   <div className="mb-10">
                       <h3 className="text-sm font-black uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-2"><span className="animate-pulse">🔥</span> Recommended for your role</h3>
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                           {recommendedTemplates.slice(0, 4).map((template, idx) => ( <div key={`rec-${template.id}`} className="opacity-0 animate-slide-up h-64" style={{ animationDelay: `${idx * 0.05}s` }}> <TemplateCard config={template} isActive={activeTemplateId === template.id} onSelect={(id) => { setActiveTemplateId(id); setShowTemplateModal(false); addToast(`${template.name} applied!`, 'success'); }} recommended /> </div> ))}
                       </div>
                       <div className="h-px w-full bg-slate-200 dark:bg-slate-800 mt-8"></div>
                   </div>
               )}

               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {filteredTemplates.map((template, idx) => ( <div key={template.id} className="opacity-0 animate-slide-up h-64" style={{ animationDelay: `${idx * 0.05}s` }}> <TemplateCard config={template} isActive={activeTemplateId === template.id} onSelect={(id) => { setActiveTemplateId(id); setShowTemplateModal(false); addToast(`${template.name} applied!`, 'success'); }} /> </div> ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* LinkedIn Import Modal */}
      {showLinkedInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
            <div className={`rounded-3xl shadow-2xl w-full max-w-xl p-8 animate-scale-in border glass-panel bg-white dark:bg-slate-900 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <h3 className="text-2xl font-black mb-3">Import from LinkedIn</h3>
                <p className="text-sm opacity-70 mb-6 leading-relaxed">Go to your LinkedIn profile, select all text (Ctrl+A), copy (Ctrl+C), and paste it here. We'll use AI to extract your experience and skills automatically.</p>
                <textarea 
                    value={linkedInText}
                    onChange={(e) => setLinkedInText(e.target.value)}
                    className={`${inputStyle} h-48 font-mono resize-none`}
                    placeholder="// Paste full profile text here..."
                />
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowLinkedInModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                    <button 
                        onClick={handleLinkedInImport} 
                        disabled={isImportingLinkedIn}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center active:scale-95"
                    >
                        {isImportingLinkedIn ? 'Parsing...' : 'Import Data'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Top Mobile Toggle */}
      <div className="lg:hidden absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full border border-slate-200 dark:border-slate-700 p-1 shadow-lg">
          <button 
            onClick={() => setMobileTab('editor')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mobileTab === 'editor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Editor
          </button>
          <button 
            onClick={() => setMobileTab('preview')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mobileTab === 'preview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Preview
          </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative pt-0">
        
        {/* Editor Column */}
        <div className={`border-r overflow-y-auto p-4 md:p-6 shadow-[4px_0_30px_rgba(0,0,0,0.03)] z-10 flex flex-col transition-all duration-500 ease-in-out ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${focusMode ? 'w-0 opacity-0 overflow-hidden px-0 border-r-0' : 'w-full lg:w-5/12 opacity-100'} ${mobileTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
           {/* Editor Header (Sticky) */}
           <div className="sticky top-0 z-20 pb-4 mb-4 border-b border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 -mx-6 px-6 pt-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-colors border active:scale-95 ${darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}> 
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> 
                            Back
                        </button>
                        <button onClick={() => setShowTemplateModal(true)} className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all border active:scale-95 ${darkMode ? 'border-indigo-900/30 text-indigo-400 hover:bg-indigo-900/20' : 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}> 
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> 
                            Templates
                        </button>
                    </div>
                </div>

                {/* Live ATS Checker Bar */}
                <div className="flex flex-col gap-2 transition-all">
                    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-indigo-100 shadow-sm'}`}>
                        <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className={darkMode ? "text-slate-700" : "text-slate-200"} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                    <path className={`${currentScore ? (currentScore > 75 ? 'text-emerald-500' : currentScore > 50 ? 'text-amber-500' : 'text-red-500') : 'text-indigo-500'} transition-all duration-1000 ease-out`} strokeDasharray={`${currentScore || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                                    {isCheckingScore ? '...' : currentScore || '?'}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wide opacity-70">ATS Score</p>
                                <p className="text-[10px] opacity-50 truncate max-w-[120px]">{isCheckingScore ? "Analyzing..." : (currentScore ? (currentScore > 70 ? "Good Match" : "Needs Work") : "Ready to scan")}</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleCheckScore} 
                            disabled={isCheckingScore}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isCheckingScore ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 active:scale-95'}`}
                        >
                            {isCheckingScore ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Scan'}
                        </button>
                    </div>
                    {/* Feedback Box */}
                    {scoreFeedback && !isCheckingScore && (
                        <div className={`p-3 rounded-xl border text-[11px] leading-relaxed animate-slide-up shadow-sm ${darkMode ? 'bg-indigo-900/20 border-indigo-800 text-indigo-200' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`}>
                            <div className="font-bold mb-1 flex items-center gap-1"><span className="text-base">💡</span> AI Feedback:</div>
                            {scoreFeedback}
                        </div>
                    )}
                </div>
           </div>

           <div className="space-y-6 pb-20">
             
             {/* Personal Info Accordion */}
             <SectionAccordion title="Personal Details" isOpen={sectionsOpen.personal} onToggle={() => toggleSection('personal')} darkMode={darkMode}>
                 <div className="space-y-5 animate-fade-in">
                    <button 
                        onClick={() => setShowLinkedInModal(true)}
                        className="w-full py-3 border-2 border-dashed border-indigo-400/30 text-indigo-500 font-bold rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors flex items-center justify-center gap-2 mb-2 group active:scale-95"
                    >
                        <span className="group-hover:scale-110 transition-transform">📥</span> Import from LinkedIn
                    </button>

                    <div className="space-y-3">
                        <div className="relative group">
                            <span className="absolute left-3 top-3.5 text-slate-400 z-10">👤</span>
                            <input value={data.fullName} onChange={(e) => handleBasicInfoChange('fullName', e.target.value)} className={`${inputStyle} pl-10`} placeholder="Full Name" />
                        </div>
                        <div className="relative group">
                            <span className="absolute left-3 top-3.5 text-slate-400 z-10">💼</span>
                            <input value={data.title} onChange={(e) => handleBasicInfoChange('title', e.target.value)} className={`${inputStyle} pl-10`} placeholder="Job Title" />
                        </div>
                        <div className="relative group">
                            <span className="absolute left-3 top-3.5 text-slate-400 z-10">📍</span>
                            <input value={data.contactInfo} onChange={(e) => handleBasicInfoChange('contactInfo', e.target.value)} className={`${inputStyle} pl-10`} placeholder="Email | Phone | Location" />
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                        <label className="block text-[10px] font-black uppercase opacity-50 mb-3 tracking-widest">Social Links</label>
                        <div className="flex gap-2 mb-3">
                            <input 
                                value={customLinkPlatform} 
                                onChange={(e) => setCustomLinkPlatform(e.target.value)} 
                                placeholder="Label (e.g. GitHub)" 
                                className={`${inputStyle} w-1/3 text-xs`} 
                            />
                            <input 
                                value={customLinkUrl} 
                                onChange={(e) => setCustomLinkUrl(e.target.value)} 
                                placeholder="URL" 
                                className={`${inputStyle} flex-1 text-xs`} 
                            />
                            <button onClick={() => { 
                                if(customLinkUrl) {
                                    const label = customLinkPlatform.trim() || 'Link';
                                    addSocialLink(label, customLinkUrl); 
                                    setCustomLinkUrl(''); 
                                    setCustomLinkPlatform('');
                                }
                            }} className="bg-indigo-600 text-white px-4 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(data.socialLinks || []).map((link, index) => (
                                <div key={index} className={`inline-flex items-center pl-3 pr-2 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 cursor-default ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}>
                                    <span className="font-bold mr-1 text-indigo-500">{link.platform}</span>
                                    <button onClick={() => removeSocialLink(index)} className="ml-2 hover:bg-red-100 hover:text-red-500 rounded-full p-0.5 transition-colors"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 relative">
                       <div className="flex justify-between items-center mb-3"> 
                         <label className="text-[10px] font-black uppercase opacity-50 tracking-widest">Professional Summary</label> 
                         <button 
                            onClick={handleImproveSummary} 
                            disabled={isImproving === 'summary'} 
                            className={`text-[10px] uppercase tracking-wide flex items-center font-bold px-3 py-1 rounded-full shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 ${isImproving === 'summary' ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/30'}`}
                         > 
                            {isImproving === 'summary' ? (
                                <>
                                    <span className="animate-spin w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full mr-2"></span>
                                    AI Working...
                                </>
                            ) : (
                                <>✨ Auto-Improve</>
                            )}
                         </button> 
                       </div>
                       <div className="relative">
                           <textarea value={data.summary} onChange={(e) => handleBasicInfoChange('summary', e.target.value)} className={`${inputStyle} h-36 resize-none leading-relaxed transition-opacity ${isImproving === 'summary' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`} />
                           {isImproving === 'summary' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-2 animate-pulse">
                                        <svg className="w-4 h-4 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Polishing Summary...</span>
                                    </div>
                                </div>
                           )}
                       </div>
                    </div>
                 </div>
             </SectionAccordion>

             {/* Experience Accordion */}
             <SectionAccordion title="Experience" isOpen={sectionsOpen.experience} onToggle={() => toggleSection('experience')} darkMode={darkMode}>
                <div className="space-y-6 animate-fade-in">
                    {data.experience.map((exp, i) => (
                        <div 
                            key={exp.id} 
                            className={`p-5 rounded-2xl border relative group hover:shadow-md transition-shadow ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'experience', i)}
                            onDragOver={(e) => handleDragOver(e, 'experience', i)}
                            onDrop={(e) => handleDrop(e, 'experience', i)}
                            onDragEnd={handleDragEnd}
                        >
                            {/* Drag Handle */}
                            <div className="absolute top-3 right-10 p-1.5 cursor-move text-slate-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100" title="Drag to reorder">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" /></svg>
                            </div>
                            <button onClick={() => deleteItem('experience', i)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-lg shadow-sm">🗑️</button>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <input value={exp.role} onChange={(e) => handleExperienceChange(exp.id, 'role', e.target.value)} className={inputStyle} placeholder="Role" />
                                <input value={exp.company} onChange={(e) => handleExperienceChange(exp.id, 'company', e.target.value)} className={inputStyle} placeholder="Company" />
                                <input value={exp.duration} onChange={(e) => handleExperienceChange(exp.id, 'duration', e.target.value)} className={`${inputStyle} col-span-2 font-mono text-xs`} placeholder="Date Range" />
                            </div>
                            <div className="space-y-3 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                {exp.points.map((pt, ptIdx) => {
                                    const loadingId = `${exp.id}-pt-${ptIdx}`;
                                    const isThisPointImproving = isImproving === loadingId;
                                    return (
                                        <div key={ptIdx} className="relative group/pt transition-all">
                                            <textarea 
                                                value={pt} 
                                                disabled={isThisPointImproving}
                                                onChange={(e) => { const newPoints = [...exp.points]; newPoints[ptIdx] = e.target.value; handleExperienceChange(exp.id, 'points', newPoints as any); }} 
                                                className={`${inputStyle} h-24 resize-none transition-all duration-300 ${isThisPointImproving ? 'opacity-40 scale-[0.99] blur-[1px]' : 'opacity-100 scale-100'}`}
                                            />
                                            {isThisPointImproving ? (
                                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-2xl border border-indigo-100 dark:border-indigo-500/30 flex items-center gap-3 animate-slide-up">
                                                        <div className="relative w-4 h-4">
                                                            <div className="absolute inset-0 border-2 border-indigo-200 rounded-full"></div>
                                                            <div className="absolute inset-0 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-wide">Polishing...</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/pt:opacity-100 transition-all duration-200 transform translate-y-2 group-hover/pt:translate-y-0">
                                                    <button onClick={() => handleImproveExpPoint(exp.id, ptIdx, pt)} className="p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all hover:scale-110 active:scale-95" title="AI Improve">✨</button>
                                                    <button onClick={() => { const newPoints = exp.points.filter((_, idx) => idx !== ptIdx); handleExperienceChange(exp.id, 'points', newPoints as any); }} className="p-1.5 bg-white text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-all hover:scale-110 active:scale-95 shadow-sm">×</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <button onClick={() => handleExperienceChange(exp.id, 'points', [...exp.points, ''] as any)} className="text-xs text-indigo-500 hover:text-indigo-600 font-bold px-2 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">+ Add Bullet</button>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => addItem('experience')} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-400 hover:text-indigo-500 transition-all active:scale-95">+ Add Experience Position</button>
                </div>
             </SectionAccordion>

             {/* Projects Accordion */}
             <SectionAccordion title="Projects" isOpen={sectionsOpen.projects} onToggle={() => toggleSection('projects')} darkMode={darkMode}>
                 <div className="space-y-6 animate-fade-in">
                    {data.projects.map((proj, i) => (
                        <div 
                            key={proj.id} 
                            className={`p-5 rounded-2xl border relative group hover:shadow-md transition-shadow ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'projects', i)}
                            onDragOver={(e) => handleDragOver(e, 'projects', i)}
                            onDrop={(e) => handleDrop(e, 'projects', i)}
                            onDragEnd={handleDragEnd}
                        >
                            {/* Drag Handle */}
                            <div className="absolute top-3 right-10 p-1.5 cursor-move text-slate-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100" title="Drag to reorder">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" /></svg>
                            </div>
                            <button onClick={() => deleteItem('projects', i)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-lg shadow-sm">🗑️</button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                <input value={proj.title} onChange={(e) => handleProjectChange(proj.id, 'title', e.target.value)} className={inputStyle} placeholder="Project Title" />
                                <input value={proj.link || ''} onChange={(e) => handleProjectChange(proj.id, 'link', e.target.value)} className={`${inputStyle} text-blue-500`} placeholder="Link (Optional)" />
                            </div>
                            <div className="space-y-3 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                {proj.points.map((pt, ptIdx) => {
                                    const loadingId = `${proj.id}-pt-${ptIdx}`;
                                    const isThisPointImproving = isImproving === loadingId;
                                    return (
                                        <div key={ptIdx} className="relative group/pt transition-all">
                                            <textarea 
                                                value={pt} 
                                                disabled={isThisPointImproving}
                                                onChange={(e) => { const newPoints = [...proj.points]; newPoints[ptIdx] = e.target.value; handleProjectPointChange(proj.id, ptIdx, e.target.value); }} 
                                                className={`${inputStyle} h-20 resize-none transition-all duration-300 ${isThisPointImproving ? 'opacity-40 scale-[0.99] blur-[1px]' : 'opacity-100 scale-100'}`}
                                                placeholder="Description..."
                                            />
                                            {isThisPointImproving ? (
                                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-2xl border border-indigo-100 dark:border-indigo-500/30 flex items-center gap-3 animate-slide-up">
                                                        <div className="relative w-4 h-4">
                                                            <div className="absolute inset-0 border-2 border-indigo-200 rounded-full"></div>
                                                            <div className="absolute inset-0 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-wide">Polishing...</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/pt:opacity-100 transition-all duration-200 transform translate-y-2 group-hover/pt:translate-y-0">
                                                    <button onClick={() => handleImproveProjectPoint(proj.id, ptIdx, pt)} className="p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all hover:scale-110 active:scale-95">✨</button>
                                                    <button onClick={() => { const newPoints = proj.points.filter((_, idx) => idx !== ptIdx); handleProjectChange(proj.id, 'points', newPoints as any); }} className="p-1.5 bg-white text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-all hover:scale-110 active:scale-95 shadow-sm">×</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <button onClick={() => handleProjectChange(proj.id, 'points', [...proj.points, ''] as any)} className="text-xs text-indigo-500 hover:text-indigo-600 font-bold px-2 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">+ Add Bullet</button>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => addItem('projects')} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-400 hover:text-indigo-500 transition-all active:scale-95">+ Add Project</button>
                 </div>
             </SectionAccordion>

             {/* Education Accordion */}
             <SectionAccordion title="Education" isOpen={sectionsOpen.education} onToggle={() => toggleSection('education')} darkMode={darkMode}>
                 <div className="space-y-6 animate-fade-in">
                    {data.education.map((edu, i) => (
                        <div 
                            key={edu.id} 
                            className={`p-5 rounded-2xl border relative group ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'education', i)}
                            onDragOver={(e) => handleDragOver(e, 'education', i)}
                            onDrop={(e) => handleDrop(e, 'education', i)}
                            onDragEnd={handleDragEnd}
                        >
                            {/* Drag Handle */}
                            <div className="absolute top-3 right-10 p-1.5 cursor-move text-slate-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100" title="Drag to reorder">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" /></svg>
                            </div>
                            <button onClick={() => deleteItem('education', i)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-lg shadow-sm">🗑️</button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <input value={edu.school} onChange={(e) => handleEducationChange(edu.id, 'school', e.target.value)} className={inputStyle} placeholder="School / University" />
                                <input value={edu.degree} onChange={(e) => handleEducationChange(edu.id, 'degree', e.target.value)} className={inputStyle} placeholder="Degree" />
                                <input value={edu.year} onChange={(e) => handleEducationChange(edu.id, 'year', e.target.value)} className={inputStyle} placeholder="Year" />
                                <input value={edu.gpa || ''} onChange={(e) => handleEducationChange(edu.id, 'gpa', e.target.value)} className={inputStyle} placeholder="GPA (Optional)" />
                                <input value={edu.honors || ''} onChange={(e) => handleEducationChange(edu.id, 'honors', e.target.value)} className={`${inputStyle} md:col-span-2`} placeholder="Honors / Awards (e.g. Dean's List)" />
                            </div>
                             <textarea value={edu.coursework || ''} onChange={(e) => handleEducationChange(edu.id, 'coursework', e.target.value)} className={`${inputStyle} h-16 resize-none`} placeholder="Relevant Coursework..." />
                        </div>
                    ))}
                    <button onClick={() => addItem('education')} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-400 hover:text-indigo-500 transition-all active:scale-95">+ Add Education</button>
                 </div>
             </SectionAccordion>

             {/* Certifications Accordion */}
             <SectionAccordion title="Certifications" isOpen={sectionsOpen.certifications} onToggle={() => toggleSection('certifications')} darkMode={darkMode}>
                 <div className="space-y-6 animate-fade-in">
                    {data.certifications.map((cert, i) => (
                        <div 
                            key={cert.id} 
                            className={`p-5 rounded-2xl border relative group ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'certifications', i)}
                            onDragOver={(e) => handleDragOver(e, 'certifications', i)}
                            onDrop={(e) => handleDrop(e, 'certifications', i)}
                            onDragEnd={handleDragEnd}
                        >
                            {/* Drag Handle */}
                            <div className="absolute top-3 right-10 p-1.5 cursor-move text-slate-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100" title="Drag to reorder">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" /></svg>
                            </div>
                            <button onClick={() => deleteItem('certifications', i)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-lg shadow-sm">🗑️</button>
                            <div className="grid grid-cols-1 gap-3">
                                <input value={cert.name} onChange={(e) => handleCertificationChange(cert.id, 'name', e.target.value)} className={inputStyle} placeholder="Certification Name" />
                                <div className="grid grid-cols-2 gap-3">
                                    <input value={cert.issuer} onChange={(e) => handleCertificationChange(cert.id, 'issuer', e.target.value)} className={inputStyle} placeholder="Issuer" />
                                    <input value={cert.date} onChange={(e) => handleCertificationChange(cert.id, 'date', e.target.value)} className={inputStyle} placeholder="Date" />
                                </div>
                                <input value={cert.url || ''} onChange={(e) => handleCertificationChange(cert.id, 'url', e.target.value)} className={`${inputStyle} text-blue-500`} placeholder="Verification URL (Optional)" />
                            </div>
                        </div>
                    ))}
                    <button onClick={() => addItem('certifications')} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-400 hover:text-indigo-500 transition-all active:scale-95">+ Add Certification</button>
                 </div>
             </SectionAccordion>

              {/* Skills Accordion */}
              <SectionAccordion title="Skills" isOpen={sectionsOpen.skills} onToggle={() => toggleSection('skills')} darkMode={darkMode}>
                  <div className="animate-fade-in">
                    <label className="block text-[10px] font-black uppercase mb-3 opacity-50 tracking-widest">Technical Skills</label>
                    <div className={`w-full p-4 border rounded-xl min-h-[5rem] flex flex-wrap gap-2 transition-colors mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        {(data.skills || []).map((skill, index) => { const isMatch = missingKeywords.some(k => k.toLowerCase() === skill.toLowerCase()); return ( <span key={index} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center animate-scale-in border shadow-sm transition-transform hover:scale-105 ${isMatch ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'}`}> {isMatch && <span className="mr-1 text-amber-600">★</span>} {skill} <button onClick={() => removeSkill(index)} className="ml-2 opacity-50 hover:opacity-100 hover:text-red-500 text-lg leading-none">×</button> </span> ); })}
                        <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSkill()} placeholder="Type & Enter..." className={`bg-transparent outline-none text-sm min-w-[100px] flex-1 font-medium ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`} />
                    </div>

                    <label className="block text-[10px] font-black uppercase mb-3 opacity-50 tracking-widest">Soft Skills</label>
                    <div className={`w-full p-4 border rounded-xl min-h-[5rem] flex flex-wrap gap-2 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        {(data.softSkills || []).map((skill, index) => ( <span key={index} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center animate-scale-in border shadow-sm ${darkMode ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-white text-slate-600 border-slate-200'}`}> {skill} <button onClick={() => removeSoftSkill(index)} className="ml-2 opacity-50 hover:opacity-100 hover:text-red-500 text-lg leading-none">×</button> </span> ))}
                        <input value={newSoftSkill} onChange={(e) => setNewSoftSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSoftSkill()} placeholder="Type & Enter..." className={`bg-transparent outline-none text-sm min-w-[100px] flex-1 font-medium ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`} />
                    </div>
                  </div>
              </SectionAccordion>

           </div>
        </div>

        {/* Preview Column */}
        <div className={`flex-1 relative overflow-hidden flex items-center justify-center p-8 pt-24 transition-colors ${darkMode ? 'bg-slate-950' : 'bg-slate-100'} ${mobileTab === 'preview' ? 'w-full block' : 'hidden lg:flex'}`}>
          {/* Grid Background */}
          <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-800/10 pointer-events-none"></div>
          
          {/* Preview Controls Header (Floating) */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full border border-slate-200 dark:border-slate-700 shadow-2xl animate-slide-up">
                <div className="hidden md:flex items-center gap-4 px-4 py-1">
                     <div className="flex items-center gap-2"> 
                         <span className="text-[9px] font-black uppercase opacity-40 tracking-wider">Size</span> 
                         <input type="range" min="8" max="14" step="0.5" value={fontSize} onChange={(e) => setFontSize(parseFloat(e.target.value))} className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" /> 
                     </div>
                     <div className="w-px h-4 bg-slate-300 dark:bg-slate-700"></div>
                     <div className="flex items-center gap-2"> 
                         <span className="text-[9px] font-black uppercase opacity-40 tracking-wider">Zoom</span> 
                         <input type="range" min="50" max="150" step="10" value={viewZoom} onChange={(e) => setViewZoom(parseInt(e.target.value))} className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" /> 
                     </div>
                </div>
                
                <button onClick={() => setDiffMode(!diffMode)} className={`p-2 rounded-full transition-colors active:scale-90 ${diffMode ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600'}`} title="Toggle Diff">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>

                <button onClick={toggleDarkMode} className={`p-2 rounded-full transition-all active:scale-90 hover:rotate-12 ${darkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                    {darkMode ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                </button>

                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} disabled={isDownloading} className="flex items-center px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 hover:-translate-y-0.5"> 
                        {isDownloading ? <span className="animate-pulse">Exporting...</span> : 'Download'} 
                        <svg className={`ml-2 w-3 h-3 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg> 
                    </button>
                    {showDownloadMenu && (
                        <div className={`absolute right-0 mt-3 w-60 rounded-2xl shadow-2xl border py-2 z-50 overflow-hidden animate-scale-in origin-top-right glass-panel bg-white/95 dark:bg-slate-900/95 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <div className="px-4 py-2 text-[10px] uppercase font-bold tracking-widest opacity-40">Formats</div>
                            <button onClick={downloadPDF} className={`w-full text-left px-4 py-3 text-sm flex items-center transition-colors group ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}> 
                                <span className="bg-red-100 text-red-600 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">📄</span> 
                                <div> <span className="font-bold block dark:text-slate-200">PDF Document</span> <span className="text-[10px] opacity-60">Best for sharing</span></div> 
                            </button>
                            <button onClick={downloadDOCX} className={`w-full text-left px-4 py-3 text-sm flex items-center transition-colors group ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}> 
                                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">📝</span> 
                                <div> <span className="font-bold block dark:text-slate-200">Word Document</span> <span className="text-[10px] opacity-60">Best for editing</span></div> 
                            </button>
                            <button onClick={downloadJSON} className={`w-full text-left px-4 py-3 text-sm flex items-center transition-colors group ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}> 
                                <span className="bg-amber-100 text-amber-600 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">⚙️</span> 
                                <div> <span className="font-bold block dark:text-slate-200">JSON Data</span> <span className="text-[10px] opacity-60">Raw data format</span></div> 
                            </button>
                            <button onClick={downloadLatex} className={`w-full text-left px-4 py-3 text-sm flex items-center transition-colors group ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}> 
                                <span className="bg-green-100 text-green-600 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">Tc</span> 
                                <div> <span className="font-bold block dark:text-slate-200">LaTeX Source</span> <span className="text-[10px] opacity-60">For TeX users</span></div> 
                            </button>
                        </div>
                    )}
                </div>
          </div>
          
          <div className="h-full w-full overflow-auto flex justify-center items-start custom-scrollbar pt-4 pb-24 px-4" style={{ perspective: '1000px' }}>
            <div
              ref={previewRef}
              className="bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out origin-top border border-slate-200/50"
              style={{
                width: '8.5in',
                minHeight: '11in',
                transform: `scale(${viewZoom / 100})`,
                transformOrigin: 'top center',
                fontSize: `${fontSize}pt`
              }}
            >
              <UniversalRenderer data={data} config={activeTemplateConfig} spacing={spacing} diffMode={diffMode} missingKeywords={missingKeywords} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResumeEditor;