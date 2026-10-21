-- يُولَّد تلقائيًا من js/content.js  (node tools/gen_seed.mjs)
-- الأسئلة + مفاتيح الإجابة. شغّله بعد schema.sql. آمن لإعادة التشغيل.

insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('tf1', 'a1', 1, 'mcq', 'التخصص يعني تعلّم استخدام أدوات مثل ChatGPT فقط.', '["صح","خطأ"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('tf1', 1, 'الأدوات واجهة فقط؛ خلفها بيانات ورياضيات وخوارزميات وبرمجة.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('tf2', 'a1', 2, 'mcq', 'لا أحتاج الرياضيات في الذكاء الاصطناعي.', '["صح","خطأ"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('tf2', 1, 'الجبر الخطي والإحصاء والاحتمالات هي لغة النماذج.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('tf3', 'a1', 3, 'mcq', 'أستطيع بناء مشروعي الأول وأنا في السنة الأولى.', '["صح","خطأ"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('tf3', 0, 'ابدأ صغيرًا: تحليل ملف بيانات أو أداة بسيطة ثم كبّر.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('tf4', 'a1', 4, 'mcq', 'الذكاء الاصطناعي سيلغي كل الوظائف ولن يخلق وظائف جديدة.', '["صح","خطأ"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('tf4', 1, 'المنتدى الاقتصادي: ~170 مليون وظيفة جديدة مقابل ~92 مليون ستُستبدل بحلول 2030.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('tf5', 'a1', 5, 'mcq', 'اللغة الإنجليزية مهارة أساسية في هذا التخصص.', '["صح","خطأ"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('tf5', 0, 'أغلب التوثيق والمراجع والمكتبات والأبحاث بالإنجليزية.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('tf6', 'a1', 6, 'mcq', 'الأهم في البرمجة أن أحفظ صياغة اللغة عن ظهر قلب.', '["صح","خطأ"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('tf6', 1, 'المهم فهم المشكلة وتصميم الحل وقراءة الكود واكتشاف الأخطاء.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('tf7', 'a1', 7, 'mcq', 'أستطيع العمل مع شركات خارج فلسطين وأنا في غزة.', '["صح","خطأ"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('tf7', 0, 'عن بُعد وعبر العمل الحر، بشرط ملف أعمال قوي وإنجليزية جيدة.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('tf8', 'a1', 8, 'mcq', 'علم البيانات والذكاء الاصطناعي اسمان لشيء واحد تمامًا.', '["صح","خطأ"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('tf8', 1, 'علم البيانات يفهم البيانات، والذكاء الاصطناعي يبني أنظمة تتعلم منها؛ متداخلان لكن مختلفان.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('r1', 'a2', 9, 'mcq', 'بناء لوحة معلومات (Dashboard) تعرض مبيعات الشهر. من يقوم بها؟', '["محلل بيانات","مهندس بيانات","باحث ذكاء اصطناعي","مهندس تعلّم آلة"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('r1', 0, 'Data Analyst: تفسير البيانات وعرضها في لوحات معلومات (SQL · Excel · Power BI).')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('r2', 'a2', 10, 'mcq', 'تصميم نظام (Pipeline) ينظف ملايين السجلات يوميًا ويخزنها.', '["محلل بيانات","عالم بيانات","مهندس بيانات","مهندس ذكاء اصطناعي"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('r2', 2, 'Data Engineer: خطوط نقل البيانات وقواعدها ومخازنها.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('r3', 'a2', 11, 'mcq', 'بناء نموذج يتنبأ بأسعار المنازل من بيانات قديمة.', '["مهندس بيانات","محلل بيانات","باحث ذكاء اصطناعي","عالم بيانات"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('r3', 3, 'Data Scientist: نماذج تنبؤية باستخدام الإحصاء وتعلّم الآلة.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('r4', 'a2', 12, 'mcq', 'تدريب نموذج رؤية حاسوبية ثم نشره ومراقبته في الإنتاج.', '["محلل بيانات","مهندس تعلّم آلة","مهندس بيانات","عالم بيانات"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('r4', 1, 'ML Engineer: تصميم النماذج وتدريبها ونشرها (MLOps).')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('r5', 'a2', 13, 'mcq', 'بناء مساعد ذكي على نموذج لغوي يجيب أسئلة الطلبة (RAG).', '["مهندس بيانات","محلل بيانات","مهندس ذكاء اصطناعي","باحث ذكاء اصطناعي"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('r5', 2, 'AI Engineer: تطبيقات فوق النماذج اللغوية والرؤية (LLMs · RAG · FastAPI).')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('r6', 'a2', 14, 'mcq', 'ابتكار خوارزمية جديدة ونشرها في ورقة علمية.', '["مهندس بيانات","باحث ذكاء اصطناعي","محلل بيانات","مهندس تعلّم آلة"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('r6', 1, 'AI Researcher: يطوّر خوارزميات جديدة (غالبًا يحتاج دراسات عليا).')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('w1', 'a3', 15, 'mcq', 'من أنا؟ «أنظر إلى الصور والفيديو وأعرف الوجوه واللافتات والأجسام.»', '["الرؤية الحاسوبية","معالجة اللغات","الروبوتات","تعلّم الآلة"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('w1', 0, 'Computer Vision: فهم الصور والفيديو والتعرف على الأجسام.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('w2', 'a3', 16, 'mcq', 'من أنا؟ «أفهم الجمل وأترجمها وأحلل مشاعر كاتبها.»', '["Computer Vision","NLP","Robotics","Data Engineering"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('w2', 1, 'NLP: فهم النصوص وتوليدها وترجمتها وتحليل المشاعر.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('w3', 'a3', 17, 'mcq', 'من أنا؟ «أقترح عليك فيلمًا بناءً على ما شاهدته سابقًا.»', '["نظام توصية (Recommender)","الروبوتات","الرؤية الحاسوبية","هندسة البيانات"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('w3', 0, 'Recommender System: يتعلم من سلوكك وسلوك المستخدمين المشابهين.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('w4', 'a3', 18, 'mcq', 'من أنا؟ «طبقات كثيرة من خلايا عصبية صناعية، أميّز الأصوات والصور المعقدة.»', '["الانحدار الخطي","التعلم العميق","لوحات المعلومات","قواعد البيانات"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('w4', 1, 'Deep Learning: شبكات عصبية متعددة الطبقات للصور والأصوات.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('w5', 'a3', 19, 'mcq', 'من أنا؟ «أنقل البيانات من مصادرها وأنظفها وأخزنها لغيري ليحللها.»', '["محلل بيانات","عالم بيانات","مهندس بيانات","باحث ذكاء اصطناعي"]'::jsonb, null, 20, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('w5', 2, 'Data Engineer: جمع البيانات وتنظيفها وتخزينها وبناء الـ Pipelines.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('p1', 'a3', 20, 'mcq', 'ما المجال الذي تمثله الصورة؟', '["Robotics","NLP","Data Analytics","Healthcare AI"]'::jsonb, 'robot', 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('p1', 0, 'Robotics & Embedded AI: دمج الذكاء الاصطناعي مع الأجهزة.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('p2', 'a3', 21, 'mcq', 'ما المجال الذي تمثله الصورة؟', '["Computer Vision","NLP & LLMs","Deep Learning","Robotics"]'::jsonb, 'nlp', 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('p2', 1, 'معالجة اللغات الطبيعية والنماذج اللغوية الكبيرة: ترجمة ومحادثة وتحليل مشاعر.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('p3', 'a3', 22, 'mcq', 'ما المجال الذي تمثله الصورة؟', '["Data Analytics & BI","Computer Vision","NLP","Robotics"]'::jsonb, 'dashboard', 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('p3', 0, 'Data Analyst: لوحة مؤشرات (Dashboard) ورسوم بيانية.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('p4', 'a3', 23, 'mcq', 'ما المجال الذي تمثله الصورة؟', '["Robotics","Data Engineering","Healthcare AI","NLP"]'::jsonb, 'health', 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('p4', 2, 'Healthcare AI: التنبؤ بالخطر ومتابعة المرضى (مثل مشروع التخرج).')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('p5', 'a3', 24, 'mcq', 'ما المجال الذي تمثله الصورة؟', '["NLP","Computer Vision","Deep Learning","Data Analytics"]'::jsonb, 'vision', 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('p5', 1, 'Computer Vision: اكتشاف الأجسام (شخص، سيارة، إشارة).')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('p6', 'a3', 25, 'mcq', 'ما المجال الذي تمثله الصورة؟', '["Data Warehouse","Computer Vision","Deep Learning","Dashboard"]'::jsonb, 'neural', 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('p6', 2, 'Deep Learning: شبكة عصبية بمدخلات وطبقات مخفية ومخرجات.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('f1', 'a5', 26, 'mcq', 'ما الذي يميز الذكاء الاصطناعي عن البرمجة التقليدية؟', '["قواعد يكتبها المبرمج بيده","يتعلم الأنماط من البيانات","يعمل بلا أي بيانات"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('f1', 1, 'النموذج يتعلم القواعد من البيانات بدل أن يكتبها المبرمج.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('f2', 'a5', 27, 'mcq', 'من يبني خطوط نقل البيانات وقواعد البيانات؟', '["محلل بيانات","باحث ذكاء اصطناعي","مهندس بيانات"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('f2', 2, 'Data Engineer.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('f3', 'a5', 28, 'mcq', 'أي فرع يتعامل مع الصور والفيديو؟', '["الرؤية الحاسوبية","الروبوتات","معالجة اللغة"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('f3', 0, 'Computer Vision.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('f4', 'a5', 29, 'mcq', 'في أي سنة تدرس «تعلّم الآلة» حسب الخطة؟', '["الأولى","الثانية","الرابعة"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('f4', 1, 'السنة الثانية: Machine Learning + Data Mining + Data Visualization.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('f5', 'a5', 30, 'mcq', 'أفضل طريقة لإثبات مهاراتك لجهة توظيف؟', '["شهادة فقط","قول إنك تتعلم","مشاريع موثقة على GitHub"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('f5', 2, 'ملف أعمال (Portfolio) بمشاريع موثقة يتفوق على الادعاء.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('f6', 'a5', 31, 'mcq', 'أي تقنية يستخدمها المستشار الأكاديمي في NextStep AI؟', '["RAG","الروبوتات","الواقع المعزز"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('f6', 0, 'RAG: استرجاع المعلومات من بيانات برامج الجامعات وتوليد الإجابة.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('f7', 'a5', 32, 'mcq', 'ما دقة مساعد كشف الإجهاد المعرفي في مشروع الهاكاثون؟', '["62%","82%","99%"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('f7', 1, 'دقة 82% مع 20+ طالبًا.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
insert into public.questions(id, act, sort, kind, body, options, media, duration, points) values ('f8', 'a5', 33, 'mcq', 'ما أول خطوة في مشروع ذكاء اصطناعي ناجح؟', '["اختيار الأداة","تحديد مشكلة حقيقية","شراء حاسوب قوي"]'::jsonb, null, 15, 10)
  on conflict (id) do update set act=excluded.act, sort=excluded.sort, body=excluded.body, options=excluded.options, media=excluded.media, duration=excluded.duration;
insert into public.question_keys(question_id, correct, explanation) values ('f8', 1, 'ابدأ من مشكلة حقيقية، ثم المستخدم، ثم البيانات، ثم التقنية.')
  on conflict (question_id) do update set correct=excluded.correct, explanation=excluded.explanation;
