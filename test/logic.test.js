import test from 'node:test';
import assert from 'node:assert/strict';
import { upcoming, filterCat, streamStatus, countdown, toICS, validateGift, parseAmount, coverFees, receiptCode, RULES } from '../src/logic.js';

const sun = new Date(2026, 10, 8, 9, 0); // domingo 08/11/2026

test('upcoming: sorted, only future', () => {
  const l = upcoming(sun, 30);
  assert.ok(l.length > 20);
  for (let i = 1; i < l.length; i++) assert.ok(l[i].start >= l[i - 1].start);
  assert.ok(l.every((e) => e.end > sun));
});

test('upcoming: event in progress kept, finished dropped', () => {
  assert.ok(upcoming(new Date(2026, 10, 8, 11, 0), 1).some((e) => e.id === 'culto-dom'));
  assert.ok(!upcoming(new Date(2026, 10, 8, 11, 31), 1).some((e) => e.id === 'culto-dom'));
});

test('monthly rule: feira on first Saturday only', () => {
  const days = upcoming(new Date(2026, 10, 1), 60).filter((e) => e.id === 'feira-mes').map((e) => e.start.getDate());
  assert.deepEqual(days, [7, 5]); // 07/11 e 05/12
});

test('filterCat', () => {
  const l = upcoming(sun, 14);
  assert.equal(filterCat(l, 'todos').length, l.length);
  assert.ok(filterCat(l, 'grupo').every((e) => e.cat === 'grupo'));
});

test('streamStatus live vs next', () => {
  assert.equal(streamStatus(new Date(2026, 10, 8, 10, 30)).live, true);
  const s = streamStatus(sun);
  assert.equal(s.live, false);
  assert.equal(s.minutes, 60);
  assert.equal(s.event.id, 'culto-dom');
});

test('countdown', () => {
  assert.equal(countdown(45), '45 min');
  assert.equal(countdown(125), '2 h 05 min');
  assert.equal(countdown(1500), '1 d 1 h');
});

test('toICS', () => {
  const ev = upcoming(sun, 1, RULES.filter((r) => r.id === 'culto-dom'))[0];
  const ics = toICS(ev);
  assert.match(ics, /DTSTART:20261108T100000/);
  assert.match(ics, /DTEND:20261108T113000/);
  assert.match(ics, /SUMMARY:Culto de domingo/);
});

test('validateGift', () => {
  const ok = { amount: 50, fund: 'geral', freq: 'once', name: 'Ana', email: 'ana@exemplo.com' };
  assert.deepEqual(validateGift(ok), {});
  assert.ok(validateGift({ ...ok, amount: 2 }).amount);
  assert.ok(validateGift({ ...ok, amount: NaN }).amount);
  assert.ok(validateGift({ ...ok, email: 'x' }).email);
  assert.ok(validateGift({ ...ok, fund: 'z' }).fund);
});

test('parseAmount / coverFees / receipt', () => {
  assert.equal(parseAmount('R$ 1.250,50'), 1250.5);
  assert.equal(parseAmount('80'), 80);
  assert.equal(coverFees(100), 103.3);
  assert.equal(receiptCode('a'), receiptCode('a'));
  assert.match(receiptCode('a'), /^DEMO-[0-9A-Z]{7}$/);
});
