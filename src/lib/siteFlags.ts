import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { SiteSetting } from "@/models/SiteSetting";
import { HOME_STATS_TAG } from "@/lib/pageCache";
import { reportError } from "@/lib/errorLog";

// The "AutoGO in numbers" block (components/home/LiveStats.tsx) on the home and About pages is shown only once a full
// admin switches it on (Admin → Overview), so small early numbers don't put visitors off. Stored as the `homeStats`
// SiteSetting; no setting means hidden.

export const HOME_STATS_KEY = "homeStats";

/** Whether the public pages show the numbers block, read at most once a minute and cleared when the switch changes. */
export const getShowHomeStats = unstable_cache(
  async (): Promise<boolean> => {
    try {
      await connectDB();
      const s = await SiteSetting.findOne({ key: HOME_STATS_KEY }).lean<{ value?: { show?: boolean } }>();
      return s?.value?.show === true;
    } catch (err) {
      reportError("Home stats setting failed:", err);
      return false;
    }
  },
  ["home-stats-shown"],
  { revalidate: 60, tags: [HOME_STATS_TAG] }
);
