// =====================================================================
//  طبقة البيانات: Supabase (الإنتاج) أو Demo محلي (للتدرّب بدون خادم)
//  الواجهة واحدة في الحالتين، فلا يتغيّر كود الواجهات.
// =====================================================================
import { CONFIG } from './config.js';
import { QUESTIONS, QMAP } from './content.js';

const qs = new URLSearchParams(location.search);
export const SESSION = qs.get('s') || CONFIG.SESSION_ID;
const FORCE_DEMO = qs.get('demo') === '1';
export const IS_DEMO = FORCE_DEMO || !(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase);

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
export function deviceId() {
  if (qs.get('dev')) return 'dev-' + qs.get('dev') + '-' + SESSION;
  try { let d = localStorage.getItem('ol_device'); if (!d) { d = uid(); localStorage.setItem('ol_device', d); } return d; }
  catch { return uid(); }
}
const scoreOf = (t) => (CONFIG.TEAM_SCORING === 'total' ? t.total_xp : t.avg_xp);
function shapeBoard(teams, players) {
  const base = ['shabab', 'banat'].map(id => teams.find(t => t.team === id) || { team: id, players: 0, active_players: 0, total_xp: 0, avg_xp: 0 });
  return { teams: base.map(t => ({ ...t, score: scoreOf(t) })), players };
}

// =====================================================================
//  Demo backend  (localStorage + BroadcastChannel) — يحاكي منطق SQL
// =====================================================================
function demoBackend() {
  const KEY = 'ol_demo_' + SESSION;
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('ol_' + SESSION) : null;
  const fresh = () => ({ v: 0, state: { session_id: SESSION, slide: 0, total_slides: 1, scene_kind: 'cover', scene_title: '', scene_note: '', mode: 'slides', qid: null, phase: 'idle', duration: 20, opened_at: null, ends_at: null, break_until: null, updated_at: new Date().toISOString() },
    players: {}, answers: [], ideas: [], idea_votes: {}, qa: [], qa_votes: [], feedback: [], claims: [], secret: 'DATA2026' });
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } };
  const tx = (fn) => { const db = read(); const out = fn(db); db.v++; localStorage.setItem(KEY, JSON.stringify(db)); bc && bc.postMessage({ t: 'db', v: db.v }); notify(); return out; };
  const listeners = new Set(); let lastV = -1;
  const notify = () => { const db = read(); if (db.v === lastV) return; lastV = db.v; listeners.forEach(f => f(db.state, 0)); };
  bc && (bc.onmessage = (e) => { if (e.data?.t === 'db') notify(); if (e.data?.t === 'react') reactListeners.forEach(f => f(e.data.p)); });
  window.addEventListener('storage', (e) => { if (e.key === KEY) notify(); });
  setInterval(notify, 1000);
  const reactListeners = new Set();
  const now = () => Date.now();
  const ms = (iso) => (iso ? new Date(iso).getTime() : 0);
  const pub = (p) => ({ id: p.id, name: p.name, team: p.team, xp: p.xp, streak: p.streak, best_streak: p.best_streak, correct_count: p.correct_count, answered_count: p.answered_count });
  const rank = (db, p) => 1 + Object.values(db.players).filter(o => o.xp > p.xp).length;

  return {
    mode: 'demo',
    async getState() { return { state: read().state, offset: 0 }; },
    onState(cb) { listeners.add(cb); cb(read().state, 0); return () => listeners.delete(cb); },
    async listQuestions() { return QUESTIONS.map((q, i) => ({ id: q.id, act: q.act, sort: i + 1, body: q.body, options: q.options, media: q.media || null, duration: q.duration })); },
    async join(name, team) {
      name = (name || '').trim(); if (name.length < 2 || name.length > 40) throw new Error('invalid_name');
      return tx(db => {
        const dev = deviceId(); let p = Object.values(db.players).find(x => x.device === dev);
        if (!p) { p = { id: uid(), device: dev, name, team, xp: 0, streak: 0, best_streak: 0, correct_count: 0, answered_count: 0, created_at: new Date().toISOString() }; db.players[p.id] = p; }
        else p.name = name;
        return pub(p);
      });
    },
    async me(id) { const db = read(); const p = db.players[id]; return p ? { ...pub(p), rank: rank(db, p) } : null; },
    async answer(id, qid, choice) {
      return tx(db => {
        const p = db.players[id]; const st = db.state; const q = QMAP[qid];
        if (!p) return { ok: false, reason: 'unknown_player' };
        if (st.qid !== qid || st.phase !== 'open') return { ok: false, reason: 'closed' };
        if (st.ends_at && now() > ms(st.ends_at) + 1500) return { ok: false, reason: 'late' };
        if (db.answers.find(a => a.pid === id && a.qid === qid)) return { ok: false, reason: 'already' };
        const ok = choice === q.correct; const t = Math.max(0, now() - ms(st.opened_at));
        const pts = ok ? 10 + Math.round(5 * Math.max(0, 1 - t / (Math.max(st.duration, 1) * 1000))) : 0;
        db.answers.push({ pid: id, qid, choice, correct: ok, points: pts, ms: t });
        p.xp += pts; p.answered_count++; if (ok) { p.correct_count++; p.streak++; p.best_streak = Math.max(p.best_streak, p.streak); } else p.streak = 0;
        return { ok: true };
      });
    },
    async result(id, qid) {
      const db = read(); const st = db.state; if (st.qid !== qid || st.phase !== 'reveal') return null;
      const a = db.answers.find(x => x.pid === id && x.qid === qid); const q = QMAP[qid];
      return { answered: !!a, choice: a?.choice ?? null, correct: !!a?.correct, points: a?.points || 0, ms: a?.ms ?? null, correct_choice: q.correct, explanation: q.why || '' };
    },
    async key(qid) { const q = QMAP[qid]; return { correct: q.correct, explanation: q.why || '' }; },
    async counts(qid) { const db = read(); const out = {}; db.answers.filter(a => a.qid === qid).forEach(a => { out[a.choice] = (out[a.choice] || 0) + 1; }); return out; },
    async leaderboard() {
      const db = read(); const ps = Object.values(db.players); const teams = ['shabab', 'banat'].map(t => { const g = ps.filter(p => p.team === t); const act = g.filter(p => p.answered_count > 0);
        return { team: t, players: g.length, active_players: act.length, total_xp: g.reduce((s, p) => s + p.xp, 0), avg_xp: act.length ? Math.round(act.reduce((s, p) => s + p.xp, 0) / act.length * 10) / 10 : 0 }; });
      return shapeBoard(teams, ps.map(pub).sort((a, b) => b.xp - a.xp).slice(0, 30));
    },
    async lobby() { const db = read(); return Object.values(db.players).map(pub); },
    async ideas() { return read().ideas.filter(i => !i.hidden).sort((a, b) => b.votes - a.votes || a.created_at.localeCompare(b.created_at)); },
    async submitIdea(id, i) {
      return tx(db => { const p = db.players[id]; if (!p) return { ok: false, reason: 'unknown_player' };
        if (db.ideas.filter(x => x.player_id === id).length >= 2) return { ok: false, reason: 'limit' };
        if ((i.title || '').trim().length < 3) return { ok: false, reason: 'title' };
        db.ideas.push({ id: uid(), player_id: id, team: p.team, author: p.name, title: i.title.trim().slice(0, 80), problem: (i.problem || '').slice(0, 300), solution: (i.solution || '').slice(0, 300), tech: (i.tech || '').slice(0, 80), votes: 0, hidden: false, created_at: new Date().toISOString() });
        p.xp += 10; return { ok: true }; });
    },
    async voteIdea(id, ideaId) {
      return tx(db => { const p = db.players[id]; const idea = db.ideas.find(x => x.id === ideaId); if (!p || !idea) return { ok: false, reason: 'invalid' };
        if (idea.player_id === id) return { ok: false, reason: 'own' };
        const prev = db.idea_votes[id]; db.idea_votes[id] = ideaId; if (!prev) p.xp += 2;
        db.ideas.forEach(x => { x.votes = Object.values(db.idea_votes).filter(v => v === x.id).length; }); return { ok: true, idea: ideaId }; });
    },
    async myVote(id) { return read().idea_votes[id] || null; },
    async qaList() { return read().qa.filter(q => q.status !== 'hidden').sort((a, b) => b.votes - a.votes || a.created_at.localeCompare(b.created_at)); },
    async ask(id, body) {
      return tx(db => { const p = db.players[id]; if (!p) return { ok: false, reason: 'unknown_player' }; body = (body || '').trim();
        if (body.length < 3) return { ok: false, reason: 'short' }; const n = db.qa.filter(x => x.player_id === id).length; if (n >= 5) return { ok: false, reason: 'limit' };
        db.qa.push({ id: uid(), player_id: id, author: p.name, team: p.team, body: body.slice(0, 280), votes: 0, status: 'new', created_at: new Date().toISOString() });
        if (n < 3) p.xp += 5; return { ok: true }; });
    },
    async voteQa(id, qid) {
      return tx(db => { const q = db.qa.find(x => x.id === qid); if (!q || !db.players[id]) return { ok: false }; const k = id + '|' + qid; const has = !!db.qa_votes[k];
        if (has) delete db.qa_votes[k]; else db.qa_votes[k] = 1; q.votes = Object.keys(db.qa_votes).filter(x => x.endsWith('|' + qid)).length; return { ok: true, voted: !has }; });
    },
    async myQaVotes(id) { return Object.keys(read().qa_votes).filter(k => k.startsWith(id + '|')).map(k => k.split('|')[1]); },
    async markQa(qid, status) { return tx(db => { const q = db.qa.find(x => x.id === qid); if (q) q.status = status; }); },
    async feedback(id, f) {
      return tx(db => { const p = db.players[id]; if (!p) return { ok: false }; if (db.feedback.find(x => x.pid === id)) return { ok: true, new: false };
        db.feedback.push({ pid: id, ...f }); p.xp += 10; return { ok: true, new: true }; });
    },
    async redeem(id, code) {
      return tx(db => { const p = db.players[id]; if (!p) return { ok: false, reason: 'unknown_player' }; if (db.state.mode !== 'finale') return { ok: false, reason: 'not_yet' };
        if ((code || '').trim().toUpperCase() !== db.secret.toUpperCase()) return { ok: false, reason: 'wrong' };
        if (db.claims.includes(id)) return { ok: true, new: false }; db.claims.push(id); p.xp += 20; return { ok: true, new: true }; });
    },
    async secretCode() { return read().secret; },
    sendReaction(p) { bc && bc.postMessage({ t: 'react', p }); reactListeners.forEach(f => f(p)); },
    onReaction(cb) { reactListeners.add(cb); return () => reactListeners.delete(cb); },
    // --- presenter ---
    async login(email, pw) { if (pw === CONFIG.DEMO_PRESENTER_PASS) { sessionStorage.setItem('ol_admin', '1'); return { ok: true }; } return { ok: false, error: 'كلمة المرور غير صحيحة' }; },
    async isAdmin() { return sessionStorage.getItem('ol_admin') === '1'; },
    async logout() { sessionStorage.removeItem('ol_admin'); },
    async goto(s) {
      return tx(db => { Object.assign(db.state, { slide: s.slide, total_slides: s.total, scene_kind: s.kind, scene_title: s.title || '', scene_note: s.note || '', mode: s.mode, qid: s.qid || null, phase: 'idle', duration: s.duration || 20, opened_at: null, ends_at: null,
        break_until: s.breakMinutes ? new Date(now() + s.breakMinutes * 60000).toISOString() : null, updated_at: new Date().toISOString() }); });
    },
    async openQuestion(qid, duration) {
      return tx(db => { const d = duration || QMAP[qid].duration || 20; Object.assign(db.state, { mode: 'quiz', qid, phase: 'open', duration: d, opened_at: new Date().toISOString(), ends_at: new Date(now() + d * 1000).toISOString(), updated_at: new Date().toISOString() }); });
    },
    async setPhase(phase) { return tx(db => { db.state.phase = phase; if ((phase === 'closed' || phase === 'reveal') && ms(db.state.ends_at) > now()) db.state.ends_at = new Date().toISOString(); db.state.updated_at = new Date().toISOString(); }); },
    async reset() { return tx(db => { const f = fresh(); Object.assign(db, f, { v: db.v }); }); },
  };
}

// =====================================================================
//  Supabase backend
// =====================================================================
function supaBackend() {
  const client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true }, realtime: { params: { eventsPerSecond: 10 } } });
  const rpc = async (fn, args) => { const { data, error } = await client.rpc(fn, args); if (error) throw new Error(error.message); return data; };
  const sel = async (q) => { const { data, error } = await q; if (error) throw new Error(error.message); return data; };
  let offset = 0; let lastState = null; const listeners = new Set(); let pollMs = 3000; let timer = null;
  async function refresh() {
    try { const r = await rpc('get_state', { p_session: SESSION }); if (!r) return; offset = new Date(r.server_now).getTime() - Date.now();
      const s = r.state; const key = JSON.stringify(s); if (key !== lastState) { lastState = key; listeners.forEach(f => f(s, offset)); } } catch (e) { console.warn('state', e.message); }
  }
  function startPolling() { if (timer) return; const tick = async () => { if (!document.hidden) await refresh(); timer = setTimeout(tick, pollMs); }; tick(); }
  const stateCh = client.channel('state-' + SESSION).on('postgres_changes', { event: '*', schema: 'public', table: 'session_state', filter: 'session_id=eq.' + SESSION }, () => refresh()).subscribe();
  const reactCh = client.channel('react-' + SESSION, { config: { broadcast: { self: true } } });
  const reactListeners = new Set();
  reactCh.on('broadcast', { event: 'react' }, ({ payload }) => reactListeners.forEach(f => f(payload))).subscribe();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

  return {
    mode: 'supabase', client,
    async getState() { await refresh(); return { state: JSON.parse(lastState), offset }; },
    onState(cb) { listeners.add(cb); startPolling(); if (lastState) cb(JSON.parse(lastState), offset); return () => listeners.delete(cb); },
    async listQuestions() { return sel(client.from('questions').select('id,act,sort,body,options,media,duration').order('sort')); },
    async join(name, team) { return rpc('join_player', { p_session: SESSION, p_device: deviceId(), p_name: name, p_team: team }); },
    async me(id) { return rpc('my_stats', { p_player: id }); },
    async answer(id, qid, choice) { return rpc('submit_answer', { p_player: id, p_qid: qid, p_choice: choice }); },
    async result(id, qid) { return rpc('get_result', { p_player: id, p_qid: qid }); },
    async key(qid) { return rpc('get_key', { p_session: SESSION, p_qid: qid }); },
    async counts(qid) { const rows = await rpc('answer_counts', { p_session: SESSION, p_qid: qid }); const o = {}; (rows || []).forEach(r => { o[r.choice] = r.n; }); return o; },
    async leaderboard() {
      const [teams, players] = await Promise.all([sel(client.from('team_scores').select('*').eq('session_id', SESSION)),
        sel(client.from('players_public').select('*').eq('session_id', SESSION).order('xp', { ascending: false }).limit(30))]);
      return shapeBoard(teams, players);
    },
    async lobby() { return sel(client.from('players_public').select('*').eq('session_id', SESSION).order('created_at', { ascending: false }).limit(500)); },
    async ideas() { return sel(client.from('ideas').select('*').eq('session_id', SESSION).order('votes', { ascending: false }).order('created_at')); },
    async submitIdea(id, i) { return rpc('submit_idea', { p_player: id, p_title: i.title, p_problem: i.problem || '', p_solution: i.solution || '', p_tech: i.tech || '' }); },
    async voteIdea(id, ideaId) { return rpc('vote_idea', { p_player: id, p_idea: ideaId }); },
    async myVote(id) { return rpc('my_vote', { p_player: id }); },
    async qaList() { return sel(client.from('qa').select('*').eq('session_id', SESSION).neq('status', 'hidden').order('votes', { ascending: false }).order('created_at')); },
    async ask(id, body) { return rpc('ask_question', { p_player: id, p_body: body }); },
    async voteQa(id, qid) { return rpc('vote_qa', { p_player: id, p_qa: qid }); },
    async myQaVotes(id) { const rows = await rpc('my_qa_votes', { p_player: id }); return (rows || []).map(r => r.qa_id); },
    async markQa(qid, status) { return sel(client.from('qa').update({ status }).eq('id', qid)); },
    async feedback(id, f) { return rpc('submit_feedback', { p_player: id, p_rating: f.rating, p_clarity: f.clarity, p_best: f.best || '', p_more: f.more || '' }); },
    async redeem(id, code) { return rpc('redeem_code', { p_player: id, p_code: code }); },
    async secretCode() { const rows = await sel(client.from('sessions').select('secret_code').eq('id', SESSION)); return rows?.[0]?.secret_code || ''; },
    sendReaction(p) { reactCh.send({ type: 'broadcast', event: 'react', payload: p }); },
    onReaction(cb) { reactListeners.add(cb); return () => reactListeners.delete(cb); },
    async login(email, pw) { const { error } = await client.auth.signInWithPassword({ email, password: pw }); if (error) return { ok: false, error: error.message }; return (await this.isAdmin()) ? { ok: true } : { ok: false, error: 'هذا الحساب ليس ضمن المقدّمين (admins)' }; },
    async isAdmin() { const { data } = await client.auth.getSession(); if (!data.session) return false; const { data: rows } = await client.from('admins').select('user_id'); return !!(rows && rows.length); },
    async logout() { await client.auth.signOut(); },
    async goto(s) { await rpc('admin_goto', { p_session: SESSION, p_slide: s.slide, p_total: s.total, p_kind: s.kind, p_title: s.title || '', p_note: s.note || '', p_mode: s.mode, p_qid: s.qid || null, p_duration: s.duration || 20, p_break_minutes: s.breakMinutes || null }); refresh(); },
    async openQuestion(qid, duration) { await rpc('admin_open_question', { p_session: SESSION, p_qid: qid, p_duration: duration || null }); refresh(); },
    async setPhase(phase) { await rpc('admin_set_phase', { p_session: SESSION, p_phase: phase }); refresh(); },
    async reset() { await rpc('admin_reset', { p_session: SESSION }); refresh(); },
  };
}

export const api = IS_DEMO ? demoBackend() : supaBackend();
export const serverNow = (offset) => Date.now() + (offset || 0);
