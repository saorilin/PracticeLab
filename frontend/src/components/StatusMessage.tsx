import type { ReactNode } from "react";

interface StatusMessageProps {
  kind?: "info" | "error" | "success";
  children: ReactNode;
}

export function StatusMessage({ kind = "info", children }: StatusMessageProps) {
  return (
    <p className={`status-message status-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}
