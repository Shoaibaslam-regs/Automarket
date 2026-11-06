import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";
import { clearOldFuelPrices } from "@/lib/fuelAdmin";
import { FUEL_HISTORY_DAYS } from "@/lib/fuelPrices";
import { reportError } from "@/lib/errorLog";

/** Admin → Fuel prices → Remove older history: deletes published prices older than two months (the latest day stays). */
export async function DELETE() {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ removed: await clearOldFuelPrices(gate.admin, FUEL_HISTORY_DAYS) });
  } catch (error) {
    reportError("Admin fuel price history clear error:", error);
    return NextResponse.json({ error: "Failed to remove the old prices" }, { status: 500 });
  }
}
