export default async function handler(req, res) {
    // Aapke purane format ke parameters
    const { batchId, subjectId } = req.query;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!batchId || !subjectId) {
        return res.status(400).json({ 
            error: "Required parameters (batchId, subjectId) missing." 
        });
    }

    try {
        // Target API ke liye parameters ko wahan ke format mein convert kiya hai
        const targetUrl = `https://eduvibe-pw-api.wasmer.app/chapters.php?batch_id=${batchId}&subject_id=${subjectId}`;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error("Wasmer cluster chapters response failed");

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch data securely from core network." });
    }
}