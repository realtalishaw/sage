const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

function getApiKey(): string {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing VITE_GROQ_API_KEY for Groq name generation.");
  }

  return apiKey;
}

function getModel(): string {
  return import.meta.env.VITE_GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

export interface GeneratedName {
  firstName: string;
  lastName: string;
}

/**
 * Generate a creative name for an AI cofounder using GROQ
 */
export async function generateAiCofounderName(): Promise<GeneratedName> {
  const apiKey = getApiKey();

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.9,
      max_completion_tokens: 100,
      messages: [
        {
          role: "system",
          content: "You are a creative name generator. Generate unique, memorable names for AI cofounders. Return only a JSON object with firstName and lastName fields. The name should be professional yet creative, suitable for 'Sage, your AI cofounder that gets things done'.",
        },
        {
          role: "user",
          content: "Generate a creative first and last name for an AI cofounder. Return only JSON in this exact format: {\"firstName\": \"...\", \"lastName\": \"...\"}",
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq name generation failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned empty response for name generation");
  }

  // Extract JSON from the response
  const trimmed = content.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Try to find JSON in the content
    const firstBraceIndex = trimmed.indexOf("{");
    const lastBraceIndex = trimmed.lastIndexOf("}");

    if (firstBraceIndex === -1 || lastBraceIndex === -1) {
      throw new Error("Could not extract JSON from Groq response");
    }

    parsed = JSON.parse(trimmed.slice(firstBraceIndex, lastBraceIndex + 1));
  }

  // Validate and sanitize the response
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid name generation response");
  }

  const record = parsed as Record<string, unknown>;
  const firstName = typeof record.firstName === "string" ? record.firstName.trim() : "";
  const lastName = typeof record.lastName === "string" ? record.lastName.trim() : "";

  if (!firstName || !lastName) {
    throw new Error("Invalid name format in Groq response");
  }

  return { firstName, lastName };
}
