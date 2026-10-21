-- =====================================================================
--  Orientation Live  ·  Supabase schema  (Data Science & AI · UCAS 2026)
--  شغّل هذا الملف كاملًا مرة واحدة في: Supabase Dashboard ▸ SQL Editor
--  ثم شغّل seed.sql (الأسئلة) ثم راجع README.md لإنشاء حساب المقدّم.
--  آمن لإعادة التشغيل (idempotent).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1) الجداول
-- ---------------------------------------------------------------------
create table if not exists public.sessions (
  id           text primary key,
  title        text not null,
  secret_code  text not null default 'DATA2026',     -- كلمة السر الختامية (+XP)
  created_at   timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.session_state (
  session_id   text primary key references public.sessions(id) on delete cascade,
  slide        int  not null default 0,
  total_slides int  not null default 1,
  scene_kind   text not null default 'slides',
  scene_title  text not null default '',
  scene_note   text not null default '',
  mode         text not null default 'slides'
               check (mode in ('slides','quiz','ideas','vote','qa','leaderboard','break','finale')),
  qid          text,
  phase        text not null default 'idle' check (phase in ('idle','open','closed','reveal')),
  duration     int  not null default 20,
  opened_at    timestamptz,
  ends_at      timestamptz,
  break_until  timestamptz,
  updated_at   timestamptz not null default now()
);

create table if not exists public.players (
  id             uuid primary key default gen_random_uuid(),
  session_id     text not null references public.sessions(id) on delete cascade,
  device_id      text not null,
  name           text not null check (char_length(name) between 2 and 40),
  team           text not null check (team in ('shabab','banat')),
  xp             int  not null default 0,
  streak         int  not null default 0,
  best_streak    int  not null default 0,
  correct_count  int  not null default 0,
  answered_count int  not null default 0,
  created_at     timestamptz not null default now(),
  unique (session_id, device_id)
);
create index if not exists players_session_idx on public.players(session_id, team);

create table if not exists public.questions (
  id        text primary key,
  act       text not null,
  sort      int  not null,
  kind      text not null default 'mcq',
  body      text not null,
  options   jsonb not null,
  media     text,
  duration  int  not null default 20,
  points    int  not null default 10
);

create table if not exists public.question_keys (
  question_id text primary key references public.questions(id) on delete cascade,
  correct     int  not null,
  explanation text not null default ''
);

create table if not exists public.answers (
  id          bigint generated always as identity primary key,
  session_id  text not null references public.sessions(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  question_id text not null references public.questions(id) on delete cascade,
  choice      int  not null,
  correct     boolean not null,
  points      int  not null default 0,
  ms          int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (player_id, question_id)
);
create index if not exists answers_q_idx on public.answers(session_id, question_id);

create table if not exists public.ideas (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  team       text not null,
  author     text not null,
  title      text not null check (char_length(title) between 3 and 80),
  problem    text not null default '' check (char_length(problem) <= 300),
  solution   text not null default '' check (char_length(solution) <= 300),
  tech       text not null default '' check (char_length(tech) <= 80),
  votes      int  not null default 0,
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.idea_votes (
  session_id text not null references public.sessions(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  idea_id    uuid not null references public.ideas(id) on delete cascade,
  primary key (session_id, player_id)
);

create table if not exists public.qa (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  author     text not null,
  team       text not null,
  body       text not null check (char_length(body) between 3 and 280),
  votes      int  not null default 0,
  status     text not null default 'new' check (status in ('new','answered','hidden')),
  created_at timestamptz not null default now()
);

create table if not exists public.qa_votes (
  qa_id     uuid not null references public.qa(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (qa_id, player_id)
);

create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  rating     int  not null check (rating between 1 and 5),
  clarity    int  not null check (clarity between 1 and 5),
  best_part  text not null default '' check (char_length(best_part) <= 200),
  wants_more text not null default '' check (char_length(wants_more) <= 200),
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table if not exists public.claims (
  session_id text not null references public.sessions(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  kind       text not null,
  created_at timestamptz not null default now(),
  primary key (player_id, kind)
);

-- ---------------------------------------------------------------------
-- 2) دوال مساعدة
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 3) واجهات عرض آمنة (بدون device_id)  ·  تُنفَّذ بصلاحيات المالك
-- ---------------------------------------------------------------------
create or replace view public.players_public as
  select id, session_id, name, team, xp, streak, best_streak, correct_count, answered_count, created_at
  from public.players;

create or replace view public.team_scores as
  select session_id, team,
         count(*)::int                                   as players,
         count(*) filter (where answered_count > 0)::int as active_players,
         coalesce(sum(xp), 0)::int                       as total_xp,
         coalesce(round(avg(xp) filter (where answered_count > 0), 1), 0)::float8 as avg_xp
  from public.players
  group by session_id, team;

-- ---------------------------------------------------------------------
-- 4) الصلاحيات (RLS): القراءة العامة للبيانات غير الحساسة، والكتابة عبر RPC فقط
-- ---------------------------------------------------------------------
alter table public.sessions       enable row level security;
alter table public.admins         enable row level security;
alter table public.session_state  enable row level security;
alter table public.players        enable row level security;
alter table public.questions      enable row level security;
alter table public.question_keys  enable row level security;
alter table public.answers        enable row level security;
alter table public.ideas          enable row level security;
alter table public.idea_votes     enable row level security;
alter table public.qa             enable row level security;
alter table public.qa_votes       enable row level security;
alter table public.feedback       enable row level security;
alter table public.claims         enable row level security;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy sessions_read       on public.sessions      for select using (true);
create policy state_read          on public.session_state for select using (true);
create policy questions_read      on public.questions     for select using (true);
create policy ideas_read          on public.ideas         for select using (not hidden or public.is_admin());
create policy qa_read             on public.qa            for select using (status <> 'hidden' or public.is_admin());

create policy admin_all_sessions  on public.sessions      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_state     on public.session_state for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_players   on public.players       for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_questions on public.questions     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_keys      on public.question_keys for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_answers   on public.answers       for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_ideas     on public.ideas         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_qa        on public.qa            for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_read_feedback on public.feedback      for select to authenticated using (public.is_admin());
create policy admin_read_claims   on public.claims        for select to authenticated using (public.is_admin());
create policy admin_read_admins   on public.admins        for select to authenticated using (user_id = auth.uid());

revoke all on public.players, public.question_keys, public.answers, public.idea_votes,
              public.qa_votes, public.feedback, public.claims, public.admins from anon;
grant select on public.sessions, public.session_state, public.questions, public.ideas, public.qa to anon, authenticated;
grant select on public.players_public, public.team_scores to anon, authenticated;
grant select, insert, update, delete on public.players, public.question_keys, public.answers,
      public.ideas, public.qa, public.sessions, public.session_state, public.questions to authenticated;
grant select on public.feedback, public.claims, public.admins to authenticated;

-- ---------------------------------------------------------------------
-- 5) دوال الطلبة (RPC)  ·  security definer مع تحقق كامل في الخادم
-- ---------------------------------------------------------------------
create or replace function public.get_state(p_session text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('state', to_jsonb(s), 'server_now', now())
  from public.session_state s where s.session_id = p_session;
$$;

create or replace function public.join_player(p_session text, p_device text, p_name text, p_team text)
returns json language plpgsql security definer set search_path = public as $$
declare v_name text := btrim(coalesce(p_name, '')); v_row public.players;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 40 then raise exception 'invalid_name'; end if;
  if p_team not in ('shabab','banat') then raise exception 'invalid_team'; end if;
  if coalesce(char_length(p_device),0) < 8 then raise exception 'invalid_device'; end if;
  if not exists (select 1 from public.sessions where id = p_session) then raise exception 'unknown_session'; end if;
  insert into public.players(session_id, device_id, name, team)
  values (p_session, p_device, v_name, p_team)
  on conflict (session_id, device_id) do update set name = excluded.name
  returning * into v_row;
  return json_build_object('id', v_row.id, 'name', v_row.name, 'team', v_row.team, 'xp', v_row.xp,
    'streak', v_row.streak, 'best_streak', v_row.best_streak, 'correct_count', v_row.correct_count,
    'answered_count', v_row.answered_count);
end $$;

create or replace function public.my_stats(p_player uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', id, 'name', name, 'team', team, 'xp', xp, 'streak', streak,
    'best_streak', best_streak, 'correct_count', correct_count, 'answered_count', answered_count,
    'rank', (select count(*) + 1 from public.players o where o.session_id = p.session_id and o.xp > p.xp))
  from public.players p where p.id = p_player;
$$;

create or replace function public.submit_answer(p_player uuid, p_qid text, p_choice int)
returns json language plpgsql security definer set search_path = public as $$
declare
  pl public.players; st public.session_state; q public.questions; k public.question_keys;
  v_ok boolean; v_ms int; v_pts int := 0; v_rows int;
begin
  select * into pl from public.players where id = p_player;
  if not found then return json_build_object('ok', false, 'reason', 'unknown_player'); end if;
  select * into st from public.session_state where session_id = pl.session_id;
  if st.qid is distinct from p_qid or st.phase <> 'open' then
    return json_build_object('ok', false, 'reason', 'closed');
  end if;
  if st.ends_at is not null and now() > st.ends_at + interval '1500 milliseconds' then
    return json_build_object('ok', false, 'reason', 'late');
  end if;
  select * into q from public.questions where id = p_qid;
  select * into k from public.question_keys where question_id = p_qid;
  if q.id is null or k.question_id is null then return json_build_object('ok', false, 'reason', 'unknown_question'); end if;
  if p_choice < 0 or p_choice >= jsonb_array_length(q.options) then
    return json_build_object('ok', false, 'reason', 'bad_choice');
  end if;
  v_ok := (p_choice = k.correct);
  v_ms := greatest(0, (extract(epoch from (now() - st.opened_at)) * 1000)::int);
  if v_ok then
    v_pts := q.points + round(5 * greatest(0, 1 - v_ms::numeric / (greatest(st.duration,1) * 1000)))::int;
  end if;
  insert into public.answers(session_id, player_id, question_id, choice, correct, points, ms)
  values (pl.session_id, pl.id, p_qid, p_choice, v_ok, v_pts, v_ms)
  on conflict (player_id, question_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return json_build_object('ok', false, 'reason', 'already'); end if;
  update public.players set
    xp = xp + v_pts,
    answered_count = answered_count + 1,
    correct_count = correct_count + (case when v_ok then 1 else 0 end),
    streak = case when v_ok then streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when v_ok then streak + 1 else 0 end)
  where id = pl.id;
  return json_build_object('ok', true);
end $$;

create or replace function public.get_result(p_player uuid, p_qid text)
returns json language plpgsql stable security definer set search_path = public as $$
declare pl public.players; st public.session_state; a public.answers; k public.question_keys;
begin
  select * into pl from public.players where id = p_player;
  if not found then return null; end if;
  select * into st from public.session_state where session_id = pl.session_id;
  if st.qid is distinct from p_qid or st.phase <> 'reveal' then return null; end if;
  select * into k from public.question_keys where question_id = p_qid;
  select * into a from public.answers where player_id = p_player and question_id = p_qid;
  return json_build_object('answered', a.id is not null, 'choice', a.choice, 'correct', coalesce(a.correct, false),
    'points', coalesce(a.points, 0), 'ms', a.ms, 'correct_choice', k.correct, 'explanation', k.explanation);
end $$;

create or replace function public.get_key(p_session text, p_qid text)
returns json language plpgsql stable security definer set search_path = public as $$
declare st public.session_state; k public.question_keys;
begin
  select * into st from public.session_state where session_id = p_session;
  if not public.is_admin() and (st.qid is distinct from p_qid or st.phase <> 'reveal') then return null; end if;
  select * into k from public.question_keys where question_id = p_qid;
  return json_build_object('correct', k.correct, 'explanation', k.explanation);
end $$;

create or replace function public.answer_counts(p_session text, p_qid text)
returns table(choice int, n int) language sql stable security definer set search_path = public as $$
  select choice, count(*)::int from public.answers where session_id = p_session and question_id = p_qid group by choice;
$$;

create or replace function public.submit_idea(p_player uuid, p_title text, p_problem text, p_solution text, p_tech text)
returns json language plpgsql security definer set search_path = public as $$
declare pl public.players; v_id uuid; v_count int;
begin
  select * into pl from public.players where id = p_player;
  if not found then return json_build_object('ok', false, 'reason', 'unknown_player'); end if;
  select count(*) into v_count from public.ideas where player_id = p_player;
  if v_count >= 2 then return json_build_object('ok', false, 'reason', 'limit'); end if;
  if char_length(btrim(coalesce(p_title,''))) < 3 then return json_build_object('ok', false, 'reason', 'title'); end if;
  insert into public.ideas(session_id, player_id, team, author, title, problem, solution, tech)
  values (pl.session_id, pl.id, pl.team, pl.name, left(btrim(p_title),80), left(coalesce(p_problem,''),300),
          left(coalesce(p_solution,''),300), left(coalesce(p_tech,''),80))
  returning id into v_id;
  update public.players set xp = xp + 10 where id = pl.id;
  return json_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.vote_idea(p_player uuid, p_idea uuid)
returns json language plpgsql security definer set search_path = public as $$
declare pl public.players; idea public.ideas; v_prev uuid;
begin
  select * into pl from public.players where id = p_player;
  select * into idea from public.ideas where id = p_idea and not hidden;
  if pl.id is null or idea.id is null or idea.session_id <> pl.session_id then
    return json_build_object('ok', false, 'reason', 'invalid');
  end if;
  if idea.player_id = pl.id then return json_build_object('ok', false, 'reason', 'own'); end if;
  select idea_id into v_prev from public.idea_votes where player_id = pl.id and session_id = pl.session_id;
  insert into public.idea_votes(session_id, player_id, idea_id) values (pl.session_id, pl.id, p_idea)
  on conflict (session_id, player_id) do update set idea_id = excluded.idea_id;
  if v_prev is null then update public.players set xp = xp + 2 where id = pl.id; end if;
  update public.ideas i set votes = (select count(*) from public.idea_votes v where v.idea_id = i.id)
   where i.id in (p_idea, v_prev);
  return json_build_object('ok', true, 'idea', p_idea);
end $$;

create or replace function public.my_vote(p_player uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select idea_id from public.idea_votes where player_id = p_player limit 1;
$$;

create or replace function public.ask_question(p_player uuid, p_body text)
returns json language plpgsql security definer set search_path = public as $$
declare pl public.players; v_count int;
begin
  select * into pl from public.players where id = p_player;
  if not found then return json_build_object('ok', false, 'reason', 'unknown_player'); end if;
  if char_length(btrim(coalesce(p_body,''))) < 3 then return json_build_object('ok', false, 'reason', 'short'); end if;
  select count(*) into v_count from public.qa where player_id = pl.id;
  if v_count >= 5 then return json_build_object('ok', false, 'reason', 'limit'); end if;
  insert into public.qa(session_id, player_id, author, team, body)
  values (pl.session_id, pl.id, pl.name, pl.team, left(btrim(p_body), 280));
  if v_count < 3 then update public.players set xp = xp + 5 where id = pl.id; end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.vote_qa(p_player uuid, p_qa uuid)
returns json language plpgsql security definer set search_path = public as $$
declare pl public.players; q public.qa; v_has boolean;
begin
  select * into pl from public.players where id = p_player;
  select * into q from public.qa where id = p_qa and status <> 'hidden';
  if pl.id is null or q.id is null or q.session_id <> pl.session_id then return json_build_object('ok', false); end if;
  select exists(select 1 from public.qa_votes where qa_id = p_qa and player_id = pl.id) into v_has;
  if v_has then
    delete from public.qa_votes where qa_id = p_qa and player_id = pl.id;
  else
    insert into public.qa_votes(qa_id, player_id) values (p_qa, pl.id);
  end if;
  update public.qa set votes = (select count(*) from public.qa_votes where qa_id = p_qa) where id = p_qa;
  return json_build_object('ok', true, 'voted', not v_has);
end $$;

create or replace function public.my_qa_votes(p_player uuid)
returns table(qa_id uuid) language sql stable security definer set search_path = public as $$
  select qa_id from public.qa_votes where player_id = p_player;
$$;

create or replace function public.submit_feedback(p_player uuid, p_rating int, p_clarity int, p_best text, p_more text)
returns json language plpgsql security definer set search_path = public as $$
declare pl public.players; v_rows int;
begin
  select * into pl from public.players where id = p_player;
  if not found then return json_build_object('ok', false); end if;
  insert into public.feedback(session_id, player_id, rating, clarity, best_part, wants_more)
  values (pl.session_id, pl.id, least(5,greatest(1,p_rating)), least(5,greatest(1,p_clarity)),
          left(coalesce(p_best,''),200), left(coalesce(p_more,''),200))
  on conflict (session_id, player_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows > 0 then update public.players set xp = xp + 10 where id = pl.id; end if;
  return json_build_object('ok', true, 'new', v_rows > 0);
end $$;

create or replace function public.redeem_code(p_player uuid, p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare pl public.players; st public.session_state; s public.sessions; v_rows int;
begin
  select * into pl from public.players where id = p_player;
  if not found then return json_build_object('ok', false, 'reason', 'unknown_player'); end if;
  select * into st from public.session_state where session_id = pl.session_id;
  select * into s from public.sessions where id = pl.session_id;
  if st.mode <> 'finale' then return json_build_object('ok', false, 'reason', 'not_yet'); end if;
  if upper(btrim(coalesce(p_code,''))) <> upper(s.secret_code) then return json_build_object('ok', false, 'reason', 'wrong'); end if;
  insert into public.claims(session_id, player_id, kind) values (pl.session_id, pl.id, 'finale')
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows > 0 then update public.players set xp = xp + 20 where id = pl.id; end if;
  return json_build_object('ok', true, 'new', v_rows > 0);
end $$;

-- ---------------------------------------------------------------------
-- 6) دوال المقدّم (تتطلب حسابًا مسجّلًا ضمن admins)
-- ---------------------------------------------------------------------
create or replace function public.admin_goto(p_session text, p_slide int, p_total int, p_kind text,
                                             p_title text, p_note text, p_mode text, p_qid text default null,
                                             p_duration int default 20, p_break_minutes int default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.session_state set
    slide = p_slide, total_slides = p_total, scene_kind = p_kind,
    scene_title = coalesce(p_title,''), scene_note = coalesce(p_note,''),
    mode = p_mode, qid = p_qid, phase = 'idle', duration = coalesce(p_duration, 20),
    opened_at = null, ends_at = null,
    break_until = case when p_break_minutes is null then null else now() + make_interval(mins => p_break_minutes) end,
    updated_at = now()
  where session_id = p_session;
  return public.get_state(p_session);
end $$;

create or replace function public.admin_open_question(p_session text, p_qid text, p_duration int default null)
returns json language plpgsql security definer set search_path = public as $$
declare q public.questions; v_d int;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into q from public.questions where id = p_qid;
  v_d := coalesce(p_duration, q.duration, 20);
  update public.session_state set mode = 'quiz', qid = p_qid, phase = 'open', duration = v_d,
    opened_at = now(), ends_at = now() + make_interval(secs => v_d), updated_at = now()
  where session_id = p_session;
  return public.get_state(p_session);
end $$;

create or replace function public.admin_set_phase(p_session text, p_phase text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_phase not in ('idle','open','closed','reveal') then raise exception 'bad_phase'; end if;
  update public.session_state set phase = p_phase,
    ends_at = case when p_phase in ('closed','reveal') and ends_at > now() then now() else ends_at end,
    updated_at = now()
  where session_id = p_session;
  return public.get_state(p_session);
end $$;

create or replace function public.admin_reset(p_session text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  delete from public.players where session_id = p_session;      -- يحذف الإجابات والأفكار والأسئلة تلقائيًا
  update public.session_state set slide = 0, mode = 'slides', qid = null, phase = 'idle',
    opened_at = null, ends_at = null, break_until = null, scene_title = '', scene_note = '', updated_at = now()
  where session_id = p_session;
  return public.get_state(p_session);
end $$;

revoke all on function public.admin_goto(text,int,int,text,text,text,text,text,int,int) from public, anon;
revoke all on function public.admin_open_question(text,text,int) from public, anon;
revoke all on function public.admin_set_phase(text,text) from public, anon;
revoke all on function public.admin_reset(text) from public, anon;
grant execute on function public.admin_goto(text,int,int,text,text,text,text,text,int,int) to authenticated;
grant execute on function public.admin_open_question(text,text,int) to authenticated;
grant execute on function public.admin_set_phase(text,text) to authenticated;
grant execute on function public.admin_reset(text) to authenticated;

grant execute on function public.get_state(text), public.join_player(text,text,text,text), public.my_stats(uuid),
  public.submit_answer(uuid,text,int), public.get_result(uuid,text), public.get_key(text,text),
  public.answer_counts(text,text), public.submit_idea(uuid,text,text,text,text), public.vote_idea(uuid,uuid),
  public.my_vote(uuid), public.ask_question(uuid,text), public.vote_qa(uuid,uuid), public.my_qa_votes(uuid),
  public.submit_feedback(uuid,int,int,text,text), public.redeem_code(uuid,text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7) الجلسة الافتراضية + تفعيل Realtime لجدول الحالة
-- ---------------------------------------------------------------------
insert into public.sessions(id, title) values ('main', 'اليوم التعريفي · علم البيانات والذكاء الاصطناعي 2026')
on conflict (id) do nothing;
insert into public.session_state(session_id) values ('main') on conflict (session_id) do nothing;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.session_state;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
