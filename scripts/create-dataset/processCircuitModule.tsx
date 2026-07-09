import { writeFile } from "node:fs/promises"
import path from "node:path"
import { RootCircuit, unrouteCircuitJson } from "@tscircuit/core"
import { getSimpleRouteJsonFromCircuitJson } from "tscircuit"

const EXTRA_SOLVED_ROUTING_ELEMENT_TYPES = new Set(["pcb_via"])

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
  circuit.schematicDisabled = true
  circuit.add(<Circuit />)

  const outputPath = path.join(
    datasetDirectory,
    `${baseName}.simple-route.json`,
  )

  console.log("[Start]", baseName)

  try {
    await circuit.renderUntilSettled()
    const inputProblemCircuitJson = unrouteCircuitJson(
      circuit.getCircuitJson(),
    ).filter((el: any) => !EXTRA_SOLVED_ROUTING_ELEMENT_TYPES.has(el.type))
    const { simpleRouteJson } = getSimpleRouteJsonFromCircuitJson({
      circuitJson: inputProblemCircuitJson,
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
