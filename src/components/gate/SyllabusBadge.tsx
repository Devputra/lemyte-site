// src/components/gate/SyllabusBadge.tsx — marks a past question whose topic has left the current GATE syllabus.
// The note comes from question_versions.syllabus_note ("Not in the GATE 2027 syllabus: <topic>").
export function SyllabusBadge({ note, compact = false }: { note: string | null | undefined; compact?: boolean }) {
  if (!note) return null;
  const topic = note.replace(/^Not in the GATE 2027 syllabus:\s*/, "");
  return (
    <span
      title={note}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
    >
      {compact ? "Not in 2027" : `Not in GATE 2027 syllabus${topic !== note ? `: ${topic}` : ""}`}
    </span>
  );
}
