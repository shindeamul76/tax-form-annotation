# Assumptions and Limitations

Status: Draft 1.0  
Related documents: [`specification.md`](./specification.md) and [`architecture.md`](./architecture.md)

## 1. Purpose

This document makes the operating assumptions and deliberate limitations of Tax Form Annotator version 1.0 explicit.

An **assumption** is a condition expected to be true for the application to work correctly. A **limitation** is functionality intentionally excluded or constrained in this version.

The project is an engineering assignment and proof of concept. It demonstrates a reusable annotation contract and a working authoring flow; it is not production tax-preparation or filing software.

## 2. Assumptions

### A-01: The exact PDF template is available

The annotation author and renderer use the same PDF bytes. The form ID and tax year alone are not sufficient to identify a template because the IRS can publish revisions with different layouts.

The application records:

- Template filename.
- Form ID and tax year.
- Revision label.
- Page dimensions.
- SHA-256 checksum.

A checksum mismatch is treated as a template mismatch, not as a harmless warning.

### A-02: Each template revision has its own annotation

Coordinates created for one tax year or PDF revision are not assumed to work for another revision. Even a small layout change can move a printed value outside its intended box.

A new or revised PDF must be imported, reviewed, corrected, and exported as a separate annotation document.

### A-03: Pages use a standard, unrotated orientation

Version 1.0 assumes every PDF page has an effective rotation of zero degrees. Page width and height describe the visible page in PDF points.

The authoring tool rejects a template containing rotated pages instead of attempting an unverified conversion.

### A-04: The visible page box is stable

The template is assumed to have a conventional page box configuration in which the visible CropBox does not have an unexpected offset from the page coordinate space used for output. The PDF adapter verifies extracted dimensions and uses the same visible page boundary for import, display, and rendering.

Templates with materially different MediaBox and CropBox boundaries require additional testing before use.

### A-05: Taxpayer values are already calculated

The dataset supplies taxpayer information and final or intermediate values that are ready to print. Examples include wages, adjusted gross income, taxable income, and total tax.

The annotation does not add wages, select tax brackets, determine filing status, or perform any other tax calculation.

### A-06: The dataset follows a known contract

The annotation references values in a versioned JSON structure. A data provider either supplies that structure directly or converts proprietary data through an adapter before rendering.

For example:

```text
/returns/federal/2025/income/wages
```

Changing the dataset structure requires a compatible adapter or an updated annotation.

### A-07: JSON Pointer is sufficient for value lookup

Every printable value can be obtained through an RFC 6901 JSON Pointer or a primitive constant. Values requiring calculation, concatenation, or conditional business logic are prepared in the dataset before rendering.

### A-08: A human confirms field meaning

AcroForm field names and rectangles are treated as suggestions. A verified profile for an exact template checksum may prefill semantic mappings, but a human annotator can inspect and correct each field's semantic ID, JSON Pointer, format, placement, and output behavior before export.

The application does not assume that a PDF field name accurately describes an IRS line or matches the project's dataset.

### A-09: Manual annotation is an acceptable fallback

Some tax-form PDFs may have no interactive fields or may expose incomplete or inaccurate widget rectangles. The user can draw, move, and resize fields manually when automatic import is unavailable or incorrect.

### A-10: Coordinates describe printable interiors

The selected rectangle represents the space available for the value, excluding the form label and border where practical. Coordinates are normalized from `0` through `1`, use a top-left origin, and are stored with sufficient precision.

The renderer, rather than the annotation author, calculates the final text baseline from font metrics, padding, and alignment.

### A-11: Sample data is valid JSON and fictional

Preview data is valid JSON and conforms to the declared data-contract version. Demonstrations, automated tests, repository examples, and the walkthrough video use fictional information only.

### A-12: Modern browser APIs are available

The authoring application runs in a current desktop version of Chrome, Edge, or Firefox with support for:

- File APIs.
- Canvas.
- Web Crypto SHA-256.
- Typed arrays.
- Blob downloads and object URLs.

The assignment is primarily demonstrated in the latest stable Chrome or Edge release.

### A-13: The default font is available

The sample renderer begins with a registered PDF font such as Helvetica. If an annotation requests another font, that font must be registered or embedded by the renderer.

The renderer reports an unsupported-font error rather than silently substituting a font with different measurements.

### A-14: Final PDF generation is the placement authority

The browser overlay is intended for rapid authoring feedback. The generated PDF uses the actual PDF font metrics and is the authoritative placement check before an annotation is accepted.

### A-15: One author edits a document at a time

The application holds one local editing session. Concurrent authors, merge resolution, remote locking, and shared review are outside the assignment workflow.

## 3. Limitations

### L-01: No tax calculation or tax advice

The application does not determine what a taxpayer owes, whether a value is legally correct, or which forms and schedules are required. It only places supplied values onto a template.

Generated output must not be treated as tax advice or as proof of a correct tax return.

### L-02: No IRS electronic filing

The project does not generate Modernized e-File payloads, transmit returns, validate IRS business rules, or communicate with IRS systems.

### L-03: No digital signatures or identity verification

The project does not capture legally binding signatures, verify taxpayer identity, manage consent, or implement paid-preparer requirements.

### L-04: No OCR or AI field detection

Version 1.0 can import existing AcroForm widgets and supports manual rectangle drawing. It does not detect empty boxes from page images or infer fields from visible labels.

### L-05: Automatic semantic mapping is profile-limited

The application can automatically apply 111 fictional sample-data mappings to the exact included 2025 Form 1040. These mappings cover the sample contract's printable identity, address, filing-status, dependent, income, deduction, tax, payment, refund, designee, signature-contact, and paid-preparer values. It verifies the template SHA-256 checksum, data-contract compatibility, widget kind, page, and strong normalized-box overlap before applying a mapping. Administrative widgets and values absent from the sample contract remain available for manual mapping or bulk exclusion. The application does not infer semantics for arbitrary forms, revised templates, or unknown data contracts.

### L-06: AcroForm import is best effort

Import supports conventional PDF AcroForm widget annotations exposed by PDF.js. It may not correctly import:

- Dynamic XFA forms.
- Encrypted or damaged forms.
- Custom JavaScript-driven widgets.
- Widgets with unusual appearance streams or page geometry.
- Non-widget regions that only look like fields.

Manual annotation remains the fallback.

### L-07: Rotated pages are unsupported

Pages with nonzero effective rotation are rejected in version 1.0. Supporting them requires defined and tested transformations for widget import, browser display, manual drawing, and final PDF output.

### L-08: An annotation is not portable across layouts

Normalized coordinates are independent of display resolution, but they are not independent of form layout. An annotation cannot safely be reused on another tax year, revision, translated form, or unofficial recreation without verification.

### L-09: JSON Pointer supports lookup only

Annotations cannot contain executable expressions, functions, joins, sums, or conditional tax logic. For example, the annotation cannot add several W-2 amounts or choose a value based on filing status.

The dataset or its adapter must expose the final value at a resolvable pointer.

### L-10: Supported field types are finite

Version 1.0 supports:

- `text`
- `number`
- `money`
- `date`
- `checkbox`
- `percentage`
- `masked-identifier`
- `multiline-text`

It does not define barcode, image, signature, radio-group, table, calculated, or repeating-section annotations.

### L-11: Font and character coverage depends on embedded fonts

PDF standard fonts do not support every Unicode character. The sample renderer can render only characters covered by its registered fonts. A requested value that cannot be encoded produces an error rather than being silently changed.

Broader language support requires embedding an appropriate licensed Unicode font.

### L-12: Browser preview is not pixel-identical to PDF output

Browser text layout and PDF font measurement can differ slightly. Preview is used to find obvious mapping, formatting, and alignment problems; the generated sample PDF must be visually inspected for final verification.

### L-13: Output is a visual demonstration, not a filing guarantee

The sample renderer draws values onto a copy of the PDF according to the annotation. It does not guarantee that:

- Every IRS-required field is present.
- Values are correct under current tax law.
- The output satisfies accessibility requirements for official government documents.
- A tax authority or commercial tax application will accept the PDF.

### L-14: Existing PDF behavior may not be preserved universally

Unusual forms may contain scripts, signatures, embedded files, layers, or interactive behavior that a PDF library does not preserve exactly when saving a modified copy. The original template is never overwritten, and the generated PDF must be inspected.

### L-15: No server-side persistence

The assignment version does not provide accounts, databases, autosave across devices, backup, audit history, or cloud file storage. Refreshing or closing the page can lose unsaved changes.

Users export annotation JSON to persist their work.

### L-16: No collaborative editing

There are no comments, reviewers, permissions, shared cursors, conflict resolution, or version merges. Git can be used to review and version exported annotation files outside the application.

### L-17: Limited undo and recovery scope

If undo and redo are included, they apply only to the active local session and do not replace persistent version history. Imported files and previously downloaded artifacts are not managed by the application.

### L-18: No mobile-first authoring

The application may display on smaller screens, but precise PDF annotation is designed for a desktop pointer and keyboard. Touch-only drawing and mobile layout are not primary acceptance targets.

### L-19: No automatic form migration

The application does not automatically move annotations from one template revision to another. Authors can import an older annotation as a starting reference only after the future migration workflow defines how template incompatibility is handled.

### L-20: Performance is targeted at normal tax forms

The editor is designed for forms containing tens or hundreds of fields across a modest number of pages. Very large PDFs, thousands of annotations, high-resolution scanned documents, and memory-constrained devices are not primary performance targets.

## 4. Failure policy

The application fails explicitly when continuing could produce a misleading document.

Export or filled-PDF generation is blocked for conditions including:

- Invalid annotation schema.
- Incomplete field mappings.
- Duplicate field IDs.
- Out-of-bounds boxes.
- Missing target pages.
- Unsupported page rotation.
- Template checksum mismatch.
- Incompatible source value types.
- Unresolvable values whose behavior is `error`.
- Values that cannot fit under an `error` overflow policy.
- Unsupported fonts or characters.

Warnings may allow output when the specification explicitly permits continuation, such as a missing value configured with `onMissing: "warn"`.

## 5. Privacy boundary

The repository and submitted artifacts contain only fictional sample taxpayer data. The application processes selected files locally and does not intentionally upload them.

This assignment does not claim production compliance with tax-data security, retention, privacy, audit, or breach-reporting requirements. A production deployment would require a separate security and compliance review before processing real taxpayer information.

## 6. Interpretation for reviewers

Success for this assignment means demonstrating that:

1. An exact PDF template can be loaded and identified.
2. Existing widgets can be used as annotation starting points when available.
3. Missing or incorrect rectangles can be created and corrected manually.
4. Each field can reference a deeply nested value through JSON Pointer.
5. Values can be formatted and previewed inside normalized boxes.
6. A strict annotation document can be validated and exported.
7. Independent renderer code can use that document to generate a sample filled PDF.

It does not mean the application is ready to prepare, file, or legally validate a real tax return.
