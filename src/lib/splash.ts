// The installed app's opening animation (components/pwa/SplashScreen.tsx). Kept outside the client component so
// the root layout (a server component) can put the script in <head> as plain text.

export const SPLASH_KEY = "am-splash-shown";

/**
 * Runs in <head> before the page paints: in the installed app (standalone), on the first page of each launch,
 * it marks <html> so the splash covers the screen at once (no flash of the page underneath).
 */
export const splashInitScript = `(function(){try{var s=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;if(s&&!sessionStorage.getItem("${SPLASH_KEY}"))document.documentElement.classList.add("am-splash");}catch(e){}})();`;
