import bootstrapPrompt from "../prompts/bootstrap/BOOTSTRAP.md?raw";
import outputContractPrompt from "../prompts/bootstrap/OUTPUT_CONTRACT.md?raw";
import systemPrompt from "../prompts/bootstrap/SYSTEM.md?raw";

export type BootstrapStage = "identity" | "soul" | "connect" | "review";

export type BootstrapReachPreference = "just here" | "whatsapp" | "telegram" | null;

export interface BootstrapProfile {
  agentName: string | null;
  agentNature: string | null;
  agentVibe: string | null;
  agentEmoji: string | null;
  userName: string | null;
  preferredAddress: string | null;
  timezone: string | null;
  notes: string[];
  values: string[];
  behaviorPreferences: string[];
  boundaries: string[];
  reachPreference: BootstrapReachPreference;
}

export interface BootstrapReview {
  aboutAgent: string;
  aboutUser: string;
  readinessNote: string;
}

export interface BootstrapTurnResult {
  message: string;
  stage: BootstrapStage;
  isComplete: boolean;
  completionSignal: "done" | null;
  profile: BootstrapProfile;
  review: BootstrapReview;
}

export interface BootstrapMessage {
  role: "user" | "assistant";
  content: string;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

const EMPTY_PROFILE: BootstrapProfile = {
  agentName: null,
  agentNature: null,
  agentVibe: null,
  agentEmoji: null,
  userName: null,
  preferredAddress: null,
  timezone: null,
  notes: [],
  values: [],
  behaviorPreferences: [],
  boundaries: [],
  reachPreference: null,
};

const EMPTY_REVIEW: BootstrapReview = {
  aboutAgent: "",
  aboutUser: "",
  readinessNote: "",
};

function getApiKey(): string {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing VITE_GROQ_API_KEY for Groq bootstrap chat.");
  }

  return apiKey;
}

function getModel(): string {
  return import.meta.env.VITE_GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sanitizeReachPreference(value: unknown): BootstrapReachPreference {
  if (value === "just here" || value === "whatsapp" || value === "telegram") {
    return value;
  }

  return null;
}

function sanitizeProfile(value: unknown): BootstrapProfile {
  if (!value || typeof value !== "object") {
    return EMPTY_PROFILE;
  }

  const record = value as Record<string, unknown>;

  /*
    The UI treats missing fields as "still unknown", so sanitizing every field
    here keeps the page stable even if the model omits or mangles part of the JSON.
  */
  return {
    agentName: typeof record.agentName === "string" ? record.agentName.trim() || null : null,
    agentNature:
      typeof record.agentNature === "string" ? record.agentNature.trim() || null : null,
    agentVibe: typeof record.agentVibe === "string" ? record.agentVibe.trim() || null : null,
    agentEmoji: typeof record.agentEmoji === "string" ? record.agentEmoji.trim() || null : null,
    userName: typeof record.userName === "string" ? record.userName.trim() || null : null,
    preferredAddress:
      typeof record.preferredAddress === "string"
        ? record.preferredAddress.trim() || null
        : null,
    timezone: typeof record.timezone === "string" ? record.timezone.trim() || null : null,
    notes: sanitizeStringArray(record.notes),
    values: sanitizeStringArray(record.values),
    behaviorPreferences: sanitizeStringArray(record.behaviorPreferences),
    boundaries: sanitizeStringArray(record.boundaries),
    reachPreference: sanitizeReachPreference(record.reachPreference),
  };
}

function sanitizeReview(value: unknown): BootstrapReview {
  if (!value || typeof value !== "object") {
    return EMPTY_REVIEW;
  }

  const record = value as Record<string, unknown>;

  return {
    aboutAgent: typeof record.aboutAgent === "string" ? record.aboutAgent.trim() : "",
    aboutUser: typeof record.aboutUser === "string" ? record.aboutUser.trim() : "",
    readinessNote: typeof record.readinessNote === "string" ? record.readinessNote.trim() : "",
  };
}

function extractJsonPayload(rawContent: string): unknown {
  const trimmed = rawContent.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBraceIndex = trimmed.indexOf("{");
    const lastBraceIndex = trimmed.lastIndexOf("}");

    if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex) {
      throw new Error("Groq bootstrap response did not include a JSON object.");
    }

    return JSON.parse(trimmed.slice(firstBraceIndex, lastBraceIndex + 1));
  }
}

function sanitizeTurnResult(value: unknown): BootstrapTurnResult {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawStage = record.stage;
  const stage: BootstrapStage =
    rawStage === "identity" || rawStage === "soul" || rawStage === "connect" || rawStage === "review"
      ? rawStage
      : "identity";

  return {
    message:
      typeof record.message === "string" && record.message.trim()
        ? record.message.trim()
        : "hey. i just came online. who am i? who are you?",
    stage,
    isComplete: record.isComplete === true,
    completionSignal: record.completionSignal === "done" ? "done" : null,
    profile: sanitizeProfile(record.profile),
    review: sanitizeReview(record.review),
  };
}

function buildConversationPayload(messages: BootstrapMessage[]): string {
  if (messages.length === 0) {
    return "no prior conversation yet.";
  }

  return messages.map((message) => `${message.role}: ${message.content}`).join("\n");
}

export async function runBootstrapTurn(params: {
  messages: BootstrapMessage[];
  profile: BootstrapProfile;
}): Promise<BootstrapTurnResult> {
  const apiKey = getApiKey();

  /*
    This prototype calls Groq directly from the client so the application page
    can be iterated quickly. For production, move this behind a server so the key
    is never exposed to the browser.
  */
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.35,
      max_completion_tokens: 1000,
      top_p: 1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [systemPrompt, bootstrapPrompt, outputContractPrompt].join("\n\n"),
        },
        {
          role: "user",
          content: [
            "current saved bootstrap profile:",
            JSON.stringify(params.profile, null, 2),
            "",
            "conversation so far:",
            buildConversationPayload(params.messages),
            "",
            "produce the next bootstrap turn now.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq bootstrap request failed: ${response.status} ${errorText}`);
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
    throw new Error("Groq bootstrap response was empty.");
  }

  return sanitizeTurnResult(extractJsonPayload(content));
}

export { EMPTY_PROFILE, EMPTY_REVIEW };
