/**
 * Community desk. Records come from the server.
 * Do not put opt-in files, notes, or keys in this script.
 */

const state = {
  health: null,
  board: null,
  me: null,
  error: '',
  formError: '',
  justSaved: '',
  celebrate: false,
  selectedDate: '',
  saving: false,
  roster: null,
  importResult: null,
};

const app = document.querySelector('#app');
const status = document.querySelector('#status');

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('x-pen-request', '1');
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'same-origin',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'The desk could not do that.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function setStatus(text) {
  status.textContent = text;
}

function render() {
  app.replaceChildren();
  if (state.health?.locked) {
    setStatus('This desk is locked.');
    app.append(gateForm());
    return;
  }
  if (state.error && !state.board) {
    setStatus(state.error);
    return;
  }
  const bits = ['Progress is kept in the server ledger, not in this browser.'];
  if (state.health && state.health.siteGate === false) {
    bits.push('No site access code is set. That is fine on your own computer, and not fine on the public internet.');
  }
  setStatus(bits.join(' '));
  if (state.board) {
    app.append(room(state.board), legend(), state.me ? editor(state.me) : opener(state.board), keeper());
  }
}

function gateForm() {
  return el('form', { class: 'panel', onsubmit: submitGate },
    el('h2', { text: 'This desk is locked' }),
    el('p', { text: 'Enter the site code. The board stays hidden until then.' }),
    el('label', { text: 'Site code' }, el('input', { type: 'password', name: 'code', autocomplete: 'current-password', required: true })),
    state.formError ? el('p', { class: 'error', text: state.formError }) : null,
    el('div', { class: 'actions' }, el('button', { type: 'submit', text: 'Unlock' })),
  );
}

async function submitGate(event) {
  event.preventDefault();
  state.formError = '';
  try {
    await api('/api/access', { method: 'POST', body: { code: new FormData(event.currentTarget).get('code') } });
    state.health = await api('/api/health');
    state.board = await api('/api/board');
  } catch (error) {
    state.formError = error.message;
  }
  render();
}

function room(board) {
  const section = el('section', {},
    el('p', { class: 'clock', text: board.clock }),
    el('h2', { text: 'The room' }),
    el('p', { class: 'room-copy', text: board.group.text }),
  );
  if (board.members.length === 0) {
    section.append(
      el('div', { class: 'panel' },
        el('h3', { text: 'No opt-ins on the desk yet' }),
        el('p', { text: 'Nothing here is a sample writer, a sample goal, or a sample total. When a private opt-in file is imported on the server, display names appear. Comments, profile links, and manuscript notes do not.' }),
        el('p', { text: 'Unreported days stay unreported. A rest day is allowed. A day that has not arrived is not counted.' }),
      ),
    );
  } else {
    section.append(el('p', { text: 'Alphabetical, so you can find your name. The order is not a score.' }));
    if (board.group.entriesToday > 0) {
      section.append(el('p', { text: `Entries saved today: ${board.group.entriesToday}.` }));
    }
    for (const line of board.group.units.map((unit) => unit.line)) section.append(el('p', { text: line }));
    section.append(el('div', { class: 'cards' }, board.members.map(card)));
  }
  section.append(calendar(board.calendar));
  return section;
}

function card(member) {
  const article = el('article', { class: 'card' },
    el('h3', { text: member.displayName }),
    ...member.lines.map((line) => el('p', { class: 'line', text: line })),
  );
  if (member.tracking) article.append(el('p', { class: 'pace', text: member.paceText }));
  const bar = meter(member);
  if (bar) article.append(bar);
  if (member.milestoneText) article.append(el('p', { class: 'ribbon', text: member.milestoneText }));
  if (member.tracking) {
    article.append(el('details', {},
      el('summary', { text: 'November days' }),
      dayList(member, false),
    ));
  }
  return article;
}

function meter(member) {
  if (member.completionRatio == null || member.completionRatio <= 0) return null;
  const width = Math.max(0, Math.min(100, member.completionRatio * 100));
  const label = member.lines.find((line) => line.includes('%')) || 'Progress toward the goal you set';
  const bar = el('div', {
    class: 'meter',
    role: 'meter',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': String(Math.round(width)),
    'aria-label': label,
  });
  const fill = document.createElement('span');
  fill.style.width = `${width}%`;
  fill.setAttribute('aria-hidden', 'true');
  bar.append(fill);
  return bar;
}

function calendar(month) {
  const labels = el('div', { class: 'dow-row' }, month.weekdayLabels.map((label) => el('div', { class: 'dow', text: label })));
  const cells = month.cells.map((cell) => {
    const item = el('li', { class: cell.isToday ? 'today' : cell.isFuture ? 'ahead' : '' });
    item.append(el('span', { text: String(cell.dayOfMonth) }));
    if (cell.isToday) item.append(el('span', { class: 'today-word', text: 'Today' }));
    item.setAttribute('aria-label', cell.isToday ? `${cell.label}, today` : cell.isFuture ? `${cell.label}, ahead, not counted` : cell.label);
    return item;
  });
  const grid = el('ol', { class: 'cal' });
  for (let i = 0; i < month.lead; i += 1) grid.append(el('li', { 'aria-hidden': 'true' }));
  for (const cell of cells) grid.append(cell);
  return el('section', { class: 'panel' },
    el('h2', { text: month.title }),
    el('p', { text: month.caption }),
    labels,
    grid,
  );
}

function legend() {
  return el('section', { class: 'legend' },
    el('h2', { text: 'How a day is marked' }),
    el('ul', {},
      el('li', { text: 'Today — the date on this desk.' }),
      el('li', { text: 'Ahead — the day has not arrived, so it is not counted.' }),
      el('li', { text: 'Unreported — inside your goal window, with no entry. Not a zero.' }),
      el('li', { text: 'Logged — a number you saved, including a zero if you saved one.' }),
      el('li', { text: 'Rest — a rest day. It adds nothing, and it is not a zero.' }),
      el('li', { text: 'Before start — outside the start date you chose. Not counted.' }),
      el('li', { text: 'Not counting — no start date yet, so the month is not a record.' }),
    ),
  );
}

function opener(board) {
  if (board.members.length === 0) return el('p', { class: 'help', text: 'When names are on the desk, each writer opens only their own with a private key. Choosing a name does nothing by itself.' });
  const options = [el('option', { value: '', text: 'Choose your name' })].concat(
    board.members.map((member) => el('option', { value: member.id, text: member.displayName })),
  );
  return el('form', { class: 'panel', onsubmit: submitLogin },
    el('h2', { text: 'Open your desk' }),
    el('p', { text: 'Choose your display name and enter the private key the keeper gave you. The name alone cannot change a record.' }),
    el('label', { text: 'Display name' }, el('select', { name: 'participantId', required: true }, options)),
    el('label', { text: 'Private key' }, el('input', { name: 'editKey', type: 'password', autocomplete: 'current-password', spellcheck: 'false', required: true })),
    state.formError ? el('p', { class: 'error', text: state.formError }) : null,
    el('div', { class: 'actions' }, el('button', { type: 'submit', text: 'Open my desk' })),
  );
}

async function submitLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.formError = '';
  state.saving = true;
  try {
    await api('/api/session', { method: 'POST', body: { participantId: form.get('participantId'), editKey: form.get('editKey') } });
    state.me = await api('/api/me');
    state.justSaved = '';
    state.celebrate = false;
  } catch (error) {
    state.formError = error.message;
  } finally {
    state.saving = false;
  }
  render();
}

function editor(me) {
  const unit = el('select', { name: 'unit', id: 'unit', required: true },
    el('option', { value: '', text: 'Choose a unit' }),
    ...['words', 'chapters', 'scenes', 'sessions', 'minutes', 'custom'].map((value) => {
      const option = el('option', { value, text: value });
      if (me.unit === value) option.selected = true;
      return option;
    }),
  );
  const custom = el('input', { name: 'customUnitLabel', value: me.customUnitLabel || '', maxlength: '24' });
  const customWrap = el('label', { text: 'Custom unit name' }, custom);
  customWrap.hidden = me.unit !== 'custom';
  unit.addEventListener('change', () => { customWrap.hidden = unit.value !== 'custom'; });
  const goal = el('input', { name: 'goal', type: 'number', min: '0', step: 'any', inputmode: 'decimal', required: true });
  const baseline = el('input', { name: 'baseline', type: 'number', min: '0', step: 'any', inputmode: 'decimal', required: true });
  if (me.goal != null) goal.value = String(me.goal);
  if (me.baseline != null) baseline.value = String(me.baseline);
  const start = el('input', { name: 'startDate', type: 'date', min: '2026-11-01', max: '2026-11-30', required: true });
  if (me.startDate) start.value = me.startDate;

  const section = el('section', { class: 'panel' },
    el('h2', { text: 'Your desk' }),
    el('p', { text: me.displayName }),
  );
  if (me.statedGoals || me.progressNote) {
    section.append(el('div', { class: 'note' },
      el('h3', { text: 'Kept off the community board' }),
      el('p', { text: 'This note is not a November total. It is not counted. Use it only to remember what you meant to do, then set the numbers yourself.' }),
      me.statedGoals ? el('p', { text: me.statedGoals }) : null,
      me.progressNote ? el('p', { text: me.progressNote }) : null,
    ));
  }
  if (state.justSaved) {
    section.append(el('p', { class: state.celebrate ? 'ribbon just-now' : 'ribbon', role: 'status', text: state.justSaved }));
  }
  section.append(el('form', { onsubmit: savePlan },
    el('p', { class: 'help', text: 'The desk did not turn an opt-in into a target. A manuscript total is not automatically your baseline. Type a zero only if you mean zero.' }),
    el('label', { text: 'Unit' }, unit),
    customWrap,
    el('div', { class: 'fields two' },
      el('label', { text: 'Goal, including baseline' }, goal),
      el('label', { text: 'Baseline already done' }, baseline),
    ),
    el('label', { text: 'Start date' }, start),
    el('p', { class: 'help', text: 'The first day that counts. Earlier November days stay outside the goal. Later days are not treated as missed.' }),
    state.formError ? el('p', { class: 'error', text: state.formError }) : null,
    el('div', { class: 'actions' },
      el('button', { type: 'submit', text: 'Save my goal', disabled: state.saving }),
      el('button', { type: 'button', class: 'quiet', text: 'Close my desk', onclick: logout }),
    ),
  ));
  section.append(me.tracking ? dayEditor(me) : el('p', { class: 'help', text: 'Days stay off the record until a unit, a baseline, a goal, and a start date are saved.' }));
  return section;
}

function dayEditor(me) {
  const selected = me.days.find((day) => day.date === state.selectedDate) || me.days.find((day) => day.date === state.boardToday()) || me.days[0];
  return el('div', {},
    el('h3', { text: 'November days' }),
    dayList(me, true),
    selected ? dayForm(selected) : null,
  );
}

function dayList(member, interactive) {
  const labels = state.board?.calendar.weekdayLabels || [];
  return el('div', { class: 'daylist' }, member.days.map((day) => {
    const text = `${labels[day.weekday] || ''} ${day.dayOfMonth}: ${day.mark}`;
    if (!interactive) return el('div', { class: 'dayrow', text });
    return el('button', {
      type: 'button',
      class: 'dayrow',
      'data-date': day.date,
      'aria-pressed': state.selectedDate === day.date ? 'true' : 'false',
      'aria-label': `${day.label}. ${day.mark}.`,
      onclick: () => { state.selectedDate = day.date; state.formError = ''; render(); },
    }, el('span', { class: 'num', text: String(day.dayOfMonth) }), el('span', { text: day.mark }));
  }));
}

function dayForm(day) {
  const future = day.kind === 'future';
  const before = day.kind === 'before-start';
  const box = el('div', { class: 'panel' }, el('h3', { text: day.label }), el('p', { text: day.mark }));
  if (future) {
    box.append(el('p', { text: 'This day has not arrived, so it cannot be logged and it is not counted.' }));
    return box;
  }
  if (before) {
    box.append(el('p', { text: 'This day is before your start date, so it is not counted.' }));
  }
  const input = el('input', { name: 'value', type: 'number', min: '0', step: 'any', inputmode: 'decimal' });
  if (day.kind === 'logged' && day.value != null) input.value = String(day.value);
  box.append(
    el('label', { text: 'Amount for this day only' }, input),
    el('p', { class: 'help', text: 'Leave this empty if you do not want a number. Empty is not saved as zero.' }),
    state.formError ? el('p', { class: 'error', text: state.formError }) : null,
    el('div', { class: 'day-actions' },
      el('button', { type: 'button', text: 'Log this number', disabled: future || state.saving, onclick: () => saveDay(day.date, input.value, false) }),
      el('button', { type: 'button', class: 'moss', text: 'Mark as a rest day', disabled: future || state.saving, onclick: () => saveDay(day.date, '', true) }),
      el('button', { type: 'button', class: 'quiet', text: 'Clear this day', disabled: future || state.saving, onclick: () => clearDay(day.date) }),
    ),
  );
  return box;
}

async function savePlan(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const unit = String(form.get('unit') || '');
  const goalText = String(form.get('goal') || '').trim();
  const baselineText = String(form.get('baseline') || '').trim();
  const startDate = String(form.get('startDate') || '');
  if (!unit || goalText === '' || baselineText === '' || !startDate) {
    state.formError = 'Not saved. Choose a unit, a baseline, a goal, and a start date. Leave a box empty rather than inventing a zero.';
    render();
    return;
  }
  const before = new Set(state.me?.milestones || []);
  state.saving = true;
  try {
    state.me = await api('/api/me/plan', {
      method: 'PUT',
      body: {
        unit,
        customUnitLabel: unit === 'custom' ? form.get('customUnitLabel') : null,
        goal: Number(goalText),
        baseline: Number(baselineText),
        startDate,
      },
    });
    state.board = await api('/api/board');
    const crossed = (state.me.milestones || []).filter((level) => !before.has(level));
    state.celebrate = crossed.length > 0;
    state.justSaved = state.celebrate ? state.me.milestoneText : 'Goal saved.';
    state.formError = '';
  } catch (error) {
    state.formError = `Not saved. ${error.message}`;
  } finally {
    state.saving = false;
  }
  render();
}

async function saveDay(date, raw, rest) {
  if (!rest && String(raw).trim() === '') {
    state.formError = 'Not saved. Type a number, mark a rest day, or leave the day unreported.';
    render();
    return;
  }
  const hadLogs = (state.me?.counts.logged || 0) > 0;
  const before = new Set(state.me?.milestones || []);
  state.saving = true;
  try {
    state.me = await api(`/api/me/days/${date}`, {
      method: 'PUT',
      body: rest ? { rest: true } : { rest: false, value: Number(raw) },
    });
    state.board = await api('/api/board');
    const crossed = (state.me.milestones || []).filter((level) => !before.has(level));
    state.celebrate = crossed.length > 0;
    if (state.celebrate) state.justSaved = state.me.milestoneText;
    else if (!hadLogs && state.me.counts.logged > 0) state.justSaved = 'First entry saved. The month has a mark in it.';
    else if (rest) state.justSaved = 'Rest day saved. It is not a zero.';
    else state.justSaved = 'Day saved.';
    state.formError = '';
    state.selectedDate = date;
  } catch (error) {
    state.formError = `Not saved. ${error.message}`;
  } finally {
    state.saving = false;
  }
  render();
}

async function clearDay(date) {
  state.saving = true;
  try {
    state.me = await api(`/api/me/days/${date}`, { method: 'DELETE' });
    state.board = await api('/api/board');
    state.justSaved = 'Day cleared. It is unreported again, not zero.';
    state.celebrate = false;
    state.formError = '';
    state.selectedDate = date;
  } catch (error) {
    state.formError = `Not saved. ${error.message}`;
  } finally {
    state.saving = false;
  }
  render();
}

async function logout() {
  await api('/api/session/logout', { method: 'POST' }).catch(() => {});
  state.me = null;
  state.justSaved = '';
  state.celebrate = false;
  state.formError = '';
  render();
}

function keeper() {
  const body = el('div', {},
    el('p', { text: 'Import and backup stay on the server. The opt-in file is not part of this page. Numeric totals in a file are not applied. Names held for review are not enrolled.' }),
  );
  if (state.health && state.health.adminConfigured === false) {
    body.append(el('p', { text: 'Keeper tools are off until ADMIN_TOKEN is set on the server. This draft does not ship a token.' }));
  } else {
    body.append(el('form', { onsubmit: unlockKeeper },
      el('label', { text: 'Keeper token' }, el('input', { name: 'token', type: 'password', autocomplete: 'current-password' })),
      el('div', { class: 'actions' }, el('button', { type: 'submit', class: 'quiet', text: 'Unlock keeper tools' })),
    ));
    body.append(el('form', { onsubmit: importFile },
      el('label', { text: 'Private opt-in file' }, el('input', { name: 'file', type: 'file', accept: 'application/json,.json' })),
      el('div', { class: 'actions' }, el('button', { type: 'submit', text: 'Import opt-ins' })),
    ));
    body.append(el('div', { class: 'actions' },
      el('button', { type: 'button', class: 'quiet', text: 'Load keeper list', onclick: loadRoster }),
      el('button', { type: 'button', class: 'quiet', text: 'Download backup', onclick: downloadBackup }),
    ));
  }
  if (state.importResult) body.append(importSummary(state.importResult));
  if (state.roster) body.append(rosterView(state.roster));
  if (state.formError && state.me == null && state.board) {
    /* form errors for the opener are rendered there; keeper uses importResult */
  }
  return el('details', { class: 'keeper' }, el('summary', { text: 'Keeper’s drawer' }), body);
}

function importSummary(result) {
  const box = el('div', {},
    el('p', { text: `Enrolled ${result.enrolled.length}. Held for review ${result.held.length}. Numeric values ignored: ${result.ignoredNumericValues}. Empty numeric fields left unset: ${result.emptyNumericFields}.` }),
  );
  for (const line of result.statements || []) box.append(el('p', { text: line }));
  const created = (result.enrolled || []).filter((person) => person.editKey);
  if (created.length) {
    const list = el('ul', {}, created.map((person) => el('li', { text: `${person.displayName}: ${person.editKey}` })));
    box.append(el('details', {}, el('summary', { text: 'New private keys. Not shown on the community board.' }), list));
  }
  if (result.held?.length) box.append(el('p', { text: `Held, not enrolled: ${result.held.map((person) => person.displayName).join(', ')}.` }));
  return box;
}

function rosterView(roster) {
  const box = el('div', {},
    el('p', { text: `${roster.enrolled.length} enrolled. ${roster.held.length} held for review and not on the board.` }),
  );
  const notes = el('div', {});
  for (const person of roster.enrolled) {
    notes.append(el('h3', { text: person.displayName }));
    notes.append(el('p', { text: person.statedGoals || 'No stated-goal note stored.' }));
    notes.append(el('p', { text: person.progressNote || 'No progress note stored.' }));
    notes.append(el('p', { text: `Goal on the desk: ${person.goal == null ? 'not set' : person.goal}. Days stored: ${person.logCount}.` }));
  }
  for (const hold of roster.held) {
    notes.append(el('h3', { text: `${hold.displayName} — held, not enrolled` }));
    notes.append(el('p', { text: hold.note }));
  }
  box.append(el('details', {}, el('summary', { text: 'Private notes for keeper review. Not shown on the community board.' }), notes));
  return box;
}

async function unlockKeeper(event) {
  event.preventDefault();
  const token = new FormData(event.currentTarget).get('token');
  event.currentTarget.reset();
  try {
    await api('/api/admin/session', { method: 'POST', body: { token } });
    state.importResult = { enrolled: [], held: [], ignoredNumericValues: 0, emptyNumericFields: 0, statements: ['Keeper tools are open for this browser session.'] };
  } catch (error) {
    state.importResult = { enrolled: [], held: [], ignoredNumericValues: 0, emptyNumericFields: 0, statements: [error.message] };
  }
  render();
}

async function importFile(event) {
  event.preventDefault();
  const file = event.currentTarget.file?.files?.[0] || event.currentTarget.querySelector('input[type=file]')?.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    state.importResult = await api('/api/admin/import', { method: 'POST', body: payload });
    state.board = await api('/api/board');
    event.currentTarget.reset();
  } catch (error) {
    state.importResult = { enrolled: [], held: [], ignoredNumericValues: 0, emptyNumericFields: 0, statements: [error.message] };
  }
  render();
}

async function loadRoster() {
  try {
    state.roster = await api('/api/admin/roster');
  } catch (error) {
    state.importResult = { enrolled: [], held: [], ignoredNumericValues: 0, emptyNumericFields: 0, statements: [error.message] };
  }
  render();
}

async function downloadBackup() {
  const headers = new Headers();
  headers.set('x-pen-request', '1');
  const response = await fetch('/api/admin/backup', { headers, credentials: 'same-origin' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    state.importResult = { enrolled: [], held: [], ignoredNumericValues: 0, emptyNumericFields: 0, statements: [data.error || 'The backup did not download.'] };
    render();
    return;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: 'invisible-pen-november-backup.json' });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

state.boardToday = () => state.board?.today || '';

async function init() {
  try {
    state.health = await api('/api/health');
    if (!state.health.locked) {
      state.board = await api('/api/board');
      try {
        state.me = await api('/api/me');
      } catch (error) {
        if (error.status !== 401) throw error;
      }
    }
  } catch (error) {
    state.error = 'The ledger did not answer. Refresh the page. This browser has not stored the month.';
  }
  render();
}

init();
