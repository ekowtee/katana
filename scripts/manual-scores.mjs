// Manually-transcribed panel scores for candidates whose forms are NOT in the
// workbook (scanned paper forms under "Fellowship Applicants/<Name> DATJF.pdf").
//
// Each panelist entry gives raw scores and the weighting scale they used:
//   scale 50  → official weights 15/10/10/10/5  (norm = raw)
//   scale 80  → weights 20/15/15/15/5           (norm = raw * official/wtUsed)
// Normalisation to the official 50-point scheme is handled in ingest.mjs.

export const MANUAL_SCORES = {
  'miracle-naza': {
    interviewDay: 'Thursday 12 June',
    submissions: {
      whyFellowship:
        'I believe I would greatly benefit from the Daniel A. Twum Jnr. Fellowship because it aligns with my passion for creativity, leadership, and social impact. As someone who has worked across communications, digital storytelling, sustainability advocacy, and community engagement, I see this fellowship as an opportunity to deepen my skills, expand my professional network, and gain mentorship from experienced leaders in the creative ecosystem. The fellowship will help me refine my creative and strategic thinking, expose me to innovative ideas, and strengthen my ability to create impactful campaigns and projects that inspire change. Most importantly, it will support my journey toward becoming a stronger voice in Africa’s creative and communications space while equipping me to empower others through storytelling, innovation, and collaboration.',
      careerAmbitions:
        'I hope the Daniel A. Twum Jnr. Fellowship will contribute to my career and personal ambitions by equipping me with the mentorship, leadership development, and industry exposure needed to grow within the creative and communications space. I believe being part of the fellowship will strengthen my ability to think strategically, collaborate with other creatives, and develop innovative solutions that create social impact. As someone passionate about storytelling, digital communications, and community transformation, I am particularly excited about opportunities for networking, skills development, and learning from experienced professionals. I believe these experiences will contribute significantly to my journey toward becoming a leading communications and creative strategist who uses media and innovation to influence positive change across Africa.',
      personalStatement:
        'Growing up with a deep interest in communication, storytelling, and community impact, I have always been passionate about using creativity as a tool for change. My academic background in Mass Communications from the Ghana Institute of Journalism and my professional experiences across communications, sustainability, media, and digital strategy have shaped my desire to contribute meaningfully to Ghana’s growing creative ecosystem. Over the years, I have built experience in communications management, content development, digital storytelling, and project coordination through roles with organizations such as Mayekoo Foundation, Chaint Afrique, Coliba Ghana Recycling, and MTN Ghana. These opportunities allowed me to work on campaigns that combined creativity with social impact — from producing multilingual advocacy content for coastal communities to leading awareness campaigns on sustainability and waste management. Through this work, I discovered that the creative ecosystem is not limited to entertainment alone; it is also a powerful platform for education, advocacy, innovation, and community transformation. In the long term, I aspire to become a leading communications and creative strategist who develops impactful campaigns and platforms that empower communities, young people, and social enterprises across Africa.',
    },
    panel: [
      {
        panelist: 'Ekow Thompson', scale: 50, recommendation: 'Strongly Recommend',
        scores: { cultural_fit: 13, critical_thinking: 8, communication: 9, commitment: 9, appearance: 4 },
        comment: 'Wonderful experience as a PR professional; strong real-life projects.',
      },
      {
        panelist: 'Phyllis Woode-Nartey', scale: 50, recommendation: 'Strongly Recommend',
        scores: { cultural_fit: 13, critical_thinking: 9, communication: 9, commitment: 8, appearance: 4 },
        comment: 'Graduate of GIJ; worked with Woezor TV. Creative, great communicator, PR background, emotional maturity.',
      },
      {
        panelist: 'Ewuradjoa Aikins', scale: 50, recommendation: 'Strongly Recommend',
        scores: { cultural_fit: 13, critical_thinking: 8, communication: 8, commitment: 8, appearance: 4 },
        comment: 'Good fit based on her experience in other fellowships and mentoring; an open book, eager to learn.',
      },
      {
        panelist: 'Jason Nartey', scale: 50, recommendation: 'Strongly Recommend',
        scores: { cultural_fit: 13, critical_thinking: 8, communication: 9, commitment: 8, appearance: 5 },
        comment: 'Confident, articulate and experienced. Good candidate.',
      },
    ],
  },
}

// Official-weight under each scale, per criterion key.
export const SCALE_WEIGHTS = {
  50: { cultural_fit: 15, critical_thinking: 10, communication: 10, commitment: 10, appearance: 5 },
  80: { cultural_fit: 20, critical_thinking: 15, communication: 15, commitment: 15, appearance: 5 },
}
