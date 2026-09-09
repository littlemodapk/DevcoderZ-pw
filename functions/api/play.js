// api/play.js

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("Missing URL parameter");
  }

  try {
    const targetUrl = decodeURIComponent(url);
    
    // Fetch the target m3u8 playlist or segment
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        "Referer": new URL(targetUrl).origin,
      },
    });

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch upstream: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    // Allow CORS for your player domain
    res.setHeader("Access-Control-Allow-Origin", "*");

    const bodyText = await response.text();

    // If it's an m3u8 playlist, rewrite relative/absolute segment URLs to route through this proxy
    if (targetUrl.includes(".m3u8") || bodyText.includes("#EXTM3U")) {
      const baseUrl = new URL(targetUrl);
      
      const rewrittenLines = bodyText.split("\n").map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return line;
        }

        let absoluteSegmentUrl;
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          absoluteSegmentUrl = trimmed;
        } else if (trimmed.startsWith("/")) {
          absoluteSegmentUrl = `${baseUrl.origin}${trimmed}`;
        } else {
          const basePath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf("/") + 1);
          absoluteSegmentUrl = `${baseUrl.origin}${basePath}${trimmed}`;
        }

        return `/api/play?url=${encodeURIComponent(absoluteSegmentUrl)}`;
      });

      return res.status(200).send(rewrittenLines.join("\n"));
    }

    // For ts/m4s segments or other binary assets, return the text/buffer directly
    return res.status(200).send(bodyText);

  } catch (error) {
    return res.status(500).send(`Proxy Error: ${error.message}`);
  }
}
