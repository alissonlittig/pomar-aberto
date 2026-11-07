// Pure logic: recurring agenda, live status, .ics export, giving validation.
export const CATS = { culto: 'Cultos', grupo: 'Pequenos grupos', servico: 'Serviço', familia: 'Famílias' };

// dow: 0 = domingo. Weekly recurrence; monthlyWeek = nth weekday of the month.
export const RULES = [
  { id: 'culto-dom', title: 'Culto de domingo', cat: 'culto', dow: 0, time: '10:00', dur: 90, place: 'Salão principal', desc: 'Música, leitura e partilha da mesa. Café depois.' },
  { id: 'culto-noite', title: 'Culto da noite', cat: 'culto', dow: 0, time: '18:30', dur: 75, place: 'Salão principal', desc: 'Mais curto e mais silencioso, com violão.' },
  { id: 'oracao-qua', title: 'Noite de oração', cat: 'culto', dow: 3, time: '19:30', dur: 60, place: 'Sala do pomar', desc: 'Quarenta minutos de silêncio guiado e vinte de intercessão.' },
  { id: 'grupo-ter', title: 'Grupo Vila Nova', cat: 'grupo', dow: 2, time: '20:00', dur: 90, place: 'Casa da Marta', desc: 'Jantar leve e conversa sobre o texto da semana.' },
  { id: 'grupo-qui', title: 'Grupo Centro', cat: 'grupo', dow: 4, time: '19:45', dur: 90, place: 'Sala 2', desc: 'Estudo em roda, sem pressa e sem pré-requisito.' },
  { id: 'cozinha-sab', title: 'Cozinha solidária', cat: 'servico', dow: 6, time: '09:00', dur: 180, place: 'Cozinha comunitária', desc: 'Preparamos e servimos 120 marmitas. Venha picar cebola.' },
  { id: 'criancas-dom', title: 'Ciranda das crianças', cat: 'familia', dow: 0, time: '10:00', dur: 90, place: 'Sala azul', desc: 'Histórias, oficina e lanche para 3 a 10 anos.' },
  { id: 'feira-mes', title: 'Feira de trocas', cat: 'servico', monthlyWeek: 1, dow: 6, time: '14:00', dur: 180, place: 'Pátio', desc: 'Roupas, livros e sementes. Nada se vende, tudo se troca.' },
  { id: 'casais-mes', title: 'Jantar de casais', cat: 'familia', monthlyWeek: 3, dow: 5, time: '20:00', dur: 120, place: 'Salão principal', desc: 'Mesa posta, perguntas no cartão e sobremesa.' },
];

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function atTime(day, time) {
  const [h, m] = time.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
}

function matches(rule, day) {
  if (day.getDay() !== rule.dow) return false;
  if (rule.monthlyWeek) return Math.ceil(day.getDate() / 7) === rule.monthlyWeek;
  return true;
}

/** Occurrences whose end is after `from`, within `days` days. Sorted by start. */
export function upcoming(from, days = 30, rules = RULES) {
  const out = [];
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < days; i++) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    for (const r of rules) {
      if (!matches(r, day)) continue;
      const start = atTime(day, r.time);
      const end = new Date(start.getTime() + r.dur * 60000);
      if (end > from) out.push({ ...r, start, end, key: `${r.id}@${dayKey(day)}` });
    }
  }
  return out.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

export function filterCat(list, cat) {
  return cat === 'todos' ? list : list.filter((e) => e.cat === cat);
}

/** Services (cat culto) are broadcast. */
export function streamStatus(now, rules = RULES) {
  const list = upcoming(now, 8, rules.filter((r) => r.cat === 'culto'));
  const live = list.find((e) => e.start <= now && now < e.end);
  if (live) return { live: true, event: live, minutes: 0 };
  const next = list.find((e) => e.start > now);
  return { live: false, event: next, minutes: Math.ceil((next.start - now) / 60000) };
}

export function countdown(minutes) {
  const d = Math.floor(minutes / 1440), h = Math.floor((minutes % 1440) / 60), m = minutes % 60;
  if (d) return `${d} d ${h} h`;
  if (h) return `${h} h ${pad(m)} min`;
  return `${m} min`;
}

const icsDate = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const esc = (s) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

export function toICS(ev) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Comunidade Pomar Aberto//Demo//PT', 'BEGIN:VEVENT',
    `UID:${ev.key}@pomar-aberto.demo`, `DTSTAMP:${icsDate(ev.start)}`,
    `DTSTART:${icsDate(ev.start)}`, `DTEND:${icsDate(ev.end)}`,
    `SUMMARY:${esc(ev.title)}`, `LOCATION:${esc(ev.place)}`, `DESCRIPTION:${esc(ev.desc)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export const FUNDS = { geral: 'Fundo geral', cozinha: 'Cozinha solidária', obra: 'Reforma do telhado', bolsas: 'Bolsas de estudo' };
export const FREQ = { once: 'Uma vez', month: 'Todo mês' };

export const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Gross that leaves `amount` net after a 2,9% + R$ 0,30 processor fee (demo numbers). */
export function coverFees(amount) {
  return Math.round(((amount + 0.3) / (1 - 0.029)) * 100) / 100;
}

export function validateGift({ amount, fund, freq, name, email }) {
  const errors = {};
  if (!Number.isFinite(amount) || amount < 5) errors.amount = 'Valor mínimo de R$ 5,00.';
  else if (amount > 50000) errors.amount = 'Acima de R$ 50.000, fale com a tesouraria.';
  if (!(fund in FUNDS)) errors.fund = 'Escolha um destino.';
  if (!(freq in FREQ)) errors.freq = 'Escolha a frequência.';
  if (!name || name.trim().length < 2) errors.name = 'Informe seu nome.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || '')) errors.email = 'E-mail inválido.';
  return errors;
}

export function parseAmount(text) {
  const t = String(text).replace(/[^\d,.-]/g, '');
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return Number(norm);
}

export function receiptCode(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return 'DEMO-' + h.toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
}
