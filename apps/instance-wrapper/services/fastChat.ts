export interface ChatRequest {
  query: string;
  communication_type: "chat" | "text" | "email";
  conversation_id?: string;
}

export interface ChatResponse {
  response: string;
  message_id?: string;
  [key: string]: unknown;
}

const parseOpenAiChunk = (rawEvent: string): string => {
  const trimmed = rawEvent.trim();
  if (!trimmed || trimmed === "[DONE]") {
    return "";
  }

  const parsed = JSON.parse(trimmed) as {
    choices?: Array<{
      delta?: { content?: string };
      message?: { content?: string };
    }>;
  };

  return parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? "";
};

export const sendChatMessage = async (
  query: string,
  communicationType: "chat" | "text" | "email" = "chat",
  conversationId?: string,
  onChunk?: (chunk: string) => void,
): Promise<string> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: query,
      communicationType,
      conversationId,
    } satisfies {
      message: string;
      communicationType: "chat" | "text" | "email";
      conversationId?: string;
    }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const errorPayload = (await response.json()) as { error?: string };
      throw new Error(errorPayload.error || "Failed to contact Sage chat.");
    }

    const errorText = await response.text();
    throw new Error(errorText || "Failed to contact Sage chat.");
  }

  if (!response.body) {
    throw new Error("No response stream available from Sage chat.");
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";
  let fullResponse = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const lines = event
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data: "));

      for (const line of lines) {
        const payload = line.slice("data: ".length);
        const chunk = parseOpenAiChunk(payload);
        if (!chunk) {
          continue;
        }

        fullResponse += chunk;
        onChunk?.(chunk);
      }
    }
  }

  if (buffer.trim()) {
    const lines = buffer
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data: "));

    for (const line of lines) {
      const payload = line.slice("data: ".length);
      const chunk = parseOpenAiChunk(payload);
      if (!chunk) {
        continue;
      }

      fullResponse += chunk;
      onChunk?.(chunk);
    }
  }

  return fullResponse;
};
