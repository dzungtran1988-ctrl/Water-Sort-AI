/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Color, Symbol, Tube, Move, SolverResult, COLOR_TO_SYMBOL } from '../types';

const MAX_LAYERS = 4;

function isTubeFullAndUniform(tube: Tube): boolean {
  if (tube.length !== MAX_LAYERS) return false;
  const first = tube[0];
  if (first === 'UNKNOWN') return false;
  return tube.every(c => c === first);
}

function isSolved(tubes: Tube[]): boolean {
  return tubes.every(tube => tube.length === 0 || isTubeFullAndUniform(tube));
}

function getTopColor(tube: Tube): { color: Color; count: number } | null {
  if (tube.length === 0) return null;
  const color = tube[tube.length - 1];
  let count = 0;
  for (let i = tube.length - 1; i >= 0; i--) {
    if (tube[i] === color) count++;
    else break;
  }
  return { color, count };
}

function canPour(from: Tube, to: Tube): boolean {
  if (from.length === 0) return false;
  if (to.length === MAX_LAYERS) return false;

  const fromTop = getTopColor(from)!;
  if (fromTop.color === 'UNKNOWN') return false;

  if (to.length === 0) return true;

  const toTop = getTopColor(to)!;
  return fromTop.color === toTop.color && (to.length + fromTop.count <= MAX_LAYERS || to.length < MAX_LAYERS);
}

function pour(tubes: Tube[], fromIdx: number, toIdx: number): Tube[] {
  const newTubes = tubes.map(t => [...t]);
  const from = newTubes[fromIdx];
  const to = newTubes[toIdx];

  const fromTop = getTopColor(from)!;
  const amountToPour = Math.min(fromTop.count, MAX_LAYERS - to.length);

  for (let i = 0; i < amountToPour; i++) {
    to.push(from.pop()!);
  }

  return newTubes;
}

function serialize(tubes: Tube[]): string {
  return [...tubes]
    .map(t => t.join(','))
    .sort()
    .join('|');
}

export function solve(initialTubes: Tube[]): SolverResult {
  // 1. BFS for shortest winning path
  const queue: { tubes: Tube[]; path: Move[] }[] = [{ tubes: initialTubes, path: [] }];
  const visited = new Set<string>();
  visited.add(serialize(initialTubes));

  while (queue.length > 0) {
    const { tubes, path } = queue.shift()!;

    if (isSolved(tubes)) {
      return { path, status: 'solved' };
    }

    const possibleMoves = getPossibleMoves(tubes);
    for (const move of possibleMoves) {
      const nextTubes = pour(tubes, move.from, move.to);
      
      // Check if move revealed UNKNOWN
      const revealedUnknown = tubes[move.from].length > nextTubes[move.from].length && 
                             nextTubes[move.from].length > 0 && 
                             nextTubes[move.from][nextTubes[move.from].length - 1] === 'UNKNOWN';

      const s = serialize(nextTubes);
      if (!visited.has(s)) {
        visited.add(s);
        if (revealedUnknown) {
          // If we reveal an unknown, we stop this branch in BFS but it's a potential endpoint
          continue; 
        }
        queue.push({ tubes: nextTubes, path: [...path, move] });
      }
    }
  }

  // 2. If no win found, use DFS to find the LONGEST path
  let longestPath: Move[] = [];
  const dfsVisited = new Set<string>();

  function dfs(currentTubes: Tube[], currentPath: Move[]) {
    const s = serialize(currentTubes);
    dfsVisited.add(s);

    if (currentPath.length > longestPath.length) {
      longestPath = currentPath;
    }

    const possibleMoves = getPossibleMoves(currentTubes);

    for (const move of possibleMoves) {
      const nextTubes = pour(currentTubes, move.from, move.to);
      
      // Check if move revealed UNKNOWN
      const revealedUnknown = currentTubes[move.from].length > nextTubes[move.from].length && 
                             nextTubes[move.from].length > 0 && 
                             nextTubes[move.from][nextTubes[move.from].length - 1] === 'UNKNOWN';

      const nextS = serialize(nextTubes);
      
      if (!dfsVisited.has(nextS)) {
        if (revealedUnknown) {
          // Stop branch if UNKNOWN revealed
          if (currentPath.length + 1 > longestPath.length) {
            longestPath = [...currentPath, move];
          }
          continue;
        }
        dfs(nextTubes, [...currentPath, move]);
      }
    }
  }

  dfs(initialTubes, []);

  return { path: longestPath, status: longestPath.length > 0 ? 'longest' : 'no-solution' };
}

function getPossibleMoves(tubes: Tube[]): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < tubes.length; i++) {
    for (let j = 0; j < tubes.length; j++) {
      if (i === j) continue;
      if (canPour(tubes[i], tubes[j])) {
        moves.push({ from: i, to: j, color: tubes[i][tubes[i].length - 1] });
      }
    }
  }
  return moves;
}
