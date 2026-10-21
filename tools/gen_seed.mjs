import { QUESTIONS } from '../js/content.js';
import fs from 'fs';
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
let out = `-- يُولَّد تلقائيًا من js/content.js  (cd tools && node gen_seed.mjs)\n-- الأسئلة + مفاتيح الإجابة. شغّله بعد schema.sql. آمن لإعادة التشغيل.\n\n`;
QUESTIONS.forEach((x, i) => {
  out += `insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values (${q(x.id)}, ${q(x.act)}, ${i + 1}, 'mcq', ${q(x.body)}, ${q(JSON.stringify(x.options))}::jsonb, ${x.media ? q(x.media) : 'null'}, ${x.duration || 20}, 10)\n  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;\n`;
  out += `insert into public.question_keys(question_id, correct, explanation) values (${q(x.id)}, ${x.correct}, ${q(x.why || '')})\n  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;\n`;
});
fs.writeFileSync('../supabase/seed.sql', out);
console.log('questions:', QUESTIONS.length);
