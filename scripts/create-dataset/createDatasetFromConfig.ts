import { mkdir, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { expandCircuitFilePatterns } from "./expandCircuitFilePatterns"
import { processCircuitModule } from "./processCircuitModule"

const getDatasetFiles = async (
  datasetDirectory: string,
): Promise<readonly string[]> =>
  (await readdir(datasetDirectory))
    .filter((file) => file.endsWith(".simple-route.json"))
    .sort()

const writeDatasetIndex = async (
  datasetDirectory: string,
  datasetFiles: readonly string[],
): Promise<void> => {
  const indexContent = datasetFiles
    .map((file) => {
      const name = file.replace(".simple-route.json", "")
      return `export { default as ${name.replace(/-/g, "_")} } from "./${file}" with { type: "json" }`
    })
    .join("\n")
  const declarationContent = [
    "export type SimpleRouteJson = unknown",
    ...datasetFiles.map((file) => {
      const name = file.replace(".simple-route.json", "").replace(/-/g, "_")
      return `export declare const ${name}: SimpleRouteJson`
    }),
    "",
  ].join("\n")

  await writeFile(
    path.join(datasetDirectory, "index.js"),
    indexContent.length > 0 ? `${indexContent}\n` : "",
  )
  await writeFile(path.join(datasetDirectory, "index.d.ts"), declarationContent)
}

/**
 * Processes circuit file patterns into generated Simple Route JSON files.
 */
export const createDatasetFromConfig = async (createDatasetRequest: {
  readonly circuitFilePatterns: readonly string[]
  readonly ignoredFiles: ReadonlySet<string>
}): Promise<void> => {
  const datasetDirectory = path.resolve("lib", "dataset")

  await mkdir(datasetDirectory, { recursive: true })

  const circuitFilePathList = (
    await expandCircuitFilePatterns(createDatasetRequest.circuitFilePatterns)
  ).filter(
    (circuitFilePath) =>
      circuitFilePath.endsWith(".tsx") &&
      !createDatasetRequest.ignoredFiles.has(circuitFilePath),
  )

  for (const circuitFilePath of circuitFilePathList) {
    const baseName = path.basename(circuitFilePath, ".circuit.tsx")
    const modulePath = path.resolve(circuitFilePath)

    await processCircuitModule({
      baseName,
      modulePath,
      datasetDirectory,
    })
  }

  const datasetFiles = await getDatasetFiles(datasetDirectory)
  await writeDatasetIndex(datasetDirectory, datasetFiles)
}
