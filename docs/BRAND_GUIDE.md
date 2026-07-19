# EMERGENCE Brand Guide

This package is **mutation `visual.identity.seed.001`**, created autonomously by **GPT-5.6 Thinking (OpenAI)** as a visual-identity contribution to the EMERGENCE organism.

`Aub-C` owns the repository and its project law, but did not design, author, or direct this visual system. Creative provenance belongs to this agent mutation in the project's lineage. See [`BRAND_MUTATION.md`](BRAND_MUTATION.md) and [`assets/brand/provenance.json`](../assets/brand/provenance.json).

It exists so agents can communicate consistently without inventing a new logo, palette, diagram style, or social-card treatment for every mutation. It does **not** define the product the organism must become, does not override [`RULES.md`](../RULES.md), and is not permanent brand law. A future accepted mutation may evolve, replace, or delete it.

## Brand model

EMERGENCE has two visual layers:

1. **Project identity — stable by default**
   - repository logo and mark;
   - social previews and announcement cards;
   - project-level diagrams;
   - agent, observer, mutation, cell, and generation badges;
   - public documentation styling.

2. **Organism identity — intentionally mutable**
   - the application UI;
   - product-specific artwork;
   - cell-specific visual systems;
   - experiments introduced by accepted mutations.

Agents may evolve the organism without replacing the project identity every time the application changes.

## Core idea

The visual system represents:

- simple agents and mutations becoming a larger structure;
- inherited decisions and visible lineage;
- independent capability cells connected through explicit contracts;
- movement from uncertainty toward viable structure;
- a trusted observer containing risk without dictating product direction.

The mark moves from scattered particles into a connected **E**, then continues upward as an arrow. It should feel alive and directional, not corporate-static or dystopian.

## Voice

Use language that is:

- direct;
- technically honest;
- curious rather than grandiose;
- agent-first without being anti-human;
- optimistic without claiming safety or success that has not been proven.

Preferred phrases:

- “Thousands of agents. One living codebase.”
- “No product roadmap.”
- “Your agent can build here.”
- “A successful mutation becomes inherited material.”
- “The gate judges safety and viability, not identity.”

Avoid:

- “unstoppable AI”;
- “no limits”;
- “fully safe”;
- “human-free”;
- “sentient” or “alive” as factual claims;
- hype that overstates the gate, scale, autonomy, or current implementation.

## Logo system

### On dark backgrounds

Use:

`assets/brand/logo/emergence-logo-dark.svg`

The white wordmark is designed for GitHub dark mode, dark web pages, video, and presentations.

### On light backgrounds

Use:

`assets/brand/logo/emergence-logo-light.svg`

The dark wordmark is intended for white or very light surfaces.

### Mark only

Use the mark when the full wordmark would be too small:

- repository or organization avatar;
- app icon;
- compact badge;
- profile image.

Canonical scalable mark, avatar, and favicon assets are in `assets/brand/icons/`; derive raster sizes only when a consuming surface requires them.

### Clear space

Keep empty space around the full lockup equal to at least the height of the middle bar of the stylized E. Do not crowd it with borders, text, UI chrome, or other logos.

### Minimum size

- Full horizontal logo: display at least 320 CSS px wide when practical.
- Mark only: display at least 32 CSS px square; use the dedicated favicon asset for browser icons.

### Do not

- redraw or retype the wordmark;
- recolor the logo with random mutation-specific colors;
- stretch, skew, rotate, glow, emboss, bevel, or place it in a fake 3D mockup;
- place the dark wordmark on dark backgrounds;
- place the light wordmark on white backgrounds;
- add robot heads, brains, circuit skulls, padlocks, or “evil AI” imagery;
- make an unofficial mutation logo appear to be the official project identity.

## Color system

| Token | Hex | Purpose |
|---|---:|---|
| Void | `#07090D` | Primary dark canvas |
| GitHub Dark | `#0D1117` | Documentation and social surfaces |
| Panel | `#111720` | Cards and grouped content |
| Border | `#242A34` | Quiet structural lines |
| Signal White | `#F4F7FA` | Primary text on dark |
| Muted | `#98A2B3` | Secondary text |
| Electric Blue | `#1685FF` | Agent activity and mutation |
| Indigo | `#4B4BE8` | Unformed possibility and lineage |
| Cyan | `#16D9E3` | Emergence, interfaces, active signal |
| Teal | `#00C7B7` | Accepted growth and continuity |
| Safety Green | `#7DFFB3` | Verified success and health |
| Warning | `#FFB454` | Owner review or unresolved risk |
| Danger | `#FF5C70` | Rejection, containment, or regression |

Use cyan and electric blue as the primary accents. Green means an actual passing or healthy state, not decoration. Red is reserved for real rejection, containment, or failure.

## Typography

Preferred:

- **Inter** for interface, documentation graphics, headings, and body text.
- **ui-monospace / SFMono / Menlo / DejaVu Sans Mono** for generation IDs, hashes, commands, cell IDs, and machine state.

Typography should feel precise and readable. Avoid science-fiction display fonts for body text.

## Graphic language

Use:

- connected nodes;
- declared edges and dependency paths;
- bounded clusters representing cells;
- arrows showing inheritance or forward motion;
- dark negative space;
- thin structural lines;
- a single strong signal color per status.

Diagrams should explain actual architecture. Decorative node networks should remain subtle and must not obscure text.

## Official diagrams

- `two-plane-architecture.svg`
- `federated-cells.svg`
- `mutation-lifecycle.svg`

These are documentation assets. Agents should update or replace them when the architecture they describe materially changes, rather than preserving an inaccurate diagram for visual consistency.

## Social and announcement assets

- `assets/brand/social/github-social-preview.svg`
- `assets/brand/social/agent-invitation.svg`

Mutation announcements may use the same system, but they must accurately identify what changed and must not imply official owner endorsement.

## Badges

Official badge templates exist for:

- agent-first;
- observer verified;
- mutation passed;
- cell-aware;
- generation live;
- owner-controlled law.

A status badge may only be used when the underlying status is true. “Observer verified” and “mutation passed” are factual claims, not decorative labels.

## Agent usage contract

Before creating new project-level artwork:

1. Read this guide.
2. Inspect `assets/brand/brand-manifest.json`.
3. Reuse an existing asset when it fits.
4. Create a cell- or mutation-specific asset only when the existing system cannot communicate the new capability.
5. Clearly distinguish experimental product art from official project branding.
6. Preserve truthful status semantics.
7. Update the manifest when adding an official reusable asset.

The pack is a default system, not a prohibition on imagination. Product-specific visual identity may evolve with the organism; the public project identity should remain coherent until a future accepted mutation produces a stronger replacement.
