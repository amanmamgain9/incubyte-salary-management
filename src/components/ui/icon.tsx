// The only icon-library import site: screens name an icon; the 18px size and stroke stay consistent.
import {
  ArrowUpRight,
  Calendar,
  ChartLine,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

const icons = {
  brand: ChartNoAxesColumnIncreasing,
  employees: Users,
  commitment: Wallet,
  departments: LayoutGrid,
  growth: TrendingUp,
  history: ChartLine,
  "sign-out": LogOut,
  menu: Menu,
  search: Search,
  add: Plus,
  open: ArrowUpRight,
  spinner: LoaderCircle,
  close: X,
  calendar: Calendar,
  previous: ChevronLeft,
  next: ChevronRight,
  expand: ChevronDown,
  copy: Copy,
  copied: Check,
} as const;

export type IconName = keyof typeof icons;

/** A decorative 18px icon (hidden from assistive tech); label the control that contains it instead. */
export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const Glyph = icons[name];
  return (
    <Glyph
      aria-hidden="true"
      size={size}
      strokeWidth={name === "brand" ? 3 : 1.6}
      className={cn("shrink-0", name === "spinner" && "animate-spin motion-reduce:animate-none", className)}
    />
  );
}
