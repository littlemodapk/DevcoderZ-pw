export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization, Cookie',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ success: false, error: "Missing 'url' query parameter." }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const decodedTargetUrl = decodeURIComponent(targetUrl);

    const modifiedHeaders = new Headers();
    modifiedHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    modifiedHeaders.set('Referer', 'https://studyparcham.in/');
    modifiedHeaders.set('Origin', 'https://studyparcham.in');

    const range = request.headers.get('Range');
    if (range) {
      modifiedHeaders.set('Range', range);
    }

    const apiResponse = await fetch(decodedTargetUrl, {
      headers: modifiedHeaders,
      redirect: 'follow'
    });

    const responseHeaders = new Headers(corsHeaders);
    
    const contentType = apiResponse.headers.get('Content-Type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }

    const contentLength = apiResponse.headers.get('Content-Length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = apiResponse.headers.get('Content-Range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    const acceptRanges = apiResponse.headers.get('Accept-Ranges');
    if (acceptRanges) {
      responseHeaders.set('Accept-Ranges', acceptRanges);
    }

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers: responseHeaders
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
