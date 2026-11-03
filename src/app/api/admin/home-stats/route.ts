import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminAuth";
import { SiteSetting } from "@/models/SiteSetting";
import { HOME_STATS_KEY, getShowHomeStats } from "@/lib/siteFlags";
import { invalidateHomeStats } from "@/lib/pageCache";
import { logAdminAction } from "@/lib/adminLog";
import { reportError } from "@/lib/errorLog";

/** Whether "AutoGO in numbers" shows on the home and About pages. */
export async function GET() {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ show: await getShowHomeStats() });
  } catch (error) {
    reportError("Home stats GET error:", error);
    return NextResponse.json({ error: "Failed to load the setting" }, { status: 500 });
  }
}

/** Switches it: { show: boolean } (full admins). The two pages update straight away. */
export async function PUT(req: NextRequest) {
  const gate = await requireAdminApi("settings");
  if (!gate.ok) return gate.response;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.show !== "boolean") return NextResponse.json({ error: "Choose show or hide" }, { status: 400 });
    await SiteSetting.updateOne({ key: HOME_STATS_KEY }, { $set: { value: { show: body.show }, updatedBy: gate.admin._id } }, { upsert: true });
    invalidateHomeStats();
    revalidatePath("/");
    revalidatePath("/about");
    await logAdminAction(gate.admin, "settings.homeStats", { type: "SETTINGS", label: "AutoGO in numbers" }, body.show ? "Shown" : "Hidden");
    return NextResponse.json({ show: body.show });
  } catch (error) {
    reportError("Home stats PUT error:", error);
    return NextResponse.json({ error: "Failed to save the setting" }, { status: 500 });
  }
}
