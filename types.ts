
export interface AnalysisResult {
  score: number;
  missingKeywords: string[];
  managerRoast: string;
  fixStrategy: string;
  structuredResume: ResumeData;
  interviewPrep: InterviewQuestion[];
}

export interface InterviewQuestion {
  question: string;
  context: string;
  idealAnswer: string;
}

export interface LearningResource {
  skill: string;
  priority: 'High' | 'Medium' | 'Low';
  plan: string; // "Week 1: Build X..."
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  companyName: string;
  role: string;
  inputData: AnalysisInput;
  result: AnalysisResult;
  coverLetter?: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface ResumeData {
  fullName: string;
  title: string;
  contactInfo: string;
  socialLinks?: SocialLink[];
  summary: string;
  skills: string[];
  softSkills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  activities: ExperienceItem[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  duration: string;
  points: string[];
}

export interface ProjectItem {
  id: string;
  title: string;
  link?: string;
  points: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  year: string;
  gpa?: string;
  coursework?: string;
  honors?: string;
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

export type HiringPersona = string;

export interface AnalysisInput {
  resumeText: string;
  resumeFile?: {
    data: string;
    mimeType: string;
    fileName: string;
  };
  jobDescription: string;
  persona: HiringPersona;
}

export type TemplateType = string;

export interface ReEvaluationResult {
  score: number;
  feedback: string;
}
