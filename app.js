/* ========== FEUER WASSER STURM – Funktionierende Version ========== */

console.log('🔥💧🌪️ Feuer Wasser Sturm wird geladen...');

const App = (function() {
  // ── State ──
  var mode = null;
  var players = [];
  var soundEnabled = true;
  var drumEnabled = true;
  var gameRunning = false;
  var timers = [];
  var animFrame = null;
  var drumInterval = null;
  var audioCtx = null;

  // ── Default commands ──
  var DEFAULT_COMMANDS = [
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
    var stored = localStorage.getItem('fws_commands');
    if (stored) {
      try { return JSON.parse(stored); } catch(e) { }
    }
    return DEFAULT_COMMANDS.slice();
  }

  function saveCommands(cmds) {
    localStorage.setItem('fws_commands', JSON.stringify(cmds));
  }

  // ── Audio Context ──
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // ── Drum Sounds ──
  function playDrumHit(type) {
    if (!drumEnabled) return;
    try {
      var ctx = getAudioCtx();
      var now = ctx.currentTime;

      if (type === 'kick') {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch(e) { }
  }

  var drumBeatIndex = 0;

  function startDrumLoop(durationMs) {
    stopDrumLoop();
    if (!drumEnabled) return;

    drumBeatIndex = 0;
    var startTime = Date.now();
    var startTempo = 600;
    var endTempo = 250;

    function nextBeat() {
      if (!gameRunning || !drumEnabled) { 
        stopDrumLoop(); 
        return; 
      }

      var elapsed = Date.now() - startTime;
      if (elapsed > durationMs) { 
        stopDrumLoop(); 
        return; 
      }

      var progress = elapsed / durationMs;
      var currentTempo = startTempo - (startTempo - endTempo) * progress;

      var pattern = ['kick', 'hihat', 'snare', 'hihat'];
      var hit = pattern[drumBeatIndex % pattern.length];
      playDrumHit(hit);
      drumBeatIndex++;

      drumInterval = setTimeout(nextBeat, currentTempo);
    }

    drumInterval = setTimeout(nextBeat, 800);
  }

  function stopDrumLoop() {
    if (drumInterval) {
      clearTimeout(drumInterval);
      drumInterval = null;
    }
  }

  // ── Speech ──
  function speak(text, style) {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (style === 'command') {
      var intro = new SpeechSynthesisUtterance('Und...');
      intro.lang = 'de-DE';
      intro.rate = 1.3;
      intro.pitch = 1.4;
      intro.volume = 0.8;

      var mainText = text.split('!')[0] + '!';
      var main = new SpeechSynthesisUtterance(mainText);
      main.lang = 'de-DE';
      main.rate = 0.85;
      main.pitch = 1.6;
      main.volume = 1.0;

      var parts = text.split('! ');
      if (parts.length > 1) {
        var action = new SpeechSynthesisUtterance(parts.slice(1).join('! '));
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
    } else {
      var u = new SpeechSynthesisUtterance(text);
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
  }

  function toggleDrum() {
    drumEnabled = !drumEnabled;
    localStorage.setItem('fws_drum', drumEnabled ? '1' : '0');
    updateDrumIcon();
    if (!drumEnabled) stopDrumLoop();
    if (drumEnabled) getAudioCtx();
  }

  function updateDrumIcon() {
    var el = document.getElementById('drum-icon');
    el.parentElement.classList.toggle('btn-disabled', !drumEnabled);
  }

  // ── Navigation ──
  function showScreen(id) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('active');
    }
    document.getElementById(id).classList.add('active');
  }

  function goHome() {
    stopGame();
    showScreen('screen-home');
  }

  function selectMode(m) {
    console.log('selectMode:', m);
    mode = m;
    getAudioCtx();
    if (m === 'toddler') {
      startToddler();
    } else {
      players = [];
      renderPlayerList();
      showScreen('screen-setup');
      var input = document.getElementById('player-name-input');
      if (input) input.focus();
    }
  }

  // ── Settings ──
  function showSettings() {
    renderCommandsList();
    showScreen('screen-settings');
  }

  function renderCommandsList() {
    var cmds = getCommands();
    var list = document.getElementById('commands-list');
    var html = '';
    for (var i = 0; i < cmds.length; i++) {
      var c = cmds[i];
      html += '<div class="command-item ' + (c.isDefault ? 'is-default' : '') + '" style="border-left-color:' + c.color + '">';
      html += '<span class="cmd-emoji">' + c.emoji + '</span>';
      html += '<div class="cmd-info">';
      html += '<div class="cmd-name">' + c.name + '</div>';
      html += '<div class="cmd-action">' + c.action + '</div>';
      html += '</div>';
      if (!c.isDefault) {
        html += '<button class="remove-cmd" onclick="App.removeCommand(' + i + ')">✕</button>';
      } else {
        html += '<span></span>';
      }
      html += '</div>';
    }
    list.innerHTML = html;
  }

  function addCommand() {
    var name  = document.getElementById('cmd-name').value.trim();
    var action = document.getElementById('cmd-action').value.trim();
    var emoji = document.getElementById('cmd-emoji').value.trim();
    var color = document.getElementById('cmd-color').value;
    
    if (!name || !action || !emoji) return;
    
    var cmds = getCommands();
    cmds.push({ name: name, action: action, emoji: emoji, color: color, isDefault: false });
    saveCommands(cmds);
    
    document.getElementById('cmd-name').value = '';
    document.getElementById('cmd-action').value = '';
    document.getElementById('cmd-emoji').value = '';
    
    renderCommandsList();
  }

  function removeCommand(index) {
    var cmds = getCommands();
    if (cmds[index] && !cmds[index].isDefault) {
      cmds.splice(index, 1);
      saveCommands(cmds);
      renderCommandsList();
    }
  }

  // ── Players ──
  function renderPlayerList() {
    var list = document.getElementById('player-list');
    var html = '';
    for (var i = 0; i < players.length; i++) {
      html += '<div class="player-chip">';
      html += '<span>' + players[i].name + '</span>';
      html += '<button class="remove-player" onclick="App.removePlayer(' + i + ')">✕</button>';
      html += '</div>';
    }
    list.innerHTML = html;
    
    var btn = document.getElementById('btn-start-chaos');
    if (btn) {
      btn.disabled = players.length < 2;
    }
  }

  function addPlayer() {
    var input = document.getElementById('player-name-input');
    var name = input.value.trim();
    
    if (!name || players.length >= 10) return;
    
    players.push({ name: name, alive: true });
    input.value = '';
    renderPlayerList();
    input.focus();
  }

  function removePlayer(i) {
    players.splice(i, 1);
    renderPlayerList();
  }

  // ── Game Control ──
  function stopGame() {
    gameRunning = false;
    for (var i = 0; i < timers.length; i++) {
      clearTimeout(timers[i]);
    }
    timers = [];
    stopDrumLoop();
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    window.speechSynthesis.cancel();
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickCommand() {
    var cmds = getCommands();
    return cmds[Math.floor(Math.random() * cmds.length)];
  }

  function showCommand(cmd) {
    console.log('showCommand:', cmd.name);
    var screen = document.getElementById('screen-game');
    document.getElementById('command-emoji').textContent = cmd.emoji;
    document.getElementById('command-name').textContent = cmd.name;
    document.getElementById('command-name').style.color = cmd.color;
    document.getElementById('command-action').textContent = cmd.action;
    document.getElementById('command-display').classList.remove('hidden');
    screen.classList.add('command-active');
    screen.style.setProperty('--command-color', cmd.color);
    screen.style.background = 'linear-gradient(145deg, #1a1a2e 0%, ' + cmd.color + '40 100%)';
    
    speak(cmd.name + '! ' + cmd.action, 'command');
  }

  function showCountdown(seconds, color, onDone) {
    console.log('showCountdown:', seconds);
    var ring = document.getElementById('countdown-ring');
    var progress = document.getElementById('ring-progress');
    var number = document.getElementById('countdown-number');
    
    ring.classList.remove('hidden');
    progress.style.stroke = color;
    
    var circumference = 2 * Math.PI * 90;
    var startTime = Date.now();
    var duration = seconds * 1000;
    
    function update() {
      if (!gameRunning) return;
      
      var elapsed = Date.now() - startTime;
      var remaining = Math.max(0, duration - elapsed);
      var secondsLeft = Math.ceil(remaining / 1000);
      
      number.textContent = secondsLeft;
      number.style.color = color;
      
      var offset = circumference * (elapsed / duration);
      progress.style.strokeDashoffset = offset;
      
      if (elapsed < duration) {
        animFrame = requestAnimationFrame(update);
      } else {
        ring.classList.add('hidden');
        if (onDone) onDone();
      }
    }
    
    update();
  }

  function hideCommand() {
    var screen = document.getElementById('screen-game');
    document.getElementById('command-display').classList.add('hidden');
    document.getElementById('countdown-ring').classList.add('hidden');
    screen.style.background = '';
    screen.classList.remove('command-active');
  }

  function showWaiting() {
    document.getElementById('waiting-display').classList.remove('hidden');
    document.getElementById('command-display').classList.add('hidden');
    document.getElementById('countdown-ring').classList.add('hidden');
  }

  // ── Toddler Mode ──
  function startToddler() {
    console.log('🧒 Starting Toddler Mode');
    showScreen('screen-game');
    var screen = document.getElementById('screen-game');
    screen.classList.add('toddler-mode');
    document.getElementById('game-mode-label').textContent = '🧒 Kleinkindmodus';
    document.getElementById('players-remaining').textContent = '';
    document.getElementById('elimination-panel').classList.add('hidden');
    gameRunning = true;
    toddlerLoop();
  }

  function toddlerLoop() {
    if (!gameRunning) return;
    console.log('🔄 Toddler Loop');
    showWaiting();
    hideCommand();

    var waitSeconds = rand(12, 20);
    var waitMs = waitSeconds * 1000;

    startDrumLoop(waitMs);

    var t = setTimeout(function() {
      if (!gameRunning) return;
      stopDrumLoop();
      var cmd = pickCommand();
      showCommand(cmd);

      showCountdown(8, cmd.color, function() {
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
    for (var i = 0; i < players.length; i++) {
      players[i].alive = true;
    }
    getAudioCtx();
    showScreen('screen-game');
    var screen = document.getElementById('screen-game');
    screen.classList.remove('toddler-mode');
    document.getElementById('game-mode-label').textContent = '🤪 Chaosmodus';
    document.getElementById('elimination-panel').classList.add('hidden');
    gameRunning = true;
    updatePlayersRemaining();
    chaosLoop();
  }

  function updatePlayersRemaining() {
    var alive = [];
    for (var i = 0; i < players.length; i++) {
      if (players[i].alive) alive.push(players[i]);
    }
    document.getElementById('players-remaining').textContent = '👥 ' + alive.length + ' Spieler';
  }

  function chaosLoop() {
    if (!gameRunning) return;
    showWaiting();
    hideCommand();

    var alive = [];
    for (var i = 0; i < players.length; i++) {
      if (players[i].alive) alive.push(players[i]);
    }
    
    if (alive.length <= 1) {
      showWinner(alive[0] ? alive[0].name : 'Niemand');
      return;
    }

    var waitSeconds = rand(3, 12);
    var waitMs = waitSeconds * 1000;

    startDrumLoop(waitMs);

    var t = setTimeout(function() {
      if (!gameRunning) return;
      stopDrumLoop();

      var numCommands = randInt(1, 3);
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

    var cmd = pickCommand();
    var reactionTime = rand(2, 4);
    showCommand(cmd);

    showCountdown(reactionTime, cmd.color, function() {
      if (!gameRunning) return;
      hideCommand();

      if (current < total - 1) {
        var pause = setTimeout(function() {
          chaosCommandSequence(total, current + 1);
        }, 600);
        timers.push(pause);
      } else {
        chaosCommandSequence(total, current + 1);
      }
    });
  }

  function showEliminationPanel() {
    var panel = document.getElementById('elimination-panel');
    var btns  = document.getElementById('elim-buttons');
    var alive = [];
    for (var i = 0; i < players.length; i++) {
      if (players[i].alive) alive.push(players[i]);
    }
    
    var html = '';
    for (var i = 0; i < alive.length; i++) {
      var realIndex = players.indexOf(alive[i]);
      html += '<button class="btn-elim" onclick="App.eliminatePlayer(' + realIndex + ')">' + alive[i].name + '</button>';
    }
    btns.innerHTML = html;
    panel.classList.remove('hidden');
  }

  function eliminatePlayer(index) {
    players[index].alive = false;
    updatePlayersRemaining();
    document.getElementById('elimination-panel').classList.add('hidden');

    speak(players[index].name + ' ist raus!', 'default');

    var alive = [];
    for (var i = 0; i < players.length; i++) {
      if (players[i].alive) alive.push(players[i]);
    }
    
    if (alive.length <= 1) {
      var t = setTimeout(function() {
        showWinner(alive[0] ? alive[0].name : 'Niemand');
      }, 1200);
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
    showScreen('screen-winner');
    speak(name + ' hat gewonnen! Herzlichen Glückwunsch!', 'winner');
    spawnConfetti();
  }

  function spawnConfetti() {
    var container = document.getElementById('confetti-container');
    container.innerHTML = '';
    var colors = ['#e94560','#0ea5e9','#6d28d9','#f59e0b','#22c55e','#ec4899','#f97316'];
    for (var i = 0; i < 60; i++) {
      var piece = document.createElement('div');
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
    selectMode: selectMode,
    goHome: goHome,
    showSettings: showSettings,
    toggleSound: toggleSound,
    toggleDrum: toggleDrum,
    addPlayer: addPlayer,
    removePlayer: removePlayer,
    startChaos: startChaos,
    addCommand: addCommand,
    removeCommand: removeCommand,
    eliminatePlayer: eliminatePlayer,
    skipElimination: skipElimination,
    confirmQuit: confirmQuit,
    cancelQuit: cancelQuit,
    quitGame: quitGame
  };
})();

window.App = App;
console.log('✅ App loaded successfully!');
console.log('📦 App methods:', Object.keys(App).join(', '));

// ── Initialization ──
window.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM loaded');
  var savedSound = localStorage.getItem('fws_sound');
  if (savedSound === '0') {
    App.toggleSound();
  }
  
  var savedDrum = localStorage.getItem('fws_drum');
  if (savedDrum === '0') {
    App.toggleDrum();
  }
});

// ── Service Worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js').catch(function() {});
  });
}
