"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Copies a demo credential to the clipboard and confirms for a moment. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="ghost"
      size="sm"
      icon={copied ? "copied" : "copy"}
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}
    />
  );
}
