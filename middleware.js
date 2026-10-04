// Vercel Routing Middleware, in front of the SPA's document. index.html is a static file, so
// the API function never gets to put a header on it; this does. When TERRANOVA_URL is set,
// the portal may be framed by TerraNova (The Ninani Group's staff front door) and by itself,
// and by nobody else. When it is not set the response is passed through untouched.
//
// Every client route (/, /launch, /portal/...) is served index.html by the vercel.json
// catch-all, so match those: everything except the API, the handoff route, and files
// (a last path segment with a dot: /assets/*.js, favicons, ...), plus /index.html itself.
export const config = {
  matcher: ['/index.html', '/((?!api(?:/|$)|sso/|assets/|brand/|.*\\.[^/]*$).*)'],
}

export default function middleware() {
  const headers = new Headers({ 'x-middleware-next': '1' }) // carry on to the static file
  try {
    const terranova = new URL(process.env.TERRANOVA_URL).origin
    if (terranova.startsWith('http')) headers.set('Content-Security-Policy', `frame-ancestors 'self' ${terranova}`)
  } catch {
    // TERRANOVA_URL is not set (or is not an address): no framing header, as before
  }
  return new Response(null, { headers })
}
