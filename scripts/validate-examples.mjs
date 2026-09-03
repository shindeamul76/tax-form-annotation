import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = join(scriptDirectory, '..')
const schemaPath = join(projectDirectory, 'schemas', 'annotation.schema.json')
const examplesDirectory = join(projectDirectory, 'examples', 'annotations')

function readJsonFile(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to parse ${relative(projectDirectory, filePath)}: ${reason}`, {
      cause: error,
    })
  }
}

function findAnnotationFiles(directoryPath) {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name)

    if (entry.isDirectory()) {
      return findAnnotationFiles(entryPath)
    }

    return entry.isFile() && entry.name.endsWith('.annotation.json')
      ? [entryPath]
      : []
  })
}

function formatValidationErrors(validationErrors) {
  return validationErrors
    .map((error) => {
      const valuePath = error.instancePath || '/'
      return `  ${valuePath}: ${error.message ?? 'is invalid'}`
    })
    .join('\n')
}

function validateExamples() {
  const annotationSchema = readJsonFile(schemaPath)
  const annotationFiles = findAnnotationFiles(examplesDirectory)

  if (annotationFiles.length === 0) {
    throw new Error('No *.annotation.json files were found in examples/annotations.')
  }

  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    allowUnionTypes: true,
  })
  const validateAnnotation = ajv.compile(annotationSchema)
  const invalidExamples = []

  for (const annotationPath of annotationFiles) {
    const annotationDocument = readJsonFile(annotationPath)

    if (!validateAnnotation(annotationDocument)) {
      invalidExamples.push(
        `${relative(projectDirectory, annotationPath)}\n${formatValidationErrors(validateAnnotation.errors ?? [])}`,
      )
    }
  }

  if (invalidExamples.length > 0) {
    throw new Error(`Annotation validation failed:\n\n${invalidExamples.join('\n\n')}`)
  }

  console.log(`Validated ${annotationFiles.length} annotation example(s).`)
}

try {
  validateExamples()
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error)
  console.error(reason)
  process.exitCode = 1
}
