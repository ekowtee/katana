// Manually-transcribed panel scores for candidates whose forms are NOT in the
// workbook (scanned paper forms under "Fellowship Applicants/").
//
// Each panelist entry gives raw scores and the weighting scale they used:
//   scale 50  → default weights 15/15/10/10  (norm = raw)
// Normalisation to the official 50-point scheme is handled in ingest.mjs.

export const MANUAL_SCORES = {
  // e.g. 'jane-doe': { interviewDay, submissions: {...}, panel: [{ panelist, scale, scores: {...}, recommendation, comment }] }
}

// Official-weight under each scale, per criterion key.
export const SCALE_WEIGHTS = {
  50: { behavioural: 15, technical: 15, experience: 10, appearance: 10 },
}
