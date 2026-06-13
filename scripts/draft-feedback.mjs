/**
 * Drafts candidate-facing feedback from the panel forms and stores it as
 * UNAPPROVED entries in candidate_feedback (admin reviews/edits/approves before
 * anything is published to a candidate). Idempotent — safe to re-run.
 *
 * Run:  node scripts/draft-feedback.mjs
 */
import { pool } from '../server/db.mjs'

const F = {
  // ── SELECTED ──────────────────────────────────────────────────────────────
  'freda-twum': {
    overall:
      'Congratulations, Freda — you were the panel’s clear top pick, with a unanimous Strongly Recommend. We were struck by your eloquence, the fluency of your ideas, and the creative thinking you brought to every question. The way you combine an academic grounding in brands and communication with real-world experience — running Aura Nouvelle and producing for Woezor TV — gives you a rare, well-rounded foundation. We’re excited to see you grow with us, and we expect you to help set the pace for your cohort.',
    criteria: {
      cultural_fit: 'You embodied the spirit of the Fellowship — confident, personable, and genuinely engaged. The panel felt you would both thrive in and elevate the cohort.',
      critical_thinking: 'Strong ideation and creative problem-solving. Keep pushing your ideas from creative to strategic — connecting them to measurable outcomes.',
      communication: 'Articulate and assured; your ability to express ideas clearly is a real asset.',
      commitment: 'You came across as serious and available — exactly the engagement the programme rewards.',
      appearance: 'Polished and professional throughout.',
    },
  },
  'miracle-naza': {
    overall:
      'Congratulations, Miracle — the panel was unanimous in recommending you. Your professional experience in PR, your track record across real campaigns and mentoring, and the emotional maturity you brought to the room all stood out. You came across as a confident, articulate communicator who is also genuinely eager to keep learning. We’re confident you’ll both contribute to and grow within the Fellowship.',
    criteria: {
      cultural_fit: 'A natural fit — mature, grounded, and collaborative.',
      critical_thinking: 'Solid, experience-informed thinking; keep stretching toward original, insight-led ideas.',
      communication: 'A genuine strength — clear, persuasive, and warm.',
      commitment: 'Your openness to learn and readiness to commit were evident.',
      appearance: 'Professional and composed.',
    },
  },
  'seyram-ametepeh': {
    overall:
      'Congratulations, Seyram — a unanimous Strongly Recommend. The panel valued the unusual balance you bring: an accounting foundation paired with a self-taught, genuinely curious approach to digital marketing. That structured, left-and-right-brain balance will be an asset to your cohort. As you grow with us, focus on sharpening your presentation and delivery, so your strong thinking lands with equal confidence.',
    criteria: {
      cultural_fit: 'Well-rounded and collaborative; you’ll bring useful structure to the team.',
      critical_thinking: 'Strong analytical instincts from your accounting and project-management experience.',
      communication: 'Your ideas are sound — work on delivery and presentation so they’re as compelling as they are well-reasoned.',
      commitment: 'Clear passion and readiness to invest.',
      appearance: 'Presentable and professional.',
    },
  },
  'isaac-dwamena': {
    overall:
      'Congratulations, Isaac — the panel recommends you, and several of us strongly. What stood out was your diligence and preparedness, your solid grounding in marketing, and an openness that makes you very teachable — exactly what the Fellowship is built to develop. As you grow with us, let your authentic voice and confidence come through; the substance is already there.',
    criteria: {
      cultural_fit: 'Keen, resilient, and a genuine team player.',
      critical_thinking: 'Solid theoretical foundation; we’ll help you apply it to real industry problems.',
      communication: 'Clear and prepared; keep building confidence and sincerity in delivery.',
      commitment: 'Diligent and eager — a model of the teachable mindset we look for.',
      appearance: 'Well presented.',
    },
  },
  'theodora-amo-yartey': {
    overall:
      'Congratulations, Theodora — the panel recommends you for the Fellowship. We were struck by how you composed yourself and answered thoughtfully even under visible nerves; that resilience says a lot. You have the time, the willingness to learn, and a generous spirit to give back. As you grow with us, focus on two things: trusting yourself more — let your confidence rise to match your ability — and sharpening the clarity and projection of your spoken delivery.',
    criteria: {
      cultural_fit: 'Willing, warm, and resilient — qualities that travel far.',
      critical_thinking: 'You think on your feet; keep building strategic depth.',
      communication: 'Your ideas are good — work on clarity and projection so they land with full confidence.',
      commitment: 'You have the time and the will to invest, and to give back.',
      appearance: 'Well presented.',
    },
  },
  'ernest-adofo': {
    overall:
      'Congratulations, Ernest — the panel recommends you. Your hands-on craft as a producer and director, and the body of real work you’ve built, give you a strong foundation the Fellowship can build on. You came across as self-driven and ready to take your work to the next level. Your growth areas are clear and very coachable: sharpening your strategic analysis and the articulation of your ideas, so your storytelling is matched by strategic framing.',
    criteria: {
      cultural_fit: 'Grounded, self-driven, and collaborative.',
      critical_thinking: 'Strong production instincts; we’ll help you add strategic analysis.',
      communication: 'Capable; focus on articulating your ideas crisply and concisely.',
      commitment: 'Clearly motivated to level up your craft.',
      appearance: 'Presentable; a little more polish will reinforce your professionalism.',
    },
  },
  'willkings-avonor': {
    overall:
      'Congratulations, Willkings — the panel recommends you, several of us strongly. You bring the fundamentals we look for, plus a creative edge from your photography, branding, and musical background that will enrich your work. You’re versatile and clearly capable. One candid, practical note from the panel: invest in personal presentation and grooming — in this industry it’s part of how professionalism is read. The talent is evident; let your presentation match it.',
    criteria: {
      cultural_fit: 'Versatile and creative — a strong cultural add.',
      critical_thinking: 'Strong — one of your higher marks.',
      communication: 'Clear and capable.',
      commitment: 'Motivated and ready to engage.',
      appearance: 'This was your lowest-scoring area. Polished, professional presentation will meaningfully strengthen the impression you make — and it’s an easy, high-impact thing to get right.',
    },
  },
  'janelle-gavu': {
    overall:
      'Congratulations, Janelle — a unanimous Recommend. The panel warmed to your likeable personality, your composure under pressure, and a genuinely teachable attitude — you’re exactly the kind of candidate the Fellowship can develop. Your clearest growth area is critical thinking and creativity: strengthening how you apply the fundamentals of advertising and PR to real problems. We see strong potential and look forward to helping you build on it.',
    criteria: {
      cultural_fit: 'Likeable, composed, and coachable.',
      critical_thinking: 'Your main development area — we’ll focus on sharpening analytical and creative problem-solving, and applying the fundamentals of advertising and PR.',
      communication: 'Confident and expressive.',
      commitment: 'A great attitude and real willingness to learn.',
      appearance: 'Polished and presentable — one of your standout areas.',
    },
  },

  // ── FOR DISCUSSION (conditional / availability) ────────────────────────────
  'rhemah-forkuo': {
    overall:
      'Rhemah, you made a strong impression — the panel found you mature, exceptionally well-exposed, and unafraid to challenge the status quo. Your eloquence, advocacy background, and multidisciplinary perspective are real strengths your peers could learn from. The one open question we’d like to discuss with you directly is availability: balancing the Fellowship’s demands alongside your PhD workload. We’d love to talk through how you’d manage that commitment before we finalise next steps — we think the conversation is well worth having.',
    criteria: {
      cultural_fit: 'Mature, confident, and a genuine contributor to group thinking.',
      critical_thinking: 'Sharp and broad; channel that intellect toward creative, campaign-ready ideas.',
      communication: 'Outstanding — among the most articulate we heard.',
      commitment: 'The capability is clear; availability alongside your studies is the point we’d like to confirm together.',
    },
  },
  'belinda-quansah': {
    overall:
      'Belinda, you impressed the panel — confident, quick on your feet, personable, with clear leadership presence. Several of us felt you could be an ideal fit. The one thing we need to resolve together is availability: your full-time role in broadcast journalism, alongside your studies, may make it hard to get the full benefit of the in-person mentoring at the heart of the programme. We’d like to discuss how you’d balance this before confirming a place — we think you’re well worth that conversation.',
    criteria: {
      cultural_fit: 'Personable and a natural leader.',
      critical_thinking: 'Strong — you think clearly on your feet.',
      communication: 'Excellent, as one would expect from a broadcaster.',
      commitment: 'Your motivation is clear; the practical question is availability for the in-person sessions.',
    },
  },
  'precious-konadu': {
    overall:
      'Precious, the panel appreciated your confidence, persistence, and the digital and industry exposure you already bring. Opinions were genuinely split, which is why we’d like to discuss your application further rather than close it. Two areas would strengthen your case: a clearer commitment to the programme’s demands, and continued development of your strategic thinking and communication — including strengthening your spoken and written expression. We’d value a conversation about how you see these.',
    criteria: {
      cultural_fit: 'A pleasant, confident presence with real industry exposure.',
      critical_thinking: 'Room to grow in strategy — turning hands-on execution into strategic thinking.',
      communication: 'Keep strengthening diction and expression; reading widely will help.',
      commitment: 'We’d like to confirm your availability and commitment to the full programme.',
    },
  },

  // ── RESERVE / TRAINING ACADEMY ─────────────────────────────────────────────
  'dora-addotey': {
    overall:
      'Dora, you made a genuinely strong impression — eloquent, personable, and bringing valuable experience in customer relationship management, entrepreneurship, and coaching. The panel sees you as a real asset and has placed you high on our reserve list, with a strong chance of joining the cohort. (Your interview was held virtually, which limited part of the assessment.) We’d be glad to keep this conversation open.',
    criteria: {
      cultural_fit: 'A warm, capable presence with strong people skills.',
      critical_thinking: 'Practical, business-minded thinking.',
      communication: 'Eloquent and assured.',
      commitment: 'Clear enthusiasm to contribute.',
      appearance: 'Well presented, even over video.',
    },
  },
  'sampson-klu': {
    overall:
      'Sampson, thank you for a thoughtful interview — your clarity of thought and aspiration came through, as did a real passion to learn. The panel sees you at an exciting career-change moment and believes the strongest next step for you is our Training Academy track, which is designed to prepare candidates like you for the industry ahead of joining a future Fellowship cohort. Please read this as a deliberate, encouraging path rather than a “no” — we’d be glad to welcome you into the Academy with a view to the Fellowship to follow.',
    criteria: {
      cultural_fit: 'Personable, with clear drive and direction.',
      critical_thinking: 'Solid; the Academy will help sharpen applied, industry-ready thinking.',
      communication: 'A development area we’ll work on together in the Academy.',
      commitment: 'Your availability and willingness to learn are real positives.',
      appearance: 'Well presented.',
    },
  },
  'padmore-yankey': {
    overall:
      'Padmore, you were a pleasure to interview — likeable, empathetic, and already directing your energy toward social impact and mentoring schoolchildren. The panel sees real potential in you. Our recommendation reflects timing more than anything: you’re in Level 200, with two more years of study ahead. We’d love to keep developing you through our Training Academy and mentorship now, with a strong view to a future cohort. Please take this as an encouraging “not yet,” not a “no.”',
    criteria: {
      cultural_fit: 'Warm, likeable, and community-minded.',
      critical_thinking: 'Good potential that the Academy will help hone.',
      communication: 'Developing well; keep building.',
      commitment: 'Your heart for impact is clear; the practical constraint is your remaining years of study.',
      appearance: 'Presentable.',
    },
  },
  'diana-nartey': {
    overall:
      'Diana, thank you for interviewing with us. You bring practical, hands-on digital and social-media marketing experience that aligns with what the Fellowship values, and you held your composure under pressure. The panel has placed you on our reserve list: the clearest opportunity for growth is strategy — moving from executing tactics to thinking strategically — alongside building confidence and polish. We’d encourage you to develop these, including through our Training Academy, and we’d be glad to stay in touch about future opportunities.',
    criteria: {
      cultural_fit: 'Experienced and willing; keep building confidence.',
      critical_thinking: 'Your key area for growth: developing strategic thinking beyond practical execution.',
      communication: 'Continue strengthening diction and clarity.',
      commitment: 'Your relevant experience is a real asset.',
      appearance: 'An area to invest in — polished presentation will strengthen the impression you make.',
    },
  },

  // ── NOT SELECTED ──────────────────────────────────────────────────────────
  'derrick-crowis': {
    overall:
      'Derrick, thank you for taking the time to interview with us. After careful consideration, the panel has decided not to offer you a place in this Fellowship cohort. We want to be honest and respectful with you: on the day, the depth of analysis and explanation the programme calls for wasn’t yet fully evident, particularly in how ideas were developed and articulated. This is not a verdict on your worth or your professional experience, including your background in security printing — the panel simply felt your strengths may be better served by other pathways at this time. We genuinely wish you well and encourage you to keep building.',
    criteria: {
      critical_thinking: 'An area to develop — building depth in how you analyse problems and reason through them.',
      communication: 'Focus on explaining your thinking more fully and clearly, with supporting detail.',
      appearance: 'You presented yourself professionally.',
    },
  },

  // ── NOT INTERVIEWED / REDIRECTED ──────────────────────────────────────────
  'rasheed-zakariah': {
    overall:
      'Rasheed, thank you for sharing your work — your talent as a sculptor and ceramic artist clearly impressed the panel. For this cohort we weren’t able to complete a full interview assessment, and the panel felt the Fellowship may not be the right home for your particular craft just now. What we’d warmly encourage instead is our Training Academy, which is better suited to developing and showcasing artists like you. We’d love to keep the door open along that path.',
    criteria: {},
  },
  'kevin-kodjo': {
    overall:
      'Kevin, we were sorry not to meet you — our records show you weren’t available for your scheduled interview, so we weren’t able to assess your application in this round. As an established self-taught graphic designer you clearly have a foundation to build on, and we’d genuinely welcome the chance to consider you for a future cohort. Please reach out to the coordination team if you’d like to re-engage.',
    criteria: {},
  },
}

// ── upsert as UNAPPROVED drafts ──────────────────────────────────────────────
const client = pool
let n = 0
for (const [slug, fb] of Object.entries(F)) {
  const items = [{ key: null, body: fb.overall }, ...Object.entries(fb.criteria || {}).map(([k, body]) => ({ key: k, body }))]
  for (const it of items) {
    if (!it.body) continue
    await client.query(
      `insert into candidate_feedback (candidate_slug, criterion_key, body, approved)
       values ($1,$2,$3,false)
       on conflict (candidate_slug, coalesce(criterion_key, ''))
       do update set body = excluded.body, approved = false, updated_at = now()`,
      [slug, it.key, it.body]
    )
    n++
  }
}
console.log(`✓ drafted ${n} feedback entries across ${Object.keys(F).length} candidates (all UNAPPROVED — pending review).`)
await pool.end()
