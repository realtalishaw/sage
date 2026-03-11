import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioLines, CircleOff } from "lucide-react";
import {
  RandomAvatarHead,
  type RandomAvatarHeadHandle,
} from "../avatar/RandomAvatarHead";
import { AvatarScene } from "../avatar/AvatarScene";
import { avatarCategories } from "../avatar/assets";
import {
  loadOrCreateSessionAvatarSelection,
  saveSessionAvatarSelection,
  type RandomAvatarState,
} from "../avatar/random";
import {
  EMPTY_PROFILE,
  type BootstrapMedia,
  type BootstrapMessage,
  type BootstrapProfile,
  type BootstrapReaction,
  type BootstrapTurnResult,
  runBootstrapTurn,
} from "../lib/groq-bootstrap";
import { transcribeAudioBlob } from "../lib/groq-audio";
import { saveApplicationProfile } from "../lib/browser-db";
import { setPageTitle } from "../lib/seo";
import { buildSageAnnualCheckoutLink } from "../lib/stripe";
import { useAuth } from "../hooks/useAuth";

const shellClasses =
  "relative min-h-screen overflow-hidden bg-[#0B0B0C] px-6 py-6 text-[rgba(255,255,255,0.94)] sm:px-10 lg:px-16";
const STORAGE_KEY_PREFIX = "sage-bootstrap-review:";
const APPLICATION_PROFILE_SEED_STORAGE_KEY = "sage:application-profile-seed";
const APPLICATION_BOOTSTRAP_SEED_STORAGE_KEY = "sage:application-bootstrap-seed";
const APPLICATION_AVATAR_STORAGE_KEY = "sage:application-avatar";
const STREAM_DELAY_MS = 22;
const COMPOSER_MIN_HEIGHT_PX = 28;
const COMPOSER_MAX_HEIGHT_PX = 768;
const TOP_RAIL_HEIGHT_CLASS = "h-[31vh]";
const TRANSCRIPT_TOP_PADDING_CLASS = "pt-[31vh]";
const TRANSCRIPT_BOTTOM_PADDING_CLASS = "pb-[7.25rem]";

const SKIN_TONE_OPTIONS = [
  { label: "porcelain", color: "#f6d7c3", aliases: ["porcelain", "fair", "light"] },
  { label: "warm", color: "#efc0a7", aliases: ["warm", "peach", "soft tan"] },
  { label: "golden", color: "#d99474", aliases: ["golden", "tan", "honey"] },
  { label: "deep", color: "#a65d49", aliases: ["deep", "rich", "brown"] },
  { label: "espresso", color: "#6a3d30", aliases: ["espresso", "dark", "ebony"] },
  { label: "pink", color: "#ff69b4", aliases: ["pink"] },
  { label: "blue", color: "#1e90ff", aliases: ["blue"] },
  { label: "green", color: "#32cd32", aliases: ["green"] },
  { label: "purple", color: "#8a2be2", aliases: ["purple", "violet"] },
  { label: "yellow", color: "#ffd700", aliases: ["yellow", "gold"] },
  { label: "red", color: "#ff3b30", aliases: ["red"] },
] as const;

const HAIR_COLOR_OPTIONS = [
  { label: "black", color: "#1b1b1b", aliases: ["black", "jet black"] },
  { label: "brunette", color: "#59391f", aliases: ["brunette", "brown", "dark brown"] },
  { label: "copper", color: "#8a5a31", aliases: ["copper", "auburn", "ginger"] },
  { label: "blonde", color: "#d9c6a5", aliases: ["blonde", "blond", "golden blonde"] },
  { label: "crimson", color: "#a33530", aliases: ["crimson", "red", "burgundy"] },
  { label: "blue", color: "#1e90ff", aliases: ["blue"] },
  { label: "green", color: "#32cd32", aliases: ["green", "lime"] },
  { label: "purple", color: "#8a2be2", aliases: ["purple", "violet"] },
  { label: "pink", color: "#ff69b4", aliases: ["pink"] },
  { label: "yellow", color: "#ffd700", aliases: ["yellow", "gold"] },
  { label: "red", color: "#ff3b30", aliases: ["red"] },
  { label: "silver", color: "#c6d2df", aliases: ["silver", "gray", "grey"] },
] as const;

type PreludeStep =
  | "rename"
  | "skin"
  | "hair"
  | "facialHair"
  | "eyes"
  | "brows"
  | "nose"
  | "hat"
  | "glasses"
  | "earrings"
  | "groq";

interface ChatMessage {
  id: string;
  role: "agent" | "user";
  text: string;
  reaction?: BootstrapReaction | null;
  media?: BootstrapMedia | null;
}

interface ApplicationBootstrapSeed {
  applicantName: string;
}

interface ApprovedApplicationPayload {
  applicationId: string;
  completedAt: string;
  profile: BootstrapProfile;
  review: BootstrapTurnResult["review"] | null;
  avatar: RandomAvatarState;
  avatarPortraitPng: string | null;
  transcript: ChatMessage[];
  finalStage: string;
}

interface ApplicationProfileSeed {
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{
      isFinal: boolean;
      0: {
        transcript: string;
      };
    }>;
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

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

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function loadProfileSeed(): ApplicationProfileSeed {
  try {
    const stored = window.sessionStorage.getItem(APPLICATION_PROFILE_SEED_STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as ApplicationProfileSeed;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function extractApplicantName(profileSeed: ApplicationProfileSeed) {
  const fullName = normalizeWhitespace(profileSeed.fullName ?? "");
  if (fullName) {
    return fullName;
  }

  return normalizeWhitespace(`${profileSeed.firstName ?? ""} ${profileSeed.lastName ?? ""}`) || "there";
}

function loadOrCreateBootstrapSeed(profileSeed: ApplicationProfileSeed): ApplicationBootstrapSeed {
  try {
    const stored = window.sessionStorage.getItem(APPLICATION_BOOTSTRAP_SEED_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ApplicationBootstrapSeed;
      if (parsed && typeof parsed.applicantName === "string") {
        return parsed;
      }
    }
  } catch {
    /*
      A bad seed should not block the application flow. The next section simply
      regenerates a stable session-scoped seed.
    */
  }

  const nextSeed = {
    applicantName: extractApplicantName(profileSeed),
  };
  window.sessionStorage.setItem(APPLICATION_BOOTSTRAP_SEED_STORAGE_KEY, JSON.stringify(nextSeed));
  return nextSeed;
}

function createSeededProfile(seed: ApplicationBootstrapSeed): BootstrapProfile {
  return {
    ...EMPTY_PROFILE,
    /*
      Sage should open as "sage" every time. A random alias made the first-turn
      tone feel inconsistent and often produced names that worked against the
      personality we want. If the user wants a different name, they can rename
      Sage in the first reply.
    */
    agentName: "sage",
    userName: seed.applicantName,
    preferredAddress: seed.applicantName.split(/\s+/)[0] ?? seed.applicantName,
  };
}

function splitAssistantMessageParts(text: string) {
  /*
    Groq is instructed to split longer replies with a line that contains only
    "---". Converting that delimiter into separate assistant bubbles keeps the
    UI aligned with the prompt contract instead of rendering one oversized
    paragraph.
  */
  return text
    .split(/\n\s*---\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function toGroqMessages(messages: ChatMessage[]): BootstrapMessage[] {
  return messages.map((message) => ({
    role: message.role === "agent" ? "assistant" : "user",
    content: message.text,
  }));
}

function reactionGlyph(reaction: BootstrapReaction) {
  return reaction.emoji || "✨";
}

function mergeProfile(previous: BootstrapProfile, next: BootstrapProfile): BootstrapProfile {
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

function extractAgentNameFromReply(input: string) {
  const normalized = normalizeWhitespace(input);
  const keepIntents = ["keep it", "keep", "leave it", "sounds good", "that works", "fine as is"];

  if (keepIntents.some((intent) => normalized.toLowerCase() === intent)) {
    return null;
  }

  const explicitMatch = normalized.match(
    /(?:call you|you should be called|your name is|be|i'?ll call you)\s+(.+)$/i,
  );

  if (explicitMatch?.[1]) {
    return normalizeWhitespace(explicitMatch[1]).replace(/[.?!]+$/g, "");
  }

  return normalized.replace(/[.?!]+$/g, "");
}

function findCategory(categoryId: (typeof avatarCategories)[number]["id"]) {
  const category = avatarCategories.find((entry) => entry.id === categoryId);
  if (!category) {
    throw new Error(`Missing avatar category: ${categoryId}`);
  }
  return category;
}

function SkinTonePicker({
  currentColor,
  onSelect,
  onContinue,
  onSkip,
}: {
  currentColor: string;
  onSelect: (label: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-white/92">pick a skin tone</p>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white/68 transition hover:border-white/22 hover:text-white"
        >
          skip all
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {SKIN_TONE_OPTIONS.map((option) => {
          const isSelected = currentColor === option.color;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onSelect(option.label)}
              className={`rounded-2xl border p-2 transition ${
                isSelected
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/22 hover:bg-white/[0.05]"
              }`}
            >
              <span
                className="block h-10 w-10 rounded-xl border border-black/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                style={{ backgroundColor: option.color }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full border border-white/18 bg-white px-4 py-2 text-sm font-medium text-[#0B0B0C] transition hover:bg-white/92"
        >
          continue
        </button>
      </div>
    </div>
  );
}

function AvatarPreviewCard({
  avatarState,
  isSelected,
  onSelect,
  isNoneOption = false,
}: {
  avatarState: RandomAvatarState;
  isSelected: boolean;
  onSelect: () => void;
  isNoneOption?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`h-36 w-[11rem] shrink-0 overflow-hidden rounded-[1.5rem] border transition ${
        isSelected
          ? "border-white/30 bg-white/10"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
      }`}
    >
      {isNoneOption ? (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_rgba(255,255,255,0.03)_42%,_rgba(255,255,255,0.02)_100%)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/18 bg-white/[0.06]">
            <CircleOff className="h-8 w-8 text-white/78" strokeWidth={1.9} />
          </div>
        </div>
      ) : (
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_rgba(255,255,255,0.03)_42%,_rgba(255,255,255,0.02)_100%)]">
          <AvatarScene
            selection={avatarState.selection}
            skinColor={avatarState.skinColor}
            hairColor={avatarState.hairColor}
            interactionMode="static"
          />
        </div>
      )}
    </button>
  );
}

function createPreviewSelection(
  currentSelection: RandomAvatarState["selection"],
  categoryId: (typeof avatarCategories)[number]["id"],
  assetId: string | null,
) {
  /*
    Preview cards should emphasize the item being chosen instead of rendering
    the entire current avatar every time. This keeps the UI closer to a catalog
    of parts and reduces scene complexity a bit at the same time.
  */
  const base = {
    Head: null,
    Hair: null,
    Eyes: null,
    EyeBrow: null,
    Nose: null,
    FacialHair: null,
    Glasses: null,
    Hat: null,
    Earring: null,
  } as RandomAvatarState["selection"];

  if (categoryId === "Eyes" || categoryId === "EyeBrow" || categoryId === "Nose") {
    base.Head = currentSelection.Head;
  }

  base[categoryId] = assetId;
  return base;
}

function PreviewStrip({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-white/8 bg-black/10">
      <div className="application-transcript-scroll flex max-w-full gap-3 overflow-x-auto overflow-y-hidden px-3 py-3 overscroll-x-contain">
        {children}
      </div>
    </div>
  );
}

function HairPicker({
  currentState,
  onColorSelect,
  onStyleSelect,
  onContinue,
  onSkip,
}: {
  currentState: RandomAvatarState;
  onColorSelect: (hairColorLabel: string) => void;
  onStyleSelect: (hairAssetId: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const hairCategory = findCategory("Hair");

  return (
    <div className="min-w-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-white/92">hair and facial hair</p>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white/68 transition hover:border-white/22 hover:text-white"
        >
          skip all
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {HAIR_COLOR_OPTIONS.map((option) => {
          const isSelected = currentState.hairColor === option.color;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onColorSelect(option.label)}
              className={`rounded-2xl border p-2 transition ${
                isSelected
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/22 hover:bg-white/[0.05]"
              }`}
            >
              <span
                className="block h-10 w-10 rounded-xl border border-black/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                style={{ backgroundColor: option.color }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <PreviewStrip>
          {hairCategory.assets.map((asset) => (
            <AvatarPreviewCard
              key={asset.id}
              avatarState={{
                ...currentState,
                selection: createPreviewSelection(currentState.selection, "Hair", asset.id),
              }}
              isSelected={currentState.selection.Hair === asset.id}
              onSelect={() => onStyleSelect(asset.id)}
            />
          ))}
        </PreviewStrip>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full border border-white/18 bg-white px-4 py-2 text-sm font-medium text-[#0B0B0C] transition hover:bg-white/92"
        >
          continue
        </button>
      </div>
    </div>
  );
}

function FacialHairPicker({
  currentState,
  onSelect,
  onContinue,
  onSkip,
}: {
  currentState: RandomAvatarState;
  onSelect: (assetId: string | null) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const facialHairCategory = findCategory("FacialHair");

  return (
    <div className="min-w-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-white/92">facial hair</p>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white/68 transition hover:border-white/22 hover:text-white"
        >
          skip all
        </button>
      </div>

      <div className="mt-4">
        <PreviewStrip>
          <AvatarPreviewCard
            avatarState={{
              ...currentState,
              selection: createPreviewSelection(currentState.selection, "FacialHair", null),
            }}
            isSelected={currentState.selection.FacialHair === null}
            onSelect={() => onSelect(null)}
            isNoneOption
          />
          {facialHairCategory.assets.map((asset) => (
            <AvatarPreviewCard
              key={asset.id}
              avatarState={{
                ...currentState,
                selection: createPreviewSelection(currentState.selection, "FacialHair", asset.id),
              }}
              isSelected={currentState.selection.FacialHair === asset.id}
              onSelect={() => onSelect(asset.id)}
            />
          ))}
        </PreviewStrip>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full border border-white/18 bg-white px-4 py-2 text-sm font-medium text-[#0B0B0C] transition hover:bg-white/92"
        >
          continue
        </button>
      </div>
    </div>
  );
}

function SingleFeaturePicker({
  title,
  categoryId,
  currentState,
  onSelect,
  onContinue,
  onSkip,
}: {
  title: string;
  categoryId: (typeof avatarCategories)[number]["id"];
  currentState: RandomAvatarState;
  onSelect: (categoryId: (typeof avatarCategories)[number]["id"], assetId: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const category = findCategory(categoryId);

  return (
    <div className="min-w-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-white/92">{title}</p>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white/68 transition hover:border-white/22 hover:text-white"
        >
          skip all
        </button>
      </div>

      <div className="mt-4">
        <PreviewStrip>
          {category.assets.map((asset) => (
            <AvatarPreviewCard
              key={asset.id}
              avatarState={{
                ...currentState,
                selection: createPreviewSelection(currentState.selection, categoryId, asset.id),
              }}
              isSelected={currentState.selection[categoryId] === asset.id}
              onSelect={() => onSelect(categoryId, asset.id)}
            />
          ))}
        </PreviewStrip>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full border border-white/18 bg-white px-4 py-2 text-sm font-medium text-[#0B0B0C] transition hover:bg-white/92"
        >
          continue
        </button>
      </div>
    </div>
  );
}

function AccessoriesPicker({
  title,
  categoryId,
  currentState,
  onSelect,
  onContinue,
  onSkip,
}: {
  title: string;
  categoryId: (typeof avatarCategories)[number]["id"];
  currentState: RandomAvatarState;
  onSelect: (categoryId: (typeof avatarCategories)[number]["id"], assetId: string | null) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const category = findCategory(categoryId);

  return (
    <div className="min-w-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-white/92">{title}</p>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white/68 transition hover:border-white/22 hover:text-white"
        >
          skip all
        </button>
      </div>

      <div className="mt-4">
        <PreviewStrip>
          <AvatarPreviewCard
            avatarState={{
              ...currentState,
              selection: createPreviewSelection(currentState.selection, categoryId, null),
            }}
            isSelected={currentState.selection[categoryId] === null}
            onSelect={() => onSelect(categoryId, null)}
            isNoneOption
          />
          {category.assets.map((asset) => (
            <AvatarPreviewCard
              key={asset.id}
              avatarState={{
                ...currentState,
                selection: createPreviewSelection(currentState.selection, categoryId, asset.id),
              }}
              isSelected={currentState.selection[categoryId] === asset.id}
              onSelect={() => onSelect(categoryId, asset.id)}
            />
          ))}
        </PreviewStrip>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full border border-white/18 bg-white px-4 py-2 text-sm font-medium text-[#0B0B0C] transition hover:bg-white/92"
        >
          continue
        </button>
      </div>
    </div>
  );
}

export default function Application() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const skipWaitlistCheckoutUrl = useMemo(
    () =>
      buildSageAnnualCheckoutLink({
        userEmail: user?.email ?? null,
        userId: user?.id ?? null,
      }),
    [user?.email, user?.id],
  );
  const initializationRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const voiceInputBaseRef = useRef("");
  const liveTranscriptRef = useRef("");
  const bootstrapSeed = useMemo(() => loadOrCreateBootstrapSeed(loadProfileSeed()), []);
  const initialProfile = useMemo(() => createSeededProfile(bootstrapSeed), [bootstrapSeed]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profile, setProfile] = useState<BootstrapProfile>(initialProfile);
  const [avatarState, setAvatarState] = useState<RandomAvatarState>(() =>
    loadOrCreateSessionAvatarSelection(APPLICATION_AVATAR_STORAGE_KEY),
  );
  const [preludeStep, setPreludeStep] = useState<PreludeStep>("rename");
  const [review, setReview] = useState<BootstrapTurnResult["review"] | null>(null);
  const [input, setInput] = useState("");
  const [pendingAgentMessage, setPendingAgentMessage] = useState<ChatMessage | null>(null);
  const [, setPendingAgentQueue] = useState<ChatMessage[]>([]);
  const [latestTurn, setLatestTurn] = useState<BootstrapTurnResult | null>(null);
  const [isRequestingTurn, setIsRequestingTurn] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [error, setError] = useState("");
  const avatarCaptureRef = useRef<RandomAvatarHeadHandle | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const streamedAgentText = useStreamingText(
    pendingAgentMessage?.text ?? "",
    pendingAgentMessage !== null,
  );

  const pickerStepSet = new Set<PreludeStep>([
    "skin",
    "hair",
    "facialHair",
    "eyes",
    "brows",
    "nose",
    "hat",
    "glasses",
    "earrings",
  ]);
  const shouldHideComposer =
    pickerStepSet.has(preludeStep) && pendingAgentMessage === null && !isRequestingTurn;
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
    setPendingAgentQueue((currentQueue) => {
      if (currentQueue.length === 0) {
        setPendingAgentMessage(null);
        return currentQueue;
      }

      /*
        Stream assistant replies one bubble at a time so multi-message Groq
        turns still feel alive instead of instantly dumping every split part.
      */
      const [nextMessage, ...remainingQueue] = currentQueue;
      setPendingAgentMessage(nextMessage);
      return remainingQueue;
    });
  }, [pendingAgentMessage, streamedAgentText]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedAgentText, review]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = `${COMPOSER_MIN_HEIGHT_PX}px`;
    const nextHeight = Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT_PX);
    textarea.style.height = `${Math.max(nextHeight, COMPOSER_MIN_HEIGHT_PX)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > COMPOSER_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [input]);

  useEffect(() => {
    saveSessionAvatarSelection(avatarState, APPLICATION_AVATAR_STORAGE_KEY);
  }, [avatarState]);

  useEffect(() => {
    /*
      Recording uses a live microphone stream. Always stop tracks when the page
      unmounts so the browser does not leave the mic active after navigation.
    */
    return () => {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      speechRecognitionRef.current?.stop();
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      speechRecognitionRef.current = null;
      recordedChunksRef.current = [];
    };
  }, []);

  const sendAgentMessage = (
    text: string,
    extras?: {
      reaction?: BootstrapReaction | null;
      media?: BootstrapMedia | null;
    },
  ) => {
    const messageParts = splitAssistantMessageParts(text);
    const normalizedParts = messageParts.length > 0 ? messageParts : [text.trim()];
    const nextMessages = normalizedParts.map((part, index) => ({
      id: createMessageId(),
      role: "agent" as const,
      text: part,
      /*
        Reactions and media belong to the turn, not every bubble. Attach them
        to the last assistant bubble so the UI doesn't duplicate decorations.
      */
      reaction:
        index === normalizedParts.length - 1 ? (extras?.reaction ?? null) : null,
      media: index === normalizedParts.length - 1 ? (extras?.media ?? null) : null,
    }));

    const [firstMessage, ...remainingMessages] = nextMessages;
    setPendingAgentQueue(remainingMessages);
    setPendingAgentMessage(firstMessage);
  };

  const appendUserMessage = (text: string) => {
    setMessages((previous) => [
      ...previous,
      { id: createMessageId(), role: "user", text },
    ]);
  };

  const requestTurn = async (conversation: ChatMessage[], currentProfile: BootstrapProfile) => {
    setIsRequestingTurn(true);
    setError("");

    try {
      const previousAssistantMessage = [...conversation]
        .reverse()
        .find((message) => message.role === "agent");
      const previousAssistantUsedMedia = Boolean(previousAssistantMessage?.media);
      const turn = await runBootstrapTurn({
        messages: toGroqMessages(conversation),
        profile: currentProfile,
        context: {
          seededUserName: bootstrapSeed.applicantName,
          seededAgentName: currentProfile.agentName,
          previousAssistantUsedMedia,
        },
      });

      const mergedProfile = mergeProfile(currentProfile, turn.profile);
      setProfile(mergedProfile);
      setLatestTurn(turn);
      setReview(turn.review);
      setIsComplete(turn.isComplete || turn.completionSignal === "done");
      sendAgentMessage(turn.message, {
        reaction: turn.reaction,
        media: turn.media,
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
    void requestTurn([], initialProfile);
  }, [initialProfile]);

  const updateSelection = (
    categoryId: (typeof avatarCategories)[number]["id"],
    assetId: string | null,
  ) => {
    setAvatarState((current) => ({
      ...current,
      selection: {
        ...current.selection,
        [categoryId]: assetId,
      },
    }));
  };

  const moveToGroq = async (userText: string) => {
    const userMessage: ChatMessage = { id: createMessageId(), role: "user", text: userText };
    const nextConversation = [...messages, userMessage];
    setMessages(nextConversation);
    setPreludeStep("groq");
    await requestTurn(nextConversation, profile);
  };

  const handleSkinSelection = (skinLabel: string) => {
    const matchedSkin = SKIN_TONE_OPTIONS.find((entry) => entry.label === skinLabel);
    if (!matchedSkin) {
      return;
    }

    setAvatarState((current) => ({ ...current, skinColor: matchedSkin.color }));
  };

  const handleContinueSkin = () => {
    appendUserMessage(
      SKIN_TONE_OPTIONS.find((entry) => entry.color === avatarState.skinColor)?.label ?? "done",
    );
    setPreludeStep("hair");
    sendAgentMessage("nice. now shape the hair, then continue.");
  };

  const handleSkipAllCustomizations = async () => {
    /*
      "skip all" should be a real escape hatch. Once the user clicks it from
      any customization step, stop the remaining avatar flow entirely and jump
      straight back into Sage's conversation.
    */
    await moveToGroq("skip all customizations");
  };

  const handleContinueHair = () => {
    appendUserMessage("done");
    setPreludeStep("facialHair");
    sendAgentMessage("good. now choose facial hair if you want it.");
  };

  const handleContinueFacialHair = () => {
    appendUserMessage("done");
    setPreludeStep("eyes");
    sendAgentMessage("good. now choose the eyes.");
  };

  const handleContinueEyes = () => {
    appendUserMessage("done");
    setPreludeStep("brows");
    sendAgentMessage("nice. now choose the brows.");
  };

  const handleContinueBrows = () => {
    appendUserMessage("done");
    setPreludeStep("nose");
    sendAgentMessage("great. now choose the nose.");
  };

  const handleContinueNose = () => {
    appendUserMessage("done");
    setPreludeStep("hat");
    sendAgentMessage("last visual pass. start with a hat if you want one.");
  };

  const handleContinueHat = () => {
    appendUserMessage("done");
    setPreludeStep("glasses");
    sendAgentMessage("good. now pick glasses if you want them.");
  };

  const handleContinueGlasses = () => {
    appendUserMessage("done");
    setPreludeStep("earrings");
    sendAgentMessage("great. now pick earrings if you want them.");
  };

  const handleContinueEarrings = async () => {
    await moveToGroq("done");
  };

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
    setError("");

    if (preludeStep === "rename") {
      const renamedAgent = extractAgentNameFromReply(trimmed);
      setProfile((current) => ({
        ...current,
        agentName: renamedAgent || current.agentName,
      }));
      setPreludeStep("skin");
      sendAgentMessage("nice. now lets make me look right. pick a skin tone.");
      return;
    }

    if (preludeStep !== "groq") {
      sendAgentMessage("use the visual picker below for this step, then continue.");
      return;
    }

    await requestTurn(nextConversation, profile);
  };

  const handleApprove = async () => {
    if (!user?.id) {
      setError("you need to be signed in before i can save your application.");
      return;
    }

    const applicationId = createMessageId();
    const completedAt = new Date().toISOString();
    const payload: ApprovedApplicationPayload = {
      applicationId,
      completedAt,
      profile,
      review,
      avatar: avatarState,
      /*
        The invite page needs a stable portrait even after the live Three scene
        is gone. Capture the finalized avatar at approval time and persist the
        PNG alongside the rest of the approved application payload.
      */
      avatarPortraitPng: avatarCaptureRef.current?.capturePngDataUrl() ?? null,
      transcript: messages,
      finalStage: latestTurn?.stage ?? "review",
    };

    const { error: saveError } = await saveApplicationProfile({
      applicationId,
      userId: user.id,
      profile,
      review,
      avatar: avatarState,
      avatarPortraitPng: payload.avatarPortraitPng,
      transcript: messages.map((message) => ({
        id: message.id,
        role: message.role,
        text: message.text,
      })),
      finalStage: payload.finalStage,
      completedAt,
    });

    if (saveError) {
      setError(saveError.message || "couldnt save your application. try again.");
      return;
    }

    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${applicationId}`, JSON.stringify(payload));
    navigate(`/apply/id/${applicationId}`);
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    void handleSubmit(event);
  };

  const handleMediaLoad = () => {
    /*
      Media expands after the message bubble is already rendered. Scrolling again
      on image load keeps the latest GIF or meme fully in view instead of
      stopping early based on the pre-image layout height.
    */
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const stopVoiceRecording = async () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    /*
      MediaRecorder emits the final audio chunk asynchronously on stop. Wrap the
      stop lifecycle in a promise so we only transcribe once the Blob is fully
      assembled.
    */
    const audioBlob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        resolve(blob);
      };
      recorder.onerror = () => reject(new Error("voice recording stopped unexpectedly."));
      recorder.stop();
    });

    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    setIsRecordingVoice(false);
    setIsTranscribingVoice(true);

    try {
      const transcript = await transcribeAudioBlob(audioBlob);
      if (transcript) {
        /*
          Append the transcript instead of replacing the composer so the user
          can combine typed edits with multiple short recordings if they want.
        */
        const prefix = voiceInputBaseRef.current.trim();
        setInput(`${prefix}${prefix ? " " : ""}${transcript}`.trim());
      }
    } catch (voiceError) {
      setError(
        voiceError instanceof Error
          ? voiceError.message
          : "something went wrong while transcribing your voice note.",
      );
    } finally {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      recordedChunksRef.current = [];
      liveTranscriptRef.current = "";
      voiceInputBaseRef.current = "";
      setIsTranscribingVoice(false);
      textareaRef.current?.focus();
    }
  };

  const startLiveSpeechRecognition = () => {
    const speechWindow = window as Window & {
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
      SpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      return false;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
      }

      liveTranscriptRef.current = transcript.trim();
      const prefix = voiceInputBaseRef.current.trim();
      const combined = `${prefix}${prefix && liveTranscriptRef.current ? " " : ""}${liveTranscriptRef.current}`.trim();
      setInput(combined);
    };

    recognition.onerror = () => {
      speechRecognitionRef.current = null;
    };

    recognition.onend = () => {
      speechRecognitionRef.current = null;
    };

    recognition.start();
    speechRecognitionRef.current = recognition;
    return true;
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("voice input isnt supported in this browser.");
      return;
    }

    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });

      recordedChunksRef.current = [];
      voiceInputBaseRef.current = input;
      liveTranscriptRef.current = "";
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      startLiveSpeechRecognition();
      setIsRecordingVoice(true);
    } catch (voiceError) {
      setError(
        voiceError instanceof Error
          ? voiceError.message
          : "couldnt start voice recording.",
      );
    }
  };

  const handleVoiceButtonClick = async () => {
    if (isTranscribingVoice || isRequestingTurn || pendingAgentMessage !== null) {
      return;
    }

    if (isRecordingVoice) {
      await stopVoiceRecording();
      return;
    }

    await startVoiceRecording();
  };

  return (
    <div className={shellClasses}>
      <div className="absolute inset-0">
        <div className="absolute left-[18%] top-[12%] h-72 w-72 rounded-full bg-[#D6FF75]/7 blur-3xl" />
        <div className="absolute bottom-[8%] right-[10%] h-80 w-80 rounded-full bg-white/4 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto min-h-[calc(100vh-3rem)] w-full max-w-[72rem]">
        <div className={`pointer-events-none fixed inset-x-0 top-0 z-30 ${TOP_RAIL_HEIGHT_CLASS}`}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0C] via-[#0B0B0C] via-62% to-transparent" />
          <div className="pointer-events-auto mx-auto flex h-full w-full max-w-[72rem] items-center justify-center px-6 py-5 sm:px-10 lg:px-16">
            <RandomAvatarHead
              ref={avatarCaptureRef}
              avatarState={avatarState}
              storageKey={APPLICATION_AVATAR_STORAGE_KEY}
            />
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
                  (() => {
                    const nextMessage = messages[messages.findIndex((entry) => entry.id === message.id) + 1];
                    const attachedReaction =
                      nextMessage?.role === "agent" ? nextMessage.reaction ?? null : null;

                    return (
                      <div className="relative max-w-[78%]">
                        <div className="rounded-[1.35rem] rounded-br-md bg-[#0A84FF] px-4 py-3 shadow-[0_10px_24px_rgba(10,132,255,0.2)]">
                          <p className="whitespace-pre-wrap text-[14px] leading-6 text-white">
                            {message.text}
                          </p>
                        </div>
                        {attachedReaction && (
                          <div className="pointer-events-none absolute -top-3 -left-3 z-10 flex items-end">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-[linear-gradient(180deg,rgba(42,137,255,0.86),rgba(10,132,255,0.72))] text-[1.2rem] shadow-[0_10px_24px_rgba(10,132,255,0.22)] backdrop-blur-xl">
                              <span>{reactionGlyph(attachedReaction)}</span>
                            </div>
                            <div className="mb-[3px] -ml-[5px] h-[9px] w-[9px] rounded-full border border-white/14 bg-[rgba(10,132,255,0.78)] backdrop-blur-xl" />
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="max-w-[42rem] space-y-3">
                    <p className="whitespace-pre-wrap text-[1rem] leading-8 text-white/94 sm:text-[1.12rem]">
                      {message.text}
                    </p>
                    {message.media && (
                      <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-2">
                        <img
                          src={message.media.url}
                          alt={message.media.alt}
                          className="max-h-[18rem] w-full rounded-[1rem] object-cover"
                          loading="lazy"
                          onLoad={handleMediaLoad}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {pendingAgentMessage !== null && (
              <div className="flex justify-start">
                <div className="max-w-[42rem]">
                  <p className="whitespace-pre-wrap text-[1rem] leading-8 text-white/94 sm:text-[1.12rem]">
                    {streamedAgentText}
                    <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-white/70 align-middle" />
                  </p>
                </div>
              </div>
            )}

            {isRequestingTurn && pendingAgentMessage === null && (
              <div className="flex justify-start">
                <div className="rounded-[1.45rem] rounded-bl-md border border-white/10 bg-white/[0.045] px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                  <span className="typing-dots" aria-label="sage is typing">
                    <span className="typing-dots__dot" />
                    <span className="typing-dots__dot" />
                    <span className="typing-dots__dot" />
                  </span>
                </div>
              </div>
            )}

            {preludeStep === "skin" && pendingAgentMessage === null && !isRequestingTurn && (
              <SkinTonePicker
                currentColor={avatarState.skinColor}
                onSelect={handleSkinSelection}
                onContinue={handleContinueSkin}
                onSkip={() => {
                  void handleSkipAllCustomizations();
                }}
              />
            )}

            {preludeStep === "hair" && pendingAgentMessage === null && !isRequestingTurn && (
              <HairPicker
                currentState={avatarState}
                onColorSelect={(label) => {
                  const matched = HAIR_COLOR_OPTIONS.find((entry) => entry.label === label);
                  if (matched) {
                    setAvatarState((current) => ({ ...current, hairColor: matched.color }));
                  }
                }}
                onStyleSelect={(assetId) => updateSelection("Hair", assetId)}
                onContinue={handleContinueHair}
                onSkip={() => {
                  void handleSkipAllCustomizations();
                }}
              />
            )}

            {preludeStep === "facialHair" && pendingAgentMessage === null && !isRequestingTurn && (
              <FacialHairPicker
                currentState={avatarState}
                onSelect={(assetId) => updateSelection("FacialHair", assetId)}
                onContinue={handleContinueFacialHair}
                onSkip={() => {
                  void handleSkipAllCustomizations();
                }}
              />
            )}

            {preludeStep === "eyes" && pendingAgentMessage === null && !isRequestingTurn && (
              <SingleFeaturePicker
                title="eyes"
                categoryId="Eyes"
                currentState={avatarState}
                onSelect={(categoryId, assetId) => updateSelection(categoryId, assetId)}
                onContinue={handleContinueEyes}
                onSkip={() => {
                  void handleSkipAllCustomizations();
                }}
              />
            )}

            {preludeStep === "brows" && pendingAgentMessage === null && !isRequestingTurn && (
              <SingleFeaturePicker
                title="brows"
                categoryId="EyeBrow"
                currentState={avatarState}
                onSelect={(categoryId, assetId) => updateSelection(categoryId, assetId)}
                onContinue={handleContinueBrows}
                onSkip={() => {
                  void handleSkipAllCustomizations();
                }}
              />
            )}

            {preludeStep === "nose" && pendingAgentMessage === null && !isRequestingTurn && (
              <SingleFeaturePicker
                title="nose"
                categoryId="Nose"
                currentState={avatarState}
                onSelect={(categoryId, assetId) => updateSelection(categoryId, assetId)}
                onContinue={handleContinueNose}
                onSkip={() => {
                  void handleSkipAllCustomizations();
                }}
              />
            )}

            {preludeStep === "hat" && pendingAgentMessage === null && !isRequestingTurn && (
              <AccessoriesPicker
                title="hat"
                categoryId="Hat"
                currentState={avatarState}
                onSelect={(categoryId, assetId) => updateSelection(categoryId, assetId)}
                onContinue={handleContinueHat}
                onSkip={() => {
                  void handleSkipAllCustomizations();
                }}
              />
            )}

            {preludeStep === "glasses" && pendingAgentMessage === null && !isRequestingTurn && (
              <AccessoriesPicker
                title="glasses"
                categoryId="Glasses"
                currentState={avatarState}
                onSelect={(categoryId, assetId) => updateSelection(categoryId, assetId)}
                onContinue={handleContinueGlasses}
                onSkip={() => {
                  void handleSkipAllCustomizations();
                }}
              />
            )}

            {preludeStep === "earrings" && pendingAgentMessage === null && !isRequestingTurn && (
              <AccessoriesPicker
                title="earrings"
                categoryId="Earring"
                currentState={avatarState}
                onSelect={(categoryId, assetId) => updateSelection(categoryId, assetId)}
                onContinue={handleContinueEarrings}
                onSkip={() => {
                  void handleSkipAllCustomizations();
                }}
              />
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
                    "if this feels right, approve it and ill lock in your spot on the waitlist for launch."}
                </p>

                {canApprove && (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="rounded-2xl border border-white/20 bg-white px-6 py-3 text-sm font-semibold text-[#0B0B0C] transition hover:bg-white/90"
                    >
                      approved, continue
                    </button>
                    <a
                      href={skipWaitlistCheckoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/82 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    >
                      buy sage annual for $997 and get immediate access
                    </a>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-[#0B0B0C] via-[#0B0B0C]/94 to-transparent" />

        <div className="fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto w-full max-w-[50rem] px-2 pb-5">
            {error && (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-sm leading-6 text-red-300">{error}</p>
              </div>
            )}

            {!isComplete && !shouldHideComposer && (
              <form onSubmit={handleSubmit} className="relative">
                <div className="rounded-[2rem] border border-white/10 bg-[#2E2E30] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                  <div className="flex items-end gap-3 px-4 py-4">
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
                      onClick={() => {
                        void handleVoiceButtonClick();
                      }}
                      aria-label={isRecordingVoice ? "stop voice recording" : "voice input"}
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[#0B0B0C] transition ${
                        isRecordingVoice
                          ? "bg-[#ff453a] text-white hover:bg-[#ff5b52]"
                          : "bg-white hover:bg-white/90"
                      } ${isTranscribingVoice ? "cursor-wait opacity-80" : ""}`}
                      disabled={isTranscribingVoice}
                    >
                      {isRecordingVoice || isTranscribingVoice ? (
                        <span className="voice-waves" aria-hidden="true">
                          <span className="voice-waves__bar" />
                          <span className="voice-waves__bar" />
                          <span className="voice-waves__bar" />
                          <span className="voice-waves__bar" />
                        </span>
                      ) : (
                        <AudioLines className="h-5 w-5" strokeWidth={2.5} />
                      )}
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
