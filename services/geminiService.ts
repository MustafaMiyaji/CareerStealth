import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, AnalysisInput, ResumeData, ReEvaluationResult, ExperienceItem, EducationItem } from "../types";

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
              link: { type: Type.STRING, description: "URL or Tech Stack used" },
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
              date: { type: Type.STRING }
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
  required: ["score", "missingKeywords", "managerRoast", "fixStrategy", "structuredResume"],
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
      5. **STRUCTURED RESUME:** Extract and rewrite content.
         - **Mandatory:** Maintain all original jobs and projects. Do not hallucinately create new ones, but DO rewrite the bullet points to be stronger and include keywords from the JD.
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
        systemInstruction: "You are a meticulous Resume Parser. You extract Projects, Certifications (with issuers/dates), and Activities with 100% accuracy.",
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
