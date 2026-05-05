"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSchedule } from "@/actions/schedules";

export function DeleteScheduleButton({
  scheduleId,
  canDelete = true,
}: {
  scheduleId: string;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!canDelete) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remover este agendamento?")) return;
        start(async () => {
          await deleteSchedule(scheduleId);
          router.refresh();
        });
      }}
      className="text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
    >
      {pending ? "…" : "Remover"}
    </button>
  );
}
