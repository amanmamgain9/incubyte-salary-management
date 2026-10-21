"use client";

import type { z } from "zod";
import { dialogParams, useDialog } from "@/hooks/use-dialog";

/** The employee screens' dialogs (create over the directory; edit and salary over the profile) and saved notices. */
const employeeDialogs = dialogParams(["create", "edit", "salary"], ["created", "details", "salary"]);

export type SavedNotice = NonNullable<z.output<typeof employeeDialogs>["saved"]>;

/** `useDialog` with the employee screens' dialog and notice names. */
export function useEmployeeDialog() {
  return useDialog(employeeDialogs);
}
