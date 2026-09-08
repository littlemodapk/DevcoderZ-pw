export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Query parameters lena (e.g., ?batchId=...&lectureId=...)
  const batchId = url.searchParams.get('batchId');
  const lectureId = url.searchParams.get('lectureId');

  // CORS headers enable karna
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!batchId || !lectureId) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Missing 'batchId' or 'lectureId' query parameters." 
    }), { status: 400, headers: corsHeaders });
  }

  try {
    const targetUrl = `https://video-detail.studyparcham.in/?batch_id=${batchId}&video_id=${lectureId}`;

    // Kyunki yeh Cloudflare par chal raha hai, yahan block hone ka chance nahi ke barabar hai
    const apiResponse = await fetch(targetUrl, {
      headers: {
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
        error: "Upstream API returned HTML instead of JSON.",
        rawResponse: responseText.slice(0, 300)
      }), { status: 502, headers: corsHeaders });
    }

    if (!data.success || !data.data || !data.data.url) {
      return new Response(JSON.stringify({ success: false, error: "Invalid response structure from upstream API", raw: data }), { status: 500, headers: corsHeaders });
    }

    const fullUrl = data.data.url;
    const [baseUrl, queryString] = fullUrl.split('?');
    const signedUrlQuery = queryString ? `?${queryString}` : '';

    const modifiedResponse = {
      success: true,
      data: {
        hlsUrl: `${baseUrl.replace('master.m3u8', 'master.m3u8')}`, 
        dashUrl: `${baseUrl.replace('master.m3u8', 'master.mpd')}`,  
        signedUrl: signedUrlQuery,
        fullHls: `${baseUrl.replace('master.m3u8', 'master.m3u8')}${signedUrlQuery}`,
        fullDash: `${baseUrl.replace('master.m3u8', 'master.mpd')}${signedUrlQuery}`
      },
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

    return new Response(JSON.stringify(modifiedResponse), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
  }
}
