"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

const FIRST_FIELD = "input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])";

type DialogProps = {
  /** Whether the dialog is shown; screens pass `useDialog().current === name`. */
  open: boolean;
  title: string;
  /** A save is in flight: Esc, the backdrop and the close button do nothing until it settles. */
  pending?: boolean;
  /** Asks the owner to close (Esc, backdrop, close button); the dialog stays open until `open` turns false. */
  onClose: () => void;
  children: ReactNode;
};

/**
 * The one modal: a native `<dialog>` opened with `showModal()` (the rest of the page is inert, so focus stays
 * inside). Focus moves into the dialog on open and back to the control that opened it on close. Children mount
 * only while open, so a form starts from its initial values every time.
 */
export function Dialog({ open, ...props }: DialogProps) {
  return open ? <ModalDialog {...props} /> : null;
}

function ModalDialog({ title, pending = false, onClose, children }: Omit<DialogProps, "open">) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pressedBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!opener.current && document.activeElement instanceof HTMLElement) opener.current = document.activeElement;
    if (!dialog.open) dialog.showModal();
    // showModal() focuses the first focusable element (the close button); start on the first editable field.
    dialog.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
    // Runs after the dialog left the page, when the opener is focusable again.
    return () => {
      if (opener.current?.isConnected) opener.current.focus();
    };
  }, []);

  const requestClose = () => {
    if (!pending) onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={pending || undefined}
      // Esc: keep the dialog open natively; the owner closes it by turning `open` off.
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      // The browser closed it anyway (e.g. a repeated Esc): reopen while saving, otherwise let the owner close it.
      onClose={() => {
        if (pending) ref.current?.showModal();
        else onClose();
      }}
      // A click that starts and ends on the backdrop (the dialog box itself, outside its content) closes it.
      onMouseDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) requestClose();
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-190 overflow-y-auto rounded-panel border border-line bg-surface p-0 text-ink shadow-panel backdrop:bg-ink/30"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 id={titleId} className="text-heading">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close"
          disabled={pending}
          onClick={requestClose}
          className="grid size-8 cursor-pointer place-items-center rounded-control text-muted hover:bg-rail-hover hover:text-ink disabled:cursor-default disabled:opacity-40"
        >
          <Icon name="close" size={17} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
