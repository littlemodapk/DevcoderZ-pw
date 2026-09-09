export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const rawQueryString = requestUrl.search;

  if (!rawQueryString || !rawQueryString.includes('url=')) {
    return new Response("URL parameter is missing", { status: 400 });
  }

  const actualTargetUrl = rawQueryString.substring(rawQueryString.indexOf('url=') + 4);
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
