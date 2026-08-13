const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Aapka apna domain jo response mein replace hokar aayega
const MY_DOMAIN = 'devcoderz-backend.vercel.app';

app.get('/batch/:bId/subject/:sId/video/:vId', async (req, res) => {
    const { bId, sId, vId } = req.params;
    const targetApiUrl = `https://rangexcoder-api.vercel.app/batch/${bId}/subject/${sId}/video/${vId}`;

    try {
        // 1. Background mein original API se data fetch karna
        const apiResponse = await axios.get(targetApiUrl);
        let responseData = apiResponse.data;

        // 2. Data ko string mein convert karke unke domains ko apne domain se badalna
        let jsonString = JSON.stringify(responseData);

        jsonString = jsonString
            .replace(/rolexcoderz\.com/g, MY_DOMAIN)
            .replace(/rangexcoder\.vercel\.app/g, MY_DOMAIN);

        // 3. Wapas JSON format mein parse karke client ko bhejna
        const finalData = JSON.parse(jsonString);
        res.json(finalData);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch data from target API', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`DevCoderz Proxy Server running on port ${PORT}`);
});
