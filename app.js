/* ========== FEUER WASSER STURM – App Logic ========== */

const App = (() => {
  // ── State ──
  let mode = null;           // 'toddler' | 'chaos'
  let players = [];          // { name, alive }
  let soundEnabled = true;
  let drumEnabled = true;
  let speedSetting = 'normal'; // 'slow' | 'normal' | 'fast'
  let round = 0;
  let gameRunning = false;
  let timers = [];
  let animFrame = null;
  let drumInterval = null;
  let waitingMsgInterval = null;
  let audioCtx = null;

  // ── Default commands ──
  const DEFAULT_COMMANDS = [
    { name: 'Feuer',      action: 'Hinlegen!',                      emoji: '🔥', color: '#e94560', isDefault: true },
    { name: 'Wasser',     action: 'Hochklettern!',                   emoji: '💧', color: '#0ea5e9', isDefault: true },
    { name: 'Sturm',      action: 'Festhalten!',                     emoji: '🌪️', color: '#6d28d9', isDefault: true },
    { name: 'Popcorn',    action: 'Händen und Füßen stampfen!',      emoji: '🍿', color: '#f59e0b', isDefault: true },
    { name: 'Eis',        action: 'Nicht bewegen!',                   emoji: '🧊', color: '#06b6d4', isDefault: true },
    { name: 'Kaugummi',   action: 'An die Wand kleben!',             emoji: '🫧', color: '#ec4899', isDefault: true },
    { name: 'Flamingo',   action: 'Auf ein Bein stellen!',           emoji: '🦩', color: '#f97316', isDefault: true },
    { name: 'CD-Player',  action: 'Auf dem Boden drehen!',           emoji: '💿', color: '#a855f7', isDefault: true },
  ];

  // ── Rotating waiting messages ──
  const WAITING_MESSAGES = [
    'Macht euch bereit!',
    'Was kommt als nächstes?',
    'Seid auf der Hut!',
    'Konzentriert euch!',
    'Gleich geht\'s los!',
    'Aufgepasst!',
    'Bleibt wachsam!',
    'Jeden Moment …',
    'Wer schafft es?',
    'Bereit machen!',
    'Augen auf!',
    'Nicht ablenken lassen!',
  ];
  let waitingMsgIndex = 0;

  function getCommands() {
    const stored = localStorage.getItem('fws_commands');
    if (stored) {
      try { return JSON.parse(stored); } catch(e) { /* ignore */ }
    }
    return [...DEFAULT_COMMANDS];
  }

  function saveCommands(cmds) {
    localStorage.setItem('fws_commands', JSON.stringify(cmds));
  }

  // ── Speed / Difficulty ──
  function getSpeedMultiplier() {
    return { slow: 1.6, normal: 1.0, fast: 0.6 }[speedSetting] || 1.0;
  }

  function setSpeed(s) {
    speedSetting = s;
    localStorage.setItem('fws_speed', s);
    document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('btn-speed-active'));
    const btn = document.getElementById('speed-' + s);
    if (btn) btn.classList.add('btn-speed-active');
  }

  // ── Audio Context (lazy init on user gesture) ──
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // ── Drum Sounds via Web Audio API ──
  function playDrumHit(type) {
    if (!drumEnabled) return;
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;

      if (type === 'kick') {
        // Deep kick drum
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'snare') {
        // Snare: noise burst + tonal body
        const bufferSize = ctx.sampleRate * 0.12;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        noise.start(now);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'hihat') {
        // Hi-hat: short high-passed noise
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
      }
    } catch(e) { /* audio not available */ }
  }

  // ── Drum Loop: builds tension during waiting phase ──
  let drumBeatIndex = 0;

  function startDrumLoop(durationMs) {
    stopDrumLoop();
    if (!drumEnabled) return;

    drumBeatIndex = 0;
    const startTime = Date.now();
    const startTempo = 600;  // slow start (ms between beats)
    const endTempo = 250;    // fast at the end

    function nextBeat() {
      if (!gameRunning || !drumEnabled) { stopDrumLoop(); return; }

      const elapsed = Date.now() - startTime;
      if (elapsed > durationMs) { stopDrumLoop(); return; }

      // Tempo accelerates as we approach the end
      const progress = elapsed / durationMs;
      const currentTempo = startTempo - (startTempo - endTempo) * progress;

      // Drum pattern: kick, hihat, snare, hihat
      const pattern = ['kick', 'hihat', 'snare', 'hihat'];
      const hit = pattern[drumBeatIndex % pattern.length];
      playDrumHit(hit);
      drumBeatIndex++;

      drumInterval = setTimeout(nextBeat, currentTempo);
    }

    // Small initial delay before drums start
    drumInterval = setTimeout(nextBeat, 800);
  }

  function stopDrumLoop() {
    if (drumInterval) {
      clearTimeout(drumInterval);
      drumInterval = null;
    }
  }

  // ── Waiting messages ──
  function startWaitingMessages() {
    stopWaitingMessages();
    const el = document.querySelector('.waiting-text');
    if (!el) return;
    waitingMsgIndex = Math.floor(Math.random() * WAITING_MESSAGES.length);
    el.textContent = WAITING_MESSAGES[waitingMsgIndex];
    waitingMsgInterval = setInterval(() => {
      waitingMsgIndex = (waitingMsgIndex + 1) % WAITING_MESSAGES.length;
      el.textContent = WAITING_MESSAGES[waitingMsgIndex];
    }, 2500);
  }

  function stopWaitingMessages() {
    if (waitingMsgInterval) {
      clearInterval(waitingMsgInterval);
      waitingMsgInterval = null;
    }
  }

  // ── Haptic feedback ──
  function vibrate(pattern) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch(e) { /* ignore */ }
    }
  }

  // ── Toast notification ──
  function showToast(msg, color) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    if (color) toast.style.background = color;
    document.getElementById('app').appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 400);
    }, 1800);
  }

  // ── Speech with more energy ──
  function speak(text, style) {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (style === 'command') {
      // Enthusiastic command announcement
      // Short excited buildup
      const intro = new SpeechSynthesisUtterance('Und...');
      intro.lang = 'de-DE';
      intro.rate = 1.3;
      intro.pitch = 1.4;
      intro.volume = 0.8;

      // Main command: LOUD and high energy
      const mainText = text.split('!')[0] + '!';
      const main = new SpeechSynthesisUtterance(mainText);
      main.lang = 'de-DE';
      main.rate = 0.85;  // slower for dramatic emphasis
      main.pitch = 1.6;
      main.volume = 1.0;

      // Action instruction
      const parts = text.split('! ');
      if (parts.length > 1) {
        const action = new SpeechSynthesisUtterance(parts.slice(1).join('! '));
        action.lang = 'de-DE';
        action.rate = 1.15;
        action.pitch = 1.3;
        action.volume = 1.0;
        window.speechSynthesis.speak(intro);
        window.speechSynthesis.speak(main);
        window.speechSynthesis.speak(action);
      } else {
        window.speechSynthesis.speak(intro);
        window.speechSynthesis.speak(main);
      }
    } else if (style === 'winner') {
      const u1 = new SpeechSynthesisUtterance('Jaaa!');
      u1.lang = 'de-DE';
      u1.rate = 0.8;
      u1.pitch = 1.8;
      u1.volume = 1.0;

      const u2 = new SpeechSynthesisUtterance(text);
      u2.lang = 'de-DE';
      u2.rate = 0.9;
      u2.pitch = 1.5;
      u2.volume = 1.0;

      window.speechSynthesis.speak(u1);
      window.speechSynthesis.speak(u2);
    } else if (style === 'fake') {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 1.4;
      u.pitch = 1.7;
      u.volume = 0.9;
      window.speechSynthesis.speak(u);
    } else {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 1.1;
      u.pitch = 1.3;
      u.volume = 1.0;
      window.speechSynthesis.speak(u);
    }
  }

  // ── Toggles ──
  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('fws_sound', soundEnabled ? '1' : '0');
    document.getElementById('sound-icon').textContent = soundEnabled ? '🔊' : '🔇';
    const btn = document.getElementById('btn-sound');
    if (btn) btn.classList.toggle('btn-disabled', !soundEnabled);
  }

  function toggleDrum() {
    drumEnabled = !drumEnabled;
    localStorage.setItem('fws_drum', drumEnabled ? '1' : '0');
    updateDrumIcon();
    if (!drumEnabled) stopDrumLoop();
    // Init audio context on user interaction
    if (drumEnabled) getAudioCtx();
  }

  function updateDrumIcon() {
    const el = document.getElementById('drum-icon');
    el.parentElement.classList.toggle('btn-disabled', !drumEnabled);
  }

  // ── Navigation ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function goHome() {
    stopGame();
    showScreen('screen-home');
  }

  function selectMode(m) {
    mode = m;
    // Init audio context on user gesture (required by browsers)
    getAudioCtx();
    if (m === 'toddler') {
      startToddler();
    } else {
      players = [];
      renderPlayerList();
      showScreen('screen-setup');
      document.getElementById('player-name-input').focus();
    }
  }

  // ── Settings ──
  function showSettings() {
    renderCommandsList();
    showScreen('screen-settings');
  }

  function renderCommandsList() {
    const cmds = getCommands();
    const list = document.getElementById('commands-list');
    list.innerHTML = cmds.map((c, i) => `
      <div class="command-item ${c.isDefault ? 'is-default' : ''}" style="border-left-color:${c.color}">
        <span class="cmd-emoji">${c.emoji}</span>
        <div class="cmd-info">
          <div class="cmd-name">${c.name}</div>
          <div class="cmd-action">${c.action}</div>
        </div>
        ${!c.isDefault ? `<button class="remove-cmd" onclick="App.removeCommand(${i})">✕</button>` : '<span></span>'}
      </div>
    `).join('');
  }

  function addCommand() {
    const name  = document.getElementById('cmd-name').value.trim();
    const action = document.getElementById('cmd-action').value.trim();
    const emoji = document.getElementById('cmd-emoji').value.trim() || '⭐';
    const color = document.getElementById('cmd-color').value;
    if (!name || !action) return;

    const cmds = getCommands();
    cmds.push({ name, action, emoji, color, isDefault: false });
    saveCommands(cmds);
    renderCommandsList();

    document.getElementById('cmd-name').value = '';
    document.getElementById('cmd-action').value = '';
    document.getElementById('cmd-emoji').value = '';
  }

  function removeCommand(index) {
    const cmds = getCommands();
    if (cmds[index].isDefault) return;
    cmds.splice(index, 1);
    saveCommands(cmds);
    renderCommandsList();
  }

  function resetCommands() {
    if (!confirm('Alle eigenen Befehle löschen und Standardbefehle wiederherstellen?')) return;
    saveCommands([...DEFAULT_COMMANDS]);
    renderCommandsList();
  }

  // ── Chaos Setup ──
  function renderPlayerList() {
    const list = document.getElementById('player-list');
    list.innerHTML = players.map((p, i) => `
      <div class="player-chip">
        <span>${p.name}</span>
        <button class="remove-player" onclick="App.removePlayer(${i})">✕</button>
      </div>
    `).join('');
    document.getElementById('btn-start-chaos').disabled = players.length < 2;
  }

  function addPlayer() {
    const input = document.getElementById('player-name-input');
    const name = input.value.trim();
    if (!name || players.length >= 10) return;
    players.push({ name, alive: true });
    input.value = '';
    input.focus();
    renderPlayerList();
  }

  function removePlayer(i) {
    players.splice(i, 1);
    renderPlayerList();
  }

  // Handle enter key in player input
  document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('player-name-input');
    if (inp) {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addPlayer(); }
      });
    }
    // Load preferences
    const sp = localStorage.getItem('fws_sound');
    if (sp === '0') {
      soundEnabled = false;
      document.getElementById('sound-icon').textContent = '🔇';
      const btn = document.getElementById('btn-sound');
      if (btn) btn.classList.add('btn-disabled');
    }
    const dp = localStorage.getItem('fws_drum');
    if (dp === '0') { drumEnabled = false; }
    updateDrumIcon();

    // Load speed setting
    const spd = localStorage.getItem('fws_speed') || 'normal';
    setSpeed(spd);
  });

  // ── Game Common ──
  function stopGame() {
    gameRunning = false;
    timers.forEach(t => clearTimeout(t));
    timers = [];
    if (animFrame) cancelAnimationFrame(animFrame);
    stopDrumLoop();
    stopWaitingMessages();
    window.speechSynthesis && window.speechSynthesis.cancel();
    const screen = document.getElementById('screen-game');
    screen.style.backgroundColor = '';
    screen.classList.remove('command-active', 'toddler-mode', 'screen-shake');
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function pickCommand() {
    const cmds = getCommands();
    return cmds[randInt(0, cmds.length - 1)];
  }

  // ── Countdown Ring Animation ──
  function showCountdown(seconds, color, onDone) {
    const ring      = document.getElementById('countdown-ring');
    const progress  = document.getElementById('ring-progress');
    const numEl     = document.getElementById('countdown-number');
    const circumference = 2 * Math.PI * 90; // r=90
    progress.style.strokeDasharray = circumference;
    progress.style.stroke = color || '#e94560';

    ring.classList.remove('hidden');
    const start = performance.now();
    const duration = seconds * 1000;

    function tick(now) {
      if (!gameRunning) return;
      const elapsed = now - start;
      const frac = Math.min(elapsed / duration, 1);
      progress.style.strokeDashoffset = circumference * frac;
      const remaining = Math.ceil(seconds - (elapsed / 1000));
      numEl.textContent = Math.max(remaining, 0);
      if (frac < 1) {
        animFrame = requestAnimationFrame(tick);
      } else {
        ring.classList.add('hidden');
        onDone && onDone();
      }
    }
    animFrame = requestAnimationFrame(tick);
  }

  function showCommand(cmd) {
    const screen = document.getElementById('screen-game');
    const waiting = document.getElementById('waiting-display');
    const display = document.getElementById('command-display');
    const ring    = document.getElementById('countdown-ring');

    // Stop drum and waiting messages when command appears
    stopDrumLoop();
    stopWaitingMessages();

    ring.classList.add('hidden');
    waiting.classList.add('hidden');
    display.classList.remove('hidden');

    // Force re-trigger animation
    display.style.animation = 'none';
    display.offsetHeight;
    display.style.animation = '';

    document.getElementById('command-emoji').textContent = cmd.emoji;
    document.getElementById('command-name').textContent = cmd.name;
    document.getElementById('command-action').textContent = cmd.action;

    screen.style.backgroundColor = cmd.color;
    screen.classList.add('command-active');

    speak(cmd.name + '! ' + cmd.action, 'command');
    vibrate([40, 30, 80]);
  }

  function hideCommand() {
    const screen = document.getElementById('screen-game');
    document.getElementById('command-display').classList.add('hidden');
    screen.style.backgroundColor = '';
    screen.classList.remove('command-active');
  }

  function showWaiting() {
    document.getElementById('waiting-display').classList.remove('hidden');
    document.getElementById('command-display').classList.add('hidden');
    document.getElementById('countdown-ring').classList.add('hidden');
    document.getElementById('fake-countdown-display').classList.add('hidden');
    startWaitingMessages();
  }

  // ── Toddler Mode ──
  function startToddler() {
    round = 0;
    showScreen('screen-game');
    const screen = document.getElementById('screen-game');
    screen.classList.add('toddler-mode');
    document.getElementById('game-mode-label').textContent = '🧒 Kleinkindmodus';
    document.getElementById('players-remaining').textContent = '';
    document.getElementById('elimination-panel').classList.add('hidden');
    gameRunning = true;
    toddlerLoop();
  }

  function toddlerLoop() {
    if (!gameRunning) return;

    round++;
    document.getElementById('players-remaining').textContent = `Runde ${round}`;

    showWaiting();
    hideCommand();

    // Longer wait for toddlers: 12–20 seconds, scaled by speed
    const waitSeconds = rand(12, 20) * getSpeedMultiplier();
    const waitMs = waitSeconds * 1000;

    // Start drum loop during waiting phase
    startDrumLoop(waitMs);

    const t = setTimeout(() => {
      if (!gameRunning) return;
      stopDrumLoop();
      const cmd = pickCommand();
      showCommand(cmd);

      // Reaction countdown for toddlers: 8 seconds, scaled by speed
      showCountdown(8 * getSpeedMultiplier(), cmd.color, () => {
        if (!gameRunning) return;
        hideCommand();
        toddlerLoop();
      });
    }, waitMs);
    timers.push(t);
  }

  // ── Chaos Mode ──
  function startChaos() {
    if (players.length < 2) return;
    players.forEach(p => p.alive = true);
    getAudioCtx();
    showScreen('screen-game');
    const screen = document.getElementById('screen-game');
    screen.classList.remove('toddler-mode');
    document.getElementById('game-mode-label').textContent = '🤪 Chaosmodus';
    document.getElementById('elimination-panel').classList.add('hidden');
    gameRunning = true;
    updatePlayersRemaining();
    chaosLoop();
  }

  function updatePlayersRemaining() {
    const alive = players.filter(p => p.alive);
    document.getElementById('players-remaining').textContent = `👥 ${alive.length} Spieler`;
  }

  function chaosLoop() {
    if (!gameRunning) return;
    showWaiting();
    hideCommand();

    const alive = players.filter(p => p.alive);
    if (alive.length <= 1) {
      showWinner(alive[0]?.name || 'Niemand');
      return;
    }

    const waitSeconds = rand(3, 12) * getSpeedMultiplier();
    const waitMs = waitSeconds * 1000;

    // Drum loop during chaos waiting too
    startDrumLoop(waitMs);

    const t = setTimeout(() => {
      if (!gameRunning) return;
      stopDrumLoop();

      // 25% chance of fake countdown
      const doFake = Math.random() < 0.25;
      if (doFake) {
        showFakeCountdown(() => {
          if (!gameRunning) return;
          chaosLoop();
        });
        return;
      }

      // 1–3 commands in sequence
      const numCommands = randInt(1, 3);
      chaosCommandSequence(numCommands, 0);
    }, waitMs);
    timers.push(t);
  }

  function chaosCommandSequence(total, current) {
    if (!gameRunning) return;
    if (current >= total) {
      showEliminationPanel();
      return;
    }

    const cmd = pickCommand();
    const reactionTime = rand(2, 4) * getSpeedMultiplier();
    showCommand(cmd);

    showCountdown(reactionTime, cmd.color, () => {
      if (!gameRunning) return;
      hideCommand();

      if (current < total - 1) {
        const pause = setTimeout(() => {
          chaosCommandSequence(total, current + 1);
        }, 600);
        timers.push(pause);
      } else {
        chaosCommandSequence(total, current + 1);
      }
    });
  }

  function showFakeCountdown(onDone) {
    const fake = document.getElementById('fake-countdown-display');
    const waiting = document.getElementById('waiting-display');
    stopWaitingMessages();
    waiting.classList.add('hidden');
    fake.classList.remove('hidden');

    const screen = document.getElementById('screen-game');
    screen.classList.add('screen-shake');

    speak('Achtung!', 'fake');
    vibrate([20, 10, 20]);

    const t = setTimeout(() => {
      if (!gameRunning) return;
      fake.classList.add('hidden');
      screen.classList.remove('screen-shake');
      onDone && onDone();
    }, randInt(800, 2000));
    timers.push(t);
  }

  function showEliminationPanel() {
    const panel = document.getElementById('elimination-panel');
    const btns  = document.getElementById('elim-buttons');
    const alive = players.filter(p => p.alive);
    btns.innerHTML = alive.map((p) => {
      const realIndex = players.indexOf(p);
      return `<button class="btn-elim" onclick="App.eliminatePlayer(${realIndex})">${p.name}</button>`;
    }).join('');
    panel.classList.remove('hidden');
  }

  function eliminatePlayer(index) {
    players[index].alive = false;
    updatePlayersRemaining();
    document.getElementById('elimination-panel').classList.add('hidden');

    speak(players[index].name + ' ist raus!', 'default');
    showToast(`${players[index].name} ❌ ausgeschieden!`, 'rgba(220,38,38,0.92)');
    vibrate([60, 30, 60, 30, 120]);

    const alive = players.filter(p => p.alive);
    if (alive.length <= 1) {
      const t = setTimeout(() => showWinner(alive[0]?.name || 'Niemand'), 1200);
      timers.push(t);
    } else {
      chaosLoop();
    }
  }

  function skipElimination() {
    document.getElementById('elimination-panel').classList.add('hidden');
    chaosLoop();
  }

  // ── Winner ──
  function showWinner(name) {
    stopGame();
    document.getElementById('winner-name').textContent = name;

    // Show Play Again only for chaos mode
    const playAgainBtn = document.getElementById('btn-play-again');
    if (playAgainBtn) {
      playAgainBtn.classList.toggle('hidden', mode !== 'chaos');
    }

    showScreen('screen-winner');
    speak(name + ' hat gewonnen! Herzlichen Glückwunsch!', 'winner');
    spawnConfetti();
  }

  function playAgain() {
    // Restart chaos mode with the same players
    players.forEach(p => p.alive = true);
    startChaos();
  }

  function spawnConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    const colors = ['#e94560','#0ea5e9','#6d28d9','#f59e0b','#22c55e','#ec4899','#f97316'];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[i % colors.length];
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      piece.style.width = randInt(6, 14) + 'px';
      piece.style.height = randInt(6, 14) + 'px';
      piece.style.animationDuration = rand(1.5, 4) + 's';
      piece.style.animationDelay = rand(0, 1.5) + 's';
      container.appendChild(piece);
    }
  }

  // ── Quit ──
  function confirmQuit() {
    document.getElementById('overlay-quit').classList.remove('hidden');
  }

  function cancelQuit() {
    document.getElementById('overlay-quit').classList.add('hidden');
  }

  function quitGame() {
    document.getElementById('overlay-quit').classList.add('hidden');
    goHome();
  }

  // ── Public API ──
  return {
    selectMode,
    goHome,
    showSettings,
    toggleSound,
    toggleDrum,
    setSpeed,
    addPlayer,
    removePlayer,
    startChaos,
    addCommand,
    removeCommand,
    resetCommands,
    eliminatePlayer,
    skipElimination,
    confirmQuit,
    cancelQuit,
    quitGame,
    playAgain,
  };
})();

// ── Service Worker Registration ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
