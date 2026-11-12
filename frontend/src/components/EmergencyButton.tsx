"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button, Modal } from "./ui";

/** The red "life under threat" button: asks for confirmation, then alerts estate security. */
export function EmergencyButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const send = async () => {
    setStatus("sending");
    try {
      await api.sendEmergencyAlert();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const close = () => {
    setOpen(false);
    setStatus("idle");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? "rounded-md bg-danger px-3 py-2 text-xl font-semibold text-white hover:bg-red-700"}
      >
        life under threat
      </button>
      <Modal title="Emergency alert" open={open} onClose={close}>
        {status === "sent" ? (
          <div className="space-y-4">
            <p className="rounded bg-brand-soft px-4 py-3 font-medium text-brand-dark">
              Alert sent. Estate security has been notified and is on its way.
            </p>
            <p className="text-sm text-muted">Emergency line: +234 810 000 0000</p>
            <Button onClick={close} className="w-full">Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p>This alerts estate security and the estate admin straight away. Only use it in a real emergency.</p>
            {status === "error" && <p className="text-sm text-danger">The alert didn&apos;t go through. Try again, or call +234 810 000 0000.</p>}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={close} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={send} disabled={status === "sending"} className="flex-1">
                {status === "sending" ? "Sending…" : "Send alert"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
