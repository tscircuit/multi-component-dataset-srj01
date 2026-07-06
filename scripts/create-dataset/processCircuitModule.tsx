import { writeFile } from "node:fs/promises"
import path from "node:path"
import { RootCircuit } from "@tscircuit/core"
import { getSimpleRouteJsonFromCircuitJson } from "tscircuit"

type CircuitComponent = () => React.ReactElement

type CircuitModule = {
  readonly default?: CircuitComponent
}

/**
 * Renders one circuit module and writes its Simple Route JSON dataset file.
 */
export const processCircuitModule = async (processCircuitRequest: {
  readonly baseName: string
  readonly modulePath: string
  readonly datasetDirectory: string
}): Promise<string | null> => {
  const { baseName, modulePath, datasetDirectory } = processCircuitRequest
  let circuitModule: CircuitModule

  try {
    circuitModule = await import(modulePath)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`[Ignored] ${baseName} due to import failure: ${errorMessage}`)
    return null
  }

  const Circuit = circuitModule.default
  if (!Circuit) {
    console.log(`[Ignored] ${baseName} because it has no default export`)
    return null
  }

  const circuit = new RootCircuit()
  process.env.TSCIRCUIT_DATASET_DISABLE_AUTOROUTER = "true"
  circuit.schematicDisabled = true
  circuit.add(<Circuit />)

  const outputPath = path.join(
    datasetDirectory,
    `${baseName}.simple-route.json`,
  )

  console.log("[Start]", baseName)

  try {
    await circuit.renderUntilSettled()
    const { simpleRouteJson } = getSimpleRouteJsonFromCircuitJson({
      circuitJson: circuit.getCircuitJson(),
    })
    await writeFile(outputPath, JSON.stringify(simpleRouteJson, null, 2))
    console.log("[Done]", baseName)
    return baseName
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`[Ignored] ${baseName} due to render failure: ${errorMessage}`)
    return null
  }
}
