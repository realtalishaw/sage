/*
  These avatar types intentionally model only the head-related categories used
  by the application page. The application avatar is decorative identity, not
  a full avatar-builder surface, so body/outfit categories are excluded here.
*/

export type AvatarCategoryId =
  | "Head"
  | "Hair"
  | "Eyes"
  | "EyeBrow"
  | "Nose"
  | "FacialHair"
  | "Glasses"
  | "Hat"
  | "Earring";

export interface AvatarAsset {
  id: string;
  label: string;
  path: string;
}

export interface AvatarCategory {
  id: AvatarCategoryId;
  label: string;
  removable?: boolean;
  assets: AvatarAsset[];
}

export type AvatarSelection = Record<AvatarCategoryId, string | null>;
