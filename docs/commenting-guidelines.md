# Commenting Guidelines

Code is the primary documentation. Prefer clear names, small routines, focused abstractions, and a simple project layout before adding comments.

## Comments we keep

- **Intent:** Explain why a decision or block exists when the code cannot express the reason.
- **Summary:** Briefly describe a meaningful group of operations when it improves scanning.
- **External context:** Record constraints that code cannot capture, including coordinate units, value ranges, data limitations, standards, compatibility decisions, legal requirements, and justified performance trade-offs.

## Comments we avoid

- Line-by-line or end-of-line narration that repeats the code.
- Explanations used to compensate for confusing code; simplify or refactor first.
- Redundant comments that restate names, types, or control flow.
- Unexplained abbreviations.
- Comments for unnamed magic numbers; introduce a descriptive constant instead.
- Temporary markers without a consistent, searchable convention.

## Project-specific expectations

- Document coordinate origins, units, ranges, conversions, and rounding decisions because these constraints are not obvious from arithmetic alone.
- Document assumptions at PDF-library boundaries, especially page rotation, page boxes, and top-left versus bottom-left coordinate systems.
- Document tax-form and data-contract version constraints where they affect compatibility.
- Use one- or two-sentence intent comments before non-obvious control flow or routines.
- Keep comments accurate when behavior changes; stale comments are defects.
- Use `TODO:` only for deliberate unfinished work, include a concrete action, and remove it before the final submission unless the limitation is intentionally documented.

## Review test

Before keeping a comment, ask:

1. Can clearer code express this information?
2. Does the comment explain intent, summarize a meaningful operation, or record information unavailable from the code?
3. Will the comment help a future maintainer without duplicating the implementation?

If the answer is no, improve the code or remove the comment.
