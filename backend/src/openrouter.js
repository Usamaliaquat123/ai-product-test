// Thin wrapper around OpenRouter's chat completions endpoint.
// OpenRouter is OpenAI-compatible, so this can be swapped for the OpenAI SDK
// or any other OpenAI-compatible provider with very little change.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function chatCompletion({
  messages,
  model,
  temperature = 0.7,
  responseFormat,
  maxTokens = 1200,
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Copy .env.example to .env and add your key."
    );
  }

  const body = {
    model: model || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // OpenRouter recommends these so requests can be attributed.
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_APP_NAME || "AI Quiz App",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return { content, raw: data };
}

// Many models like to wrap JSON in ```json ... ``` fences or add prose.
// This pulls out the first JSON object/array we can find and parses it.
export function extractJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty AI response");
  }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : text;

  try {
    return JSON.parse(candidate.trim());
  } catch {
    // Fall back to grabbing the first {...} or [...] block.
    const firstBrace = candidate.search(/[\[{]/);
    const lastBrace = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const sliced = candidate.slice(firstBrace, lastBrace + 1);
      return JSON.parse(sliced);
    }
    throw new Error("Could not parse JSON from AI response");
  }
}
