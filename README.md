# CareerStealth - AI Resume Optimizer

CareerStealth is an advanced, privacy-first resume optimization tool powered by **Google Gemini 3 Flash**. Unlike generic ATS checkers, CareerStealth simulates specific hiring manager personas (from "Chill Startup Founder" to "Ruthless Tech Lead") to provide adversarial feedback ("Roasts") and actionable fix strategies.

## 🚀 Features

*   **Persona-Based Analysis:** Choose who reviews your resume. Get feedback tailored to Corporate HR, Senior Devs, or Startup Founders.
*   **Live ATS Scoring:** Real-time compatibility scoring against your target Job Description.
*   **Adversarial Feedback:** Receive a "Manager's Roast" to understand exactly why a human might reject your resume.
*   **Stealth Editor:** A built-in resume editor that auto-improves bullet points and summaries using GenAI.
*   **Visual Resume Builder:** Generate ATS-friendly, clean PDF resumes instantly.
*   **Cover Letter Generator:** Auto-draft tailored cover letters based on your optimized resume and the JD.
*   **Privacy First:** No database. Your data is processed in real-time and stored only in your browser's local storage.

## 🛠️ Tech Stack

*   **Frontend:** React, TypeScript, Tailwind CSS
*   **AI:** Google Gemini 2.0 Flash / Gemini 1.5 Pro (via `@google/genai` SDK)
*   **Visualization:** Recharts
*   **Document Handling:** `jspdf`, `html2canvas`, `mammoth` (for DOCX parsing)
*   **Build Tool:** Vite

## 📦 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/career-stealth.git
    cd career-stealth
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure API Key:**
    Create a `.env` file in the root directory:
    ```env
    VITE_API_KEY=your_google_gemini_api_key_here
    ```
    *Note: The application expects `process.env.API_KEY` or `import.meta.env.VITE_API_KEY`. Ensure your environment variables are set up correctly for the build tool.*

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

## 🚀 Deployment (Vercel)

This project is configured for easy deployment on Vercel.

1.  Push your code to GitHub.
2.  Import the project in Vercel.
3.  Add your `API_KEY` (or `VITE_API_KEY`) in the Vercel Project Settings > Environment Variables.
4.  Deploy!

## 📄 License

MIT License.
