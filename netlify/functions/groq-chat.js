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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const apiKey = process.env.GROQ_API_KEY1;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server is missing GROQ_API_KEY" })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON body" })
    };
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "messages array is required" })
    };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: payload.model || "llama-3.3-70b-versatile",
        messages: payload.messages,
        max_tokens: payload.max_tokens || 600,
        temperature: payload.temperature ?? 0.7
      })
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Failed to reach Groq API" })
    };
  }
};
