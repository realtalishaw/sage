import { Environment, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Group, MathUtils, Vector2 } from "three";
import { avatarCategories, AVATAR_ARMATURE_PATH } from "./assets";
import { AvatarModel } from "./AvatarModel";
import type { AvatarSelection } from "./types";

interface AvatarSceneProps {
  selection: AvatarSelection;
  skinColor: string;
  hairColor: string;
  interactionMode?: "pointer-follow" | "drag-follow" | "static";
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}

interface DragTargetsRefValue {
  targetY: number;
  targetX: number;
}

interface FramedAvatarProps extends AvatarSceneProps {
  dragTargetsRef?: React.MutableRefObject<DragTargetsRefValue>;
}

function FramedAvatar({
  selection,
  skinColor,
  hairColor,
  interactionMode = "pointer-follow",
  dragTargetsRef,
}: FramedAvatarProps) {
  const motionGroupRef = useRef<Group | null>(null);
  const target = useMemo(() => new Vector2(), []);
  const livePointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (interactionMode !== "pointer-follow" && interactionMode !== "drag-follow") {
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      livePointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      livePointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener("mousemove", handlePointerMove);
    return () => window.removeEventListener("mousemove", handlePointerMove);
  }, []);

  useFrame((_, delta) => {
    if (!motionGroupRef.current) {
      return;
    }

    if (interactionMode === "drag-follow") {
      target.set(
        livePointer.current.x * 0.14 + (dragTargetsRef?.current.targetY ?? 0),
        livePointer.current.y * 0.07 + (dragTargetsRef?.current.targetX ?? 0),
      );

      motionGroupRef.current.rotation.y = MathUtils.damp(
        motionGroupRef.current.rotation.y,
        target.x,
        6.5,
        delta,
      );
      motionGroupRef.current.rotation.x = MathUtils.damp(
        motionGroupRef.current.rotation.x,
        target.y,
        6.5,
        delta,
      );
      return;
    }

    if (interactionMode === "static") {
      motionGroupRef.current.rotation.y = MathUtils.damp(
        motionGroupRef.current.rotation.y,
        0,
        8,
        delta,
      );
      motionGroupRef.current.rotation.x = MathUtils.damp(
        motionGroupRef.current.rotation.x,
        0,
        8,
        delta,
      );
      return;
    }

    /*
      The motion should feel like the head is tracking from its center point,
      not like the whole avatar is hanging from a hook. Keep the range tight so
      the top-rail composition stays calm and the face remains framed.
    */
    target.set(livePointer.current.x * 0.16, livePointer.current.y * 0.08);

    motionGroupRef.current.rotation.y = MathUtils.damp(
      motionGroupRef.current.rotation.y,
      target.x,
      6.5,
      delta,
    );
    motionGroupRef.current.rotation.x = MathUtils.damp(
      motionGroupRef.current.rotation.x,
      target.y,
      6.5,
      delta,
    );
  });

  return (
    <group ref={motionGroupRef} position={[0, -0.36, 0]}>
      {/*
        The inner offset keeps the head sitting in the same visual spot while
        the outer group becomes the actual rotation pivot near the face center.
        The slight downward offset leaves breathing room above hats/hair without
        creating an opaque padded band at the top of the viewport.
      */}
      <group position={[0, -1.38, 0]}>
        <AvatarModel selection={selection} skinColor={skinColor} hairColor={hairColor} />
      </group>
    </group>
  );
}

export function AvatarScene({
  selection,
  skinColor,
  hairColor,
  interactionMode = "pointer-follow",
  canvasRef,
}: AvatarSceneProps) {
  const dragTargetsRef = useRef<DragTargetsRefValue>({
    targetY: 0,
    targetX: 0,
  });
  const dragStateRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode !== "drag-follow") {
      return;
    }

    dragStateRef.current.isDragging = true;
    dragStateRef.current.lastX = event.clientX;
    dragStateRef.current.lastY = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode !== "drag-follow" || !dragStateRef.current.isDragging) {
      return;
    }

    const deltaX = event.clientX - dragStateRef.current.lastX;
    const deltaY = event.clientY - dragStateRef.current.lastY;
    dragStateRef.current.lastX = event.clientX;
    dragStateRef.current.lastY = event.clientY;
    dragTargetsRef.current.targetY += deltaX * 0.015;
    dragTargetsRef.current.targetX = MathUtils.clamp(
      dragTargetsRef.current.targetX + deltaY * 0.006,
      -0.38,
      0.38,
    );
    dragTargetsRef.current.targetY = MathUtils.clamp(
      dragTargetsRef.current.targetY,
      -Math.PI * 2,
      Math.PI * 2,
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode !== "drag-follow") {
      return;
    }

    dragStateRef.current.isDragging = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      className="h-full w-full"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Canvas
        dpr={interactionMode === "static" ? 1 : [1, 1.5]}
        camera={{ position: [0, 0.92, 3.15], fov: 22 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        shadows={interactionMode !== "static"}
        frameloop={interactionMode === "static" ? "demand" : "always"}
        onCreated={({ gl }) => {
          /*
            Approval needs a real PNG portrait of the finalized Sage. Exposing
            the underlying canvas lets the application page capture the already
            rendered avatar instead of trying to rebuild it in a second scene.
          */
          if (canvasRef) {
            canvasRef.current = gl.domElement;
          }
        }}
      >
        <ambientLight intensity={interactionMode === "static" ? 1.55 : 1.35} />
        <directionalLight
          position={[2.2, 3.1, 3.4]}
          intensity={interactionMode === "static" ? 1.55 : 2.25}
        />
        <directionalLight
          position={[-2.5, 2.2, 1.6]}
          intensity={interactionMode === "static" ? 0.38 : 0.72}
        />
        <Suspense fallback={null}>
          {interactionMode !== "static" ? <Environment preset="studio" /> : null}
          <FramedAvatar
            selection={selection}
            skinColor={skinColor}
            hairColor={hairColor}
            interactionMode={interactionMode}
            dragTargetsRef={dragTargetsRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(AVATAR_ARMATURE_PATH);
avatarCategories.forEach((category) => {
  category.assets.forEach((asset) => {
    useGLTF.preload(asset.path);
  });
});
