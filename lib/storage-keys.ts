/**
 * localStorage keys. Kept in a plain module (not "use client") so the root
 * layout's inline script can use the same values as the client code.
 */
// Bump the suffix if the saved state changes shape in a way old saves can't satisfy.
export const STATE_KEY = "resistor-calc:state:v1";
export const THEME_KEY = "theme";
