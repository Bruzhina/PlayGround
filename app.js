(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  SPIRELINGS — a creature-catching deckbuilder
   *  Vanilla JS, zero dependencies, touch-first.
   * ------------------------------------------------------------------ */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const uid = (() => { let n = Math.floor(Math.random() * 1e6); return () => 'u' + (++n).toString(36); })();
  const pct = (n) => Math.round(n * 100) + '%';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const spriteIcon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const svg = (inner, cls = '', viewBox = '0 0 24 24') => `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true">${inner}</svg>`;

  const STORE = {
    settings: 'spirelings.settings.v1',
    save: 'spirelings.run.v1',
    collection: 'spirelings.collection.v1',
    stats: 'spirelings.stats.v1',
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }
  function removeKey(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ *
   *  Content
   * ------------------------------------------------------------------ */

  const SPECIES = {
    mossling: {
      id: 'mossling', name: 'Mossling', epithet: 'the dozing sprout', shape: 'moss',
      story: 'It naps in sunbeams and hums in its sleep. Old climbers say a mossling only wakes for rain and kind company.',
      passive: '+4 max HP', passiveKey: 'hp', passiveValue: 4,
      hp: 26, catchAt: 0.42, pool: 'early', accent: '#86e6a6',
      moves: [
        { name: 'Tackle', kind: 'attack', amount: 6 },
        { name: 'Vine Lash', kind: 'attack', amount: 4, times: 2 },
        { name: 'Sun Soak', kind: 'block', block: 6, heal: 2 },
      ],
    },
    emberpup: {
      id: 'emberpup', name: 'Emberpup', epithet: 'the hearth tail', shape: 'pup',
      story: 'A spark with legs. Its tail can warm a whole camp, though it has never once learned the word “stay”.',
      passive: '+1 attack damage', passiveKey: 'attack', passiveValue: 1,
      hp: 30, catchAt: 0.4, pool: 'early', accent: '#ffae63',
      moves: [
        { name: 'Ember Bite', kind: 'attack', amount: 8 },
        { name: 'Howl', kind: 'buff', strength: 2, block: 3 },
        { name: 'Cinder Snap', kind: 'attack', amount: 5, weak: 1 },
      ],
    },
    zephyr: {
      id: 'zephyr', name: 'Zephyr', epithet: 'the updraft', shape: 'bird',
      story: 'It rides the spire’s updrafts without a sound, carrying seeds and secrets between the high gardens.',
      passive: '+1 energy on your first turn', passiveKey: 'energy', passiveValue: 1,
      hp: 24, catchAt: 0.44, pool: 'early', accent: '#7bcce8',
      moves: [
        { name: 'Gust', kind: 'attack', amount: 4, times: 3 },
        { name: 'Wing Wall', kind: 'block', block: 8 },
        { name: 'Skydive', kind: 'attack', amount: 9 },
      ],
    },
    craglet: {
      id: 'craglet', name: 'Craglet', epithet: 'the small mountain', shape: 'rock',
      story: 'It counts centuries by the moss on its shoulders. Moving one is considered an act of geography.',
      passive: '+3 block at combat start', passiveKey: 'block', passiveValue: 3,
      hp: 44, catchAt: 0.34, pool: 'mid', accent: '#c8b184',
      moves: [
        { name: 'Harden', kind: 'block', block: 10 },
        { name: 'Rockfall', kind: 'attack', amount: 11 },
        { name: 'Fault Line', kind: 'attack', amount: 7, vulnerable: 2 },
      ],
    },
    glimmerwing: {
      id: 'glimmerwing', name: 'Glimmerwing', epithet: 'the little moon', shape: 'moth',
      story: 'Its wings hold a little of the moon’s light. At night, entire meadows breathe in time with its flutter.',
      passive: '+5% catch threshold', passiveKey: 'catch', passiveValue: 0.05,
      hp: 32, catchAt: 0.38, pool: 'mid', accent: '#c3a8ff',
      moves: [
        { name: 'Moon Dust', kind: 'heal', heal: 6, block: 4 },
        { name: 'Dream Powder', kind: 'attack', amount: 6, weak: 1 },
        { name: 'Flutter Cut', kind: 'attack', amount: 3, times: 3 },
      ],
    },
    thornkit: {
      id: 'thornkit', name: 'Thornkit', epithet: 'the briar purr', shape: 'cat',
      story: 'It purrs like a briar patch and bites like one too. Every thorn on its back is a gift it has not decided to give.',
      passive: '+2 max HP, thorns 1', passiveKey: 'thorn', passiveValue: 1,
      hp: 34, catchAt: 0.4, pool: 'mid', accent: '#e59d6d',
      moves: [
        { name: 'Briar Pounce', kind: 'attack', amount: 9 },
        { name: 'Bristle', kind: 'block', block: 7, strength: 1 },
        { name: 'Thorn Volley', kind: 'attack', amount: 5, times: 2 },
      ],
    },
    duskbat: {
      id: 'duskbat', name: 'Duskbat', epithet: 'the velvet echo', shape: 'bat',
      story: 'It sleeps upside down and wakes up hungry. Its echo is the only sound the upper spire makes after dark.',
      passive: 'Draw +1 card on turn one', passiveKey: 'draw', passiveValue: 1,
      hp: 30, catchAt: 0.38, pool: 'mid', accent: '#b7a2d9',
      moves: [
        { name: 'Echo Fang', kind: 'attack', amount: 5, times: 2 },
        { name: 'Night Cloak', kind: 'block', block: 9 },
        { name: 'Screech', kind: 'debuff', weak: 2, amount: 0 },
      ],
    },
    umbralstag: {
      id: 'umbralstag', name: 'Umbral Stag', epithet: 'keeper of the summit', shape: 'stag', boss: true,
      story: 'The old keeper of the summit. Its antlers hold the last blue hour of every evening. It has been waiting a long time for someone worth catching.',
      passive: 'The summit remembers you', passiveKey: 'none', passiveValue: 0,
      hp: 92, catchAt: 0.2, pool: 'boss', accent: '#a7d7ff',
      moves: [
        { name: 'Antler Charge', kind: 'attack', amount: 13 },
        { name: 'Shadow Rush', kind: 'attack', amount: 7, times: 2 },
        { name: 'Blue Hour', kind: 'buff', strength: 2, block: 9 },
        { name: 'Nightfall', kind: 'attack', amount: 18, weak: 1 },
      ],
    },
  };

  const SPECIES_LIST = Object.values(SPECIES);
  const REGULAR_SPECIES = SPECIES_LIST.filter((s) => !s.boss);

  const CARDS = {
    tackle: { id: 'tackle', name: 'Tackle', type: 'attack', cost: 1, rarity: 'starter', art: 'sword', damage: 6, desc: 'Deal {dmg} damage.', flavor: 'A honest shove.' },
    guard: { id: 'guard', name: 'Guard', type: 'skill', cost: 1, rarity: 'starter', art: 'shield', block: 5, desc: 'Gain {block} block.', flavor: 'Hold the line.' },
    capture: { id: 'capture', name: 'Capture Orb', type: 'capture', cost: 1, rarity: 'starter', art: 'orb', captureBonus: 0.02, desc: 'Catch a wildling below its catch threshold.', flavor: 'A little world, folded shut.' },
    lure: { id: 'lure', name: 'Lure', type: 'skill', cost: 1, rarity: 'common', art: 'leaf', threshold: 0.1, draw: 1, desc: 'Raise catch threshold by {threshold}. Draw 1.', flavor: 'Come closer, little thing.' },

    quickJab: { id: 'quickJab', name: 'Quick Jab', type: 'attack', cost: 0, rarity: 'common', art: 'claw', damage: 3, draw: 1, desc: 'Deal {dmg} damage. Draw 1.', flavor: 'First.' },
    harden: { id: 'harden', name: 'Harden', type: 'skill', cost: 1, rarity: 'common', art: 'mountain', block: 9, desc: 'Gain {block} block.', flavor: 'Stone remembers.' },
    study: { id: 'study', name: 'Study', type: 'skill', cost: 1, rarity: 'common', art: 'book', draw: 2, desc: 'Draw 2 cards.', flavor: 'Know the wild.' },
    soothe: { id: 'soothe', name: 'Soothe', type: 'skill', cost: 1, rarity: 'common', art: 'moon', weak: 2, desc: 'Apply {weak} Weak.', flavor: 'A softer voice.' },
    emberFang: { id: 'emberFang', name: 'Ember Fang', type: 'attack', cost: 1, rarity: 'common', art: 'flame', damage: 8, desc: 'Deal {dmg} damage.', flavor: 'Warm at first.' },
    twinBite: { id: 'twinBite', name: 'Twin Bite', type: 'attack', cost: 1, rarity: 'common', art: 'fang', damage: 4, times: 2, desc: 'Deal {dmg} damage twice.', flavor: 'Left. Right.' },
    patch: { id: 'patch', name: 'Patch Up', type: 'skill', cost: 1, rarity: 'common', art: 'heart', heal: 4, desc: 'Heal {heal} HP.', flavor: 'Spit and a clean leaf.' },
    observe: { id: 'observe', name: 'Observe', type: 'skill', cost: 1, rarity: 'common', art: 'eye', vulnerable: 2, desc: 'Apply {vuln} Vulnerable.', flavor: 'Find the seam.' },
    greatOrb: { id: 'greatOrb', name: 'Great Orb', type: 'capture', cost: 1, rarity: 'uncommon', art: 'orb', captureBonus: 0.14, desc: 'Catch a wildling. +14% catch chance.', flavor: 'More room to breathe.' },

    flameFang: { id: 'flameFang', name: 'Flame Fang', type: 'attack', cost: 2, rarity: 'uncommon', art: 'flame', damage: 16, desc: 'Deal {dmg} damage.', flavor: 'The second bite.' },
    stoneSlam: { id: 'stoneSlam', name: 'Stone Slam', type: 'attack', cost: 2, rarity: 'uncommon', art: 'mountain', damage: 12, block: 6, desc: 'Deal {dmg} damage. Gain {block} block.', flavor: 'Mountain, meet mountain.' },
    fury: { id: 'fury', name: 'Fury Swipes', type: 'attack', cost: 1, rarity: 'uncommon', art: 'claw', damage: 3, times: 3, desc: 'Deal {dmg} damage three times.', flavor: 'Again. Again. Again.' },
    vineWhip: { id: 'vineWhip', name: 'Vine Whip', type: 'attack', cost: 1, rarity: 'uncommon', art: 'leaf', damage: 6, weak: 1, desc: 'Deal {dmg} damage. Apply {weak} Weak.', flavor: 'The garden fights back.' },
    mend: { id: 'mend', name: 'Mend', type: 'skill', cost: 2, rarity: 'uncommon', art: 'heart', heal: 9, desc: 'Heal {heal} HP.', flavor: 'A longer rest.' },
    ward: { id: 'ward', name: 'Ward', type: 'skill', cost: 1, rarity: 'uncommon', art: 'shield', block: 13, desc: 'Gain {block} block.', flavor: 'Nothing gets through.' },
    signal: { id: 'signal', name: 'Signal', type: 'skill', cost: 0, rarity: 'uncommon', art: 'wind', draw: 2, desc: 'Draw 2 cards.', flavor: 'Listen for the answer.' },
    perfectOrb: { id: 'perfectOrb', name: 'Perfect Orb', type: 'capture', cost: 2, rarity: 'rare', art: 'star', captureBonus: 0.26, desc: 'Catch a wildling. +26% catch chance.', flavor: 'The shape of a promise.' },

    meteor: { id: 'meteor', name: 'Meteor', type: 'attack', cost: 3, rarity: 'rare', art: 'spark', damage: 28, desc: 'Deal {dmg} damage.', flavor: 'Borrowed from the sky.' },
    phoenix: { id: 'phoenix', name: 'Phoenix Down', type: 'attack', cost: 2, rarity: 'rare', art: 'flame', damage: 11, heal: 5, desc: 'Deal {dmg} damage. Heal {heal} HP.', flavor: 'Rise with the smoke.' },
    swarm: { id: 'swarm', name: 'Swarm', type: 'attack', cost: 2, rarity: 'rare', art: 'claw', damage: 5, times: 4, desc: 'Deal {dmg} damage four times.', flavor: 'The whole meadow.' },
    aegis: { id: 'aegis', name: 'Aegis', type: 'skill', cost: 2, rarity: 'rare', art: 'shield', block: 18, draw: 1, desc: 'Gain {block} block. Draw 1.', flavor: 'A roof made of dawn.' },
    lureMaster: { id: 'lureMaster', name: 'Wild Call', type: 'skill', cost: 0, rarity: 'rare', art: 'spark', threshold: 0.16, draw: 1, desc: 'Raise catch threshold by {threshold}. Draw 1.', flavor: 'Every wild thing knows your name.' },
  };

  const STARTER_DECK = ['tackle', 'tackle', 'tackle', 'tackle', 'guard', 'guard', 'guard', 'capture', 'capture', 'lure'];
  const REWARD_POOL = ['quickJab', 'harden', 'study', 'soothe', 'emberFang', 'twinBite', 'patch', 'observe', 'lure', 'greatOrb', 'flameFang', 'stoneSlam', 'fury', 'vineWhip', 'mend', 'ward', 'signal', 'perfectOrb', 'meteor', 'phoenix', 'swarm', 'aegis', 'lureMaster'];

  const RELICS = {
    emberCharm: { id: 'emberCharm', name: 'Ember Charm', icon: 'flame', desc: '+1 damage on attacks.', flavor: 'A coal that never cools.' },
    mossCloak: { id: 'mossCloak', name: 'Moss Cloak', icon: 'leaf', desc: '+2 block whenever you play a Skill.', flavor: 'Soft, damp, dependable.' },
    windBell: { id: 'windBell', name: 'Wind Bell', icon: 'wind', desc: '+1 energy on your first combat turn.', flavor: 'It rings before the wind arrives.' },
    huntersLens: { id: 'huntersLens', name: "Hunter's Lens", icon: 'eye', desc: '+8% catch threshold.', flavor: 'See the tiredness in a wild thing.' },
    moonstone: { id: 'moonstone', name: 'Moonstone', icon: 'moon', desc: '+8 max HP.', flavor: 'Cool to the touch. Warm at heart.' },
    thornMail: { id: 'thornMail', name: 'Thorn Mail', icon: 'claw', desc: 'Deal 3 damage when an enemy hits you.', flavor: 'An embrace with consequences.' },
    coinPurse: { id: 'coinPurse', name: 'Coin Purse', icon: 'bag', desc: '+10 gold after each battle.', flavor: 'Someone always pays the toll.' },
    healHerb: { id: 'healHerb', name: 'Healing Herb', icon: 'heart', desc: 'Heal 3 HP after each battle.', flavor: 'Chew. Wince. Walk on.' },
    satchel: { id: 'satchel', name: 'Hunter Satchel', icon: 'orb', desc: 'Start each battle with a Capture Orb in hand.', flavor: 'Always one more pocket.' },
  };
  const RELIC_IDS = Object.keys(RELICS);

  /* ------------------------------------------------------------------ *
   *  Creature artwork — hand-built SVG, no external assets.
   * ------------------------------------------------------------------ */

  let gradSeq = 0;

  function gradLayer(p) {
    const id = 'g' + (++gradSeq).toString(36) + Math.floor(Math.random() * 999).toString(36);
    return {
      defs: `<defs>
        <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${p.light}"/><stop offset="1" stop-color="${p.main}"/>
        </linearGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${p.main}"/><stop offset="1" stop-color="${p.dark}"/>
        </linearGradient>
        <radialGradient id="${id}g" cx="50%" cy="45%" r="55%">
          <stop offset="0" stop-color="${p.accent}" stop-opacity=".38"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>`,
      body: `url(#${id}b)`, shade: `url(#${id}s)`, glow: `url(#${id}g)`,
    };
  }

  const PALETTES = {
    mossling: { main: '#69c786', light: '#a8edb5', dark: '#2f8156', accent: '#d8ffb0', eye: '#0c1d12', cheek: '#f49fa2' },
    emberpup: { main: '#e88443', light: '#ffc071', dark: '#a84525', accent: '#ffd36e', eye: '#2a1008', cheek: '#f6a28a' },
    zephyr: { main: '#62b8d6', light: '#a9e6f4', dark: '#2d6c91', accent: '#d8f8ff', eye: '#0a1c2a', cheek: '#f4a9b8' },
    craglet: { main: '#9b8664', light: '#d3bd93', dark: '#5d4e3c', accent: '#ffe8a3', eye: '#201a11', cheek: '#b98f75' },
    glimmerwing: { main: '#9a7bd1', light: '#d5bdf7', dark: '#5c3d8f', accent: '#ede0ff', eye: '#170f2b', cheek: '#f09ec0' },
    thornkit: { main: '#c47a55', light: '#f0b383', dark: '#75412e', accent: '#ffd9a3', eye: '#241009', cheek: '#ee9d99' },
    duskbat: { main: '#766590', light: '#ada0c9', dark: '#443556', accent: '#d9c8ff', eye: '#170c22', cheek: '#c589a7' },
    umbralstag: { main: '#334866', light: '#6f8eb4', dark: '#172438', accent: '#a7d7ff', eye: '#d8f4ff', cheek: '#6b8aa8' },
  };

  function eyes(cx1, cx2, cy, r = 9, p = PALETTES.mossling) {
    return `
      <ellipse cx="${cx1}" cy="${cy}" rx="${r}" ry="${r * 1.12}" fill="#f7f3e8"/>
      <ellipse cx="${cx2}" cy="${cy}" rx="${r}" ry="${r * 1.12}" fill="#f7f3e8"/>
      <circle cx="${cx1 + 1}" cy="${cy + 1}" r="${r * .58}" fill="${p.eye}"/>
      <circle cx="${cx2 + 1}" cy="${cy + 1}" r="${r * .58}" fill="${p.eye}"/>
      <circle cx="${cx1 - 1}" cy="${cy - 2}" r="${r * .22}" fill="#fff" opacity=".92"/>
      <circle cx="${cx2 - 1}" cy="${cy - 2}" r="${r * .22}" fill="#fff" opacity=".92"/>`;
  }

  function cheeks(x1, x2, y, c) {
    return `<ellipse cx="${x1}" cy="${y}" rx="8" ry="4.5" fill="${c}" opacity=".5"/><ellipse cx="${x2}" cy="${y}" rx="8" ry="4.5" fill="${c}" opacity=".5"/>`;
  }

  function creatureSVG(species, opts = {}) {
    const p = PALETTES[species.id] || PALETTES.mossling;
    const g = gradLayer(p);
    const id = species.id;
    const extra = opts.className ? ` class="${opts.className}"` : '';
    let art = '';

    if (id === 'mossling') {
      art = `
        <ellipse cx="100" cy="174" rx="43" ry="10" fill="#000" opacity=".22"/>
        <ellipse cx="68" cy="159" rx="14" ry="9" fill="${p.dark}"/><ellipse cx="132" cy="159" rx="14" ry="9" fill="${p.dark}"/>
        <path d="M100 31c-4-12 2-20 13-23-1 11-4 17-10 20 7-3 14-1 18 5-9 4-16 3-21-2z" fill="${p.dark}"/>
        <path d="M100 42c30 0 50 24 50 58 0 36-22 58-50 58s-50-22-50-58c0-34 20-58 50-58z" fill="${g.body}"/>
        <path d="M100 57c23 0 39 19 39 45 0 30-17 47-39 47s-39-17-39-47c0-26 16-45 39-45z" fill="${p.light}" opacity=".27"/>
        <ellipse cx="100" cy="137" rx="27" ry="22" fill="${p.light}" opacity=".42"/>
        <path d="M56 101c-12-3-19 4-18 13 8 2 15-2 19-7M144 101c12-3 19 4 18 13-8 2-15-2-19-7" fill="${p.dark}" opacity=".7"/>
        ${eyes(83, 117, 112, 10, p)}
        ${cheeks(65, 135, 131, p.cheek)}
        <path d="M95 127c2 4 8 4 10 0" stroke="${p.eye}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <path d="M100 63l-7 12h14z" fill="${p.accent}" opacity=".65"/>
        <circle cx="150" cy="58" r="4" fill="${p.accent}" opacity=".6"/>
        <circle cx="47" cy="78" r="3" fill="${p.accent}" opacity=".5"/>`;
    } else if (id === 'emberpup') {
      art = `
        <ellipse cx="100" cy="174" rx="42" ry="10" fill="#000" opacity=".22"/>
        <path d="M141 117c16-5 25-19 20-34 14 7 19 27 7 40-8 9-20 10-27 4z" fill="${p.accent}" opacity=".92"/>
        <path d="M139 118c9-4 14-13 12-22 7 5 8 16 1 23-4 5-10 5-13 2z" fill="${p.light}"/>
        <path d="M57 79l-9-35 34 17zM143 79l9-35-34 17z" fill="${p.dark}"/>
        <path d="M61 75l-4-19 19 10zM139 75l4-19-19 10z" fill="${p.cheek}" opacity=".75"/>
        <path d="M100 47c32 0 54 22 54 54 0 33-23 61-54 61s-54-28-54-61c0-32 22-54 54-54z" fill="${g.body}"/>
        <path d="M100 62c22 0 38 18 38 40 0 26-16 45-38 45s-38-19-38-45c0-22 16-40 38-40z" fill="${p.light}" opacity=".24"/>
        <path d="M78 120c8 17 36 17 44 0 2 12-6 21-22 21s-24-9-22-21z" fill="${p.light}" opacity=".65"/>
        ${eyes(84, 116, 102, 9, p)}
        ${cheeks(64, 136, 124, p.cheek)}
        <path d="M94 125h12l-6 7z" fill="${p.eye}"/>
        <path d="M100 132v5m0 0c-4 0-7-2-7-2m7 2c4 0 7-2 7-2" stroke="${p.eye}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M72 154c-12 0-18 7-16 14 8 3 15-1 19-7M128 154c12 0 18 7 16 14-8 3-15-1-19-7" fill="${p.dark}" opacity=".65"/>
        <circle cx="155" cy="112" r="3.5" fill="${p.accent}" opacity=".8"/>`;
    } else if (id === 'zephyr') {
      art = `
        <ellipse cx="100" cy="175" rx="36" ry="8" fill="#000" opacity=".2"/>
        <path d="M100 130c-9 0-16 10-18 30h36c-2-20-9-30-18-30z" fill="${p.dark}" opacity=".8"/>
        <path d="M52 106c-18-15-30-16-32-7 8 3 12 10 15 20 4 13 13 19 23 13 7-4 5-15-6-26z" fill="${p.dark}"/>
        <path d="M148 106c18-15 30-16 32-7-8 3-12 10-15 20-4 13-13 19-23 13-7-4-5-15 6-26z" fill="${p.dark}"/>
        <path d="M100 42c23 0 37 21 37 49 0 36-17 72-37 84-20-12-37-48-37-84 0-28 14-49 37-49z" fill="${g.body}"/>
        <path d="M100 54c15 0 25 15 25 36 0 29-11 58-25 69-14-11-25-40-25-69 0-21 10-36 25-36z" fill="${p.light}" opacity=".28"/>
        <path d="M100 73c8 0 13 7 15 16 2 11-4 21-15 30-11-9-17-19-15-30 2-9 7-16 15-16z" fill="${p.light}" opacity=".45"/>
        ${eyes(87, 113, 98, 8, p)}
        <path d="M93 113h14l-7 10z" fill="#f0b553"/>
        <path d="M100 123l-7 10c5 2 9 2 14 0z" fill="#d88f3d" opacity=".75"/>
        <path d="M68 86c-8-2-15 2-18 8 7 3 14 1 19-3M132 86c8-2 15 2 18 8-7 3-14 1-19-3" fill="${p.light}" opacity=".6"/>
        <path d="M78 60c-3-12 1-20 8-25 1 10 0 17-4 23M122 60c3-12-1-20-8-25-1 10 0 17 4 23" fill="${p.dark}" opacity=".7"/>
        <circle cx="52" cy="55" r="3" fill="${p.accent}" opacity=".7"/><circle cx="146" cy="42" r="2.5" fill="${p.accent}" opacity=".6"/>`;
    } else if (id === 'craglet') {
      art = `
        <ellipse cx="100" cy="176" rx="47" ry="9" fill="#000" opacity=".22"/>
        <path d="M66 111l14-39 32-16 28 21 8 44-18 44H77z" fill="${g.body}"/>
        <path d="M80 72l18-16 12 18-11 25-20-3z" fill="${p.light}" opacity=".55"/>
        <path d="M126 56l14 21-9 31-17-9 1-29z" fill="${p.dark}" opacity=".45"/>
        <path d="M55 123l-12-4-8 23 17 9 12-12zM145 123l12-4 8 23-17 9-12-12z" fill="${p.dark}"/>
        <path d="M87 154c2 11 8 17 13 17s11-6 13-17l-13-6z" fill="${p.dark}" opacity=".6"/>
        <path d="M100 25l10 28-10 20-10-20z" fill="${p.accent}" opacity=".92"/>
        <path d="M100 33l5 20-5 12-5-12z" fill="#fff" opacity=".45"/>
        ${eyes(84, 116, 105, 8, p)}
        <path d="M92 123c5-4 11-4 16 0" stroke="${p.eye}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M83 90l17-8 9 9-15 10z" fill="${p.light}" opacity=".4"/>
        <path d="M68 144l14 6M132 144l-14 6" stroke="${p.dark}" stroke-width="3" stroke-linecap="round" opacity=".7"/>
        <circle cx="50" cy="93" r="3" fill="${p.accent}" opacity=".5"/><circle cx="153" cy="80" r="2.5" fill="${p.accent}" opacity=".4"/>`;
    } else if (id === 'glimmerwing') {
      art = `
        <circle cx="100" cy="104" r="68" fill="${g.glow}"/>
        <ellipse cx="100" cy="173" rx="31" ry="7" fill="#000" opacity=".18"/>
        <path d="M97 88C75 51 40 44 29 61c-11 17 7 47 55 50z" fill="${p.main}" opacity=".55"/>
        <path d="M103 88c22-37 57-44 68-27 11 17-7 47-55 50z" fill="${p.main}" opacity=".55"/>
        <path d="M96 113C79 138 55 148 46 138c-8-10 4-30 43-39z" fill="${p.light}" opacity=".42"/>
        <path d="M104 113c17 25 41 35 50 25 8-10-4-30-43-39z" fill="${p.light}" opacity=".42"/>
        <path d="M100 58c17 0 27 16 29 40 3 30-9 59-29 73-20-14-32-43-29-73 2-24 12-40 29-40z" fill="${g.body}"/>
        <path d="M100 70c10 0 16 12 18 29 2 23-6 45-18 55-12-10-20-32-18-55 2-17 8-29 18-29z" fill="${p.light}" opacity=".32"/>
        <path d="M84 55c-8-18-20-27-29-26 2 13 9 22 18 27M116 55c8-18 20-27 29-26-2 13-9 22-18 27" fill="none" stroke="${p.dark}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="55" cy="29" r="4" fill="${p.accent}"/><circle cx="145" cy="29" r="4" fill="${p.accent}"/>
        ${eyes(87, 113, 99, 8.5, p)}
        <path d="M96 117c3 3 5 3 8 0" stroke="${p.eye}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M100 80l5 10-5 9-5-9z" fill="${p.accent}" opacity=".7"/>
        <circle cx="46" cy="87" r="3" fill="${p.accent}" opacity=".65"/><circle cx="158" cy="100" r="2.5" fill="${p.accent}" opacity=".5"/>
        <circle cx="68" cy="146" r="2" fill="${p.accent}" opacity=".7"/><circle cx="136" cy="156" r="2.5" fill="${p.accent}" opacity=".6"/>`;
    } else if (id === 'thornkit') {
      art = `
        <ellipse cx="100" cy="175" rx="41" ry="9" fill="#000" opacity=".22"/>
        <path d="M139 140c19-2 29-14 26-30 11 15 6 36-11 42-10 4-19 0-15-12z" fill="${p.dark}"/>
        <path d="M57 82l-8-34 31 16zM143 82l8-34-31 16z" fill="${p.dark}"/>
        <path d="M61 78l-4-18 17 9zM139 78l4-18-17 9z" fill="${p.cheek}" opacity=".8"/>
        <path d="M79 52l6-14 8 11zM101 49l7-15 6 16zM121 55l10-11 2 16z" fill="${p.dark}"/>
        <path d="M100 47c30 0 50 22 50 53 0 34-22 62-50 62s-50-28-50-62c0-31 20-53 50-53z" fill="${g.body}"/>
        <path d="M100 63c20 0 35 17 35 38 0 25-15 44-35 44s-35-19-35-44c0-21 15-38 35-38z" fill="${p.light}" opacity=".22"/>
        <path d="M77 117c7 20 39 20 46 0 2 14-7 24-23 24s-25-10-23-24z" fill="${p.light}" opacity=".55"/>
        ${eyes(84, 116, 100, 9, p)}
        ${cheeks(64, 136, 121, p.cheek)}
        <path d="M94 121h12l-6 7z" fill="${p.eye}"/>
        <path d="M100 128v4m0 0c-4 0-7-2-7-2m7 2c4 0 7-2 7-2" stroke="${p.eye}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M64 151c-10 1-15 7-14 13 7 2 13-1 17-6M136 151c10 1 15 7 14 13-7 2-13-1-17-6" fill="${p.dark}" opacity=".6"/>
        <path d="M75 88l-7-13M103 82l-2-15M129 89l8-13" stroke="${p.accent}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>`;
    } else if (id === 'duskbat') {
      art = `
        <ellipse cx="100" cy="174" rx="38" ry="8" fill="#000" opacity=".2"/>
        <path d="M100 74C75 43 37 39 22 57c-11 14 3 39 30 58 14 10 33 17 48 20z" fill="${p.dark}"/>
        <path d="M100 74c25-31 63-35 78-17 11 14-3 39-30 58-14 10-33 17-48 20z" fill="${p.dark}"/>
        <path d="M94 83C75 65 53 63 45 72c-6 7 3 22 22 34 8 5 19 10 27 13z" fill="${p.main}" opacity=".55"/>
        <path d="M106 83c19-18 41-20 49-11 6 7-3 22-22 34-8 5-19 10-27 13z" fill="${p.main}" opacity=".55"/>
        <path d="M100 47c17 0 27 13 28 37 2 31-8 63-28 82-20-19-30-51-28-82 1-24 11-37 28-37z" fill="${g.body}"/>
        <path d="M100 60c9 0 15 10 17 26 2 23-5 47-17 60-12-13-19-37-17-60 2-16 8-26 17-26z" fill="${p.light}" opacity=".26"/>
        <path d="M81 52l-8-27 25 15zM119 52l8-27-25 15z" fill="${p.dark}"/>
        <path d="M85 55l-4-13 12 7zM115 55l4-13-12 7z" fill="${p.cheek}" opacity=".7"/>
        ${eyes(87, 113, 94, 8, p)}
        <path d="M94 119h12l-6 7z" fill="${p.eye}"/>
        <path d="M93 117l-4 9M107 117l4 9" stroke="#f1e8d7" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="52" cy="61" r="2.5" fill="${p.accent}" opacity=".6"/><circle cx="149" cy="55" r="3" fill="${p.accent}" opacity=".7"/>
        <path d="M100 80l4 9-4 7-4-7z" fill="${p.accent}" opacity=".6"/>`;
    } else if (id === 'umbralstag') {
      art = `
        <circle cx="100" cy="100" r="84" fill="${g.glow}"/>
        <ellipse cx="100" cy="182" rx="58" ry="9" fill="#000" opacity=".3"/>
        <path d="M74 95l-29-18-20-1 12-12-20-8 20-9-13-14 24 1 14-15 8 24-15 13 22 10z" fill="${p.dark}" opacity=".92"/>
        <path d="M126 95l29-18 20-1-12-12 20-8-20-9 13-14-24 1-14-15-8 24 15 13-22 10z" fill="${p.dark}" opacity=".92"/>
        <path d="M84 89l-16-31-8-2M116 89l16-31 8-2M72 77l-20-2M128 77l20-2M88 62l-12-9M112 62l12-9" stroke="${p.accent}" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>
        <path d="M100 55c27 0 44 18 48 44 4 30-10 67-48 85-38-18-52-55-48-85 4-26 21-44 48-44z" fill="${g.body}"/>
        <path d="M100 71c18 0 30 14 33 32 3 22-7 47-33 62-26-15-36-40-33-62 3-18 15-32 33-32z" fill="${p.light}" opacity=".18"/>
        <path d="M100 32c10 0 18 8 18 18 0 7-3 12-7 17l-11 9-11-9c-4-5-7-10-7-17 0-10 8-18 18-18z" fill="${p.dark}"/>
        <path d="M100 38c7 0 12 6 12 13 0 5-2 9-5 12l-7 6-7-6c-3-3-5-7-5-12 0-7 5-13 12-13z" fill="${p.main}"/>
        <path d="M82 56c-9-7-19-7-23-2 6 2 10 6 14 12M118 56c9-7 19-7 23-2-6 2-10 6-14 12" fill="${p.accent}" opacity=".45"/>
        <path d="M86 88c4-4 9-4 12 0M102 88c4-4 9-4 12 0" stroke="${p.accent}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M96 102l4-5 4 5-4 5z" fill="${p.accent}"/>
        <path d="M99 118v8m0 0c-4 0-7-2-7-2m7 2c4 0 7-2 7-2" stroke="${p.accent}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".75"/>
        <path d="M58 132c-9 6-12 15-9 23 8 1 14-4 18-11M142 132c9 6 12 15 9 23-8 1-14-4-18-11" fill="${p.dark}" opacity=".7"/>
        <path d="M78 158l-10 19M122 158l10 19" stroke="${p.dark}" stroke-width="7" stroke-linecap="round"/>
        <path d="M68 177h-9M132 177h9" stroke="${p.dark}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="35" cy="52" r="3" fill="${p.accent}"/><circle cx="166" cy="72" r="2.5" fill="${p.accent}"/><circle cx="158" cy="31" r="2" fill="${p.accent}" opacity=".7"/><circle cx="47" cy="120" r="2" fill="${p.accent}" opacity=".6"/>`;
    }

    return `<svg viewBox="0 0 200 200"${extra} role="img" aria-label="${esc(species.name)}">${g.defs}${art}</svg>`;
  }

  function trainerSVG() {
    return `<svg viewBox="0 0 100 140" role="img" aria-label="The climber">
      <defs><linearGradient id="trainerCloak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#397a5b"/><stop offset="1" stop-color="#16382a"/></linearGradient></defs>
      <ellipse cx="50" cy="132" rx="28" ry="6" fill="#000" opacity=".24"/>
      <path d="M50 40c-14 0-23 10-24 25-1 10 3 18 3 28l-11 31h64L71 93c0-10 4-18 3-28-1-15-10-25-24-25z" fill="url(#trainerCloak)"/>
      <path d="M50 16c-12 0-20 9-20 21 0 11 8 20 20 20s20-9 20-20c0-12-8-21-20-21z" fill="#c79567"/>
      <path d="M31 31c1-13 9-21 19-21 11 0 18 8 19 21-6-6-12-9-19-9s-13 3-19 9z" fill="#1d3b2d"/>
      <path d="M41 24c5-3 13-3 18 0" stroke="#2c5b45" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="42" cy="40" r="2.2" fill="#1a2119"/><circle cx="58" cy="40" r="2.2" fill="#1a2119"/>
      <path d="M45 48c3 2 7 2 10 0" stroke="#6b3e2d" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M30 95c-8 7-9 20-7 33l9 3 6-24z" fill="#2c6047"/>
      <path d="M70 95c8 7 9 20 7 33l-9 3-6-24z" fill="#2c6047"/>
      <path d="M50 63l-12 14 12 20 12-20z" fill="#e6b55b" opacity=".9"/>
      <circle cx="50" cy="79" r="5" fill="#ffe3a0"/>
      <path d="M50 84l-3 12h6z" fill="#1c3d2c"/>
      <path d="M34 126h32v7H34z" fill="#0f2b1e"/>
    </svg>`;
  }

  function campfireSVG() {
    return `<svg viewBox="0 0 140 130">
      <ellipse cx="70" cy="116" rx="45" ry="8" fill="#000" opacity=".26"/>
      <path d="M42 104l55-16M45 110l55-16M47 96l44 20M50 90l40 27" stroke="#6a4b31" stroke-width="7" stroke-linecap="round"/>
      <path class="flame" d="M70 24c5 16 20 21 16 43-2 12-8 18-16 22-8-4-14-10-16-22-4-22 11-27 16-43z" fill="#e9a23e"/>
      <path class="flame" d="M70 46c3 10 11 13 8 27-1 8-4 11-8 14-4-3-7-6-8-14-3-14 5-17 8-27z" fill="#ffe3a0"/>
      <circle cx="50" cy="116" r="3" fill="#ffca72" opacity=".7"/><circle cx="91" cy="111" r="2.4" fill="#ffca72" opacity=".6"/><circle cx="62" cy="36" r="2" fill="#ffe3a0" opacity=".8"/>
    </svg>`;
  }

  function orbSVG() {
    return `<svg viewBox="0 0 80 80"><defs><radialGradient id="orbg" cx="38%" cy="32%" r="68%"><stop offset="0" stop-color="#fff4c6"/><stop offset=".48" stop-color="#f2c15a"/><stop offset="1" stop-color="#93591f"/></radialGradient></defs><circle cx="40" cy="40" r="28" fill="url(#orbg)" stroke="#5e3c14" stroke-width="3"/><path d="M12 40h56M40 12c8 8 12 17 12 28S48 60 40 68c-8-8-12-17-12-28s4-20 12-28z" fill="none" stroke="#6d4418" stroke-width="2.4" opacity=".8"/><circle cx="31" cy="30" r="7" fill="#fff" opacity=".55"/><circle cx="40" cy="40" r="9" fill="#ffe9a8" opacity=".3"/></svg>`;
  }

  /* ------------------------------------------------------------------ *
   *  Runtime state
   * ------------------------------------------------------------------ */

  const app = $('#app');
  const modalRoot = $('#modal-root');
  const toastEl = $('#toast');

  const defaultSettings = { sound: true, tilt: false, haptics: true };
  const G = {
    screen: 'title',
    run: null,
    battle: null,
    settings: Object.assign({}, defaultSettings, loadJSON(STORE.settings, {})),
    collection: loadJSON(STORE.collection, []),
    stats: Object.assign({ bestFloor: 0, runs: 0, catches: 0, wins: 0 }, loadJSON(STORE.stats, {})),
    ui: { rewardChoices: [], rewardSelected: null, shop: null, pendingRemove: null },
    modalOpen: false,
    catchGame: null,
    toastTimer: null,
    audio: null,
    motion: { enabled: false, got: false, gamma: 0, beta: 0, baseG: null, baseB: null, last: 0, attached: false },
    busy: false,
  };

  function saveSettings() { saveJSON(STORE.settings, G.settings); }
  function saveCollection() { saveJSON(STORE.collection, Array.from(new Set(G.collection))); }
  function saveStats() { saveJSON(STORE.stats, G.stats); }

  function saveRun() {
    if (!G.run) return;
    const { battle, ...clean } = G.run;
    saveJSON(STORE.save, clean);
  }
  function clearRun() { G.run = null; removeKey(STORE.save); }

  function hasSavedRun() {
    const s = loadJSON(STORE.save, null);
    return !!(s && s.map && s.deck && s.hp > 0);
  }

  function currentFloor(run = G.run) {
    if (!run || !run.currentNode) return 1;
    const node = nodeById(run.currentNode, run);
    return node ? node.row + 1 : 1;
  }

  function nodeById(id, run = G.run) {
    if (!run || !run.map) return null;
    return run.map.rows.flat().find((n) => n.id === id) || null;
  }

  function mapNeighbors(node, run = G.run) {
    if (!node || !run) return [];
    return node.links.map((id) => nodeById(id, run)).filter(Boolean);
  }

  function availableNodes(run = G.run) {
    if (!run) return [];
    const current = nodeById(run.currentNode, run);
    if (!current) return [];
    if (run.finished) return [];
    return mapNeighbors(current, run).filter((n) => !n.done);
  }

  function makeMap() {
    const typeSets = [
      ['wild', 'wild'],
      ['wild', 'shop'],
      ['rest', 'treasure'],
      ['elite', 'wild'],
      ['rest', 'shop'],
      ['wild', 'elite'],
      ['boss'],
    ];
    const colSets = [[0, 1], [1, 2], [0, 1], [1, 2], [0, 2], [0, 1], [1]];
    const rows = [];
    rows.push([{ id: 'r0', row: 0, col: 1, type: 'start', done: false, links: [] }]);
    typeSets.forEach((types, ri) => {
      const row = ri + 1;
      const cols = colSets[ri];
      const order = shuffle(types);
      rows.push(cols.map((col, i) => ({
        id: `r${row}c${col}`,
        row,
        col,
        type: order[i],
        done: false,
        links: [],
      })));
    });
    for (let r = 0; r < rows.length - 1; r++) {
      const next = rows[r + 1];
      for (const n of rows[r]) {
        const candidates = next.filter((m) => Math.abs(m.col - n.col) <= 1);
        if (!candidates.length) candidates.push(next[0]);
        n.links = candidates.map((m) => m.id);
      }
      for (const m of next) {
        if (!rows[r].some((n) => n.links.includes(m.id))) {
          const closest = rows[r].slice().sort((a, b) => Math.abs(a.col - m.col) - Math.abs(b.col - m.col))[0];
          closest.links.push(m.id);
        }
      }
    }
    return { rows, start: 'r0' };
  }

  function newRun() {
    const map = makeMap();
    G.run = {
      id: uid(),
      hp: 60,
      maxHp: 60,
      gold: 10,
      deck: STARTER_DECK.slice(),
      relics: [],
      party: [],
      map,
      currentNode: 'r0',
      caught: [],
      fainted: 0,
      battles: 0,
      finished: false,
      createdAt: Date.now(),
    };
    G.stats.runs = (G.stats.runs || 0) + 1;
    G.defeatQueued = false;
    saveStats();
    saveRun();
    showMap();
  }

  function continueRun() {
    const s = loadJSON(STORE.save, null);
    if (!s || !s.map) { toast('No run to continue.'); return; }
    G.run = s;
    G.run.party = G.run.party || [];
    G.run.relics = G.run.relics || [];
    showMap();
  }

  /* ------------------------------------------------------------------ *
   *  Simple synthesized audio + haptics
   * ------------------------------------------------------------------ */

  function audioCtx() {
    if (G.audio) return G.audio;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { G.audio = new AC(); } catch (e) { G.audio = null; }
    return G.audio;
  }
  function tone(freq, dur, type = 'sine', vol = 0.045, slide = 0, delay = 0) {
    if (!G.settings.sound) return;
    const ctx = audioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function noiseBurst(dur = 0.16, vol = 0.04) {
    if (!G.settings.sound) return;
    const ctx = audioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(gain); gain.connect(ctx.destination);
    src.start();
  }
  const SFX = {
    tap() { tone(520, 0.05, 'sine', 0.02, 80); },
    play() { tone(440, 0.1, 'triangle', 0.035, 170); },
    hit() { noiseBurst(0.15, 0.05); tone(110, 0.15, 'sawtooth', 0.035, -45); },
    block() { tone(220, 0.16, 'triangle', 0.04, 90); },
    heal() { tone(523, 0.2, 'sine', 0.035, 120); tone(659, 0.2, 'sine', 0.025, 100, 0.08); },
    catch() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.04, 20, i * 0.09)); },
    fail() { tone(220, 0.3, 'sawtooth', 0.03, -80); tone(160, 0.35, 'triangle', 0.028, -50, 0.12); },
    turn() { tone(330, 0.12, 'sine', 0.022, 40); },
    win() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.35, 'triangle', 0.035, 30, i * 0.1)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'triangle', 0.035, -20, i * 0.13)); },
    coin() { tone(880, 0.1, 'square', 0.02, 200); tone(1175, 0.12, 'square', 0.018, 100, 0.06); },
    upgrade() { [440, 554, 659].forEach((f, i) => tone(f, 0.2, 'sine', 0.03, 30, i * 0.07)); },
  };
  function buzz(pattern = 8) {
    if (!G.settings.haptics) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ *
   *  Motion / tilt
   * ------------------------------------------------------------------ */

  function onDeviceOrientation(e) {
    if (e.gamma === null || e.gamma === undefined) return;
    G.motion.gamma = e.gamma;
    G.motion.beta = e.beta || 0;
    G.motion.last = performance.now();
    G.motion.got = true;
    if (G.motion.baseG === null) G.motion.baseG = e.gamma;
    if (G.motion.baseB === null) G.motion.baseB = e.beta || 0;
  }

  function attachMotion() {
    if (G.motion.attached) return;
    window.addEventListener('deviceorientation', onDeviceOrientation, true);
    G.motion.attached = true;
  }
  function detachMotion() {
    if (!G.motion.attached) return;
    window.removeEventListener('deviceorientation', onDeviceOrientation, true);
    G.motion.attached = false;
  }

  async function enableTilt(silent = false) {
    if (!('DeviceOrientationEvent' in window)) {
      toast('This device has no motion sensor. Drag to aim instead.');
      return false;
    }
    const DOE = window.DeviceOrientationEvent;
    try {
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission();
        if (res !== 'granted') {
          toast('Motion access was not granted. You can still drag to aim.');
          G.settings.tilt = false;
          saveSettings();
          renderIfTitle();
          return false;
        }
      }
      attachMotion();
      G.motion.enabled = true;
      G.motion.baseG = null;
      G.motion.baseB = null;
      G.settings.tilt = true;
      saveSettings();
      if (!silent) {
        toast('Tilt controls on. Lean your phone to aim.');
        SFX.upgrade();
        buzz([10, 40, 10]);
      }
      renderIfTitle();
      return true;
    } catch (e) {
      toast('Motion access is unavailable here. Drag to aim instead.');
      return false;
    }
  }

  function disableTilt(silent = false) {
    G.motion.enabled = false;
    G.motion.got = false;
    detachMotion();
    G.settings.tilt = false;
    saveSettings();
    if (!silent) toast('Tilt controls off.');
    renderIfTitle();
  }

  function renderIfTitle() {
    if (G.screen === 'title') renderTitle();
    if (G.modalOpen) {
      const settingsOpen = !!$('#settings-modal');
      if (settingsOpen) openSettings(true);
    }
  }

  function tiltIsLive() {
    return G.motion.enabled && G.motion.got && performance.now() - G.motion.last < 450;
  }

  /* ------------------------------------------------------------------ *
   *  UI helpers
   * ------------------------------------------------------------------ */

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(G.toastTimer);
    G.toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function showScreen(name) {
    G.screen = name;
    app.innerHTML = '';
    app.className = 'app';
  }

  function renderIconCard(card, opts = {}) {
    const desc = cardDesc(card, opts);
    const playable = opts.playable !== undefined ? opts.playable : true;
    const unplayable = opts.unplayableReason && !playable;
    const selected = opts.selected ? ' selected' : '';
    const ready = opts.captureReady ? ' capture-ready' : '';
    const data = opts.attrs || '';
    return `<button class="card ${card.type}${playable ? ' playable' : ' unplayable'}${selected}${ready}" ${data} aria-label="${esc(card.name)}">
      ${card.cost > 9 ? '' : `<span class="cost ${opts.costShort ? 'unaffordable' : ''}">${card.cost}</span>`}
      <span class="name">${esc(card.name)}</span>
      <span class="art">${icon(card.art)}</span>
      <span class="type">${card.type === 'capture' ? 'Capture' : card.type}</span>
      <span class="desc">${desc}</span>
      <span class="rarity" style="background:${rarityColor(card.rarity)}"></span>
      ${opts.captureReady ? '<span class="badge-ready">READY</span>' : ''}
      ${unplayable ? `<span class="disabled-note">${esc(opts.unplayableReason)}</span>` : ''}
    </button>`;
  }

  function rarityColor(r) {
    return { starter: '#9e8d68', common: '#a8b7a2', uncommon: '#6fc6e4', rare: '#e8b95d' }[r] || '#9e8d68';
  }

  function cardDesc(card, opts = {}) {
    let dmg = (card.damage || 0) + (opts.battle ? battleAttackBonus() : 0);
    let block = (card.block || 0) + (opts.battle ? battleSkillBlockBonus() : 0);
    const heal = card.heal || 0;
    let out = card.desc || '';
    out = out.replace('{dmg}', `<b>${dmg}</b>`);
    out = out.replace('{block}', `<b>${block}</b>`);
    out = out.replace('{heal}', `<b>${heal}</b>`);
    out = out.replace('{weak}', `<b>${card.weak || 1}</b>`);
    out = out.replace('{vuln}', `<b>${card.vulnerable || 1}</b>`);
    out = out.replace('{threshold}', `<b>${Math.round((card.threshold || 0) * 100)}%</b>`);
    out = out.replace(/Weak/g, '<span class="kw v">Weak</span>');
    out = out.replace(/Vulnerable/g, '<span class="kw v">Vulnerable</span>');
    out = out.replace(/block/g, '<span class="kw s">block</span>');
    out = out.replace(/Catch/g, '<span class="kw">Catch</span>');
    return out;
  }

  function partyBonuses(run = G.run) {
    const out = { attack: 0, energy: 0, block: 0, catch: 0, thorns: 0, draw: 0 };
    if (!run || !run.party) return out;
    const counts = {};
    run.party.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
    Object.entries(counts).forEach(([id, count]) => {
      const sp = SPECIES[id];
      if (!sp) return;
      if (sp.passiveKey === 'attack') out.attack += 1 * count;
      if (sp.passiveKey === 'energy') out.energy += 1 * count;
      if (sp.passiveKey === 'block') out.block += 3 * count;
      if (sp.passiveKey === 'catch') out.catch += 0.05 * count;
      if (sp.passiveKey === 'thorn') out.thorns += 1 * count;
      if (sp.passiveKey === 'draw') out.draw += 1 * count;
    });
    return out;
  }

  function hasRelic(id, run = G.run) { return !!(run && run.relics && run.relics.includes(id)); }

  function battleAttackBonus() {
    return partyBonuses().attack + (hasRelic('emberCharm') ? 1 : 0);
  }
  function battleSkillBlockBonus() {
    return hasRelic('mossCloak') ? 2 : 0;
  }
  function runCatchBonus() {
    return partyBonuses().catch + (hasRelic('huntersLens') ? 0.08 : 0);
  }

  /* ------------------------------------------------------------------ *
   *  Title screen
   * ------------------------------------------------------------------ */

  function renderTitle() {
    showScreen('title');
    const caught = new Set(G.collection);
    const saved = hasSavedRun();
    const partyStrip = REGULAR_SPECIES.map((sp) => `<div class="mini ${caught.has(sp.id) ? '' : 'locked'}" title="${sp.name}">${creatureSVG(sp)}</div>`).join('');
    const crest = `
      <div class="crest">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <radialGradient id="crestGlow" cx="50%" cy="48%" r="60%"><stop offset="0" stop-color="#8cf0ac" stop-opacity=".3"/><stop offset=".6" stop-color="#437e61" stop-opacity=".12"/><stop offset="1" stop-color="#07130f" stop-opacity="0"/></radialGradient>
            <linearGradient id="spireFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ceeb2"/><stop offset=".45" stop-color="#3f8c66"/><stop offset="1" stop-color="#0c2a1d"/></linearGradient>
          </defs>
          <circle cx="100" cy="100" r="92" fill="url(#crestGlow)"/>
          <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(244,200,105,.26)" stroke-width="1"/>
          <g class="ring-outer">
            <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(151,229,169,.16)" stroke-width="1" stroke-dasharray="2 9"/>
            <circle cx="100" cy="16" r="3.4" fill="#e8c26f"/>
            <circle cx="184" cy="100" r="2.3" fill="#9ae6ae"/>
            <circle cx="100" cy="184" r="2.7" fill="#9ae6ae" opacity=".7"/>
          </g>
          <g class="ring-inner">
            <circle cx="100" cy="100" r="64" fill="none" stroke="rgba(244,200,105,.2)" stroke-width="1" stroke-dasharray="20 6"/>
            <circle cx="100" cy="36" r="2" fill="#f8e6b6"/>
          </g>
          <path d="M72 141l12-49 7-22 8 22 14 49-20-12-12 18z" fill="url(#spireFill)" opacity=".9"/>
          <path d="M84 92l7-22 8 22-8 7z" fill="#dbffcf" opacity=".65"/>
          <path d="M64 144h72" stroke="rgba(244,200,105,.4)" stroke-width="2" stroke-linecap="round"/>
          <path d="M76 155h48" stroke="rgba(244,200,105,.18)" stroke-width="1.6" stroke-linecap="round"/>
          <circle class="spark" cx="50" cy="72" r="2" fill="#f4c869"/>
          <circle class="spark" cx="151" cy="58" r="1.7" fill="#9ae6ae" style="animation-delay:-1.2s"/>
          <circle class="spark" cx="157" cy="130" r="2.2" fill="#f4c869" style="animation-delay:-2.1s"/>
          <circle class="spark" cx="42" cy="128" r="1.6" fill="#9ae6ae" style="animation-delay:-.6s"/>
        </svg>
        <div class="crest-critter one">${creatureSVG(SPECIES.mossling, { className: 'critter' })}</div>
        <div class="crest-critter two">${creatureSVG(SPECIES.emberpup, { className: 'critter two' })}</div>
      </div>`;
    app.innerHTML = `
      <section class="screen title-screen">
        <div class="title-topbar">
          <div class="left">
            <button class="top-icon-btn" data-action="open-guide" aria-label="Field guide">${icon('book')}</button>
            <button class="top-icon-btn" data-action="open-settings" aria-label="Settings">${icon('settings')}</button>
          </div>
          <button class="tilt-chip ${G.motion.enabled ? 'on' : ''}" data-action="enable-tilt" aria-label="Enable tilt controls">${icon('wind')} ${G.motion.enabled ? 'Tilt on' : 'Tilt controls'}</button>
        </div>
        <div class="title-inner">
          ${crest}
          <div class="brand">
            <h1>SPIRE<em>LINGS</em></h1>
            <p class="tagline">Catch your way to the summit.</p>
          </div>
          <div class="title-actions">
            <button class="btn btn-primary" data-action="start-run">${icon('mountain')} Begin the climb</button>
            ${saved ? `<button class="btn btn-ghost" data-action="continue-run">${icon('flag')} Continue · Floor ${savedFloorLabel()}</button>` : ''}
            <button class="btn btn-ghost" data-action="open-guide">${icon('book')} Field guide <span style="color:var(--dim);font-weight:600">${G.collection.length}/${SPECIES_LIST.length}</span></button>
          </div>
          <div class="title-meta">
            <span class="pill gold">${icon('spark')} Best floor ${G.stats.bestFloor || 0}</span>
            <span class="pill moss">${icon('paw')} ${G.stats.catches || 0} caught</span>
          </div>
          <div class="guide-strip" aria-hidden="true">${partyStrip}</div>
        </div>
        <div class="title-foot">A creature-catching deckbuilder · Tap cards · drag or tilt to aim</div>
      </section>`;
  }

  /* ------------------------------------------------------------------ *
   *  Map screen
   * ------------------------------------------------------------------ */

  const NODE_META = {
    start: { icon: 'flag', label: 'Camp' },
    wild: { icon: 'paw', label: 'Wild' },
    elite: { icon: 'skull', label: 'Elite' },
    rest: { icon: 'fire', label: 'Rest' },
    shop: { icon: 'bag', label: 'Shop' },
    treasure: { icon: 'gem', label: 'Cache' },
    boss: { icon: 'crown', label: 'Summit' },
  };

  function showMap() {
    if (!G.run) { renderTitle(); return; }
    closeModal(true);
    showScreen('map');
    renderMap();
    saveRun();
  }

  function renderMap() {
    const run = G.run;
    if (!run) return;
    if (!run.map) run.map = makeMap();
    const current = nodeById(run.currentNode);
    const available = availableNodes();
    const availIds = new Set(available.map((n) => n.id));
    const doneIds = new Set(run.map.rows.flat().filter((n) => n.done).map((n) => n.id));
    const rows = run.map.rows;
    const rowCount = rows.length;
    const yFor = (row) => 90 - row * (78 / (rowCount - 1));
    const xFor = (col) => [15, 50, 85][col] ?? 50;
    const pos = {};
    rows.flat().forEach((n) => { pos[n.id] = { x: xFor(n.col), y: yFor(n.row) }; });
    let lineHtml = '';
    rows.flat().forEach((n) => n.links.forEach((lid) => {
      const a = pos[n.id], b = pos[lid];
      if (!a || !b) return;
      const done = n.done && nodeById(lid).done;
      const active = n.id === run.currentNode && availIds.has(lid);
      lineHtml += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="map-line${done ? ' done' : ''}${active ? ' active' : ''}" />`;
    }));
    const nodeHtml = rows.flat().map((n) => {
      const meta = NODE_META[n.type] || NODE_META.wild;
      const state = n.id === run.currentNode ? 'current' : n.done ? 'done' : availIds.has(n.id) ? 'available' : 'locked';
      const canClick = availIds.has(n.id);
      return `<div class="map-node" style="left:${pos[n.id].x}%;top:${pos[n.id].y}%">
        <button class="node-btn ${state} ${n.type === 'boss' ? 'boss' : ''}" ${canClick ? `data-action="map-node" data-id="${n.id}"` : 'disabled'} aria-label="${meta.label}${canClick ? ', available' : ''}">
          ${icon(meta.icon)}
        </button>
        <span class="node-label">${n.id === run.currentNode ? 'You' : meta.label}</span>
      </div>`;
    }).join('');
    const partyHtml = run.party.length
      ? groupCounts(run.party).map(([id, count]) => `<div class="party-slot" title="${SPECIES[id] ? SPECIES[id].name : id}">${creatureSVG(SPECIES[id] || SPECIES.mossling)}${count > 1 ? `<span class="count">${count}</span>` : ''}</div>`).join('')
      : '<span class="party-empty">No companions yet · catch a weakened wildling</span>';
    const hpPct = clamp(run.hp / run.maxHp, 0, 1);
    app.innerHTML = `
      <section class="screen map-screen">
        <header class="map-top">
          <div class="map-brand">
            <span class="name">SPIRELINGS</span>
            <span class="sub">${run.finished ? 'Summit reached' : `Floor ${currentFloor()} of ${rowCount}`}</span>
          </div>
          <div class="run-stats">
            <span class="run-stat hp" title="Health">${icon('heart')} ${run.hp}/${run.maxHp}</span>
            <span class="run-stat gold" title="Gold">${icon('bag')} ${run.gold}</span>
          </div>
          <div class="map-toolbar">
            <button class="top-icon-btn" data-action="view-deck" aria-label="View deck">${icon('deck')}</button>
            <button class="top-icon-btn" data-action="open-party" aria-label="View pack">${icon('paw')}</button>
            <button class="top-icon-btn" data-action="open-settings" aria-label="Settings">${icon('settings')}</button>
          </div>
        </header>
        <div class="map-middle">
          <div class="map-scroll">
            <div class="map-canvas">
              <svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lineHtml}</svg>
              ${nodeHtml}
            </div>
          </div>
        </div>
        <div class="map-legend">
          <span class="legend-item">${icon('paw')} Wild</span>
          <span class="legend-item">${icon('skull')} Elite</span>
          <span class="legend-item">${icon('fire')} Rest</span>
          <span class="legend-item">${icon('bag')} Shop</span>
          <span class="legend-item">${icon('gem')} Cache</span>
          <span class="legend-item">${icon('crown')} Summit</span>
          <span class="legend-item">${icon('heart')} ${Math.round(hpPct * 100)}% HP</span>
        </div>
        <div class="party-rail">${partyHtml}</div>
      </section>`;
  }

  function groupCounts(arr) {
    const m = new Map();
    arr.forEach((x) => m.set(x, (m.get(x) || 0) + 1));
    return Array.from(m.entries());
  }

  /* ------------------------------------------------------------------ *
   *  Battles
   * ------------------------------------------------------------------ */

  function scaleForFloor(floor, nodeType) {
    const hp = 1 + (floor - 1) * 0.1 + (nodeType === 'elite' ? 0.24 : 0);
    const dmg = 1 + (floor - 1) * 0.055 + (nodeType === 'elite' ? 0.06 : 0);
    return { hp, dmg };
  }

  function chooseWildSpecies(floor, nodeType) {
    if (nodeType === 'boss') return SPECIES.umbralstag;
    const pools = [];
    if (floor <= 2) pools.push(...REGULAR_SPECIES.filter((s) => s.pool === 'early'));
    else if (floor <= 5) pools.push(...REGULAR_SPECIES);
    else pools.push(...REGULAR_SPECIES.filter((s) => s.pool !== 'early' || Math.random() < 0.35));
    if (nodeType === 'elite') {
      return pick(REGULAR_SPECIES.filter((s) => s.pool === 'mid'));
    }
    return pick(pools.length ? pools : REGULAR_SPECIES);
  }

  function makeEnemy(node) {
    const floor = node.row + 1;
    const species = chooseWildSpecies(floor, node.type);
    const scale = scaleForFloor(floor, node.type);
    const maxHp = Math.round(species.hp * scale.hp * (species.boss ? 1 : 1) * rand(0.94, 1.06));
    const attackScale = scale.dmg;
    const enemy = {
      speciesId: species.id,
      name: species.name,
      isBoss: !!species.boss,
      isElite: node.type === 'elite',
      hp: maxHp,
      maxHp,
      block: 0,
      weak: 0,
      vulnerable: 0,
      strength: floor >= 5 ? 1 : 0,
      catchAt: species.catchAt,
      attackScale,
      moveIndex: 0,
      lastMove: '',
      intent: null,
      enraged: false,
    };
    enemy.intent = chooseIntent(enemy);
    return enemy;
  }

  function scaledAmount(enemy, value, floor) {
    return Math.max(1, Math.round(value * enemy.attackScale + (floor > 5 ? 1 : 0)));
  }

  function chooseIntent(enemy) {
    const sp = SPECIES[enemy.speciesId];
    let move;
    if (sp.boss) {
      move = sp.moves[enemy.moveIndex % sp.moves.length];
      enemy.moveIndex++;
    } else {
      const options = sp.moves.filter((m) => m.name !== enemy.lastMove || Math.random() < 0.28);
      move = pick(options.length ? options : sp.moves);
    }
    enemy.lastMove = move.name;
    const intent = { name: move.name, kind: move.kind, amount: 0, times: move.times || 1, block: 0, heal: 0, strength: 0, weak: 0, vulnerable: 0 };
    if (move.amount) intent.amount = Math.max(0, Math.round(move.amount * enemy.attackScale));
    if (move.block) intent.block = Math.round(move.block * (1 + (enemy.isElite ? 0.18 : 0)));
    if (move.heal) intent.heal = Math.round(move.heal * 1.1);
    if (move.strength) intent.strength = move.strength + (enemy.isElite ? 1 : 0);
    if (move.weak) intent.weak = move.weak;
    if (move.vulnerable) intent.vulnerable = move.vulnerable;
    return intent;
  }

  function startBattle(node) {
    closeModal(true);
    const enemy = makeEnemy(node);
    const deck = G.run.deck.map((id) => ({ uid: uid(), id }));
    G.battle = {
      nodeId: node.id,
      enemy,
      draw: shuffle(deck),
      hand: [],
      discard: [],
      exhaust: [],
      energy: 0,
      maxEnergy: 3,
      block: 0,
      weak: 0,
      turn: 1,
      firstTurn: true,
      lock: true,
      over: false,
      rewarded: false,
      lureBonus: 0,
      energyBonus: 0,
      dealtUids: new Set(),
    };
    G.run.battles = (G.run.battles || 0) + 1;
    showScreen('battle');
    renderBattle();
    SFX.turn();
    setTimeout(() => startPlayerTurn(true), 380);
  }

  function renderBattle() {
    const b = G.battle;
    if (!b) return;
    const sp = SPECIES[b.enemy.speciesId];
    const node = nodeById(b.nodeId);
    const floor = node ? node.row + 1 : currentFloor();
    const kindLabel = b.enemy.isBoss ? 'Summit' : b.enemy.isElite ? 'Elite' : 'Wild';
    const relicHtml = G.run.relics.length
      ? `<div class="relic-rail">${G.run.relics.map((id) => `<div class="relic-chip" title="${esc(RELICS[id].name)} · ${esc(RELICS[id].desc)}">${icon(RELICS[id].icon)}</div>`).join('')}</div>`
      : '';
    app.innerHTML = `
      <section class="screen battle-screen" id="battle-screen">
        <header class="battle-top">
          <div class="trainer-block">
            <div class="trainer-avatar">${trainerSVG()}</div>
            <div class="hp-wrap">
              <div class="hp-label"><span>Climber</span><b id="player-hp-text">${G.run.hp}/${G.run.maxHp}</b></div>
              <div class="hp-track"><div class="hp-fill ${G.run.hp / G.run.maxHp < 0.32 ? 'low' : ''}" id="player-hp-fill" style="width:${clamp(G.run.hp / G.run.maxHp, 0, 1) * 100}%"></div></div>
            </div>
          </div>
          <div class="battle-mid">
            <span class="floor-label">${kindLabel} · Floor ${floor}</span>
            <span class="turn-label" id="turn-label">Turn ${b.turn}</span>
          </div>
          <div class="energy-wrap">
            <div class="energy-pips" id="energy-pips"></div>
            <span class="energy-num" id="energy-num">0/3</span>
          </div>
          <div class="battle-tools">
            <button class="top-icon-btn" data-action="view-draw" aria-label="Draw pile">${icon('deck')}</button>
            <button class="top-icon-btn" data-action="open-settings" aria-label="Settings">${icon('settings')}</button>
          </div>
        </header>
        <div class="arena" id="arena">
          <div class="arena-floor"></div>
          <div class="arena-arch"></div>
          ${relicHtml}
          <div class="enemy-wrap">
            <div class="intent-row" id="intent-row"></div>
            <div class="enemy-stage">
              <div class="enemy-sprite" id="enemy-sprite">${creatureSVG(sp)}</div>
              <div class="enemy-block hidden" id="enemy-block">${icon('shield')}<span>0</span></div>
            </div>
            <div class="enemy-shadow"></div>
            <div class="enemy-info">
              <div class="enemy-name-row"><span class="enemy-name">${sp.name}</span><span class="catch-pill" id="catch-pill">${icon('orb')} <span>—</span></span></div>
              <div class="enemy-hp-track"><div class="enemy-hp-fill" id="enemy-hp-fill" style="width:100%"></div></div>
              <div class="enemy-hp-text" id="enemy-hp-text">${b.enemy.hp}/${b.enemy.maxHp} HP</div>
              <div class="status-row" id="enemy-status"></div>
            </div>
          </div>
          <div class="player-corner">
            <div class="hero-sprite"><div class="hero-svg">${trainerSVG()}</div></div>
            <div class="block-badge hidden" id="player-block">${icon('shield')}<span>0</span></div>
          </div>
          <div class="fx-layer" id="fx-layer"></div>
          <div class="turn-banner" id="turn-banner"></div>
        </div>
        <footer class="battle-bottom">
          <div class="hand-row">
            <div class="hand" id="hand"></div>
          </div>
          <div class="end-row">
            <button class="pile-chip" data-action="view-draw" aria-label="Draw pile">${icon('deck')} <span id="draw-count">0</span></button>
            <span class="turn-hint" id="turn-hint">Tap a card to play</span>
            <button class="end-turn" id="end-turn" data-action="end-turn">End turn ${icon('chevron')}</button>
            <button class="pile-chip" data-action="view-discard" aria-label="Discard pile">${icon('orb')} <span id="discard-count">0</span></button>
          </div>
        </footer>
      </section>`;
    updateBattleUI();
    renderHand(true);
  }

  function enemyCatchThreshold() {
    if (!G.battle) return 0;
    return clamp(G.battle.enemy.catchAt + G.battle.lureBonus + runCatchBonus(), 0.12, 0.85);
  }
  function enemyIsCatchable() {
    const e = G.battle && G.battle.enemy;
    return !!e && e.hp > 0 && e.hp / e.maxHp <= enemyCatchThreshold();
  }

  function updateBattleUI() {
    const b = G.battle;
    if (!b) return;
    const run = G.run;
    const playerPct = clamp(run.hp / run.maxHp, 0, 1);
    const hpFill = $('#player-hp-fill');
    if (hpFill) { hpFill.style.width = (playerPct * 100) + '%'; hpFill.classList.toggle('low', playerPct < 0.32); }
    const hpText = $('#player-hp-text');
    if (hpText) hpText.textContent = `${Math.max(0, run.hp)}/${run.maxHp}`;
    const enemy = b.enemy;
    const enemyPct = clamp(enemy.hp / enemy.maxHp, 0, 1);
    const ef = $('#enemy-hp-fill');
    if (ef) { ef.style.width = (enemyPct * 100) + '%'; ef.classList.toggle('low', enemyIsCatchable()); }
    const eh = $('#enemy-hp-text');
    if (eh) eh.textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} HP`;
    const turnLabel = $('#turn-label');
    if (turnLabel) turnLabel.textContent = `Turn ${b.turn}`;
    const energyNum = $('#energy-num');
    if (energyNum) energyNum.textContent = `${b.energy}/3`;
    const pips = $('#energy-pips');
    if (pips) {
      const count = Math.max(b.maxEnergy, Math.min(6, b.energy));
      pips.innerHTML = Array.from({ length: count }, (_, i) => `<span class="energy-pip ${i < b.energy ? 'on' : ''}"></span>`).join('');
    }
    const blockBadge = $('#player-block');
    if (blockBadge) {
      blockBadge.classList.toggle('hidden', b.block <= 0);
      blockBadge.innerHTML = `${icon('shield')}<span>${b.block}</span>`;
    }
    const enemyBlock = $('#enemy-block');
    if (enemyBlock) {
      enemyBlock.classList.toggle('hidden', enemy.block <= 0);
      enemyBlock.innerHTML = `${icon('shield')}<span>${enemy.block}</span>`;
    }
    const catchPill = $('#catch-pill');
    if (catchPill) {
      const threshold = enemyCatchThreshold();
      const ready = enemyIsCatchable();
      catchPill.classList.toggle('ready', ready);
      catchPill.innerHTML = ready ? `${icon('orb')} <span>Catch ready</span>` : `${icon('orb')} <span>≤ ${Math.ceil(enemy.maxHp * threshold)} HP</span>`;
    }
    const intentRow = $('#intent-row');
    if (intentRow) intentRow.innerHTML = renderIntent(enemy);
    const status = $('#enemy-status');
    if (status) status.innerHTML = renderEnemyStatus(enemy);
    const drawCount = $('#draw-count');
    if (drawCount) drawCount.textContent = b.draw.length;
    const discardCount = $('#discard-count');
    if (discardCount) discardCount.textContent = b.discard.length;
    const sprite = $('#enemy-sprite');
    if (sprite) sprite.classList.toggle('catchable-glow', enemyIsCatchable());
    const endBtn = $('#end-turn');
    if (endBtn) endBtn.disabled = b.lock || b.over;
    const hint = $('#turn-hint');
    if (hint) hint.textContent = b.lock ? 'Resolving…' : enemyIsCatchable() ? 'Catch or finish it' : 'Tap a card to play';
    renderHand(false);
  }

  function renderIntent(enemy) {
    const it = enemy.intent;
    if (!it) return '';
    let cls = it.kind;
    let ic = 'sword';
    let num = '';
    let sub = '';
    if (it.kind === 'attack') { ic = it.times > 1 ? 'claw' : 'sword'; num = `${it.amount}${it.times > 1 ? '×' + it.times : ''}`; }
    else if (it.kind === 'block') { ic = 'shield'; num = it.block; sub = it.strength ? 'STR+' : ''; }
    else if (it.kind === 'buff') { ic = 'up'; num = '+' + (it.strength || 0); sub = 'STR'; }
    else if (it.kind === 'heal') { ic = 'heart'; num = '+' + it.heal; sub = 'HP'; }
    else if (it.kind === 'debuff') { ic = 'eye'; num = it.weak || it.vulnerable || 1; sub = 'Weak'; }
    if (it.weak && it.kind === 'attack') sub = 'Weak';
    if (it.vulnerable && it.kind === 'attack') sub = 'Vuln';
    return `<div class="intent-bubble ${cls}" title="${esc(it.name)}">${icon(ic)}<span class="num">${num}</span></div>
      <span class="intent-name">${esc(it.name)}${sub ? ` · ${sub}` : ''}</span>`;
  }

  function renderEnemyStatus(enemy) {
    let html = '';
    if (enemy.weak > 0) html += `<span class="status-chip weak">${icon('eye')} Weak ${enemy.weak}</span>`;
    if (enemy.vulnerable > 0) html += `<span class="status-chip vuln">${icon('down')} Vulnerable ${enemy.vulnerable}</span>`;
    if (enemy.strength > 0) html += `<span class="status-chip str">${icon('up')} Strength ${enemy.strength}</span>`;
    if (enemyIsCatchable()) html += `<span class="status-chip catch">${icon('orb')} Catchable</span>`;
    return html;
  }

  function renderHand(animate) {
    const b = G.battle;
    if (!b) return;
    const hand = $('#hand');
    if (!hand) return;
    hand.innerHTML = b.hand.map((inst) => {
      const card = CARDS[inst.id];
      if (!card) return '';
      const isCapture = card.type === 'capture';
      const ready = !isCapture || enemyIsCatchable();
      const affordable = card.cost <= b.energy;
      const playable = !b.lock && !b.over && affordable && ready;
      let reason = '';
      if (!ready) reason = 'Catchable only';
      else if (!affordable) reason = 'Need energy';
      const attrs = `data-action="play-card" data-uid="${inst.uid}" ${playable ? '' : 'aria-disabled="true"'}`;
      const dealt = animate && b.dealtUids.has(inst.uid) ? ' dealt' : '';
      return `<button class="card ${card.type}${playable ? ' playable' : ' unplayable'}${isCapture && ready ? ' capture-ready' : ''}${dealt}" data-action="play-card" data-uid="${inst.uid}" aria-label="${esc(card.name)}: ${esc(cardDesc(card, { battle: true }).replace(/<[^>]+>/g, ''))}" ${playable ? '' : 'aria-disabled="true"'}>
        <span class="cost ${affordable ? '' : 'unaffordable'}">${card.cost}</span>
        <span class="name">${esc(card.name)}</span>
        <span class="art">${icon(card.art)}</span>
        <span class="type">${card.type === 'capture' ? 'Capture' : card.type}</span>
        <span class="desc">${cardDesc(card, { battle: true })}</span>
        <span class="rarity" style="background:${rarityColor(card.rarity)}"></span>
        ${isCapture && ready ? '<span class="badge-ready">READY</span>' : ''}
        ${!playable && reason ? `<span class="disabled-note">${reason}</span>` : ''}
      </button>`;
    }).join('');
  }

  function drawCards(n, opts = {}) {
    const b = G.battle;
    if (!b) return;
    for (let i = 0; i < n; i++) {
      if (b.hand.length >= 8) { toast('Hand is full.'); break; }
      if (!b.draw.length) {
        if (!b.discard.length) break;
        b.draw = shuffle(b.discard);
        b.discard = [];
        if (!opts.silent) toast('Reshuffled the discard pile.');
      }
      const inst = b.draw.pop();
      if (!inst) break;
      b.hand.push(inst);
      b.dealtUids.add(inst.uid);
    }
    renderHand(true);
    const d = $('#draw-count'); if (d) d.textContent = b.draw.length;
    const dc = $('#discard-count'); if (dc) dc.textContent = b.discard.length;
  }

  function startPlayerTurn(first = false) {
    const b = G.battle;
    if (!b || b.over) return;
    b.lock = true;
    b.turn = first ? 1 : b.turn + 1;
    b.block = first ? (partyBonuses().block + (hasRelic('satchel') ? 0 : 0)) : 0;
    const baseEnergy = 3 + (first ? partyBonuses().energy + (hasRelic('windBell') ? 1 : 0) : 0);
    b.energy = baseEnergy;
    b.maxEnergy = Math.max(3, b.energy);
    const drawN = 5 + (first ? partyBonuses().draw : 0);
    drawCards(drawN, { silent: true });
    if (first && hasRelic('satchel')) {
      b.hand.push({ uid: uid(), id: 'capture', token: true });
      renderHand(true);
    }
    if (first && b.block > 0) {
      const badge = $('#player-block');
      if (badge) badge.classList.remove('hidden');
    }
    b.lock = false;
    updateBattleUI();
    renderHand(false);
    showBanner(first ? 'CATCH THE WILD' : 'YOUR TURN');
    SFX.turn();
  }

  function discardHand() {
    const b = G.battle;
    if (!b) return;
    b.discard.push(...b.hand.filter((c) => !c.token));
    b.hand = [];
    renderHand(false);
  }

  function showBanner(text) {
    const el = $('#turn-banner');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function floatText(text, kind = '') {
    const layer = $('#fx-layer');
    if (!layer) return;
    const el = document.createElement('div');
    const isPlayer = kind.includes('player');
    const cls = kind.replace(' player', '');
    el.className = `float-num ${cls}`;
    el.textContent = text;
    el.style.left = isPlayer ? '15%' : '50%';
    el.style.top = isPlayer ? '64%' : '35%';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  function burst(count = 9, x = 50, y = 38) {
    const layer = $('#fx-layer');
    if (!layer) return;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = x + '%';
      s.style.top = y + '%';
      s.style.setProperty('--dx', rand(-70, 70) + 'px');
      s.style.setProperty('--dy', rand(-70, 70) + 'px');
      s.style.background = pick(['#f4c869', '#86e6a6', '#f7eed8', '#7bcce8']);
      layer.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
  }

  function shake() {
    const el = $('#battle-screen');
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 400);
  }

  function animEnemy(cls, ms = 400) {
    const el = $('#enemy-sprite');
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }

  function dealDamageToEnemy(amount, opts = {}) {
    const b = G.battle;
    if (!b || b.over || b.enemy.hp <= 0) return 0;
    let dmg = Math.max(0, Math.round(amount));
    if (b.enemy.vulnerable > 0) dmg = Math.round(dmg * 1.5);
    const absorbed = Math.min(b.enemy.block, dmg);
    b.enemy.block -= absorbed;
    const hpDmg = dmg - absorbed;
    b.enemy.hp = Math.max(0, b.enemy.hp - hpDmg);
    animEnemy('hit', 340);
    if (hpDmg > 0) floatText('-' + hpDmg, 'dmg');
    else if (absorbed > 0) floatText('BLOCK', 'block');
    burst(Math.min(12, 4 + hpDmg), 50, 40);
    SFX.hit();
    buzz(10);
    if (hpDmg > 0) shake();
    updateBattleUI();
    return hpDmg;
  }

  function dealDamageToPlayer(amount) {
    const b = G.battle;
    if (!b || b.over) return 0;
    let dmg = Math.max(1, Math.round(amount + b.enemy.strength));
    if (b.enemy.weak > 0) dmg = Math.max(1, Math.floor(dmg * 0.75));
    if (b.weak > 0) dmg = Math.max(1, Math.floor(dmg * 0.75));
    if ((b.playerVulnerable || 0) > 0) dmg = Math.round(dmg * 1.5);
    const absorbed = Math.min(b.block, dmg);
    b.block -= absorbed;
    const hpDmg = dmg - absorbed;
    G.run.hp = Math.max(0, G.run.hp - hpDmg);
    if (hpDmg > 0) {
      floatText('-' + hpDmg, 'player', true);
      shake();
      buzz(18);
    } else {
      floatText('BLOCK', 'block player');
    }
    burst(7, 15, 64);
    SFX.hit();
    const thorns = partyBonuses().thorns + (hasRelic('thornMail') ? 3 : 0);
    if (thorns > 0 && b.enemy.hp > 0) {
      b.enemy.hp = Math.max(0, b.enemy.hp - thorns);
      floatText('-' + thorns, 'dmg');
    }
    updateBattleUI();
    if (G.run.hp <= 0) setTimeout(() => defeatRun(), 320);
    return hpDmg;
  }

  async function playCard(cardUid) {
    const b = G.battle;
    if (!b || b.lock || b.over) return;
    const idx = b.hand.findIndex((c) => c.uid === cardUid);
    if (idx < 0) return;
    const inst = b.hand[idx];
    const card = CARDS[inst.id];
    if (!card) return;
    if (card.type === 'capture' && !enemyIsCatchable()) { toast('Weaken it below the catch threshold first.'); return; }
    if (card.cost > b.energy) { toast('Not enough energy.'); return; }
    b.energy -= card.cost;
    b.lock = true;
    const cardEl = $(`#hand [data-uid="${cardUid}"]`);
    if (cardEl) cardEl.classList.add('playing');
    b.hand.splice(idx, 1);
    b.dealtUids.delete(cardUid);
    SFX.play();
    updateBattleUI();
    renderHand(false);
    await sleep(210);

    // Attack
    if (card.damage) {
      const hits = card.times || 1;
      const bonus = battleAttackBonus();
      const enemyVuln = b.enemy.vulnerable > 0;
      for (let h = 0; h < hits; h++) {
        if (b.over || b.enemy.hp <= 0) break;
        const dmg = card.damage + bonus;
        dealDamageToEnemy(dmg);
        if (h < hits - 1) await sleep(180);
      }
    }
    if (b.enemy.hp <= 0) {
      if (!inst.token) b.discard.push(inst);
      b.lock = true;
      await sleep(220);
      handleEnemyFaint();
      return;
    }
    // Block
    if (card.block) {
      const amount = card.block + (card.type === 'skill' ? battleSkillBlockBonus() : 0);
      b.block += amount;
      floatText('+' + amount, 'block player');
      SFX.block();
      updateBattleUI();
    }
    if (card.heal) {
      const healed = Math.min(card.heal, G.run.maxHp - G.run.hp);
      if (healed > 0) {
        G.run.hp += healed;
        floatText('+' + healed, 'heal player');
        SFX.heal();
        updateBattleUI();
      }
    }
    if (card.draw) {
      drawCards(card.draw);
      await sleep(180);
    }
    if (card.weak) {
      b.enemy.weak += card.weak;
      floatText('WEAK', 'catch');
      SFX.upgrade();
      updateBattleUI();
    }
    if (card.vulnerable) {
      b.enemy.vulnerable += card.vulnerable;
      floatText('VULN', 'catch');
      SFX.upgrade();
      updateBattleUI();
    }
    if (card.threshold) {
      b.lureBonus += card.threshold;
      floatText('LURE +' + Math.round(card.threshold * 100) + '%', 'catch');
      if (enemyIsCatchable()) toast('It is ready to catch.');
      SFX.upgrade();
      updateBattleUI();
    }
    if (!inst.token) b.discard.push(inst);

    if (card.type === 'capture') {
      b.lock = true;
      await sleep(180);
      openCatch(card, inst);
      return;
    }

    b.lock = false;
    updateBattleUI();
    renderHand(false);
  }

  async function endTurn() {
    const b = G.battle;
    if (!b || b.lock || b.over) return;
    b.lock = true;
    updateBattleUI();
    discardHand();
    if (b.weak > 0) b.weak--;
    if ((b.playerVulnerable || 0) > 0) b.playerVulnerable--;
    await sleep(220);
    await enemyTurn();
  }

  async function enemyTurn() {
    const b = G.battle;
    if (!b || b.over) return;
    const e = b.enemy;
    showBanner('WILD TURN');
    await sleep(450);
    if (b.over) return;
    // Block from previous enemy turn expires now.
    e.block = 0;
    const intent = e.intent;
    if (!intent) { startPlayerTurn(); return; }
    if (intent.block || intent.strength) {
      if (intent.block) {
        e.block += intent.block;
        floatText('+' + intent.block, 'block');
        SFX.block();
      }
      if (intent.strength) {
        e.strength += intent.strength;
        floatText('STR+' + intent.strength, 'catch');
        SFX.upgrade();
      }
      updateBattleUI();
      await sleep(480);
    }
    if (intent.heal) {
      const healed = Math.min(intent.heal, e.maxHp - e.hp);
      if (healed > 0) {
        e.hp += healed;
        floatText('+' + healed, 'heal');
        SFX.heal();
        updateBattleUI();
        await sleep(420);
      }
    }
    if (intent.weak) {
      b.weak += intent.weak;
      floatText('WEAK', 'catch player');
      SFX.upgrade();
      updateBattleUI();
      await sleep(320);
    }
    if (intent.vulnerable) {
      b.playerVulnerable = (b.playerVulnerable || 0) + intent.vulnerable;
    }
    if (intent.kind === 'attack' || intent.amount > 0) {
      const hits = intent.times || 1;
      for (let i = 0; i < hits; i++) {
        if (b.over || G.run.hp <= 0) break;
        animEnemy('attack', 460);
        await sleep(150);
        dealDamageToPlayer(intent.amount);
        await sleep(320);
        if (b.enemy.hp <= 0) { await handleEnemyFaint(); return; }
        if (G.run.hp <= 0) { defeatRun(); return; }
      }
    }
    if (b.over) return;
    if (e.weak > 0) e.weak--;
    if (e.vulnerable > 0) e.vulnerable--;
    if (e.hp <= 0) { handleEnemyFaint(); return; }
    e.intent = chooseIntent(e);
    updateBattleUI();
    await sleep(300);
    startPlayerTurn(false);
  }

  async function handleEnemyFaint() {
    const b = G.battle;
    if (!b || b.over) return;
    b.over = true;
    b.lock = true;
    updateBattleUI();
    animEnemy('faint', 780);
    SFX.win();
    floatText('FAINTED', 'catch');
    await sleep(760);
    winBattle(null, true);
  }

  /* ------------------------------------------------------------------ *
   *  Modal plumbing
   * ------------------------------------------------------------------ */

  function openModal(html, opts = {}) {
    const closable = opts.closable !== false;
    G.modalOpen = true;
    modalRoot.classList.add('modal-root');
    modalRoot.innerHTML = `
      <div class="modal-backdrop" ${closable ? 'data-action="close-modal"' : ''}></div>
      <div class="modal-card ${opts.className || ''}" ${opts.modalId ? `id="${opts.modalId}"` : ''}>
        ${closable ? `<button class="modal-close" data-action="close-modal" aria-label="Close">${icon('close')}</button>` : ''}
        ${html}
      </div>`;
  }

  function closeModal(force = false) {
    if (G.catchGame) {
      if (G.catchGame.raf) cancelAnimationFrame(G.catchGame.raf);
      G.catchGame = null;
    }
    modalRoot.innerHTML = '';
    modalRoot.classList.remove('modal-root');
    G.modalOpen = false;
  }

  function modHead(eyebrow, title, sub = '') {
    return `<div class="modal-head"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`;
  }

  /* ------------------------------------------------------------------ *
   *  Capture minigame
   * ------------------------------------------------------------------ */

  function openCatch(card, inst) {
    const b = G.battle;
    if (!b) return;
    const sp = SPECIES[b.enemy.speciesId];
    const g = {
      card,
      inst,
      species: sp,
      target: { x: 0.5, y: 0.52 },
      reticle: { x: 0.5, y: 0.52 },
      start: performance.now(),
      last: performance.now(),
      lastDrag: 0,
      baseG: G.motion.got ? G.motion.gamma : null,
      baseB: G.motion.got ? G.motion.beta : null,
      thrown: false,
      result: null,
      raf: 0,
      chance: 0,
      dist: 1,
    };
    G.catchGame = g;
    const chanceBase = catchChance(0.3, card);
    openModal(`
      <div class="catch-top">
        <p class="eyebrow">Capture attempt</p>
        <h2>${sp.name}</h2>
        <p>${G.motion.enabled ? 'Tilt your device or drag to aim, then throw when the ring glows.' : 'Drag across the arena to aim, then throw when the ring glows.'}</p>
      </div>
      <div class="catch-arena" id="catch-arena">
        <div class="catch-grid"></div>
        <div class="catch-stat">
          <span class="pill moss" id="catch-hp">${Math.max(0, b.enemy.hp)} / ${b.enemy.maxHp} HP</span>
          <button class="tilt-chip ${G.motion.enabled ? 'on' : ''}" data-action="catch-tilt" aria-label="Enable tilt controls">${icon('wind')} ${G.motion.enabled ? 'Tilt on' : 'Tilt'}</button>
        </div>
        <div class="catch-creature" id="catch-creature">${creatureSVG(sp)}<div class="target-ring"></div></div>
        <div class="catch-reticle" id="catch-reticle" aria-hidden="true">${orbSVG()}</div>
        <div class="catch-ball" id="catch-ball">${orbSVG()}</div>
        <div class="catch-result" id="catch-result"></div>
      </div>
      <div class="catch-bottom">
        <div class="catch-meter">
          <span class="label">Catch chance</span>
          <div class="track"><div class="fill" id="catch-fill" style="width:${Math.round(chanceBase * 100)}%"></div></div>
          <span class="pct" id="catch-pct">${Math.round(chanceBase * 100)}%</span>
        </div>
        <div class="catch-controls">
          <button class="btn btn-primary" data-action="catch-throw" id="catch-throw">${icon('orb')} Throw orb</button>
        </div>
        <p class="catch-tip">Center the orb on the wildling for a <b>perfect catch</b>. Misses waste the orb.</p>
      </div>`, { closable: false, className: 'catch-modal', modalId: 'catch-modal' });

    const arena = $('#catch-arena');
    if (!arena) return;
    const setFromPointer = (e) => {
      const rect = arena.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      g.target.x = clamp((p.clientX - rect.left) / rect.width, 0.06, 0.94);
      g.target.y = clamp((p.clientY - rect.top) / rect.height, 0.1, 0.9);
      g.lastDrag = performance.now();
    };
    arena.addEventListener('pointerdown', (e) => { e.preventDefault(); setFromPointer(e); arena.setPointerCapture?.(e.pointerId); });
    arena.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') setFromPointer(e); });
    arena.addEventListener('pointerup', () => { g.lastDrag = performance.now(); });
    animateCatch();
  }

  function catchChance(distNorm, card) {
    const b = G.battle;
    if (!b) return 0;
    if (distNorm <= 0.055) return 1;
    const wounded = 1 - b.enemy.hp / b.enemy.maxHp;
    let chance = 0.28 + wounded * 0.5 + runCatchBonus() + (card ? card.captureBonus || 0 : 0);
    chance += Math.max(0, 1 - distNorm / 0.42) * 0.24;
    if (b.enemy.isBoss) chance -= 0.16;
    return clamp(chance, 0.03, 0.99);
  }

  function animateCatch() {
    const g = G.catchGame;
    if (!g) return;
    const arena = $('#catch-arena');
    const creature = $('#catch-creature');
    const reticle = $('#catch-reticle');
    if (!arena || !creature || !reticle) { g.raf = 0; return; }
    const now = performance.now();
    const t = (now - g.start) / 1000;
    const w = arena.clientWidth;
    const h = arena.clientHeight;

    // Creature drifts in a lazy figure-eight, then holds still once the orb is thrown.
    const driftX = 0.5 + Math.sin(t * 0.86) * 0.235 + Math.sin(t * 2.13) * 0.038;
    const driftY = 0.53 + Math.cos(t * 1.06) * 0.145 + Math.sin(t * 1.77) * 0.026;
    const cx = g.thrown && g.creaturePos ? g.creaturePos.x : driftX;
    const cy = g.thrown && g.creaturePos ? g.creaturePos.y : driftY;
    creature.style.left = (cx * 100) + '%';
    creature.style.top = (cy * 100) + '%';

    // Tilt controls (if enabled and receiving fresh sensor data), otherwise drag.
    const useTilt = G.motion.enabled && tiltIsLive() && now - g.lastDrag > 1200 && !g.thrown;
    if (useTilt) {
      if (g.baseG === null) g.baseG = G.motion.gamma;
      if (g.baseB === null) g.baseB = G.motion.beta;
      const gx = clamp((G.motion.gamma - g.baseG) / 26, -0.44, 0.44);
      const gy = clamp((G.motion.beta - g.baseB) / 32, -0.35, 0.35);
      g.target.x = 0.5 + gx;
      g.target.y = 0.53 + gy;
    }

    if (!g.thrown) {
      g.reticle.x += (g.target.x - g.reticle.x) * 0.22;
      g.reticle.y += (g.target.y - g.reticle.y) * 0.22;
    }
    reticle.style.left = (g.reticle.x * 100) + '%';
    reticle.style.top = (g.reticle.y * 100) + '%';

    const dx = (g.reticle.x - cx) * w;
    const dy = (g.reticle.y - cy) * h;
    const dist = Math.sqrt(dx * dx + dy * dy) / Math.max(1, Math.min(w, h));
    g.dist = dist;
    g.creaturePos = { x: cx, y: cy };
    const chance = catchChance(dist, g.card);
    g.chance = chance;
    const fill = $('#catch-fill');
    const pctEl = $('#catch-pct');
    if (fill) fill.style.width = (chance * 100).toFixed(0) + '%';
    if (pctEl) pctEl.textContent = chance >= 0.999 ? 'PERFECT' : Math.round(chance * 100) + '%';
    const reticleEl = $('#catch-reticle');
    if (reticleEl) reticleEl.style.color = dist <= 0.055 ? '#86e6a6' : dist <= 0.16 ? '#f4c869' : '#c5a36a';

    if (!g.result) g.raf = requestAnimationFrame(animateCatch);
  }

  async function throwOrb() {
    const g = G.catchGame;
    const b = G.battle;
    if (!g || !b || g.thrown || g.result) return;
    g.thrown = true;
    const ball = $('#catch-ball');
    const resultEl = $('#catch-result');
    const throwBtn = $('#catch-throw');
    if (throwBtn) throwBtn.disabled = true;
    const chanceAtThrow = g.chance;
    if (ball) {
      ball.style.left = (g.reticle.x * 100) + '%';
      ball.style.top = (g.reticle.y * 100) + '%';
      ball.classList.add('throw');
    }
    SFX.play();
    buzz(8);
    await sleep(420);
    const cp = g.creaturePos || { x: g.target.x, y: g.target.y };
    if (ball) {
      ball.style.left = (cp.x * 100) + '%';
      ball.style.top = (cp.y * 100) + '%';
      ball.classList.remove('throw');
      ball.classList.add('shake');
      ball.style.transform = 'translate(-50%, -50%) scale(1)';
    }
    await sleep(520);
    const success = Math.random() < chanceAtThrow;
    g.result = { success, chance: chanceAtThrow, dist: g.dist };
    if (success) { SFX.catch(); buzz([15, 40, 20]); } else { SFX.fail(); buzz([30]); }
    if (resultEl) {
      resultEl.classList.add('show');
      if (!success) resultEl.classList.add('fail');
      resultEl.innerHTML = success
        ? `<div class="result-icon">${icon('orb')}</div><h3>Caught!</h3><p>${g.species.name} joins your pack.</p><button class="btn btn-primary btn-sm" data-action="catch-claim">${icon('paw')} Claim</button>`
        : `<div class="result-icon">${icon('spark')}</div><h3>It broke free!</h3><p>${g.species.name} grows bolder. +2 strength.</p><button class="btn btn-ghost btn-sm" data-action="catch-back">Back to battle</button>`;
    }
    if (success) {
      const arena = $('#catch-arena');
      if (arena) {
        for (let i = 0; i < 18; i++) {
          const s = document.createElement('span');
          s.className = 'catch-spark';
          s.style.left = (cp.x * 100) + '%';
          s.style.top = (cp.y * 100) + '%';
          s.style.setProperty('--dx', rand(-90, 90) + 'px');
          s.style.setProperty('--dy', rand(-90, 90) + 'px');
          s.style.background = pick(['#f4c869', '#86e6a6', '#f7eed8']);
          arena.appendChild(s);
          setTimeout(() => s.remove(), 1050);
        }
      }
    }
  }

  function closeCatch() {
    if (G.catchGame && G.catchGame.raf) cancelAnimationFrame(G.catchGame.raf);
    G.catchGame = null;
    closeModal();
  }

  function claimCatch() {
    const g = G.catchGame;
    if (!g || !g.result || !g.result.success) return;
    const id = g.species.id;
    closeCatch();
    winBattle(id, false);
  }

  function catchFailed() {
    const b = G.battle;
    if (!b) { closeCatch(); return; }
    b.enemy.strength += 2;
    b.enemy.enraged = true;
    closeCatch();
    b.lock = false;
    updateBattleUI();
    renderHand(false);
    toast(`${b.enemy.name} broke free and grew stronger.`);
  }

  /* ------------------------------------------------------------------ *
   *  Victory, rewards, and run completion
   * ------------------------------------------------------------------ */

  async function winBattle(caughtId, fainted) {
    const b = G.battle;
    if (!b || b.rewarded) return;
    b.rewarded = true;
    b.over = true;
    b.lock = true;
    const node = nodeById(b.nodeId);
    const floor = node ? node.row + 1 : currentFloor();
    G.run.finished = false;
    G.stats.bestFloor = Math.max(G.stats.bestFloor || 0, floor);
    saveStats();
    let catchInfo = null;
    if (caughtId) {
      const sp = SPECIES[caughtId];
      const duplicate = G.run.party.includes(caughtId);
      if (!duplicate) {
        G.run.party.push(caughtId);
        if (sp.passiveKey === 'hp') { G.run.maxHp += 4; G.run.hp += 4; }
        if (sp.passiveKey === 'thorn') { G.run.maxHp += 2; G.run.hp += 2; }
      } else {
        G.run.maxHp += 3;
        G.run.hp = Math.min(G.run.maxHp, G.run.hp + 3);
      }
      G.run.caught.push(caughtId);
      if (!G.collection.includes(caughtId)) G.collection.push(caughtId);
      saveCollection();
      G.stats.catches = (G.stats.catches || 0) + 1;
      saveStats();
      catchInfo = { id: caughtId, duplicate };
      G.ui.lastCatch = catchInfo;
    }
    const gold = 12 + floor * 2 + (b.enemy.isElite ? 10 : 0) + (hasRelic('coinPurse') ? 10 : 0);
    G.run.gold += gold;
    if (hasRelic('healHerb')) G.run.hp = Math.min(G.run.maxHp, G.run.hp + 3);
    SFX.coin();
    await sleep(260);
    if (b.enemy.isBoss) {
      completeNode(b.nodeId);
      finishRun('win', caughtId);
      return;
    }
    openReward(catchInfo, gold, fainted);
  }

  function completeNode(nodeId) {
    const node = nodeById(nodeId);
    if (!node) return;
    node.done = true;
    G.run.currentNode = nodeId;
    saveRun();
  }

  function rollRewardChoices(count = 3) {
    const b = G.battle;
    const node = b ? nodeById(b.nodeId) : null;
    const floor = node ? node.row + 1 : currentFloor();
    const pool = REWARD_POOL.slice();
    const choices = [];
    const selected = new Set();
    const weights = { common: 58, uncommon: 32 + floor * 2, rare: 10 + floor * 2 };
    while (choices.length < count && selected.size < pool.length) {
      const roll = Math.random() * 100;
      const rarity = roll < weights.common ? 'common' : roll < weights.common + weights.uncommon ? 'uncommon' : 'rare';
      let candidates = pool.filter((id) => !selected.has(id) && CARDS[id].rarity === rarity);
      if (!candidates.length) candidates = pool.filter((id) => !selected.has(id));
      const id = pick(candidates);
      selected.add(id);
      choices.push(id);
    }
    return choices;
  }

  function openReward(catchInfo, gold, fainted) {
    G.ui.rewardChoices = rollRewardChoices(3);
    G.ui.rewardSelected = null;
    G.ui.rewardShot = { catchInfo, gold, fainted };
    renderRewardModal();
  }

  function renderRewardModal() {
    const info = G.ui.rewardShot || {};
    const catchInfo = info.catchInfo;
    const choices = G.ui.rewardChoices;
    const selected = G.ui.rewardSelected;
    const cardsHtml = choices.map((id) => renderIconCard(CARDS[id], {
      selected: selected === id,
      attrs: `data-action="reward-select" data-id="${id}"`,
    })).join('');
    const caughtHtml = catchInfo ? (() => {
      const sp = SPECIES[catchInfo.id];
      return `<div class="caught-banner">
        <div class="mini-sprite">${creatureSVG(sp)}</div>
        <div><h3>${sp.name} joined your pack</h3><p>${catchInfo.duplicate ? 'Your bond deepens: +3 max HP.' : sp.passive}</p></div>
        <span class="sapling">${catchInfo.duplicate ? 'Bond +3 HP' : 'Passive'}</span>
      </div>`;
    })() : (info.fainted ? `<div class="reward-note">${icon('spark')} The wildling fainted — no companion this time</div>` : '');
    openModal(`
      ${modHead('Spoils of the climb', 'Choose a card', 'Add one technique to your deck. The wild will only get stranger.')}
      ${caughtHtml}
      <div class="gold-line">${icon('bag')} +${info.gold || 0} gold</div>
      <div class="reward-grid">${cardsHtml}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" data-action="reward-skip">Skip</button>
        <button class="btn btn-primary" data-action="reward-take" ${selected ? '' : 'disabled'}>${icon('deck')} Add to deck</button>
      </div>`, { closable: false });
  }

  function selectReward(id) {
    G.ui.rewardSelected = G.ui.rewardSelected === id ? null : id;
    renderRewardModal();
    SFX.tap();
  }

  function takeReward(skip = false) {
    if (!skip && G.ui.rewardSelected) {
      G.run.deck.push(G.ui.rewardSelected);
      SFX.upgrade();
    }
    const b = G.battle;
    const nodeId = b ? b.nodeId : G.run.currentNode;
    completeNode(nodeId);
    closeModal();
    G.battle = null;
    showMap();
  }

  function finishRun(result, caughtId) {
    const won = result === 'win';
    const endNode = G.battle ? nodeById(G.battle.nodeId) : null;
    const endFloor = won ? 8 : endNode ? endNode.row + 1 : currentFloor();
    G.run.finished = true;
    G.stats.bestFloor = Math.max(G.stats.bestFloor || 0, endFloor);
    if (won) G.stats.wins = (G.stats.wins || 0) + 1;
    saveStats();
    removeKey(STORE.save);
    const party = G.run.party;
    const caughtBoss = caughtId === 'umbralstag';
    const title = won ? (caughtBoss ? 'The summit is yours' : 'You reached the summit') : 'The climb ends here';
    const sub = won
      ? caughtBoss
        ? 'You caught the Umbral Stag. Its antlers dim, and the spire exhales. Every evening from now on has a keeper.'
        : 'The Stag bowed, then dissolved into blue light. You climbed with kindness and a very strange deck. The wild remembers.'
      : 'Your lantern gutters on the stair. The wildlings will be there when you climb again.';
    const emblem = won
      ? `<div class="end-emblem">${creatureSVG(caughtBoss ? SPECIES.umbralstag : SPECIES.glimmerwing)}</div>`
      : `<div class="end-emblem" style="filter:grayscale(.4) brightness(.8)">${creatureSVG(SPECIES.duskbat)}</div>`;
    const catches = G.collection.length;
    openModal(`
      <div class="end-screen">
        ${emblem}
        <p class="eyebrow">${won ? 'Run complete' : 'Run over'}</p>
        <h2>${title}</h2>
        <p class="end-sub">${sub}</p>
        <div class="stat-grid">
          <div class="stat-box"><div class="val">${endFloor}</div><div class="lbl">Floors</div></div>
          <div class="stat-box"><div class="val">${party.length}</div><div class="lbl">Pack</div></div>
          <div class="stat-box"><div class="val">${G.run.deck.length}</div><div class="lbl">Cards</div></div>
        </div>
        <p class="end-sub" style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)">Field guide ${catches}/${SPECIES_LIST.length} · Best floor ${G.stats.bestFloor}</p>
        <div class="modal-actions">
          <button class="btn btn-primary" data-action="new-run">${icon('mountain')} New climb</button>
          <button class="btn btn-ghost" data-action="back-title">${icon('chevron')} Title</button>
        </div>
      </div>`, { closable: false });
    SFX[won ? 'win' : 'lose']();
  }

  function defeatRun() {
    if (G.defeatQueued) return;
    G.defeatQueued = true;
    const b = G.battle;
    if (b) { b.over = true; b.lock = true; }
    if (G.run) {
      const node = b ? nodeById(b.nodeId) : null;
      const floor = node ? node.row + 1 : currentFloor();
      G.stats.bestFloor = Math.max(G.stats.bestFloor || 0, floor);
      saveStats();
      removeKey(STORE.save);
    }
    setTimeout(() => { G.defeatQueued = false; finishRun('lose'); }, 320);
  }

  /* ------------------------------------------------------------------ *
   *  Rest, shop, treasure
   * ------------------------------------------------------------------ */

  function openRest(nodeId) {
    const run = G.run;
    const heal = Math.max(1, Math.round(run.maxHp * 0.32));
    const full = run.hp >= run.maxHp;
    openModal(`
      ${modHead('A quiet landing', 'Campfire', 'The wind drops. Somewhere below, something howls. Take a breath.')}
      <div class="camp-fire">${campfireSVG()}</div>
      <div class="option-list">
        <button class="option-btn" data-action="rest-heal" ${full ? 'disabled' : ''}>
          <span class="opt-icon">${icon('heart')}</span>
          <span><h3>Rest ${full ? '(full HP)' : `· +${Math.min(heal, run.maxHp - run.hp)} HP`}</h3><p>Bandage up and share your rations with the pack.</p></span>
          <span class="chev">${icon('chevron')}</span>
        </button>
        <button class="option-btn" data-action="rest-remove" ${G.run.deck.length <= 5 ? 'disabled' : ''}>
          <span class="opt-icon">${icon('deck')}</span>
          <span><h3>Release a card</h3><p>Remove one card from your deck. A smaller deck is a sharper one.</p></span>
          <span class="chev">${icon('chevron')}</span>
        </button>
        <button class="option-btn" data-action="rest-leave">
          <span class="opt-icon">${icon('mountain')}</span>
          <span><h3>Keep climbing</h3><p>Leave the fire early. No rest, no regrets.</p></span>
          <span class="chev">${icon('chevron')}</span>
        </button>
      </div>
      <div class="modal-actions"><span class="pill moss">${icon('heart')} ${run.hp}/${run.maxHp} HP</span><span class="pill gold">${icon('bag')} ${run.gold} gold</span></div>`,
      { modalId: 'rest-modal' });
    G.ui.nodeId = nodeId;
  }

  function restHeal() {
    const run = G.run;
    const heal = Math.max(1, Math.round(run.maxHp * 0.32));
    const actual = Math.min(heal, run.maxHp - run.hp);
    run.hp += actual;
    SFX.heal();
    buzz([8, 30, 8]);
    completeNode(G.ui.nodeId);
    closeModal();
    showMap();
    toast(`Rested for ${actual} HP.`);
  }

  function openRemoveCard(nodeId) {
    const run = G.run;
    const counts = groupCounts(run.deck);
    const html = counts.map(([id, count]) => {
      const card = CARDS[id];
      if (!card) return '';
      return renderIconCard(card, { attrs: `data-action="remove-card" data-id="${id}"`, selected: false })
        .replace('</button>', `<span class="badge-ready" style="background:var(--rose);color:#26080c">${count > 1 ? '×' + count : 'REMOVE'}</span></button>`);
    }).join('');
    openModal(`
      ${modHead('Campfire · Release', 'Choose a card', 'Tap a card to remove one copy from your deck for this run.')}
      <div class="card-grid">${html}</div>
      <div class="modal-actions"><button class="btn btn-ghost btn-sm" data-action="rest-back" data-id="${nodeId}">${icon('chevron')} Back</button></div>`,
      { modalId: 'remove-modal', className: 'wide' });
  }

  function removeCard(id) {
    const idx = G.run.deck.indexOf(id);
    if (idx < 0) return;
    G.run.deck.splice(idx, 1);
    SFX.upgrade();
    completeNode(G.ui.nodeId);
    closeModal();
    showMap();
    toast('Card released.');
  }

  function openShop(nodeId) {
    if (!G.ui.shop || G.ui.shop.nodeId !== nodeId) {
      const pickIds = shuffle(REWARD_POOL).slice(0, 3);
      const unowned = RELIC_IDS.filter((id) => !G.run.relics.includes(id));
      G.ui.shop = {
        nodeId,
        cards: pickIds.map((id, i) => ({ id, price: [26, 34, 42][i], sold: false })),
        relic: unowned.length ? { id: pick(unowned), price: 48, sold: false } : null,
        heal: { price: 20, sold: false },
      };
    }
    renderShop();
  }

  function renderShop() {
    const s = G.ui.shop;
    const run = G.run;
    const cardRows = s.cards.map((offer, i) => {
      const card = CARDS[offer.id];
      return `<button class="shop-item" data-action="shop-buy-card" data-index="${i}" ${offer.sold || run.gold < offer.price ? 'disabled' : ''}>
        <span class="shop-art shop-card-art">${icon(card.art)}</span>
        <span><h3>${card.name}</h3><p>${cardDesc(card)} · ${card.type}</p></span>
        ${offer.sold ? '<span class="sold">Sold</span>' : `<span class="price">${icon('bag')} ${offer.price}</span>`}
      </button>`;
    }).join('');
    const relic = s.relic ? RELICS[s.relic.id] : null;
    const relicRow = s.relic ? `<button class="shop-item" data-action="shop-buy-relic" ${s.relic.sold || run.gold < s.relic.price ? 'disabled' : ''}>
      <span class="shop-art">${icon(relic.icon)}</span>
      <span><h3>${relic.name}</h3><p>${relic.desc}</p></span>
      ${s.relic.sold ? '<span class="sold">Sold</span>' : `<span class="price">${icon('bag')} ${s.relic.price}</span>`}
    </button>` : `<div class="shop-item" style="opacity:.5"><span class="shop-art">${icon('gem')}</span><span><h3>Relic shelf empty</h3><p>You already carry every trinket the shop can find.</p></span></div>`;
    const healAmount = Math.min(run.maxHp - run.hp, Math.round(run.maxHp * 0.35));
    const healRow = `<button class="shop-item" data-action="shop-buy-heal" ${s.heal.sold || run.gold < s.heal.price || healAmount <= 0 ? 'disabled' : ''}>
      <span class="shop-art">${icon('heart')}</span>
      <span><h3>Trail Rations</h3><p>${healAmount > 0 ? `Heal ${healAmount} HP.` : 'You are already at full health.'}</p></span>
      ${s.heal.sold ? '<span class="sold">Sold</span>' : `<span class="price">${icon('bag')} ${s.heal.price}</span>`}
    </button>`;
    openModal(`
      ${modHead('The moth’s stall', 'Trader', 'A Glimmerwing in a very small hat sells things it found on the stairs.')}
      <div class="gold-line">${icon('bag')} ${run.gold} gold</div>
      <div class="shop-offers">${cardRows}${relicRow}${healRow}</div>
      <div class="modal-actions"><button class="btn btn-ghost btn-sm" data-action="shop-leave">Leave stall ${icon('chevron')}</button></div>`,
      { modalId: 'shop-modal', className: 'wide' });
    G.ui.nodeId = s.nodeId;
  }

  function buyShopCard(i) {
    const s = G.ui.shop;
    if (!s) return;
    const offer = s.cards[i];
    if (!offer || offer.sold || G.run.gold < offer.price) return;
    G.run.gold -= offer.price;
    offer.sold = true;
    G.run.deck.push(offer.id);
    SFX.coin(); buzz(8);
    saveRun();
    renderShop();
    toast(`${CARDS[offer.id].name} added to your deck.`);
  }

  function buyShopRelic() {
    const s = G.ui.shop;
    if (!s || !s.relic || s.relic.sold || G.run.gold < s.relic.price) return;
    G.run.gold -= s.relic.price;
    s.relic.sold = true;
    acquireRelic(s.relic.id);
    SFX.coin(); buzz([8, 20, 8]);
    saveRun();
    renderShop();
    toast(`${RELICS[s.relic.id].name} acquired.`);
  }

  function buyShopHeal() {
    const s = G.ui.shop;
    if (!s || s.heal.sold || G.run.gold < s.heal.price) return;
    const amount = Math.min(G.run.maxHp - G.run.hp, Math.round(G.run.maxHp * 0.35));
    if (amount <= 0) return;
    G.run.gold -= s.heal.price;
    s.heal.sold = true;
    G.run.hp += amount;
    SFX.heal(); buzz(8);
    saveRun();
    renderShop();
    toast(`Healed ${amount} HP.`);
  }

  function acquireRelic(id) {
    if (!id || G.run.relics.includes(id)) return;
    G.run.relics.push(id);
    if (id === 'moonstone') { G.run.maxHp += 8; G.run.hp += 8; }
    saveRun();
  }

  function openTreasure(nodeId) {
    const unowned = RELIC_IDS.filter((id) => !G.run.relics.includes(id));
    let offer = null;
    let gold = 0;
    if (unowned.length) offer = pick(unowned);
    else gold = 25;
    G.ui.treasure = { nodeId, offer, gold };
    const relic = offer ? RELICS[offer] : null;
    openModal(`
      ${modHead('A forgotten cache', 'Sunken chest', 'The lid is warm. Something inside is still dreaming.')}
      ${relic ? `<div class="caught-banner" style="background:rgba(244,200,105,.08);border-color:rgba(244,200,105,.28)">
        <div class="mini-sprite" style="display:grid;place-items:center;color:var(--amber)">${icon(relic.icon)}</div>
        <div><h3>${relic.name}</h3><p>${relic.desc}</p></div><span class="sapling" style="color:var(--amber)">Relic</span>
      </div>` : `<div class="reward-note">${icon('bag')} The chest holds ${gold} gold instead</div>`}
      <div class="modal-actions">
        <button class="btn btn-primary" data-action="treasure-claim">${icon('gem')} Claim</button>
        <button class="btn btn-ghost btn-sm" data-action="treasure-leave">Leave it</button>
      </div>`,
      { modalId: 'treasure-modal' });
  }

  function claimTreasure() {
    const t = G.ui.treasure;
    if (!t) return;
    if (t.offer) {
      acquireRelic(t.offer);
      SFX.upgrade();
      toast(`${RELICS[t.offer].name} acquired.`);
    } else {
      G.run.gold += t.gold || 25;
      SFX.coin();
      toast(`Found ${t.gold || 25} gold.`);
    }
    completeNode(t.nodeId);
    closeModal();
    showMap();
  }

  /* ------------------------------------------------------------------ *
   *  Guide, deck, pack, settings
   * ------------------------------------------------------------------ */

  function openGuide() {
    const caught = new Set(G.collection);
    const tiles = SPECIES_LIST.map((sp, i) => {
      const isCaught = caught.has(sp.id);
      return `<div class="species-tile ${isCaught ? 'caught' : 'locked'}">
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <div class="tile-art">${creatureSVG(sp)}</div>
        <h3>${isCaught ? sp.name : '???'}</h3>
        <p>${isCaught ? sp.passive : 'Not yet caught'}</p>
      </div>`;
    }).join('');
    openModal(`
      ${modHead('The field guide', 'Wildlings of the spire', `${G.collection.length} of ${SPECIES_LIST.length} discovered across all runs. Catch a wildling by weakening it, then throwing an orb.`)}
      <div class="species-grid">${tiles}</div>
      <div class="modal-actions"><span class="pill gold">${icon('spark')} Best floor ${G.stats.bestFloor || 0}</span><span class="pill moss">${icon('paw')} ${G.stats.catches || 0} total catches</span></div>`,
      { className: 'wide' });
  }

  function openDeck(view = 'deck') {
    if (!G.run) return;
    let ids = [];
    let title = 'Your deck';
    let sub = 'Every technique you carry up the spire.';
    if (view === 'deck') ids = G.run.deck.slice();
    else if (view === 'draw' && G.battle) { ids = G.battle.draw.map((c) => c.id); title = 'Draw pile'; sub = 'The order is shuffled each battle. Tap End Turn to keep climbing.'; }
    else if (view === 'discard' && G.battle) { ids = G.battle.discard.map((c) => c.id); title = 'Discard pile'; sub = 'These cards reshuffle when your draw pile runs dry.'; }
    else if (view === 'hand' && G.battle) { ids = G.battle.hand.map((c) => c.id); title = 'Your hand'; }
    const groups = { attack: [], skill: [], capture: [] };
    ids.forEach((id) => { if (CARDS[id]) groups[CARDS[id].type].push(id); });
    const labels = { attack: 'Attacks', skill: 'Skills', capture: 'Capture gear' };
    const html = Object.entries(groups).filter(([, arr]) => arr.length).map(([type, arr]) => {
      const counts = groupCounts(arr);
      const cards = counts.map(([id, count]) => renderIconCard(CARDS[id], {
        attrs: 'disabled',
        selected: false,
      }).replace('</button>', `<span class="badge-ready" style="background:${type === 'capture' ? 'var(--moss)' : 'var(--amber)'};color:#102016">×${count}</span></button>`)).join('');
      return `<div class="deck-group"><h3>${labels[type]} · ${arr.length}</h3><div class="card-grid">${cards}</div></div>`;
    }).join('');
    openModal(`${modHead('Your equipment', title, sub)}${html || '<p style="text-align:center;color:var(--dim)">Nothing here yet.</p>'}`, { className: 'wide' });
  }

  function openParty() {
    if (!G.run) return;
    const counts = groupCounts(G.run.party);
    const html = counts.length ? counts.map(([id, count]) => {
      const sp = SPECIES[id];
      if (!sp) return '';
      return `<div class="caught-banner" style="margin-bottom:9px">
        <div class="mini-sprite">${creatureSVG(sp)}</div>
        <div><h3>${sp.name} ${count > 1 ? `×${count}` : ''}</h3><p>${sp.story}</p></div>
        <span class="sapling">${sp.passive}</span>
      </div>`;
    }).join('') : `<div class="reward-note">${icon('paw')} No companions yet. Weaken a wildling and throw an orb.</div>`;
    openModal(`${modHead('Your pack', 'Companions', 'Caught wildlings travel with you and lend their nature to every climb.')}${html}`, { className: 'wide' });
  }

  function savedFloorLabel() {
    const s = loadJSON(STORE.save, null);
    if (!s || !s.currentNode) return 1;
    const m = String(s.currentNode).match(/r(\d+)/);
    return Math.min(8, (m ? Number(m[1]) : 0) + 1);
  }

  function openSettings(reopen = false) {
    const iOS = typeof window.DeviceOrientationEvent !== 'undefined' && typeof window.DeviceOrientationEvent.requestPermission === 'function';
    openModal(`
      ${modHead('Options', 'Settings', 'A quieter climb, or a louder one. Your call.')}
      <div class="settings-row">
        <span class="s-icon">${icon(G.settings.sound ? 'spark' : 'moon')}</span>
        <span><h3>Sound</h3><p>Synthesized clicks, chimes and capture calls.</p></span>
        <button class="toggle ${G.settings.sound ? 'on' : ''}" data-action="toggle-sound" aria-label="Toggle sound" aria-pressed="${G.settings.sound}"></button>
      </div>
      <div class="settings-row">
        <span class="s-icon">${icon('wind')}</span>
        <span><h3>Tilt controls</h3><p>${G.motion.enabled ? 'Active. Lean your device to aim the capture orb.' : 'Optional. Move the capture reticle by tilting your phone.'}</p></span>
        <button class="toggle ${G.motion.enabled ? 'on' : ''}" data-action="toggle-tilt" aria-label="Toggle tilt controls" aria-pressed="${G.motion.enabled}"></button>
      </div>
      <div class="settings-row">
        <span class="s-icon">${icon('paw')}</span>
        <span><h3>Haptics</h3><p>Short vibrations on hits and catches where supported.</p></span>
        <button class="toggle ${G.settings.haptics ? 'on' : ''}" data-action="toggle-haptics" aria-label="Toggle haptics" aria-pressed="${G.settings.haptics}"></button>
      </div>
      ${iOS ? `<div class="settings-note">On iPhone and iPad, enabling tilt asks for motion &amp; orientation permission. If you decline, you can always drag the orb with your finger.</div>` : ''}
      ${G.run && G.screen !== 'title' ? `<div class="modal-actions"><button class="btn btn-ghost btn-sm" data-action="forfeit-run">${icon('close')} Abandon run</button></div>` : ''}
      <div class="modal-actions"><button class="btn btn-primary btn-sm" data-action="close-modal">${icon('chevron')} Back to the climb</button></div>`,
      { modalId: 'settings-modal' });
  }

  function toggleSound() {
    G.settings.sound = !G.settings.sound;
    saveSettings();
    if (G.settings.sound) SFX.upgrade();
    openSettings(true);
  }
  function toggleHaptics() {
    G.settings.haptics = !G.settings.haptics;
    saveSettings();
    if (G.settings.haptics) buzz(12);
    openSettings(true);
  }

  function forfeitRun() {
    openModal(`
      ${modHead('Leave the spire?', 'Abandon this run', 'Your current deck, pack and progress will be lost. Discovered wildlings stay in the field guide.')}
      <div class="modal-actions">
        <button class="btn btn-danger" data-action="confirm-forfeit">Abandon run</button>
        <button class="btn btn-ghost" data-action="close-modal">Keep climbing</button>
      </div>`, { className: 'narrow' });
  }

  function confirmForfeit() {
    clearRun();
    G.battle = null;
    G.ui.shop = null;
    closeModal();
    renderTitle();
    toast('Run abandoned. The spire waits.');
  }

  function newRunFromEnd() {
    closeModal();
    G.battle = null;
    G.ui.shop = null;
    G.ui.lastCatch = null;
    newRun();
  }

  function backToTitle() {
    closeModal();
    G.battle = null;
    G.run = null;
    G.ui.shop = null;
    renderTitle();
  }

  /* ------------------------------------------------------------------ *
   *  Events
   * ------------------------------------------------------------------ */

  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    if (target.disabled || target.getAttribute('aria-disabled') === 'true') {
      if (target.dataset.action === 'play-card') {
        const b = G.battle;
        const uidAttr = target.dataset.uid;
        const inst = b && b.hand.find((c) => c.uid === uidAttr);
        if (inst) {
          const card = CARDS[inst.id];
          if (card && card.type === 'capture' && !enemyIsCatchable()) toast('Weaken it below the catch threshold first.');
          else if (card && card.cost > b.energy) toast('Not enough energy.');
        }
      }
      return;
    }
    const action = target.dataset.action;
    const id = target.dataset.id;
    switch (action) {
      case 'start-run':
        audioCtx();
        newRun();
        SFX.upgrade();
        break;
      case 'continue-run':
        audioCtx();
        continueRun();
        break;
      case 'enable-tilt':
        enableTilt();
        break;
      case 'open-guide': openGuide(); break;
      case 'open-settings': openSettings(); break;
      case 'close-modal': closeModal(); break;
      case 'toggle-sound': toggleSound(); break;
      case 'toggle-haptics': toggleHaptics(); break;
      case 'toggle-tilt':
        if (G.motion.enabled) { disableTilt(); openSettings(true); }
        else { enableTilt().then(() => openSettings(true)); }
        break;
      case 'forfeit-run': forfeitRun(); break;
      case 'confirm-forfeit': confirmForfeit(); break;

      case 'map-node': enterNode(id); break;
      case 'view-deck': openDeck('deck'); break;
      case 'view-draw': openDeck('draw'); break;
      case 'view-discard': openDeck('discard'); break;
      case 'open-party': openParty(); break;

      case 'play-card': playCard(target.dataset.uid); break;
      case 'end-turn': endTurn(); break;

      case 'reward-select': selectReward(id); break;
      case 'reward-take': takeReward(false); break;
      case 'reward-skip': takeReward(true); break;

      case 'rest-heal': restHeal(); break;
      case 'rest-remove': openRemoveCard(G.ui.nodeId); break;
      case 'rest-back': openRest(id); break;
      case 'rest-leave': completeNode(G.ui.nodeId); closeModal(); showMap(); break;
      case 'remove-card': removeCard(id); break;

      case 'shop-buy-card': buyShopCard(Number(target.dataset.index)); break;
      case 'shop-buy-relic': buyShopRelic(); break;
      case 'shop-buy-heal': buyShopHeal(); break;
      case 'shop-leave': completeNode(G.ui.nodeId); closeModal(); showMap(); break;

      case 'treasure-claim': claimTreasure(); break;
      case 'treasure-leave': completeNode(G.ui.nodeId); closeModal(); showMap(); break;

      case 'catch-throw': throwOrb(); break;
      case 'catch-claim': claimCatch(); break;
      case 'catch-back': catchFailed(); break;
      case 'catch-tilt':
        enableTilt().then((ok) => {
          if (ok) {
            if (G.catchGame) { G.catchGame.baseG = null; G.catchGame.baseB = null; }
            const btn = $('[data-action="catch-tilt"]');
            if (btn) { btn.classList.add('on'); btn.innerHTML = `${icon('wind')} Tilt on`; }
          }
        });
        break;

      case 'new-run': newRunFromEnd(); break;
      case 'back-title': backToTitle(); break;
      default: break;
    }
  });

  function enterNode(id) {
    const node = availableNodes().find((n) => n.id === id);
    if (!node) { toast('That path is not open yet.'); return; }
    G.ui.nodeId = node.id;
    if (node.type === 'wild' || node.type === 'elite' || node.type === 'boss') {
      startBattle(node);
    } else if (node.type === 'rest') {
      openRest(node.id);
    } else if (node.type === 'shop') {
      openShop(node.id);
    } else if (node.type === 'treasure') {
      openTreasure(node.id);
    } else {
      startBattle(node);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (G.modalOpen && !$('#catch-modal')) closeModal();
      return;
    }
    if (G.catchGame && !G.catchGame.result) {
      const step = 0.055;
      if (e.key === 'ArrowLeft') { G.catchGame.target.x = clamp(G.catchGame.target.x - step, 0.06, 0.94); G.catchGame.lastDrag = performance.now(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { G.catchGame.target.x = clamp(G.catchGame.target.x + step, 0.06, 0.94); G.catchGame.lastDrag = performance.now(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { G.catchGame.target.y = clamp(G.catchGame.target.y - step, 0.1, 0.9); G.catchGame.lastDrag = performance.now(); e.preventDefault(); }
      if (e.key === 'ArrowDown') { G.catchGame.target.y = clamp(G.catchGame.target.y + step, 0.1, 0.9); G.catchGame.lastDrag = performance.now(); e.preventDefault(); }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); throwOrb(); }
      return;
    }
    if (G.screen === 'battle' && !G.modalOpen && (e.key === 'e' || e.key === 'E')) endTurn();
  });

  window.addEventListener('beforeunload', () => {
    if (G.run && !G.run.finished && G.screen !== 'battle') saveRun();
  });

  /* ------------------------------------------------------------------ *
   *  Boot
   * ------------------------------------------------------------------ */

  function boot() {
    if (G.settings.tilt) {
      const iOS = typeof window.DeviceOrientationEvent !== 'undefined' && typeof window.DeviceOrientationEvent.requestPermission === 'function';
      if (!iOS) {
        attachMotion();
        G.motion.enabled = true;
      } else {
        G.settings.tilt = false;
        saveSettings();
      }
    }
    renderTitle();
    if (new URLSearchParams(location.search).has('debug')) {
      window.__spire = { G, showMap, renderMap, openShop, openRest, openTreasure, startBattle, openReward, finishRun, renderTitle, openCatch, winBattle };
    }
  }

  boot();
})();
