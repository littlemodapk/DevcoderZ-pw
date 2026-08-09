export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    
    // Query parameters nikalna
    const batchId = url.searchParams.get('batchId');
    const subjectId = url.searchParams.get('subjectId');

    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json; charset=utf-8'
    };

    // Preflight request handle karna
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    if (!batchId || !subjectId) {
        return new Response(JSON.stringify({ 
            error: "Required parameters (batchId, subjectId) missing." 
        }), {
            status: 400,
            headers: corsHeaders
        });
    }

    try {
        const targetUrl = `https://eduvibe-pw-api.wasmer.app/chapters.php?batch_id=${batchId}&subject_id=${subjectId}`;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error("Wasmer cluster chapters response failed");

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: corsHeaders
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ 
            error: "Failed to fetch data securely from core network." 
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
