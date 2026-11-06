/**
 * Questivity brand configuration.
 * Text + identity values live here; colours live as CSS variables in src/app/globals.css.
 * See BRAND.md for how to align these with the official Questivity brand specification.
 */
export const brand = {
  company: "Questivity",
  product: "Questivity LMS",
  tagline: "Upskill. Certify. Deliver.",
  website: "https://www.questivity.com",
  supportEmail: "info@questivity.com",
  address: "1680 Civic Center Dr, Suite 209, Santa Clara, CA 95050",
  logo: "/brand/questivity-logo.jpg", // official logo from www.questivity.com (168×40)
  logoMark: "/icon.png",
  assistantName: "Quest Assistant",
  certificateSignatory: "Head of Learning & Development",
} as const;
