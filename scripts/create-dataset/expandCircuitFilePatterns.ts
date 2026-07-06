import { readdir } from "node:fs/promises"
import path from "node:path"

const hasGlobStar = (pattern: string): boolean => pattern.includes("**")

const isWildcardPattern = (pattern: string): boolean => pattern.includes("*")

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const segmentPatternToRegExp = (segmentPattern: string): RegExp =>
  new RegExp(`^${segmentPattern.split("*").map(escapeRegExp).join(".*")}$`)

const expandSingleLevelPattern = async (
  filePattern: string,
): Promise<string[]> => {
  const directory = path.dirname(filePattern)
  const basenamePattern = path.basename(filePattern)
  const basenameRegExp = segmentPatternToRegExp(basenamePattern)
  const entries = await readdir(directory, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && basenameRegExp.test(entry.name))
    .map((entry) => path.join(directory, entry.name))
}

/**
 * Expands tscircuit config file patterns into concrete circuit file paths.
 */
export const expandCircuitFilePatterns = async (
  filePatterns: readonly string[],
): Promise<string[]> => {
  const expandedFilePaths = await Promise.all(
    filePatterns.map(async (filePattern) => {
      if (!isWildcardPattern(filePattern)) {
        return [filePattern]
      }

      if (hasGlobStar(filePattern)) {
        throw new Error(
          `Unsupported includeBoardFiles pattern "${filePattern}"; only single-directory * patterns are supported`,
        )
      }

      return expandSingleLevelPattern(filePattern)
    }),
  )

  return Array.from(new Set(expandedFilePaths.flat())).sort()
}
