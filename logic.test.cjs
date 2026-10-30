const test = require('node:test');
const assert = require('node:assert/strict');
const { QUESTION_BANK, scoreQuiz, outcomeFor, pickPartner, makeDuos } = require('./logic.js');

const players = [
  { id: 'you', name: 'Você', isYou: true },
  { id: 'luna', name: 'Luna' },
  { id: 'theo', name: 'Theo' },
  { id: 'bia', name: 'Bia' },
  { id: 'caio', name: 'Caio' },
  { id: 'nino', name: 'Nino' }
];

test('the quiz has three questions with one valid answer each', () => {
  assert.equal(QUESTION_BANK.length, 3);
  for (const question of QUESTION_BANK) {
    assert.equal(question.options.filter(option => option.id === question.correctId).length, 1);
    assert.ok(question.options.length >= 4);
    assert.ok(question.prompt.endsWith('?'));
  }
});

test('the expected answer key is preserved', () => {
  assert.deepEqual(
    QUESTION_BANK.map(question => question.correctId),
    ['atravessa', 'naoReflete', 'materiais']
  );
});

test('scoreQuiz counts only matching answers', () => {
  assert.equal(scoreQuiz(['atravessa', 'naoReflete', 'materiais']), 3);
  assert.equal(scoreQuiz(['atravessa', 'naoReflete']), 2);
  assert.equal(scoreQuiz(['errada', 'errada', 'materiais']), 1);
  assert.equal(scoreQuiz([]), 0);
  assert.equal(scoreQuiz(null), 0);
});

test('a perfect score wins the 123 Robux gift card', () => {
  const outcome = outcomeFor(3);
  assert.equal(outcome.type, 'win');
  assert.equal(outcome.robux, 123);
});

test('mistakes cost fewer Robux than a total miss', () => {
  const almost = outcomeFor(2);
  const one = outcomeFor(1);
  const none = outcomeFor(0);
  assert.equal(almost.type, 'lose-less');
  assert.equal(one.type, 'lose-less');
  assert.equal(none.type, 'lose');
  assert.ok(almost.robux > none.robux);
  assert.ok(one.robux > none.robux);
});

test('pickPartner never picks the local player', () => {
  for (let index = 0; index < 40; index += 1) {
    const partner = pickPartner(players, () => index / 40);
    assert.ok(partner);
    assert.notEqual(partner.id, 'you');
  }
});

test('makeDuos creates three complete, unique duos', () => {
  const duos = makeDuos(players, 'bia');
  assert.equal(duos.length, 3);
  const ids = duos.flat().map(player => player.id);
  assert.equal(new Set(ids).size, players.length);
  assert.ok(duos[0].some(player => player.id === 'you'));
  assert.ok(duos[0].some(player => player.id === 'bia'));
});

test('makeDuos rejects an unknown partner', () => {
  assert.deepEqual(makeDuos(players, 'fantasma'), []);
});
