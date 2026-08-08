/**
 * Funnel analytics — thin wrapper over Umami (cookieless, no consent
 * banner needed under PECR). Page views are tracked automatically by the
 * Umami script in index.html; this helper is for the named funnel events.
 *
 * Every call is fire-and-forget and safe when Umami isn't loaded
 * (ad-blocked, local dev without the env var) — analytics must never
 * break the product.
 *
 * Funnel events used across the app:
 *   demo_scenario_selected   { scenario }
 *   demo_outfit_viewed       { scenario }
 *   demo_cta_clicked
 *   signup_started           { method: "google" | "apple" | "password" }
 *   signup_completed         { method }
 *   first_garment_uploaded
 *   recommendation_generated { source: "prompt" | "scenario", first: bool }
 *   affiliate_click          { product }   (production; demo clicks are server-side)
 */

export function track(event, props = {}) {
  try {
    if (window.umami?.track) window.umami.track(event, props);
  } catch {
    /* never let analytics throw */
  }
}
