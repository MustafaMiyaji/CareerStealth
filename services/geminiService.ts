
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, AnalysisInput, ResumeData, ReEvaluationResult, ExperienceItem, EducationItem, LearningResource } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.NUMBER,
      description: "A score from 0 to 100 representing how well the resume matches the job description.",
    },
    missingKeywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Critical keywords missing from the resume.",
    },
    managerRoast: {
      type: Type.STRING,
      description: "A harsh critique from a hiring manager's perspective.",
    },
    fixStrategy: {
      type: Type.STRING,
      description: "Actionable advice categorized by 'Content', 'Structure', and 'Keywords'. Use markdown headers.",
    },
    interviewPrep: {
      type: Type.ARRAY,
      description: "3 difficult interview questions this specific persona would ask based on the resume's weaknesses.",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          context: { type: Type.STRING, description: "Why is this persona asking this? (e.g. 'You claimed X but listed no proof')" },
          idealAnswer: { type: Type.STRING, description: "A STAR method tip for answering this." }
        }
      }
    },
    structuredResume: {
      type: Type.OBJECT,
      description: "The full content of the user's new optimized resume.",
      properties: {
        fullName: { type: Type.STRING },
        title: { type: Type.STRING, description: "The target job title." },
        contactInfo: { type: Type.STRING, description: "Email | Phone | Location" },
        socialLinks: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    platform: { type: Type.STRING, description: "LinkedIn, GitHub, Portfolio, etc." },
                    url: { type: Type.STRING }
                }
            }
        },
        summary: { type: Type.STRING, description: "Optimized professional summary." },
        skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Technical/Hard Skills" },
        softSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Soft Skills (e.g., Leadership, Communication)" },
        experience: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique ID (e.g., 'exp1')" },
              role: { type: Type.STRING },
              company: { type: Type.STRING },
              duration: { type: Type.STRING },
              points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optimized bullet points." }
            }
          }
        },
        education: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique ID (e.g., 'edu1')" },
              degree: { type: Type.STRING },
              school: { type: Type.STRING },
              year: { type: Type.STRING },
              gpa: { type: Type.STRING, description: "e.g., '3.8/4.0' or null if not present" },
              coursework: { type: Type.STRING, description: "Relevant coursework list" },
              honors: { type: Type.STRING, description: "Academic honors or awards" }
            }
          }
        },
        projects: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              link: { type: Type.STRING, description: "Project URL (GitHub, Demo, etc.) if available. Optional." },
              points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed, metric-driven, action-oriented bullet points" }
            }
          }
        },
        certifications: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              issuer: { type: Type.STRING },
              date: { type: Type.STRING },
              url: { type: Type.STRING, description: "Verification URL or credential link. Optional." }
            }
          }
        },
        activities: {
          type: Type.ARRAY,
          description: "Extracurriculars, Volunteering, Leadership",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              role: { type: Type.STRING },
              company: { type: Type.STRING, description: "Organization Name" },
              duration: { type: Type.STRING },
              points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific examples of contributions and impact" }
            }
          }
        }
      }
    }
  },
  required: ["score", "missingKeywords", "managerRoast", "fixStrategy", "interviewPrep", "structuredResume"],
};

export const analyzeResumeWithGemini = async (input: AnalysisInput): Promise<AnalysisResult> => {
  try {
    const { resumeText, resumeFile, jobDescription, persona } = input;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const parts: any[] = [];

    parts.push({
      text: `You are an expert Resume Architect and ATS Optimizer.
      
      **CONTEXT:**
      - Today's Date: ${today}.
      - **HIRING MANAGER PERSONA:** ${persona}.
      
      **TASK:**
      1. Analyze the inputs (Resume + JD).
      2. Provide an ATS Score (0-100).
      3. **MANAGER ROAST:** A harsh, direct critique from the perspective of ${persona}.
      4. **FIX STRATEGY:** Provide 3 distinct categories of advice: 'Content Impact', 'Keyword Optimization', and 'Formatting & Structure'. Be specific.
      5. **INTERVIEW PREP:** Based on the gaps in the resume (e.g. missing skills, short tenure, vague bullets), generate 3 tough interview questions this specific persona would ask to test the candidate.
      6. **STRUCTURED RESUME:** Extract and rewrite content.
         - **Mandatory:** Maintain all original jobs and projects. Do not hallucinately create new ones, but DO rewrite the bullet points to be stronger and include keywords from the JD.
         - **Hyperlinks:** Actively extract embedded URLs (from HTML <a> tags or PDF annotations) for Projects and Certifications if available.
         - **Soft Skills:** Extract explicitly.
         - **Social Links:** Extract any LinkedIn, GitHub, or Portfolio URLs found.
      `
    });

    parts.push({ text: `\n\nTARGET JOB DESCRIPTION:\n${jobDescription}` });

    if (resumeFile) {
      parts.push({ text: `\n\nCANDIDATE RESUME (Attached PDF/Doc):` });
      parts.push({ inlineData: { mimeType: resumeFile.mimeType, data: resumeFile.data } });
    } else {
      parts.push({ text: `\n\nCANDIDATE RESUME (Text Content): ${resumeText}` });
    }

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are a meticulous Resume Parser. You extract Projects, Certifications (with issuers/dates/urls), and Activities with 100% accuracy. You are also a critical hiring manager. If parsing HTML or PDF, extract embedded links.",
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from Gemini");
    return JSON.parse(resultText) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const reEvaluateResume = async (resumeData: ResumeData, jobDescription: string): Promise<ReEvaluationResult> => {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const prompt = `
    Act as a strict ATS algorithm.
    Analyze this JSON resume against the Job Description.
    Current Date: ${today}.
    
    RESUME JSON:
    ${JSON.stringify(resumeData)}

    JOB DESCRIPTION:
    ${jobDescription}

    Return a JSON with:
    1. 'score' (number 0-100)
    2. 'feedback' (string, concise advice on what is still missing or weak)
  `;

  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text!) as ReEvaluationResult;
};

export const improveSection = async (currentText: string, sectionType: 'summary' | 'experience', jobDescription: string): Promise<string> => {
  const prompt = `
    You are a professional resume editor. 
    Rewrite the following ${sectionType.toUpperCase()} to be more impactful and relevant to the Job Description.
    
    Target JD: ${jobDescription.substring(0, 500)}...
    
    Current Text: "${currentText}"
    
    Output ONLY the rewritten text. No explanations.
  `;

  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text?.trim() || currentText;
};

export const generateCoverLetter = async (resume: ResumeData, jobDescription: string): Promise<string> => {
  const prompt = `
    Write a compelling, professional cover letter based on the following Resume and Job Description.
    
    RESUME: ${JSON.stringify(resume)}
    JOB DESCRIPTION: ${jobDescription}
    
    Guidelines:
    - Tone: Professional, confident, and tailored to the company culture inferred from the JD.
    - Structure: Introduction (hook), Body (relevant experience connecting to JD requirements), Conclusion (call to action).
    - Format: Plain text with paragraph breaks.
  `;

  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Failed to generate cover letter.";
};

export const parseLinkedInProfile = async (text: string): Promise<ResumeData> => {
  const partialSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING },
      title: { type: Type.STRING },
      summary: { type: Type.STRING },
      experience: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            role: { type: Type.STRING },
            company: { type: Type.STRING },
            duration: { type: Type.STRING },
            points: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      },
      skills: { type: Type.ARRAY, items: { type: Type.STRING } },
      education: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            school: { type: Type.STRING },
            degree: { type: Type.STRING },
            year: { type: Type.STRING }
          }
        }
      }
    }
  };

  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract resume data from this LinkedIn profile text: \n\n${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: partialSchema,
    }
  });

  const parsed = JSON.parse(response.text!) as Partial<ResumeData>;
  
  const filledData: ResumeData = {
    fullName: parsed.fullName || "",
    title: parsed.title || "",
    contactInfo: "",
    socialLinks: [],
    summary: parsed.summary || "",
    skills: parsed.skills || [],
    softSkills: [],
    experience: (parsed.experience || []).map((e, i) => ({ ...e, id: `li-exp-${i}`, points: e.points || [] })) as ExperienceItem[],
    education: (parsed.education || []).map((e, i) => ({ ...e, id: `li-edu-${i}`, degree: e.degree || "", school: e.school || "", year: e.year || "" })) as EducationItem[],
    projects: [],
    certifications: [],
    activities: []
  };

  return filledData;
};

// NEW: Headshot Roaster
export const roastHeadshot = async (base64Image: string, persona: string): Promise<string> => {
    try {
        const response = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    { text: `You are a ${persona} Hiring Manager. Critique this professional headshot. Is it appropriate? Does it match the vibe? Be honest, maybe a bit roasted, but helpful. Keep it under 50 words.` },
                    { inlineData: { mimeType: "image/jpeg", data: base64Image } }
                ]
            }
        });
        return response.text || "Could not analyze image.";
    } catch (e) {
        console.error(e);
        return "Failed to analyze headshot.";
    }
};

// NEW: Skill Roadmap Generator
export const generateLearningPlan = async (missingSkills: string[], jobDescription: string): Promise<LearningResource[]> => {
    if (missingSkills.length === 0) return [];

    const prompt = `
        The candidate is missing these skills: ${missingSkills.join(', ')}.
        The target job description is: ${jobDescription.substring(0, 300)}...
        
        Create a prioritized learning plan.
        Return a JSON array of objects with keys: "skill", "priority" (High/Medium/Low), and "plan" (a short 1-sentence crash course plan).
    `;

    const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        skill: { type: Type.STRING },
                        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                        plan: { type: Type.STRING }
                    }
                }
            }
        }
    });

    return JSON.parse(response.text!) as LearningResource[];
};

// NEW: LaTeX Generator
export const generateLatex = (data: ResumeData): string => {
    // Simple LaTeX template generator
    const escapeLatex = (str: string) => (str || '').replace(/([&%$#_{}])/g, '\\$1');

    return `
\\documentclass[10pt, letterpaper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{geometry}
\\geometry{margin=0.75in}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{titlesec}

\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{12pt}{6pt}

\\begin{document}

\\begin{center}
    {\\huge \\textbf{${escapeLatex(data.fullName)}}}\\\\
    \\vspace{2mm}
    ${escapeLatex(data.title)} $\\cdot$ ${escapeLatex(data.contactInfo)} \\\\
    ${data.socialLinks?.map(l => `${escapeLatex(l.platform)}: \\url{${l.url}}`).join(' $\\cdot$ ')}
\\end{center}

\\section{Summary}
${escapeLatex(data.summary)}

\\section{Experience}
${data.experience.map(exp => `
\\textbf{${escapeLatex(exp.role)}} \\hfill ${escapeLatex(exp.duration)} \\\\
\\textit{${escapeLatex(exp.company)}}
\\begin{itemize}[noitemsep]
    ${exp.points.map(pt => `\\item ${escapeLatex(pt)}`).join('\n    ')}
\\end{itemize}
\\vspace{2mm}
`).join('')}

\\section{Projects}
${data.projects.map(proj => `
\\textbf{${escapeLatex(proj.title)}} ${proj.link ? `\\hfill \\url{${proj.link}}` : ''}
\\begin{itemize}[noitemsep]
    ${proj.points.map(pt => `\\item ${escapeLatex(pt)}`).join('\n    ')}
\\end{itemize}
\\vspace{2mm}
`).join('')}

\\section{Skills}
${escapeLatex(data.skills.join(', '))}

\\section{Education}
${data.education.map(edu => `
\\textbf{${escapeLatex(edu.school)}} \\hfill ${escapeLatex(edu.year)} \\\\
${escapeLatex(edu.degree)} ${edu.gpa ? `(GPA: ${escapeLatex(edu.gpa)})` : ''}
`).join('\n\\vspace{2mm}\n')}

\\section{Certifications}
${data.certifications.map(cert => `
\\textbf{${escapeLatex(cert.name)}} -- ${escapeLatex(cert.issuer)} (${escapeLatex(cert.date)}) ${cert.url ? `\\hfill \\url{${cert.url}}` : ''}
`).join('\n')}

\\end{document}
    `.trim();
};
