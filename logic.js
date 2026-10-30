/* Shared game rules. Loaded as a classic script in the browser and as CommonJS in tests. */

const QUESTION_BANK = [
  {
    id: 'espelho',
    tag: 'Reflexão',
    prompt: 'O que acontece quando uma luz reflete um espelho?',
    options: [
      { id: 'atravessa', text: 'Atravessa o espelho.' },
      { id: 'absorve', text: 'É absorvida pelo vidro e vira calor.' },
      { id: 'espalha', text: 'Se espalha por toda a sala.' },
      { id: 'presa', text: 'Fica presa dentro do espelho.' }
    ],
    correctId: 'atravessa',
    note: 'A luz atravessa o espelho.'
  },
  {
    id: 'garrafa',
    tag: 'Materiais',
    prompt: 'O que acontece quando uma luz reflete em uma garrafa de plástico?',
    options: [
      { id: 'naoReflete', text: 'Ela não reflete, mas não passa.' },
      { id: 'atravessa', text: 'Ela atravessa a garrafa sem mudar nada.' },
      { id: 'sombra', text: 'Ela vira uma sombra atrás da garrafa.' },
      { id: 'vazia', text: 'Ela só passa quando a garrafa está vazia.' }
    ],
    correctId: 'naoReflete',
    note: 'Ela não reflete, mas não passa.'
  },
  {
    id: 'opaca',
    tag: 'Opacos',
    prompt: 'O que acontece quando uma luz é opaca?',
    options: [
      {
        id: 'materiais',
        text: 'Quem é opaco são os materiais, como a madeira, o metal ou uma parede.'
      },
      { id: 'desaparece', text: 'A luz fica transparente e desaparece.' },
      { id: 'atravessa', text: 'A luz atravessa qualquer material opaco.' },
      { id: 'forte', text: 'A luz fica mais forte quando encontra o material.' }
    ],
    correctId: 'materiais',
    note: 'Quem é opaco são os materiais, como a madeira, o metal ou uma parede.'
  }
];

function scoreQuiz(selectedIds) {
  if (!Array.isArray(selectedIds)) return 0;
  return QUESTION_BANK.reduce(
    (total, question, index) => total + (selectedIds[index] === question.correctId ? 1 : 0),
    0
  );
}

function outcomeFor(score) {
  const safeScore = Math.max(0, Math.min(QUESTION_BANK.length, Number(score) || 0));

  if (safeScore === 3) {
    return {
      type: 'win',
      robux: 123,
      headline: 'Gift Card de 123 Robux',
      detail: 'A dupla acertou as 3 perguntas. A Professora Marieine liberou o Gift Card de 123 Robux.'
    };
  }
  if (safeScore === 2) {
    return {
      type: 'lose-less',
      robux: -5,
      headline: 'Você perdeu menos Robux',
      detail: 'A dupla acertou 2 de 3. Como errou uma, perdeu menos Robux: 5.'
    };
  }
  if (safeScore === 1) {
    return {
      type: 'lose-less',
      robux: -8,
      headline: 'Você perdeu menos Robux',
      detail: 'A dupla acertou 1 de 3. Como errou duas, perdeu menos Robux: 8.'
    };
  }
  return {
    type: 'lose',
    robux: -15,
    headline: 'Você perdeu Robux',
    detail: 'A dupla não acertou nenhuma pergunta. Desta vez, perdeu 15 Robux.'
  };
}

function pickPartner(players, random = Math.random) {
  const candidates = players.filter(player => !player.isYou);
  if (!candidates.length) return null;
  return candidates[Math.floor(random() * candidates.length)] || candidates[0];
}

function makeDuos(players, partnerId) {
  const you = players.find(player => player.isYou);
  const partner = players.find(player => player.id === partnerId && !player.isYou);
  if (!you || !partner) return [];

  const rest = players.filter(player => player.id !== you.id && player.id !== partner.id);
  const duos = [[you, partner]];
  for (let index = 0; index + 1 < rest.length; index += 2) {
    duos.push([rest[index], rest[index + 1]]);
  }
  return duos;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QUESTION_BANK, scoreQuiz, outcomeFor, pickPartner, makeDuos };
}
