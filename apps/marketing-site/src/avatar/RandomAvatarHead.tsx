import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { AvatarScene } from "./AvatarScene";
import {
  loadOrCreateSessionAvatarSelection,
  type RandomAvatarState,
} from "./random";

export interface RandomAvatarHeadHandle {
  capturePngDataUrl: () => string | null;
}

interface RandomAvatarHeadProps {
  avatarState?: RandomAvatarState;
  storageKey?: string;
}

export const RandomAvatarHead = forwardRef<RandomAvatarHeadHandle, RandomAvatarHeadProps>(
  function RandomAvatarHead(
    { avatarState: controlledAvatarState, storageKey }: RandomAvatarHeadProps,
    ref,
  ) {
    const sessionAvatarState = useMemo(
      () => loadOrCreateSessionAvatarSelection(storageKey),
      [storageKey],
    );
    const avatarState = controlledAvatarState ?? sessionAvatarState;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        capturePngDataUrl() {
          const canvas = canvasRef.current;
          if (!canvas) {
            return null;
          }

          try {
            return canvas.toDataURL("image/png");
          } catch {
            return null;
          }
        },
      }),
      [],
    );

    return (
      <div
        className="h-[12.5rem] w-[14rem] overflow-hidden rounded-[2.5rem] bg-transparent sm:h-[14.5rem] sm:w-[16rem]"
        style={{
          /*
            Keep the frame transparent at the top so the avatar can extend into
            that space naturally. Only the lower edge should fade out into the
            transcript area.
          */
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, #000 76%, rgba(0,0,0,0.88) 90%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, #000 0%, #000 76%, rgba(0,0,0,0.88) 90%, transparent 100%)",
        }}
      >
        <AvatarScene
          selection={avatarState.selection}
          skinColor={avatarState.skinColor}
          hairColor={avatarState.hairColor}
          interactionMode="drag-follow"
          canvasRef={canvasRef}
        />
      </div>
    );
  },
);
