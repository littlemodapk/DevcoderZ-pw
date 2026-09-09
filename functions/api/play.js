export async function onRequest(context) {
  const urlObj = new URL(context.request.url);
  const userUrl = urlObj.searchParams.get("url");

  if (!userUrl) {
    return new Response("URL parameter is missing", { status: 400 });
  }

  // Yahan user ke diye gaye URL ko proxy.studyparcham.in ke sath combine kar diya gaya hai
  const targetUrl = "https://proxy.studyparcham.in/" + userUrl;

  try {
    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": context.request.headers.get("user-agent") || "Mozilla/5.0",
      },
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
