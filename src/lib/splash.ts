// The installed app's opening animation (components/pwa/SplashScreen.tsx). Kept outside the client component so
// the root layout (a server component) can put the script in <head> as plain text.

export const SPLASH_KEY = "am-splash-shown";

/**
 * Runs in <head> before the page paints: in the installed app (standalone), on the first page of each launch,
 * it marks <html> so the splash covers the screen at once (no flash of the page underneath). A page opened from
 * inside the app (a link that opens a new window, so a fresh sessionStorage) has this site as its referrer and is skipped.
 * On Android it also adds `am-android`, so the cover's logo starts at the size Android's own launch screen showed.
 */
export const splashInitScript = `(function(){try{var s=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;var r=document.referrer,inApp=false;try{inApp=!!r&&new URL(r).origin===location.origin;}catch(e){}if(s&&!inApp&&!sessionStorage.getItem("${SPLASH_KEY}")){var h=document.documentElement;h.classList.add("am-splash");if(/Android/i.test(navigator.userAgent))h.classList.add("am-android");}}catch(e){}})();`;
