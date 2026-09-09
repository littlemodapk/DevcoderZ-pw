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

  let batchId = url.searchParams.get('batchId');
  let subjectId = url.searchParams.get('subjectId');
  let lectureId = url.searchParams.get('lectureId') || url.searchParams.get('scheduleId');

  if (!batchId || !lectureId) {
    return new Response(JSON.stringify({ success: false, error: "Missing parameters" }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const targetUrl = `https://www.learnxpw.site/api/video-url?batch_id=${batchId}&subject_id=${subjectId}&video_id=${lectureId}`;
    const apiResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://studyparcham.in/',
        'Origin': 'https://studyparcham.in'
      }
    });

    const data = await apiResponse.json();
    if (!data.success || !data.data) {
      return new Response(JSON.stringify({ success: false, error: "Upstream API error", raw: data }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const rawUrl = data.data.url || '';
    const rawSignedUrl = data.data.signedUrl || '';
    const fullDash = rawSignedUrl ? `${rawUrl}${rawSignedUrl}` : rawUrl;

    // Fetch MPD and strip Widevine tags inside the worker itself (Bypasses browser CORS)
    const mpdRes = await fetch(fullDash);
    let mpdText = await mpdRes.text();

    mpdText = mpdText.replace(/<ContentProtection[^>]*schemeIdUri="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"[^>]*>[\s\S]*?<\/ContentProtection>/gi, '');
    mpdText = mpdText.replace(/<ContentProtection[^>]*schemeIdUri="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"[^>]*\/>/gi, '');

    // Extract Kid for license/keys if needed
    let kid = null;
    let licenseInfo = null;
    const kidMatch = mpdText.match(/(?:default_KID|cenc:default_KID)\s*=\s*"([^"]+)"/i);
    if (kidMatch && kidMatch[1]) {
      kid = kidMatch[1].replace(/-/g, '').toLowerCase();
      const otpResponse = await fetch(`https://www.learnxpw.site/api/get-otp?kid=${kid}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://studyparcham.in/' }
      });
      try { licenseInfo = await otpResponse.json(); } catch(e){}
    }

    return new Response(JSON.stringify({
      success: true,
      manifestText: mpdText,
      originalUrl: fullDash,
      keys: licenseInfo?.clearKeys || data.data.keys || {}
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
