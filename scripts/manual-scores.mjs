// Manually-transcribed panel scores for candidates whose forms are NOT in the
// workbook (scanned paper forms under "Fellowship Applicants/").
//
// Each panelist entry gives raw scores and the weighting scale they used:
//   scale 50  → official weights 15/10/10/10/5  (norm = raw)
//   scale 80  → weights 20/15/15/15/5           (norm = raw * official/wtUsed)
// Normalisation to the official 50-point scheme is handled in ingest.mjs.

export const MANUAL_SCORES = {
  // e.g. 'jane-doe': { interviewDay, submissions: {...}, panel: [{ panelist, scale, scores: {...}, recommendation, comment }] }
}

// Official-weight under each scale, per criterion key.
export const SCALE_WEIGHTS = {
  50: { cultural_fit: 15, critical_thinking: 10, communication: 10, commitment: 10, appearance: 5 },
  80: { cultural_fit: 20, critical_thinking: 15, communication: 15, commitment: 15, appearance: 5 },
}
