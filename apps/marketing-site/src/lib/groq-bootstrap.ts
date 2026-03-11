import bootstrapPrompt from "../prompts/bootstrap/BOOTSTRAP.md?raw";
import outputContractPrompt from "../prompts/bootstrap/OUTPUT_CONTRACT.md?raw";
import systemPrompt from "../prompts/bootstrap/SYSTEM.md?raw";

export type BootstrapStage = "identity" | "soul" | "connect" | "review";

export type BootstrapReachPreference = "just here" | "whatsapp" | "telegram" | null;

export interface BootstrapReaction {
  emoji: string;
}

export interface BootstrapMedia {
  type: "gif" | "meme";
  url: string;
  alt: string;
}

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
  reaction: BootstrapReaction | null;
  media: BootstrapMedia | null;
}

export interface BootstrapMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BootstrapContext {
  seededUserName?: string | null;
  seededAgentName?: string | null;
  previousAssistantUsedMedia?: boolean;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";
const GIPHY_API_URL = "https://api.giphy.com/v1/gifs/search";
const IMGFLIP_API_URL = "https://api.imgflip.com/caption_image";

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

const REACTION_TOOL = {
  type: "function",
  function: {
    name: "send_reaction",
    description:
      "Attach an iMessage-style reaction to the user's latest message. Pass the exact emoji you want to show, like ❤️ 👍 👎 😂 !! ? 🔥 💯 🎉 👀 🙌 🤔 😭 💀 ✨. Use this to make the chat feel alive, but never as a replacement for the text reply.",
    parameters: {
      type: "object",
      properties: {
        emoji: {
          type: "string",
          description:
            "The exact reaction glyph to display, such as ❤️, 👍, 👎, 😂, !!, ?, 🔥, 💯, 🎉, 👀, 🙌, 🤔, 😭, 💀, or ✨.",
        },
      },
      required: ["emoji"],
    },
  },
} as const;

const GIF_TOOL = {
  type: "function",
  function: {
    name: "send_gif",
    description:
      "Attach a GIF that supports the text reply. Use sparingly for a reaction, celebration, or skeptical side-eye moment.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Short search query like skeptical, side eye, celebration, impressed, chef kiss, deal, or welcome.",
        },
      },
      required: ["query"],
    },
  },
} as const;

const MEME_TOOL = {
  type: "function",
  function: {
    name: "send_meme",
    description:
      "Attach a meme image that supports the text reply. Use sparingly and only when it clearly makes the exchange funnier or more memorable.",
    parameters: {
      type: "object",
      properties: {
        template: {
          type: "string",
          enum: [
            "drake",
            "distracted_boyfriend",
            "two_buttons",
            "change_my_mind",
            "success_kid",
            "expanding_brain",
            "this_is_fine",
          ],
        },
        top_text: {
          type: "string",
        },
        bottom_text: {
          type: "string",
        },
      },
      required: ["template", "top_text"],
    },
  },
} as const;

const JSON_OUTPUT_TOOL = {
  type: "function",
  function: {
    name: "json",
    description:
      "Return the final structured bootstrap turn payload for the UI. Use this after any optional reaction or media tool calls are complete.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string" },
        stage: {
          type: "string",
          enum: ["identity", "soul", "connect", "review"],
        },
        isComplete: { type: "boolean" },
        completionSignal: {
          anyOf: [{ type: "string", enum: ["done"] }, { type: "null" }],
        },
        profile: {
          type: "object",
          properties: {
            agentName: { anyOf: [{ type: "string" }, { type: "null" }] },
            agentNature: { anyOf: [{ type: "string" }, { type: "null" }] },
            agentVibe: { anyOf: [{ type: "string" }, { type: "null" }] },
            agentEmoji: { anyOf: [{ type: "string" }, { type: "null" }] },
            userName: { anyOf: [{ type: "string" }, { type: "null" }] },
            preferredAddress: { anyOf: [{ type: "string" }, { type: "null" }] },
            timezone: { anyOf: [{ type: "string" }, { type: "null" }] },
            notes: { type: "array", items: { type: "string" } },
            values: { type: "array", items: { type: "string" } },
            behaviorPreferences: { type: "array", items: { type: "string" } },
            boundaries: { type: "array", items: { type: "string" } },
            reachPreference: {
              anyOf: [
                { type: "string", enum: ["just here", "whatsapp", "telegram"] },
                { type: "null" },
              ],
            },
          },
          required: [
            "agentName",
            "agentNature",
            "agentVibe",
            "agentEmoji",
            "userName",
            "preferredAddress",
            "timezone",
            "notes",
            "values",
            "behaviorPreferences",
            "boundaries",
            "reachPreference",
          ],
        },
        review: {
          type: "object",
          properties: {
            aboutAgent: { type: "string" },
            aboutUser: { type: "string" },
            readinessNote: { type: "string" },
          },
          required: ["aboutAgent", "aboutUser", "readinessNote"],
        },
      },
      required: [
        "message",
        "stage",
        "isComplete",
        "completionSignal",
        "profile",
        "review",
      ],
    },
  },
} as const;

const IMGFLIP_TEMPLATES: Record<string, string> = {
  drake: "181913649",
  distracted_boyfriend: "112126428",
  two_buttons: "87743020",
  change_my_mind: "129242436",
  success_kid: "61544",
  expanding_brain: "93895088",
  this_is_fine: "55311130",
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

function getGiphyApiKey(): string | null {
  return import.meta.env.VITE_GIPHY_API_KEY?.trim() || null;
}

function getImgflipCredentials() {
  const username = import.meta.env.VITE_IMGFLIP_USERNAME?.trim() || null;
  const password = import.meta.env.VITE_IMGFLIP_PASSWORD?.trim() || null;

  if (!username || !password) {
    return null;
  }

  return { username, password };
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
    reaction: null,
    media: null,
  };
}

function buildConversationPayload(messages: BootstrapMessage[]): string {
  if (messages.length === 0) {
    return "no prior conversation yet.";
  }

  return messages.map((message) => `${message.role}: ${message.content}`).join("\n");
}

function sanitizeReaction(value: unknown): BootstrapReaction | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const emoji = typeof record.emoji === "string" ? record.emoji.trim() : "";
  if (!emoji) {
    return null;
  }

  return {
    emoji,
  };
}

async function searchGiphy(query: string): Promise<BootstrapMedia | null> {
  const apiKey = getGiphyApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${GIPHY_API_URL}?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=1&rating=pg-13`,
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      data?: Array<{
        title?: string;
        images?: {
          original?: {
            url?: string;
          };
        };
      }>;
    };
    const url = payload.data?.[0]?.images?.original?.url;

    if (!url) {
      return null;
    }

    return {
      type: "gif",
      url,
      alt: payload.data?.[0]?.title?.trim() || query,
    };
  } catch {
    return null;
  }
}

async function generateMeme(params: {
  template: string;
  topText: string;
  bottomText?: string;
}): Promise<BootstrapMedia | null> {
  const credentials = getImgflipCredentials();
  if (!credentials) {
    return null;
  }

  const templateId = IMGFLIP_TEMPLATES[params.template];
  if (!templateId) {
    return null;
  }

  try {
    const body = new URLSearchParams({
      template_id: templateId,
      username: credentials.username,
      password: credentials.password,
      text0: params.topText,
      text1: params.bottomText ?? "",
    });
    const response = await fetch(IMGFLIP_API_URL, {
      method: "POST",
      body,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: {
        url?: string;
      };
    };
    const url = payload.success ? payload.data?.url : null;

    if (!url) {
      return null;
    }

    return {
      type: "meme",
      url,
      alt: params.topText,
    };
  } catch {
    return null;
  }
}

export async function runBootstrapTurn(params: {
  messages: BootstrapMessage[];
  profile: BootstrapProfile;
  context?: BootstrapContext;
}): Promise<BootstrapTurnResult> {
  const apiKey = getApiKey();
  let reaction: BootstrapReaction | null = null;
  let media: BootstrapMedia | null = null;
  let emptyResponseRetryCount = 0;
  const requestMessages: Array<Record<string, unknown>> = [
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
        "bootstrap context:",
        JSON.stringify(
          {
            seededUserName: params.context?.seededUserName ?? null,
            seededAgentName: params.context?.seededAgentName ?? null,
            previousAssistantUsedMedia: params.context?.previousAssistantUsedMedia ?? false,
          },
          null,
          2,
        ),
        "",
        "conversation so far:",
        buildConversationPayload(params.messages),
        "",
        "produce the next bootstrap turn now.",
      ].join("\n"),
    },
  ];

  /*
    This prototype calls Groq directly from the client so the application page
    can be iterated quickly. For production, move this behind a server so the key
    is never exposed to the browser.
  */
  while (true) {
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
        tools: [REACTION_TOOL, GIF_TOOL, MEME_TOOL, JSON_OUTPUT_TOOL],
        messages: requestMessages,
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
          tool_calls?: Array<{
            id?: string;
            type?: string;
            function?: {
              name?: string;
              arguments?: string;
            };
          }>;
        };
      }>;
    };

    const choiceMessage = payload.choices?.[0]?.message;
    const toolCalls = choiceMessage?.tool_calls ?? [];

    if (toolCalls.length > 0) {
      requestMessages.push({
        role: "assistant",
        content: choiceMessage?.content ?? null,
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name;
        const rawArguments = toolCall.function?.arguments ?? "{}";
        let parsedArguments: Record<string, unknown> = {};

        try {
          parsedArguments = JSON.parse(rawArguments) as Record<string, unknown>;
        } catch {
          parsedArguments = {};
        }

        if (toolName === "send_reaction") {
          reaction = sanitizeReaction(parsedArguments);
          requestMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              ok: true,
              reaction,
            }),
          });
          continue;
        }

        if (toolName === "send_gif") {
          if (params.context?.previousAssistantUsedMedia) {
            requestMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                ok: false,
                error: "previous assistant turn already used media. do not send gifs or memes back to back.",
              }),
            });
            continue;
          }

          const query =
            typeof parsedArguments.query === "string" && parsedArguments.query.trim()
              ? parsedArguments.query.trim()
              : "reaction";
          const nextMedia = await searchGiphy(query);
          if (nextMedia) {
            media = nextMedia;
          }

          requestMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              ok: Boolean(nextMedia),
              media: nextMedia,
            }),
          });
          continue;
        }

        if (toolName === "send_meme") {
          if (params.context?.previousAssistantUsedMedia) {
            requestMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                ok: false,
                error: "previous assistant turn already used media. do not send gifs or memes back to back.",
              }),
            });
            continue;
          }

          const nextMedia = await generateMeme({
            template:
              typeof parsedArguments.template === "string" ? parsedArguments.template : "drake",
            topText:
              typeof parsedArguments.top_text === "string" ? parsedArguments.top_text : "",
            bottomText:
              typeof parsedArguments.bottom_text === "string"
                ? parsedArguments.bottom_text
                : "",
          });
          if (nextMedia) {
            media = nextMedia;
          }

          requestMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              ok: Boolean(nextMedia),
              media: nextMedia,
            }),
          });
          continue;
        }

        if (toolName === "json") {
          const result = sanitizeTurnResult(parsedArguments);
          return {
            ...result,
            reaction,
            media,
          };
        }

        requestMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            ok: false,
            error: `unknown tool: ${toolName ?? "unknown"}`,
          }),
        });
      }

      continue;
    }

    const content = choiceMessage?.content;

    if (!content) {
      if (emptyResponseRetryCount < 1) {
        emptyResponseRetryCount += 1;
        requestMessages.push({
          role: "user",
          content: [
            "your last turn was empty.",
            "return the next turn now.",
            "you must either call the json tool or return valid json matching the contract.",
            "do not return an empty message.",
          ].join(" "),
        });
        continue;
      }

      throw new Error("Groq bootstrap response was empty.");
    }

    const result = sanitizeTurnResult(extractJsonPayload(content));
    return {
      ...result,
      reaction,
      media,
    };
  }
}

export { EMPTY_PROFILE, EMPTY_REVIEW };
