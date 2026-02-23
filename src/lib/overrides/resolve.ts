/**
 * Override Resolution System
 *
 * Allows tenant wrapper repos (created by @alphasquad/create-saleor-storefront)
 * to override specific template components by placing files in src/overrides/.
 *
 * Supported override keys (expand as needed):
 *   - HomePage: Replaces the entire homepage content
 *   - Header: Replaces the site header
 *   - Footer: Replaces the site footer
 *   - ShowroomHeroCarousel: Replaces the hero section
 *   - TestimonialsGrid: Replaces the testimonials section
 */

export { storefrontOverrides } from "@tenant-overrides";

import { storefrontOverrides } from "@tenant-overrides";
import type { ComponentType } from "react";

export function withOverride<P extends Record<string, unknown>>(
  key: string,
  DefaultComponent: ComponentType<P>
): ComponentType<P> {
  const Override = (storefrontOverrides as Record<string, ComponentType<any>>)[
    key
  ];
  return (Override as ComponentType<P>) || DefaultComponent;
}
