# Tax Form Annotator

A browser-based tool for defining, validating, previewing, and exporting annotations that map structured taxpayer values onto exact U.S. tax-form PDF templates.

## Implemented workflow

- Load a local PDF or the bundled 2025 Form 1040.
- Import existing AcroForm widgets.
- Auto-map the six sample fields when the exact bundled template and compatible taxpayer-data contract are loaded.
- Review or manually correct every suggested mapping, then exclude all remaining unmapped drafts in one confirmed action.
- Enter exact form identity and data-contract metadata.
- Configure document-wide rendering and missing-value defaults.
- Draw, select, move, and resize normalized field boxes.
- Map fields to RFC 6901 JSON Pointers or primitive constants.
- Configure field formats, rendering overrides, and missing-value behavior.
- Correct coordinates through pointer interaction or exact numeric inputs.
- Load fictional sample JSON and preview formatted values over the PDF.
- Review missing paths, incompatible values, and data-contract diagnostics.
- Review layered draft, JSON Schema, and semantic export-readiness checks.
- Download a validated, strict annotation JSON file.
- Generate and download a sample filled PDF using the exact template.

## Requirements

- Node.js 24 LTS is recommended; Node.js 22.13 or newer is required.
- npm is included with Node.js.

## Getting started

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal, normally `http://localhost:5173`.

## Quality commands

```bash
npm run lint
npm test
npm run validate:examples
npm run build
```

- `npm run lint` checks JavaScript, TypeScript, and React code with ESLint.
- `npm test` runs the Vitest suite once.
- `npm run validate:examples` validates annotation examples against `schemas/annotation.schema.json`.
- `npm run build` type-checks the project and produces the production bundle.

Use `npm run test:watch` for test-driven development and `npm run preview` to inspect a completed production build locally.

## Documentation

- [Annotation specification](docs/specification.md)
- [Architecture](docs/architecture.md)
- [Assumptions and limitations](docs/assumptions-and-limitations.md)
