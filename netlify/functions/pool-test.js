const Anthropic = require("@anthropic-ai/sdk").default;

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Method not allowed" };
  }

  try {
    const { image } = JSON.parse(event.body);
    if (!image) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "No image" }) };
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data } },
          { type: "text", text: `אתה מומחה לניתוח סטיקים לבדיקת מי בריכה.

זהה את הצבעים על הסטיק ותן ערכים מספריים:

1. כלור חופשי: צהוב=0-1, ירוק בהיר=1-3 (תקין), ירוק כהה=3-5 ppm
2. pH: כתום=6.2-6.8, צהוב=6.8-7.2, ירוק=7.2-7
