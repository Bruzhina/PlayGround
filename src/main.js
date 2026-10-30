import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/nunito/900.css";
import "./style.css";
import { createWorld } from "./scene.js";

const $ = (selector) => document.querySelector(selector);

const QUESTIONS = [
  {
    label: "Espelho",
    text: "O que acontece quando uma luz reflete um espelho?",
    choices: [
      { text: "Atravessa o espelho.", correct: true },
      { text: "A luz vira calor dentro do vidro.", correct: false },
      { text: "A luz fica presa no reflexo.", correct: false },
    ],
    explanation: "A luz atravessa o espelho. Essa é a resposta da prova da Professora Marieine.",
  },
  {
    label: "Garrafa de plástico",
    text: "O que acontece quando uma luz reflete uma garrafa de plástico?",
    choices: [
      { text: "Ela não reflete, mas não passa.", correct: true },
      { text: "Ela atravessa sem mudar nada.", correct: false },
      { text: "Ela vira uma sombra colorida.", correct: false },
    ],
    explanation: "A garrafa de plástico não reflete, mas também não deixa a luz passar.",
  },
  {
    label: "Materiais opacos",
    text: "O que acontece quando uma luz é opaca?",
    choices: [
      { text: "Os materiais opacos — madeira, metal ou parede — bloqueiam a luz.", correct: true },
      { text: "A luz fica mais brilhante e atravessa.", correct: false },
      { text: "A luz passa e vira um arco-íris.", correct: false },
    ],
    explanation: "Quem é opaco são os materiais, como a madeira, o metal ou uma parede. Eles bloqueiam a luz.",
  },
];

const canvas = $("#world");
const world = createWorld(canvas);

const ui = {
  hud: $("#hud"),
  intro: $("#intro"),
  quiz: $("#quiz"),
  result: $("#result"),
  settings: $("#settings"),
  how: $("#how"),
  playBtn: $("#playBtn"),
  howBtn: $("#howBtn"),
  howDone: $("#howDone"),
  closeHow: $("#closeHow"),
  settingsBtn: $("#settingsBtn"),
  settingsDone: $("#settingsDone"),
  closeSettings: $("#closeSettings"),
  soundBtn: $("#soundBtn"),
  quizSoundBtn: $("#quizSoundBtn"),
  soundToggle: $("#soundToggle"),
  tiltToggle: $("#tiltToggle"),
  tiltChip: $("#tiltChip"),
  walletValue: $("#wallet-value"),
  onlineCount: $("#online-count"),
  objectiveStep: $("#objective-step"),
  objectiveText: $("#objective-text"),
  interaction: $("#interaction"),
  interactionKicker: $("#interaction-kicker"),
  interactionName: $("#interaction-name"),
  interactionHint: $("#interaction-hint"),
  actionBtn: $("#actionBtn"),
  actionLabel: $("#action-label"),
  joystick: $("#joystick"),
  joystickKnob: $("#joystick .joystick-knob"),
  toast: $("#toast"),
  duoNames: $("#duo-names"),
  questionCount: $("#question-count"),
  quizProgressBar: $("#quiz-progress-bar"),
  teacherLine: $("#teacher-line"),
  partnerInitial: $("#partner-initial"),
  correctCount: $("#correct-count"),
  remainingCount: $("#remaining-count"),
  questionIndex: $("#question-index"),
  questionText: $("#question-text"),
  answers: $("#answers"),
  feedback: $("#feedback"),
  feedbackIcon: $("#feedback-icon use"),
  feedbackTitle: $("#feedback-title"),
  feedbackText: $("#feedback-text"),
  nextBtn: $("#nextBtn"),
  resultTitle: $("#result-title"),
  resultSubtitle: $("#result-subtitle"),
  reportScore: $("#report-score"),
  reportDuoNames: $("#report-duo-names"),
  reportPartnerInitial: $("#report-partner-initial"),
  reportRows: $("#report-rows"),
  reportNoteText: $("#report-note-text"),
  reportDate: $("#report-date"),
  rewardCard: $("#rewardCard"),
  rewardEyebrow: $("#reward-eyebrow"),
  giftVisual: $("#giftVisual"),
  lossVisual: $("#lossVisual"),
  rewardTitle: $("#reward-title"),
  rewardText: $("#reward-text"),
  resultWallet: $("#result-wallet"),
  againBtn: $("#againBtn"),
  newDuoBtn: $("#newDuoBtn"),
  flash: $("#flash"),
  confetti: $("#confetti"),
  domHearts: $("#dom-hearts"),
};

const game = {
  screen: "intro",
  duo: null,
  currentTarget: null,
  actionMode: "hug",
  readyToChoose: false,
  transitioning: false,
  questionIndex: 0,
  choices: [],
  answered: false,
  results: [],
  correctCount: 0,
  balance: 123,
  sound: true,
  tilt: false,
  tiltBase: null,
  tiltSamples: 0,
  joystickActive: false,
  joystickPointer: null,
  modalOpen: false,
  toastTimer: 0,
  keys: new Set(),
  finished: false,
};

const sound = {
  context: null,
  ensure() {
    if (!game.sound) return null;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") this.context.resume();
    return this.context;
  },
  tone(frequency, duration = 0.12, type = "sine", volume = 0.045, delay = 0) {
    const context = this.ensure();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  },
  click() {
    this.tone(440, 0.07, "triangle", 0.025);
    this.tone(660, 0.08, "triangle", 0.018, 0.05);
  },
  hug() {
    this.tone(392, 0.16, "sine", 0.04);
    this.tone(523.25, 0.18, "sine", 0.038, 0.11);
    this.tone(659.25, 0.24, "sine", 0.032, 0.23);
  },
  choose() {
    this.tone(523.25, 0.12, "triangle", 0.04);
    this.tone(659.25, 0.12, "triangle", 0.035, 0.09);
    this.tone(783.99, 0.2, "triangle", 0.035, 0.18);
  },
  correct() {
    this.tone(523.25, 0.12, "sine", 0.04);
    this.tone(659.25, 0.12, "sine", 0.038, 0.09);
    this.tone(783.99, 0.22, "sine", 0.035, 0.18);
  },
  wrong() {
    this.tone(220, 0.18, "sawtooth", 0.022);
    this.tone(174.61, 0.24, "sawtooth", 0.018, 0.1);
  },
  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((note, index) => this.tone(note, 0.25, "triangle", 0.04, index * 0.11));
  },
  lose() {
    const notes = [392, 349.23, 293.66];
    notes.forEach((note, index) => this.tone(note, 0.22, "sine", 0.03, index * 0.12));
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function showToast(message, duration = 2400) {
  clearTimeout(game.toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add("is-visible");
  game.toastTimer = window.setTimeout(() => ui.toast.classList.remove("is-visible"), duration);
}

function setObjective(step, text) {
  ui.objectiveStep.textContent = step;
  ui.objectiveText.textContent = text;
}

function setSoundUi() {
  const icon = game.sound ? "#icon-sound" : "#icon-mute";
  ui.soundBtn.querySelector("use").setAttribute("href", icon);
  ui.quizSoundBtn.querySelector("use").setAttribute("href", icon);
  ui.soundBtn.setAttribute("aria-label", game.sound ? "Som ligado" : "Som desligado");
  ui.quizSoundBtn.setAttribute("aria-label", game.sound ? "Som ligado" : "Som desligado");
  ui.soundToggle.classList.toggle("is-on", game.sound);
  ui.soundToggle.setAttribute("aria-checked", String(game.sound));
}

function toggleSound() {
  game.sound = !game.sound;
  setSoundUi();
  if (game.sound) sound.click();
}

function updateWallet() {
  ui.walletValue.textContent = String(game.balance);
  ui.resultWallet.textContent = `${game.balance} Robux`;
}

function showScreen(name) {
  game.screen = name;
  ui.intro.classList.toggle("is-hidden", name !== "intro");
  ui.quiz.classList.toggle("is-hidden", name !== "quiz");
  ui.result.classList.toggle("is-hidden", name !== "result");
  ui.hud.classList.toggle("is-hidden", name !== "lobby");
  if (name !== "lobby") {
    ui.interaction.classList.add("is-hidden");
  }
}

function startGame() {
  if (game.screen !== "intro") return;
  sound.click();
  world.setMode("lobby");
  world.setLocked(false);
  showScreen("lobby");
  setObjective("01", "Abrace um jogador online");
  updateWallet();
  showToast("Chegue perto de um jogador online e aperte em Abraçar.", 3000);
}

function openModal(element) {
  if (game.modalOpen) return;
  game.modalOpen = true;
  element.classList.remove("is-hidden");
}

function closeModal(element) {
  element.classList.add("is-hidden");
  game.modalOpen = false;
}

function burstDomHearts(origin) {
  const rect = origin.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const colors = ["#ff6f61", "#ff8fb8", "#ffc857", "#8b7cf6", "#69dcc3"];
  for (let i = 0; i < 12; i += 1) {
    const heart = document.createElement("i");
    heart.textContent = "♥";
    heart.style.left = `${centerX + (Math.random() - 0.5) * 40}px`;
    heart.style.top = `${centerY + (Math.random() - 0.5) * 20}px`;
    heart.style.color = colors[i % colors.length];
    heart.style.fontSize = `${13 + Math.random() * 14}px`;
    heart.style.setProperty("--drift", `${(Math.random() - 0.5) * 120}px`);
    heart.style.animationDelay = `${Math.random() * 0.2}s`;
    ui.domHearts.appendChild(heart);
    window.setTimeout(() => heart.remove(), 2200);
  }
}

function flashScreen() {
  ui.flash.classList.remove("is-active");
  void ui.flash.offsetWidth;
  ui.flash.classList.add("is-active");
}

function confettiBurst() {
  ui.confetti.innerHTML = "";
  const colors = ["#ff6f61", "#ffc857", "#69dcc3", "#8b7cf6", "#ff8fb8", "#4fb7ff"];
  for (let i = 0; i < 60; i += 1) {
    const piece = document.createElement("i");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${2.4 + Math.random() * 2.6}s`;
    piece.style.animationDelay = `${Math.random() * 0.7}s`;
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 260}px`);
    piece.style.setProperty("--spin", `${400 + Math.random() * 900}deg`);
    piece.style.width = `${6 + Math.random() * 7}px`;
    piece.style.height = `${9 + Math.random() * 11}px`;
    ui.confetti.appendChild(piece);
  }
  window.setTimeout(() => {
    ui.confetti.innerHTML = "";
  }, 5600);
}

function updateInteraction() {
  if (game.screen !== "lobby" || game.actionMode === "choose" || game.transitioning) return;
  const near = world.nearestBot(2.25);
  if (!near) {
    game.currentTarget = null;
    ui.interaction.classList.add("is-hidden");
    return;
  }
  game.currentTarget = near.bot;
  const name = near.bot.userData.name;
  ui.interactionKicker.textContent = "JOGADOR ONLINE";
  ui.interactionName.textContent = name;
  ui.interactionHint.textContent = "Aperte para abraçar";
  ui.actionLabel.textContent = "Abraçar";
  ui.actionBtn.classList.remove("is-choose", "is-hugged");
  ui.actionBtn.setAttribute("aria-label", `Abraçar ${name}`);
  ui.interaction.classList.remove("is-hidden");
}

function handleAction() {
  if (game.screen !== "lobby" || game.transitioning) return;
  if (game.actionMode === "hug") {
    const target = game.currentTarget;
    if (!target) {
      showToast("Chegue mais perto de um jogador online.");
      return;
    }
    const distance = world.player.position.distanceTo(target.position);
    if (distance > 2.25) {
      showToast("Chegue mais perto para abraçar.");
      return;
    }
    sound.hug();
    burstDomHearts(ui.actionBtn);
    world.setLocked(true);
    world.startHug(target);
    game.duo = target;
    game.actionMode = "choose";
    game.readyToChoose = false;
    ui.interactionKicker.textContent = "DUPLA ENCONTRADA";
    ui.interactionName.textContent = target.userData.name;
    ui.interactionHint.textContent = "Abraço completo! Agora escolha.";
    ui.actionLabel.textContent = "Escolher";
    ui.actionBtn.classList.remove("is-hugged");
    ui.actionBtn.classList.add("is-choose");
    ui.actionBtn.setAttribute("aria-label", `Escolher ${target.userData.name}`);
    setObjective("02", "Aperte em Escolher");
    window.setTimeout(() => {
      game.readyToChoose = true;
      ui.actionBtn.classList.add("is-hugged");
      showToast("Conexão de dupla formada! Aperte em Escolher.", 2600);
    }, 780);
    return;
  }

  if (game.actionMode === "choose") {
    if (!game.readyToChoose) {
      showToast("Calma! O abraço ainda está acontecendo.");
      return;
    }
    const target = game.duo;
    if (!target) return;
    game.transitioning = true;
    game.readyToChoose = false;
    sound.choose();
    world.choosePartner(target);
    world.setMode("duo");
    world.setLocked(true);
    flashScreen();
    window.setTimeout(() => {
      startQuiz(target);
      game.transitioning = false;
    }, 620);
  }
}

function shuffledChoices(question) {
  return question.choices
    .map((choice) => ({ ...choice }))
    .sort(() => Math.random() - 0.5);
}

function startQuiz(target) {
  if (!target) return;
  game.duo = target;
  game.questionIndex = 0;
  game.correctCount = 0;
  game.results = [];
  game.answered = false;
  game.finished = false;
  game.actionMode = "hug";
  game.readyToChoose = false;
  game.transitioning = false;
  ui.duoNames.textContent = `Você + ${target.userData.name}`;
  ui.partnerInitial.textContent = target.userData.name.charAt(0).toUpperCase();
  ui.correctCount.textContent = "0";
  ui.remainingCount.textContent = "3";
  world.setMode("duo");
  world.setLocked(true);
  showScreen("quiz");
  renderQuestion();
  sound.click();
}

function renderQuestion() {
  const question = QUESTIONS[game.questionIndex];
  game.choices = shuffledChoices(question);
  game.answered = false;

  ui.questionCount.textContent = `Pergunta ${game.questionIndex + 1} de 3`;
  ui.quizProgressBar.style.width = `${((game.questionIndex + 1) / 3) * 100}%`;
  ui.questionIndex.textContent = String(game.questionIndex + 1).padStart(2, "0");
  ui.questionText.textContent = question.text;
  ui.correctCount.textContent = String(game.correctCount);
  ui.remainingCount.textContent = String(3 - (game.questionIndex + 1));
  ui.feedback.classList.add("is-hidden");
  ui.feedback.classList.remove("is-wrong");
  ui.answers.innerHTML = "";

  game.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer";
    button.dataset.index = String(index);
    const letter = document.createElement("span");
    letter.className = "answer-letter";
    letter.textContent = "ABC"[index];
    const text = document.createElement("span");
    text.className = "answer-text";
    text.textContent = choice.text;
    const mark = document.createElement("span");
    mark.className = "answer-mark";
    mark.innerHTML = '<svg><use href="#icon-check"></use></svg>';
    button.append(letter, text, mark);
    button.addEventListener("click", () => selectAnswer(index));
    ui.answers.appendChild(button);
  });

  const lines = [
    "“Sem pressa, cientistas. Leiam com atenção!”",
    "“Uma dupla conectada pensa melhor.”",
    "“A luz tem segredos. Vamos descobrir juntos!”",
  ];
  ui.teacherLine.textContent = lines[game.questionIndex % lines.length];
}

function selectAnswer(index) {
  if (game.answered) return;
  const question = QUESTIONS[game.questionIndex];
  const choice = game.choices[index];
  if (!choice) return;
  game.answered = true;
  const correct = choice.correct;
  game.results[game.questionIndex] = correct;
  if (correct) game.correctCount += 1;

  const buttons = Array.from(ui.answers.querySelectorAll(".answer"));
  buttons.forEach((button, buttonIndex) => {
    const item = game.choices[buttonIndex];
    button.disabled = true;
    button.querySelector(".answer-mark use").setAttribute("href", item.correct ? "#icon-check" : "#icon-x");
    if (item.correct) {
      button.classList.add("is-correct");
    } else if (buttonIndex === index) {
      button.classList.add("is-wrong");
    } else {
      button.classList.add("is-dim");
    }
  });

  const correctChoice = game.choices.find((item) => item.correct);
  ui.feedbackIcon.setAttribute("href", correct ? "#icon-check" : "#icon-x");
  ui.feedbackTitle.textContent = correct ? "Acertou!" : "Quase!";
  ui.feedbackText.textContent = correct
    ? question.explanation
    : `A resposta certa é: “${correctChoice.text}” ${question.explanation}`;
  ui.feedback.classList.remove("is-hidden");
  ui.feedback.classList.toggle("is-wrong", !correct);
  ui.nextBtn.querySelector("span").textContent = game.questionIndex === 2 ? "Ver boletim" : "Próxima";
  ui.correctCount.textContent = String(game.correctCount);
  ui.remainingCount.textContent = String(Math.max(0, 2 - game.questionIndex));
  ui.teacherLine.textContent = correct
    ? "“Muito bem! A dupla está brilhando.”"
    : "“Errar faz parte. O importante é aprender com a luz.”";

  if (correct) sound.correct();
  else sound.wrong();
}

function nextQuestion() {
  if (!game.answered) return;
  if (game.questionIndex < QUESTIONS.length - 1) {
    game.questionIndex += 1;
    renderQuestion();
    sound.click();
    return;
  }
  finishQuiz();
}

function finishQuiz() {
  if (game.finished) return;
  game.finished = true;
  const score = game.correctCount;
  const perfect = score === QUESTIONS.length;
  if (perfect) game.balance += 123;
  else game.balance = Math.max(0, game.balance - 13);

  ui.resultTitle.textContent = perfect
    ? "A Professora Marieine aprovou sua dupla!"
    : "A Professora Marieine viu seu resultado!";
  ui.resultSubtitle.textContent = perfect
    ? "3 acertos na prova da luz. O Gift Card foi liberado!"
    : `${score} de 3 acertos. A Professora Marieine deixou um recado para a dupla.`;
  ui.reportScore.textContent = `${score}/3`;
  ui.reportDuoNames.textContent = `Você + ${game.duo.userData.name}`;
  ui.reportPartnerInitial.textContent = game.duo.userData.name.charAt(0).toUpperCase();
  ui.reportDate.textContent = new Date().toLocaleDateString("pt-BR");
  ui.reportRows.innerHTML = "";

  QUESTIONS.forEach((question, index) => {
    const row = document.createElement("div");
    row.className = "report-row";
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("p");
    label.textContent = question.label;
    const mark = document.createElement("span");
    const correct = Boolean(game.results[index]);
    mark.className = `row-mark${correct ? "" : " miss"}`;
    mark.innerHTML = `<svg><use href="${correct ? "#icon-check" : "#icon-x"}"></use></svg>`;
    row.append(number, label, mark);
    ui.reportRows.appendChild(row);
  });

  ui.giftVisual.classList.toggle("is-hidden", !perfect);
  ui.lossVisual.classList.toggle("is-hidden", perfect);
  ui.rewardEyebrow.textContent = perfect ? "RECOMPENSA DESBLOQUEADA" : "RESULTADO DA PROVA";
  ui.rewardTitle.textContent = perfect ? "Gift Card de 123 Robux" : "Você perdeu 13 Robux no Roblox";
  ui.rewardText.textContent = perfect
    ? "Você acertou tudo! O Gift Card de 123 Robux da Roblox foi enviado para a Professora Marieine e adicionado à sua carteira."
    : `A penalidade foi pequena. Sua carteira agora tem ${game.balance} Robux. Tente novamente com sua dupla!`;
  ui.reportNoteText.textContent = perfect
    ? "Dupla aprovada com louvor! A luz encontrou o caminho certo. — Prof. Marieine"
    : "A luz erra, a dupla aprende. Tentem de novo com calma! — Prof. Marieine";
  ui.resultWallet.textContent = `${game.balance} Robux`;
  ui.walletValue.textContent = String(game.balance);

  world.setMode("result");
  showScreen("result");
  ui.result.scrollTop = 0;

  if (perfect) {
    confettiBurst();
    sound.win();
  } else {
    sound.lose();
  }
}

function goLobby(resetWorld = true) {
  if (resetWorld) world.reset();
  game.duo = null;
  game.currentTarget = null;
  game.actionMode = "hug";
  game.readyToChoose = false;
  game.transitioning = false;
  game.answered = false;
  game.finished = false;
  game.questionIndex = 0;
  game.correctCount = 0;
  game.results = [];
  ui.answers.innerHTML = "";
  ui.feedback.classList.add("is-hidden");
  ui.actionBtn.classList.remove("is-choose", "is-hugged");
  ui.actionLabel.textContent = "Abraçar";
  ui.interaction.classList.add("is-hidden");
  ui.actionBtn.setAttribute("aria-label", "Abraçar jogador");
  setObjective("01", "Abrace um jogador online");
  updateWallet();
  showScreen("lobby");
  showToast("Escolha uma nova dupla para a prova da Professora Marieine.", 2800);
}

function toggleTiltUi(on) {
  ui.tiltToggle.classList.toggle("is-on", on);
  ui.tiltToggle.setAttribute("aria-checked", String(on));
  ui.tiltChip.classList.toggle("is-hidden", !on);
}

function handleOrientation(event) {
  if (!game.tilt) return;
  const beta = event.beta;
  const gamma = event.gamma;
  if (beta === null || gamma === null) return;
  const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  let x = gamma;
  let y = beta;
  if (angle === 90) {
    x = beta;
    y = -gamma;
  } else if (angle === -90 || angle === 270) {
    x = -beta;
    y = gamma;
  } else if (angle === 180) {
    x = -gamma;
    y = -beta;
  }
  if (!game.tiltBase) {
    game.tiltBase = { x, y };
    return;
  }
  const deadzone = 0.13;
  const normalize = (value) => {
    const raw = clamp(value / 24, -1, 1);
    return Math.abs(raw) < deadzone ? 0 : (raw - Math.sign(raw) * deadzone) / (1 - deadzone);
  };
  const tiltX = normalize(x - game.tiltBase.x);
  const tiltY = normalize(-(y - game.tiltBase.y));
  world.setTilt(tiltX, tiltY);
  game.tiltSamples += 1;
}

async function enableTilt() {
  if (!("DeviceOrientationEvent" in window)) {
    showToast("Este dispositivo não tem acelerômetro disponível.");
    return false;
  }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        showToast("Permissão de movimento negada. Use o joystick.");
        return false;
      }
    }
  } catch (error) {
    showToast("Não foi possível ativar a inclinação. Use o joystick.");
    return false;
  }
  game.tilt = true;
  game.tiltBase = null;
  game.tiltSamples = 0;
  window.addEventListener("deviceorientation", handleOrientation);
  toggleTiltUi(true);
  showToast("Inclinação ativa! Incline o celular para andar.");
  return true;
}

function disableTilt() {
  game.tilt = false;
  game.tiltBase = null;
  game.tiltSamples = 0;
  world.setTilt(0, 0);
  window.removeEventListener("deviceorientation", handleOrientation);
  toggleTiltUi(false);
  showToast("Inclinação desativada. Use o joystick ou o teclado.");
}

async function toggleTilt() {
  if (game.tilt) {
    disableTilt();
    return;
  }
  const enabled = await enableTilt();
  if (!enabled) toggleTiltUi(false);
}

function updateJoystick(event) {
  const rect = ui.joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const max = rect.width * 0.31;
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const length = Math.hypot(dx, dy);
  if (length > max) {
    dx = (dx / length) * max;
    dy = (dy / length) * max;
  }
  ui.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  world.setInput(dx / max, dy / max);
}

function resetJoystick() {
  game.joystickActive = false;
  game.joystickPointer = null;
  ui.joystickKnob.style.transform = "translate(-50%, -50%)";
  world.setInput(0, 0);
}

function updateKeyboardInput() {
  if (game.joystickActive || game.screen !== "lobby") return;
  const keys = game.keys;
  const x = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const y = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
  world.setInput(x, y);
}

ui.playBtn.addEventListener("click", startGame);
ui.howBtn.addEventListener("click", () => openModal(ui.how));
ui.closeHow.addEventListener("click", () => closeModal(ui.how));
ui.howDone.addEventListener("click", () => closeModal(ui.how));
ui.settingsBtn.addEventListener("click", () => openModal(ui.settings));
ui.closeSettings.addEventListener("click", () => closeModal(ui.settings));
ui.settingsDone.addEventListener("click", () => closeModal(ui.settings));
ui.soundBtn.addEventListener("click", toggleSound);
ui.quizSoundBtn.addEventListener("click", toggleSound);
ui.soundToggle.addEventListener("click", toggleSound);
ui.tiltToggle.addEventListener("click", toggleTilt);
ui.actionBtn.addEventListener("click", handleAction);
ui.nextBtn.addEventListener("click", nextQuestion);
ui.againBtn.addEventListener("click", () => {
  if (!game.duo) {
    goLobby(true);
    return;
  }
  showScreen("quiz");
  startQuiz(game.duo);
});
ui.newDuoBtn.addEventListener("click", () => {
  sound.click();
  goLobby(true);
});

ui.settings.addEventListener("click", (event) => {
  if (event.target === ui.settings) closeModal(ui.settings);
});
ui.how.addEventListener("click", (event) => {
  if (event.target === ui.how) closeModal(ui.how);
});

ui.joystick.addEventListener("pointerdown", (event) => {
  if (game.screen !== "lobby") return;
  event.preventDefault();
  game.joystickActive = true;
  game.joystickPointer = event.pointerId;
  ui.joystick.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
ui.joystick.addEventListener("pointermove", (event) => {
  if (!game.joystickActive || event.pointerId !== game.joystickPointer) return;
  event.preventDefault();
  updateJoystick(event);
});
ui.joystick.addEventListener("pointerup", (event) => {
  if (event.pointerId !== game.joystickPointer) return;
  resetJoystick();
});
ui.joystick.addEventListener("pointercancel", resetJoystick);
ui.joystick.addEventListener("lostpointercapture", resetJoystick);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (event.key === "Escape") {
    if (!ui.settings.classList.contains("is-hidden")) closeModal(ui.settings);
    if (!ui.how.classList.contains("is-hidden")) closeModal(ui.how);
    return;
  }
  if (game.modalOpen) return;
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
    game.keys.add(key);
    updateKeyboardInput();
    return;
  }
  if (key === "e") {
    event.preventDefault();
    handleAction();
    return;
  }
  if (game.screen === "quiz") {
    if (["1", "2", "3"].includes(key)) {
      event.preventDefault();
      const button = ui.answers.querySelectorAll(".answer")[Number(key) - 1];
      if (button) button.click();
      return;
    }
    if (event.key === "Enter" && game.answered) {
      event.preventDefault();
      nextQuestion();
    }
  }
});

window.addEventListener("keyup", (event) => {
  game.keys.delete(event.key.toLowerCase());
  updateKeyboardInput();
});

window.addEventListener("blur", () => {
  game.keys.clear();
  if (!game.joystickActive) world.setInput(0, 0);
});

window.addEventListener("orientationchange", () => {
  game.tiltBase = null;
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    game.keys.clear();
    world.setInput(0, 0);
    resetJoystick();
  }
});

updateWallet();
setSoundUi();
updateInteraction();

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  updateKeyboardInput();
  world.update(dt);
  if (game.screen === "lobby") updateInteraction();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__duoQuest = {
  game,
  world,
  startGame,
  startQuiz,
  finishQuiz,
  selectAnswer,
  nextQuestion,
  goLobby,
  QUESTIONS,
};
