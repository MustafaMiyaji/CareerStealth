
export interface AnalysisResult {
  score: number;
  missingKeywords: string[];
  managerRoast: string;
  fixStrategy: string;
  structuredResume: ResumeData;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface ResumeData {
  fullName: string;
  title: string;
  contactInfo: string; // Phone | Email | Location
  socialLinks?: SocialLink[]; // New social links
  summary: string;
  skills: string[]; // Technical Skills
  softSkills: string[]; // New Soft Skills section
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[]; // Changed from string[] to object array
  activities: ExperienceItem[]; // Reuse ExperienceItem for activities (Role, Org, Date, Points)
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface ExperienceItem {
  id: string; // for React keys
  role: string;
  company: string;
  duration: string;
  points: string[];
}

export interface ProjectItem {
  id: string;
  title: string;
  link: string; // or subtitle/tech stack
  points: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  year: string;
  gpa?: string;       // New
  coursework?: string; // New
  honors?: string;     // New
}

export enum AppStep {
  INPUT = 'INPUT',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  EDITOR = 'EDITOR',
  COVER_LETTER = 'COVER_LETTER',
  ERROR = 'ERROR',
  PRIVACY = 'PRIVACY',
  TERMS = 'TERMS'
}

export type HiringPersona = 'Standard' | 'Ruthless Tech Lead' | 'Chill Startup Founder' | 'Corporate HR' | 'Nitpicky Senior Dev';

export interface AnalysisInput {
  resumeText: string;
  resumeFile?: {
    data: string; // Base64 string (without data: prefix)
    mimeType: string;
    fileName: string;
  };
  jobDescription: string;
  persona: HiringPersona;
}

export type TemplateType = string; // Changed to string to support ID-based system

export interface ReEvaluationResult {
  score: number;
  feedback: string;
}
