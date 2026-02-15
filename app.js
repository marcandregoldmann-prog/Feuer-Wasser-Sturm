/* ========== FEUER WASSER STURM – App Logic ========== */

const App = (() => {
  // ── State ──
  let mode = null;           // 'toddler' | 'chaos'
  let players = [];          // { name, alive }
  let soundEnabled = true;
  let gameRunning = false;
  let timers = [];
  let animFrame = null;

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

  // ── Sound ──
  function speak(text) {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 1.1;
    u.pitch = 1.2;
    window.speechSynthesis.speak(u);
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('fws_sound', soundEnabled ? '1' : '0');
    document.getElementById('sound-icon').textContent = soundEnabled ? '🔊' : '🔇';
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
    // Load sound pref
    const sp = localStorage.getItem('fws_sound');
    if (sp === '0') { soundEnabled = false; document.getElementById('sound-icon').textContent = '🔇'; }
  });

  // ── Game Common ──
  function stopGame() {
    gameRunning = false;
    timers.forEach(t => clearTimeout(t));
    timers = [];
    if (animFrame) cancelAnimationFrame(animFrame);
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
  function showCountdown(seconds, onDone) {
    const ring      = document.getElementById('countdown-ring');
    const progress  = document.getElementById('ring-progress');
    const numEl     = document.getElementById('countdown-number');
    const circumference = 2 * Math.PI * 90; // r=90
    progress.style.strokeDasharray = circumference;

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
    document.getElementById('ring-progress').style.stroke = cmd.color;

    speak(cmd.name + '! ' + cmd.action);
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
  }

  // ── Toddler Mode ──
  function startToddler() {
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
    showWaiting();
    hideCommand();

    const wait = rand(7, 15) * 1000;
    const t = setTimeout(() => {
      if (!gameRunning) return;
      const cmd = pickCommand();
      showCommand(cmd);

      // Show countdown ring
      showCountdown(5, () => {
        if (!gameRunning) return;
        hideCommand();
        toddlerLoop();
      });
    }, wait);
    timers.push(t);
  }

  // ── Chaos Mode ──
  function startChaos() {
    if (players.length < 2) return;
    players.forEach(p => p.alive = true);
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

    const wait = rand(3, 12) * 1000;
    const t = setTimeout(() => {
      if (!gameRunning) return;

      // Decide: fake countdown or real command(s)
      const doFake = Math.random() < 0.25;
      if (doFake) {
        showFakeCountdown(() => {
          if (!gameRunning) return;
          chaosLoop();
        });
        return;
      }

      // Number of commands in sequence: 1-3
      const numCommands = randInt(1, 3);
      chaosCommandSequence(numCommands, 0);
    }, wait);
    timers.push(t);
  }

  function chaosCommandSequence(total, current) {
    if (!gameRunning) return;
    if (current >= total) {
      // After all commands, ask for elimination
      showEliminationPanel();
      return;
    }

    const cmd = pickCommand();
    const reactionTime = rand(2, 4);
    showCommand(cmd);

    showCountdown(reactionTime, () => {
      if (!gameRunning) return;
      hideCommand();

      if (current < total - 1) {
        // Brief pause between sequential commands
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
    waiting.classList.add('hidden');
    fake.classList.remove('hidden');

    const screen = document.getElementById('screen-game');
    screen.classList.add('screen-shake');

    speak('Achtung!');

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
    btns.innerHTML = alive.map((p, i) => {
      const realIndex = players.indexOf(p);
      return `<button class="btn-elim" onclick="App.eliminatePlayer(${realIndex})">${p.name}</button>`;
    }).join('');
    panel.classList.remove('hidden');
  }

  function eliminatePlayer(index) {
    players[index].alive = false;
    updatePlayersRemaining();
    document.getElementById('elimination-panel').classList.add('hidden');

    const alive = players.filter(p => p.alive);
    if (alive.length <= 1) {
      showWinner(alive[0]?.name || 'Niemand');
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
    showScreen('screen-winner');
    speak(name + ' hat gewonnen! Herzlichen Glückwunsch!');
    spawnConfetti();
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
    addPlayer,
    removePlayer,
    startChaos,
    addCommand,
    removeCommand,
    eliminatePlayer,
    skipElimination,
    confirmQuit,
    cancelQuit,
    quitGame,
  };
})();

// ── Service Worker Registration ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
