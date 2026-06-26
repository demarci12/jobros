---
name: project-stack
description: Non-obvious stack choices in Jobro — UI library, CSS toolchain, server guard pattern
metadata:
  type: project
---

The UI component library is `@base-ui/react` (^1.6.0), NOT `@radix-ui/react-*`. Shadcn is present only as a CLI tool (`shadcn ^4.11.0`) and CSS import (`shadcn/tailwind.css`). Component source files use Base UI primitives directly. The correct polymorphic-render API in Base UI is the `render` prop (not Radix's `asChild`), so `<TooltipTrigger render={<MyEl />} />` is valid Base UI v1 syntax.

**Why:** The scaffold was generated with shadcn v4 which targets Base UI instead of Radix UI.

**How to apply:** Do not flag `render={...}` as a wrong API. Do flag `asChild` usage — it would be a Radix API applied to a Base UI component, which won't work.

---

CSS toolchain is Tailwind v4 (`tailwindcss ^4.3.1`, `@tailwindcss/postcss ^4.3.1`). Lightning CSS is bundled inside `@tailwindcss/postcss` and handles autoprefixing and oklch→rgb downgrade. `autoprefixer` is in devDependencies but NOT wired into `postcss.config.js` — this is intentional for Tailwind v4. Colors use `oklch()` throughout globals.css; Lightning CSS downgrades them for older browsers automatically.

**Why:** Tailwind v4 documentation explicitly deprecates the need for a separate autoprefixer plugin.

**How to apply:** Do not flag `autoprefixer` absence from postcss.config.js as a bug for Tailwind-generated CSS. Do flag it if custom non-Tailwind CSS uses vendor-prefix-sensitive properties AND the codebase starts using hand-written CSS outside Tailwind utilities.

---

Service client guard: `lib/supabase/service.ts` uses `import "server-only"` (Next.js build-time bundler guard) instead of a `typeof window` runtime check. This prevents the service role key from appearing in client bundles. In Jest/Node.js test environments `server-only` is a no-op — it does not throw at runtime outside the Next.js bundler.

**Why:** `server-only` is strictly better for production (prevents bundling); the old runtime check was defense-in-depth for a scenario that the bundler guard already eliminates.

**How to apply:** Accept `server-only` as the correct pattern. Flag if any test file is found directly importing `service.ts` without mocking — the service role key could appear in test logs if run against a real environment.
