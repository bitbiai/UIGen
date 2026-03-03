"use client";

import type { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

function getLabel(toolInvocation: ToolInvocation): string {
  const { toolName, args } = toolInvocation;

  if (toolName === "str_replace_editor" && args?.path) {
    switch (args.command) {
      case "create":
        return `Creating ${args.path}`;
      case "str_replace":
      case "insert":
        return `Editing ${args.path}`;
      case "view":
        return `Reading ${args.path}`;
      case "undo_edit":
        return `Undoing edit in ${args.path}`;
    }
  }

  if (toolName === "file_manager" && args?.path) {
    switch (args.command) {
      case "rename":
        return `Renaming ${args.path} → ${args.new_path}`;
      case "delete":
        return `Deleting ${args.path}`;
    }
  }

  return toolName;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const label = getLabel(toolInvocation);
  const isDone = toolInvocation.state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
