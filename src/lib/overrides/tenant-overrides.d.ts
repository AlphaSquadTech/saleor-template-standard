declare module "@tenant-overrides" {
  import type { ComponentType } from "react";
  export const storefrontOverrides: Record<string, ComponentType<any>>;
}
