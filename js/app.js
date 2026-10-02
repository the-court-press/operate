/* OPERATE! — UI / session loop */
(function () {
  'use strict';

  const game = OperateEngine.createGame();
  const usedKeys = new Set();
  let lastPuzzleNums = null;

  const els = {
    band: document.getElementById('bandSelect'),
    timer: document.getElementById('timer'),
    solvedCount: document.getElementById('solvedCount'),
    focusPct: document.getElementById('focusPct'),
    focusFill: document.getElementById('focusFill'),
    focusMeter: document.getElementById('focusMeter'),
    focusHint: document.getElementById('focusHint'),
    youHp: document.getElementById('youHp'),
    ghostHp: document.getElementById('ghostHp'),
    targetValue: document.getElementById('targetValue'),
    opsAllowed: document.getElementById('opsAllowed'),
    board: document.getElementById('tileBoard'),
    toast: document.getElementById('toast'),
    undoBtn: document.getElementById('undoBtn'),
    resetBtn: document.getElementById('resetBtn'),
    dealBtn: document.getElementById('dealBtn'),
    soundBtn: document.getElementById('soundBtn'),
    teach: document.getElementById('teachPanel'),
    yourPath: document.getElementById('yourPath'),
    altWrap: document.getElementById('altWrap'),
    altPath: document.getElementById('altPath'),
    nextAfter: document.getElementById('nextAfterSolve'),
    stage: document.querySelector('.stage'),
  };

  let focus = 0;
  let youHp = 100;
  let ghostHp = 100;
  let solvedSession = 0;
  let puzzleStartedAt = 0;
  let timerRaf = null;
  let idleTimer = null;
  let toastTimer = null;
  let lastActivity = Date.now();
  let hadProgress = false;

  function bandLabelOps(ops) {
    return ops.map((o) => OperateEngine.opSymbol(o)).join(' ');
  }

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }

  function tickTimer() {
    if (!puzzleStartedAt) {
      els.timer.textContent = '0:00';
      return;
    }
    els.timer.textContent = formatTime(Date.now() - puzzleStartedAt);
    timerRaf = requestAnimationFrame(tickTimer);
  }

  function setFocus(v) {
    focus = Math.max(0, Math.min(100, v));
    els.focusFill.style.width = focus + '%';
    els.focusPct.textContent = Math.round(focus) + '%';
    els.focusMeter.setAttribute('aria-valuenow', String(Math.round(focus)));
    els.focusFill.classList.toggle('charged', focus >= 80);
    if (focus >= 80) els.focusHint.textContent = 'Focus charged — sharp play!';
    else if (focus >= 40) els.focusHint.textContent = 'Building Focus. Keep the pace.';
    else els.focusHint.textContent = 'Solve fast to charge. Idle drains.';
  }

  function bumpFocus(delta) {
    setFocus(focus + delta);
  }

  function onActivity() {
    lastActivity = Date.now();
  }

  function idleDrainLoop() {
    const idle = Date.now() - lastActivity;
    if (idle > 20000 && focus > 0) bumpFocus(-0.7);
    else if (idle > 12000 && focus > 0) bumpFocus(-0.35);
    idleTimer = setTimeout(idleDrainLoop, 500);
  }

  function toast(msg, kind) {
    els.toast.textContent = msg;
    els.toast.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  function renderTiles(state, opts) {
    opts = opts || {};
    els.board.innerHTML = '';
    state.tiles.forEach((t) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile';
      btn.setAttribute('role', 'listitem');
      btn.dataset.id = String(t.id);
      btn.textContent = OperateEngine.prettyNum(t.value);
      if (state.selected.indexOf(t.id) >= 0) btn.classList.add('selected');
      if (opts.spawnIds && opts.spawnIds.indexOf(t.id) >= 0) btn.classList.add('spawn');
      if (opts.win) btn.classList.add('win-glow');
      btn.addEventListener('click', () => onTileClick(t.id));
      els.board.appendChild(btn);
    });
  }

  function renderOps(state) {
    document.querySelectorAll('.op-btn').forEach((btn) => {
      const op = btn.dataset.op;
      const allowed = !state.ops || state.ops.indexOf(op) >= 0;
      btn.disabled = !allowed;
      btn.classList.toggle('armed', state.armedOp === op);
    });
  }

  function renderAll(state, opts) {
    els.targetValue.textContent = String(state.target);
    els.opsAllowed.textContent = bandLabelOps(state.ops);
    els.undoBtn.disabled = !state.canUndo;
    renderTiles(state, opts);
    renderOps(state);
  }

  function dealNew() {
    els.teach.hidden = true;
    els.stage.classList.remove('won');
    const band = els.band.value;
    const p = OperateEngine.pickPuzzle(band, usedKeys);
    if (!p) {
      toast('No puzzles in this band.', 'bad');
      return;
    }
    usedKeys.add(OperateEngine.puzzleKey(p));
    lastPuzzleNums = p.nums.slice();
    hadProgress = false;
    const state = game.deal(p);
    puzzleStartedAt = Date.now();
    cancelAnimationFrame(timerRaf);
    tickTimer();
    renderAll(state, { spawnIds: state.tiles.map((t) => t.id) });
    OperateAudio.deal();
    onActivity();
    toast('New ' + band + ' puzzle — hit ' + state.target + '!', 'good');
  }

  function onTileClick(id) {
    OperateAudio.unlock();
    onActivity();
    const result = game.toggleSelect(id);
    if (!result.ok) return;
    if (result.action === 'merge') handleMerge(result);
    else {
      OperateAudio.select();
      renderAll(result.state);
    }
  }

  function onOpClick(op) {
    OperateAudio.unlock();
    onActivity();
    const result = game.setOp(op);
    if (!result.ok) {
      if (result.reason === 'op-not-allowed') {
        OperateAudio.error();
        toast('That op is locked for this band.', 'bad');
      } else if (result.reason === 'div0') {
        OperateAudio.error();
        toast('Cannot divide by zero.', 'bad');
        bumpFocus(-4);
      }
      if (result.state) renderAll(result.state);
      return;
    }
    if (result.action === 'merge') handleMerge(result);
    else {
      OperateAudio.armOp();
      renderAll(result.state);
    }
  }

  function handleMerge(result) {
    if (!result.ok) {
      if (result.reason === 'div0') {
        OperateAudio.error();
        toast('Cannot divide by zero.', 'bad');
        bumpFocus(-4);
      }
      renderAll(result.state || game.getState());
      return;
    }

    hadProgress = true;
    result.mergedIds.forEach((id) => {
      const el = els.board.querySelector('[data-id="' + id + '"]');
      if (el) el.classList.add('merging');
    });
    OperateAudio.merge();

    setTimeout(() => {
      renderAll(result.state, { spawnIds: [result.newTile.id], win: result.win });
      if (result.win) onWin(result.state);
    }, 280);
  }

  function pickAlternate(state) {
    const bank = state.bankSolutions || [];
    const yourFlat = (state.moveLog || []).join('').replace(/\s+/g, '');
    for (let i = 0; i < bank.length; i++) {
      const s = bank[i];
      if (!s) continue;
      if (yourFlat.indexOf(s.replace(/\s+/g, '')) < 0) return s;
    }
    if (lastPuzzleNums) {
      const sols = OperateEngine.findSolutions(lastPuzzleNums, state.target, state.ops, 4);
      for (let i = 0; i < sols.length; i++) {
        if (yourFlat.indexOf(sols[i].replace(/\s+/g, '')) < 0) return sols[i];
      }
      if (sols[0]) return sols[0];
    }
    return bank[0] || null;
  }

  function onWin(state) {
    cancelAnimationFrame(timerRaf);
    const elapsed = Date.now() - puzzleStartedAt;
    const secs = elapsed / 1000;
    solvedSession += 1;
    els.solvedCount.textContent = String(solvedSession);

    let gain = 12;
    if (secs < 15) gain = 28;
    else if (secs < 30) gain = 20;
    else if (secs < 60) gain = 14;
    else gain = 8;
    if (els.band.value === 'explorer') gain += 4;
    if (els.band.value === 'seed') gain = Math.max(6, gain - 2);
    bumpFocus(gain);

    const dmg = 12 + Math.min(20, Math.round(gain * 0.6));
    ghostHp = Math.max(0, ghostHp - dmg);
    youHp = Math.min(100, youHp + 4);
    els.ghostHp.style.width = ghostHp + '%';
    els.youHp.style.width = youHp + '%';
    els.ghostHp.classList.remove('flash');
    void els.ghostHp.offsetWidth;
    els.ghostHp.classList.add('flash');
    if (ghostHp <= 0) {
      setTimeout(() => {
        ghostHp = 100;
        els.ghostHp.style.width = '100%';
        toast('Ghost retreated — new challenger!', 'good');
      }, 900);
    }

    OperateAudio.win();
    els.stage.classList.add('won');
    toast('Target hit in ' + formatTime(elapsed) + '!', 'good');

    els.yourPath.textContent = state.moveLog.length
      ? 'Your path: ' + state.moveLog.join('  →  ')
      : 'Solved!';

    const alt = pickAlternate(state);
    if (alt) {
      els.altWrap.hidden = false;
      els.altPath.textContent = alt;
    } else {
      els.altWrap.hidden = true;
    }
    els.teach.hidden = false;
  }

  document.querySelectorAll('.op-btn').forEach((btn) => {
    btn.addEventListener('click', () => onOpClick(btn.dataset.op));
  });

  els.undoBtn.addEventListener('click', () => {
    onActivity();
    const r = game.undo();
    if (r.ok) {
      els.teach.hidden = true;
      els.stage.classList.remove('won');
      if (!puzzleStartedAt) puzzleStartedAt = Date.now();
      cancelAnimationFrame(timerRaf);
      tickTimer();
      renderAll(r.state);
      toast('Undone');
    }
  });

  els.resetBtn.addEventListener('click', () => {
    onActivity();
    if (hadProgress && !game.getState().solved) {
      bumpFocus(-5);
      youHp = Math.max(25, youHp - 2);
      els.youHp.style.width = youHp + '%';
    }
    const r = game.reset();
    if (r.ok) {
      els.teach.hidden = true;
      els.stage.classList.remove('won');
      hadProgress = false;
      puzzleStartedAt = Date.now();
      cancelAnimationFrame(timerRaf);
      tickTimer();
      renderAll(r.state, { spawnIds: r.state.tiles.map((t) => t.id) });
      toast('Puzzle reset');
    }
  });

  els.dealBtn.addEventListener('click', dealNew);
  els.nextAfter.addEventListener('click', dealNew);
  els.band.addEventListener('change', dealNew);

  els.soundBtn.addEventListener('click', () => {
    const next = !OperateAudio.isEnabled();
    OperateAudio.setEnabled(next);
    els.soundBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
    els.soundBtn.textContent = next ? 'Sound' : 'Muted';
    if (next) OperateAudio.select();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;
    const state = game.getState();
    if (e.key >= '1' && e.key <= '4') {
      const idx = Number(e.key) - 1;
      if (state.tiles[idx]) onTileClick(state.tiles[idx].id);
    } else if (e.key === '+' || e.key === '=') onOpClick('+');
    else if (e.key === '-') onOpClick('-');
    else if (e.key === '*' || e.key === 'x' || e.key === 'X') onOpClick('*');
    else if (e.key === '/' || e.key === '÷') onOpClick('/');
    else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      els.undoBtn.click();
    } else if (e.key === 'n' || e.key === 'N') dealNew();
    else if (e.key === 'Escape') renderAll(game.clearSelection());
  });

  setFocus(15);
  idleDrainLoop();
  dealNew();
})();
