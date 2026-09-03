# Tax Form Annotator

A browser-based tool for defining, validating, previewing, and exporting annotations that map structured taxpayer values onto exact U.S. tax-form PDF templates.

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
