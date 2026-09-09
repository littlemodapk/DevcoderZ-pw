export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const rawSearch = url.search;

    const searchParams = new URLSearchParams(rawSearch);
    const explicitUrl = searchParams.get('url');

    // Sirf tabhi proxy chalayein jab request HLS stream ki ho ya 'url' parameter ho
    // Aapke /api/video-url jaise normal APIs seedha pass-through honge
    if (path.startsWith("/api/hls/") || explicitUrl) {
      let actualTargetUrl = "";
      
      if (explicitUrl) {
        actualTargetUrl = explicitUrl;
      } else {
        const subPath = path.replace(/^\/api/, '');
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

    // Baaki sabhi requests (jaise /api/video-url aur static files) apne normal route par jayengi
    return env.ASSETS.fetch(request);
  }
};
