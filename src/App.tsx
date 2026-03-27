/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Play, 
  RotateCcw, 
  Plus, 
  Minus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ChevronRight,
  ChevronLeft,
  Settings2,
  Zap,
  Diamond,
  Heart,
  Triangle,
  Star,
  Square,
  Circle,
  Droplets,
  HelpCircle,
  X
} from 'lucide-react';
import { Color, Symbol, Tube, Move, COLORS, COLOR_MAP, COLOR_TO_SYMBOL } from './types';
import { solve } from './logic/solver';

const INITIAL_TUBES: Tube[] = Array(12).fill([]).map(() => []);

const SYMBOL_ICONS: Record<Symbol, React.ElementType> = {
  PLUS: Plus,
  MINUS: Minus,
  LIGHTNING: Zap,
  DIAMOND: Diamond,
  HEART: Heart,
  TRIANGLE: Triangle,
  STAR: Star,
  SQUARE: Square,
  CIRCLE: Circle,
  DROP: Droplets,
  UNKNOWN: HelpCircle,
  NONE: X
};

export default function App() {
  const [tubes, setTubes] = useState<Tube[]>(INITIAL_TUBES);
  const [history, setHistory] = useState<Tube[][]>([]);
  const [solution, setSolution] = useState<Move[]>([]);
  const [solutionIndex, setSolutionIndex] = useState(-1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{ tubeIdx: number; cellIdx: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const saveToHistory = () => {
    setHistory(prev => [...prev, tubes.map(t => [...t])]);
  };

  const undo = () => {
    if (history.length > 0) {
      const last = history[history.length - 1];
      setTubes(last);
      setHistory(prev => prev.slice(0, -1));
      setSolution([]);
      setSolutionIndex(-1);
    }
  };

  const reset = () => {
    setTubes(INITIAL_TUBES);
    setHistory([]);
    setSolution([]);
    setSolutionIndex(-1);
    setStatus('');
  };

  const handleSolve = () => {
    setIsSolving(true);
    setStatus('Solving...');
    
    setTimeout(() => {
      const result = solve(tubes);
      setSolution(result.path);
      setSolutionIndex(-1);
      setIsSolving(false);
      
      if (result.status === 'solved') {
        setStatus(`Solved in ${result.path.length} moves!`);
      } else if (result.status === 'longest') {
        setStatus(`No full solution. Showing longest path (${result.path.length} moves).`);
      } else {
        setStatus('No moves possible.');
      }
    }, 100);
  };

  const executeMove = (move: Move) => {
    setTubes(prev => {
      const newTubes = prev.map(t => [...t]);
      const from = newTubes[move.from];
      const to = newTubes[move.to];
      
      const color = from[from.length - 1];
      let count = 0;
      for (let i = from.length - 1; i >= 0; i--) {
        if (from[i] === color) count++;
        else break;
      }
      
      const amount = Math.min(count, 4 - to.length);
      for (let i = 0; i < amount; i++) {
        to.push(from.pop()!);
      }
      
      return newTubes;
    });
  };

  const runAutoPlay = async () => {
    if (solution.length === 0 || isAutoPlaying) return;
    
    setIsAutoPlaying(true);
    saveToHistory();
    
    const startIdx = solutionIndex + 1;
    for (let i = startIdx; i < solution.length; i++) {
      if (!isAutoPlaying && i !== startIdx) break; 
      setSolutionIndex(i);
      executeMove(solution[i]);
      await new Promise(r => setTimeout(r, 800));
    }
    
    setIsAutoPlaying(false);
  };

  const stepForward = () => {
    if (solutionIndex < solution.length - 1) {
      if (solutionIndex === -1) saveToHistory();
      const nextIdx = solutionIndex + 1;
      setSolutionIndex(nextIdx);
      executeMove(solution[nextIdx]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const analyzeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setStatus('Analyzing image with AI...');

    try {
      const base64 = await fileToBase64(file);
      
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          {
            parts: [
              { text: `Analyze this Water Sort game. 12 tubes, 4 layers max per tube.
Each color is strictly paired with a unique symbol. Use BOTH color and symbol to identify the layer:
- ORANGE: MINUS (-)
- GREEN: PLUS (+)
- PURPLE: LIGHTNING (bolt)
- RED: DIAMOND
- MAROON: HEART
- LIGHTBLUE: TRIANGLE
- LIGHTGREEN: STAR
- PINK: SQUARE
- BROWN: CIRCLE
- MAGENTA: DROP (teardrop)
- UNKNOWN: ?

Return ONLY a raw JSON array of 12 arrays of strings (the color names).
Order: Bottom-to-top for each tube.
Example: [["ORANGE", "GREEN"], ["RED"], [], ...].
No markdown, no 'json' tags.` },
              { inlineData: { mimeType: file.type, data: base64 } }
            ]
          }
        ]
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const parsedTubes = JSON.parse(cleanJson) as Color[][];
      
      const finalTubes = [...parsedTubes];
      while (finalTubes.length < 12) finalTubes.push([]);
      
      setTubes(finalTubes.slice(0, 12));
      setStatus('AI Analysis complete!');
      setSolution([]);
      setSolutionIndex(-1);
    } catch (error) {
      console.error('AI Error:', error);
      setStatus('Failed to analyze image. Please try again or edit manually.');
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateCell = (tubeIdx: number, cellIdx: number, color: Color) => {
    setTubes(prev => {
      const newTubes = prev.map(t => [...t]);
      if (color === 'EMPTY') {
        newTubes[tubeIdx] = newTubes[tubeIdx].slice(0, cellIdx);
      } else {
        if (cellIdx >= newTubes[tubeIdx].length) {
          newTubes[tubeIdx].push(color);
        } else {
          newTubes[tubeIdx][cellIdx] = color;
        }
      }
      return newTubes;
    });
    setEditingCell(null);
    setSolution([]);
    setSolutionIndex(-1);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Water Sort AI
            </h1>
            <p className="text-slate-400 text-sm mt-1">Solve puzzles with Vision & Algorithms</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing || isAutoPlaying}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              AI Scan
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={analyzeImage} 
              accept="image/*" 
              className="hidden" 
            />
            
            <button 
              onClick={reset}
              disabled={isAutoPlaying}
              className="p-2 bg-slate-800 hover:bg-red-900/30 hover:text-red-400 rounded-lg transition-colors"
              title="Reset Board"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Status Bar */}
        <div className="mb-6 h-12 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700/50 px-4">
          {status ? (
            <div className="flex items-center gap-2 text-sm font-medium">
              {status.includes('Solved') ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-cyan-400" />}
              {status}
            </div>
          ) : (
            <span className="text-slate-500 text-sm italic">Ready to solve</span>
          )}
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-6 md:gap-10 mb-10 relative">
          {isAnalyzing && (
            <div className="absolute inset-0 z-20 bg-cyan-500/10 backdrop-blur-[1px] rounded-3xl flex items-center justify-center overflow-hidden">
              <motion.div 
                initial={{ y: "-100%" }}
                animate={{ y: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)]"
              />
              <div className="bg-slate-900/80 px-6 py-3 rounded-full border border-cyan-500/50 flex items-center gap-3 shadow-2xl">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                <span className="text-cyan-400 font-bold tracking-wider uppercase text-sm">AI Scanning...</span>
              </div>
            </div>
          )}

          {tubes.map((tube, tIdx) => {
            const isFrom = solutionIndex >= 0 && solution[solutionIndex].from === tIdx;
            const isTo = solutionIndex >= 0 && solution[solutionIndex].to === tIdx;

            return (
              <div key={tIdx} className="flex flex-col items-center">
                <motion.div 
                  animate={isFrom ? { y: -10 } : { y: 0 }}
                  className={`relative w-12 h-40 border-2 border-slate-600 rounded-b-2xl overflow-hidden bg-slate-900/50 flex flex-col-reverse transition-all ${
                    isFrom ? 'ring-4 ring-red-500/50 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 
                    isTo ? 'ring-4 ring-green-500/50 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : ''
                  }`}
                >
                  {[0, 1, 2, 3].map(i => (
                    <button
                      key={i}
                      onClick={() => setEditingCell({ tubeIdx: tIdx, cellIdx: i })}
                      className="absolute w-full h-1/4 z-10 hover:bg-white/5 transition-colors"
                      style={{ bottom: `${i * 25}%` }}
                    />
                  ))}

                  <AnimatePresence mode="popLayout">
                    {tube.map((color, cIdx) => {
                      const symbol = COLOR_TO_SYMBOL[color];
                      const Icon = SYMBOL_ICONS[symbol] || SYMBOL_ICONS.NONE;
                      return (
                        <motion.div
                          key={`${tIdx}-${cIdx}-${color}`}
                          layout
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="w-full h-1/4 border-t border-black/20 flex items-center justify-center relative group"
                          style={{ backgroundColor: COLOR_MAP[color] }}
                        >
                          {/* Liquid Wave Effect */}
                          <motion.div 
                            animate={{ 
                              x: [-2, 2, -2],
                              rotate: [-1, 1, -1]
                            }}
                            transition={{ 
                              duration: 3 + Math.random() * 2, 
                              repeat: Infinity, 
                              ease: "easeInOut" 
                            }}
                            className="absolute inset-0 opacity-20 bg-gradient-to-t from-white/20 to-transparent pointer-events-none"
                          />
                          
                          <Icon className="w-4 h-4 text-white/80 drop-shadow-md z-10" />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
                <span className="mt-2 text-[10px] font-mono text-slate-500 uppercase">Tube {tIdx + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={handleSolve}
            disabled={isSolving || isAutoPlaying}
            className="flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/20 transition-all disabled:opacity-50"
          >
            {isSolving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings2 className="w-5 h-5" />}
            Calculate Solution
          </button>

          {solution.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button 
                onClick={undo}
                disabled={isAutoPlaying || history.length === 0}
                className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-30"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              <div className="h-6 w-[1px] bg-slate-700 mx-1" />
              
              <button 
                onClick={() => setSolutionIndex(prev => Math.max(-1, prev - 1))}
                disabled={isAutoPlaying || solutionIndex < 0}
                className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={runAutoPlay}
                disabled={isAutoPlaying || solutionIndex >= solution.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                Auto Play
              </button>
              
              <button 
                onClick={stepForward}
                disabled={isAutoPlaying || solutionIndex >= solution.length - 1}
                className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingCell && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setEditingCell(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold mb-4 text-center">Select Layer Type</h3>
                
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {COLORS.map(color => {
                    const symbol = COLOR_TO_SYMBOL[color];
                    const Icon = SYMBOL_ICONS[symbol];
                    return (
                      <button
                        key={color}
                        onClick={() => updateCell(editingCell.tubeIdx, editingCell.cellIdx, color)}
                        className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                          tubes[editingCell.tubeIdx][editingCell.cellIdx] === color ? 'border-white scale-105' : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: COLOR_MAP[color] }}
                      >
                        <Icon className="w-5 h-5 text-white/90" />
                        <span className="text-[8px] font-bold opacity-70">{color}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => updateCell(editingCell.tubeIdx, editingCell.cellIdx, 'EMPTY')}
                    className="flex-1 py-2 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg font-medium transition-colors"
                  >
                    Clear Cell
                  </button>
                  <button 
                    onClick={() => setEditingCell(null)}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
