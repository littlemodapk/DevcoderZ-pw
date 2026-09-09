export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const rawPath = requestUrl.pathname;
  const rawSearch = requestUrl.search;

  const subPath = rawPath.replace(/^\/api/, '');
  
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
    const incomingHeaders = context.request.headers;
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
