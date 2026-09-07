# Tax Form Annotator

A browser-based tool for defining, validating, previewing, and exporting annotations that map structured taxpayer values onto exact U.S. tax-form PDF templates. PDF and sample-data processing happens locally in the browser.

The project defines a renderer-independent JSON contract and includes an authoring application plus a sample filled-PDF renderer that demonstrates the contract end to end. It maps prepared values to a form; it does not calculate a tax return.

## Implemented workflow

- Load a local PDF or the bundled 2025 Form 1040.
- Import existing AcroForm widgets.
- Auto-map 111 sample-data fields when the exact bundled template and compatible taxpayer-data contract are loaded.
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
Deployed link - https://starlit-gumption-8fd1cf.netlify.app/

## Quick demo

1. Select **Load included Form 1040** and wait for the application to import its 199 AcroForm widgets.
2. In **Sample-data preview**, select **Load sample JSON**.
3. Select **Auto-map 111 sample fields**.
4. Enable **Preview** to display resolved and formatted fictional values over the PDF.
5. Select **Exclude 88 unmapped fields** and confirm. These widgets are administrative fields, special tax situations, spouse fields, or values absent from the sample contract.
6. Confirm that **Export readiness** is **Ready**, then select **Download annotation JSON** or **Download filled PDF**.

Automatic mapping is deliberately limited to the checksum-identical bundled 2025 Form 1040 and the compatible sample-data contract. Unknown or revised forms continue through the manual review workflow.

## Core deliverables

- [JSON Schema](schemas/annotation.schema.json) defines the annotation contract.
- [2025 Form 1040 annotation](examples/annotations/form-1040-2025.annotation.json) provides 111 renderer-ready field mappings.
- [Fictional sample taxpayer data](examples/data/sample-taxpayer-data.json) exercises deeply nested JSON Pointers and supported formatting.
- [Exact PDF template](examples/templates/f1040-2025.pdf) is pinned by SHA-256 checksum in the annotation.
- [Written specification](docs/specification.md) documents positioning, formatting, value resolution, validation, and renderer behavior.

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

## Profile generation

```bash
npm run generate:1040-profile
```

This command rebuilds the bundled 2025 Form 1040 annotation from the exact PDF widget geometry and the reviewed semantic mapping definitions. Run it only when intentionally updating that profile, then validate and review the generated annotation before committing it.

## Automated quality checks

GitHub Actions runs the same lint, test, example-validation, and production-build commands on every push and pull request. A failed check appears on the repository's **Actions** tab and on the related commit or pull request.

## Documentation

- [Annotation specification](docs/specification.md)
- [Architecture](docs/architecture.md)
- [Assumptions and limitations](docs/assumptions-and-limitations.md)
- [Enhancement roadmap](docs/enhancements.md)

## Video walkthrough

[Watch the technical-test walkthrough on Loom](https://www.loom.com/share/371c150bcf4346b3847131c7522346bb)

Walkthrough details are also available in [video/README.md](video/README.md).
