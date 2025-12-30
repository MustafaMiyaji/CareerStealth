import React from 'react';

interface Props {
  darkMode: boolean;
  onBack: () => void;
}

const TermsOfService: React.FC<Props> = ({ darkMode, onBack }) => {
  return (
    <div className={`w-full max-w-4xl mx-auto px-6 py-12 animate-fade-in ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
      <button onClick={onBack} className="mb-8 flex items-center text-sm font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Home
      </button>
      <h1 className={`text-4xl font-extrabold mb-8 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Terms of Service</h1>
      
      <div className="space-y-8 text-sm leading-relaxed border-l-2 pl-6 border-slate-200 dark:border-slate-700">
        <section>
          <h2 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>1. Acceptance of Terms</h2>
          <p>By accessing and using CareerStealth, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
        </section>

        <section>
          <h2 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>2. Use License</h2>
          <p>Permission is granted to temporarily use CareerStealth for personal, non-commercial transitory viewing and resume optimization. This is the grant of a license, not a transfer of title. You may not modify or copy the materials for commercial use or attempt to decompile or reverse engineer any software contained on CareerStealth.</p>
        </section>

        <section>
          <h2 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>3. Disclaimer</h2>
          <p>The materials on CareerStealth are provided "as is". We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties. The AI-generated advice is for informational purposes only and does not guarantee job placement or interview success.</p>
        </section>
        
        <section>
             <h2 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>4. Limitations</h2>
             <p>In no event shall CareerStealth or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit) arising out of the use or inability to use the materials on CareerStealth, even if CareerStealth has been notified orally or in writing of the possibility of such damage.</p>
        </section>

        <section>
             <h2 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>5. Modifications</h2>
             <p>CareerStealth may revise these terms of service for its web application at any time without notice. By using this web application you are agreeing to be bound by the then current version of these terms of service.</p>
        </section>

        <section>
            <h2 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>6. Contact</h2>
            <p>For support or inquiries regarding these terms:</p>
            <ul className="mt-2 space-y-1">
                <li>GitHub: <a href="https://github.com/MustafaMiyaji" target="_blank" className="text-indigo-500 hover:underline">MustafaMiyaji</a></li>
                <li>LinkedIn: <a href="https://www.linkedin.com/in/mustafa-alimiyaji-195742327/" target="_blank" className="text-indigo-500 hover:underline">Mustafa Miyaji</a></li>
            </ul>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;