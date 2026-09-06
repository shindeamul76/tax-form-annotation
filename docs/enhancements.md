# Enhancement Roadmap

This document describes potential improvements beyond annotation specification version 1.0 and the current demonstration application. These items are intentionally not presented as implemented functionality.

The current version prioritizes a small, deterministic contract: an exact PDF template, normalized boxes, explicit JSON Pointers, formatting rules, validation, human review, and renderer-independent export. Future work should preserve those properties while reducing repetitive authoring and supporting larger production workflows.

## Priorities

| Priority | Enhancement | Primary value |
| --- | --- | --- |
| Near term | Conditional and composed value sources | Express common display rules without preprocessing every value |
| Near term | Repeating field groups | Map dependents and other collections without defining each row separately |
| Near term | Renderer conformance fixtures | Help independent renderers interpret the specification consistently |
| Medium term | Assisted field recognition | Reduce manual mapping while retaining human approval |
| Medium term | Template migration and comparison | Make annual form revisions easier to review safely |
| Medium term | Dataset contract schemas | Validate the complete input shape, not only its contract ID and version |
| Longer term | Collaboration and approval workflow | Support teams authoring and reviewing production profiles |

## 1. Conditional and composed value sources

Version 1.0 deliberately supports only a JSON Pointer or primitive constant. This keeps value resolution portable and predictable, but some values currently need to be prepared by an upstream adapter. Examples include combining a first name with a middle initial and selecting one checkbox from a string-valued account type.

A future version could add declarative operations such as:

- `coalesce` to select the first available value;
- `concat` to combine text values;
- `equals` and `not` for checkbox conditions;
- `if` for simple conditional selection;
- carefully defined arithmetic for display-only totals.

These operations should be represented as validated data rather than executable JavaScript. A small expression model would remain language-independent, deterministic, and safe to implement in proprietary renderers.

Tax calculations should remain outside the annotation layer. Any arithmetic support would be limited to presentation logic whose behavior is precisely documented.

## 2. Repeating field groups

Tax forms frequently provide a fixed number of visual rows for repeated data such as dependents. Version 1.0 maps each printable row explicitly using pointers such as `/dependents/0/legalName/first`.

A repeating-group extension could define:

- the JSON Pointer to an input array;
- the maximum number of printable items;
- the normalized offset between rows or columns;
- child field definitions relative to each repeated region;
- overflow behavior when the dataset contains more items than the form can display.

The exporter could expand the group into ordinary version 1.0 fields. This would reduce authoring duplication without requiring every renderer to implement repeating groups immediately.

## 3. Renderer conformance fixtures

The repository includes a sample `pdf-lib` renderer, but the specification is intended to support independent implementations.

A conformance package could contain:

- small PDF templates with known page dimensions;
- annotation documents covering every source, format, alignment, overflow, and rotation option;
- input datasets and expected formatted values;
- expected coordinates in PDF points;
- reference output PDFs or machine-readable drawing instructions;
- a compatibility report identifying required and optional capabilities.

These fixtures would help another team build a renderer without relying on implementation details from this application.

## 4. Assisted field recognition

The current importer extracts existing AcroForm widgets automatically. When a PDF has no usable widgets, an author draws rectangles and assigns meanings manually.

Future assistance could combine PDF text extraction, OCR, layout analysis, and optional AI suggestions to propose field rectangles, labels, field types, JSON Pointers, and repeated structures.

Every suggestion should include a confidence score and supporting evidence, such as nearby PDF text. Low-confidence suggestions should remain unmapped, and all suggestions should require human review before publication. The template checksum would continue to bind approved results to the exact PDF revision.

## 5. Template migration and comparison

Annotations are intentionally template-specific because tax forms can move or resize fields between revisions.

A migration workflow could:

1. compare the old and new PDF checksums and page metadata;
2. match unchanged AcroForm widgets and nearby labels;
3. propose new coordinates for existing semantic field IDs;
4. highlight added, removed, moved, or resized fields;
5. require a reviewer to approve the new profile;
6. run visual regression and conformance tests before publication.

This would accelerate annual updates without silently reusing coordinates from an older form.

## 6. Dataset contract schemas

Version 1.0 identifies the expected dataset using an ID and version. Preview validation then reports missing JSON Pointer paths and incompatible primitive values.

A production registry could associate each data-contract version with its own JSON Schema and checksum. The application could validate the complete dataset before resolving individual fields and provide clearer diagnostics for missing objects, arrays, and invalid domain values.

Contract evolution should follow explicit compatibility rules. Additive optional properties could use a minor version, while renamed or structurally changed properties would require a major version and an adapter or migration.

## 7. Rendering and PDF coverage

Additional rendering capabilities could include:

- registered and embedded custom fonts;
- richer multiline fitting and hyphenation;
- radio groups and choice fields as explicit semantic types;
- rotated pages and non-default PDF crop boxes;
- accessible tagging for generated content;
- flattened output for systems that require non-editable PDFs;
- optional writing into existing AcroForm values instead of drawing an overlay.

These features should be added alongside cross-library coordinate tests because PDF libraries can interpret page boxes, rotations, and font metrics differently.

## 8. Collaboration and profile governance

The current application is intentionally browser-local and does not require a backend. A production collaboration service could add authenticated workspaces, role-based access, review and approval states, immutable profile versions, audit history, comments, controlled rollback, and template and contract registries.

Sensitive taxpayer datasets should remain separate from reusable annotation profiles. If sample-data preview is supported by a hosted service, it should use explicit consent, encryption, retention limits, redaction, and access auditing. Local-only preview should remain available for sensitive workflows.

## 9. Authoring experience and scale

For larger forms and profile libraries, the editor could add:

- search and filtering by page, status, field ID, label, or JSON Pointer;
- keyboard navigation, undo and redo, copy and paste, and multi-select alignment;
- snapping to nearby boxes, guides, and configurable grids;
- reusable style presets and field templates;
- batch pointer editing and bulk behavior changes;
- autosave and recovery for local drafts;
- virtualization for forms with thousands of annotations;
- accessibility testing for keyboard-only and assistive-technology users.

Performance work should be guided by measured form sizes and profiling rather than adding complexity preemptively.

## Suggested implementation order

1. Add renderer conformance fixtures around the stable version 1.0 contract.
2. Define and test a safe composed-source model as an additive specification version.
3. Add repeating groups with export-to-version-1.0 expansion.
4. Build template comparison and migration around exact checksums.
5. Introduce assisted recognition with confidence and mandatory human approval.
6. Add collaboration services only when shared authoring and governance are required.

This order improves portability and authoring efficiency before introducing probabilistic automation or operational infrastructure.
