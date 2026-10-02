/* OPERATE! — merge engine + puzzle dealing */
(function (global) {
  'use strict';

  const EPS = 1e-6;

  function nearEq(a, b) {
    return Math.abs(a - b) < EPS;
  }

  function applyOp(a, b, op) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') {
      if (Math.abs(b) < EPS) return null;
      return a / b;
    }
    return null;
  }

  function prettyNum(n) {
    if (!Number.isFinite(n)) return '?';
    if (nearEq(n, Math.round(n))) return String(Math.round(n));
    const r = Math.round(n * 1000) / 1000;
    return String(r);
  }

  function opSymbol(op) {
    return ({ '+': '+', '-': '−', '*': '×', '/': '÷' })[op] || op;
  }

  /** Find solution expressions (for alternate path teaching). */
  function findSolutions(nums, target, allowedOps, limit) {
    limit = limit || 2;
    const solutions = [];
    const seen = new Set();

    function rec(items) {
      if (solutions.length >= limit) return;
      if (items.length === 1) {
        if (nearEq(items[0].v, target) && !seen.has(items[0].e)) {
          seen.add(items[0].e);
          solutions.push(items[0].e);
        }
        return;
      }
      const n = items.length;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const A = items[i];
          const B = items[j];
          const rest = [];
          for (let k = 0; k < n; k++) if (k !== i && k !== j) rest.push(items[k]);
          for (const op of allowedOps) {
            if ((op === '+' || op === '*') && i > j) continue;
            const res = applyOp(A.v, B.v, op);
            if (res == null || !Number.isFinite(res) || Math.abs(res) > 1e6) continue;
            const e = `(${A.e} ${opSymbol(op)} ${B.e})`;
            rec(rest.concat([{ v: res, e }]));
            if (solutions.length >= limit) return;
          }
        }
      }
    }

    rec(nums.map((x) => ({ v: x, e: prettyNum(x) })));
    return solutions;
  }

  function createGame() {
    let tiles = []; // { id, value }
    let history = [];
    let selected = []; // tile ids
    let armedOp = null;
    let puzzle = null;
    let nextId = 1;
    let moveLog = []; // human-readable merges
    let solved = false;

    function snapshot() {
      return {
        tiles: tiles.map((t) => ({ id: t.id, value: t.value })),
        moveLog: moveLog.slice(),
      };
    }

    function deal(p) {
      puzzle = p;
      nextId = 1;
      tiles = p.nums.map((v) => ({ id: nextId++, value: Number(v) }));
      history = [];
      selected = [];
      armedOp = null;
      moveLog = [];
      solved = false;
      return getState();
    }

    function getState() {
      return {
        tiles: tiles.map((t) => ({ id: t.id, value: t.value })),
        selected: selected.slice(),
        armedOp,
        target: puzzle ? puzzle.target : 24,
        ops: puzzle ? puzzle.ops.slice() : ['+', '-', '*', '/'],
        band: puzzle ? puzzle.band : 'sprout',
        bankSolutions: puzzle && puzzle.solutions ? puzzle.solutions.slice() : [],
        moveLog: moveLog.slice(),
        solved,
        canUndo: history.length > 0,
        tileCount: tiles.length,
      };
    }

    function toggleSelect(id) {
      if (solved) return { ok: false, reason: 'solved' };
      const idx = selected.indexOf(id);
      if (idx >= 0) {
        selected.splice(idx, 1);
        return { ok: true, state: getState(), action: 'deselect' };
      }
      if (!tiles.some((t) => t.id === id)) return { ok: false, reason: 'missing' };
      if (selected.length >= 2) selected.shift();
      selected.push(id);
      const result = { ok: true, state: getState(), action: 'select' };
      if (selected.length === 2 && armedOp) {
        return tryMerge(selected[0], selected[1], armedOp);
      }
      return result;
    }

    function setOp(op) {
      if (solved) return { ok: false, reason: 'solved' };
      if (puzzle && puzzle.ops && puzzle.ops.indexOf(op) < 0) {
        return { ok: false, reason: 'op-not-allowed', state: getState() };
      }
      armedOp = op;
      if (selected.length === 2) {
        return tryMerge(selected[0], selected[1], op);
      }
      return { ok: true, state: getState(), action: 'arm' };
    }

    function tryMerge(idA, idB, op) {
      if (solved) return { ok: false, reason: 'solved' };
      if (puzzle && puzzle.ops && puzzle.ops.indexOf(op) < 0) {
        return { ok: false, reason: 'op-not-allowed', state: getState() };
      }
      const a = tiles.find((t) => t.id === idA);
      const b = tiles.find((t) => t.id === idB);
      if (!a || !b || idA === idB) {
        return { ok: false, reason: 'bad-tiles', state: getState() };
      }
      const res = applyOp(a.value, b.value, op);
      if (res == null || !Number.isFinite(res)) {
        selected = [];
        armedOp = null;
        return { ok: false, reason: 'div0', state: getState() };
      }
      // Keep display friendly: snap near-integers
      let value = res;
      if (nearEq(res, Math.round(res))) value = Math.round(res);
      else value = Math.round(res * 1000) / 1000;

      history.push(snapshot());
      const expr = `${prettyNum(a.value)} ${opSymbol(op)} ${prettyNum(b.value)} = ${prettyNum(value)}`;
      moveLog.push(expr);

      tiles = tiles.filter((t) => t.id !== idA && t.id !== idB);
      const newTile = { id: nextId++, value };
      tiles.push(newTile);
      selected = [];
      armedOp = null;

      let win = false;
      if (tiles.length === 1 && nearEq(tiles[0].value, puzzle.target)) {
        solved = true;
        win = true;
      }

      return {
        ok: true,
        action: 'merge',
        state: getState(),
        mergedIds: [idA, idB],
        newTile,
        expr,
        win,
      };
    }

    function undo() {
      if (!history.length || solved) {
        // allow undo even after solve? nicer for teaching — allow
      }
      if (!history.length) return { ok: false, reason: 'empty', state: getState() };
      const prev = history.pop();
      tiles = prev.tiles.map((t) => ({ id: t.id, value: t.value }));
      moveLog = prev.moveLog.slice();
      selected = [];
      armedOp = null;
      solved = false;
      if (tiles.length === 1 && puzzle && nearEq(tiles[0].value, puzzle.target)) {
        solved = true;
      }
      return { ok: true, action: 'undo', state: getState() };
    }

    function reset() {
      if (!puzzle) return { ok: false, reason: 'no-puzzle' };
      return { ok: true, action: 'reset', state: deal(puzzle) };
    }

    function clearSelection() {
      selected = [];
      armedOp = null;
      return getState();
    }

    return {
      deal,
      getState,
      toggleSelect,
      setOp,
      undo,
      reset,
      clearSelection,
      findSolutions,
      prettyNum,
      opSymbol,
    };
  }

  function pickPuzzle(band, usedKeys) {
    const all = (global.OPERATE_PUZZLES || []).filter((p) => p.band === band);
    if (!all.length) return null;
    const fresh = all.filter((p) => !usedKeys.has(puzzleKey(p)));
    const pool = fresh.length ? fresh : all;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function puzzleKey(p) {
    return `${p.band}|${p.target}|${[...p.nums].sort((a, b) => a - b).join(',')}`;
  }

  global.OperateEngine = {
    createGame,
    findSolutions,
    pickPuzzle,
    puzzleKey,
    prettyNum,
    opSymbol,
    applyOp,
  };
})(window);
