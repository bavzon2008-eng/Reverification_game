/* ==========================================================
   THE TURING ARCADE
   A reverse CAPTCHA game. 4 challenges are pulled at random
   from a pool of 6 each time you play, in random order, so
   no two runs look the same. Every challenge returns a
   0–100 "bot score" (higher = more machine-like performance).
   ========================================================== */

const app = document.getElementById('app');
const fxLayer = document.getElementById('fxLayer');
const slotsEl = document.getElementById('slots');
const dialFill = document.getElementById('dialFill');
const dialScore = document.getElementById('dialScore');

const DIAL_LEN = 283; // approx path length of the semicircle

let selected = [];
let current = 0;
let scores = [];
let details = [];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function updateDial(avg) {
  const offset = DIAL_LEN - (DIAL_LEN * clamp(avg, 0, 100)) / 100;
  dialFill.style.strokeDashoffset = offset;
  dialScore.textContent = Math.round(avg);
}

function buildSlots() {
  slotsEl.innerHTML = '';
  selected.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'slot';
    d.textContent = i + 1;
    slotsEl.appendChild(d);
  });
  updateSlots();
}
function updateSlots() {
  [...slotsEl.children].forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i < current) el.classList.add('done');
    else if (i === current) el.classList.add('active');
  });
}

function fireConfetti() {
  const colors = ['#7A2E2E', '#2C3E50', '#B8860B', '#2F4F2F'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = rand(0, 100) + 'vw';
    el.style.background = pick(colors);
    el.style.animationDuration = rand(1.6, 3) + 's';
    el.style.animationDelay = rand(0, 0.4) + 's';
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }
}

/* ---------------- Boot / flow ---------------- */
function startRun() {
  selected = shuffle(Object.keys(CHALLENGES)).slice(0, 4);
  current = 0;
  scores = [];
  details = [];
  buildSlots();
  updateDial(0);
  runCurrent();
}

function runCurrent() {
  updateSlots();
  const key = selected[current];
  CHALLENGES[key].render(app, (score, detail) => {
    scores.push(score);
    details.push({ key, score, detail });
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    updateDial(avg);
    current++;
    if (current < selected.length) {
      setTimeout(runCurrent, 550);
    } else {
      setTimeout(renderResult, 500);
    }
  });
}

/* ================= CHALLENGE POOL ================= */
const CHALLENGES = {};

/* ---- 1. Precision Click ---- */
CHALLENGES.precision = {
  tag: 'Precision',
  render(container, done) {
    const ROUNDS = 3;
    const TIME_LIMIT = 2000;
    let round = 0;
    const roundScores = [];

    container.innerHTML = `
      <section class="card">
        <h2><span class="tag">Precision</span> Bullseye Click</h2>
        <p class="instructions">A target will pop up somewhere in the field. Click dead center within ${(TIME_LIMIT / 1000).toFixed(1)}s, ${ROUNDS} rounds. Closer and faster clicks score higher; missing the window scores zero.</p>
        <div class="field-frame" id="frame"></div>
        <div class="status-line" id="status">Round 0 / ${ROUNDS} — press Start.</div>
        <div class="controls"><button id="go">Start</button></div>
      </section>`;

    const frame = document.getElementById('frame');
    const status = document.getElementById('status');
    document.getElementById('go').addEventListener('click', () => {
      document.getElementById('go').remove();
      next();
    });

    function next() {
      round++;
      status.textContent = `Round ${round} / ${ROUNDS} — click it!`;
      const rect = frame.getBoundingClientRect();
      const pad = 26;
      const x = rand(pad, rect.width - pad);
      const y = rand(pad, rect.height - pad);
      const dot = document.createElement('div');
      dot.className = 'target-dot';
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
      frame.appendChild(dot);

      let settled = false;
      const spawnedAt = performance.now();
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          dot.remove();
          frame.removeEventListener('click', onClick);
          roundScores.push(0);
          status.textContent = `Round ${round}: too slow — score 0.`;
          if (round < ROUNDS) setTimeout(next, 420); else finish();
        }
      }, TIME_LIMIT);

      const onClick = (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        const r = dot.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const elapsed = performance.now() - spawnedAt;
        const distScore = clamp(100 - dist * (100 / 45), 0, 100);
        const timeScore = clamp(100 - elapsed * (100 / TIME_LIMIT), 0, 100);
        const s = distScore * 0.85 + timeScore * 0.15;
        roundScores.push(s);
        dot.remove();
        frame.removeEventListener('click', onClick);
        status.textContent = `Offset ${dist.toFixed(0)}px in ${elapsed.toFixed(0)}ms — score ${Math.round(s)}.`;
        if (round < ROUNDS) setTimeout(next, 420);
        else finish();
      };
      frame.addEventListener('click', onClick);
    }

    function finish() {
      const avg = roundScores.reduce((a, b) => a + b, 0) / roundScores.length;
      status.innerHTML = `<span class="readout">Precision score: ${Math.round(avg)}/100</span>`;
      done(avg, { label: 'Precision', value: `${Math.round(avg)}/100` });
    }
  }
};

/* ---- 2. Reversal Typing ---- */
CHALLENGES.reversal = {
  tag: 'Reversal',
  render(container, done) {
    const WORDS = ['ORANGE', 'MARBLE', 'SILVER', 'CANYON', 'VELVET', 'WINTER', 'RAILWAY', 'PIGEON', 'CRYSTAL', 'JUNGLE', 'PLANET', 'ECHO', 'GRAVEL', 'FOSSIL', 'TUNDRA', 'ROCKET', 'MEADOW', 'GLACIER'];
    const word = pick(WORDS);
    const answer = word.split('').reverse().join('');
    const FLASH_MS = rand(550, 800);
    const LIMIT_MS = 2400;

    container.innerHTML = `
      <section class="card">
        <h2><span class="tag">Reversal</span> Flash Reverse</h2>
        <p class="instructions">A word flashes briefly. The instant it vanishes, type it backwards and submit before time runs out.</p>
        <div class="field-frame" id="frame"><span class="word-display" id="word">READY?</span></div>
        <div class="status-line" id="status">Press Begin when ready.</div>
        <div class="controls" id="controls"><button id="go">Begin</button></div>
      </section>`;

    const wordEl = document.getElementById('word');
    const status = document.getElementById('status');
    const controls = document.getElementById('controls');

    document.getElementById('go').addEventListener('click', () => {
      controls.innerHTML = '';
      wordEl.textContent = word;
      status.textContent = 'Memorize it…';
      setTimeout(() => {
        wordEl.textContent = '';
        status.textContent = 'Type it backwards, now:';
        controls.innerHTML = `<input type="text" id="ans" autocomplete="off" placeholder="backwards…"><button id="submit">Submit</button>`;
        const input = document.getElementById('ans');
        input.focus();
        let over = false;
        const started = performance.now();
        const timeout = setTimeout(() => { if (!over) finish('', true); }, LIMIT_MS);

        const submit = () => { if (!over) { clearTimeout(timeout); finish(input.value, false); } };
        document.getElementById('submit').addEventListener('click', submit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

        function finish(value, timedOut) {
          over = true;
          const elapsed = performance.now() - started;
          const clean = (value || '').trim().toUpperCase();
          let match = 0;
          for (let i = 0; i < answer.length; i++) if (clean[i] === answer[i]) match++;
          const accuracy = (match / answer.length) * 100;
          const timeBonus = clamp((LIMIT_MS - elapsed) / LIMIT_MS, 0, 1) * 100;
          const score = accuracy * 0.75 + timeBonus * 0.25;
          controls.innerHTML = '';
          status.innerHTML = timedOut
            ? `<span class="readout">Time's up. Answer was ${answer}. Score ${Math.round(score)}/100.</span>`
            : `<span class="readout">${accuracy.toFixed(0)}% accurate in ${(elapsed / 1000).toFixed(2)}s — score ${Math.round(score)}/100.</span>`;
          done(score, { label: 'Reversal', value: `${Math.round(score)}/100` });
        }
      }, FLASH_MS);
    });
  }
};

/* ---- 3. Trajectory Linearity ---- */
CHALLENGES.trajectory = {
  tag: 'Trajectory',
  render(container, done) {
    container.innerHTML = `
      <section class="card">
        <h2><span class="tag">Trajectory</span> Straight Line</h2>
        <p class="instructions">Press and hold node A, then drag to node B in the straightest path you can manage.</p>
        <div class="field-frame" id="frame">
          <div class="track" id="track">
            <div class="node a" id="nodeA">A</div>
            <div class="node b">B</div>
          </div>
        </div>
        <div class="status-line" id="status">Click and hold node A, then drag to B.</div>
        <div class="controls" id="controls"></div>
      </section>`;

    const track = document.getElementById('track');
    const status = document.getElementById('status');
    const nodeA = document.getElementById('nodeA');
    let dragging = false, maxDev = 0, started = 0;

    const getLine = () => {
      const r = track.getBoundingClientRect();
      return { ax: r.left, bx: r.right, ay: r.top + r.height / 2 };
    };
    const distToLine = (px, py, line) => {
      if (px < line.ax) return Math.hypot(px - line.ax, py - line.ay);
      if (px > line.bx) return Math.hypot(px - line.bx, py - line.ay);
      return Math.abs(py - line.ay);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const pt = e.touches ? e.touches[0] : e;
      const line = getLine();
      const d = distToLine(pt.clientX, pt.clientY, line);
      maxDev = Math.max(maxDev, d);
      status.textContent = `Dragging… deviation ${d.toFixed(0)}px (max ${maxDev.toFixed(0)}px)`;
      if (pt.clientX >= line.bx - 14) endDrag();
    };
    const startDrag = (e) => { dragging = true; started = performance.now(); maxDev = 0; status.textContent = 'Tracking…'; e.preventDefault(); };
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      const elapsed = ((performance.now() - started) / 1000).toFixed(2);
      const score = clamp(100 - maxDev * (100 / 35), 0, 100);
      status.innerHTML = `<span class="readout">Max deviation ${maxDev.toFixed(0)}px in ${elapsed}s — score ${Math.round(score)}/100.</span>`;
      document.getElementById('controls').innerHTML = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchend', endDrag);
      done(score, { label: 'Trajectory', value: `${Math.round(score)}/100` });
    };
    nodeA.addEventListener('mousedown', startDrag);
    nodeA.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
  }
};

/* ---- 4. Rhythm Tap ---- */
CHALLENGES.rhythm = {
  tag: 'Rhythm',
  render(container, done) {
    const CYCLE = 680;
    const NEEDED = 5;
    let taps = [];
    let start = 0;
    let raf;

    container.innerHTML = `
      <section class="card">
        <h2><span class="tag">Rhythm</span> Metronome Match</h2>
        <p class="instructions">Tap the button exactly when the ring reaches full size. Do it ${NEEDED} times in a row, as evenly as possible.</p>
        <div class="field-frame" id="frame">
          <button class="rhythm-btn" id="pulseBtn">TAP</button>
        </div>
        <div class="status-line" id="status">Taps: 0 / ${NEEDED}</div>
        <div class="controls" id="controls"><button id="go">Start Rhythm</button></div>
      </section>`;

    const status = document.getElementById('status');
    const btn = document.getElementById('pulseBtn');
    btn.style.transition = `transform ${CYCLE}ms ease-in-out, box-shadow ${CYCLE}ms ease-in-out`;

    document.getElementById('go').addEventListener('click', () => {
      document.getElementById('controls').innerHTML = '';
      start = performance.now();
      pulse();
      btn.addEventListener('click', onTap);
    });

    function pulse() {
      const t = (performance.now() - start) % CYCLE;
      const grow = t < CYCLE / 2;
      btn.style.transform = grow ? 'scale(1.18)' : 'scale(0.92)';
      raf = requestAnimationFrame(pulse);
    }

    function onTap() {
      const elapsed = performance.now() - start;
      const mod = elapsed % CYCLE;
      const err = Math.min(mod, CYCLE - mod);
      taps.push(err);
      status.textContent = `Taps: ${taps.length} / ${NEEDED} — last offset ${Math.round(err)}ms`;
      if (taps.length >= NEEDED) finish();
    }

    function finish() {
      btn.removeEventListener('click', onTap);
      cancelAnimationFrame(raf);
      const avgErr = taps.reduce((a, b) => a + b, 0) / taps.length;
      const score = clamp(100 - avgErr * 0.6, 0, 100);
      status.innerHTML = `<span class="readout">Avg offset ${Math.round(avgErr)}ms — score ${Math.round(score)}/100.</span>`;
      done(score, { label: 'Rhythm', value: `${Math.round(score)}/100` });
    }
  }
};

/* ---- 5. Stroop Reflex ---- */
CHALLENGES.stroop = {
  tag: 'Reflex',
  render(container, done) {
    const COLORS = [
      { name: 'CRIMSON', hex: '#7A2E2E' },
      { name: 'NAVY', hex: '#2C3E50' },
      { name: 'OCHRE', hex: '#B8860B' },
      { name: 'FOREST', hex: '#2F4F2F' }
    ];
    const ROUNDS = 3;
    let round = 0;
    const roundScores = [];

    container.innerHTML = `
      <section class="card">
        <h2><span class="tag">Reflex</span> Ink, Not Word</h2>
        <p class="instructions">A color name will appear, printed in a mismatched ink color. Click the swatch matching the <em>ink color</em>, not the word. ${ROUNDS} rounds, fast as you can.</p>
        <div class="field-frame" id="frame"><span class="stroop-word" id="word"></span></div>
        <div class="stroop-options" id="options"></div>
        <div class="status-line" id="status">Round 0 / ${ROUNDS}</div>
        <div class="controls" id="controls"><button id="go">Start</button></div>
      </section>`;

    const wordEl = document.getElementById('word');
    const optionsEl = document.getElementById('options');
    const status = document.getElementById('status');

    document.getElementById('go').addEventListener('click', () => {
      document.getElementById('controls').innerHTML = '';
      next();
    });

    function next() {
      round++;
      status.textContent = `Round ${round} / ${ROUNDS}`;
      const nameColor = pick(COLORS);
      let inkColor = pick(COLORS);
      while (inkColor.name === nameColor.name) inkColor = pick(COLORS);

      wordEl.textContent = nameColor.name;
      wordEl.style.color = inkColor.hex;

      optionsEl.innerHTML = '';
      shuffle(COLORS).forEach((c) => {
        const sw = document.createElement('div');
        sw.className = 'stroop-swatch';
        sw.style.background = c.hex;
        optionsEl.appendChild(sw);
        sw.addEventListener('click', () => onPick(c, inkColor, tStart));
      });
      const tStart = performance.now();
    }

    function onPick(chosen, correct, tStart) {
      const elapsed = performance.now() - tStart;
      const isRight = chosen.name === correct.name;
      const speedScore = clamp(100 - elapsed * 0.08, 0, 100);
      const s = isRight ? speedScore : speedScore * 0.2;
      roundScores.push(s);
      if (round < ROUNDS) setTimeout(next, 300);
      else finish();
    }

    function finish() {
      const avg = roundScores.reduce((a, b) => a + b, 0) / roundScores.length;
      wordEl.textContent = '';
      status.innerHTML = `<span class="readout">Reflex score: ${Math.round(avg)}/100</span>`;
      optionsEl.innerHTML = '';
      done(avg, { label: 'Reflex', value: `${Math.round(avg)}/100` });
    }
  }
};

/* ---- 6. Pattern Recall ---- */
CHALLENGES.pattern = {
  tag: 'Recall',
  render(container, done) {
    const SIZE = 9;
    const SEQ_LEN = 5;
    const sequence = shuffle([...Array(SIZE).keys()]).slice(0, SEQ_LEN);

    container.innerHTML = `
      <section class="card">
        <h2><span class="tag">Recall</span> Pattern Playback</h2>
        <p class="instructions">Watch the ${SEQ_LEN} cells light up in order, then click them back in the exact same sequence.</p>
        <div class="field-frame" id="frame">
          <div class="pattern-grid" id="grid"></div>
        </div>
        <div class="status-line" id="status">Watch closely…</div>
        <div class="controls" id="controls"></div>
      </section>`;

    const grid = document.getElementById('grid');
    const status = document.getElementById('status');
    const cells = [];
    for (let i = 0; i < SIZE; i++) {
      const c = document.createElement('div');
      c.className = 'pattern-cell';
      grid.appendChild(c);
      cells.push(c);
    }

    let i = 0;
    const playNext = () => {
      if (i > 0) cells[sequence[i - 1]].classList.remove('lit');
      if (i < sequence.length) {
        cells[sequence[i]].classList.add('lit');
        i++;
        setTimeout(playNext, 400);
      } else {
        setTimeout(() => {
          cells[sequence[sequence.length - 1]].classList.remove('lit');
          startInput();
        }, 350);
      }
    };
    setTimeout(playNext, 500);

    function startInput() {
      status.textContent = `Your turn — click the ${SEQ_LEN} cells in order.`;
      const picks = [];
      cells.forEach((cell, idx) => {
        cell.addEventListener('click', () => {
          if (picks.length >= SEQ_LEN) return;
          picks.push(idx);
          cell.classList.add('picked');
          status.textContent = `Picked ${picks.length} / ${SEQ_LEN}`;
          if (picks.length === SEQ_LEN) finish(picks);
        });
      });
    }

    function finish(picks) {
      let correct = 0;
      picks.forEach((p, idx) => { if (p === sequence[idx]) correct++; });
      const score = (correct / SEQ_LEN) * 100;
      status.innerHTML = `<span class="readout">${correct}/${SEQ_LEN} correct — score ${Math.round(score)}/100.</span>`;
      done(score, { label: 'Recall', value: `${Math.round(score)}/100` });
    }
  }
};

/* ================= RESULT ================= */
function renderResult() {
  const overall = scores.reduce((a, b) => a + b, 0) / scores.length;
  const tier =
    overall > 68 ? 'CERTIFIED BOT' :
    overall > 46 ? 'BORDERLINE ANDROID' :
    overall > 24 ? 'SUSPICIOUSLY COORDINATED' :
    'DEFINITELY HUMAN';

  app.innerHTML = `
    <section class="card result">
      <h2 style="justify-content:center;"><span class="tag">Result</span> Final Ruling</h2>
      <div class="tier">${tier}</div>
      <p class="instructions" style="margin:0 auto;">Overall Bot-O-Meter score: <strong>${Math.round(overall)}/100</strong></p>
      <div class="stat-row">
        ${details.map(d => `<div class="stat-chip"><strong>${Math.round(d.score)}</strong>${d.detail.label}</div>`).join('')}
      </div>
      <div class="controls" style="justify-content:center;">
        <button id="downloadCert">Download Result Card</button>
        <button id="restart" class="secondary">Play Again</button>
      </div>
    </section>`;

  fireConfetti();

  document.getElementById('restart').addEventListener('click', startRun);
  document.getElementById('downloadCert').addEventListener('click', () => drawCertificate(tier, overall));
}

function drawCertificate(tier, overall) {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 650;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#EDE8DC';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#3A3A3A';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('THE DAILY VERIFICATION — FORM RC-3', canvas.width / 2, 90);

  ctx.fillStyle = '#1A1A1A';
  ctx.font = '700 32px Georgia, serif';
  ctx.fillText('Certificate of Ruling', canvas.width / 2, 160);

  ctx.font = '700 42px Georgia, serif';
  ctx.fillStyle = '#7A2E2E';
  ctx.fillText(tier, canvas.width / 2, 240);

  ctx.fillStyle = '#1A1A1A';
  ctx.font = '20px Georgia, serif';
  ctx.fillText(`BOT SCORE: ${Math.round(overall)} / 100`, canvas.width / 2, 300);

  ctx.font = '15px Georgia, serif';
  details.forEach((d, i) => {
    ctx.fillText(`${d.detail.label.toUpperCase()}: ${d.detail.value}`, canvas.width / 2, 360 + i * 30);
  });

  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 540, 55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#1A1A1A';
  ctx.font = '700 14px Georgia, serif';
  ctx.fillText('CERTIFIED', canvas.width / 2, 535);
  ctx.fillText('HUMAN', canvas.width / 2, 555);

  ctx.fillStyle = '#5A5A5A';
  ctx.font = '11px Georgia, serif';
  ctx.fillText('Generated locally in your browser. Purely for fun.', canvas.width / 2, 615);

  const link = document.createElement('a');
  link.download = 'turing-arcade-result.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ---------------- Intro screen ---------------- */
function renderIntro() {
  app.innerHTML = `
    <section class="card result">
      <h2 style="justify-content:center;"><span class="tag">RC-3</span> Terminal Standby</h2>
      <p class="instructions" style="margin:0 auto 6px;">This terminal will run 4 randomly selected challenges to measure your precision, timing, and reflexes. Nothing is recorded or sent anywhere.</p>
      <div class="controls" style="justify-content:center; margin-top:10px;">
        <button id="beginBtn">Begin Verification</button>
      </div>
    </section>`;
  document.getElementById('beginBtn').addEventListener('click', startRun);
}

/* Boot */
renderIntro();
