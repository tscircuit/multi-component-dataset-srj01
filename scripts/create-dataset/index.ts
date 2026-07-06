import { readFile } from "node:fs/promises"
import { createDatasetFromConfig } from "./createDatasetFromConfig"

type TscircuitConfig = {
  readonly mainEntrypoint?: string
  readonly ignoredFiles?: string[]
  readonly includeBoardFiles?: string[]
}

const readTscircuitConfig = async (): Promise<TscircuitConfig> => {
  const tscircuitConfigText = await readFile("tscircuit.config.json", "utf8")
  return JSON.parse(tscircuitConfigText) as TscircuitConfig
}

/**
 * Generates Simple Route JSON files from the circuits listed in tscircuit.config.json.
 */
const main = async (): Promise<void> => {
  const tscircuitConfig = await readTscircuitConfig()
  const ignoredFiles = new Set(tscircuitConfig.ignoredFiles ?? [])
  const circuitFilePatterns = [
    ...(typeof tscircuitConfig.mainEntrypoint === "string"
      ? [tscircuitConfig.mainEntrypoint]
      : []),
    ...(tscircuitConfig.includeBoardFiles ?? []),
  ]

  await createDatasetFromConfig({
    circuitFilePatterns,
    ignoredFiles,
  })
}

void main()
