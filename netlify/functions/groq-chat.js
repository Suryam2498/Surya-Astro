const https = require('https');

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!Array.isArray(payload.messages) || !payload.messages.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "messages required" }) };
  }

  const body = JSON.stringify({
    model: "gemini-1.5-flash",
    messages: payload.messages,
    max_tokens: payload.max_tokens || 800,
    temperature: payload.temperature ?? 0.7
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/openai/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, headers, body: data });
        } catch {
          resolve({ statusCode: 502, headers, body: JSON.stringify({ error: "Bad response from Gemini" }) });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 502, headers, body: JSON.stringify({ error: "Request failed: " + err.message }) });
    });

    req.write(body);
    req.end();
  });
};
