import { Avatar } from "@/components/ui/avatar";
import { Caption } from "@/components/ui/caption";
import { SignOutButton } from "@/features/auth/sign-out-button";

/** The signed-in HR user and the sign-out control, at the foot of the rail. */
export function AccountFooter({ name }: { name: string }) {
  return (
    <div className="mx-1.25 flex items-center gap-3 border-t border-rail-line px-1.5 pt-4">
      <Avatar name={name} shape="square" />
      <div className="min-w-0">
        <strong className="block truncate text-body font-medium text-ink-soft">{name}</strong>
        <Caption under>HR workspace</Caption>
      </div>
      <SignOutButton />
    </div>
  );
}
