// Vercel serverless entry — exposes the Express app as a single function.
// vercel.json rewrites /api/* to this file; req.url keeps the full /api/... path
// so the Express routes (defined with the /api prefix) match unchanged.
import app from '../server/index.mjs'

export default app
