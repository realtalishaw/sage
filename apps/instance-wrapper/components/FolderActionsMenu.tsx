import React from "react";
import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export type FolderActionTarget = {
  id: string;
  name: string;
  isFavorite?: boolean;
};

export type FolderActionsMenuProps<T extends FolderActionTarget> = {
  folder: T;
  onRename: (folder: T) => void;
  onToggleFavorite: (folder: T) => void;
  onDelete: (folder: T) => void;
  "aria-label"?: string;
};

export function FolderActionsMenu<T extends FolderActionTarget>({
  folder,
  onRename,
  onToggleFavorite,
  onDelete,
  "aria-label": ariaLabel,
}: FolderActionsMenuProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel ?? `Open actions for ${folder.name}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg p-1.5 text-white/30 transition-all hover:bg-white/10 hover:text-white"
        >
          <MoreVertical size={14} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={10}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRename(folder);
          }}
        >
          <Pencil size={14} className="text-white/40" />
          Rename
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(folder);
          }}
        >
          <Star size={14} className={folder.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-white/40"} />
          {folder.isFavorite ? "Unstar" : "Star"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-red-400 data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-200"
          onSelect={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(folder);
          }}
        >
          <Trash2 size={14} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
