"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface EntityRowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  extraItems?: Array<{
    label: string;
    icon?: React.ElementType;
    onClick: () => void;
    destructive?: boolean;
  }>;
}

export function EntityRowActions({ onEdit, onDelete, extraItems }: EntityRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Műveletek"
      >
        <MoreHorizontal size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil size={14} className="mr-2" />
            Szerkesztés
          </DropdownMenuItem>
        )}
        {extraItems?.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.label}
              onClick={item.onClick}
              className={item.destructive ? "text-destructive focus:text-destructive" : ""}
            >
              {Icon && <Icon size={14} className="mr-2" />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
        {onDelete && (
          <>
            {(onEdit || extraItems?.length) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 size={14} className="mr-2" />
              Törlés
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
