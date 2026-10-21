import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const variants = {
  primary: "border-accent bg-accent text-surface shadow-button hover:bg-accent-hover",
  secondary: "border-line-strong bg-surface text-ink-secondary hover:bg-surface-hover",
  ghost: "border-transparent bg-transparent text-muted hover:bg-rail-hover hover:text-ink",
  danger: "border-negative bg-negative text-surface hover:bg-negative-ink",
} as const;

const sizes = {
  md: "min-h-control px-3.25 py-2 text-body",
  sm: "min-h-7.5 px-2.5 py-1.25 text-label",
} as const;

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Stretch to the container width (single-column forms such as login). */
  block?: boolean;
  icon?: IconName;
  /** A request is in flight: disabled, announced busy, spinner instead of the icon. */
  pending?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  icon,
  pending = false,
  disabled,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const glyph = pending ? "spinner" : icon;
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-control border font-semibold whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-40",
        variants[variant],
        sizes[size],
        block && "w-full",
      )}
      {...props}
    >
      {glyph ? <Icon name={glyph} size={size === "sm" ? 15 : 17} /> : null}
      {children}
    </button>
  );
}
