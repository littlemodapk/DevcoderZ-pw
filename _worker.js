export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const rawSearch = url.search;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // 1. Handle /api/video-url endpoint
    if (path === '/api/video-url') {
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
        if (key !== 'Sharma') {
          return new Response(JSON.stringify({ success: false, error: "Unauthorized GET request. Key 'Sharma' is required." }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        batchId = url.searchParams.get('batchId');
        subjectId = url.searchParams.get('subjectId');
        lectureId = url.searchParams.get('lectureId');
      } else if (request.method === 'POST') {
        try {
          const body = await request.json();
          batchId = body.batchId;
          subjectId = body.subjectId;
          lectureId = body.lectureId;
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
          error: "Missing 'batchId','subjectId' or 'lectureId' parameters." 
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
        } catch (err) {}

        const streamHls = `(fullHls)}`;
        const streamDash = `https://examcrushers.in/api/play?url=${encodeURIComponent(fullDash)}`;

        const modifiedResponse = {
          success: true,
          data: {
            hlsUrl: hlsUrl,
            dashUrl: dashUrl,
            signedUrl: rawSignedUrl,
            fullHls: fullHls,
            fullDash: fullDash,
            streamHls: streamHls,
            streamDash: streamDash
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

    // 2. Handle HLS Streams / Proxy Logic (Fixed: Handles both /api/hls/ direct paths and /api/play?url=...)
    const explicitUrl = url.searchParams.get('url');

    if (path.startsWith("/api/play") || path.startsWith("/api/hls/") || explicitUrl) {
      let actualTargetUrl = "";
      
      if (explicitUrl) {
        actualTargetUrl = explicitUrl;
      } else {
        const idx = rawSearch.indexOf('url=');
        if (idx !== -1) {
          actualTargetUrl = rawSearch.substring(idx + 4);
        } else {
          // Yeh ensure karega ki agar direct /api/hls/240/main.m3u8 hit ho toh wo cloudfront par map ho jaye
          const subPath = path.replace(/^\/api/, '');
          actualTargetUrl = "https://d1d34p8vz63oiq.cloudfront.net" + subPath + rawSearch;
        }
      }

      const targetUrl = "https://proxy.studyparcham.in/" + actualTargetUrl;

      try {
        const incomingHeaders = request.headers;
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

    // 3. Fallback for static assets / frontend files
    return env.ASSETS.fetch(request);
  }
};
