/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, RotateCcw, ArrowRight } from 'lucide-react';

// Types for our calculation history
interface CalculationStep {
  from: number;
  to: number;
  value: number;
  display: string;
  type: 'positive' | 'negative';
}

export default function App() {
  // State for the current position on the number line
  const [currentPos, setCurrentPos] = useState<number>(0);
  // Rational state for exact fraction display
  const [currentRational, setCurrentRational] = useState<{ n: number, d: number }>({ n: 0, d: 1 });
  // History of added numbers
  const [history, setHistory] = useState<CalculationStep[]>([]);
  
  // Helper: GCD
  const gcd = (a: number, b: number): number => {
    return b === 0 ? Math.abs(a) : gcd(b, a % b);
  };

  // Helper: Simplify fraction
  const simplify = (n: number, d: number) => {
    const common = gcd(n, d);
    return { n: n / common, d: d / common };
  };

  // Helper: Decimal to Rational
  const decimalToRational = (val: number) => {
    const s = val.toString();
    if (!s.includes('.')) return { n: val, d: 1 };
    const decimals = s.split('.')[1].length;
    const d = Math.pow(10, decimals);
    const n = Math.round(val * d);
    return simplify(n, d);
  };

  // Helper: Add Rationals
  const addRationals = (r1: { n: number, d: number }, r2: { n: number, d: number }) => {
    const n = r1.n * r2.d + r2.n * r1.d;
    const d = r1.d * r2.d;
    return simplify(n, d);
  };

  // Helper: Format Result Display
  const renderResult = (val: number, rat: { n: number, d: number }, colorClass: string = "text-blue-600") => {
    if (Number.isInteger(val)) return <span className={colorClass}>{val}</span>;
    
    // Ensure denominator is positive for display
    const displayN = rat.d < 0 ? -rat.n : rat.n;
    const displayD = Math.abs(rat.d);
    const isNeg = displayN < 0;

    return (
      <div className={`flex items-center gap-1 ${colorClass} font-black`}>
        <span>{isNeg ? '-' : ''}</span>
        <div className="flex flex-col items-center leading-none">
          <span className="border-b-2 border-current px-1 text-[0.8em]">{Math.abs(displayN)}</span>
          <span className="text-[0.8em]">{displayD}</span>
        </div>
        <span className="text-[0.6em] text-gray-400 ml-1">({val.toFixed(2).replace(/\.?0+$/, '')})</span>
      </div>
    );
  };

  // Input states
  const [isNegative, setIsNegative] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<'decimal' | 'fraction'>('decimal');
  const [decimalValue, setDecimalValue] = useState<string>('');
  const [numerator, setNumerator] = useState<string>('');
  const [denominator, setDenominator] = useState<string>('');
  const [showInputWarning, setShowInputWarning] = useState<boolean>(false);

  // Helper to handle input change and block '-'
  const handleInputChange = (value: string, setter: (val: string) => void) => {
    if (value.includes('-')) {
      setShowInputWarning(true);
      setTimeout(() => setShowInputWarning(false), 3000);
      setter(value.replace(/-/g, ''));
      return;
    }
    setter(value);
  };

  // Number line configuration
  const UNIT_WIDTH = 50; // Pixels per unit (800/16 = 50)
  const [viewBoxX, setViewBoxX] = useState(-400);

  // Update viewBox to follow the point only when it moves near the edges
  useEffect(() => {
    setViewBoxX(prev => {
      const currentMin = prev / UNIT_WIDTH;
      const currentMax = (prev + 800) / UNIT_WIDTH;
      const padding = 2; // Units of padding before moving camera
      
      if (currentPos < currentMin + padding || currentPos > currentMax - padding) {
        return currentPos * UNIT_WIDTH - 400;
      }
      return prev;
    });
  }, [currentPos, UNIT_WIDTH]);

  const handleAdd = () => {
    let value = 0;
    let display = "";

    if (inputMode === 'decimal') {
      const num = parseFloat(decimalValue);
      if (isNaN(num)) return;
      const val = isNegative ? -num : num;
      value = val;
      display = `${isNegative ? '-' : '+'}${num}`;
      
      const rat = decimalToRational(val);
      setCurrentRational(prev => addRationals(prev, rat));
    } else {
      const num = parseInt(numerator);
      const den = parseInt(denominator);
      if (isNaN(num) || isNaN(den) || den === 0) return;
      const val = (isNegative ? -num : num) / den;
      value = val;
      display = `${isNegative ? '-' : '+'}\\frac{${num}}{${den}}`;
      
      setCurrentRational(prev => addRationals(prev, { n: isNegative ? -num : num, d: den }));
    }

    const nextPos = currentPos + value;
    setHistory(prev => [...prev, { from: currentPos, to: nextPos, value, display, type: isNegative ? 'negative' : 'positive' }]);
    setCurrentPos(nextPos);
    
    // Reset inputs
    setDecimalValue('');
    setNumerator('');
    setDenominator('');
  };

  const handleReset = () => {
    setCurrentPos(0);
    setCurrentRational({ n: 0, d: 1 });
    setHistory([]);
    setViewBoxX(-400);
  };

  // Helper to convert number line coordinate to global X coordinate
  const getGlobalX = (val: number) => val * UNIT_WIDTH;

  // Generate ticks based on the visible range of the viewBox
  const ticks = useMemo(() => {
    const t = [];
    const currentMin = Math.floor(viewBoxX / UNIT_WIDTH);
    const currentMax = Math.ceil((viewBoxX + 800) / UNIT_WIDTH);
    
    // Add some padding to ensure smooth transitions
    const startTick = currentMin - 2;
    const endTick = currentMax + 2;
    
    for (let i = startTick; i <= endTick; i++) {
      t.push(i);
    }
    return t;
  }, [viewBoxX, UNIT_WIDTH]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-6 text-center">
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-gray-900">
          정수와 유리수의 덧셈
        </h1>
      </header>

      {/* History Display - Clean & Compact */}
      <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-lg md:text-xl font-bold min-h-[3rem]">
          {history.length === 0 ? (
            <span className="text-gray-400 font-medium">계산 과정이 여기에 표시됩니다.</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {history.map((step, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="text-gray-400 mx-1">+</span>}
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`px-2 py-0.5 rounded-md border ${
                      step.type === 'positive' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {step.display.includes('\\frac') ? (
                      <div className="flex items-center gap-1 text-sm leading-tight">
                        <span className="font-black">{step.display.startsWith('-') ? '-' : '+'}</span>
                        <div className="flex flex-col items-center">
                          <span className="border-b border-current px-1 text-[11px] font-bold">
                            {step.display.match(/\{(\d+)\}/g)?.[0].replace(/[{}]/g, '')}
                          </span>
                          <span className="text-[11px] font-bold">
                            {step.display.match(/\{(\d+)\}/g)?.[1].replace(/[{}]/g, '')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span>{step.display}</span>
                    )}
                  </motion.div>
                </React.Fragment>
              ))}
              <span className="mx-2 text-gray-400">=</span>
              <motion.div 
                key={currentPos}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl"
              >
                {renderResult(currentPos, currentRational)}
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Number Line Visualization - Larger & Slower Motion */}
      <div className="w-full max-w-5xl bg-white border-2 border-gray-200 rounded-xl p-2 md:p-8 mb-6 shadow-md relative overflow-hidden">
          <motion.svg 
            viewBox="0 0 800 160" 
            className="w-full h-auto overflow-visible"
            initial={false}
            animate={{ viewBox: `${viewBoxX} 0 800 160` }}
            transition={{ 
              type: "spring", 
              stiffness: 22.5, // Increased from 15 (1.5x)
              damping: 18,     // Adjusted for stability
              mass: 1.2
            }}
          >
          {/* Main Axis Line - Bolder & Centered vertically at 80 */}
          <line 
            x1={viewBoxX - 2000} y1="80" x2={viewBoxX + 2800} y2="80" 
            stroke="#111827" strokeWidth="4" 
          />
          
          {/* Axis Arrows */}
          <path d={`M${viewBoxX + 12} 68 L${viewBoxX} 80 L${viewBoxX + 12} 92`} fill="none" stroke="#111827" strokeWidth="4" />
          <path d={`M${viewBoxX + 788} 68 L${viewBoxX + 800} 80 L${viewBoxX + 788} 92`} fill="none" stroke="#111827" strokeWidth="4" />

          {/* Ticks and Labels */}
          {ticks.map(t => (
            <g key={t}>
              {/* Major Tick */}
              <line 
                x1={getGlobalX(t)} y1="65" x2={getGlobalX(t)} y2="95" 
                stroke={t === 0 ? "#2563eb" : "#374151"} 
                strokeWidth={t === 0 ? "5" : "3"}
              />
              <text 
                x={getGlobalX(t)} y="130" 
                textAnchor="middle" 
                className={`text-[20px] font-black ${t === 0 ? 'fill-blue-600' : 'fill-gray-600'}`}
              >
                {t}
              </text>
            </g>
          ))}

          {/* Movement Arcs */}
          <AnimatePresence>
            {history.map((step, index) => {
              const x1 = getGlobalX(step.from);
              const x2 = getGlobalX(step.to);
              const distance = Math.abs(x2 - x1);
              const height = Math.min(60, distance / 2 + 20);
              const midX = (x1 + x2) / 2;
              const isPositive = step.to > step.from;
              
              // SVG path for a quadratic bezier curve (arc)
              // M x1,80 Q midX,80-height x2,80
              const pathData = `M ${x1} 80 Q ${midX} ${80 - height} ${x2} 80`;
              
              return (
                <motion.g 
                  key={`arc-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <path 
                    d={pathData} 
                    fill="none" 
                    stroke={step.type === 'positive' ? "#2563eb" : "#dc2626"} 
                    strokeWidth="3" 
                    strokeDasharray="5,5"
                  />
                  {/* Arrow head */}
                  <motion.path 
                    d={isPositive ? "M -8,-5 L 0,0 L -8,5" : "M 8,-5 L 0,0 L 8,5"}
                    fill="none"
                    stroke={step.type === 'positive' ? "#2563eb" : "#dc2626"}
                    strokeWidth="3"
                    transform={`translate(${x2}, 80)`}
                  />
                  {/* Arc Label */}
                  <g transform={`translate(${midX}, ${80 - height - 15})`}>
                    <rect 
                      x="-25" y="-12" width="50" height="24" rx="4" 
                      fill={step.type === 'positive' ? "#dbeafe" : "#fee2e2"} 
                      stroke={step.type === 'positive' ? "#2563eb" : "#dc2626"}
                      strokeWidth="1"
                    />
                    <foreignObject x="-25" y="-12" width="50" height="24">
                      <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${step.type === 'positive' ? 'text-blue-700' : 'text-red-700'}`}>
                        {step.display.includes('\\frac') ? (
                          <div className="flex items-center gap-0.5 scale-90">
                            <span>{step.display.startsWith('-') ? '-' : '+'}</span>
                            <div className="flex flex-col items-center leading-none">
                              <span className="border-b border-current px-0.5">{step.display.match(/\{(\d+)\}/g)?.[0].replace(/[{}]/g, '')}</span>
                              <span>{step.display.match(/\{(\d+)\}/g)?.[1].replace(/[{}]/g, '')}</span>
                            </div>
                          </div>
                        ) : (
                          <span>{step.display}</span>
                        )}
                      </div>
                    </foreignObject>
                  </g>
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* Current Point - Clear Marker with Slower Animation */}
          <motion.g
            initial={false}
            animate={{ x: getGlobalX(currentPos) }}
            transition={{ 
              type: "spring", 
              stiffness: 37.5, // Increased from 25 (1.5x)
              damping: 25,     // Adjusted for stability
              mass: 1.5
            }}
          >
            {/* Pointer Arrow */}
            <path d="M0,65 L-10,45 L10,45 Z" fill="#2563eb" />
            <circle cx="0" cy="80" r="8" fill="#2563eb" stroke="white" strokeWidth="3" />
            
            {/* Value Label - Floating above */}
            <g transform="translate(0, 30)">
              <rect x="-35" y="-22" width="70" height="32" rx="6" fill="#2563eb" />
              <foreignObject x="-35" y="-22" width="70" height="32">
                <div className="w-full h-full flex items-center justify-center text-white">
                  {renderResult(currentPos, currentRational, "text-white")}
                </div>
              </foreignObject>
            </g>
          </motion.g>
        </motion.svg>
      </div>

      {/* Controls - Ultra Compact for Mobile */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* Input Section */}
        <div className="md:col-span-3 bg-white border-2 border-gray-200 rounded-xl p-3 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Mode & Sign Toggle */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button 
                  onClick={() => setInputMode('decimal')}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${inputMode === 'decimal' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                >
                  정수
                </button>
                <button 
                  onClick={() => setInputMode('fraction')}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${inputMode === 'fraction' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                >
                  분수
                </button>
              </div>
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button 
                  onClick={() => setIsNegative(false)}
                  className={`px-3 py-1 rounded-md font-black transition-all text-sm ${!isNegative ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                >
                  +
                </button>
                <button 
                  onClick={() => setIsNegative(true)}
                  className={`px-3 py-1 rounded-md font-black transition-all text-sm ${isNegative ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}
                >
                  -
                </button>
              </div>
            </div>

            {/* Value Input Area */}
            <div className="flex-1 flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full">
              <span className={`text-xl font-black ${isNegative ? 'text-red-600' : 'text-blue-600'}`}>
                {isNegative ? '-' : '+'}
              </span>
              
              {inputMode === 'decimal' ? (
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    step="any"
                    value={decimalValue}
                    onChange={(e) => handleInputChange(e.target.value, setDecimalValue)}
                    onKeyDown={(e) => {
                      if (e.key === '-') {
                        e.preventDefault();
                        setShowInputWarning(true);
                        setTimeout(() => setShowInputWarning(false), 3000);
                      }
                    }}
                    placeholder="숫자"
                    className="w-full bg-transparent text-lg font-black outline-none placeholder:text-gray-300 text-gray-900"
                  />
                  <AnimatePresence>
                    {showInputWarning && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-0 -top-12 bg-gray-800 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl z-50 whitespace-nowrap"
                      >
                        <div className="flex flex-col">
                          <span>'-'는 입력할 수 없습니다.</span>
                          <span className="text-yellow-400 font-bold">음수를 입력하려면 왼쪽의 [-] 버튼을 누르세요.</span>
                        </div>
                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-800 rotate-45" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2 relative">
                  <input 
                    type="number" 
                    value={numerator}
                    onChange={(e) => handleInputChange(e.target.value, setNumerator)}
                    onKeyDown={(e) => {
                      if (e.key === '-') {
                        e.preventDefault();
                        setShowInputWarning(true);
                        setTimeout(() => setShowInputWarning(false), 3000);
                      }
                    }}
                    placeholder="분자"
                    className="w-14 bg-transparent text-center text-base font-black outline-none border-b-2 border-gray-300"
                  />
                  <span className="text-gray-400 font-bold">/</span>
                  <input 
                    type="number" 
                    value={denominator}
                    onChange={(e) => handleInputChange(e.target.value, setDenominator)}
                    onKeyDown={(e) => {
                      if (e.key === '-') {
                        e.preventDefault();
                        setShowInputWarning(true);
                        setTimeout(() => setShowInputWarning(false), 3000);
                      }
                    }}
                    placeholder="분모"
                    className="w-14 bg-transparent text-center text-base font-black outline-none border-b-2 border-gray-300"
                  />
                  <AnimatePresence>
                    {showInputWarning && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-0 -top-12 bg-gray-800 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl z-50 whitespace-nowrap"
                      >
                        <div className="flex flex-col">
                          <span>'-'는 입력할 수 없습니다.</span>
                          <span className="text-yellow-400 font-bold">음수를 입력하려면 왼쪽의 [-] 버튼을 누르세요.</span>
                        </div>
                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-800 rotate-45" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Add Button - Inlined for desktop, full width for mobile */}
            <button 
              onClick={handleAdd}
              disabled={inputMode === 'decimal' ? !decimalValue : (!numerator || !denominator)}
              className="w-full sm:w-32 bg-blue-600 text-white py-2 rounded-lg font-black text-base shadow-sm hover:bg-blue-700 disabled:opacity-30 transition-all active:scale-95 shrink-0"
            >
              더하기
            </button>
          </div>
        </div>

        {/* Actions & Reset */}
        <div className="flex flex-row md:flex-col gap-2">
          <div className="hidden md:block bg-white border-2 border-gray-200 rounded-xl p-2 shadow-sm flex-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <p className="text-[10px] text-gray-500 font-bold">+: 오른쪽</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <p className="text-[10px] text-gray-500 font-bold">-: 왼쪽</p>
            </div>
          </div>

          <button 
            onClick={handleReset}
            className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95 border border-gray-200"
          >
            <RotateCcw size={14} /> 초기화
          </button>
        </div>
      </div>

      <footer className="mt-8 text-gray-400 text-[10px] font-medium uppercase tracking-widest pb-4">
        Middle School Math • Number Line Helper
      </footer>
    </div>
  );
}
