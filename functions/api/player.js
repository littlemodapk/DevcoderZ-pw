const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        let bId, sId, vId;

        const rawUrl = req.url || '';
        const cleanUrl = rawUrl.split('?')[0];
        const pathParts = cleanUrl.split('/').filter(Boolean);
        const playerIndex = pathParts.indexOf('player');

        if (playerIndex !== -1 && pathParts.length >= playerIndex + 3) {
            bId = pathParts[playerIndex + 1];
            sId = pathParts[playerIndex + 2];
            vId = pathParts[playerIndex + 3];
        } else if (req.query && req.query.ids) {
            const parts = req.query.ids.split('/');
            if (parts.length >= 3) {
                bId = parts[0];
                sId = parts[1];
                vId = parts[2];
            }
        } else if (req.query && req.query.batchId && req.query.subjectId && req.query.videoId) {
            bId = req.query.batchId;
            sId = req.query.subjectId;
            vId = req.query.videoId;
        }

        if (!bId || !sId || !vId) {
            return res.status(400).json({ success: false, message: "Missing required parameters" });
        }

        const targetUrl = `https://rangexcoder-api.vercel.app/batch/${bId}/subject/${sId}/video/${vId}`;
        const response = await axios.get(targetUrl);

        let jsonString = JSON.stringify(response.data)
            .replace(/rolexcoderz\.com/g, 'devcoderz-backend.vercel.app')
            .replace(/rangexcoder\.vercel\.app/g, 'devcoderz-backend.vercel.app');

        return res.status(200).send(jsonString);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};