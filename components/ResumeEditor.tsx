import React, { useState, useRef, useEffect } from 'react';
import { ResumeData, ExperienceItem, ProjectItem, EducationItem, CertificationItem, SocialLink } from '../types';
import { reEvaluateResume, improveSection, parseLinkedInProfile } from '../services/geminiService';
import AnalysisChart from './AnalysisChart';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ResumeEditorProps {
  initialData: ResumeData;
  jobDescription: string;
  onBack: () => void;
  darkMode: boolean;
  addToast: (msg: string, type: 'success'|'error'|'info') => void;
  missingKeywords?: string[];
}

const COLORS = {
  slate: { primary: 'text-slate-900', accent: 'text-slate-600', bg: 'bg-slate-900', border: 'border-slate-900', light: 'bg-slate-100' },
  blue: { primary: 'text-blue-900', accent: 'text-blue-600', bg: 'bg-blue-900', border: 'border-blue-900', light: 'bg-blue-50' },
  indigo: { primary: 'text-indigo-900', accent: 'text-indigo-600', bg: 'bg-indigo-900', border: 'border-indigo-900', light: 'bg-indigo-50' },
  emerald: { primary: 'text-emerald-900', accent: 'text-emerald-600', bg: 'bg-emerald-900', border: 'border-emerald-900', light: 'bg-emerald-50' },
  rose: { primary: 'text-rose-900', accent: 'text-rose-600', bg: 'bg-rose-900', border: 'border-rose-900', light: 'bg-rose-50' },
};

type ColorTheme = keyof typeof COLORS;

interface TemplateConfig {
  id: string;
  name: string;
  layout: 'modern' | 'classic' | 'minimal' | 'ivy' | 'tech' | 'executive' | 'smart' | 'compact';
  color: ColorTheme;
  description: string;
}

const TEMPLATE_GALLERY: TemplateConfig[] = [
  { id: 'modern-slate', name: 'Modern (Slate)', layout: 'modern', color: 'slate', description: 'Clean and bold professional look.' },
  { id: 'modern-blue', name: 'Modern (Blue)', layout: 'modern', color: 'blue', description: 'Trustworthy corporate style.' },
  { id: 'tech-slate', name: 'Tech (Dark Mode)', layout: 'tech', color: 'slate', description: 'Developer favorite with sidebar.' },
  { id: 'tech-indigo', name: 'Tech (Indigo)', layout: 'tech', color: 'indigo', description: 'Startups and SaaS style.' },
  { id: 'smart-blue', name: 'Smart (Blue)', layout: 'smart', color: 'blue', description: 'Modern professional.' },
  { id: 'classic-serif', name: 'Classic Serif', layout: 'classic', color: 'slate', description: 'Timeless elegance.' },
  { id: 'ivy-league', name: 'Ivy League', layout: 'ivy', color: 'blue', description: 'Prestigious academic style.' },
  { id: 'minimal-clean', name: 'Minimalist', layout: 'minimal', color: 'slate', description: 'Whitespace heavy.' },
  { id: 'executive-bold', name: 'Executive', layout: 'executive', color: 'slate', description: 'For leadership roles.' },
  { id: 'compact-dense', name: 'Compact', layout: 'compact', color: 'slate', description: 'Fits everything on one page.' },
];

const MiniCircularScore: React.FC<{ score: number; darkMode: boolean }> = ({ score, darkMode }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score > 75 ? '#10b981' : score > 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg width="60" height="60" className="transform -rotate-90">
        <circle cx="30" cy="30" r={radius} stroke={darkMode ? "#334155" : "#e2e8f0"} strokeWidth="6" fill="transparent" />
        <circle cx="30" cy="30" r={radius} stroke={color} strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{Math.round(score)}%</div>
    </div>
  );
};

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

const UniversalRenderer: React.FC<{ data: ResumeData; config: TemplateConfig; spacing: 'compact' | 'normal' | 'open'; }> = ({ data, config, spacing }) => {
  const theme = COLORS[config.color] || COLORS.slate;
  const spacingClass = spacing === 'compact' ? 'space-y-[0.25em]' : spacing === 'open' ? 'space-y-[1em]' : 'space-y-[0.5em]';
  const marginClass = spacing === 'compact' ? 'mb-[0.5em]' : spacing === 'open' ? 'mb-[1.5em]' : 'mb-[1em]';
  const paddingClass = spacing === 'compact' ? 'p-[1.5em]' : 'p-[2.5em]';
  const isSidebar = config.layout === 'tech';
  const isCentered = config.layout === 'modern' || config.layout === 'minimal';
  
  const Header = () => (
    <div className={`${marginClass} ${isCentered ? 'text-center' : ''} ${config.layout === 'ivy' ? 'border-b pb-4 ' + theme.border : ''}`}>
       <h1 className={`text-[1.875em] font-bold uppercase tracking-tight leading-none ${theme.primary}`}>{data.fullName}</h1>
       <p className={`text-[1.125em] font-medium ${theme.accent} mt-[0.25em]`}>{data.title}</p>
       <div className="text-[0.875em] text-slate-500 mt-[0.25em]">
          <span>{data.contactInfo}</span>
          {(data.socialLinks && data.socialLinks.length > 0) && (
              <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[0.9em] ${isCentered ? 'justify-center' : ''}`}>
                  {data.socialLinks.map((link, i) => (
                      <span key={i} className="flex items-center gap-1">
                          <span className="opacity-70 font-semibold text-[0.8em] uppercase tracking-wide">{link.platform}</span> 
                          <span className="text-indigo-600/80">{link.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                      </span>
                  ))}
              </div>
          )}
       </div>
    </div>
  );

  const SectionTitle = ({ title }: { title: string }) => (
     <h2 className={`text-[0.75em] font-bold uppercase tracking-wider mb-[0.75em] ${theme.primary} ${config.layout === 'classic' ? 'border-b border-slate-300 pb-1' : ''}`}>
       {title}
     </h2>
  );
  
  const safeSkills = data.skills || [];
  const safeSoftSkills = data.softSkills || [];
  const safeExperience = data.experience || [];
  const safeEducation = data.education || [];
  const safeProjects = data.projects || [];
  const safeActivities = data.activities || [];
  const safeCertifications = data.certifications || [];
  const safeLinks = data.socialLinks || [];

  return (
    <div className={`${paddingClass} w-full min-h-[inherit] ${isSidebar ? 'grid grid-cols-3 gap-6' : ''} bg-white text-slate-800 font-sans box-border`}>
       {isSidebar ? (
          <>
            <div className={`col-span-1 ${theme.light} p-[1em] rounded-lg h-full`}>
               <div className="mb-[1.5em]">
                 <h1 className={`text-[1.5em] font-bold ${theme.primary} leading-tight`}>{data.fullName}</h1>
                 <p className={`text-[0.875em] ${theme.accent} mt-[0.25em]`}>{data.title}</p>
                 <div className="mt-[1em] text-[0.75em] space-y-[0.25em] text-slate-600">
                    {(data.contactInfo || '').split('|').map((info, i) => <div key={i}>{info.trim()}</div>)}
                    {safeLinks.length > 0 && (
                        <div className="mt-[0.5em] pt-[0.5em] border-t border-slate-200/50">
                            {safeLinks.map((link, i) => (
                                <div key={i} className="flex flex-col mb-1">
                                    <span className="font-bold opacity-70 text-[9px] uppercase tracking-wider">{link.platform}</span>
                                    <span className="truncate text-indigo-600/80">{link.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
               </div>
               <div className="mb-[1.5em]">
                  <SectionTitle title="Skills" />
                  <div className="flex flex-wrap gap-[0.25em]">
                     {safeSkills.map((skill, i) => ( <span key={i} className={`text-[0.625em] px-[0.5em] py-[0.25em] bg-white rounded shadow-sm border ${theme.border} border-opacity-10`}>{skill}</span> ))}
                  </div>
               </div>
                {safeSoftSkills.length > 0 && (
                  <div className="mb-[1.5em]">
                      <SectionTitle title="Soft Skills" />
                      <div className="flex flex-wrap gap-[0.25em]">
                        {safeSoftSkills.map((skill, i) => ( <span key={i} className={`text-[0.625em] px-[0.5em] py-[0.25em] bg-white rounded shadow-sm border ${theme.border} border-opacity-10 italic`}>{skill}</span> ))}
                      </div>
                  </div>
                )}
               <div className="mb-[1.5em]">
                  <SectionTitle title="Education" />
                  {safeEducation.map((edu, i) => (
                     <div key={i} className="mb-[0.75em] text-[0.75em]">
                        <div className="font-bold">{edu.degree}</div>
                        <div className="text-slate-600">{edu.school}</div>
                        <div className="text-slate-400 mb-[0.25em]">{edu.year}</div>
                        {edu.gpa && <div className="text-[0.75em] text-slate-500">GPA: {edu.gpa}</div>}
                     </div>
                  ))}
               </div>
               {/* Sidebar Certifications */}
               {safeCertifications.length > 0 && (
                  <div className="mb-[1.5em]">
                      <SectionTitle title="Certifications" />
                      {safeCertifications.map((cert, i) => (
                          <div key={i} className="mb-[0.5em] text-[0.75em]">
                              <div className="font-bold leading-tight">{cert.name}</div>
                              <div className="text-slate-600 leading-tight">{cert.issuer}</div>
                              <div className="text-slate-400 text-[0.65em]">{cert.date}</div>
                          </div>
                      ))}
                  </div>
               )}
            </div>
            <div className="col-span-2">
               <div className={marginClass}>
                  <SectionTitle title="Summary" />
                  <p className="text-[0.875em] leading-relaxed text-slate-700">{data.summary}</p>
               </div>
               <div className={marginClass}>
                  <SectionTitle title="Experience" />
                  <div className={spacingClass}>
                     {safeExperience.map((exp) => (
                        <div key={exp.id} className="mb-[1em]">
                           <div className="flex justify-between items-baseline mb-[0.25em]">
                              <h3 className="font-bold text-[0.875em]">{exp.role}</h3>
                              <span className="text-[0.75em] text-slate-500 font-mono">{exp.duration}</span>
                           </div>
                           <div className={`text-[0.75em] font-semibold ${theme.accent} mb-[0.5em]`}>{exp.company}</div>
                           <ul className="list-disc list-outside ml-[1em] space-y-[0.25em]">
                              {(exp.points || []).map((pt, i) => ( <li key={i} className="text-[0.875em] text-slate-700 pl-1 marker:text-slate-400">{pt}</li> ))}
                           </ul>
                        </div>
                     ))}
                  </div>
               </div>
               {safeProjects.length > 0 && <div className={marginClass}><SectionTitle title="Projects" /><div className={spacingClass}>{safeProjects.map((proj) => (<div key={proj.id} className="mb-[0.75em]"><div className="flex justify-between items-baseline"><h3 className="font-bold text-[0.875em]">{proj.title}</h3>{proj.link && <span className="text-[0.75em] text-indigo-500">{proj.link}</span>}</div><ul className="list-disc list-outside ml-[1em] mt-[0.25em] space-y-[0.25em]">{proj.points.map((pt, i) => (<li key={i} className="text-[0.875em] text-slate-700 pl-1 marker:text-slate-400">{pt}</li>))}</ul></div>))}</div></div>}
               
               {/* Sidebar Layout: Activities */}
               {safeActivities.length > 0 && (
                   <div className={marginClass}>
                       <SectionTitle title="Activities" />
                       <div className={spacingClass}>
                           {safeActivities.map((act) => (
                               <div key={act.id} className="mb-[0.75em]">
                                   <div className="flex justify-between items-baseline">
                                       <h3 className="font-bold text-[0.875em]">{act.role}</h3>
                                       <span className="text-[0.75em] text-slate-500 font-mono">{act.duration}</span>
                                   </div>
                                   <div className={`text-[0.75em] font-semibold ${theme.accent} mb-[0.25em]`}>{act.company}</div>
                                   <ul className="list-disc list-outside ml-[1em] mt-[0.25em] space-y-[0.25em]">
                                       {(act.points || []).map((pt, i) => (<li key={i} className="text-[0.875em] text-slate-700 pl-1 marker:text-slate-400">{pt}</li>))}
                                   </ul>
                               </div>
                           ))}
                       </div>
                   </div>
               )}
            </div>
          </>
        ) : (
          <>
             <Header />
             <div className={marginClass}> <SectionTitle title="Summary" /> <p className="text-[0.875em] leading-relaxed text-slate-700">{data.summary}</p> </div>
             
             <div className={marginClass}> 
                <SectionTitle title="Skills" /> 
                <div className="text-[0.875em] text-slate-700 leading-relaxed"> 
                    <span className="font-bold text-[0.75em] uppercase mr-2 opacity-70">Technical:</span> {safeSkills.join(' • ')} 
                </div>
                {safeSoftSkills.length > 0 && (
                    <div className="text-[0.875em] text-slate-700 mt-[0.5em] leading-relaxed">
                        <span className="font-bold text-[0.75em] uppercase mr-2 opacity-70">Professional:</span> {safeSoftSkills.join(' • ')}
                    </div>
                )}
             </div>

             <div className={marginClass}> <SectionTitle title="Experience" /> <div className={spacingClass}> {safeExperience.map((exp) => ( <div key={exp.id}> <div className="flex justify-between items-baseline"> <h3 className="font-bold text-[0.875em]">{exp.role}</h3> <span className="text-[0.75em] text-slate-500 font-mono">{exp.duration}</span> </div> <div className={`text-[0.75em] font-semibold ${theme.accent} mb-[0.25em]`}>{exp.company}</div> <ul className="list-disc list-outside ml-[1em] space-y-[0.25em]"> {(exp.points || []).map((pt, i) => ( <li key={i} className="text-[0.875em] text-slate-700 pl-1 marker:text-slate-400">{pt}</li> ))} </ul> </div> ))} </div> </div>
             
             {/* Standard Layout: Projects */}
             {safeProjects.length > 0 && (
                 <div className={marginClass}>
                    <SectionTitle title="Projects" />
                    <div className={spacingClass}>
                        {safeProjects.map((proj) => (
                            <div key={proj.id} className="mb-[1em]">
                                <div className="flex justify-between items-baseline">
                                    <h3 className="font-bold text-[0.875em]">{proj.title}</h3>
                                    {proj.link && <span className="text-[0.75em] text-indigo-500">{proj.link}</span>}
                                </div>
                                <ul className="list-disc list-outside ml-[1em] space-y-[0.25em]">
                                    {(proj.points || []).map((pt, i) => (<li key={i} className="text-[0.875em] text-slate-700 pl-1 marker:text-slate-400">{pt}</li>))}
                                </ul>
                            </div>
                        ))}
                    </div>
                 </div>
             )}

             <div className={marginClass}> <SectionTitle title="Education" /> <div className="grid grid-cols-1 gap-[1em]"> {safeEducation.map((edu, i) => ( <div key={i} className="text-[0.875em]"> <div className="flex justify-between"> <div> <span className="font-bold">{edu.school}</span> - {edu.degree} </div> <div className="text-slate-500 text-[0.75em]">{edu.year}</div> </div> {edu.gpa && <div className="text-[0.75em] text-slate-500 mt-1">GPA: {edu.gpa}</div>} {edu.honors && <div className="text-[0.75em] text-slate-500 italic mt-0.5">{edu.honors}</div>}</div> ))} </div> </div>
             
             {/* Standard Layout: Certifications */}
             {safeCertifications.length > 0 && (
                 <div className={marginClass}>
                     <SectionTitle title="Certifications" />
                     <div className="flex flex-wrap gap-x-6 gap-y-2">
                         {safeCertifications.map((cert, i) => (
                             <div key={i} className="text-[0.875em]">
                                 <span className="font-bold">{cert.name}</span> 
                                 <span className="text-slate-500 text-[0.75em]"> — {cert.issuer} ({cert.date})</span>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {/* Standard Layout: Activities */}
             {safeActivities.length > 0 && (
                 <div className={marginClass}>
                     <SectionTitle title="Leadership & Activities" />
                     <div className={spacingClass}>
                         {safeActivities.map((act) => (
                             <div key={act.id} className="mb-[0.5em]">
                                 <div className="flex justify-between items-baseline">
                                     <h3 className="font-bold text-[0.875em]">{act.role}</h3>
                                     <span className="text-[0.75em] text-slate-500 font-mono">{act.duration}</span>
                                 </div>
                                 <div className={`text-[0.75em] font-semibold ${theme.accent} mb-[0.25em]`}>{act.company}</div>
                                 <ul className="list-disc list-outside ml-[1em] space-y-[0.25em]">
                                     {(act.points || []).map((pt, i) => (<li key={i} className="text-[0.875em] text-slate-700 pl-1 marker:text-slate-400">{pt}</li>))}
                                 </ul>
                             </div>
                         ))}
                     </div>
                 </div>
             )}
          </>
        )}
    </div>
  );
};

const TemplateCard: React.FC<{ config: TemplateConfig; isActive: boolean; onSelect: (id: string) => void; previewData: ResumeData; fontSize: number; }> = ({ config, isActive, onSelect, previewData, fontSize }) => {
  // Use a more complete subset of actual user data for the preview to avoid empty spaces
  const displayData: ResumeData = {
    ...previewData,
    fullName: (previewData.fullName && previewData.fullName.trim()) || "Your Name",
    title: (previewData.title && previewData.title.trim()) || "Job Title",
    summary: (previewData.summary && previewData.summary.length > 150) ? previewData.summary.substring(0, 150) + "..." : (previewData.summary || "Professional summary..."),
    // Take up to 2 items to fill the preview space nicely
    experience: previewData.experience?.length > 0 ? previewData.experience.slice(0, 2) : [{ id: '1', role: 'Role', company: 'Company', duration: 'Date', points: ['Achievement 1', 'Achievement 2'] }],
    education: previewData.education?.length > 0 ? previewData.education.slice(0, 1) : [{ id: 'ed1', degree: 'Degree', school: 'University', year: '2024' }],
    skills: previewData.skills?.length > 0 ? previewData.skills.slice(0, 6) : ["Skill 1", "Skill 2", "Skill 3"],
    socialLinks: previewData.socialLinks || [],
    projects: previewData.projects?.slice(0, 1) || [], 
    activities: [], 
    certifications: [], 
    softSkills: previewData.softSkills?.slice(0, 3) || []
  };

  return (
    <div onClick={() => onSelect(config.id)} className={`cursor-pointer group relative rounded-xl border transition-all duration-300 overflow-hidden hover:shadow-xl hover:scale-[1.02] flex flex-col h-full bg-white ${isActive ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}>
      <div className="flex-1 bg-slate-100 relative overflow-hidden h-72 w-full">
         {/* 
            Preview Logic:
            - Scale: 0.35 (fits ~210mm width into ~300px container)
            - Origin: Top Center (anchors preview to top)
            - No vertical centering flexbox on parent (avoids whitespace gaps)
         */}
         <div className="absolute top-0 left-1/2 transform -translate-x-1/2 mt-4 origin-top scale-[0.35] pointer-events-none">
            <div className="shadow-lg bg-white" style={{ width: '210mm', minHeight: '297mm', fontSize: '12pt' }}>
                <UniversalRenderer data={displayData} config={config} spacing="compact" />
            </div>
         </div>
         {/* Fade out bottom to indicate there is more */}
         <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white via-white/60 to-transparent z-10"></div>
      </div>
      <div className="p-4 bg-white border-t border-slate-100 relative z-20">
        <h3 className="font-bold text-slate-800 text-sm">{config.name}</h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{config.description}</p>
      </div>
      {isActive && <div className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full shadow-md z-30"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>}
    </div>
  );
};

const ResumeEditor: React.FC<ResumeEditorProps> = ({ initialData, jobDescription, onBack, darkMode, addToast, missingKeywords = [] }) => {
  const [data, setData] = useState<ResumeData>({ projects: [], certifications: [], activities: [], softSkills: [], socialLinks: [], ...initialData });
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
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [isCheckingScore, setIsCheckingScore] = useState(false);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [scoreFeedback, setScoreFeedback] = useState<string | null>(null);
  const [isImproving, setIsImproving] = useState<string | null>(null);
  
  // LinkedIn Modal State
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [linkedInText, setLinkedInText] = useState('');
  const [isImportingLinkedIn, setIsImportingLinkedIn] = useState(false);
  
  // Custom Link State
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const [customLinkPlatform, setCustomLinkPlatform] = useState('');

  const activeTemplateConfig = TEMPLATE_GALLERY.find(t => t.id === activeTemplateId) || TEMPLATE_GALLERY[0];

  useEffect(() => { const timer = setTimeout(() => setShowOptimizationBanner(false), 5000); return () => clearTimeout(timer); }, []);
  useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setShowDownloadMenu(false); } }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);
  useEffect(() => { setLastSaved(new Date()); }, [data]);

  const handleCheckScore = async () => { setIsCheckingScore(true); try { const result = await reEvaluateResume(data, jobDescription); setCurrentScore(result.score); setScoreFeedback(result.feedback); addToast(`New Score: ${result.score}%`, result.score > 70 ? 'success' : 'info'); } catch (e) { addToast("Failed to check score.", "error"); } finally { setIsCheckingScore(false); } };
  const handleImproveSummary = async () => { setIsImproving('summary'); try { const newText = await improveSection(data.summary, 'summary', jobDescription); setData(prev => ({ ...prev, summary: newText })); addToast("Summary improved!", "success"); } catch (e) { addToast("AI busy, try again.", "error"); } finally { setIsImproving(null); } };
  const handleImproveExpPoint = async (expId: string, pointIndex: number, text: string) => { setIsImproving(`${expId}-${pointIndex}`); try { const newText = await improveSection(text, 'experience', jobDescription); handleExpPointChange(expId, pointIndex, newText); addToast("Bullet point optimized!", "success"); } catch (e) { addToast("AI busy, try again.", "error"); } finally { setIsImproving(null); } };

  const handleBasicInfoChange = (field: keyof ResumeData, value: string) => { setData(prev => ({ ...prev, [field]: value })); };
  const handleExperienceChange = (id: string, field: string, value: string) => { setData(prev => ({ ...prev, experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp) })); };
  const handleExpPointChange = (expId: string, pointIndex: number, value: string) => { setData(prev => ({ ...prev, experience: prev.experience.map(exp => { if (exp.id === expId) { const newPoints = [...exp.points]; newPoints[pointIndex] = value; return { ...exp, points: newPoints }; } return exp; }) })); };
  const moveItem = (section: keyof ResumeData, index: number, direction: 'up' | 'down') => { const list = data[section] as any[]; if (!list) return; if (direction === 'up' && index > 0) { const newList = [...list]; [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]; setData(prev => ({ ...prev, [section]: newList })); } else if (direction === 'down' && index < list.length - 1) { const newList = [...list]; [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]]; setData(prev => ({ ...prev, [section]: newList })); } };
  
  // FIX: Delete Button (Add Type Button, ensure array exists)
  const deleteItem = (section: keyof ResumeData, index: number) => { 
    const list = data[section];
    if (Array.isArray(list)) {
        const newList = list.filter((_, i) => i !== index);
        setData(prev => ({ ...prev, [section]: newList }));
    }
  };
  
  const addItem = (section: 'experience' | 'projects' | 'activities' | 'certifications' | 'education') => { 
    const id = Date.now().toString(); 
    if (section === 'experience' || section === 'activities') { 
      const newItem: ExperienceItem = { id, role: 'New Role', company: 'New Company', duration: 'Date', points: ['New bullet point'] }; 
      setData(prev => ({ ...prev, [section]: [...prev[section], newItem] })); 
    } else if (section === 'projects') { 
      const newItem: ProjectItem = { id, title: 'New Project', link: '', points: ['Feature 1'] }; 
      setData(prev => ({ ...prev, projects: [...prev.projects, newItem] })); 
    } else if (section === 'certifications') { 
      const newItem: CertificationItem = { id, name: 'Certification Name', issuer: 'Issuer', date: 'Date' }; 
      setData(prev => ({ ...prev, certifications: [...(prev.certifications || []), newItem] })); 
    } else if (section === 'education') {
      const newItem: EducationItem = { id, degree: 'New Degree', school: 'New School', year: 'Year' };
      setData(prev => ({ ...prev, education: [...(prev.education || []), newItem] }));
    }
  };
  const addSkill = () => { if (newSkill.trim()) { const skill = newSkill.trim(); setData(prev => ({ ...prev, skills: [...(prev.skills || []), skill] })); if (missingKeywords.some(k => k.toLowerCase() === skill.toLowerCase())) { addToast("Great! Keyword Match Found!", "success"); } setNewSkill(''); } };
  const removeSkill = (index: number) => { setData(prev => ({ ...prev, skills: (prev.skills || []).filter((_, i) => i !== index) })); };
  const addSoftSkill = () => { if (newSoftSkill.trim()) { const skill = newSoftSkill.trim(); setData(prev => ({ ...prev, softSkills: [...(prev.softSkills || []), skill] })); setNewSoftSkill(''); } };
  const removeSoftSkill = (index: number) => { setData(prev => ({ ...prev, softSkills: (prev.softSkills || []).filter((_, i) => i !== index) })); };
  
  // Link Handlers
  const addSocialLink = (platform: string, url: string) => {
      if (!url.trim()) return;
      const newLink: SocialLink = { id: Date.now().toString(), platform, url };
      setData(prev => ({ ...prev, socialLinks: [...(prev.socialLinks || []), newLink] }));
  };
  const removeSocialLink = (index: number) => {
      setData(prev => ({ ...prev, socialLinks: (prev.socialLinks || []).filter((_, i) => i !== index) }));
  };

  const getWordCount = () => { return JSON.stringify(data).split(/\s+/).length; };
  const handleProjectChange = (id: string, field: string, value: string) => { setData(prev => ({ ...prev, projects: prev.projects.map(proj => proj.id === id ? { ...proj, [field]: value } : proj) })); };
  const handleProjectPointChange = (projId: string, pointIndex: number, value: string) => { setData(prev => ({ ...prev, projects: prev.projects.map(proj => { if (proj.id === projId) { const newPoints = [...proj.points]; newPoints[pointIndex] = value; return { ...proj, points: newPoints }; } return proj; }) })); };
  const handleActivityChange = (id: string, field: string, value: string) => { setData(prev => ({ ...prev, activities: prev.activities.map(act => act.id === id ? { ...act, [field]: value } : act) })); };
  const handleActivityPointChange = (actId: string, pointIndex: number, value: string) => { setData(prev => ({ ...prev, activities: prev.activities.map(act => { if (act.id === actId) { const newPoints = [...act.points]; newPoints[pointIndex] = value; return { ...act, points: newPoints }; } return act; }) })); };
  const handleEducationChange = (id: string, field: string, value: string) => { setData(prev => ({ ...prev, education: prev.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu) })); };
  const handleCertificationChange = (id: string, field: string, value: string) => { setData(prev => ({ ...prev, certifications: prev.certifications.map(cert => cert.id === id ? { ...cert, [field]: value } : cert) })); };

  const handleLinkedInImport = async () => {
    if (!linkedInText.trim()) return;
    setIsImportingLinkedIn(true);
    try {
        const importedData = await parseLinkedInProfile(linkedInText);
        setData(prev => ({
            ...prev,
            fullName: prev.fullName || importedData.fullName,
            title: prev.title || importedData.title,
            summary: prev.summary || importedData.summary,
            skills: [...new Set([...(prev.skills || []), ...(importedData.skills || [])])],
            experience: [...(prev.experience || []), ...(importedData.experience || [])],
            education: [...(prev.education || []), ...(importedData.education || [])],
        }));
        addToast("LinkedIn data imported successfully!", "success");
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
    if (!previewRef.current) return;
    setIsDownloading(true);
    setShowDownloadMenu(false);
    try {
      const originalTransform = previewRef.current.style.transform;
      previewRef.current.style.transform = 'scale(1)';
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, logging: false, windowHeight: previewRef.current.scrollHeight, windowWidth: previewRef.current.scrollWidth, backgroundColor: '#ffffff' });
      previewRef.current.style.transform = originalTransform;
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait', compress: true });
      const imgWidth = 8.5;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= 11;
      while (heightLeft > 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST'); heightLeft -= 11; }
      const filename = `${data.fullName.replace(/\s+/g, '_')}_Resume.pdf`;
      pdf.save(filename);
      addToast("PDF Downloaded Successfully!", "success");
    } catch (error: any) { console.error('PDF Generation Error:', error); addToast(`PDF Error: ${error.message || 'Unknown error'}`, "error"); } finally { if (previewRef.current) previewRef.current.style.transform = `scale(${viewZoom / 100})`; setIsDownloading(false); }
  };

  const downloadDOCX = () => { if (!previewRef.current) return; setShowDownloadMenu(false); const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Resume</title></head><body>"; const postHtml = "</body></html>"; const html = preHtml + previewRef.current.innerHTML + postHtml; const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html); const link = document.createElement('a'); link.href = url; link.download = `${data.fullName.replace(/\s+/g, '_')}_Resume.doc`; document.body.appendChild(link); link.click(); document.body.removeChild(link); addToast("DOCX Downloaded!", "success"); };

  return (
    <div className={`flex flex-col h-screen overflow-hidden relative ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
      {showOptimizationBanner && ( <div className="absolute top-16 left-0 w-full z-40 flex justify-center pointer-events-none"> <div className="bg-emerald-600 text-white px-6 py-2 rounded-b-lg shadow-lg animate-bounce text-sm font-medium pointer-events-auto"> ✨ AI has pre-optimized your resume content below! Review & Edit. <button onClick={() => setShowOptimizationBanner(false)} className="ml-4 opacity-70 hover:opacity-100">×</button> </div> </div> )}
      
      {showLinkedInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className={`rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <h3 className="text-xl font-bold mb-2">Import from LinkedIn</h3>
                <p className="text-sm opacity-70 mb-4">Go to your LinkedIn profile, select all text (Ctrl+A), copy (Ctrl+C), and paste it here. We'll extract your experience and skills.</p>
                <textarea 
                    value={linkedInText}
                    onChange={(e) => setLinkedInText(e.target.value)}
                    className={`w-full h-40 p-3 rounded-lg border text-sm font-mono resize-none focus:ring-2 focus:ring-indigo-500 outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
                    placeholder="Paste profile text here..."
                />
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => setShowLinkedInModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                    <button 
                        onClick={handleLinkedInImport} 
                        disabled={isImportingLinkedIn}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center"
                    >
                        {isImportingLinkedIn ? 'Parsing...' : 'Import Data'}
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="fixed bottom-12 right-8 z-50"> <button onClick={downloadPDF} disabled={isDownloading} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-2xl transition-transform hover:scale-110 active:scale-95 flex items-center justify-center animate-bounce" title="Download PDF"> {isDownloading ? ( <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ) : ( <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> )} </button> </div>

      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div> <h2 className="text-2xl font-bold text-slate-800">Template Gallery</h2> <p className="text-slate-500 text-sm">Choose from {TEMPLATE_GALLERY.length} ATS-optimized designs.</p> </div>
              <button onClick={() => setShowTemplateModal(false)} className="bg-slate-200 hover:bg-slate-300 rounded-full p-2 transition-colors hover:rotate-90 duration-300"> <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg> </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {TEMPLATE_GALLERY.map((template, idx) => ( <div key={template.id} className="opacity-0 animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}> <TemplateCard config={template} isActive={activeTemplateId === template.id} onSelect={(id) => { setActiveTemplateId(id); setShowTemplateModal(false); addToast(`${template.name} applied!`, 'success'); }} previewData={data} fontSize={fontSize} /> </div> ))}
               </div>
            </div>
          </div>
        </div>
      )}

      <div className={`h-16 border-b flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className={`flex items-center text-sm font-medium transition-colors hover:-translate-x-1 ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}> <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Back </button>
          <div className={`h-6 w-px ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <button onClick={() => setShowTemplateModal(true)} className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all hover:shadow-md ${darkMode ? 'bg-slate-700 text-indigo-300 border-slate-600 hover:bg-slate-600' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}> <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> Template </button>
          <div className="hidden md:flex items-center space-x-6 border-l pl-6 ml-2 h-8 border-gray-300 dark:border-gray-700">
             <div className="flex flex-col"> <span className="text-[10px] font-mono uppercase opacity-50 mb-1">Font Size: {fontSize}pt</span> <input type="range" min="8" max="14" step="0.5" value={fontSize} onChange={(e) => setFontSize(parseFloat(e.target.value))} className="w-24 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer hover:bg-indigo-300 transition-colors" /> </div>
             <div className="flex flex-col"> <span className="text-[10px] font-mono uppercase opacity-50 mb-1">View Zoom: {viewZoom}%</span> <input type="range" min="50" max="150" step="10" value={viewZoom} onChange={(e) => setViewZoom(parseInt(e.target.value))} className="w-24 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer hover:bg-indigo-300 transition-colors" /> </div>
          </div>
          <button onClick={() => setFocusMode(!focusMode)} className={`text-xs px-2 py-1 rounded hover:scale-105 transition-transform flex items-center gap-1 ${focusMode ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 dark:bg-slate-700'}`} title="Focus Mode"> <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg> {focusMode ? 'Exit Focus' : 'Focus'} </button>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} disabled={isDownloading} className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all active:scale-95"> {isDownloading ? 'Generating...' : 'Download Resume'} <svg className={`ml-2 w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg> </button>
          {showDownloadMenu && (
            <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl border py-1 z-50 overflow-hidden animate-scale-in origin-top-right ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
               <button onClick={downloadPDF} className={`w-full text-left px-4 py-3 text-sm flex items-center transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}> <span className="bg-red-100 text-red-600 p-1.5 rounded mr-3"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H7a2 2 0 00-2 2v15a2 2 0 002 2z" /></svg></span> <div> <span className="font-bold block">PDF Document</span> <span className="text-xs opacity-70">Best for applications</span> </div> </button>
               <div className={`h-px mx-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
               <button onClick={downloadDOCX} className={`w-full text-left px-4 py-3 text-sm flex items-center transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}> <span className="bg-blue-100 text-blue-600 p-1.5 rounded mr-3"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></span> <div> <span className="font-bold block">Word Document</span> <span className="text-xs opacity-70">Editable format</span> </div> </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div className={`border-r overflow-y-auto p-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 flex flex-col transition-all duration-500 ease-in-out ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${focusMode ? 'w-0 opacity-0 overflow-hidden px-0 border-r-0' : 'w-full md:w-1/3 opacity-100'}`}>
           
          <div className="mb-6 relative group h-auto">
             <div className="absolute inset-0 rounded-xl overflow-hidden z-0">
               {(currentScore !== null && currentScore >= 70) && (
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(transparent_0deg,transparent_20deg,#6366f1_100deg,#ec4899_200deg,transparent_360deg)] animate-border-spin opacity-100"></div>
               )}
             </div>
             <div className={`relative z-10 m-[1.5px] p-5 rounded-[10px] shadow-sm flex flex-col overflow-hidden transition-all duration-300 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                 <div className="flex justify-between items-start mb-3 relative z-10">
                    <div> <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>Live ATS Pulse</h3> <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Real-time resume health check</p> </div>
                    <div className="ml-4"> <MiniCircularScore score={currentScore || 0} darkMode={darkMode} /> </div>
                 </div>
                 <div className={`p-3 rounded-lg text-xs font-medium mb-3 border-l-2 ${currentScore && currentScore > 70 ? 'bg-emerald-50 text-emerald-800 border-emerald-500' : 'bg-amber-50 text-amber-800 border-amber-500'}`}> {scoreFeedback || "Click 'Run Scan' to check your current edits against the JD."} </div>
                 <button onClick={handleCheckScore} disabled={isCheckingScore} className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg hover:shadow-lg transition-all transform active:scale-95 text-sm flex items-center justify-center"> {isCheckingScore ? ( <> <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Scanning... </> ) : (currentScore ? 'Re-Analyze Changes' : 'Run Live Scan')} </button>
             </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-900'}`}> Editor <span className="text-xs opacity-50 ml-1">({getWordCount()} words)</span> </h3>
            <div className={`flex items-center rounded-lg p-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
               <button onClick={() => setSpacing('compact')} className={`px-2 py-1 text-xs rounded transition-all ${spacing === 'compact' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Compact</button>
               <button onClick={() => setSpacing('normal')} className={`px-2 py-1 text-xs rounded transition-all ${spacing === 'normal' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Normal</button>
               <button onClick={() => setSpacing('open')} className={`px-2 py-1 text-xs rounded transition-all ${spacing === 'open' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Open</button>
            </div>
          </div>
           
          <div className="space-y-6 pb-20">
            <div className="mb-6">
                <button 
                    onClick={() => setShowLinkedInModal(true)}
                    className="w-full py-2 border-2 border-dashed border-blue-400 text-blue-500 font-bold rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    Import from LinkedIn
                </button>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase opacity-60">Personal Info</label>
              <input value={data.fullName} onChange={(e) => handleBasicInfoChange('fullName', e.target.value)} className={`w-full p-3 border rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${darkMode ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Full Name" />
              <input value={data.title} onChange={(e) => handleBasicInfoChange('title', e.target.value)} className={`w-full p-3 border rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${darkMode ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Job Title" />
               <input value={data.contactInfo} onChange={(e) => handleBasicInfoChange('contactInfo', e.target.value)} className={`w-full p-3 border rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${darkMode ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Email | Phone | Location" />
            </div>
            
            <div>
                <label className="block text-xs font-semibold uppercase mb-2 opacity-60">Social Links</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {['LinkedIn', 'GitHub', 'Portfolio'].map(p => (
                        <button key={p} onClick={() => { setCustomLinkPlatform(p); setCustomLinkUrl(''); }} className={`px-3 py-1 text-xs rounded-full border transition-all ${customLinkPlatform === p ? 'bg-indigo-100 border-indigo-300 text-indigo-700 shadow-sm' : 'border-slate-300 text-slate-500 hover:bg-slate-100'}`}>
                            + {p}
                        </button>
                    ))}
                     <button onClick={() => { setCustomLinkPlatform('Custom'); setCustomLinkUrl(''); }} className={`px-3 py-1 text-xs rounded-full border transition-all ${customLinkPlatform === 'Custom' ? 'bg-indigo-100 border-indigo-300 text-indigo-700 shadow-sm' : 'border-slate-300 text-slate-500 hover:bg-slate-100'}`}>
                            + Custom
                    </button>
                </div>
                
                {customLinkPlatform && (
                    <div className="flex gap-2 animate-fade-in mb-4">
                        <input value={customLinkUrl} onChange={(e) => setCustomLinkUrl(e.target.value)} placeholder={`Enter ${customLinkPlatform} URL...`} className={`flex-1 p-2 rounded border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'}`} />
                        <button onClick={() => { addSocialLink(customLinkPlatform, customLinkUrl); setCustomLinkPlatform(''); }} className="bg-indigo-500 text-white px-3 rounded text-sm font-bold hover:bg-indigo-600 transition-colors">Add</button>
                    </div>
                )}

                <div className="space-y-2">
                    {(data.socialLinks || []).map((link, index) => (
                        <div key={index} className={`flex justify-between items-center p-2 rounded border shadow-sm ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                             <div className="flex items-center overflow-hidden">
                                 <span className="text-xs font-bold uppercase w-16 flex-shrink-0 opacity-60 text-slate-500">{link.platform}</span>
                                 <span className="text-xs truncate ml-2 text-indigo-500 underline">{link.url}</span>
                             </div>
                             <button onClick={() => removeSocialLink(index)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                        </div>
                    ))}
                </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2"> <div className="flex items-center gap-2"> <label className="block text-xs font-semibold uppercase opacity-60">Summary</label> <CopyAction text={data.summary} darkMode={darkMode} /> </div> <button onClick={handleImproveSummary} disabled={isImproving === 'summary'} className="text-xs flex items-center text-indigo-500 font-medium hover:text-indigo-400 transition-colors"> {isImproving === 'summary' ? ( <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ) : ( <span className="mr-1">✨</span> )} {isImproving === 'summary' ? 'Fixing...' : 'Auto-Improve'} </button> </div>
              <textarea value={data.summary} onChange={(e) => handleBasicInfoChange('summary', e.target.value)} className={`w-full p-3 border rounded-md text-sm h-32 resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${darkMode ? 'bg-slate-700 border-slate-600 text-white focus:bg-slate-600' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} />
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase mb-2 opacity-60">Technical Skills</label>
              <div className={`w-full p-3 border rounded-md min-h-[5rem] flex flex-wrap gap-2 transition-colors ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-300'}`}>
                 {(data.skills || []).map((skill, index) => { const isMatch = missingKeywords.some(k => k.toLowerCase() === skill.toLowerCase()); return ( <span key={index} className={`px-2 py-1 rounded text-xs flex items-center animate-scale-in border ${isMatch ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' : 'bg-indigo-50 text-indigo-800 border-transparent'}`}> {isMatch && <span className="mr-1 text-amber-600">★</span>} {skill} <button onClick={() => removeSkill(index)} className="ml-2 hover:text-red-500 hover:scale-125 transition-transform">×</button> </span> ); })}
                 <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSkill()} placeholder="Add skill + Enter" className={`bg-transparent outline-none text-sm min-w-[80px] flex-1 ${darkMode ? 'text-white' : 'text-slate-800'}`} />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase mb-2 opacity-60">Soft Skills</label>
              <div className={`w-full p-3 border rounded-md min-h-[5rem] flex flex-wrap gap-2 transition-colors ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-300'}`}>
                 {(data.softSkills || []).map((skill, index) => ( <span key={index} className="px-2 py-1 rounded text-xs flex items-center animate-scale-in border bg-emerald-50 text-emerald-800 border-transparent"> {skill} <button onClick={() => removeSoftSkill(index)} className="ml-2 hover:text-red-500 hover:scale-125 transition-transform">×</button> </span> ))}
                 <input value={newSoftSkill} onChange={(e) => setNewSoftSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSoftSkill()} placeholder="Leadership, Teamwork..." className={`bg-transparent outline-none text-sm min-w-[80px] flex-1 ${darkMode ? 'text-white' : 'text-slate-800'}`} />
              </div>
            </div>

            <div>
               <div className="flex justify-between items-center mb-4"> <label className="block text-xs font-semibold uppercase opacity-60">Experience</label> <button onClick={() => addItem('experience')} className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 transition-colors shadow-sm">+ Add</button> </div>
               {(data.experience || []).map((exp, index) => (
                 <div key={exp.id} className={`p-4 rounded-lg border mb-4 shadow-sm relative group animate-slide-down ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"> <button onClick={() => moveItem('experience', index, 'up')} className="p-1 hover:bg-slate-200 rounded transition-colors">↑</button> <button onClick={() => moveItem('experience', index, 'down')} className="p-1 hover:bg-slate-200 rounded transition-colors">↓</button> <button type="button" onClick={() => deleteItem('experience', index)} className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors relative z-20">🗑️</button> </div>
                    <div className="flex gap-2 mb-2"> <div className="flex-none pt-2 text-slate-400"><svg className="w-4 h-4 cursor-grab" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></div> <div className="flex-1 space-y-2"> <input value={exp.company} onChange={(e) => handleExperienceChange(exp.id, 'company', e.target.value)} className={`w-full p-2 rounded border font-bold text-sm outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Company" /> <input value={exp.role} onChange={(e) => handleExperienceChange(exp.id, 'role', e.target.value)} className={`w-full p-2 rounded border text-xs outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Role" /> </div> </div>
                    <div className="space-y-2 mt-2 ml-6"> {(exp.points || []).map((pt, i) => ( <div key={i} className="relative group/point"> <textarea value={pt} onChange={(e) => handleExpPointChange(exp.id, i, e.target.value)} className={`w-full text-xs p-2 border rounded outline-none min-h-[40px] focus:ring-1 focus:ring-indigo-500 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} /> <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/point:opacity-100 transition-opacity"> <CopyAction text={pt} darkMode={darkMode} /> <button onClick={() => handleImproveExpPoint(exp.id, i, pt)} className="bg-indigo-500 text-white p-1 rounded hover:bg-indigo-600 transition-colors" title="AI Auto-Fix"> {isImproving === `${exp.id}-${i}` ? ( <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ) : ( <span className="text-xs">✨</span> )} </button> </div> </div> ))} </div>
                 </div>
               ))}
            </div>
            
            <div>
               <div className="flex justify-between items-center mb-4"> <label className="block text-xs font-semibold uppercase opacity-60">Education</label> <button onClick={() => addItem('education')} className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 transition-colors shadow-sm">+ Add</button> </div>
               {(data.education || []).map((edu, index) => (
                 <div key={edu.id} className={`p-4 rounded-lg border mb-4 shadow-sm animate-slide-down ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-end mb-2"><button type="button" onClick={() => deleteItem('education', index)} className="text-red-400 hover:text-red-600 text-xs">Remove</button></div>
                    <div className="space-y-2"> <input value={edu.school} onChange={(e) => handleEducationChange(edu.id, 'school', e.target.value)} className={`w-full p-2 rounded border font-bold text-sm outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="School / University" /> <input value={edu.degree} onChange={(e) => handleEducationChange(edu.id, 'degree', e.target.value)} className={`w-full p-2 rounded border text-xs outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Degree" /> <div className="grid grid-cols-2 gap-2"> <input value={edu.year} onChange={(e) => handleEducationChange(edu.id, 'year', e.target.value)} className={`w-full p-2 rounded border text-xs outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Year" /> <input value={edu.gpa || ''} onChange={(e) => handleEducationChange(edu.id, 'gpa', e.target.value)} className={`w-full p-2 rounded border text-xs outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="GPA (e.g. 3.8/4.0)" /> </div> <input value={edu.honors || ''} onChange={(e) => handleEducationChange(edu.id, 'honors', e.target.value)} className={`w-full p-2 rounded border text-xs outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Honors / Awards" /> <textarea value={edu.coursework || ''} onChange={(e) => handleEducationChange(edu.id, 'coursework', e.target.value)} className={`w-full text-xs p-2 border rounded outline-none min-h-[40px] focus:ring-1 focus:ring-indigo-500 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Relevant Coursework..." /> </div>
                 </div>
               ))}
            </div>
            
            <div>
               <div className="flex justify-between items-center mb-4"> <label className="block text-xs font-semibold uppercase opacity-60">Certifications</label> <button onClick={() => addItem('certifications')} className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 transition-colors shadow-sm">+ Add</button> </div>
               {(data.certifications || []).map((cert, index) => (
                 <div key={cert.id} className={`p-4 rounded-lg border mb-4 shadow-sm relative group animate-slide-down ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"> <button type="button" onClick={() => deleteItem('certifications', index)} className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors relative z-20">🗑️</button> </div>
                    <div className="space-y-2"> <input value={cert.name} onChange={(e) => handleCertificationChange(cert.id, 'name', e.target.value)} className={`w-full p-2 rounded border font-bold text-sm outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Certification Name" /> <div className="grid grid-cols-2 gap-2"> <input value={cert.issuer} onChange={(e) => handleCertificationChange(cert.id, 'issuer', e.target.value)} className={`w-full p-2 rounded border text-xs outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Issuer" /> <input value={cert.date} onChange={(e) => handleCertificationChange(cert.id, 'date', e.target.value)} className={`w-full p-2 rounded border text-xs outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Date (e.g. 2024)" /> </div> </div>
                 </div>
               ))}
            </div>

            <div>
               <div className="flex justify-between items-center mb-4"> <label className="block text-xs font-semibold uppercase opacity-60">Projects</label> <button onClick={() => addItem('projects')} className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 transition-colors shadow-sm">+ Add</button> </div>
               {(data.projects || []).map((proj, index) => (
                 <div key={proj.id} className={`p-4 rounded-lg border mb-4 shadow-sm relative group animate-slide-down ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"> <button onClick={() => moveItem('projects', index, 'up')} className="p-1 hover:bg-slate-200 rounded transition-colors">↑</button> <button onClick={() => moveItem('projects', index, 'down')} className="p-1 hover:bg-slate-200 rounded transition-colors">↓</button> <button type="button" onClick={() => deleteItem('projects', index)} className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors relative z-20">🗑️</button> </div>
                    <div className="flex gap-2 mb-2"> <div className="flex-none pt-2 text-slate-400"><svg className="w-4 h-4 cursor-grab" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></div> <div className="flex-1 space-y-2"> <input value={proj.title} onChange={(e) => handleProjectChange(proj.id, 'title', e.target.value)} className={`w-full p-2 rounded border font-bold text-sm outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Project Title" /> <input value={proj.link} onChange={(e) => handleProjectChange(proj.id, 'link', e.target.value)} className={`w-full p-2 rounded border text-xs outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Link / Tech Stack" /> </div> </div>
                    <div className="space-y-2 mt-2 ml-6"> {(proj.points || []).map((pt, i) => ( <div key={i} className="relative group/point"> <textarea value={pt} onChange={(e) => handleProjectPointChange(proj.id, i, e.target.value)} className={`w-full text-xs p-2 border rounded outline-none min-h-[40px] focus:ring-1 focus:ring-indigo-500 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} /> <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/point:opacity-100 transition-opacity"> <CopyAction text={pt} darkMode={darkMode} /> </div> </div> ))} </div>
                 </div>
               ))}
            </div>

            <div>
               <div className="flex justify-between items-center mb-4"> <label className="block text-xs font-semibold uppercase opacity-60">Activities</label> <button onClick={() => addItem('activities')} className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 transition-colors shadow-sm">+ Add</button> </div>
               {(data.activities || []).map((act, index) => (
                 <div key={act.id} className={`p-4 rounded-lg border mb-4 shadow-sm relative group animate-slide-down ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"> <button type="button" onClick={() => deleteItem('activities', index)} className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors relative z-20">🗑️</button> </div>
                    <input value={act.company} onChange={(e) => handleActivityChange(act.id, 'company', e.target.value)} className={`w-full p-2 rounded border font-bold text-sm mb-2 outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Organization" />
                    <input value={act.role} onChange={(e) => handleActivityChange(act.id, 'role', e.target.value)} className={`w-full p-2 rounded border text-xs mb-2 outline-none focus:bg-opacity-100 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} placeholder="Role" />
                    <div className="space-y-2 mt-2"> {(act.points || []).map((pt, i) => ( <div key={i} className="relative group/point"> <textarea value={pt} onChange={(e) => handleActivityPointChange(act.id, i, e.target.value)} className={`w-full text-xs p-2 border rounded outline-none min-h-[40px] focus:ring-1 focus:ring-indigo-500 transition-all ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white'}`} /> <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/point:opacity-100 transition-opacity"> <CopyAction text={pt} darkMode={darkMode} /> </div> </div> ))} </div>
                 </div>
               ))}
            </div>

          </div>
        </div>

        <div className={`relative transition-all duration-500 ease-in-out bg-slate-100 dark:bg-slate-950 overflow-y-auto pb-[100px] ${focusMode ? 'flex-1 w-full' : 'w-full md:w-2/3'}`}>
          <div className="flex justify-center p-8 min-h-full items-start">
             <div className="relative shadow-2xl transition-transform duration-200 bg-white" style={{ transform: `scale(${viewZoom / 100})`, transformOrigin: 'top center' }}>
                <div className="absolute inset-0 bg-grain opacity-20 pointer-events-none z-10 mix-blend-multiply"></div>
                <div ref={previewRef} className="w-[8.5in] min-h-[11in] text-left relative z-0" style={{ fontSize: `${fontSize}pt` }}>
                    <UniversalRenderer data={data} config={activeTemplateConfig} spacing={spacing} />
                </div>
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20"> {[1, 2, 3, 4, 5].map(page => ( <div key={page} className="absolute w-[calc(100%+40px)] -left-[20px] h-0 border-b border-dashed border-red-300 opacity-40 flex justify-end" style={{ top: `${page * 11}in` }}> <span className="text-red-300 text-[10px] font-medium px-2 -mb-4 mr-2 bg-white/80 rounded shadow-sm"> Page {page} Guide </span> </div> ))} </div>
             </div>
          </div>
        </div>

        <div className={`absolute bottom-0 left-0 w-full h-8 border-t flex items-center justify-between px-4 text-[10px] font-mono z-30 transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
           <div className="flex items-center gap-4"> <span>Status: <span className="text-emerald-500 font-bold">●</span> Ready</span> <span>Last Saved: {lastSaved.toLocaleTimeString()}</span> </div> <div> Word Count: {getWordCount()} </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeEditor;