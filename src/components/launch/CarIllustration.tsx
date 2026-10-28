/* eslint-disable @next/next/no-img-element -- tiny decorative pieces that must line up exactly; the optimiser adds nothing */

/**
 * The AutoGO car: the logo's car (facing right, with its speed lines in the hero gradient), whose front wheel turns in place.
 * Shared by the app splash, the launch animation and the 404 page.
 *
 * Drawn from the logo's body cut out in /public/car (with its wheel cleared) and a perfectly round wheel
 * (`wheel-round.png`: a disc with a broken inner ring, so the turning shows) laid over the arch and rotated
 * (`am-wheel-spin`). The logo's own wheel is a slanted oval, which wobbled when it turned, so it isn't used. Black ink by default, for the splash's always-white screen;
 * `themed` swaps to the white-ink pair in dark mode, so the car stays visible on a dark card. `wheelTurns` stops
 * the wheel after that many turns (the 404 car stops when it crashes); by default it turns while the car shows.
 */

/** Where the wheel sits on the body, as shares of the body's width and height (measured on the logo). */
const WHEEL = { x: 0.7246, y: 0.7457, size: 0.1744 };
/** Height ÷ width of the body image. */
const ASPECT = 0.3343;

export default function CarIllustration({ spin = true, width = 72, themed = false, wheelTurns }: {
  spin?: boolean; width?: number; themed?: boolean; wheelTurns?: number;
}) {
  const wheelPx = width * WHEEL.size;
  const wheelStyle: React.CSSProperties = {
    position: "absolute",
    width: wheelPx,
    height: wheelPx,
    left: width * WHEEL.x - wheelPx / 2,
    top: width * ASPECT * WHEEL.y - wheelPx / 2,
    animation: spin ? `am-wheel-spin 0.35s linear ${wheelTurns ?? "infinite"}` : undefined,
  };
  const pair = (dark: string, light: string, style: React.CSSProperties, base: string) =>
    themed ? (
      <>
        <img src={dark} alt="" draggable={false} className={`${base} dark:hidden`} style={style} />
        <img src={light} alt="" draggable={false} className={`${base} hidden dark:block`} style={style} />
      </>
    ) : (
      <img src={dark} alt="" draggable={false} className={base} style={style} />
    );

  return (
    <span aria-hidden className="relative block select-none" style={{ width, height: width * ASPECT }}>
      <style>{`@keyframes am-wheel-spin { to { transform: rotate(360deg); } }`}</style>
      {pair("/car/body.png", "/car/body-light.png", { width, height: width * ASPECT }, "block")}
      {pair("/car/wheel-round.png", "/car/wheel-round-light.png", wheelStyle, "")}
    </span>
  );
}
