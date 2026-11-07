import { CATS, FUNDS, FREQ, upcoming, filterCat, streamStatus, countdown, toICS, validateGift, parseAmount, coverFees, brl, receiptCode } from './logic.js';

const $ = (id) => document.getElementById(id);
const fmtDay = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Agenda ---------- */
let cat = 'todos', shown = 10;
const all = upcoming(new Date(), 30);

function renderFilters() {
  $('filters').innerHTML = [['todos', 'Tudo'], ...Object.entries(CATS)]
    .map(([k, v]) => `<button type="button" class="pill" aria-pressed="${k === cat}" data-cat="${k}">${v}</button>`).join('');
}

function renderAgenda() {
  const list = filterCat(all, cat);
  const slice = list.slice(0, shown);
  let last = '', html = '';
  for (const e of slice) {
    const day = fmtDay.format(e.start);
    if (day !== last) { html += `<li class="day"><h3>${cap(day)}</h3></li>`; last = day; }
    html += `<li class="ev" data-cat="${e.cat}">
      <time datetime="${e.start.toISOString()}">${fmtTime.format(e.start)}</time>
      <div><h4>${e.title}</h4><p>${e.desc}</p><p class="muted">${e.place} · ${CATS[e.cat]}</p></div>
      <button type="button" class="ics" data-key="${e.key}" aria-label="Adicionar ${e.title} ao calendário">Calendário</button>
    </li>`;
  }
  $('agenda-list').innerHTML = html || '<li class="empty">Nada neste filtro nos próximos 30 dias.</li>';
  $('more').hidden = list.length <= shown;
}

$('filters').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-cat]'); if (!b) return;
  cat = b.dataset.cat; shown = 10; renderFilters(); renderAgenda();
});
$('more').addEventListener('click', () => { shown += 10; renderAgenda(); });
$('agenda-list').addEventListener('click', (ev) => {
  const b = ev.target.closest('.ics'); if (!b) return;
  const e = all.find((x) => x.key === b.dataset.key);
  const url = URL.createObjectURL(new Blob([toICS(e)], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${e.id}.ics` });
  a.click(); URL.revokeObjectURL(url);
});

/* ---------- Ao vivo ---------- */
function renderLive() {
  const now = new Date(), s = streamStatus(now), e = s.event;
  const when = `${cap(fmtDay.format(e.start))}, ${fmtTime.format(e.start)}`;
  $('hero-chip').textContent = s.live ? 'Ao vivo agora' : 'Próximo encontro';
  $('hero-chip').classList.toggle('on', s.live);
  $('hero-title').textContent = e.title;
  $('hero-when').textContent = s.live ? 'Acontecendo agora' : `${when} · começa em ${countdown(s.minutes)}`;
  $('hero-place').textContent = e.place;
  $('live-badge').textContent = s.live ? 'AO VIVO' : `Começa em ${countdown(s.minutes)}`;
  $('live-badge').classList.toggle('on', s.live);
  $('live-title').textContent = e.title;
  $('live-sub').textContent = s.live ? 'Transmitindo do salão principal' : when;
}
renderLive(); setInterval(renderLive, 30000);
$('play').addEventListener('click', () => { $('live-note').hidden = false; });

const RECS = [
  ['Culto de domingo', 'A mesa e o muro', '52 min', 'Pr.ª Helena Duarte'],
  ['Noite de oração', 'Silêncio que escuta', '38 min', 'Rafael Quintão'],
  ['Culto de domingo', 'Quem é o vizinho?', '49 min', 'Pr. Tiago Ávila'],
  ['Culto da noite', 'Cantos de fim de tarde', '41 min', 'Equipe de música'],
];
$('recs').innerHTML = RECS.map(([k, t, d, p]) => `<li><span class="thumb" aria-hidden="true"></span><div><b>${t}</b><span class="muted">${k} · ${p}</span></div><em>${d}</em></li>`).join('');

/* ---------- Doação ---------- */
const st = { freq: 'once', amount: 100, fund: 'geral' };
const AMOUNTS = [30, 50, 100, 250];

$('freq').innerHTML = Object.entries(FREQ).map(([k, v]) => `<button type="button" data-f="${k}" aria-pressed="${k === st.freq}">${v}</button>`).join('');
$('fund').innerHTML = Object.entries(FUNDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('amounts').innerHTML = AMOUNTS.map((a) => `<button type="button" class="pill" data-a="${a}" aria-pressed="${a === st.amount}">${brl(a)}</button>`).join('');

function paint() {
  const fee = Number.isFinite(st.amount) && st.amount >= 5 ? coverFees(st.amount) - st.amount : 0;
  const covered = $('cover').checked;
  $('cover-val').textContent = brl(fee);
  $('s-fund').textContent = FUNDS[st.fund];
  $('s-freq').textContent = FREQ[st.freq];
  $('s-fee').textContent = covered ? brl(fee) : 'não cobertas';
  $('s-total').textContent = Number.isFinite(st.amount) ? brl(st.amount + (covered ? fee : 0)) + (st.freq === 'month' ? ' / mês' : '') : '—';
  document.querySelectorAll('#freq button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === st.freq));
  document.querySelectorAll('#amounts button').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.a) === st.amount));
}

$('freq').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { st.freq = b.dataset.f; paint(); } });
$('amounts').addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) { st.amount = Number(b.dataset.a); $('amount').value = ''; paint(); } });
$('amount').addEventListener('input', () => { st.amount = $('amount').value ? parseAmount($('amount').value) : 100; paint(); });
$('fund').addEventListener('change', () => { st.fund = $('fund').value; paint(); });
$('cover').addEventListener('change', paint);

$('give').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = { ...st, name: $('name').value, email: $('email').value };
  const errs = validateGift(data);
  for (const k of ['amount', 'fund', 'freq', 'name', 'email']) { const el = $('e-' + k); if (el) el.textContent = errs[k] || ''; }
  const first = Object.keys(errs)[0];
  if (first) { ($(first) || $('amount')).focus(); return; }
  const total = st.amount + ($('cover').checked ? coverFees(st.amount) - st.amount : 0);
  $('t-name').textContent = data.name.trim().split(' ')[0];
  $('t-text').textContent = `${brl(total)}${st.freq === 'month' ? ' por mês' : ''} para ${FUNDS[st.fund]}. Isto é uma demonstração: nada foi cobrado.`;
  $('t-code').textContent = receiptCode(`${data.email}|${total}|${st.fund}`);
  $('thanks').hidden = false; $('t-close').focus();
});
$('t-close').addEventListener('click', () => { $('thanks').hidden = true; $('give').reset(); st.amount = 100; st.freq = 'once'; st.fund = 'geral'; paint(); $('submit').focus(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('thanks').hidden) $('t-close').click(); });

renderFilters(); renderAgenda(); paint();
