// =====================================================================
//  تطبيق الطلبة (الهاتف)
// =====================================================================
import { api, SESSION, IS_DEMO, serverNow } from './api.js';
import { CAREERS, YEARS, TEAMS, BADGES, LEVELS, PRESENTER } from './content.js';
import { PICS } from './pics.js';
import { Stage3D } from './stage3d.js';
import { $, $$, esc, en, icon, toast, countUp, confetti, levelOf, earnedBadges, badgeHtml, teamChip, countdown, mmss, nf, sleep } from './ui.js';

const view = $('#view'); const DEVQ = new URLSearchParams(location.search).get('dev') || ''; const PKEY = 'ol_pid_' + SESSION + (DEVQ ? '_' + DEVQ : ''); const XKEY = (id) => 'ol_extra_' + id; const AKEY = (id) => 'ol_ans_' + id;
let pid = localStorage.getItem(PKEY) || null; let me = null; let st = null; let offset = 0; let tab = 'live'; let sub = 'galaxy';
let questions = {}; let extra = {}; let answers = {}; let stopTimer = null; let poll = null; let lastKey = ''; let stage = null; let busy = false; let sel = null; let year = 1; let rid = 0;
const store = {
  load() { try { extra = JSON.parse(localStorage.getItem(XKEY(pid)) || '{}'); } catch { extra = {}; } try { answers = JSON.parse(localStorage.getItem(AKEY(pid)) || '{}'); } catch { answers = {}; } },
  saveExtra() { try { localStorage.setItem(XKEY(pid), JSON.stringify(extra)); } catch { } },
  saveAns() { try { localStorage.setItem(AKEY(pid), JSON.stringify(answers)); } catch { } },
};
const flag = (k) => { if (!extra[k]) { extra[k] = 1; store.saveExtra(); const b = BADGES.find(x => x.id === k); if (b) toast('شارة جديدة: ' + b.name, 'ok'); } };

// ---------- 3D خلفية ثابتة ----------
function initStage() {
  try { stage = new Stage3D($('#c3d'), $('#labels'), { onSelect: (id) => { sel = id; if (extra.seen === undefined) extra.seen = []; if (!extra.seen.includes(id)) { extra.seen.push(id); store.saveExtra(); if (extra.seen.length >= 4) flag('explorer'); } if (tab === 'explore' || isStageKind()) renderExplore(true); } }); if (!stage.ok) stage = null; } catch (e) { console.warn(e); stage = null; }
}
const KIND_STAGE = { galaxy: 'galaxy', roadmap: 'roadmap', venn: 'venn', leader: 'podium', podium: 'podium' };
const isStageKind = () => st && ['galaxy', 'roadmap', 'venn'].includes(st.scene_kind) && tab === 'live';
function setStage(mode) { if (stage && stage.mode !== mode) stage.setMode(mode); }

// ---------- أدوات ----------
const initials = (n) => (n || '؟').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('');
async function refreshMe(anim = true) {
  if (!pid) return; const prev = me; const m = await api.me(pid).catch(() => null);
  if (!m) { localStorage.removeItem(PKEY); pid = null; me = null; showJoin(); return; }
  me = m; $('#top').hidden = false; $('#tabs').hidden = false; const lv = levelOf(me.xp);
  $('#av').textContent = initials(me.name); $('#av').className = 'av ' + me.team; $('#whoName').textContent = me.name; $('#whoLvl').textContent = `${lv.cur.name} · ${lv.cur.en}`;
  const el = $('#xpv'); if (prev && me.xp > prev.xp && anim) { countUp(el, me.xp, { from: prev.xp, dur: 700 }); $('#xpill').classList.remove('bump'); void $('#xpill').offsetWidth; $('#xpill').classList.add('bump'); } else el.textContent = nf(me.xp);
  if (prev && levelOf(prev.xp).i < lv.i) levelUp(lv.cur);
}
function levelUp(l) {
  confetti(220, { x: .5, y: .4 }); const d = document.createElement('div'); d.className = 'lvlup';
  d.innerHTML = `<div class="box">${icon(l.icon, 64)}<h2 style="margin:10px 0 2px;font-size:26px">مستوى جديد!</h2><div style="font-size:22px;font-weight:800;color:var(--green)">${esc(l.name)}</div><div class="en" style="color:var(--muted)">${esc(l.en)}</div><button class="btn green" style="margin-top:16px">رائع</button></div>`;
  document.body.appendChild(d); d.onclick = () => d.remove(); setTimeout(() => d.remove(), 5000);
}
async function loadQuestions() { try { (await api.listQuestions()).forEach(q => { questions[q.id] = q; }); } catch (e) { console.warn(e); } }

// ---------- الانضمام ----------
function showJoin() {
  stopTimer && stopTimer(); setStage('network'); $('#top').hidden = true; $('#tabs').hidden = true; let team = null;
  view.innerHTML = `<div class="hero rise"><div class="logo">${icon('brain-circuit', 42)}</div><h1>رحلة ${en('Data Science')} و${en('AI')}</h1><p>${esc(PRESENTER.org)}<br>${esc(PRESENTER.date)}</p></div>
  <div class="card rise" style="animation-delay:.1s"><label class="f" for="nm">اسمك (يظهر في الترتيب)</label><input type="text" id="nm" maxlength="30" autocomplete="off" placeholder="مثال: ليان">
  <label class="f">اختر فريقك</label><div class="teams"><button data-team="shabab"><span class="big">${icon('users', 30)}</span>الشباب<small>${en('Team Blue')}</small></button><button data-team="banat"><span class="big">${icon('users-round', 30)}</span>البنات<small>${en('Team Green')}</small></button></div>
  <div class="err" id="err"></div><button class="btn green" id="go" style="width:100%;font-size:18px">${icon('rocket', 20)} ابدأ الرحلة</button></div>
  <p class="rise" style="text-align:center;color:var(--muted);font-size:13px;animation-delay:.2s">اجمع نقاطًا لفريقك: أجب بسرعة، شارك بأفكارك، واسأل. الفريق الأعلى متوسطًا يفوز.</p>`;
  $$('.teams button').forEach(b => b.onclick = () => { team = b.dataset.team; $$('.teams button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#go').onclick = async () => {
    const name = $('#nm').value.trim(); const err = $('#err'); if (name.length < 2) { err.textContent = 'اكتب اسمًا من حرفين على الأقل'; return; } if (!team) { err.textContent = 'اختر فريقك: الشباب أم البنات'; return; }
    $('#go').disabled = true; err.textContent = '';
    try { const p = await api.join(name, team); pid = p.id; localStorage.setItem(PKEY, pid); store.load(); await refreshMe(false); confetti(120); render(); }
    catch (e) { err.textContent = 'تعذّر الانضمام: ' + (e.message === 'invalid_name' ? 'الاسم غير صالح' : e.message); $('#go').disabled = false; }
  };
}

// ---------- التبويبات ----------
function setTab(t) { tab = t; $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); render(); }
function render() {
  if (!pid || !me) return; rid++; clearTimeout(poll); poll = null; stopTimer && stopTimer(); stopTimer = null;
  if (tab === 'live') renderLive(); else if (tab === 'explore') renderExplore(); else if (tab === 'rank') renderRank(); else renderMe();
}

// ---------- مباشر ----------
function renderLive() {
  if (!st) { view.innerHTML = `<div class="card" style="text-align:center">${icon('loader', 30)} جارٍ الاتصال…</div>`; return; }
  const k = st.scene_kind; if (['galaxy', 'roadmap', 'venn'].includes(k)) { sub = k; return renderExplore(true, true); }
  const m = st.mode;
  if (!['galaxy', 'roadmap', 'venn'].includes(k)) setStage(KIND_STAGE[k] || 'network');
  if (m === 'quiz') return renderQuiz(); if (m === 'ideas') return renderIdeas(); if (m === 'vote') return renderVote(); if (m === 'qa') return renderQA();
  if (m === 'leaderboard') return renderRank(true); if (m === 'break') return renderBreak(); if (m === 'finale') return renderFinale();
  renderSlide();
}
const HINTS = {
  cover: ['استعد!', 'سنبدأ بعد قليل: تأكد أن هاتفك مشحون وصوت الإشعارات مفتوح.'], lobby: ['فريقك جاهز؟', 'كل نقطة تجمعها تذهب لفريقك. المتوسط هو الحاسم، فشارك بنشاط.'],
  divider: ['محطة جديدة', 'انتبه: ستأتي أسئلة من هذا المحور قريبًا.'], quiz: ['', ''], actintro: ['تحدٍّ جديد', 'تجهّز: بعد لحظات يظهر السؤال الأول على شاشتك.'],
  case: ['فكّر معي', 'اسأل نفسك: ما المشكلة؟ ومن المستخدم؟ هذه أسئلة ورشة الأفكار لاحقًا.'], stats: ['أرقام وليست أرقامًا فقط', 'دوّن رقمًا واحدًا يفاجئك وسنسألك عنه.'],
};
function renderSlide() {
  const h = HINTS[st.scene_kind] || ['شاهد الشاشة الرئيسية', 'يمكنك التفاعل بالإيموجي أثناء الشرح.'];
  const pct = st.total_slides > 1 ? Math.round((st.slide + 1) / st.total_slides * 100) : 0;
  view.innerHTML = `<div class="card now rise"><div class="live-head"><span class="dotlive">مباشر الآن</span><span class="chip">${icon('monitor', 14)} على الشاشة</span></div><h2>${esc(st.scene_title || 'أهلًا بك')}</h2><p>${esc(st.scene_note || '')}</p></div>
  <div class="card rise" style="animation-delay:.08s"><div class="row"><div style="color:var(--green)">${icon('lightbulb', 26)}</div><div class="grow"><b>${esc(h[0])}</b><div style="color:var(--muted);font-size:14px">${esc(h[1])}</div></div></div></div>
  <div class="prog"><span>تقدّم اللقاء</span><div class="bar"><i style="width:${pct}%"></i></div><span class="ltr">${pct}%</span></div>
  <div class="react" id="react">${['👏', '🔥', '💡', '❤️', '😮'].map(e => `<button data-e="${e}" aria-label="تفاعل ${e}">${e}</button>`).join('')}</div>
  <div class="card" style="text-align:center;color:var(--muted);font-size:13px">اضغط للتفاعل مباشرة على شاشة العرض</div>`;
  let last = 0; $$('#react button').forEach(b => b.onclick = () => { const n = Date.now(); if (n - last < 700) return; last = n; api.sendReaction({ e: b.dataset.e, t: me.team }); });
}

// ---- أسئلة ----
function renderQuiz() {
  setStage('network'); const q = questions[st.qid]; const qid = st.qid;
  if (!q) { view.innerHTML = `<div class="card now"><h2>${esc(st.scene_title)}</h2><p>جارٍ تحميل السؤال…</p></div>`; loadQuestions().then(() => tab === 'live' && st && st.qid === qid && renderQuiz()); return; }
  const tf = q.options.length === 2 && q.options[0] === 'صح'; const mine = answers[qid]; const phase = st.phase; const keys = ['أ', 'ب', 'ج', 'د'];
  const optHtml = q.options.map((o, i) => `<button class="opt ${mine === i ? 'sel' : ''}" data-i="${i}" ${phase !== 'open' || mine !== undefined ? 'disabled' : ''}><span class="k">${tf ? icon(i === 0 ? 'check' : 'x', 20) : keys[i]}</span><span>${esc(o)}</span></button>`).join('');
  view.innerHTML = `<div class="q rise"><div class="live-head"><span class="chip">${esc(st.scene_title)}</span><span class="dotlive">مباشر</span></div>
  ${q.media && PICS[q.media] ? `<div class="media">${PICS[q.media]}</div>` : ''}
  <div class="qbody">${esc(q.body)}</div>
  ${phase === 'open' ? `<div class="timer"><div class="bar"><i id="tb" style="width:100%"></i></div><b id="tn">--</b></div>` : ''}
  <div class="opts ${tf ? 'tf' : ''}" id="opts">${optHtml}</div><div id="after"></div></div>`;
  if (phase === 'idle') { $('#after').innerHTML = `<div class="card" style="text-align:center">${icon('hourglass', 24)} انتظر… سيفتح المقدّم السؤال بعد لحظات</div>`; return; }
  if (phase === 'open') {
    const total = (st.duration || 20) * 1000; stopTimer = countdown(st.ends_at, offset, (left) => { const b = $('#tb'); if (!b) return; b.style.width = (left / total * 100) + '%'; b.style.backgroundPositionX = (100 - left / total * 100) + '%'; $('#tn').textContent = Math.ceil(left / 1000); });
    if (mine !== undefined) $('#after').innerHTML = `<div class="card" style="text-align:center;border-color:var(--blue2)">${icon('check-check', 22)} تم إرسال إجابتك. انتظر النتيجة</div>`;
    $$('#opts .opt').forEach(b => b.onclick = async () => {
      if (answers[qid] !== undefined || busy) return; busy = true; const i = +b.dataset.i; navigator.vibrate && navigator.vibrate(30);
      answers[qid] = i; store.saveAns(); $$('#opts .opt').forEach(x => { x.disabled = true; x.classList.toggle('sel', x === b); });
      try { const r = await api.answer(pid, qid, i); if (!r || !r.ok) { if (r && r.reason === 'already') { /* ok */ } else { delete answers[qid]; store.saveAns(); toast(r && (r.reason === 'late' || r.reason === 'closed') ? 'انتهى الوقت!' : 'تعذّر الإرسال', 'bad'); } } }
      catch { delete answers[qid]; store.saveAns(); toast('تعذّر الإرسال، حاول ثانية', 'bad'); }
      busy = false; renderQuiz();
    });
    return;
  }
  if (phase === 'closed') { $('#after').innerHTML = `<div class="card" style="text-align:center">${icon('lock', 22)} أُغلق باب الإجابة${mine === undefined ? ' (لم تُجب)' : ''}. بانتظار كشف الإجابة…</div>`; return; }
  if (phase === 'reveal') showReveal(q, qid);
}
async function showReveal(q, qid) {
  let r = null; try { r = await api.result(pid, qid); } catch { }
  if (!(tab === 'live' && st && st.qid === qid && st.phase === 'reveal')) return; if (!r) { $('#after').innerHTML = ''; return; }
  $$('#opts .opt').forEach((b) => { const i = +b.dataset.i; b.classList.remove('sel'); b.classList.toggle('ok', i === r.correct_choice); b.classList.toggle('no', r.answered && i === r.choice && i !== r.correct_choice); b.classList.toggle('dim', i !== r.correct_choice && !(r.answered && i === r.choice)); });
  const good = r.answered && r.correct; const xpBefore = me.xp; await refreshMe(); const stk = me.streak;
  $('#after').innerHTML = `<div class="card verdict ${good ? 'ok' : 'no'} rise"><div style="font-size:40px">${good ? '🎉' : r.answered ? '💪' : '⏰'}</div><div class="big">${good ? 'إجابة صحيحة!' : r.answered ? 'ليست هذه المرة' : 'لم تُجب'}</div>${good ? `<span class="pts">+${r.points} XP</span>` : ''}
  ${good && stk >= 2 ? `<div style="margin-top:8px;font-weight:800;color:#B97800">${icon('flame', 20)} سلسلة ${stk} إجابات متتالية</div>` : ''}${r.explanation ? `<div class="why">${esc(r.explanation)}</div>` : ''}</div>`;
  if (good) { confetti(stk >= 3 ? 150 : 70, { x: .5, y: .5 }); navigator.vibrate && navigator.vibrate([40, 40, 40]); }
}

// ---- أفكار ----
let draft = { title: '', problem: '', solution: '', tech: '' };
async function renderIdeas() {
  const my = rid; setStage('network'); const list = await api.ideas().catch(() => []); if (my !== rid) return; const mineN = list.filter(i => i.player_id === pid).length;
  const keepFocus = document.activeElement && document.activeElement.id;
  view.innerHTML = `<div class="card now rise"><div class="live-head"><span class="chip g">${icon('lightbulb', 14)} ورشة الأفكار</span><span class="dotlive">مباشر</span></div><h2 style="font-size:21px">${esc(st.scene_title)}</h2><p>${esc(st.scene_note)}</p></div>
  ${mineN < 2 ? `<div class="card rise"><label class="f" for="it">عنوان الفكرة *</label><input type="text" id="it" maxlength="80" placeholder="مثال: مساعد ذكي لتوفير المياه" value="${esc(draft.title)}">
  <label class="f" for="ip">المشكلة (من يتألم؟)</label><textarea id="ip" maxlength="300" rows="2">${esc(draft.problem)}</textarea>
  <label class="f" for="is">الحل بالذكاء الاصطناعي</label><textarea id="is" maxlength="300" rows="2">${esc(draft.solution)}</textarea>
  <label class="f" for="ik">التقنية (اختياري)</label><input type="text" id="ik" maxlength="80" placeholder="NLP · Vision · ML …" value="${esc(draft.tech)}">
  <div class="err" id="ierr"></div><button class="btn green" id="isend" style="width:100%">${icon('send', 18)} انشر فكرتي (+10 XP)</button><p style="font-size:12px;color:var(--muted);margin-top:6px;text-align:center">لديك ${2 - mineN} من 2 فكرة متبقية</p></div>` : `<div class="card" style="text-align:center">${icon('check-check', 22)} نشرت فكرتيك. انتظر مرحلة التصويت!</div>`}
  <h3 style="font-size:17px">جدار الأفكار (${list.length})</h3><div class="list">${list.map(ideaCard).join('') || '<div class="card" style="color:var(--muted);text-align:center">كن أول من ينشر فكرة</div>'}</div>`;
  if (mineN < 2) {
    const sync = () => { draft = { title: $('#it').value, problem: $('#ip').value, solution: $('#is').value, tech: $('#ik').value }; }; ['it', 'ip', 's', 'ik'].forEach(() => { }); $$('#it,#ip,#is,#ik').forEach(x => x.oninput = sync);
    $('#isend').onclick = async () => { sync(); if (draft.title.trim().length < 3) { $('#ierr').textContent = 'العنوان قصير'; return; } $('#isend').disabled = true; const r = await api.submitIdea(pid, draft).catch(() => ({ ok: false })); if (r && r.ok) { draft = { title: '', problem: '', solution: '', tech: '' }; flag('idea'); confetti(80); toast('تم نشر فكرتك +10 XP', 'ok'); await refreshMe(); } else toast(r && r.reason === 'limit' ? 'وصلت للحد الأقصى' : 'تعذّر النشر', 'bad'); renderIdeas(); };
    if (keepFocus && $('#' + keepFocus)) { try { $('#' + keepFocus).focus(); } catch { } }
  }
  const tick = () => { if (document.activeElement && /^(it|ip|is|ik)$/.test(document.activeElement.id)) poll = setTimeout(tick, 2500); else renderIdeas(); }; poll = setTimeout(tick, 5000);
}
const ideaCard = (i, vote) => `<div class="card idea"><div class="row"><div class="grow"><h4>${esc(i.title)}</h4>${i.problem ? `<p><b>المشكلة:</b> ${esc(i.problem)}</p>` : ''}${i.solution ? `<p><b>الحل:</b> ${esc(i.solution)}</p>` : ''}<div class="meta">${teamChip(i.team)}<span>${esc(i.author)}</span>${i.tech ? `<span class="chip">${esc(i.tech)}</span>` : ''}</div></div>${vote || ''}</div></div>`;

// ---- تصويت ----
async function renderVote() {
  const my = rid; setStage('network'); const [list, mv] = await Promise.all([api.ideas().catch(() => []), api.myVote(pid).catch(() => null)]); if (my !== rid) return;
  view.innerHTML = `<div class="card now rise"><div class="live-head"><span class="chip">${icon('thumbs-up', 14)} تصويت</span><span class="dotlive">مباشر</span></div><h2 style="font-size:21px">اختر أفضل فكرة</h2><p>صوت واحد لكل مشارك، ويمكنك تغييره. لا يمكنك التصويت لفكرتك.</p></div>
  <div class="list">${list.map(i => ideaCard(i, i.player_id === pid ? `<div class="chip">فكرتك</div>` : `<button class="vbtn ${mv === i.id ? 'on' : ''}" data-id="${i.id}">${icon(mv === i.id ? 'check' : 'thumbs-up', 20)}<b>${i.votes}</b></button>`)).join('') || '<div class="card" style="text-align:center;color:var(--muted)">لا أفكار بعد</div>'}</div>`;
  $$('.vbtn').forEach(b => b.onclick = async () => { const r = await api.voteIdea(pid, b.dataset.id).catch(() => ({ ok: false })); if (r && r.ok) { flag('voter'); toast('تم تسجيل صوتك', 'ok'); navigator.vibrate && navigator.vibrate(30); await refreshMe(); } else toast(r && r.reason === 'own' ? 'لا يمكنك التصويت لفكرتك' : 'تعذّر التصويت', 'bad'); renderVote(); });
  poll = setTimeout(renderVote, 5000);
}

// ---- أسئلة وأجوبة ----
async function renderQA() {
  const my = rid; setStage('network'); const [list, mine] = await Promise.all([api.qaList().catch(() => []), api.myQaVotes(pid).catch(() => [])]); if (my !== rid) return; const have = list.filter(x => x.player_id === pid).length; const typing = document.activeElement && document.activeElement.id === 'qt';
  if (typing && $('#qt') && $('#qt').value) { /* لا نعيد الرسم أثناء الكتابة */ return; }
  view.innerHTML = `<div class="card now rise"><div class="live-head"><span class="chip">${icon('messages-square', 14)} أسئلة وأجوبة</span><span class="dotlive">مباشر</span></div><h2 style="font-size:21px">اسأل المقدّم أي شيء</h2><p>أول 3 أسئلة لك تمنحك +5 XP. صوّت لأسئلة زملائك لتصعد للأعلى.</p></div>
  ${have < 5 ? `<div class="card"><textarea id="qt" maxlength="280" rows="2" placeholder="اكتب سؤالك…"></textarea><div class="err" id="qerr"></div><button class="btn" id="qsend" style="width:100%;margin-top:8px">${icon('send', 18)} أرسل السؤال</button></div>` : ''}
  <div class="list">${list.map(q => `<div class="card"><div class="row"><div class="grow"><b>${esc(q.body)}</b><div class="meta" style="font-size:12px;color:var(--muted);margin-top:4px">${teamChip(q.team)} ${esc(q.author)} ${q.status === 'answered' ? `<span class="chip g">${icon('check', 12)} تمت الإجابة</span>` : ''}</div></div><button class="vbtn ${mine.includes(q.id) ? 'on' : ''}" data-id="${q.id}">${icon('arrow-up', 18)}<b>${q.votes}</b></button></div></div>`).join('') || '<div class="card" style="text-align:center;color:var(--muted)">لا أسئلة بعد، كن الأول!</div>'}</div>`;
  const s = $('#qsend'); if (s) s.onclick = async () => { const v = $('#qt').value.trim(); if (v.length < 3) { $('#qerr').textContent = 'السؤال قصير'; return; } s.disabled = true; const r = await api.ask(pid, v).catch(() => ({ ok: false })); if (r && r.ok) { flag('curious'); toast('وصل سؤالك للمقدّم', 'ok'); await refreshMe(); } else toast(r && r.reason === 'limit' ? 'وصلت لحد 5 أسئلة' : 'تعذّر الإرسال', 'bad'); renderQA(); };
  $$('.vbtn').forEach(b => b.onclick = async () => { await api.voteQa(pid, b.dataset.id).catch(() => { }); renderQA(); });
  poll = setTimeout(() => { if (!(document.activeElement && document.activeElement.id === 'qt')) renderQA(); }, 5000);
}

// ---- استراحة ----
function renderBreak() {
  setStage('network'); const left0 = st.break_until ? new Date(st.break_until).getTime() - serverNow(offset) : 0;
  view.innerHTML = `<div class="card now rise" style="text-align:center"><span class="chip g">${icon('coffee', 14)} استراحة</span><h2 style="margin-top:10px">خذ نفسًا قليلًا</h2><div class="big-count" id="bc">--:--</div><p>${esc(st.scene_note || 'نعود قريبًا')}</p></div>
  <div class="card rise" style="animation-delay:.1s"><b>${icon('lightbulb', 18)} تحدي الاستراحة</b><p style="color:var(--muted)">فكّر في مشكلة حقيقية تراها في غزة أو جامعتك ويمكن للذكاء الاصطناعي أن يساعد فيها. ستحتاجها في ورشة الأفكار لاحقًا.</p></div>`;
  if (st.break_until) stopTimer = countdown(st.break_until, offset, (l) => { const e = $('#bc'); if (e) e.textContent = l > 0 ? mmss(l) : 'نعود الآن!'; }, 500);
  else $('#bc').textContent = '☕';
}

// ---- ختام ----
function renderFinale() {
  setStage('network'); const done = !!extra.fb; const code = !!extra.code;
  view.innerHTML = `<div class="card now rise" style="text-align:center"><div style="font-size:46px">🏆</div><h2>${esc(st.scene_title)}</h2><p>${esc(st.scene_note)}</p></div>
  ${code ? `<div class="card" style="text-align:center;border-color:var(--green)">${icon('trophy', 22)} أكملت الرحلة!</div>` : `<div class="card rise"><b>${icon('key-round', 18)} كلمة السر الختامية (+20 XP)</b><p style="color:var(--muted);font-size:14px">سيعلنها المقدّم في ختام اللقاء</p><div class="row" style="margin-top:8px"><input type="text" id="cd" placeholder="اكتبها هنا" autocapitalize="characters" style="direction:ltr;text-align:center"><button class="btn" id="cdb">تحقق</button></div></div>`}
  ${done ? `<div class="card" style="text-align:center">${icon('check-check', 22)} شكرًا لتقييمك!</div>` : `<div class="card rise"><b>${icon('star', 18)} قيّم اللقاء (+10 XP)</b>
   <label class="f">التقييم العام</label><div class="stars" id="s1">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}">⭐</button>`).join('')}</div>
   <label class="f">وضوح الشرح</label><div class="stars" id="s2">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}">⭐</button>`).join('')}</div>
   <label class="f" for="fb1">أكثر شيء أفادك</label><textarea id="fb1" rows="2" maxlength="300"></textarea><label class="f" for="fb2">تريد التوسع في…</label><textarea id="fb2" rows="2" maxlength="300"></textarea>
   <div class="err" id="ferr"></div><button class="btn green" id="fsend" style="width:100%;margin-top:6px">${icon('send', 18)} أرسل التقييم</button></div>`}
  <div class="card rise" style="text-align:center"><b>تابعني على ${en('LinkedIn')}</b><p style="color:var(--muted);font-size:14px">${esc(PRESENTER.name)} · ${en('AI Engineer')}</p><a class="btn ghost" href="${PRESENTER.linkedin}" target="_blank" rel="noopener" style="margin-top:6px">${icon('linkedin', 18)} linkedin.com/in/ahmedalhayek</a></div>`;
  const rate = { s1: 0, s2: 0 }; ['s1', 's2'].forEach(id => $$('#' + id + ' button').forEach(b => b.onclick = () => { rate[id] = +b.dataset.n; $$('#' + id + ' button').forEach(x => x.classList.toggle('on', +x.dataset.n <= rate[id])); }));
  const fs = $('#fsend'); if (fs) fs.onclick = async () => { if (!rate.s1 || !rate.s2) { $('#ferr').textContent = 'اختر التقييمين بالنجوم'; return; } fs.disabled = true; const r = await api.feedback(pid, { rating: rate.s1, clarity: rate.s2, best: $('#fb1').value, more: $('#fb2').value }).catch(() => ({ ok: false })); if (r && r.ok) { extra.fb = 1; store.saveExtra(); flag('critic'); confetti(90); await refreshMe(); renderFinale(); } else { toast('تعذّر الإرسال', 'bad'); fs.disabled = false; } };
  const cb = $('#cdb'); if (cb) cb.onclick = async () => { const r = await api.redeem(pid, $('#cd').value).catch(() => ({ ok: false })); if (r && r.ok) { extra.code = 1; store.saveExtra(); flag('finisher'); confetti(260, { x: .5, y: .3 }); await refreshMe(); renderFinale(); } else toast(r && r.reason === 'not_yet' ? 'لم يحن وقتها بعد' : 'كلمة السر غير صحيحة', 'bad'); };
}

// ---------- الترتيب ----------
async function renderRank(fromLive) {
  const my = rid; setStage('podium'); const b = await api.leaderboard().catch(() => null); if (!b || my !== rid) return;
  const [s, g] = ['shabab', 'banat'].map(id => b.teams.find(t => t.team === id)); const max = Math.max(1, s.score, g.score);
  if (stage) stage.setPodium({ shabab: s.score, banat: g.score });
  const win = s.score === g.score ? null : s.score > g.score ? 'shabab' : 'banat';
  view.innerHTML = `<div class="spacer" style="min-height:30vh"></div><div class="sheet"><div class="live-head"><h3>${win ? `يتقدّم: ${TEAMS[win].name}` : 'تعادل!'}</h3><span class="chip">${CONFIGLabel()}</span></div>
  <div class="tbar" style="margin:12px 0">${[s, g].map(t => `<div class="t"><span>${TEAMS[t.team].short}</span><div class="bar ${t.team}"><i style="width:${t.score / max * 100}%"></i></div><span class="v">${Math.round(t.score * 10) / 10}</span></div>`).join('')}</div>
  <div style="font-size:12.5px;color:var(--muted)">${[s, g].map(t => `${TEAMS[t.team].short}: ${t.active_players} نشِط من ${t.players}`).join(' · ')}</div></div>
  <h3 style="font-size:17px">أفضل المتسابقين</h3><div class="list" id="lb">${b.players.slice(0, 15).map((p, i) => `<div class="lb ${p.id === pid ? 'me' : ''}"><span class="rk">${i + 1}</span><div><b>${esc(p.name)}</b> ${teamChip(p.team)}</div><span class="x">${nf(p.xp)} XP</span></div>`).join('') || '<div class="card" style="text-align:center;color:var(--muted)">لا نتائج بعد</div>'}</div>`;
  if (me) { const mine = b.players.findIndex(p => p.id === pid); if (mine < 0 || mine >= 15) $('#lb').insertAdjacentHTML('beforeend', `<div class="lb me"><span class="rk">${me.rank}</span><div><b>${esc(me.name)}</b> ${teamChip(me.team)}</div><span class="x">${nf(me.xp)} XP</span></div>`); }
  poll = setTimeout(() => { renderRank(fromLive); refreshMe(false); }, 5000);
}
const CONFIGLabel = () => 'متوسط اللاعب';

// ---------- استكشف (3D) ----------
function renderExplore(keepScroll, fromLive) {
  if (!fromLive) { /* من التبويب */ }
  const mode = sub; setStage(mode); if (mode === 'roadmap' && stage) stage.setRoadmap(year - 1);
  const career = CAREERS.find(c => c.id === sel);
  const seg = fromLive ? '' : `<div class="seg" id="seg"><button data-s="galaxy" class="${sub === 'galaxy' ? 'on' : ''}">${icon('orbit', 14)} المجرة</button><button data-s="roadmap" class="${sub === 'roadmap' ? 'on' : ''}">${icon('route', 14)} الخطة</button><button data-s="venn" class="${sub === 'venn' ? 'on' : ''}">${icon('circle-dot', 14)} الفِن</button></div>`;
  let panel = '';
  if (mode === 'galaxy') panel = career ? `<div class="sheet"><div class="row"><div class="grow"><h3>${esc(career.ar)}</h3><div class="sub">${esc(career.en)}</div></div><span class="chip ${career.group === 'ai' ? 'g' : ''}">${career.group === 'ai' ? 'ذكاء اصطناعي' : 'بيانات'}</span></div><p style="margin:8px 0">${esc(career.what)}</p><div class="tags">${career.tools.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div><div style="font-size:13px;color:var(--muted)">مساقات: ${career.courses.map(en).join(' · ')}</div><div class="card" style="margin-top:10px;background:rgba(126,211,33,.12);border-color:rgba(126,211,33,.4)">${icon('rocket', 16)} <b>ابدأ اليوم:</b> ${esc(career.start)}</div></div>`
    : `<div class="sheet" style="text-align:center">${icon('mouse-pointer-click', 24)} <b>المسّ كوكبًا</b> لتعرف الوظيفة، واسحب لتدوير المجرة<div style="color:var(--muted);font-size:13px;margin-top:4px">استكشف ${Math.max(0, 4 - ((extra.seen || []).length))} وظائف أخرى لتنال شارة «رائد المجرة»</div></div>`;
  else if (mode === 'roadmap') { const y = YEARS[year - 1]; panel = `<div class="yrs">${YEARS.map(v => `<button data-y="${v.n}" class="${v.n === year ? 'on' : ''}">سنة ${v.n}</button>`).join('')}</div><div class="sheet"><h3>${esc(y.ar)} · ${en(y.en)}</h3><div style="margin:8px 0">${y.courses.map(c => `<div class="course"><b class="en">${esc(c[0])}</b><span>${esc(c[1])}</span></div>`).join('')}</div><div class="card" style="background:rgba(126,211,33,.12);border-color:rgba(126,211,33,.4)">${icon('folder-git-2', 16)} <b>مشروع السنة:</b> ${esc(y.project)}</div></div>`; }
  else panel = `<div class="sheet"><h3>علم البيانات ${icon('plus', 14)} الذكاء الاصطناعي</h3><p style="margin-top:6px"><b style="color:var(--blue2)">علم البيانات</b> يفهم البيانات ويفسرها: ماذا حدث ولماذا؟<br><b style="color:var(--green)">الذكاء الاصطناعي</b> يبني أنظمة تتعلم وتتنبأ وتقرر.<br><b>تعلّم الآلة (${en('ML')})</b> هو الجسر الذي يجمعهما.</p></div>`;
  view.innerHTML = `<div class="explore">${seg}<div class="spacer"></div>${panel}</div>`;
  $$('#seg button').forEach(b => b.onclick = () => { sub = b.dataset.s; renderExplore(); });
  $$('.yrs button').forEach(b => b.onclick = () => { year = +b.dataset.y; renderExplore(); });
}

// ---------- أنا ----------
function renderMe() {
  setStage('network'); const lv = levelOf(me.xp); const earned = earnedBadges(me, extra); const acc = me.answered_count ? Math.round(me.correct_count / me.answered_count * 100) : 0;
  view.innerHTML = `<div class="card rise" style="text-align:center"><div class="av ${me.team}" style="width:76px;height:76px;margin:0 auto;font-size:32px">${esc(initials(me.name))}</div><h2 style="margin-top:8px">${esc(me.name)}</h2>${teamChip(me.team)}
  <div style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--green)">${icon(lv.cur.icon, 28)}<b style="font-size:20px">${esc(lv.cur.name)}</b></div><div class="en" style="color:var(--muted);font-size:13px">${esc(lv.cur.en)}</div>
  <div class="bar" style="margin:12px 0 4px"><i style="width:${lv.pct}%"></i></div><small style="color:var(--muted)">${lv.nxt ? `باقي ${lv.need} XP للمستوى «${esc(lv.nxt.name)}»` : 'وصلت لأعلى مستوى!'}</small></div>
  <div class="stats"><div class="card s"><b>${nf(me.xp)}</b><small>نقاط XP</small></div><div class="card s"><b>#${me.rank}</b><small>ترتيبك</small></div><div class="card s"><b>${acc}%</b><small>دقة الإجابات</small></div><div class="card s"><b>${me.best_streak}</b><small>أطول سلسلة</small></div><div class="card s"><b>${me.correct_count}</b><small>إجابات صحيحة</small></div><div class="card s"><b>${earned.size}/${BADGES.length}</b><small>شارات</small></div></div>
  <h3 style="font-size:17px">شاراتي</h3><div class="bgrid">${BADGES.map(b => badgeHtml(b, earned.has(b.id))).join('')}</div>
  <div class="card" style="font-size:13px;color:var(--muted)"><b style="color:var(--text)">المستويات:</b> ${LEVELS.map(l => `${l.name} (${l.xp})`).join(' ← ')}</div>
  <button class="btn ghost sm" id="logout" style="align-self:center">${icon('log-out', 14)} تغيير الاسم أو الفريق</button>`;
  $('#logout').onclick = () => { if (confirm('سيُفتح حساب جديد على هذا الجهاز. متأكد؟')) { localStorage.removeItem(PKEY); localStorage.removeItem('ol_device'); pid = null; me = null; location.reload(); } };
}

// ---------- تشغيل ----------
function onState(s, o) {
  const prev = st; st = s; offset = o || 0; const key = [s.slide, s.mode, s.qid, s.phase, s.scene_kind, s.break_until].join('|');
  if (!pid || !me) return; if (key === lastKey) return; lastKey = key;
  if (tab === 'live') { if (prev && prev.mode !== s.mode) { navigator.vibrate && navigator.vibrate(25); } render(); } else if (prev && (prev.mode !== s.mode || prev.qid !== s.qid || prev.phase !== s.phase) && ['quiz', 'ideas', 'vote', 'qa'].includes(s.mode)) { $('#tabs [data-tab=live]').classList.add('dot'); toast('هناك نشاط مباشر الآن'); }
  if (s.phase === 'reveal') refreshMe();
}
async function boot() {
  $$('[data-i]').forEach(e => { e.innerHTML = icon(e.dataset.i, 22); });
  if (IS_DEMO) $('#demo-ribbon').classList.remove('hide');
  initStage(); await loadQuestions();
  $$('#tabs button').forEach(b => b.onclick = () => { b.classList.remove('dot'); setTab(b.dataset.tab); });
  api.onState(onState);
  if (pid) { store.load(); await refreshMe(false); if (me) { const s = await api.getState().catch(() => null); if (s) { st = s.state; offset = s.offset; } render(); } } else showJoin();
}
boot();
document.addEventListener('visibilitychange', () => { if (!document.hidden && me) refreshMe(false); });
