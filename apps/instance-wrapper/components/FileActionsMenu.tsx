import React from "react";
import { Download, MoreVertical, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export type FileActionTarget = {
  id: string;
  name: string;
};

export type FileActionsMenuProps<T extends FileActionTarget> = {
  file: T;
  onRename: (file: T) => void;
  onDownload: (file: T) => void;
  onDelete: (file: T) => void;
  "aria-label"?: string;
};

export function FileActionsMenu<T extends FileActionTarget>({
  file,
  onRename,
  onDownload,
  onDelete,
  "aria-label": ariaLabel,
}: FileActionsMenuProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel ?? `Open actions for ${file.name}`}
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
            onRename(file);
          }}
        >
          <Pencil size={14} className="text-white/40" />
          Rename
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDownload(file);
          }}
        >
          <Download size={14} className="text-white/40" />
          Download
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-red-400 data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-200"
          onSelect={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(file);
          }}
        >
          <Trash2 size={14} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
