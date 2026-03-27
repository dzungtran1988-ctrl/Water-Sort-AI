/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Color = 
  | 'ORANGE' 
  | 'GREEN' 
  | 'PURPLE' 
  | 'RED' 
  | 'MAROON' 
  | 'LIGHTBLUE' 
  | 'LIGHTGREEN' 
  | 'PINK' 
  | 'BROWN' 
  | 'MAGENTA' 
  | 'UNKNOWN' 
  | 'EMPTY';

export type Symbol = 
  | 'MINUS' 
  | 'PLUS' 
  | 'LIGHTNING' 
  | 'DIAMOND' 
  | 'HEART' 
  | 'TRIANGLE' 
  | 'STAR' 
  | 'SQUARE' 
  | 'CIRCLE' 
  | 'DROP' 
  | 'UNKNOWN' 
  | 'NONE';

export interface Layer {
  color: Color;
  symbol: Symbol;
}

export type Tube = Color[];

export interface Move {
  from: number;
  to: number;
  color: Color;
}

export interface SolverResult {
  path: Move[];
  status: 'solved' | 'longest' | 'no-solution';
}

export const COLORS: Color[] = [
  'ORANGE', 'GREEN', 'PURPLE', 'RED', 'MAROON', 
  'LIGHTBLUE', 'LIGHTGREEN', 'PINK', 'BROWN', 'MAGENTA', 'UNKNOWN'
];

export const COLOR_TO_SYMBOL: Record<Color, Symbol> = {
  ORANGE: 'MINUS',
  GREEN: 'PLUS',
  PURPLE: 'LIGHTNING',
  RED: 'DIAMOND',
  MAROON: 'HEART',
  LIGHTBLUE: 'TRIANGLE',
  LIGHTGREEN: 'STAR',
  PINK: 'SQUARE',
  BROWN: 'CIRCLE',
  MAGENTA: 'DROP',
  UNKNOWN: 'UNKNOWN',
  EMPTY: 'NONE'
};

export const COLOR_MAP: Record<Color, string> = {
  ORANGE: '#f97316',
  GREEN: '#22c55e',
  PURPLE: '#a855f7',
  RED: '#ef4444',
  MAROON: '#881337',
  LIGHTBLUE: '#3b82f6',
  LIGHTGREEN: '#4ade80',
  PINK: '#f472b6',
  BROWN: '#78350f',
  MAGENTA: '#d946ef',
  UNKNOWN: '#4b5563',
  EMPTY: 'transparent'
};
