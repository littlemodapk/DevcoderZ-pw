export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const rawSearch = url.search;

    const searchParams = new URLSearchParams(rawSearch);
    const explicitUrl = searchParams.get('url');

    // 1. Agar request HLS stream ya proxy URL ki hai
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

    // 2. Agar request /api/video-url ki hai (Yahan apna video-url ka logic ya fetch daalein)
    if (path === "/api/video-url") {
      // Agar aapka video-url code kisi aur backend par request bhejta hai, toh wo yahan likha jayega.
      // Ya agar aapke paas iska purana code hai, toh wo y yahan paste kiya ja sakta hai.
    }

    // 3. Baaki normal static files ke liye
    return env.ASSETS.fetch(request);
  }
};
