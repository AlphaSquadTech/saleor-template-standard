# Tenant Override System

This template supports component overrides from tenant wrapper repos created by `@alphasquad/create-saleor-storefront`.

## How It Works

1. The CLI creates a tenant repo with `src/overrides/index.ts` that exports a `storefrontOverrides` registry
2. `next.config.ts` maps `@tenant-overrides` to the tenant's `src/overrides/` directory (or empty defaults if none exist)
3. Template components check the registry and use tenant overrides when available, falling back to template defaults

## SSR & Performance Guarantees

The override system is designed to preserve server-side rendering and performance:

- **Header**: The template always fetches navigation data server-side. Both the default and any tenant override receive these as props.
- **Footer**: The template always fetches footer data server-side. Both the default and any tenant override receive these as props.
- **ShowroomHeroCarousel**: Client component. Override replaces it 1:1.
- **TestimonialsGrid**: Server component. Override replaces it 1:1.
- **HomePage**: Full page replacement. The template's metadata export still applies.

**Rule**: If the template component is a server component that fetches data, the override system passes that data as props. Tenant overrides should NOT re-fetch the same data client-side.

## Supported Override Keys

| Key | Props Received | Rendering |
|-----|---------------|-----------|
| `HomePage` | None (full page) | Server or Client |
| `Header` | `{ categories, menuItems }` | Server component |
| `Footer` | `{ footerMenu }` | Server component |
| `ShowroomHeroCarousel` | None | Client component |
| `TestimonialsGrid` | `{ first }` | Server component |

## Tenant Override Example

```ts
// src/overrides/index.ts
import MyHomePage from "./HomePage";
import MyHeader from "./Header";

export const storefrontOverrides = {
  HomePage: MyHomePage,
  Header: MyHeader,
};
```

## Adding New Override Points

To make a new component overridable while preserving SSR:

1. Import: `import { storefrontOverrides } from "@tenant-overrides";`
2. If the component fetches data server-side:
   - Define a `RendererProps` interface with the fetched data
   - Split into: async data-fetcher (stays as export) + renderer (overridable)
   - The data-fetcher passes props to whichever renderer is active
3. If the component is client-only:
   - Rename: `const DefaultFoo = ...`
   - Export with override: `export const Foo = (storefrontOverrides as any).Foo || DefaultFoo;`

## Zero Impact When Unused

When no tenant overrides exist (e.g., running the template directly):
- `@tenant-overrides` resolves to `src/lib/overrides/defaults.ts` (empty object)
- All override checks resolve to `DefaultXxx` immediately
- No bundle size increase, no runtime overhead
