"use client";

import { Alert } from "@/components/ui/alert";
import { useDialog, type SavedNotice } from "@/hooks/use-dialog";

const messages: Record<SavedNotice, string> = {
  created: "Employee created.",
  details: "Employee details saved.",
  salary: "Salary updated.",
};

/** The one success notice a closed dialog leaves behind (`?saved=`), on the page that was behind it. */
export function SavedAlert() {
  const { saved } = useDialog();
  return saved ? <Alert tone="success">{messages[saved]}</Alert> : null;
}
