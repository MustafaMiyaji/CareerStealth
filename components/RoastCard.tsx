import React from 'react';

interface RoastCardProps {
  roast: string;
  fix: string;
}

const RoastCard: React.FC<RoastCardProps> = ({ roast, fix }) => {
  return (
    <div className="space-y-6">
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg shadow-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-bold text-red-800">Hiring Manager's Roast</h3>
            <p className="mt-2 text-red-700 italic">"{roast}"</p>
          </div>
        </div>
      </div>

      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-lg shadow-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-bold text-emerald-800">The Fix Strategy</h3>
            <p className="mt-2 text-emerald-700">{fix}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoastCard;
