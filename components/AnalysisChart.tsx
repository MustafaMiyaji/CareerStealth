import React, { useEffect, useState } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface AnalysisChartProps {
  score: number;
}

const AnalysisChart: React.FC<AnalysisChartProps> = ({ score }) => {
  const [displayScore, setDisplayScore] = useState(0);

  // Animate count up
  useEffect(() => {
    let start = 0;
    const duration = 1500; // 1.5s animation
    const stepTime = Math.max(10, Math.floor(duration / (score || 1))); // prevent div by 0
    
    if (score === 0) return;

    const timer = setInterval(() => {
      start += 1;
      setDisplayScore(start);
      if (start >= score) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  // Gradient colors logic
  const fillColor = displayScore > 80 ? '#10b981' : displayScore > 50 ? '#f59e0b' : '#ef4444';

  const data = [{ name: 'Score', value: displayScore, fill: fillColor }];

  return (
    <div className="relative w-full flex justify-center items-center h-56 md:h-64">
      <div className="w-full h-full relative max-w-[280px] aspect-square">
        {/* Glow Effect */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-transparent to-current opacity-10 blur-2xl transition-colors duration-500 ${displayScore > 80 ? 'text-emerald-500' : displayScore > 50 ? 'text-amber-500' : 'text-red-500'}`}></div>
        
        <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
            innerRadius="85%" 
            outerRadius="100%" 
            barSize={15} 
            data={data} 
            startAngle={180} 
            endAngle={0}
            cy="60%" 
            >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
                background={{ fill: 'rgba(203, 213, 225, 0.3)' }}
                dataKey="value"
                cornerRadius={12}
                isAnimationActive={false} 
            />
            </RadialBarChart>
        </ResponsiveContainer>
        
        {/* Text centered in the semi-circle */}
        <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full z-10 flex flex-col items-center justify-center pt-4">
          <div className={`text-6xl md:text-7xl font-black tracking-tighter leading-none flex items-start justify-center transition-colors duration-500 ${displayScore > 80 ? 'text-emerald-500' : displayScore > 50 ? 'text-amber-500' : 'text-red-500'}`}>
            <span>{displayScore}</span>
            <span className="text-3xl mt-1.5 opacity-60 ml-0.5">%</span>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] md:text-xs mt-2 uppercase tracking-[0.25em] font-bold">Match Score</p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisChart;