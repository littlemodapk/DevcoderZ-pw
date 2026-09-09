export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const batchId = url.searchParams.get('batchId');
  const subjectId = url.searchParams.get('subjectId');
  const lectureId = url.searchParams.get('lectureId');

  if (!batchId || !lectureId) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Missing 'batchId','subjectId' or 'lectureId' query parameters." 
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
        'Sec-Ch-Ua': '"Not(A:Brand";v="99", "Google Chrome";v="124", "Chromium";v="124"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
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

    const dashUrl = rawUrl;
    const hlsUrl = rawUrl.replace('master.mpd', 'master.m3u8');

    const fullDash = rawSignedUrl ? `${dashUrl}${rawSignedUrl}` : dashUrl;
    const fullHls = rawSignedUrl ? `${hlsUrl}${rawSignedUrl}` : hlsUrl;

    let kid = null;
    let licenseInfo = null;

    try {
      const mpdResponse = await fetch(fullDash);
      const mpdText = await mpdResponse.text();
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
    } catch (err) {
    }

    const modifiedResponse = {
      success: true,
      data: {
        hlsUrl: hlsUrl,
        dashUrl: dashUrl,
        signedUrl: rawSignedUrl,
        fullHls: fullHls,
        fullDash: fullDash
      },
      kid: kid,
      license: licenseInfo,
      urlType: data.urlType || "penpencilvdo",
      scheduleInfo: data.scheduleInfo || {},
      videoContainer: data.videoContainer || "DASH",
      isCmaf: data.isCmaf || false,
      serverTime: data.serverTime || Date.now(),
      cdnType: data.cdnType || "Cloudfront",
      videoId: data.videoId || lectureId,
      signatureExpireAt: data.signatureExpireAt || null,
      dataFrom: "The DevCoderZ api"
    };

    return new Response(JSON.stringify(modifiedResponse), {
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
