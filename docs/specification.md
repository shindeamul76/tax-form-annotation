# Tax Form Annotation Specification

Status: Draft 1.0  
Annotation version: `1.0`

## 1. Purpose

This specification defines a JSON format for describing where values from a deeply nested dataset must be printed on an exact version of a U.S. tax-form PDF.

An annotation document is a declarative contract between an annotation authoring tool and a renderer. It answers three questions for every printable field:

1. Which value should be read?
2. Where should it be printed?
3. How should it be formatted and fitted?

The complete rendering operation is:

```text
PDF template + annotation document + taxpayer dataset = completed PDF
```

The annotation format does not calculate tax. All values that require tax or business calculations must already exist in the supplied dataset.

## 2. Terminology

The words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** describe requirements in this specification.

- **Template**: The exact blank PDF on which values will be printed.
- **Annotation document**: JSON metadata describing the template and its printable fields.
- **Field annotation**: The source, position, formatting, and behavior for one printable value.
- **Dataset**: JSON containing taxpayer and pre-calculated return values.
- **Renderer**: Proprietary code that combines the template, annotation, and dataset.
- **Authoring tool**: An application used to create or edit annotations.
- **Normalized box**: A rectangle whose coordinates are expressed as fractions of page width and height.
- **Draft field**: An annotation being edited that may not yet satisfy the final export requirements.

## 3. Scope

Version 1.0 supports:

- Multi-page PDF templates.
- Exact template identification and tax-year versioning.
- JSON Pointer references into deeply nested JSON datasets.
- Constant values when a field is not dataset-driven.
- Normalized, resolution-independent rectangles.
- Text, number, money, date, checkbox, percentage, masked-identifier, and multiline-text fields.
- Font, alignment, padding, color, rotation, and overflow instructions.
- Explicit behavior for missing, null, zero, and false values.
- Schema validation and additional semantic validation.
- Annotation authoring through imported PDF fields or manually selected rectangles.

Version 1.0 does not define:

- Tax calculation rules.
- OCR or AI-based field detection.
- IRS electronic filing.
- Digital signatures.
- A universal taxpayer-data model.
- Executable expressions inside annotations.
- Templates with nonzero PDF page rotation.

## 4. Separation of responsibilities

### 4.1 Dataset

The dataset owns taxpayer values and pre-calculated return values. It MUST NOT contain PDF coordinates, font settings, or renderer-specific objects.

### 4.2 Template

The template owns the static visual form. It MUST NOT contain taxpayer-specific values supplied by the annotation system.

### 4.3 Annotation

The annotation owns data references, rectangles, formatting, styles, and missing-value behavior. It MUST NOT contain tax-calculation logic.

### 4.4 Renderer

The renderer owns JSON Pointer resolution, value validation, formatting, coordinate conversion, text measurement, PDF drawing, and error reporting.

## 5. Annotation document

An exported annotation document has the following top-level structure:

```json
{
  "annotationVersion": "1.0",
  "form": {},
  "dataContract": {},
  "coordinateSystem": {},
  "defaults": {},
  "fields": []
}
```

All top-level properties are required.

### 5.1 `annotationVersion`

`annotationVersion` identifies the version of this specification, not the tax year.

```json
{
  "annotationVersion": "1.0"
}
```

The value MUST use `major.minor` numeric notation.

### 5.2 `form`

`form` identifies the exact PDF template expected by the annotation.

```json
{
  "form": {
    "formId": "IRS-1040",
    "title": "U.S. Individual Income Tax Return",
    "taxYear": 2025,
    "revision": "2025-final",
    "templateFile": "f1040-2025.pdf",
    "templateSha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "pages": [
      {
        "pageNumber": 1,
        "widthPt": 612,
        "heightPt": 792
      },
      {
        "pageNumber": 2,
        "widthPt": 612,
        "heightPt": 792
      }
    ]
  }
}
```

| Property | Type | Required | Meaning |
|---|---:|:---:|---|
| `formId` | string | Yes | Stable identifier for the form family. |
| `title` | string | Yes | Human-readable form title. |
| `taxYear` | integer | Yes | Tax year represented by the form. |
| `revision` | string | Yes | Exact form revision label used by the project. |
| `templateFile` | string | Yes | Expected PDF filename. |
| `templateSha256` | string | Recommended | SHA-256 checksum of the exact PDF bytes. |
| `pages` | array | Yes | Expected page number and dimensions in PDF points. |

A final production annotation SHOULD contain `templateSha256`. A renderer SHOULD stop with a template-mismatch error when a supplied PDF checksum differs from the annotation.

PDF points use 72 points per inch. A typical U.S. Letter page is `612 × 792` points.

### 5.3 `dataContract`

`dataContract` identifies the dataset structure expected by the annotation.

```json
{
  "dataContract": {
    "id": "com.example.taxpayer-return",
    "version": "1.0"
  }
}
```

Providers MAY produce this structure directly or use an adapter to convert proprietary data into it. The renderer MUST verify the declared contract identifier and version when the dataset supplies them.

### 5.4 `coordinateSystem`

Version 1.0 uses one coordinate system:

```json
{
  "coordinateSystem": {
    "unit": "normalized",
    "origin": "top-left",
    "pageNumbering": "one-based"
  }
}
```

- Coordinates are normalized to the inclusive range `0` through `1`.
- `(0, 0)` is the top-left of the visible page.
- The x-axis increases to the right.
- The y-axis increases downward.
- `x` and `y` identify a rectangle's top-left corner.
- Page numbering begins at `1`.

### 5.5 `defaults`

`defaults` defines style and behavior inherited by fields that do not override them.

```json
{
  "defaults": {
    "style": {
      "fontFamily": "Helvetica",
      "fontSizePt": 9,
      "minimumFontSizePt": 6,
      "horizontalAlign": "left",
      "verticalAlign": "middle",
      "paddingPt": 1,
      "color": "#000000",
      "overflow": "shrink",
      "rotationDegrees": 0,
      "lineHeight": 1.2
    },
    "behavior": {
      "onMissing": "warn",
      "onNull": "blank",
      "printZero": false
    }
  }
}
```

Field-level `style` and `behavior` properties override defaults property by property.

### 5.6 `fields`

`fields` is an ordered array of final field annotations. Every exported field MUST be complete and valid.

Field order defines drawing order. Later fields are drawn over earlier fields when rectangles overlap.

## 6. Field annotation

A field annotation has this structure:

```json
{
  "id": "form1040.line1a.wages",
  "label": "Line 1a wages",
  "description": "Total wages reported for the taxpayer.",
  "page": 1,
  "source": {
    "kind": "json-pointer",
    "pointer": "/returns/federal/2025/income/wages"
  },
  "box": {
    "x": 0.784314,
    "y": 0.555556,
    "width": 0.147059,
    "height": 0.020202
  },
  "format": {
    "type": "money",
    "decimalPlaces": 0,
    "useThousandsSeparator": true,
    "showCurrencySymbol": false,
    "negativeStyle": "minus"
  },
  "style": {
    "horizontalAlign": "right"
  },
  "behavior": {
    "onMissing": "warn",
    "onNull": "blank",
    "printZero": false
  }
}
```

| Property | Type | Required | Meaning |
|---|---:|:---:|---|
| `id` | string | Yes | Unique, stable semantic field identifier. |
| `label` | string | Yes | Human-readable field name. |
| `description` | string | No | Additional intent or context. |
| `page` | integer | Yes | One-based target page number. |
| `source` | object | Yes | Dataset pointer or constant value. |
| `box` | object | Yes | Normalized printable rectangle. |
| `format` | object | Yes | Value type and formatting rules. |
| `style` | object | No | Field-specific visual overrides. |
| `behavior` | object | No | Field-specific missing-value overrides. |

Field IDs MUST be unique within an annotation document. IDs SHOULD describe tax-form semantics instead of PDF-library field names.

## 7. Value sources

### 7.1 JSON Pointer source

The primary source type is an RFC 6901 JSON Pointer.

```json
{
  "source": {
    "kind": "json-pointer",
    "pointer": "/returns/federal/2025/income/wages"
  }
}
```

Given:

```json
{
  "returns": {
    "federal": {
      "2025": {
        "income": {
          "wages": 60000
        }
      }
    }
  }
}
```

the pointer resolves to the JSON number `60000`.

Rules:

- A field pointer MUST begin with `/`.
- Object property names are case-sensitive.
- Array elements use zero-based numeric indexes, such as `/dependents/0/name/first`.
- `~1` represents `/` inside a property name.
- `~0` represents `~` inside a property name.
- A missing path is different from a path resolving to `null`.
- Renderers MUST NOT evaluate pointers as executable code.

### 7.2 Constant source

A constant source prints a literal primitive value.

```json
{
  "source": {
    "kind": "constant",
    "value": "X"
  }
}
```

Constants MAY be strings, numbers, booleans, or `null`. Taxpayer-specific values SHOULD use JSON Pointer sources.

### 7.3 Expressions

Version 1.0 does not support expressions, aggregation, or arbitrary functions. Values such as total wages or total tax MUST be calculated before rendering and exposed through the dataset.

## 8. Normalized boxes

A normalized box defines the entire printable region available to the renderer.

```json
{
  "box": {
    "x": 0.7,
    "y": 0.4,
    "width": 0.2,
    "height": 0.03
  }
}
```

Each box MUST satisfy:

```text
0 <= x <= 1
0 <= y <= 1
0 < width <= 1
0 < height <= 1
x + width <= 1
y + height <= 1
```

Coordinates SHOULD retain four to six decimal places. Authors SHOULD select the printable interior of a form field rather than including its label or border.

### 8.1 Capturing a box from a browser

Given a selection and displayed page measured in CSS pixels:

```text
x      = (selectionLeft - pageLeft) / pageWidth
y      = (selectionTop - pageTop) / pageHeight
width  = selectionWidth / pageWidth
height = selectionHeight / pageHeight
```

Browser scrolling and page placement do not affect the result because the page offset is removed before normalization.

### 8.2 Displaying a normalized box

```text
displayLeft   = x * displayedPageWidth
displayTop    = y * displayedPageHeight
displayWidth  = width * displayedPageWidth
displayHeight = height * displayedPageHeight
```

These values are relative to the displayed page element.

### 8.3 Converting to PDF coordinates

For a PDF page with width `W` and height `H` using a bottom-left origin:

```text
pdfX      = x * W
pdfY      = (1 - y - height) * H
pdfWidth  = width * W
pdfHeight = height * H
```

The height is subtracted when calculating `pdfY` because annotation `y` identifies the rectangle's top edge while PDF rectangle placement identifies its bottom edge.

The resulting rectangle describes available space. The renderer MUST calculate the final text baseline using font metrics, padding, and vertical alignment.

## 9. Field formats

`format.type` determines the expected JSON value and its display conversion. Renderers MUST NOT silently coerce incompatible source values.

### 9.1 Text

Expected value: JSON string.

```json
{
  "format": {
    "type": "text",
    "trim": true,
    "case": "preserve",
    "prefix": "",
    "suffix": ""
  }
}
```

`case` supports `preserve`, `uppercase`, `lowercase`, and `title-case`.

### 9.2 Number

Expected value: JSON number.

```json
{
  "format": {
    "type": "number",
    "decimalPlaces": 2,
    "useThousandsSeparator": true,
    "negativeStyle": "minus"
  }
}
```

`negativeStyle` supports `minus` and `parentheses`.

### 9.3 Money

Expected value: JSON number.

```json
{
  "format": {
    "type": "money",
    "decimalPlaces": 0,
    "useThousandsSeparator": true,
    "showCurrencySymbol": false,
    "currencySymbol": "$",
    "negativeStyle": "minus"
  }
}
```

Tax-form money fields commonly omit the currency symbol, so `showCurrencySymbol` defaults to `false`.

### 9.4 Date

Expected value: an ISO `YYYY-MM-DD` JSON string.

```json
{
  "format": {
    "type": "date",
    "inputPattern": "YYYY-MM-DD",
    "outputPattern": "MM/DD/YYYY"
  }
}
```

Version 1.0 supports date-only values. Invalid calendar dates are errors.

### 9.5 Checkbox

Expected value: JSON boolean.

```json
{
  "format": {
    "type": "checkbox",
    "trueMark": "X",
    "falseMark": ""
  }
}
```

The renderer prints `trueMark` for `true` and `falseMark` for `false`. It MUST NOT print the words `true` or `false` unless explicitly supplied as marks.

### 9.6 Percentage

Expected value: JSON number.

```json
{
  "format": {
    "type": "percentage",
    "inputScale": "fraction",
    "decimalPlaces": 1,
    "showPercentSymbol": true
  }
}
```

`inputScale` supports:

- `fraction`: `0.125` renders as `12.5%`.
- `percent`: `12.5` renders as `12.5%`.

### 9.7 Masked identifier

Expected value: JSON string.

```json
{
  "format": {
    "type": "masked-identifier",
    "mask": "###-##-####",
    "placeholder": "#"
  }
}
```

Given `123456789`, this example renders `123-45-6789`. In this context, a mask formats an identifier; it does not automatically redact it.

### 9.8 Multiline text

Expected value: JSON string.

```json
{
  "format": {
    "type": "multiline-text",
    "preserveNewlines": true,
    "maximumLines": 2
  }
}
```

Multiline fields use the field's `lineHeight`, vertical alignment, and overflow policy.

## 10. Field style

```json
{
  "style": {
    "fontFamily": "Helvetica",
    "fontSizePt": 9,
    "minimumFontSizePt": 6,
    "horizontalAlign": "right",
    "verticalAlign": "middle",
    "paddingPt": 1,
    "color": "#000000",
    "overflow": "shrink",
    "rotationDegrees": 0,
    "lineHeight": 1.2
  }
}
```

| Property | Allowed values or constraint |
|---|---|
| `fontFamily` | Nonempty string naming an available or embeddable font. |
| `fontSizePt` | Number greater than zero. |
| `minimumFontSizePt` | Number greater than zero and not greater than `fontSizePt`. |
| `horizontalAlign` | `left`, `center`, or `right`. |
| `verticalAlign` | `top`, `middle`, or `bottom`. |
| `paddingPt` | Number greater than or equal to zero. |
| `color` | Six-digit hexadecimal RGB color. |
| `overflow` | `shrink`, `clip`, `wrap`, or `error`. |
| `rotationDegrees` | Number from `-360` through `360`. |
| `lineHeight` | Positive multiplier applied to font size. |

Overflow behavior:

- `shrink`: Reduce font size no lower than `minimumFontSizePt`; error if the value still does not fit.
- `clip`: Draw only the portion inside the box.
- `wrap`: Wrap text within the box; intended for multiline text.
- `error`: Stop rendering the field when it does not fit.

## 11. Missing-value behavior

```json
{
  "behavior": {
    "onMissing": "warn",
    "onNull": "blank",
    "printZero": false
  }
}
```

`onMissing` and `onNull` support:

- `blank`: Draw nothing and continue.
- `warn`: Draw nothing, record a warning, and continue.
- `error`: Record an error and do not produce a successful output.

The renderer MUST distinguish:

- A missing JSON Pointer path.
- A path resolving to `null`.
- The numeric value `0`.
- The boolean value `false`.
- An empty string.

`printZero` applies only to numeric zero. It MUST NOT change checkbox behavior for `false`.

## 12. Rendering algorithm

A conforming renderer performs these steps in order:

1. Parse the annotation JSON.
2. Validate it against the annotation JSON Schema.
3. Run semantic validation not expressible in JSON Schema.
4. Load the supplied PDF and verify template metadata and checksum.
5. Verify the expected data-contract identifier and version when available.
6. Process fields in array order.
7. Select the one-based target page.
8. Resolve the field source.
9. Apply missing or null behavior.
10. Validate the resolved JSON type against `format.type`.
11. Apply field formatting.
12. Apply inherited and field-specific style and behavior.
13. Skip numeric zero when `printZero` is `false`.
14. Convert the normalized box to PDF coordinates.
15. Measure and fit the formatted value according to the overflow policy.
16. Draw the value within the box.
17. Collect field-level warnings and errors.
18. Save output only when no fatal errors remain.

The renderer SHOULD return structured diagnostics containing field ID, severity, code, and human-readable message.

## 13. Validation

### 13.1 JSON Schema validation

The accompanying `annotation.schema.json` defines required properties, primitive types, enumerations, and numeric ranges using JSON Schema 2020-12.

### 13.2 Semantic validation

The application MUST additionally verify:

- Field IDs are unique.
- Referenced pages exist.
- `x + width <= 1`.
- `y + height <= 1`.
- `minimumFontSizePt <= fontSizePt` after inheritance.
- Format-specific required properties are present.
- Final fields have complete source mappings.
- The template checksum matches when supplied.
- JSON Pointers resolve when sample data is available.
- Resolved values have the expected JSON type.

Schema or semantic errors prevent final export. Unresolved sample-data pointers MAY be warnings during editing but MUST follow field behavior during rendering.

## 14. Draft authoring model

The exported specification contains only complete field annotations. An authoring tool MAY maintain additional editor-only state, including:

- Draft identifier.
- Import origin: `acroform`, `manual`, or `imported-json`.
- Original PDF field name.
- Mapping status: `unmapped`, `mapped`, or `invalid`.
- Current selection, page, zoom, and editing mode.
- Validation errors and unsaved-change status.
- Sample data used for preview.

Editor-only state MUST NOT be included in the final annotation unless the specification explicitly defines the property.

An imported PDF field may initially have a page and box but no semantic ID or source. The authoring tool MUST require human verification and a complete mapping before export.

## 15. Annotation authoring workflow

The recommended workflow is:

1. Load the exact PDF template.
2. Record page dimensions and calculate a SHA-256 checksum.
3. Import existing AcroForm widgets when available.
4. Convert imported PDF rectangles into normalized top-left rectangles.
5. Use manual click-and-drag selection when a field is absent or inaccurate.
6. Assign a semantic ID, label, JSON Pointer, format, style, and behavior.
7. Load fictional sample data.
8. Preview and adjust every field.
9. Validate the complete annotation.
10. Export JSON and generate a sample completed PDF.

Automatic field discovery is an authoring convenience. It does not alter the exported specification and does not remove the requirement for human review.

## 16. Versioning and compatibility

- Annotation documents use `major.minor` versions.
- A major version change indicates an incompatible contract change.
- A minor version change adds backward-compatible capabilities.
- Renderers MUST reject unsupported major versions.
- Renderers MAY accept newer minor versions only when all encountered properties and values are supported.
- Final annotation documents SHOULD reject unknown properties to detect mistakes early.
- Each tax-year or revised PDF template requires a separately versioned and verified annotation document.
- Previous annotation versions SHOULD be retained for prior-year and amended returns.

## 17. Security and privacy

- Annotation documents SHOULD contain layout and source paths, not real taxpayer values.
- Demonstrations and tests MUST use fictional data.
- Authoring and rendering tools SHOULD avoid logging resolved sensitive values.
- Template and data files SHOULD remain local for the assignment implementation.
- JSON Pointers MUST be treated as data, never as executable expressions.
- Imported filenames and JSON content MUST be validated before use.

## 18. Complete example

```json
{
  "annotationVersion": "1.0",
  "form": {
    "formId": "IRS-1040",
    "title": "U.S. Individual Income Tax Return",
    "taxYear": 2025,
    "revision": "2025-final",
    "templateFile": "f1040-2025.pdf",
    "templateSha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "pages": [
      {
        "pageNumber": 1,
        "widthPt": 612,
        "heightPt": 792
      },
      {
        "pageNumber": 2,
        "widthPt": 612,
        "heightPt": 792
      }
    ]
  },
  "dataContract": {
    "id": "com.example.taxpayer-return",
    "version": "1.0"
  },
  "coordinateSystem": {
    "unit": "normalized",
    "origin": "top-left",
    "pageNumbering": "one-based"
  },
  "defaults": {
    "style": {
      "fontFamily": "Helvetica",
      "fontSizePt": 9,
      "minimumFontSizePt": 6,
      "horizontalAlign": "left",
      "verticalAlign": "middle",
      "paddingPt": 1,
      "color": "#000000",
      "overflow": "shrink",
      "rotationDegrees": 0,
      "lineHeight": 1.2
    },
    "behavior": {
      "onMissing": "warn",
      "onNull": "blank",
      "printZero": false
    }
  },
  "fields": [
    {
      "id": "form1040.taxpayer.firstName",
      "label": "Taxpayer first name",
      "page": 1,
      "source": {
        "kind": "json-pointer",
        "pointer": "/returns/federal/2025/taxpayer/identity/legalName/first"
      },
      "box": {
        "x": 0.065,
        "y": 0.067,
        "width": 0.225,
        "height": 0.026
      },
      "format": {
        "type": "text",
        "trim": true,
        "case": "preserve"
      }
    },
    {
      "id": "form1040.filingStatus.single",
      "label": "Single filing status",
      "page": 1,
      "source": {
        "kind": "json-pointer",
        "pointer": "/returns/federal/2025/taxpayer/filingStatus/single"
      },
      "box": {
        "x": 0.065,
        "y": 0.186,
        "width": 0.018,
        "height": 0.018
      },
      "format": {
        "type": "checkbox",
        "trueMark": "X",
        "falseMark": ""
      },
      "style": {
        "horizontalAlign": "center",
        "verticalAlign": "middle",
        "paddingPt": 0
      }
    },
    {
      "id": "form1040.line1a.wages",
      "label": "Line 1a wages",
      "page": 1,
      "source": {
        "kind": "json-pointer",
        "pointer": "/returns/federal/2025/income/wages"
      },
      "box": {
        "x": 0.784314,
        "y": 0.555556,
        "width": 0.147059,
        "height": 0.020202
      },
      "format": {
        "type": "money",
        "decimalPlaces": 0,
        "useThousandsSeparator": true,
        "showCurrencySymbol": false,
        "negativeStyle": "minus"
      },
      "style": {
        "horizontalAlign": "right"
      }
    }
  ]
}
```

The coordinates and checksum in this example are illustrative. A final annotation MUST be measured and verified against the exact template included with the submission.

## 19. Conformance

An annotation document conforms to version 1.0 when it:

- Passes `annotation.schema.json` validation.
- Passes all semantic validation rules in this specification.
- Identifies an exact template version.
- Contains only complete field annotations.
- Uses the coordinate and source rules defined here.

A renderer conforms to version 1.0 when it:

- Implements the rendering algorithm and error behavior defined here.
- Produces values inside the annotated rectangles using the supplied template and dataset.
- Does not evaluate annotation content as executable code.
- Reports field-level warnings and errors in an actionable form.

## 20. References

- JSON Pointer, RFC 6901: <https://www.rfc-editor.org/rfc/rfc6901>
- JSON Schema 2020-12: <https://json-schema.org/draft/2020-12>
- IRS Modernized e-File overview: <https://www.irs.gov/e-file-providers/modernized-e-file-overview>
