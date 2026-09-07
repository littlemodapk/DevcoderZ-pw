export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let batchId, subjectId, lectureId;

  if (req.method === "POST") {
    const body = req.body || {};
    batchId = body.batchId;
    subjectId = body.subjectId;
    lectureId = body.lectureId || body.scheduleId;
  } else if (req.method === "GET") {
    const query = req.query || {};
    if (query.key !== "devansh") {
      return res.status(403).json({ error: "Unauthorized access" });
    }
    batchId = query.batchId;
    subjectId = query.subjectId;
    lectureId = query.lectureId || query.scheduleId;
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!batchId || !subjectId || !lectureId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const targetUrl = `https://physicswallah.koyeb.app/api/video-url?batchId=${batchId}&subjectId=${subjectId}&scheduleId=${lectureId}`;

  try {
    const apiRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json"
      }
    });

    const data = await apiRes.json();
    const mpdUrl = data.video_url || "";
    const m3u8Url = mpdUrl.replace("master.mpd", "master.m3u8");

    return res.status(200).json({
      ...data,
      url: mpdUrl,
      m3u8Url: m3u8Url
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}