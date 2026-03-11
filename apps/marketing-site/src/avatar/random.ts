import {
  avatarCategories,
  createInitialAvatarSelection,
  hairPalette,
  skinPalette,
} from "./assets";
import type { AvatarAsset, AvatarCategory, AvatarSelection } from "./types";

const SESSION_STORAGE_KEY = "sage:application-avatar";
const BANNED_EYE_ASSET_IDS = new Set(["Eyes-006", "Eyes-007", "Eyes-008"]);

export interface RandomAvatarState {
  selection: AvatarSelection;
  skinColor: string;
  hairColor: string;
}

function pickRandomItem<T>(items: T[], randomSource: () => number): T {
  const index = Math.floor(randomSource() * items.length);
  return items[Math.min(index, items.length - 1)];
}

function shouldIncludeOptionalCategory(category: AvatarCategory, randomSource: () => number) {
  /*
    Optional accessories should appear often enough to keep the avatar varied,
    but not so often that every generated head feels cluttered.
  */
  if (!category.removable) {
    return true;
  }

  return randomSource() > 0.45;
}

function chooseAssetId(category: AvatarCategory, randomSource: () => number): string | null {
  /*
    Some eye meshes in the asset pack are closed-lid variants. The application
    page should keep the avatar looking awake, so those banned eye meshes are
    excluded from both new random selections and stored-session reuse.
  */
  if (category.id === "Eyes") {
    const allowedEyeAssets = category.assets.filter((asset) => !BANNED_EYE_ASSET_IDS.has(asset.id));
    return pickRandomItem(allowedEyeAssets, randomSource).id;
  }

  if (!shouldIncludeOptionalCategory(category, randomSource)) {
    return null;
  }

  return pickRandomItem(category.assets, randomSource).id;
}

export function createRandomAvatarSelection(randomSource: () => number = Math.random): AvatarSelection {
  const selection = createInitialAvatarSelection();

  for (const category of avatarCategories) {
    selection[category.id] = chooseAssetId(category, randomSource);
  }

  return selection;
}

export function createRandomAvatarState(randomSource: () => number = Math.random): RandomAvatarState {
  return {
    selection: createRandomAvatarSelection(randomSource),
    skinColor: pickRandomItem(skinPalette, randomSource),
    hairColor: pickRandomItem(hairPalette, randomSource),
  };
}

function isValidStoredAsset(
  value: unknown,
  category: AvatarCategory,
): value is AvatarAsset["id"] | null {
  if (value === null) {
    return category.removable === true;
  }

  if (typeof value !== "string") {
    return false;
  }

  if (category.id === "Eyes" && BANNED_EYE_ASSET_IDS.has(value)) {
    return false;
  }

  return category.assets.some((asset) => asset.id === value);
}

function isValidStoredAvatarState(value: unknown): value is RandomAvatarState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const selection = record.selection;

  if (!selection || typeof selection !== "object") {
    return false;
  }

  const selectionRecord = selection as Record<string, unknown>;

  return (
    typeof record.skinColor === "string" &&
    typeof record.hairColor === "string" &&
    avatarCategories.every((category) =>
      isValidStoredAsset(selectionRecord[category.id], category),
    )
  );
}

function createSessionAvatarStateKey(storageKey: string) {
  /*
    The avatar builder is now reused in more than one UI flow. Keeping the key
    generation in one place avoids subtle mismatches between read/write paths.
  */
  return storageKey;
}

export function loadOrCreateSessionAvatarSelection(
  storageKey: string = SESSION_STORAGE_KEY,
): RandomAvatarState {
  try {
    const stored = window.sessionStorage.getItem(createSessionAvatarStateKey(storageKey));

    if (stored) {
      const parsed = JSON.parse(stored) as unknown;

      if (isValidStoredAvatarState(parsed)) {
        return parsed;
      }
    }
  } catch {
    /*
      Storage parse failures should silently fall back to a fresh avatar so the
      application page is never blocked by bad cached session data.
    */
  }

  const nextAvatar = createRandomAvatarState();
  window.sessionStorage.setItem(createSessionAvatarStateKey(storageKey), JSON.stringify(nextAvatar));
  return nextAvatar;
}

export function saveSessionAvatarSelection(
  avatarState: RandomAvatarState,
  storageKey: string = SESSION_STORAGE_KEY,
) {
  /*
    Application chat customization needs an explicit save path so avatar edits
    survive refreshes within the current session instead of snapping back to the
    initial random selection.
  */
  window.sessionStorage.setItem(
    createSessionAvatarStateKey(storageKey),
    JSON.stringify(avatarState),
  );
}
