import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Color, Material, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { AVATAR_ARMATURE_PATH, assetMap } from "./assets";
import type { AvatarCategoryId, AvatarSelection } from "./types";

interface AvatarModelProps {
  selection: AvatarSelection;
  skinColor: string;
  hairColor: string;
}

type PartMaterialMode = "skin" | "hair" | "none";

const facialFeatureCategories = new Set<AvatarCategoryId>([
  "Eyes",
  "EyeBrow",
  "Nose",
  "FacialHair",
]);

function findArmature(root: Object3D) {
  let skeleton: SkinnedMesh["skeleton"] | null = null;
  let hips: Object3D | null = null;

  root.traverse((child) => {
    if (!hips && child.name === "mixamorigHips") {
      hips = child;
    }

    if (!skeleton && child instanceof SkinnedMesh) {
      skeleton = child.skeleton;
    }
  });

  if (!hips || !skeleton) {
    throw new Error("Avatar armature is missing the required skeleton nodes.");
  }

  return { hips, skeleton };
}

function getMaterialMode(categoryId: AvatarCategoryId): PartMaterialMode {
  if (categoryId === "Head" || categoryId === "Nose") {
    return "skin";
  }

  if (categoryId === "Hair" || categoryId === "FacialHair" || categoryId === "EyeBrow") {
    return "hair";
  }

  return "none";
}

function cloneMaterial(
  material: Material,
  mode: PartMaterialMode,
  colorValue: string,
  isFacialFeature: boolean,
) {
  const clonedMaterial = material.clone();

  if (
    clonedMaterial instanceof MeshStandardMaterial &&
    mode !== "none" &&
    (clonedMaterial.name.includes("Skin_") || clonedMaterial.name.includes("Color_"))
  ) {
    clonedMaterial.color = new Color(colorValue);
  }

  if (clonedMaterial instanceof MeshStandardMaterial && isFacialFeature) {
    /*
      Facial layers sit very close together. A small polygon offset keeps brows,
      eyes, and facial hair from z-fighting against the head mesh.
    */
    clonedMaterial.polygonOffset = true;
    clonedMaterial.polygonOffsetFactor = -2;
    clonedMaterial.polygonOffsetUnits = -2;
  }

  return clonedMaterial;
}

function AvatarPart({
  categoryId,
  path,
  skeleton,
  colorValue,
}: {
  categoryId: AvatarCategoryId;
  path: string;
  skeleton: SkinnedMesh["skeleton"];
  colorValue: string;
}) {
  const { scene } = useGLTF(path);
  const materialMode = getMaterialMode(categoryId);
  const isFacialFeature = facialFeatureCategories.has(categoryId);

  const meshes = useMemo(() => {
    const collected: Array<{
      geometry: Mesh["geometry"];
      material: Material | Material[];
      morphTargetDictionary: Mesh["morphTargetDictionary"];
      morphTargetInfluences: Mesh["morphTargetInfluences"];
    }> = [];

    scene.traverse((child) => {
      if (!(child instanceof Mesh)) {
        return;
      }

      const material = Array.isArray(child.material)
        ? child.material.map((entry) =>
            cloneMaterial(entry, materialMode, colorValue, isFacialFeature),
          )
        : cloneMaterial(child.material, materialMode, colorValue, isFacialFeature);

      collected.push({
        geometry: child.geometry,
        material,
        morphTargetDictionary: child.morphTargetDictionary,
        morphTargetInfluences: child.morphTargetInfluences?.slice(),
      });
    });

    return collected;
  }, [colorValue, isFacialFeature, materialMode, scene]);

  return meshes.map((mesh, index) => (
    <skinnedMesh
      key={`${categoryId}-${path}-${index}`}
      geometry={mesh.geometry}
      material={mesh.material}
      skeleton={skeleton}
      morphTargetDictionary={mesh.morphTargetDictionary}
      morphTargetInfluences={mesh.morphTargetInfluences}
      castShadow
      receiveShadow
      renderOrder={isFacialFeature ? 2 : 0}
      frustumCulled={false}
    />
  ));
}

export function AvatarModel({ selection, skinColor, hairColor }: AvatarModelProps) {
  const { scene } = useGLTF(AVATAR_ARMATURE_PATH);
  const armature = useMemo(() => clone(scene), [scene]);
  const { hips, skeleton } = useMemo(() => findArmature(armature), [armature]);

  return (
    <group rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
      <primitive object={hips} />
      {(Object.keys(selection) as AvatarCategoryId[]).map((categoryId) => {
        const selectedId = selection[categoryId];

        if (!selectedId) {
          return null;
        }

        const asset = assetMap[categoryId][selectedId];

        if (!asset) {
          return null;
        }

        const colorValue =
          categoryId === "Head" || categoryId === "Nose" ? skinColor : hairColor;

        return (
          <AvatarPart
            key={selectedId}
            categoryId={categoryId}
            path={asset.path}
            skeleton={skeleton}
            colorValue={colorValue}
          />
        );
      })}
    </group>
  );
}

useGLTF.preload(AVATAR_ARMATURE_PATH);
