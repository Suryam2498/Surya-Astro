const https = require('https');

// Load all Groq keys from env vars
const GROQ_KEYS = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3,
  process.env.GROQ_KEY_4,
  process.env.GROQ_KEY_5,
  process.env.GROQ_KEY_6,
].filter(Boolean); // remove undefined ones

function callGroq(apiKey, body) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
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
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', (err) => resolve({ status: 502, body: JSON.stringify({ error: err.message }) }));
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  if (!GROQ_KEYS.length) return { statusCode: 500, headers, body: JSON.stringify({ error: "No Groq keys configured" }) };

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
    model: "llama-3.1-8b-instant",
    messages: payload.messages,
    max_tokens: payload.max_tokens || 1200,
    temperature: payload.temperature ?? 0.7
  });

  // Try each key until one works
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const result = await callGroq(GROQ_KEYS[i], body);
    if (result.status === 429 || result.status === 413) {
      console.log(`Groq key ${i + 1} rate limited, trying next...`);
      continue;
    }
    return { statusCode: result.status, headers, body: result.body };
  }

  return { statusCode: 429, headers, body: JSON.stringify({ error: "All Groq keys rate limited. Try again later." }) };
};
