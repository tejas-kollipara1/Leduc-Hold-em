import { useMemo } from 'react';

interface DataPoint {
  x: number;
  y: number;
}

export const ProfitChart = ({ data }: { data: number[] }) => {
  // We want to show a trend of the last N games.
  // data is an array of balance values or profit values.
  // The image shows a smooth line.
  
  const points = useMemo(() => {
    if (data.length === 0) return [];
    if (data.length === 1) return [{ x: 50, y: 30 }]; // single point — centre it
    
    // Normalize data into 0-100 range for SVG viewbox 0,0 100,60
    const min = Math.min(...data);
    const max = Math.max(...data);
    const actualRange = max - min;
    // Use at least 1000 as the range denominator to dampen small fluctuations
    const displayRange = Math.max(actualRange, 1000);
    
    // Calculate vertical offset to center the line if the range is artificial
    const offset = actualRange < 1000 ? (1000 - actualRange) / 2 : 0;
    const baseMin = min - offset;

    return data.map((val, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: 60 - ((val - baseMin) / displayRange) * 50 - 5
    }));
  }, [data]);

  if (points.length < 2) {
    return (
      <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,190,11,0.2)', fontSize: '0.8rem', letterSpacing: '2px' }}>
        AWAITING DATA POINTS...
      </div>
    );
  }

  // Create SVG path for smooth bezier
  const getPath = (pts: DataPoint[]) => {
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const cp1x = (pts[i].x + pts[i + 1].x) / 2;
        d += ` C ${cp1x},${pts[i].y} ${cp1x},${pts[i+1].y} ${pts[i+1].x},${pts[i+1].y}`;
    }
    return d;
  };

  const pathD = getPath(points);
  const fillD = `${pathD} L 100,60 L 0,60 Z`;

  return (
    <div style={{ position: 'relative', height: '180px', margin: '20px 0' }}>
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255, 190, 11, 0.2)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffbe0b" />
            <stop offset="100%" stopColor="#ffbe0b" />
          </linearGradient>
          <filter id="glow">
             <feGaussianBlur stdDeviation="1.5" result="blur" />
             <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Fill */}
        <path d={fillD} fill="url(#chartFill)" />
        
        {/* The smooth line */}
        <path d={pathD} fill="none" stroke="url(#chartLine)" strokeWidth="1.5" strokeLinecap="round" filter="url(#glow)" />
      </svg>
    </div>
  );
};
