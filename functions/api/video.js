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
    const targetUrl = `https://pw.deltaverse.site/api/internal/get-stream-url?video_id=${lectureId}&batch_id=${batchId}&subject_id=${subjectId || 'hehe'}`;

    const apiResponse = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://pw.deltaverse.site/',
        'Origin': 'https://pw.deltaverse.site'
      }
    });

    const responseText = await apiResponse.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: "Upstream API returned non-JSON response.",
        rawResponse: responseText.slice(0, 300)
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!data.success || !data.data || !data.data.url) {
      return new Response(JSON.stringify({ success: false, error: "Invalid response structure from upstream API", raw: data }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const minimalResponse = {
      success: true,
      url: data.data.url,
      keys: {}
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
