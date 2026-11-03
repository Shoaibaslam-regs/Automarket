import { describe, expect, it } from "vitest";
import { isPrioritySupport, priorityOverdue, sortInbox, waitingFor } from "@/lib/supportPriority";

const now = new Date("2026-11-03T12:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("priority support", () => {
  it("is for Premium Plus and Ultimate", () => {
    expect(isPrioritySupport("FREE")).toBe(false);
    expect(isPrioritySupport("STARTER")).toBe(false);
    expect(isPrioritySupport("PRO")).toBe(true);
    expect(isPrioritySupport("UNLIMITED")).toBe(true);
  });

  it("is overdue after the target reply time", () => {
    expect(priorityOverdue(ago(3), now)).toBe(false);
    expect(priorityOverdue(ago(5), now)).toBe(true);
    expect(priorityOverdue(null, now)).toBe(false);
  });

  it("lists waiting Priority conversations first, longest waiting on top, then the rest newest first", () => {
    const rows = [
      { id: "a", open: true, priority: false, lastAt: ago(1), waitingSince: ago(1) },
      { id: "b", open: true, priority: true, lastAt: ago(2), waitingSince: ago(2) },
      { id: "c", open: false, priority: true, lastAt: ago(0.5), waitingSince: ago(9) },
      { id: "d", open: true, priority: true, lastAt: ago(6), waitingSince: ago(6) },
      { id: "e", open: false, priority: false, lastAt: ago(3), waitingSince: null },
    ];
    expect(sortInbox(rows).map(r => r.id)).toEqual(["d", "b", "c", "a", "e"]);
  });

  it("says how long someone has waited", () => {
    expect(waitingFor(ago(0.25), now)).toBe("15 min");
    expect(waitingFor(ago(5), now)).toBe("5 h");
    expect(waitingFor(ago(72), now)).toBe("3 days");
  });
});
