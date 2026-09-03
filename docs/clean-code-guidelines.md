# Clean Code Guidelines

The project favors code that is easy to read, test, change, and remove. Working behavior is necessary, but maintainability is part of correctness.

## Naming

- Use intention-revealing names that explain why a value exists and how it is used.
- Include units when ambiguity is possible, such as `pageWidthPt`, `displayLeftPx`, and `normalizedHeight`.
- Name components, types, and classes with nouns or noun phrases, such as `FieldInspector` and `AnnotationDocument`.
- Name functions with verbs or verb phrases, such as `resolveJsonPointer`, `normalizeScreenBox`, and `generateFilledPdf`.
- Use predicate names that read as questions, such as `isFieldMapped` and `hasValidationErrors`.
- Choose one term for each concept and use it consistently. In this project, use `load` for files, `resolve` for data references, `format` for display conversion, and `render` for visual output.
- Avoid vague names such as `data`, `info`, `manager`, `processor`, and `helper` when a domain-specific name is available.

## Functions and modules

- Give each function and module one focused responsibility.
- Keep functions small enough that their purpose is apparent from their name and structure.
- Extract non-obvious branches into descriptively named functions when doing so improves readability.
- Prefer a parameter object when a function needs more than three related arguments.
- Keep domain logic independent of React and PDF-library APIs.
- Separate validation, formatting, coordinate conversion, PDF access, and UI state transitions.
- Minimize unnecessary classes, wrappers, and abstractions. Introduce an abstraction only when it clarifies a real boundary or removes meaningful duplication.

## Data and behavior

- Use plain data structures for serializable contracts such as `AnnotationDocument` and `FieldAnnotation`.
- Keep behavior in focused functions that operate on those structures.
- Do not mix taxpayer values, annotation layout, editor-only state, and PDF-library objects.
- Make invalid or incomplete editor states explicit instead of hiding them with fabricated defaults.

## Error handling

- Keep success-path logic easy to follow.
- Convert library-specific failures into project-level errors at module boundaries.
- Separate parsing, validation, and rendering failures so the UI can report actionable messages.
- Do not silently coerce invalid taxpayer values or ignore unresolved JSON Pointers.
- Use `try`/`catch` at meaningful boundaries rather than scattering it through pure domain functions.

## Duplication and tests

- Keep coordinate formulas, JSON Pointer resolution, field formatting, and schema validation in single reusable modules.
- Remove duplication when it represents the same domain rule; do not force unrelated code into a premature abstraction.
- Add tests for every domain rule and regression-prone boundary.
- Keep the test suite passing before considering a change complete.

## Comments

- Follow `docs/commenting-guidelines.md`.
- Prefer clearer code over explanatory comments.
- Retain comments that document intent, units, external constraints, standards, or compatibility decisions that code cannot express.

## Review checklist

Before completing a change, verify that:

1. Names reveal intent and units.
2. Each function has one clear purpose.
3. Dependencies point from UI and adapters toward the domain, not the reverse.
4. Error behavior is explicit and actionable.
5. Domain rules are not duplicated.
6. Tests cover the behavior and pass.
7. Comments add information the code cannot provide itself.
