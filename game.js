(function () {
  'use strict';

  var PLAYERS = [
    { id: 'you', name: 'Você', isYou: true, skin: '#f1c49f', shirt: '#4cc9ff', pants: '#24305e', hair: '#2a1b16', accent: '#ffd166', style: 'spiky', glasses: false, shoe: '#151a30' },
    { id: 'luna', name: 'Luna', skin: '#e8b48f', shirt: '#ff6b9a', pants: '#3b2354', hair: '#3a2030', accent: '#ffe66d', style: 'bob', glasses: false, shoe: '#20162b' },
    { id: 'theo', name: 'Theo', skin: '#8a5a3c', shirt: '#8b7cff', pants: '#232a4f', hair: '#17110e', accent: '#9bff9a', style: 'cap', glasses: false, shoe: '#161a2c' },
    { id: 'bia', name: 'Bia', skin: '#f3c9a6', shirt: '#ffb347', pants: '#34304f', hair: '#874f2b', accent: '#ff6b9a', style: 'bun', glasses: false, shoe: '#231b31' },
    { id: 'caio', name: 'Caio', skin: '#c98e63', shirt: '#58d7ff', pants: '#1d2a4a', hair: '#24150f', accent: '#ffd166', style: 'beanie', glasses: true, shoe: '#14192b' },
    { id: 'nino', name: 'Nino', skin: '#e0a97f', shirt: '#9bff9a', pants: '#2d2347', hair: '#2a1a12', accent: '#8b7cff', style: 'headphones', glasses: false, shoe: '#171c2f' }
  ];

  var TEACHER = {
    id: 'marieine',
    name: 'Professora Marieine',
    skin: '#e9bd99',
    shirt: '#eef2ff',
    pants: '#2a3154',
    hair: '#a9a6b8',
    accent: '#ffd166',
    style: 'bun',
    glasses: true,
    glassColor: '#b58a1c',
    shoe: '#1b2036'
  };

  var state = {
    screen: 'title',
    partnerId: null,
    duos: [],
    questionIndex: 0,
    orders: [],
    answers: [],
    score: 0,
    outcome: null,
    locked: false,
    chosen: false,
    hug: 0,
    hugComplete: false,
    holding: false,
    lastHoldTick: 0
  };

  var motion = {
    supported: typeof window.DeviceOrientationEvent !== 'undefined',
    needsPermission: typeof window.DeviceOrientationEvent !== 'undefined' && typeof window.DeviceOrientationEvent.requestPermission === 'function',
    enabled: false,
    active: false,
    power: 0,
    lean: 0,
    base: null,
    lastEvent: 0,
    uiMode: ''
  };

  var els = {
    onlineCount: document.getElementById('onlineCount'),
    lobbyOnline: document.getElementById('lobbyOnline'),
    soundToggle: document.getElementById('soundToggle'),
    teacherAvatar: document.getElementById('teacherAvatar'),
    startBtn: document.getElementById('startBtn'),
    duoGrid: document.getElementById('duoGrid'),
    toHugBtn: document.getElementById('toHugBtn'),
    reshuffleBtn: document.getElementById('reshuffleBtn'),
    lobbyTeacher: document.getElementById('lobbyTeacher'),
    hugLede: document.getElementById('hugLede'),
    hugStage: document.getElementById('hugStage'),
    hugYou: document.getElementById('hugYou'),
    hugPartner: document.getElementById('hugPartner'),
    hugPartnerName: document.getElementById('hugPartnerName'),
    hugHearts: document.getElementById('hugHearts'),
    hugMeter: document.getElementById('hugMeter'),
    hugFill: document.getElementById('hugFill'),
    hugPercent: document.getElementById('hugPercent'),
    hugBtn: document.getElementById('hugBtn'),
    chooseBtn: document.getElementById('chooseBtn'),
    tiltBtn: document.getElementById('tiltBtn'),
    backToLobby: document.getElementById('backToLobby'),
    quizDuo: document.getElementById('quizDuo'),
    quizProgressLabel: document.getElementById('quizProgressLabel'),
    quizProgressBar: document.getElementById('quizProgressBar'),
    questionTag: document.getElementById('questionTag'),
    questionText: document.getElementById('questionText'),
    options: document.getElementById('options'),
    quizHint: document.getElementById('quizHint'),
    reportTeacher: document.getElementById('reportTeacher'),
    reportDate: document.getElementById('reportDate'),
    reportStamp: document.getElementById('reportStamp'),
    scoreRing: document.getElementById('scoreRing'),
    scoreText: document.getElementById('scoreText'),
    reportDuo: document.getElementById('reportDuo'),
    reportVerdict: document.getElementById('reportVerdict'),
    rewardCard: document.getElementById('rewardCard'),
    answerKey: document.getElementById('answerKey'),
    answerList: document.getElementById('answerList'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    changeDuoBtn: document.getElementById('changeDuoBtn'),
    toast: document.getElementById('toast'),
    confetti: document.getElementById('confetti')
  };

  var toastTimer = 0;

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function playerById(id) {
    return PLAYERS.find(function (player) { return player.id === id; }) || PLAYERS[1];
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.remove('is-visible');
    }, 2600);
  }

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (error) { /* ignore */ }
  }

  /* ---------- Audio ---------- */

  var audioContext = null;
  var soundEnabled = true;
  try {
    soundEnabled = window.localStorage.getItem('dupla-de-luz-sound') !== 'off';
  } catch (error) { /* storage may be unavailable */ }

  function ensureAudio() {
    if (!soundEnabled) return null;
    if (!audioContext) {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      try { audioContext = new AudioCtor(); } catch (error) { return null; }
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(function () { /* ignore */ });
    }
    return audioContext;
  }

  function tone(frequency, duration, type, volume, delay) {
    var context = ensureAudio();
    if (!context) return;
    var start = context.currentTime + (delay || 0);
    var oscillator = context.createOscillator();
    var gain = context.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || 0.04, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function soundSelect() { tone(520, 0.07, 'triangle', 0.028, 0); }
  function soundHugComplete() {
    tone(523.25, 0.16, 'triangle', 0.04, 0);
    tone(659.25, 0.16, 'triangle', 0.04, 0.09);
    tone(783.99, 0.24, 'triangle', 0.04, 0.18);
  }
  function soundWin() {
    [523.25, 659.25, 783.99, 1046.5].forEach(function (frequency, index) {
      tone(frequency, 0.3, 'triangle', 0.045, index * 0.11);
    });
  }
  function soundLose() {
    tone(329.63, 0.2, 'sine', 0.04, 0);
    tone(261.63, 0.28, 'sine', 0.04, 0.14);
  }
  function soundSoftLose() {
    tone(392, 0.16, 'sine', 0.032, 0);
    tone(329.63, 0.22, 'sine', 0.032, 0.12);
  }

  function updateSoundUI() {
    if (!els.soundToggle) return;
    els.soundToggle.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
    els.soundToggle.setAttribute('aria-label', soundEnabled ? 'Desligar som' : 'Ligar som');
    els.soundToggle.classList.toggle('is-muted', !soundEnabled);
  }

  if (els.soundToggle) {
    els.soundToggle.addEventListener('click', function () {
      soundEnabled = !soundEnabled;
      try { window.localStorage.setItem('dupla-de-luz-sound', soundEnabled ? 'on' : 'off'); } catch (error) { /* ignore */ }
      updateSoundUI();
      if (soundEnabled) {
        ensureAudio();
        soundSelect();
        showToast('Som ligado.');
      } else {
        showToast('Som desligado.');
      }
    });
  }
  updateSoundUI();

  /* ---------- Avatars ---------- */

  function hairLayer(player) {
    var hair = player.hair;
    var accent = player.accent;
    switch (player.style) {
      case 'cap':
        return '<rect x="27" y="9" width="66" height="20" rx="10" fill="' + accent + '"/>' +
          '<rect x="27" y="25" width="73" height="8" rx="4" fill="#000" opacity=".16"/>' +
          '<circle cx="60" cy="13" r="3" fill="#000" opacity=".14"/>';
      case 'bob':
        return '<rect x="26" y="13" width="68" height="29" rx="14" fill="' + hair + '"/>' +
          '<rect x="26" y="30" width="10" height="31" rx="5" fill="' + hair + '"/>' +
          '<rect x="84" y="30" width="10" height="31" rx="5" fill="' + hair + '"/>';
      case 'spiky':
        return '<path d="M28 36 29 19 37 26 42 11 50 23 60 7 70 23 78 11 83 26 91 19 92 36Z" fill="' + hair + '"/>';
      case 'bun':
        return '<circle cx="60" cy="8" r="12" fill="' + hair + '"/>' +
          '<rect x="27" y="13" width="66" height="28" rx="14" fill="' + hair + '"/>';
      case 'beanie':
        return '<rect x="27" y="6" width="66" height="24" rx="12" fill="' + accent + '"/>' +
          '<rect x="27" y="23" width="66" height="9" rx="4.5" fill="#000" opacity=".17"/>';
      case 'headphones':
        return '<rect x="27" y="13" width="66" height="28" rx="14" fill="' + hair + '"/>' +
          '<path d="M26 31a34 34 0 0 1 68 0" fill="none" stroke="' + accent + '" stroke-width="5" stroke-linecap="round"/>' +
          '<rect x="19" y="37" width="13" height="21" rx="6.5" fill="' + accent + '"/>' +
          '<rect x="88" y="37" width="13" height="21" rx="6.5" fill="' + accent + '"/>';
      default:
        return '<rect x="27" y="13" width="66" height="27" rx="13" fill="' + hair + '"/>';
    }
  }

  function accessoryLayer(player) {
    if (!player.glasses) return '';
    var color = player.glassColor || '#20263f';
    return '<g fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round">' +
      '<rect x="39.5" y="34" width="17" height="14" rx="5"/>' +
      '<rect x="63.5" y="34" width="17" height="14" rx="5"/>' +
      '<path d="M56.5 40h7M39.5 40h-5M80.5 40h5"/>' +
      '</g>';
  }

  function shirtDetail(player) {
    if (player.id === 'marieine') {
      return '<rect x="50" y="64" width="20" height="52" fill="#f8faff" opacity=".92"/>' +
        '<path d="M50 64 60 80 70 64" fill="none" stroke="#d5dcf2" stroke-width="2"/>' +
        '<rect x="72" y="78" width="9" height="6" rx="1.5" fill="#ffd166"/>';
    }
    return '<path d="M61 73 52 87h6l-1 8 9-12h-6l1-10Z" fill="' + (player.accent || '#fff') + '" opacity=".92"/>';
  }

  function mouthLayer(mood) {
    if (mood === 'sad') {
      return '<path d="M51 60c3-5 15-5 18 0" fill="none" stroke="#8a3b4a" stroke-width="3" stroke-linecap="round"/>';
    }
    if (mood === 'neutral') {
      return '<path d="M54 57h12" fill="none" stroke="#8a3b4a" stroke-width="3" stroke-linecap="round"/>';
    }
    return '<path d="M51 54c3.5 6 14.5 6 18 0" fill="none" stroke="#8a3b4a" stroke-width="3" stroke-linecap="round"/>';
  }

  function avatarSVG(player, mood) {
    var expression = mood || 'happy';
    return '<svg viewBox="0 0 120 156" class="avatar-svg" aria-hidden="true" focusable="false">' +
      '<ellipse cx="60" cy="148" rx="34" ry="5.5" fill="#000" opacity=".28"/>' +
      '<rect x="43" y="110" width="15" height="34" rx="5" fill="' + player.pants + '"/>' +
      '<rect x="62" y="110" width="15" height="34" rx="5" fill="' + player.pants + '"/>' +
      '<rect x="40" y="138" width="20" height="10" rx="5" fill="' + (player.shoe || '#161a2e') + '"/>' +
      '<rect x="60" y="138" width="20" height="10" rx="5" fill="' + (player.shoe || '#161a2e') + '"/>' +
      '<rect x="33" y="64" width="54" height="52" rx="11" fill="' + player.shirt + '"/>' +
      '<rect x="39" y="70" width="14" height="38" rx="6" fill="#fff" opacity=".14"/>' +
      shirtDetail(player) +
      '<rect x="19" y="68" width="13" height="41" rx="6.5" fill="' + player.shirt + '"/>' +
      '<rect x="88" y="68" width="13" height="41" rx="6.5" fill="' + player.shirt + '"/>' +
      '<rect x="20" y="104" width="11" height="12" rx="5.5" fill="' + player.skin + '"/>' +
      '<rect x="89" y="104" width="11" height="12" rx="5.5" fill="' + player.skin + '"/>' +
      '<rect x="52" y="57" width="16" height="11" rx="4" fill="' + player.skin + '"/>' +
      '<rect x="31" y="17" width="58" height="50" rx="14" fill="' + player.skin + '"/>' +
      hairLayer(player) +
      '<rect x="45" y="37" width="8" height="10" rx="4" fill="#1c2238"/>' +
      '<rect x="67" y="37" width="8" height="10" rx="4" fill="#1c2238"/>' +
      '<circle cx="47" cy="39" r="1.5" fill="#fff"/>' +
      '<circle cx="69" cy="39" r="1.5" fill="#fff"/>' +
      '<ellipse cx="42" cy="49" rx="6" ry="3.2" fill="#ff8fab" opacity=".38"/>' +
      '<ellipse cx="78" cy="49" rx="6" ry="3.2" fill="#ff8fab" opacity=".38"/>' +
      mouthLayer(expression) +
      accessoryLayer(player) +
      '</svg>';
  }

  function avatarBlock(player, size, mood) {
    return '<div class="avatar avatar--' + size + '">' + avatarSVG(player, mood) + '</div>';
  }

  /* ---------- Screens ---------- */

  function showScreen(name) {
    state.screen = name;
    var screens = document.querySelectorAll('[data-screen]');
    for (var index = 0; index < screens.length; index += 1) {
      screens[index].classList.toggle('is-active', screens[index].getAttribute('data-screen') === name);
    }
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      window.scrollTo(0, 0);
    }
  }

  /* ---------- Lobby ---------- */

  function renderLobby() {
    if (!state.duos.length) return;
    els.duoGrid.innerHTML = state.duos.map(function (duo, index) {
      var isYou = duo.some(function (player) { return player.isYou; });
      var people = duo.map(function (player) {
        return '<div class="duo-person">' + avatarBlock(player, 'sm', 'happy') +
          '<span class="duo-person-name">' + escapeHTML(player.name) + '</span></div>';
      }).join('<span class="duo-plus" aria-hidden="true">+</span>');

      return '<article class="duo-card' + (isYou ? ' is-you' : '') + '" style="--i:' + index + '">' +
        '<div class="duo-top">' +
          '<span class="duo-index">Dupla ' + String(index + 1).padStart(2, '0') + '</span>' +
          (isYou
            ? '<span class="duo-badge">Sua dupla</span>'
            : '<span class="duo-status"><span class="online-dot"></span>online</span>') +
        '</div>' +
        '<div class="duo-people">' + people + '</div>' +
        '<div class="duo-foot">' +
          (isYou ? '<span class="duo-hint">Abrace e escolha seu par</span>' : '<span class="duo-hint">Aquecendo a voz</span>') +
        '</div>' +
        '</article>';
    }).join('');
  }

  function startGame(rerollPartner) {
    if (rerollPartner || !state.partnerId) {
      var partner = pickPartner(PLAYERS);
      state.partnerId = partner ? partner.id : 'luna';
    }
    state.questionIndex = 0;
    state.orders = [];
    state.answers = [];
    state.score = 0;
    state.outcome = null;
    state.locked = false;
    state.chosen = false;
    state.hug = 0;
    state.hugComplete = false;
    state.holding = false;
    state.duos = makeDuos(PLAYERS, state.partnerId);
    renderLobby();
    showScreen('lobby');
  }

  /* ---------- Hug ---------- */

  function resetHug() {
    var partner = playerById(state.partnerId);
    state.hug = 0;
    state.hugComplete = false;
    state.holding = false;
    state.lastHoldTick = 0;
    state.chosen = false;
    els.hugStage.style.setProperty('--hug', '0');
    els.hugStage.classList.remove('is-complete', 'is-hugging');
    els.hugFill.style.transform = 'scaleX(0)';
    els.hugPercent.textContent = '0%';
    els.hugMeter.setAttribute('aria-valuenow', '0');
    els.chooseBtn.disabled = true;
    els.chooseBtn.classList.remove('is-ready');
    els.hugBtn.disabled = false;
    els.hugBtn.classList.remove('is-down');
    els.hugBtn.textContent = 'Abraçar';
    els.chooseBtn.textContent = 'Escolher dupla';
    els.hugLede.textContent = 'Segure o botão ou incline o celular para abraçar ' + partner.name + '.';
    els.hugHearts.innerHTML = '';
    window.clearTimeout(resetHug.timer);
  }

  function enterHug() {
    var partner = playerById(state.partnerId);
    els.hugYou.innerHTML = avatarBlock(PLAYERS[0], 'lg', 'happy');
    els.hugPartner.innerHTML = avatarBlock(partner, 'lg', 'happy');
    setText(els.hugPartnerName, partner.name);
    resetHug();
    els.chooseBtn.textContent = 'Escolher ' + partner.name;
    updateTiltAvailability();
    showScreen('hug');
  }

  function setHug(value) {
    state.hug = Math.max(0, Math.min(1, value));
    var percent = Math.round(state.hug * 100);
    els.hugFill.style.transform = 'scaleX(' + state.hug.toFixed(3) + ')';
    els.hugPercent.textContent = percent + '%';
    els.hugMeter.setAttribute('aria-valuenow', String(percent));
    els.hugStage.style.setProperty('--hug', state.hug.toFixed(3));
    if (state.hug >= 1 && !state.hugComplete) completeHug();
  }

  function completeHug() {
    if (state.hugComplete) return;
    state.hugComplete = true;
    state.holding = false;
    els.hugStage.classList.add('is-complete');
    els.hugStage.classList.remove('is-hugging');
    els.hugBtn.classList.remove('is-down');
    els.hugBtn.disabled = true;
    els.hugBtn.textContent = 'Abraçado';
    els.chooseBtn.disabled = false;
    els.chooseBtn.classList.add('is-ready');
    els.hugLede.textContent = 'Abraço completo! Agora toque em Escolher ' + playerById(state.partnerId).name + '.';
    spawnHearts();
    soundHugComplete();
    vibrate([24, 40, 34]);
  }

  function spawnHearts() {
    els.hugHearts.innerHTML = '';
    for (var index = 0; index < 16; index += 1) {
      var heart = document.createElement('span');
      heart.className = 'heart';
      heart.textContent = '\u2665';
      heart.style.left = (30 + Math.random() * 40) + '%';
      heart.style.fontSize = (14 + Math.random() * 20) + 'px';
      heart.style.animationDelay = (Math.random() * 0.4) + 's';
      heart.style.setProperty('--drift', ((Math.random() - 0.5) * 110) + 'px');
      els.hugHearts.appendChild(heart);
    }
    resetHug.timer = window.setTimeout(function () {
      els.hugHearts.innerHTML = '';
    }, 2200);
  }

  /* ---------- Tilt ---------- */

  function setTiltUI(mode) {
    if (!els.tiltBtn) return;
    var modes = {
      ready: { label: 'Ativar inclinação', className: '' },
      ask: { label: 'Ativar inclinação', className: '' },
      waiting: { label: 'Inclinação: procurando sensor...', className: 'is-waiting' },
      active: { label: 'Inclinação ativa', className: 'is-active' },
      denied: { label: 'Inclinação bloqueada', className: 'is-denied' },
      'no-sensor': { label: 'Sem sensor de inclinação', className: 'is-denied' },
      unsupported: { label: 'Inclinação indisponível', className: 'is-denied' }
    };
    var selected = modes[mode] || modes.ready;
    if (motion.uiMode === mode) return;
    motion.uiMode = mode;
    els.tiltBtn.textContent = selected.label;
    els.tiltBtn.className = 'tilt-chip' + (selected.className ? ' ' + selected.className : '');
    els.tiltBtn.setAttribute('aria-pressed', mode === 'active' ? 'true' : 'false');
  }

  function updateTiltAvailability() {
    if (!els.tiltBtn) return;
    if (!motion.supported) {
      els.tiltBtn.hidden = true;
      return;
    }
    els.tiltBtn.hidden = false;
    if (motion.enabled) {
      setTiltUI(motion.active ? 'active' : 'waiting');
    } else {
      setTiltUI(motion.needsPermission ? 'ask' : 'ready');
    }
  }

  function onOrientation(event) {
    if (event.beta == null && event.gamma == null) return;
    var beta = event.beta || 0;
    var gamma = event.gamma || 0;
    motion.lastEvent = performance.now();
    if (!motion.base) motion.base = { beta: beta, gamma: gamma };
    var deltaBeta = Math.abs(beta - motion.base.beta);
    var deltaGamma = Math.abs(gamma - motion.base.gamma);
    motion.power = Math.min(1, (deltaBeta + deltaGamma) / 36);
    motion.lean = Math.max(-1, Math.min(1, (gamma - motion.base.gamma) / 30));
    if (motion.enabled) {
      motion.active = true;
      setTiltUI('active');
    }
  }

  function disableTilt(silent) {
    motion.enabled = false;
    motion.active = false;
    motion.power = 0;
    motion.base = null;
    window.removeEventListener('deviceorientation', onOrientation, true);
    setTiltUI(motion.needsPermission ? 'ask' : 'ready');
    if (!silent) showToast('Inclinação desligada. Use o botão Abraçar.');
  }

  function enableTilt() {
    if (!motion.supported) {
      setTiltUI('unsupported');
      showToast('Este aparelho não tem sensor de inclinação. Use o botão Abraçar.');
      return;
    }
    if (motion.enabled) {
      disableTilt(false);
      return;
    }

    function attach() {
      motion.enabled = true;
      motion.active = false;
      motion.power = 0;
      motion.base = null;
      motion.lastEvent = 0;
      motion.uiMode = '';
      window.addEventListener('deviceorientation', onOrientation, true);
      setTiltUI('waiting');
      showToast('Inclinação ativada. Incline o celular para abraçar.');
      window.setTimeout(function () {
        if (motion.enabled && !motion.active) {
          disableTilt(true);
          setTiltUI('no-sensor');
          showToast('Sem leituras do sensor. Use o botão Abraçar.');
        }
      }, 2400);
    }

    if (motion.needsPermission) {
      var permission;
      try {
        permission = window.DeviceOrientationEvent.requestPermission();
      } catch (error) {
        setTiltUI('denied');
        showToast('Não foi possível ativar a inclinação. Use o botão Abraçar.');
        return;
      }
      if (permission && typeof permission.then === 'function') {
        permission.then(function (result) {
          if (result === 'granted') attach();
          else {
            setTiltUI('denied');
            showToast('Permissão de movimento não concedida. Use o botão Abraçar.');
          }
        }).catch(function () {
          setTiltUI('denied');
          showToast('Não foi possível ativar a inclinação. Use o botão Abraçar.');
        });
      } else {
        attach();
      }
    } else {
      attach();
    }
  }

  if (els.tiltBtn) els.tiltBtn.addEventListener('click', enableTilt);

  /* ---------- Quiz ---------- */

  function shuffleOptions(question) {
    var copy = question.options.slice();
    for (var index = copy.length - 1; index > 0; index -= 1) {
      var swap = Math.floor(Math.random() * (index + 1));
      var temporary = copy[index];
      copy[index] = copy[swap];
      copy[swap] = temporary;
    }
    return copy;
  }

  function startQuiz() {
    var partner = playerById(state.partnerId);
    state.questionIndex = 0;
    state.answers = [];
    state.score = 0;
    state.locked = false;
    state.orders = QUESTION_BANK.map(shuffleOptions);
    els.quizDuo.innerHTML =
      '<span class="duo-chip-avatars">' + avatarBlock(PLAYERS[0], 'xs', 'happy') + avatarBlock(partner, 'xs', 'happy') + '</span>' +
      '<span class="duo-chip-name">Você + ' + escapeHTML(partner.name) + '</span>';
    els.quizHint.textContent = 'Sem resposta na hora: a Professora Marieine corrige no final.';
    renderQuestion();
    showScreen('quiz');
  }

  function renderQuestion() {
    var question = QUESTION_BANK[state.questionIndex];
    var order = state.orders[state.questionIndex];
    var number = state.questionIndex + 1;

    els.quizProgressLabel.textContent = 'Pergunta ' + number + ' de ' + QUESTION_BANK.length;
    els.quizProgressBar.style.transform = 'scaleX(' + (number / QUESTION_BANK.length) + ')';
    els.questionTag.textContent = question.tag;
    els.questionText.textContent = question.prompt;

    els.options.innerHTML = order.map(function (option, index) {
      return '<button class="option" type="button" data-option-id="' + escapeHTML(option.id) + '">' +
        '<span class="option-key">' + 'ABCD'[index] + '</span>' +
        '<span class="option-text">' + escapeHTML(option.text) + '</span>' +
        '</button>';
    }).join('');

    var buttons = els.options.querySelectorAll('.option');
    for (var index = 0; index < buttons.length; index += 1) {
      (function (button, option) {
        button.addEventListener('click', function () { chooseOption(option.id); });
      })(buttons[index], order[index]);
    }
    state.locked = false;
  }

  function chooseOption(optionId) {
    if (state.locked || state.screen !== 'quiz') return;
    state.locked = true;
    state.answers[state.questionIndex] = optionId;

    var buttons = els.options.querySelectorAll('.option');
    for (var index = 0; index < buttons.length; index += 1) {
      buttons[index].disabled = true;
      if (buttons[index].getAttribute('data-option-id') === optionId) {
        buttons[index].classList.add('is-selected');
      }
    }

    soundSelect();
    var isLast = state.questionIndex === QUESTION_BANK.length - 1;
    els.quizHint.textContent = isLast
      ? 'Corrigindo com a Professora Marieine...'
      : 'Resposta registrada. Próxima pergunta...';

    window.setTimeout(function () {
      if (isLast) {
        finishQuiz();
      } else {
        state.questionIndex += 1;
        renderQuestion();
      }
    }, isLast ? 900 : 430);
  }

  function finishQuiz() {
    state.score = scoreQuiz(state.answers);
    state.outcome = outcomeFor(state.score);
    renderReport();
    showScreen('report');
    if (state.outcome.type === 'win') {
      soundWin();
      launchConfetti();
    } else if (state.outcome.type === 'lose') {
      soundLose();
    } else {
      soundSoftLose();
    }
  }

  /* ---------- Report ---------- */

  function verdictFor(score) {
    if (score === 3) return 'Excelente! A dupla dominou luz e materiais.';
    if (score === 2) return 'Muito bom! Só um detalhe para revisar com a professora.';
    if (score === 1) return 'Vamos revisar juntos: a dupla acertou uma pergunta.';
    return 'Hora de rever a matéria com a Professora Marieine.';
  }

  function rewardMarkup(outcome) {
    if (outcome.type === 'win') {
      return '<div class="gift-card" aria-label="Gift Card simulado de 123 Robux">' +
        '<span class="gift-shine"></span>' +
        '<span class="gift-brand">ROBLOX</span>' +
        '<span class="gift-logo" aria-hidden="true"><i></i></span>' +
        '<span class="gift-value">123</span>' +
        '<span class="gift-unit">ROBUX</span>' +
        '<span class="gift-bottom"><span class="gift-label">GIFT CARD</span><span class="gift-tag">SIMULADO</span></span>' +
        '</div>' +
        '<div class="outcome-copy">' +
        '<p class="report-label">Prêmio da dupla</p>' +
        '<h3>Gift Card de 123 Robux</h3>' +
        '<p>' + escapeHTML(outcome.detail) + '</p>' +
        '</div>';
    }
    var walletClass = outcome.type === 'lose' ? 'wallet--hard' : 'wallet--soft';
    return '<div class="wallet ' + walletClass + '" aria-label="Saldo de Robux simulado: ' + outcome.robux + '">' +
      '<span class="wallet-coin">R</span>' +
      '<span class="wallet-value">' + outcome.robux + '</span>' +
      '<span class="wallet-unit">ROBUX</span>' +
      '<span class="wallet-tag">SIMULADO</span>' +
      '</div>' +
      '<div class="outcome-copy">' +
      '<p class="report-label">Resultado da dupla</p>' +
      '<h3>' + escapeHTML(outcome.headline) + '</h3>' +
      '<p>' + escapeHTML(outcome.detail) + '</p>' +
      '</div>';
  }

  function renderReport() {
    var partner = playerById(state.partnerId);
    var dateText = '';
    try {
      dateText = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
    } catch (error) {
      dateText = new Date().toLocaleDateString();
    }

    els.reportTeacher.innerHTML = avatarBlock(TEACHER, 'teacher', 'happy');
    els.reportDate.textContent = dateText;
    els.reportDuo.textContent = 'Você + ' + partner.name;
    els.scoreText.textContent = state.score + '/' + QUESTION_BANK.length;
    els.scoreRing.style.setProperty('--score-angle', (state.score / QUESTION_BANK.length * 360) + 'deg');
    els.scoreRing.classList.toggle('is-perfect', state.score === 3);
    els.reportVerdict.textContent = verdictFor(state.score);

    var stampText = state.score === 3 ? 'APROVADO' : state.score >= 1 ? 'REVISAR' : 'RECUPERAÇÃO';
    els.reportStamp.textContent = stampText;
    els.reportStamp.className = 'stamp ' + (state.score === 3 ? 'stamp--pass' : state.score >= 1 ? 'stamp--ok' : 'stamp--fail');

    els.rewardCard.className = 'reward-card reward-card--' + state.outcome.type;
    els.rewardCard.innerHTML = rewardMarkup(state.outcome);

    els.answerList.innerHTML = QUESTION_BANK.map(function (question, index) {
      var chosenId = state.answers[index];
      var chosen = question.options.find(function (option) { return option.id === chosenId; });
      var correct = question.options.find(function (option) { return option.id === question.correctId; });
      var isRight = chosenId === question.correctId;
      return '<li class="answer-row ' + (isRight ? 'is-right' : 'is-wrong') + '">' +
        '<span class="answer-mark" aria-hidden="true">' + (isRight ? '\u2713' : '\u00d7') + '</span>' +
        '<div class="answer-copy">' +
        '<p class="answer-q">' + (index + 1) + '. ' + escapeHTML(question.prompt) + '</p>' +
        '<p class="answer-yours"><span>Sua resposta:</span> ' + escapeHTML(chosen ? chosen.text : 'Não respondida') + '</p>' +
        '<p class="answer-keyline"><span>Gabarito:</span> ' + escapeHTML(correct.text) + '</p>' +
        '</div></li>';
    }).join('');

    els.answerKey.open = false;
  }

  /* ---------- Confetti ---------- */

  function launchConfetti() {
    if (!els.confetti) return;
    els.confetti.innerHTML = '';
    var colors = ['#ffcf5c', '#ff6b9a', '#58d7ff', '#9bff9a', '#9a8bff', '#ffffff'];
    for (var index = 0; index < 70; index += 1) {
      var piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[index % colors.length];
      piece.style.setProperty('--drift', ((Math.random() - 0.5) * 260) + 'px');
      piece.style.setProperty('--rot', (Math.random() * 1080 - 540) + 'deg');
      piece.style.setProperty('--dur', (2.4 + Math.random() * 2.2) + 's');
      piece.style.animationDelay = (Math.random() * 0.7) + 's';
      piece.style.width = (6 + Math.random() * 7) + 'px';
      piece.style.height = (10 + Math.random() * 9) + 'px';
      els.confetti.appendChild(piece);
    }
    window.setTimeout(function () { els.confetti.innerHTML = ''; }, 5600);
  }

  /* ---------- Frame loop ---------- */

  var lastFrame = performance.now();

  function frame(now) {
    var delta = Math.min(0.12, (now - lastFrame) / 1000);
    lastFrame = now;

    if (motion.enabled && now - motion.lastEvent > 320 && motion.power > 0) {
      motion.power = Math.max(0, motion.power - delta * 2.4);
    }

    if (state.screen === 'hug' && !state.hugComplete) {
      if (state.holding && state.lastHoldTick) {
        var held = (now - state.lastHoldTick) / 1100;
        if (held > 0) {
          state.lastHoldTick = now;
          setHug(state.hug + held);
        }
      }
      if (motion.enabled && motion.power > 0.04 && !state.hugComplete) {
        setHug(state.hug + delta * (0.3 + motion.power * 0.95));
      }
    }

    requestAnimationFrame(frame);
  }

  /* ---------- Events ---------- */

  els.startBtn.addEventListener('click', function () {
    ensureAudio();
    soundSelect();
    startGame(true);
  });

  els.toHugBtn.addEventListener('click', function () {
    soundSelect();
    enterHug();
  });

  els.reshuffleBtn.addEventListener('click', function () {
    var partner = pickPartner(PLAYERS);
    state.partnerId = partner ? partner.id : 'luna';
    state.duos = makeDuos(PLAYERS, state.partnerId);
    renderLobby();
    soundSelect();
    showToast('Nova dupla sorteada: ' + playerById(state.partnerId).name + '.');
  });

  els.backToLobby.addEventListener('click', function () {
    startGame(false);
  });

  function startHold(event) {
    if (state.screen !== 'hug' || state.hugComplete) return;
    if (event && event.cancelable) event.preventDefault();
    ensureAudio();
    state.holding = true;
    state.lastHoldTick = performance.now();
    els.hugBtn.classList.add('is-down');
    els.hugStage.classList.add('is-hugging');
    if (event && event.pointerId != null && els.hugBtn.setPointerCapture) {
      try { els.hugBtn.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
    }
  }

  function stopHold() {
    if (!state.holding) return;
    if (state.screen === 'hug' && !state.hugComplete && state.lastHoldTick) {
      var held = (performance.now() - state.lastHoldTick) / 1100;
      state.holding = false;
      state.lastHoldTick = 0;
      els.hugBtn.classList.remove('is-down');
      els.hugStage.classList.remove('is-hugging');
      if (held > 0) setHug(state.hug + held);
      return;
    }
    state.holding = false;
    state.lastHoldTick = 0;
    els.hugBtn.classList.remove('is-down');
    els.hugStage.classList.remove('is-hugging');
  }

  els.hugBtn.addEventListener('pointerdown', startHold);
  els.hugBtn.addEventListener('pointerup', stopHold);
  els.hugBtn.addEventListener('pointercancel', stopHold);
  els.hugBtn.addEventListener('lostpointercapture', stopHold);
  els.hugBtn.addEventListener('keydown', function (event) {
    if (event.key === ' ' || event.key === 'Enter') {
      if (!event.repeat) startHold(event);
    }
  });
  els.hugBtn.addEventListener('keyup', function (event) {
    if (event.key === ' ' || event.key === 'Enter') stopHold();
  });
  window.addEventListener('pointerup', stopHold);
  window.addEventListener('blur', stopHold);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopHold();
  });

  els.chooseBtn.addEventListener('click', function () {
    if (!state.hugComplete || state.chosen) return;
    state.chosen = true;
    els.chooseBtn.disabled = true;
    els.chooseBtn.classList.remove('is-ready');
    soundSelect();
    var partner = playerById(state.partnerId);
    showToast(partner.name + ' escolhida(o)! Boa sorte na prova.');
    window.setTimeout(startQuiz, 520);
  });

  els.playAgainBtn.addEventListener('click', function () {
    soundSelect();
    startGame(false);
  });

  els.changeDuoBtn.addEventListener('click', function () {
    soundSelect();
    startGame(true);
  });

  document.addEventListener('pointerdown', function () { ensureAudio(); }, { once: true });

  /* ---------- Boot ---------- */

  setText(els.onlineCount, PLAYERS.length + ' online');
  setText(els.lobbyOnline, PLAYERS.length + ' jogadores online');
  els.teacherAvatar.innerHTML = avatarBlock(TEACHER, 'teacher', 'happy');
  els.lobbyTeacher.innerHTML = avatarBlock(TEACHER, 'teacher', 'happy');
  state.duos = makeDuos(PLAYERS, 'luna');
  requestAnimationFrame(frame);
})();
