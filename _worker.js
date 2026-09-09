export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Sirf /api/ se shuru hone wali requests ko proxy karenge
    if (path.startsWith("/api/")) {
      const subPath = path.replace(/^\/api/, '');
      const rawSearch = url.search;
      
      const searchParams = new URLSearchParams(rawSearch);
      const explicitUrl = searchParams.get('url');

      let actualTargetUrl = "";
      if (explicitUrl) {
        actualTargetUrl = explicitUrl;
      } else {
        actualTargetUrl = "https://d1d34p8vz63oiq.cloudfront.net" + subPath + rawSearch;
      }

      const targetUrl = "https://proxy.studyparcham.in/" + actualTargetUrl;

      try {
        const incomingHeaders = request.headers;
        const fetchHeaders = {
          "User-Agent": incomingHeaders.get("user-agent") || "Mozilla/5.0",
        };

        if (incomingHeaders.has("range")) {
          fetchHeaders["Range"] = incomingHeaders.get("range");
        }

        const upstreamResponse = await fetch(targetUrl, {
          headers: fetchHeaders,
        });

        const responseHeaders = new Headers(upstreamResponse.headers);
        responseHeaders.set("Access-Control-Allow-Origin", "*");

        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          headers: responseHeaders,
        });
      } catch (err) {
        return new Response("Proxy failed: " + err.message, { status: 500 });
      }
    }

    // Baaki sabhi normal static files ke liye fetch() call karein
    return env.ASSETS.fetch(request);
  }
};
