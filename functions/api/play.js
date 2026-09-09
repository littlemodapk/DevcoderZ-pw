export async function onRequest(context) {
  const urlObj = new URL(context.request.url);
  const rawUserUrl = urlObj.searchParams.get("url");

  if (!rawUserUrl) {
    return new Response("URL parameter is missing", { status: 400 });
  }

  // Yahan URL ko fully decode kiya jata hai taaki sare special characters (&, =, ?) wapas theek ho jayein
  const decodedUserUrl = decodeURIComponent(rawUserUrl);

  // Ab proxy domain ke sath properly combine karenge
  const targetUrl = "https://proxy.studyparcham.in/" + decodedUserUrl;

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
    return new Response("api failed: " + err.message, { status: 500 });
  }
}
