import type { AvatarAsset, AvatarCategory, AvatarCategoryId, AvatarSelection } from "./types";

/*
  The asset catalog mirrors the validated naming scheme from the old avatar
  builder, but it only exposes the head-related parts needed by the bootstrap
  page. Everything points at the stable public `/avatar-assets` directory so the
  page never depends on backup folders or the private `Assets/` source path.
*/

const padAssetNumber = (value: number) => String(value).padStart(3, "0");

const createAssets = (
  prefix: AvatarCategoryId,
  count: number,
  labelPrefix: string,
): AvatarAsset[] =>
  Array.from({ length: count }, (_, index) => {
    const assetNumber = index + 1;
    const suffix = padAssetNumber(assetNumber);

    return {
      id: `${prefix}-${suffix}`,
      label: `${labelPrefix} ${assetNumber}`,
      path: `/avatar-assets/${prefix}.${suffix}.glb`,
    };
  });

export const AVATAR_ARMATURE_PATH = "/avatar-assets/Armature.glb";

export const avatarCategories: AvatarCategory[] = [
  { id: "Head", label: "Head", assets: createAssets("Head", 4, "Head") },
  { id: "Hair", label: "Hair", assets: createAssets("Hair", 11, "Hair") },
  { id: "Eyes", label: "Eyes", assets: createAssets("Eyes", 12, "Eyes") },
  { id: "EyeBrow", label: "Brows", assets: createAssets("EyeBrow", 10, "Brows") },
  { id: "Nose", label: "Nose", assets: createAssets("Nose", 4, "Nose") },
  {
    id: "FacialHair",
    label: "Facial Hair",
    removable: true,
    assets: createAssets("FacialHair", 7, "Facial Hair"),
  },
  {
    id: "Glasses",
    label: "Glasses",
    removable: true,
    assets: createAssets("Glasses", 4, "Glasses"),
  },
  { id: "Hat", label: "Hat", removable: true, assets: createAssets("Hat", 7, "Hat") },
  {
    id: "Earring",
    label: "Earring",
    removable: true,
    assets: createAssets("Earring", 6, "Earring"),
  },
];

export const skinPalette = [
  "#f6d7c3",
  "#efc0a7",
  "#d99474",
  "#a65d49",
  "#6a3d30",
  "#ff69b4",
  "#1e90ff",
  "#32cd32",
  "#8a2be2",
  "#ffd700",
  "#ff3b30",
];
export const hairPalette = [
  "#1b1b1b",
  "#59391f",
  "#8a5a31",
  "#d9c6a5",
  "#a33530",
  "#1e90ff",
  "#32cd32",
  "#8a2be2",
  "#ff69b4",
  "#ffd700",
  "#ff3b30",
  "#c6d2df",
];

export const assetMap = avatarCategories.reduce(
  (catalog, category) => {
    catalog[category.id] = category.assets.reduce(
      (lookup, asset) => {
        lookup[asset.id] = asset;
        return lookup;
      },
      {} as Record<string, AvatarAsset>,
    );

    return catalog;
  },
  {} as Record<AvatarCategoryId, Record<string, AvatarAsset>>,
);

export const createInitialAvatarSelection = (): AvatarSelection =>
  avatarCategories.reduce((selection, category) => {
    selection[category.id] = category.removable ? null : category.assets[0]?.id ?? null;
    return selection;
  }, {} as AvatarSelection);
