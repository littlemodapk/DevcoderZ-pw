export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const batchId = url.searchParams.get('batchId');
  const videoId = url.searchParams.get('lectureId');

  const targetUrl = new URL('https://video-detail.studyparcham.in/');
  if (batchId) targetUrl.searchParams.set('batch_id', batchId);
  if (videoId) targetUrl.searchParams.set('video_id', videoId);

  try {
    const proxyResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
    });

    const responseHeaders = new Headers(proxyResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(proxyResponse.body, {
      status: proxyResponse.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
