export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Transparent Proxy Handler: If ?url= is passed, fetch and stream the target manifest/segment directly
  const targetProxyUrl = url.searchParams.get('url');
  if (targetProxyUrl) {
    try {
      const upstreamResponse = await fetch(targetProxyUrl, {
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://studyparcham.in/',
          'Origin': 'https://studyparcham.in'
        }
      });
      
      const newHeaders = new Headers(upstreamResponse.headers);
      Object.keys(corsHeaders).forEach(h => newHeaders.set(h, corsHeaders[h]));

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: newHeaders
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  let batchId = null;
  let subjectId = null;
  let lectureId = null;

  if (request.method === 'GET') {
    const key = url.searchParams.get('key');
    if (key !== 'Sharma' && key !== 'devansh') {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized GET request. Key is required." }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    batchId = url.searchParams.get('batchId');
    subjectId = url.searchParams.get('subjectId');
    lectureId = url.searchParams.get('lectureId') || url.searchParams.get('scheduleId');
  } else if (request.method === 'POST') {
    try {
      const body = await request.json();
      batchId = body.batchId;
      subjectId = body.subjectId;
      lectureId = body.lectureId || body.scheduleId;
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (!batchId || !lectureId) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Missing 'batchId', 'subjectId' or 'lectureId' parameters." 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const targetUrl = `https://www.learnxpw.site/api/video-url?batch_id=${batchId}&subject_id=${subjectId}&video_id=${lectureId}`;

    const apiResponse = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://studyparcham.in/',
        'Origin': 'https://studyparcham.in'
      }
    });

    const responseText = await apiResponse.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: "Cloudflare Blocked: Upstream API returned HTML instead of JSON.",
        rawResponse: responseText.slice(0, 300)
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!data.success || !data.data) {
      return new Response(JSON.stringify({ success: false, error: "Invalid response structure from upstream API", raw: data }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const rawUrl = data.data.url || '';
    const rawSignedUrl = data.data.signedUrl || '';
    let fullDash = rawSignedUrl ? `${rawUrl}${rawSignedUrl}` : rawUrl;

    let hlsUrl = '';
    let dashUrl = '';

    if (fullDash) {
      hlsUrl = data.data.hlsUrl || '';
      const workerBase = `${url.protocol}//${url.host}${url.pathname}`;
      dashUrl = `${workerBase}?url=${encodeURIComponent(fullDash)}`;
    }

    let kid = null;
    let licenseInfo = null;

    try {
      const mpdResponse = await fetch(fullDash);
      let mpdText = await mpdResponse.text();

      const kidMatch = mpdText.match(/(?:default_KID|cenc:default_KID)\s*=\s*"([^"]+)"/i);
      if (kidMatch && kidMatch[1]) {
        kid = kidMatch[1].replace(/-/g, '').toLowerCase();
      }

      if (kid) {
        const otpResponse = await fetch(`https://www.learnxpw.site/api/get-otp?kid=${kid}`, {
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://studyparcham.in/',
            'Origin': 'https://studyparcham.in'
          }
        });
        const otpText = await otpResponse.text();
        try {
          licenseInfo = JSON.parse(otpText);
        } catch (err) {
          licenseInfo = otpText;
        }
      }
    } catch (err) {}

    const minimalResponse = {
      success: true,
      url: hlsUrl,
      dashUrl: dashUrl,
      keys: licenseInfo?.clearKeys || licenseInfo || data.data.keys || {}
    };

    return new Response(JSON.stringify(minimalResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
