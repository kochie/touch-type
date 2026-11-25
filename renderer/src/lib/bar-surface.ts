// Solid fill shared by the top nav bar and the sticky page title bar. Solid on
// purpose: the title bar scrolls over page content while the nav bar has only
// the window behind it, so any translucent fill renders as two different shades.
// The colours are what the page background actually looks like on screen: the
// body colour at the default 85% opacity over the window's native vibrancy.
// Measured in dark mode as rgb(28 28 31), a touch lighter than raw zinc-900.
export const BAR_SURFACE = "bg-zinc-50 dark:bg-[#1c1c1f]";
