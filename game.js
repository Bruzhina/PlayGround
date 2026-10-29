(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const PARTNERS = [
    {
      id: 'lia', name: 'LiaLuz', ping: '18 ms', x: 23, y: 43,
      skin: '#f2b78e', shirt: '#ff5f9e', shirt2: '#c72f74', hair: '#3a2333', hairStyle: 'bob'
    },
    {
      id: 'nino', name: 'NinoPrisma', ping: '24 ms', x: 71, y: 37,
      skin: '#8f5a3c', shirt: '#56e1ff', shirt2: '#1689b8', hair: '#141421', hairStyle: 'short'
    },
    {
      id: 'bia', name: 'BiaFe', ping: '31 ms', x: 42, y: 59,
      skin: '#d99566', shirt: '#b98bff', shirt2: '#7046c9', hair: '#5a2f20', hairStyle: 'wave'
    },
    {
      id: 'kaua', name: 'KauãSol', ping: '42 ms', x: 83, y: 66,
      skin: '#c8845a', shirt: '#ffd166', shirt2: '#d38b16', hair: '#2d211c', hairStyle: 'short'
    },
    {
      id: 'malu', name: 'MaluOnda', ping: '57 ms', x: 16, y: 69,
      skin: '#f0c9a8', shirt: '#5bf0b3', shirt2: '#1f9a76', hair: '#c08a51', hairStyle: 'bob'
    }
  ];

  const PLAYER = {
    id: 'you', name: 'Você', x: 50, y: 78,
    skin: '#e9a97d', shirt: '#ff5f9e', shirt2: '#8b3bff', hair: '#22213a', hairStyle: 'wave'
  };

  const QUESTIONS = [
    {
      id: 'mirror',
      text: 'O que acontece quando uma luz reflete um espelho?',
      correctNote: 'A luz atravessa o espelho.',
      options: [
        { id: 'a', text: 'Ela é absorvida pelo espelho e vira calor.' },
        { id: 'b', text: 'Atravessa o espelho.', correct: true },
        { id: 'c', text: 'Fica presa dentro do espelho.' }
      ]
    },
    {
      id: 'bottle',
      text: 'O que acontece quando uma luz reflete em uma garrafa de plástico?',
      correctNote: 'Ela não reflete, mas também não passa.',
      options: [
        { id: 'a', text: 'Ela não reflete, mas não passa.', correct: true },
        { id: 'b', text: 'Ela atravessa como no espelho.' },
        { id: 'c', text: 'Ela reflete apenas a cor azul.' }
      ]
    },
    {
      id: 'opaque',
      text: 'O que acontece quando uma luz é opaca?',
      correctNote: 'Quem é opaco são os materiais, como a madeira, o metal ou uma parede.',
      options: [
        { id: 'a', text: 'A luz passa direto e ilumina tudo.' },
        { id: 'b', text: 'A luz vira uma sombra transparente.' },
        { id: 'c', text: 'Quem é opaco são os materiais, como a madeira, o metal ou uma parede.', correct: true }
      ]
    }
  ];

  const ART = {
    mirror: `
      <svg viewBox="0 0 240 210" role="img" aria-label="Espelho iluminado por um feixe de luz">
        <defs>
          <linearGradient id="mirrorGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#e9fcff"/><stop offset=".45" stop-color="#9edcff"/><stop offset="1" stop-color="#3766a8"/>
          </linearGradient>
          <linearGradient id="beamLight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#ffd166" stop-opacity="0"/><stop offset=".5" stop-color="#ffe8a8"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/>
          </linearGradient>
          <filter id="mirrorGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <ellipse cx="126" cy="190" rx="72" ry="11" fill="#050817" opacity=".45"/>
        <g transform="rotate(-7 160 100)" filter="url(#mirrorGlow)">
          <rect x="139" y="26" width="70" height="144" rx="35" fill="url(#mirrorGlass)" stroke="#d4f4ff" stroke-width="2.5"/>
          <rect x="151" y="38" width="46" height="120" rx="23" fill="#17335c" opacity=".24"/>
          <path d="M156 58c11-10 26-12 38-5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
          <path d="M172 150c8-2 14-6 18-12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".35"/>
        </g>
        <path d="M18 98h112" stroke="url(#beamLight)" stroke-width="6" stroke-linecap="round"/>
        <path d="m124 89 13 9-13 9" fill="#fff1bf" opacity=".9"/>
        <g filter="url(#mirrorGlow)">
          <circle cx="112" cy="66" r="17" fill="#fff4ce" stroke="#ffd166" stroke-width="2"/>
          <text x="112" y="73" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="22" fill="#9b5b12">?</text>
        </g>
        <circle cx="52" cy="52" r="3" fill="#fff" opacity=".8"/>
        <circle cx="204" cy="72" r="2.5" fill="#56e1ff" opacity=".9"/>
        <circle cx="90" cy="35" r="2" fill="#ff5f9e" opacity=".8"/>
        <path d="M206 150v12M200 156h12" stroke="#56e1ff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
      </svg>`,
    bottle: `
      <svg viewBox="0 0 240 210" role="img" aria-label="Garrafa de plástico iluminada por um feixe de luz">
        <defs>
          <linearGradient id="bottleGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#ecfdff" stop-opacity=".8"/><stop offset=".45" stop-color="#77d6ff" stop-opacity=".35"/><stop offset="1" stop-color="#2a6eaa" stop-opacity=".55"/>
          </linearGradient>
          <linearGradient id="bottleWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#56e1ff" stop-opacity=".5"/><stop offset="1" stop-color="#2d7dff" stop-opacity=".65"/>
          </linearGradient>
          <linearGradient id="beamLight2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#ffd166" stop-opacity="0"/><stop offset=".55" stop-color="#ffe8a8"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/>
          </linearGradient>
          <filter id="bottleGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <ellipse cx="140" cy="190" rx="54" ry="10" fill="#050817" opacity=".45"/>
        <g transform="rotate(6 142 108)">
          <rect x="132" y="30" width="21" height="18" rx="4" fill="#b7e9ff" stroke="#e4f9ff" stroke-width="1.5"/>
          <path d="M127 48h31l7 20v90a14 14 0 0 1-14 14h-17a14 14 0 0 1-14-14V68l7-20Z" fill="url(#bottleGlass)" stroke="#d7f6ff" stroke-width="2"/>
          <path d="M120 104h45v54a11 11 0 0 1-11 11h-23a11 11 0 0 1-11-11v-54Z" fill="url(#bottleWater)"/>
          <path d="M129 62c-5 9-6 20-5 31" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
          <path d="M154 76v70" stroke="#fff" stroke-width="1.5" opacity=".3"/>
        </g>
        <path d="M18 104h100" stroke="url(#beamLight2)" stroke-width="6" stroke-linecap="round"/>
        <path d="m112 95 13 9-13 9" fill="#fff1bf" opacity=".9"/>
        <g filter="url(#bottleGlow)">
          <circle cx="108" cy="70" r="17" fill="#fff4ce" stroke="#ffd166" stroke-width="2"/>
          <text x="108" y="77" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="22" fill="#9b5b12">?</text>
        </g>
        <circle cx="205" cy="54" r="3" fill="#56e1ff" opacity=".9"/>
        <circle cx="62" cy="40" r="2" fill="#fff" opacity=".8"/>
        <path d="M194 148v12M188 154h12" stroke="#ff5f9e" stroke-width="2" stroke-linecap="round" opacity=".8"/>
      </svg>`,
    opaque: `
      <svg viewBox="0 0 240 210" role="img" aria-label="Materiais opacos bloqueando a luz de um abajur">
        <defs>
          <linearGradient id="woodG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d59a5e"/><stop offset="1" stop-color="#7a4823"/></linearGradient>
          <linearGradient id="metalG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef4ff"/><stop offset=".5" stop-color="#9cabc8"/><stop offset="1" stop-color="#5a6887"/></linearGradient>
          <radialGradient id="lampG" cx=".5" cy=".2" r=".8"><stop offset="0" stop-color="#fff7dc"/><stop offset="1" stop-color="#ffc247"/></radialGradient>
          <filter id="opaqueGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <ellipse cx="120" cy="192" rx="90" ry="10" fill="#050817" opacity=".45"/>
        <g filter="url(#opaqueGlow)">
          <path d="M42 88h52l-9 62H51l-9-62Z" fill="url(#lampG)" opacity=".9"/>
          <path d="M68 88V74" stroke="#c7d0e6" stroke-width="3"/>
          <rect x="58" y="148" width="20" height="7" rx="3" fill="#7c86a3"/>
          <circle cx="68" cy="105" r="10" fill="#fff6cf" opacity=".85"/>
        </g>
        <path d="M90 112 132 96l6 18-40 16Z" fill="#ffe9a8" opacity=".22"/>
        <g transform="rotate(-3 171 115)">
          <rect x="147" y="58" width="46" height="104" rx="4" fill="url(#woodG)" stroke="#f2c28d" stroke-width="1.5"/>
          <path d="M154 76h32M152 96h36M154 116h30M156 136h26" stroke="#5f3517" stroke-width="2" opacity=".35" stroke-linecap="round"/>
        </g>
        <g transform="rotate(4 188 112)">
          <rect x="184" y="66" width="34" height="94" rx="4" fill="url(#metalG)" stroke="#d9e7ff" stroke-width="1.5"/>
          <path d="M190 78v70" stroke="#fff" stroke-width="2" opacity=".5"/>
        </g>
        <g filter="url(#opaqueGlow)">
          <circle cx="128" cy="64" r="17" fill="#fff4ce" stroke="#ffd166" stroke-width="2"/>
          <text x="128" y="71" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="22" fill="#9b5b12">?</text>
        </g>
        <circle cx="41" cy="42" r="2.5" fill="#56e1ff" opacity=".9"/>
        <circle cx="214" cy="38" r="2" fill="#fff" opacity=".8"/>
        <path d="M30 156v12M24 162h12" stroke="#ff5f9e" stroke-width="2" stroke-linecap="round" opacity=".8"/>
      </svg>`
  };

  const CORRECTION_LINES = [
    'Espelho: a luz atravessa o espelho.',
    'Garrafa de plástico: ela não reflete e também não passa.',
    'Materiais opacos — madeira, metal e parede — bloqueiam a luz.'
  ];

  const state = {
    screen: 'title',
    wallet: 40,
    near: null,
    hugged: null,
    partner: null,
    paired: false,
    busy: false,
    auto: null,
    keys: new Set(),
    joy: { x: 0, y: 0, active: false, pointerId: null },
    tilt: { enabled: false, x: 0, y: 0, base: null, received: false, timer: 0 },
    sound: true,
    qIndex: 0,
    selected: null,
    quiz: [],
    answers: [],
    resultBusy: false
  };

  const el = {
    body: document.body,
    avatarLayer: $('#avatarLayer'),
    playerList: $('#playerList'),
    stage: $('#stage'),
    hugBtn: $('#hugBtn'),
    hugLabel: $('#hugLabel'),
    chooseBtn: $('#chooseBtn'),
    questPill: $('#questPill'),
    questText: $('#questText'),
    tiltBtn: $('#tiltBtn'),
    tiltLabel: $('#tiltLabel'),
    joystick: $('#joystick'),
    joystickStick: $('#joystickStick'),
    hearts: $('#hearts'),
    pairedBanner: $('#pairedBanner'),
    pairedNames: $('#pairedNames'),
    pairedAvatars: $('#pairedAvatars'),
    partnerSlot: $('#partnerSlot'),
    partnerName: $('#partnerName'),
    onlineCount: $('#onlineCount'),
    titleOnline: $('#titleOnline'),
    walletValue: $('#walletValue'),
    wallet: $('.wallet'),
    soundBtn: $('#soundBtn'),
    startBtn: $('#startBtn'),
    quizDuo: $('#quizDuo'),
    duoDots: $('#duoDots'),
    progressLabel: $('#progressLabel'),
    progressScore: $('#progressScore'),
    progressBar: $('#progressBar'),
    qArt: $('#qArt'),
    qNum: $('#qNum'),
    qText: $('#qText'),
    options: $('#options'),
    answerHint: $('#answerHint'),
    nextBtn: $('#nextBtn'),
    nextLabel: $('#nextLabel'),
    questionCard: $('#questionCard'),
    speechBubble: $('#speechBubble'),
    answerChips: $('#answerChips'),
    verdictKicker: $('#verdictKicker'),
    verdictTitle: $('#verdictTitle'),
    verdictText: $('#verdictText'),
    rewardBox: $('#rewardBox'),
    replayBtn: $('#replayBtn'),
    confetti: $('#confetti'),
    toast: $('#toast'),
    resultStage: $('#resultStage')
  };

  let playerAvatar = null;
  let partnerEls = new Map();
  let lastFrame = 0;
  let toastTimer = 0;
  let audioCtx = null;
  let motionListenerAttached = false;

  // ---------------------------------------------------------------- icons
  function coinIcon() {
    return '<span class="coin" aria-hidden="true">R</span>';
  }

  function lockIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  }

  // ---------------------------------------------------------------- avatars
  function avatarMarkup(person, { isPlayer = false, scale = '' } = {}) {
    return `
      <div class="avatar${isPlayer ? ' is-player' : ''}" data-id="${person.id}" data-hair="${person.hairStyle}"
           style="--skin:${person.skin};--shirt:${person.shirt};--shirt2:${person.shirt2};--hair:${person.hair};left:${person.x}%;top:${person.y}%;${scale ? `--scale:${scale};` : ''}">
        <span class="tag"><i></i>${isPlayer ? 'VOCÊ' : person.name}</span>
        <span class="char">
          <span class="shadow"></span>
          <span class="leg leg-l"></span>
          <span class="leg leg-r"></span>
          <span class="arm arm-l"></span>
          <span class="arm arm-r"></span>
          <span class="torso"></span>
          <span class="head">
            <span class="hair"></span>
            <span class="face"><i class="eye"></i><i class="eye"></i><i class="smile"></i></span>
          </span>
        </span>
      </div>`;
  }

  function miniAvatarMarkup(person) {
    return `
      <div class="mini-avatar" data-hair="${person.hairStyle}" style="--skin:${person.skin};--shirt:${person.shirt};--shirt2:${person.shirt2};--hair:${person.hair}">
        <i class="head"><i class="hair"></i><i class="face"><i class="eye"></i><i class="eye"></i><i class="smile"></i></i></i>
        <i class="torso"></i>
      </div>`;
  }

  function buildLobby() {
    el.avatarLayer.innerHTML = avatarMarkup(PLAYER, { isPlayer: true }) + PARTNERS.map((p) => avatarMarkup(p)).join('');
    playerAvatar = $(`.avatar[data-id="${PLAYER.id}"]`, el.avatarLayer);
    partnerEls = new Map(PARTNERS.map((p) => [p.id, $(`.avatar[data-id="${p.id}"]`, el.avatarLayer)]));

    el.playerList.innerHTML = PARTNERS.map((p) => `
      <li>
        <button class="player-row" type="button" data-id="${p.id}" style="--skin:${p.skin};--shirt:${p.shirt};--shirt2:${p.shirt2};--hair:${p.hair}">
          <span class="row-avatar" aria-hidden="true"><i></i><b></b></span>
          <span class="row-meta"><b>${p.name}</b><small>pronto para formar dupla</small></span>
          <span class="row-ping"><i></i>${p.ping}</span>
        </button>
      </li>`).join('');

    el.onlineCount.textContent = String(PARTNERS.length);
    el.titleOnline.textContent = String(PARTNERS.length);
  }

  function updateAllPositions() {
    const everyone = [{ ...PLAYER }, ...PARTNERS];
    everyone.forEach((p) => {
      const avatar = p.id === PLAYER.id ? playerAvatar : partnerEls.get(p.id);
      if (!avatar) return;
      avatar.style.left = `${p.x}%`;
      avatar.style.top = `${p.y}%`;
      avatar.style.zIndex = String(6 + Math.round(p.y));
    });
  }

  // ---------------------------------------------------------------- audio
  function audio() {
    if (!state.sound) return null;
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      return audioCtx;
    } catch {
      return null;
    }
  }

  function tone(freq, duration = 0.09, type = 'sine', volume = 0.04, delay = 0, endFreq = null) {
    const ctx = audio();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function sfx(kind) {
    if (!state.sound) return;
    if (kind === 'start') {
      tone(392, 0.14, 'sine', 0.045, 0);
      tone(523.25, 0.14, 'sine', 0.045, 0.09);
      tone(659.25, 0.22, 'sine', 0.05, 0.18);
    } else if (kind === 'click') {
      tone(660, 0.045, 'triangle', 0.025, 0, 520);
    } else if (kind === 'hug') {
      tone(523.25, 0.2, 'sine', 0.04, 0);
      tone(659.25, 0.2, 'sine', 0.04, 0.08);
      tone(783.99, 0.3, 'sine', 0.045, 0.16);
    } else if (kind === 'choose') {
      tone(587.33, 0.1, 'triangle', 0.04, 0);
      tone(880, 0.16, 'triangle', 0.045, 0.09);
      tone(1174.66, 0.24, 'sine', 0.035, 0.18);
    } else if (kind === 'correct') {
      tone(783.99, 0.11, 'sine', 0.03, 0);
      tone(1046.5, 0.16, 'sine', 0.035, 0.08);
    } else if (kind === 'wrong') {
      tone(220, 0.16, 'sawtooth', 0.025, 0, 174);
    } else if (kind === 'win') {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.32, 'sine', 0.04, i * 0.1));
    } else if (kind === 'lose') {
      [392, 349.23, 293.66, 220].forEach((f, i) => tone(f, 0.26, 'triangle', 0.03, i * 0.12));
    }
  }

  // ---------------------------------------------------------------- screens
  function showScreen(name) {
    state.screen = name;
    el.body.dataset.screen = name;
    $$('.screen').forEach((screen) => {
      const active = screen.id === `screen-${name}`;
      screen.hidden = !active;
      if (active) screen.scrollTop = 0;
    });
    if (name === 'lobby') resetRound(false);
  }

  // ---------------------------------------------------------------- lobby reset
  function resetRound(resetWallet = true) {
    state.near = null;
    state.hugged = null;
    state.partner = null;
    state.paired = false;
    state.busy = false;
    state.auto = null;
    state.joy = { x: 0, y: 0, active: false, pointerId: null };
    state.qIndex = 0;
    state.selected = null;
    state.quiz = [];
    state.answers = [];
    state.resultBusy = false;
    if (resetWallet) {
      state.wallet = 40;
      updateWallet(0);
    }
    el.joystickStick.style.transform = 'translate(0px, 0px)';
    el.body.classList.remove('has-moved');
    el.pairedBanner.hidden = true;
    el.pairedBanner.classList.remove('is-visible');
    el.chooseBtn.hidden = true;
    el.hugBtn.hidden = false;
    el.hugBtn.disabled = true;
    el.hugLabel.textContent = 'Abraçar';
    el.questPill.className = 'quest-pill';
    el.questText.textContent = 'Aproxime-se de um jogador online para começar.';
    el.partnerSlot.classList.remove('is-filled');
    el.partnerName.textContent = 'Ainda não escolhida';
    el.partnerSlot.querySelector('small').textContent = 'SUA DUPLA';
    el.answerChips.innerHTML = '';
    el.rewardBox.innerHTML = '';
    el.verdictKicker.textContent = 'CORREÇÃO DA PROFESSORA';
    el.verdictTitle.textContent = 'Analisando...';
    el.verdictTitle.className = '';
    el.verdictText.textContent = 'A Professora Marieine está conferindo cada resposta.';
    el.replayBtn.hidden = true;
    el.speechBubble.textContent = 'Deixa eu ver as respostas da dupla...';
    el.speechBubble.classList.remove('is-talking');
    el.confetti.innerHTML = '';
    el.resultStage.classList.remove('is-win', 'is-lose');

    PLAYER.x = 50;
    PLAYER.y = 78;
    PARTNERS.forEach((p, index) => {
      p.x = [23, 71, 42, 83, 16][index];
      p.y = [43, 37, 59, 66, 69][index];
    });
    updateAllPositions();
    $$('.avatar', el.avatarLayer).forEach((avatar) => {
      avatar.classList.remove('is-near', 'is-hugging', 'is-chosen', 'is-gliding', 'is-walking', 'is-flipped');
    });
    $$('.player-row', el.playerList).forEach((row) => row.classList.remove('is-near', 'is-chosen'));
  }

  function updateWallet(delta, animate = true) {
    el.walletValue.textContent = String(state.wallet);
    if (!animate || !delta) return;
    el.wallet.classList.remove('is-up', 'is-down');
    void el.wallet.offsetWidth;
    el.wallet.classList.add(delta > 0 ? 'is-up' : 'is-down');
    window.setTimeout(() => el.wallet.classList.remove('is-up', 'is-down'), 800);
  }

  // ---------------------------------------------------------------- proximity
  function stageSize() {
    return el.stage.getBoundingClientRect();
  }

  function distanceTo(person) {
    const rect = stageSize();
    const dx = ((person.x - PLAYER.x) / 100) * rect.width;
    const dy = ((person.y - PLAYER.y) / 100) * rect.height;
    return Math.hypot(dx, dy);
  }

  function nearThreshold() {
    const rect = stageSize();
    return clamp(rect.width * 0.27, 94, 154);
  }

  function findNearest() {
    let best = null;
    let bestDistance = Infinity;
    PARTNERS.forEach((person) => {
      if (state.partner && person.id === state.partner.id) return;
      const d = distanceTo(person);
      if (d < bestDistance) {
        bestDistance = d;
        best = person;
      }
    });
    return { person: best, distance: bestDistance };
  }

  function updateNear() {
    if (state.hugged || state.paired) return;
    const { person, distance } = findNearest();
    const next = person && distance <= nearThreshold() ? person : null;
    if ((next?.id || null) === (state.near?.id || null)) return;

    if (state.near) {
      partnerEls.get(state.near.id)?.classList.remove('is-near');
      $(`.player-row[data-id="${state.near.id}"]`, el.playerList)?.classList.remove('is-near');
    }
    state.near = next;
    if (next) {
      partnerEls.get(next.id)?.classList.add('is-near');
      $(`.player-row[data-id="${next.id}"]`, el.playerList)?.classList.add('is-near');
      el.hugBtn.disabled = false;
      el.questPill.className = 'quest-pill is-hot';
      el.questText.textContent = `Você está perto de ${next.name}. Toque em Abraçar!`;
    } else {
      el.hugBtn.disabled = true;
      el.questPill.className = 'quest-pill';
      el.questText.textContent = 'Aproxime-se de um jogador online para começar.';
    }
  }

  // ---------------------------------------------------------------- movement
  function readKeys() {
    const k = state.keys;
    return {
      x: (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0),
      y: (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0)
    };
  }

  function updateMovement(dt) {
    if (state.screen !== 'lobby' || state.paired || state.hugged || state.busy) return;
    const rect = stageSize();
    if (!rect.width || !rect.height) return;

    let vx = state.joy.x + state.tilt.x;
    let vy = state.joy.y + state.tilt.y;
    const keyVector = readKeys();
    vx += keyVector.x;
    vy += keyVector.y;

    if (state.auto) {
      if (state.auto.target) {
        const target = state.auto.target;
        const dx = ((target.x - PLAYER.x) / 100) * rect.width;
        const dy = ((target.y - PLAYER.y) / 100) * rect.height;
        const d = Math.hypot(dx, dy);
        const stop = nearThreshold() * 0.72;
        if (d <= stop) {
          state.auto = null;
          vx = 0;
          vy = 0;
        } else {
          vx = dx / d;
          vy = dy / d;
        }
      } else {
        const dx = ((state.auto.x - PLAYER.x) / 100) * rect.width;
        const dy = ((state.auto.y - PLAYER.y) / 100) * rect.height;
        const d = Math.hypot(dx, dy);
        if (d < 7) {
          state.auto = null;
          vx = 0;
          vy = 0;
        } else {
          vx = dx / d;
          vy = dy / d;
        }
      }
    }

    if (state.joy.active || Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02) {
      state.auto = state.joy.active ? null : state.auto;
    }

    const magnitude = Math.hypot(vx, vy);
    if (magnitude > 1) {
      vx /= magnitude;
      vy /= magnitude;
    }

    const moving = Math.abs(vx) > 0.04 || Math.abs(vy) > 0.04;
    if (!moving) {
      playerAvatar?.classList.remove('is-walking');
      return;
    }

    const speed = 172;
    PLAYER.x = clamp(PLAYER.x + (vx * speed * dt * 100) / rect.width, 8, 92);
    PLAYER.y = clamp(PLAYER.y + (vy * speed * dt * 100) / rect.height, 34, 84);

    if (playerAvatar) {
      playerAvatar.style.left = `${PLAYER.x}%`;
      playerAvatar.style.top = `${PLAYER.y}%`;
      playerAvatar.style.zIndex = String(6 + Math.round(PLAYER.y));
      playerAvatar.classList.add('is-walking');
      if (Math.abs(vx) > 0.1) playerAvatar.style.setProperty('--face', vx < 0 ? '-1' : '1');
    }
    el.body.classList.add('has-moved');
    updateNear();
  }

  function loop(now) {
    if (!lastFrame) lastFrame = now;
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    updateMovement(dt);
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- interactions
  function goToPartner(person) {
    if (state.screen !== 'lobby' || state.paired || state.hugged || state.busy) return;
    state.auto = { target: person };
    el.body.classList.add('has-moved');
    sfx('click');
  }

  function goToPoint(x, y) {
    if (state.screen !== 'lobby' || state.paired || state.hugged || state.busy) return;
    state.auto = { x: clamp(x, 8, 92), y: clamp(y, 34, 84) };
    el.body.classList.add('has-moved');
  }

  function spawnHearts() {
    const rect = stageSize();
    for (let i = 0; i < 9; i += 1) {
      const heart = document.createElement('span');
      heart.className = 'heart';
      heart.textContent = i % 3 === 0 ? '♥' : '✦';
      const x = ((PLAYER.x - 4) / 100) * rect.width + (Math.random() - 0.5) * 46;
      const y = ((PLAYER.y - 18) / 100) * rect.height + (Math.random() - 0.5) * 30;
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      heart.style.animationDelay = `${i * 55}ms`;
      heart.style.fontSize = `${13 + Math.random() * 12}px`;
      if (i % 2) heart.style.color = '#56e1ff';
      el.hearts.appendChild(heart);
      window.setTimeout(() => heart.remove(), 1900);
    }
  }

  function hugPartner() {
    if (!state.near || state.hugged || state.busy) return;
    const person = state.near;
    state.hugged = person;
    state.busy = true;
    state.auto = null;
    playerAvatar?.classList.remove('is-walking');
    playerAvatar?.classList.add('is-hugging');
    const partner = partnerEls.get(person.id);
    partner?.classList.remove('is-near');
    partner?.classList.add('is-hugging', 'is-gliding');

    const hugX = clamp(PLAYER.x - 6.4, 8, 92);
    const hugY = PLAYER.y - 0.2;
    person.x = hugX;
    person.y = hugY;
    if (partner) {
      partner.style.left = `${hugX}%`;
      partner.style.top = `${hugY}%`;
      partner.style.zIndex = String(6 + Math.round(hugY) + 1);
    }

    el.hugBtn.disabled = true;
    el.questPill.className = 'quest-pill is-hot';
    el.questText.textContent = `Abraçando ${person.name}...`;
    sfx('hug');

    window.setTimeout(() => {
      spawnHearts();
      partner?.classList.remove('is-gliding');
      state.busy = false;
      el.hugBtn.hidden = true;
      el.chooseBtn.hidden = false;
      el.questPill.className = 'quest-pill is-ready';
      el.questText.textContent = `Dupla pronta! Toque em Escolher para ficar com ${person.name}.`;
      el.partnerSlot.classList.add('is-filled');
      el.partnerName.textContent = `Abraçado: ${person.name}`;
      el.partnerSlot.querySelector('small').textContent = 'PRÉVIA DA DUPLA';
      $(`.player-row[data-id="${person.id}"]`, el.playerList)?.classList.add('is-near');
    }, 650);
  }

  function choosePartner() {
    if (!state.hugged || state.paired) return;
    const person = state.hugged;
    state.paired = true;
    state.busy = true;
    state.partner = person;
    state.auto = null;

    partnerEls.get(person.id)?.classList.add('is-chosen');
    $(`.player-row[data-id="${person.id}"]`, el.playerList)?.classList.add('is-chosen');

    el.pairedAvatars.innerHTML = miniAvatarMarkup(PLAYER) + miniAvatarMarkup(person);
    el.pairedNames.textContent = `Você + ${person.name}`;
    el.pairedBanner.hidden = false;
    el.pairedBanner.classList.add('is-visible');
    el.questPill.className = 'quest-pill is-ready';
    el.questText.textContent = `${person.name} é sua dupla! Abrindo a prova da Prof. Marieine...`;
    el.chooseBtn.hidden = true;
    el.partnerSlot.classList.add('is-filled');
    el.partnerName.textContent = `Você + ${person.name}`;
    el.partnerSlot.querySelector('small').textContent = 'SUA DUPLA';
    sfx('choose');

    window.setTimeout(() => {
      startQuiz();
    }, 1500);
  }

  // ---------------------------------------------------------------- quiz
  function setupQuiz() {
    state.quiz = QUESTIONS.map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option }))
    }));
    state.qIndex = 0;
    state.selected = null;
    state.answers = [];
    state.busy = false;
    el.quizDuo.textContent = state.partner ? `Você + ${state.partner.name}` : 'Sua dupla';
    el.duoDots.innerHTML = `
      <span class="dot-person" style="--skin:${PLAYER.skin};--shirt:${PLAYER.shirt};--shirt2:${PLAYER.shirt2}"></span>
      <span class="dot-person" style="--skin:${state.partner?.skin || '#f2b78e'};--shirt:${state.partner?.shirt || '#56e1ff'};--shirt2:${state.partner?.shirt2 || '#1689b8'}"></span>`;
    el.answerChips.innerHTML = '';
    el.rewardBox.innerHTML = '';
    el.verdictTitle.textContent = 'Analisando...';
    el.verdictTitle.className = '';
    el.verdictText.textContent = 'A Professora Marieine está conferindo cada resposta.';
    el.verdictKicker.textContent = 'CORREÇÃO DA PROFESSORA';
    el.replayBtn.hidden = true;
    el.speechBubble.textContent = 'Deixa eu ver as respostas da dupla...';
  }

  function startQuiz() {
    setupQuiz();
    showScreen('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const question = state.quiz[state.qIndex];
    if (!question) return;
    state.selected = null;
    el.qArt.innerHTML = ART[question.id];
    el.qNum.textContent = String(state.qIndex + 1).padStart(2, '0');
    el.qText.textContent = question.text;
    el.progressLabel.textContent = `Pergunta ${state.qIndex + 1} de ${state.quiz.length}`;
    el.progressScore.textContent = 'Correção no final';
    el.progressBar.style.width = `${((state.qIndex + 1) / state.quiz.length) * 100}%`;
    el.answerHint.textContent = 'Selecione uma resposta para continuar.';
    el.answerHint.classList.remove('is-ready');
    el.nextBtn.disabled = true;
    el.nextLabel.textContent = state.qIndex === state.quiz.length - 1 ? 'Entregar à Prof.' : 'Próxima';

    el.options.innerHTML = question.options.map((option, index) => `
      <button class="option" type="button" role="radio" aria-checked="false" data-option="${option.id}">
        <span class="letter">${String.fromCharCode(65 + index)}</span>
        <span>${option.text}</span>
      </button>`).join('');

    $$('.option', el.options).forEach((button) => {
      button.addEventListener('click', () => {
        selectOption(button.dataset.option);
      });
    });

    el.questionCard.animate(
      [
        { opacity: 0.35, transform: 'translateY(14px) scale(.992)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ],
      { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  }

  function selectOption(optionId) {
    if (state.busy) return;
    const question = state.quiz[state.qIndex];
    if (!question.options.some((option) => option.id === optionId)) return;
    state.selected = optionId;
    $$('.option', el.options).forEach((button) => {
      const selected = button.dataset.option === optionId;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-checked', String(selected));
    });
    el.nextBtn.disabled = false;
    el.answerHint.textContent = 'Resposta registrada. Toque em Próxima.';
    el.answerHint.classList.add('is-ready');
    sfx('click');
  }

  function nextQuestion() {
    if (!state.selected || state.busy) return;
    const question = state.quiz[state.qIndex];
    const option = question.options.find((item) => item.id === state.selected);
    state.answers[state.qIndex] = { question, option };
    if (state.qIndex < state.quiz.length - 1) {
      state.qIndex += 1;
      renderQuestion();
      return;
    }
    state.busy = true;
    el.nextBtn.disabled = true;
    sfx('choose');
    window.setTimeout(() => {
      state.busy = false;
      showResults();
    }, 320);
  }

  function showResults() {
    showScreen('result');
    state.resultBusy = true;
    runCorrection();
  }

  function chipMarkup(answer, index) {
    return `
      <li class="answer-chip" data-index="${index}">
        <span class="chip-mark">?</span>
        <span>
          <b>Pergunta ${index + 1}</b>
          <span class="chip-answer">${answer.option.text}</span>
          <small></small>
        </span>
      </li>`;
  }

  function speak(text) {
    el.speechBubble.textContent = text;
    el.speechBubble.classList.remove('is-talking');
    void el.speechBubble.offsetWidth;
    el.speechBubble.classList.add('is-talking');
  }

  async function runCorrection() {
    state.resultBusy = true;
    const score = state.answers.filter((answer) => answer.option?.correct).length;
    el.answerChips.innerHTML = state.answers.map((answer, index) => chipMarkup(answer, index)).join('');
    el.verdictKicker.textContent = 'CORREÇÃO DA PROFESSORA';
    el.verdictTitle.textContent = 'Analisando...';
    el.verdictTitle.className = '';
    el.verdictText.textContent = 'A Professora Marieine está conferindo cada resposta.';
    el.rewardBox.innerHTML = '';
    el.replayBtn.hidden = true;
    speak('Deixa eu ver as respostas da dupla...');
    await wait(900);

    for (let index = 0; index < state.answers.length; index += 1) {
      const answer = state.answers[index];
      const chip = $(`.answer-chip[data-index="${index}"]`, el.answerChips);
      if (!chip) continue;
      const correct = Boolean(answer.option?.correct);
      const correctOption = answer.question.options.find((option) => option.correct);
      chip.classList.add(correct ? 'is-correct' : 'is-wrong');
      const mark = $('.chip-mark', chip);
      if (mark) mark.textContent = correct ? '✓' : '×';
      const note = $('small', chip);
      if (note) {
        note.textContent = correct
          ? 'Resposta correta!'
          : `Correta: ${correctOption ? correctOption.text : answer.question.correctNote}`;
      }
      speak(`${CORRECTION_LINES[index]} ${correct ? 'Você acertou!' : 'Quase! Anota essa.'}`);
      sfx(correct ? 'correct' : 'wrong');
      await wait(1250);
    }

    speak(score === 3 ? 'Três acertos! Nota máxima para essa dupla!' : 'Vamos ver o resultado...');
    await wait(650);
    showVerdict(score);
    state.resultBusy = false;
  }

  function giftCardMarkup() {
    return `
      <div class="gift-card">
        <div class="gift-top">
          <span class="gift-brand">GIFT CARD • ROBLOX</span>
          <span class="gift-logo"><span>R</span> ROBUX</span>
        </div>
        <div class="gift-amount"><b>123</b><small>ROBUX</small></div>
        <div class="gift-bottom">
          <span>PRÊMIO DA PROVA DE ÓPTICA</span>
          <span class="gift-stars">✦ ✦ ✦</span>
        </div>
      </div>`;
  }

  function showVerdict(score) {
    const won = score === state.quiz.length;
    const loss = score === 2 ? 12 : score === 1 ? 23 : 34;
    if (won) {
      state.wallet += 123;
      updateWallet(123);
    } else {
      state.wallet = Math.max(0, state.wallet - loss);
      updateWallet(-loss);
    }

    el.verdictKicker.textContent = won ? 'NOTA 10 • 3/3 ACERTOS' : `${score}/3 ACERTOS`;
    el.verdictTitle.textContent = won ? 'APROVADO!' : score === 2 ? 'QUASE LÁ!' : 'REPROVADO!';
    el.verdictTitle.className = won ? 'is-win' : 'is-lose';
    el.verdictText.textContent = won
      ? 'Você e sua dupla acertaram tudo sobre luz, espelhos e materiais opacos. A Professora Marieine liberou o prêmio.'
      : score === 2
        ? 'Uma resposta escapou. A Professora Marieine descontou menos Robux do que o prêmio, mas o Gift Card ficou bloqueado.'
        : 'A luz ainda tem segredos para essa dupla. A Professora Marieine descontou menos Robux do que o prêmio e pediu uma nova tentativa.';

    el.rewardBox.innerHTML = won
      ? `${giftCardMarkup()}<div class="reward-note"><i></i> +123 Robux adicionados ao seu saldo simulado.</div>`
      : `
        <div class="loss-panel">
          <div class="loss-top"><span>RESULTADO DA PROVA</span>${lockIcon()}</div>
          <div class="loss-amount"><b>-${loss}</b><small>ROBUX</small></div>
          <p>Errou ${state.quiz.length - score} de ${state.quiz.length}. Você perdeu menos Robux do que o prêmio de 123, mas o Gift Card ficou bloqueado.</p>
        </div>
        <div class="reward-note"><i></i> Tente de novo para liberar o Gift Card de 123 Robux.</div>`;

    el.replayBtn.hidden = false;
    el.resultStage.classList.toggle('is-win', won);
    el.resultStage.classList.toggle('is-lose', !won);
    speak(won
      ? 'Parabéns! A dupla entendeu tudo de luz. Aqui está o Gift Card de 123 Robux!'
      : `Não foi dessa vez. Você perdeu ${loss} Robux, mas pode tentar de novo!`);
    if (won) {
      sfx('win');
      burstConfetti();
    } else {
      sfx('lose');
    }
  }

  function burstConfetti() {
    const colors = ['#5bf0b3', '#56e1ff', '#ff5f9e', '#ffd166', '#b98bff', '#ffffff'];
    el.confetti.innerHTML = '';
    for (let i = 0; i < 70; i += 1) {
      const piece = document.createElement('i');
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 240}px`);
      piece.style.setProperty('--spin', `${360 + Math.random() * 900}deg`);
      piece.style.setProperty('--dur', `${2.1 + Math.random() * 2}s`);
      piece.style.setProperty('--delay', `${Math.random() * 0.8}s`);
      piece.style.width = `${5 + Math.random() * 7}px`;
      piece.style.height = `${8 + Math.random() * 12}px`;
      el.confetti.appendChild(piece);
    }
    window.setTimeout(() => { el.confetti.innerHTML = ''; }, 5200);
  }

  // ---------------------------------------------------------------- tilt
  function onDeviceOrientation(event) {
    if (!state.tilt.enabled) return;
    state.tilt.received = true;
    const beta = Number.isFinite(event.beta) ? event.beta : 0;
    const gamma = Number.isFinite(event.gamma) ? event.gamma : 0;
    if (!state.tilt.base) state.tilt.base = { beta, gamma };
    const dx = clamp((gamma - state.tilt.base.gamma) / 22, -1, 1);
    const dy = clamp((beta - state.tilt.base.beta) / 22, -1, 1);
    state.tilt.x = Math.abs(dx) < 0.09 ? 0 : dx * 0.82;
    state.tilt.y = Math.abs(dy) < 0.09 ? 0 : dy * 0.82;
  }

  function disableTilt() {
    state.tilt.enabled = false;
    state.tilt.x = 0;
    state.tilt.y = 0;
    state.tilt.base = null;
    state.tilt.received = false;
    window.clearTimeout(state.tilt.timer);
    if (motionListenerAttached) {
      window.removeEventListener('deviceorientation', onDeviceOrientation);
      motionListenerAttached = false;
    }
    el.tiltBtn.classList.remove('is-on');
    el.tiltBtn.setAttribute('aria-pressed', 'false');
    el.tiltLabel.textContent = 'Inclinação';
  }

  async function toggleTilt() {
    if (state.tilt.enabled) {
      disableTilt();
      toast('Inclinação desativada. Use o joystick ou toque no cenário.');
      return;
    }

    try {
      if (typeof window.DeviceOrientationEvent === 'undefined') {
        throw new Error('unsupported');
      }
      if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await window.DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') throw new Error('denied');
      }
      state.tilt.enabled = true;
      state.tilt.base = null;
      state.tilt.x = 0;
      state.tilt.y = 0;
      state.tilt.received = false;
      if (!motionListenerAttached) {
        window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
        motionListenerAttached = true;
      }
      el.tiltBtn.classList.add('is-on');
      el.tiltBtn.setAttribute('aria-pressed', 'true');
      el.tiltLabel.textContent = 'Inclinação ON';
      toast('Inclinação ativada. Incline o celular para andar.');
      state.tilt.timer = window.setTimeout(() => {
        if (state.tilt.enabled && !state.tilt.received) {
          disableTilt();
          toast('Nenhum sensor de inclinação respondeu. Use o joystick ou toque no cenário.');
        }
      }, 1800);
    } catch (error) {
      toast(error?.message === 'denied'
        ? 'Permissão de movimento negada. Use o joystick ou toque no cenário.'
        : 'Sensor de inclinação indisponível neste dispositivo. Use o joystick.');
    }
  }

  // ---------------------------------------------------------------- toast
  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.toast.classList.remove('is-visible'), 3000);
  }

  // ---------------------------------------------------------------- joystick
  function moveJoystick(event) {
    const rect = el.joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const max = rect.width * 0.31;
    const length = Math.hypot(dx, dy);
    if (length > max) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }
    el.joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
    state.joy.x = dx / max;
    state.joy.y = dy / max;
    state.auto = null;
    el.body.classList.add('has-moved');
  }

  function resetJoystick() {
    state.joy.active = false;
    state.joy.pointerId = null;
    state.joy.x = 0;
    state.joy.y = 0;
    el.joystickStick.style.transform = 'translate(0px, 0px)';
  }

  // ---------------------------------------------------------------- events
  function bindEvents() {
    el.startBtn.addEventListener('click', () => {
      sfx('start');
      resetRound(true);
      showScreen('lobby');
    });

    el.soundBtn.addEventListener('click', () => {
      state.sound = !state.sound;
      el.body.classList.toggle('is-muted', !state.sound);
      el.soundBtn.setAttribute('aria-label', state.sound ? 'Desligar som' : 'Ligar som');
      if (state.sound) {
        audio();
        sfx('click');
        toast('Som ligado.');
      } else {
        toast('Som desligado.');
      }
    });

    el.hugBtn.addEventListener('click', hugPartner);
    el.chooseBtn.addEventListener('click', choosePartner);
    el.tiltBtn.addEventListener('click', toggleTilt);
    el.nextBtn.addEventListener('click', nextQuestion);
    el.replayBtn.addEventListener('click', () => {
      sfx('start');
      state.partner = null;
      resetRound(true);
      showScreen('lobby');
      toast('Nova rodada! Encontre outra dupla e tente os 3 acertos.');
    });

    el.playerList.addEventListener('click', (event) => {
      const row = event.target.closest('.player-row');
      if (!row) return;
      const person = PARTNERS.find((item) => item.id === row.dataset.id);
      if (person) goToPartner(person);
    });

    el.stage.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.joystick, button, .paired-banner, .avatar.is-player')) return;
      if (state.paired || state.hugged || state.busy) return;
      const avatar = event.target.closest('.avatar[data-id]');
      if (avatar) {
        const person = PARTNERS.find((item) => item.id === avatar.dataset.id);
        if (person) {
          goToPartner(person);
          return;
        }
      }
      const rect = el.stage.getBoundingClientRect();
      goToPoint(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
    });

    el.joystick.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.joy.active = true;
      state.joy.pointerId = event.pointerId;
      el.joystick.setPointerCapture(event.pointerId);
      moveJoystick(event);
    });
    el.joystick.addEventListener('pointermove', (event) => {
      if (!state.joy.active || event.pointerId !== state.joy.pointerId) return;
      event.preventDefault();
      moveJoystick(event);
    });
    const endJoystick = (event) => {
      if (event.pointerId !== state.joy.pointerId) return;
      resetJoystick();
    };
    el.joystick.addEventListener('pointerup', endJoystick);
    el.joystick.addEventListener('pointercancel', endJoystick);
    el.joystick.addEventListener('lostpointercapture', resetJoystick);

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (state.screen === 'lobby' && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        event.preventDefault();
        state.keys.add(key);
        state.auto = null;
      }
      if (state.screen === 'quiz') {
        const index = Number(event.key) - 1;
        const question = state.quiz[state.qIndex];
        if (question && Number.isInteger(index) && index >= 0 && index < question.options.length) {
          selectOption(question.options[index].id);
        }
        if (event.key === 'Enter' && !el.nextBtn.disabled) {
          event.preventDefault();
          nextQuestion();
        }
      }
    });
    window.addEventListener('keyup', (event) => {
      state.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      state.keys.clear();
      resetJoystick();
    });
    window.addEventListener('resize', () => {
      if (state.screen === 'lobby') updateNear();
    });
  }

  // ---------------------------------------------------------------- sparkles
  function makeSparkles() {
    const host = $('#sparkles');
    if (!host) return;
    for (let i = 0; i < 28; i += 1) {
      const spark = document.createElement('span');
      spark.className = 'spark';
      spark.style.left = `${Math.random() * 100}%`;
      spark.style.top = `${Math.random() * 100}%`;
      spark.style.animationDelay = `${Math.random() * 5}s`;
      spark.style.animationDuration = `${3.5 + Math.random() * 4}s`;
      spark.style.opacity = String(0.15 + Math.random() * 0.6);
      host.appendChild(spark);
    }
  }

  // ---------------------------------------------------------------- init
  buildLobby();
  updateAllPositions();
  updateWallet(0, false);
  makeSparkles();
  bindEvents();
  updateNear();
  requestAnimationFrame(loop);

  // Make the intro state accessible for automated visual checks.
  window.__duplaDeLuz = {
    state,
    start: () => el.startBtn.click(),
    getNear: () => state.near?.name || null
  };
})();
