import React, { useEffect, useState } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

interface AnalysisChartProps {
  score: number;
}

const AnalysisChart: React.FC<AnalysisChartProps> = ({ score }) => {
  const [displayScore, setDisplayScore] = useState(0);

  // Animate count up
  useEffect(() => {
    let start = 0;
    const duration = 1500; // 1.5s animation
    const stepTime = Math.max(10, Math.floor(duration / score));
    
    if (score === 0) return;

    const timer = setInterval(() => {
      start += 1;
      setDisplayScore(start);
      if (start >= score) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  const data = [{ name: 'Score', value: displayScore, fill: displayScore > 75 ? '#10b981' : displayScore > 50 ? '#f59e0b' : '#ef4444' }];

  return (
    <div className="relative w-full flex justify-center items-center py-4">
      <div className="relative transform transition-transform hover:scale-105 duration-300" style={{ width: 250, height: 250 }}>
        <RadialBarChart 
          width={250} 
          height={250} 
          innerRadius="70%" 
          outerRadius="100%" 
          barSize={20} 
          data={data} 
          startAngle={180} 
          endAngle={0}
          cy="70%" 
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background
            dataKey="value"
            cornerRadius={10}
            isAnimationActive={false} // We handle animation via state
          />
        </RadialBarChart>
        
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/3 text-center" style={{ marginTop: '-10px' }}>
          <span className={`text-6xl font-extrabold tracking-tighter ${displayScore > 75 ? 'text-emerald-500' : displayScore > 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {displayScore}%
          </span>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-bold">Match Score</p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisChart;