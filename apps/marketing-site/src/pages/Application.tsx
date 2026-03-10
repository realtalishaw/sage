import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioLines, Plus } from "lucide-react";
import { AnimatedEyes } from "../components/AnimatedEyes";
import {
  EMPTY_PROFILE,
  type BootstrapMessage,
  type BootstrapProfile,
  type BootstrapTurnResult,
  runBootstrapTurn,
} from "../lib/groq-bootstrap";
import { setPageTitle } from "../lib/seo";

const shellClasses =
  "relative min-h-screen overflow-hidden bg-[#0B0B0C] px-6 py-6 text-[rgba(255,255,255,0.94)] sm:px-10 lg:px-16";
const STORAGE_KEY_PREFIX = "sage-bootstrap-review:";
const STREAM_DELAY_MS = 22;
const COMPOSER_MIN_HEIGHT_PX = 28;
const COMPOSER_MAX_HEIGHT_PX = 768;
const TOP_RAIL_HEIGHT_CLASS = "h-[31vh]";
const TRANSCRIPT_TOP_PADDING_CLASS = "pt-[31vh]";
const TRANSCRIPT_BOTTOM_PADDING_CLASS = "pb-[8.75rem]";

interface ChatMessage {
  id: string;
  role: "agent" | "user";
  text: string;
}

function useStreamingText(text: string, isActive: boolean) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!isActive || !text) {
      setDisplayed("");
      return;
    }

    let index = 0;
    setDisplayed("");

    const intervalId = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(intervalId);
      }
    }, STREAM_DELAY_MS);

    return () => window.clearInterval(intervalId);
  }, [isActive, text]);

  return displayed;
}

function createMessageId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function toGroqMessages(messages: ChatMessage[]): BootstrapMessage[] {
  return messages.map((message) => ({
    role: message.role === "agent" ? "assistant" : "user",
    content: message.text,
  }));
}

function mergeProfile(previous: BootstrapProfile, next: BootstrapProfile): BootstrapProfile {
  /*
    The model should preserve prior values, but this merge keeps the UI resilient
    if a later response omits a field that was already learned earlier.
  */
  return {
    agentName: next.agentName ?? previous.agentName,
    agentNature: next.agentNature ?? previous.agentNature,
    agentVibe: next.agentVibe ?? previous.agentVibe,
    agentEmoji: next.agentEmoji ?? previous.agentEmoji,
    userName: next.userName ?? previous.userName,
    preferredAddress: next.preferredAddress ?? previous.preferredAddress,
    timezone: next.timezone ?? previous.timezone,
    notes: next.notes.length > 0 ? next.notes : previous.notes,
    values: next.values.length > 0 ? next.values : previous.values,
    behaviorPreferences:
      next.behaviorPreferences.length > 0
        ? next.behaviorPreferences
        : previous.behaviorPreferences,
    boundaries: next.boundaries.length > 0 ? next.boundaries : previous.boundaries,
    reachPreference: next.reachPreference ?? previous.reachPreference,
  };
}

export default function Application() {
  const navigate = useNavigate();
  const initializationRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profile, setProfile] = useState<BootstrapProfile>(EMPTY_PROFILE);
  const [review, setReview] = useState<BootstrapTurnResult["review"] | null>(null);
  const [input, setInput] = useState("");
  const [pendingAgentMessage, setPendingAgentMessage] = useState<ChatMessage | null>(null);
  const [latestTurn, setLatestTurn] = useState<BootstrapTurnResult | null>(null);
  const [isRequestingTurn, setIsRequestingTurn] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const streamedAgentText = useStreamingText(
    pendingAgentMessage?.text ?? "",
    pendingAgentMessage !== null,
  );

  const canSubmit = input.trim().length > 0 && !isRequestingTurn && pendingAgentMessage === null;
  const canApprove = isComplete && review !== null && pendingAgentMessage === null;

  useEffect(() => {
    setPageTitle("Application");
  }, []);

  useEffect(() => {
    if (pendingAgentMessage === null) {
      return;
    }

    if (streamedAgentText !== pendingAgentMessage.text) {
      return;
    }

    setMessages((previous) => [...previous, pendingAgentMessage]);
    setPendingAgentMessage(null);
  }, [pendingAgentMessage, streamedAgentText]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedAgentText, review]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    /*
      The composer grows with the draft until it hits the product cap, then it
      becomes scrollable so long multi-line replies do not push the page layout
      apart.
    */
    textarea.style.height = `${COMPOSER_MIN_HEIGHT_PX}px`;
    const nextHeight = Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT_PX);
    textarea.style.height = `${Math.max(nextHeight, COMPOSER_MIN_HEIGHT_PX)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > COMPOSER_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [input]);

  const requestTurn = async (conversation: ChatMessage[], currentProfile: BootstrapProfile) => {
    setIsRequestingTurn(true);
    setError("");

    try {
      const turn = await runBootstrapTurn({
        messages: toGroqMessages(conversation),
        profile: currentProfile,
      });

      const mergedProfile = mergeProfile(currentProfile, turn.profile);
      setProfile(mergedProfile);
      setLatestTurn(turn);
      setReview(turn.review);
      setIsComplete(turn.isComplete || turn.completionSignal === "done");
      setPendingAgentMessage({
        id: createMessageId(),
        role: "agent",
        text: turn.message,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "something went wrong while talking to groq.",
      );
    } finally {
      setIsRequestingTurn(false);
    }
  };

  useEffect(() => {
    if (initializationRef.current) {
      return;
    }

    initializationRef.current = true;
    void requestTurn([], EMPTY_PROFILE);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isRequestingTurn || pendingAgentMessage !== null) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      text: trimmed,
    };

    const nextConversation = [...messages, userMessage];
    setMessages(nextConversation);
    setInput("");

    await requestTurn(nextConversation, profile);
  };

  const handleApprove = () => {
    const applicationId = createMessageId();
    const payload = {
      applicationId,
      completedAt: new Date().toISOString(),
      profile,
      review,
      transcript: messages,
      finalStage: latestTurn?.stage ?? "review",
    };

    /*
      The bootstrap result is persisted locally so the next route has something
      real to key off of until there is a backend application record.
    */
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${applicationId}`, JSON.stringify(payload));
    navigate(`/apply/${applicationId}`);
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    /*
      Enter submits like a chat input, while shift+enter keeps the expected
      multi-line textarea behavior for longer answers.
    */
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    void handleSubmit(event);
  };

  return (
    <div className={shellClasses}>
      <div className="absolute inset-0">
        <div className="absolute left-[18%] top-[12%] h-72 w-72 rounded-full bg-[#D6FF75]/7 blur-3xl" />
        <div className="absolute bottom-[8%] right-[10%] h-80 w-80 rounded-full bg-white/4 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto min-h-[calc(100vh-3rem)] w-full max-w-[72rem]">
        {/*
          The top rail stays fixed while the transcript scrolls beneath it. A
          black-to-transparent mask keeps the transition from feeling abrupt as
          messages slide behind the eyes area.
        */}
        <div className={`pointer-events-none fixed inset-x-0 top-0 z-30 ${TOP_RAIL_HEIGHT_CLASS}`}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0C] via-[#0B0B0C] via-62% to-transparent" />
          <div className="mx-auto flex h-full w-full max-w-[72rem] items-center justify-center px-6 py-5 sm:px-10 lg:px-16">
            <AnimatedEyes className="scale-[1.12] sm:scale-[1.3]" />
          </div>
        </div>

        <section className="mx-auto flex w-full max-w-[50rem] flex-col">
          <div
            className={`application-transcript-scroll space-y-5 overflow-y-auto px-2 ${TRANSCRIPT_TOP_PADDING_CLASS} ${TRANSCRIPT_BOTTOM_PADDING_CLASS}`}
            style={{ height: "calc(100vh - 3rem)" }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "user" ? (
                  <div className="max-w-[78%] rounded-[1.35rem] rounded-br-md bg-[#0A84FF] px-4 py-3 shadow-[0_10px_24px_rgba(10,132,255,0.2)]">
                    <p className="text-[14px] leading-6 text-white">{message.text}</p>
                  </div>
                ) : (
                  <div className="max-w-[42rem]">
                    <p className="text-[1rem] leading-8 text-white/94 sm:text-[1.12rem]">
                      {message.text}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {pendingAgentMessage !== null && (
              <div className="flex justify-start">
                <div className="max-w-[42rem]">
                  <p className="text-[1rem] leading-8 text-white/94 sm:text-[1.12rem]">
                    {streamedAgentText}
                    <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-white/70 align-middle" />
                  </p>
                </div>
              </div>
            )}

            {isComplete && review !== null && pendingAgentMessage === null && (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                  review
                </p>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
                      about sage
                    </h2>
                    <p className="mt-3 text-[15px] leading-7 text-white/90">
                      {review.aboutAgent || "still shaping sage's identity."}
                    </p>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
                      about you
                    </h2>
                    <p className="mt-3 text-[15px] leading-7 text-white/90">
                      {review.aboutUser || "still learning how to work with you."}
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-sm leading-7 text-white/68">
                  {review.readinessNote ||
                    "once this looks right, approve it and continue to your individual application page."}
                </p>

                {canApprove && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="rounded-2xl border border-white/20 bg-white px-6 py-3 text-sm font-semibold text-[#0B0B0C] transition hover:bg-white/90"
                    >
                      approved, continue
                    </button>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

        </section>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-[#0B0B0C] via-[#0B0B0C]/94 to-transparent" />

        <div className="fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto w-full max-w-[50rem] px-2 pb-6">
            {error && (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-sm leading-6 text-red-300">{error}</p>
              </div>
            )}

            {!isComplete && (
              <form onSubmit={handleSubmit} className="relative">
                <div className="rounded-[2rem] border border-white/10 bg-[#2E2E30] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                  <div className="flex items-end gap-3 px-4 py-4">
                    <button
                      type="button"
                      aria-label="add files"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/88 transition hover:bg-white/6"
                    >
                      <Plus className="h-6 w-6" strokeWidth={2.1} />
                    </button>

                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder="reply..."
                      className="w-full resize-none bg-transparent px-1 py-[10px] text-[1.05rem] leading-7 text-white placeholder:text-white/45 focus:outline-none"
                      autoFocus
                      disabled={isRequestingTurn || pendingAgentMessage !== null}
                      rows={1}
                    />

                    <button
                      type="button"
                      aria-label="voice input"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0B0B0C] transition hover:bg-white/90"
                    >
                      <AudioLines className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
