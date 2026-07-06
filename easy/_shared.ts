import { createElement, type ReactElement } from "react"

export type DetectedComponentKind = "bga" | "qfp" | "qfp_thermalpad" | "soic"

interface TopologyPairProps {
  name: string
  topKind: DetectedComponentKind
  bottomKind: DetectedComponentKind
}

interface DetectedComponentProps {
  kind: DetectedComponentKind
  name: string
  layer: "top" | "bottom"
}

interface PadProps {
  pinNumber: number
  x: number
  y: number
  width: number
  height: number
}

const PAIR_COMPONENT_PCB_X = 0
const PAIR_COMPONENT_PCB_Y = 0
const BOTTOM_COMPONENT_PCB_OFFSET = 0.5
const PIN_COUNT_BY_KIND: Record<DetectedComponentKind, number> = {
  bga: 16,
  qfp: 12,
  qfp_thermalpad: 13,
  soic: 8,
}

const h = createElement

const RectPad = ({ pinNumber, x, y, width, height }: PadProps): ReactElement =>
  h("smtpad", {
    name: `pin${pinNumber}`,
    portHints: [`pin${pinNumber}`],
    pcbX: x,
    pcbY: y,
    layer: "top",
    shape: "rect",
    width,
    height,
  })

const BgaFootprint = (): ReactElement =>
  h(
    "footprint",
    null,
    Array.from({ length: 4 }).flatMap((_, row) =>
      Array.from({ length: 4 }).map((_, col) =>
        h(RectPad, {
          key: `bga_${row}_${col}`,
          pinNumber: row * 4 + col + 1,
          x: (col - 1.5) * 0.7,
          y: (row - 1.5) * 0.7,
          width: 0.36,
          height: 0.36,
        }),
      ),
    ),
  )

const QfpFootprint = ({ thermalPad }: { thermalPad: boolean }): ReactElement => {
  const sidePads = [-0.8, 0, 0.8]

  return h(
    "footprint",
    null,
    sidePads.map((x, index) =>
      h(RectPad, {
        key: `top_${index}`,
        pinNumber: index + 1,
        x,
        y: 1.6,
        width: 0.28,
        height: 0.8,
      }),
    ),
    sidePads.map((x, index) =>
      h(RectPad, {
        key: `bottom_${index}`,
        pinNumber: index + 4,
        x,
        y: -1.6,
        width: 0.28,
        height: 0.8,
      }),
    ),
    sidePads.map((y, index) =>
      h(RectPad, {
        key: `left_${index}`,
        pinNumber: index + 7,
        x: -1.6,
        y,
        width: 0.8,
        height: 0.28,
      }),
    ),
    sidePads.map((y, index) =>
      h(RectPad, {
        key: `right_${index}`,
        pinNumber: index + 10,
        x: 1.6,
        y,
        width: 0.8,
        height: 0.28,
      }),
    ),
    thermalPad &&
      h(RectPad, {
        pinNumber: 13,
        x: 0,
        y: 0,
        width: 1.2,
        height: 1.2,
      }),
  )
}

const SoicFootprint = (): ReactElement => {
  const rowPads = [-1.5, -0.5, 0.5, 1.5]

  return h(
    "footprint",
    null,
    rowPads.map((y, index) =>
      h(RectPad, {
        key: `left_${index}`,
        pinNumber: index + 1,
        x: -1.4,
        y,
        width: 0.55,
        height: 0.28,
      }),
    ),
    rowPads.map((y, index) =>
      h(RectPad, {
        key: `right_${index}`,
        pinNumber: index + 5,
        x: 1.4,
        y,
        width: 0.55,
        height: 0.28,
      }),
    ),
  )
}

const DetectedComponent = ({
  kind,
  name,
  layer,
}: DetectedComponentProps): ReactElement => {
  const footprint =
    kind === "bga"
      ? h(BgaFootprint)
      : kind === "qfp"
        ? h(QfpFootprint, { thermalPad: false })
        : kind === "qfp_thermalpad"
          ? h(QfpFootprint, { thermalPad: true })
          : h(SoicFootprint)

  return h("chip", {
    name,
    pcbX:
      layer === "bottom"
        ? PAIR_COMPONENT_PCB_X + BOTTOM_COMPONENT_PCB_OFFSET
        : PAIR_COMPONENT_PCB_X,
    pcbY:
      layer === "bottom"
        ? PAIR_COMPONENT_PCB_Y + BOTTOM_COMPONENT_PCB_OFFSET
        : PAIR_COMPONENT_PCB_Y,
    layer,
    footprint,
    noSchematicRepresentation: true,
  })
}

export const TopologyPair = ({
  name,
  topKind,
  bottomKind,
}: TopologyPairProps): ReactElement => {
  const connectedPinCount = Math.min(
    PIN_COUNT_BY_KIND[topKind],
    PIN_COUNT_BY_KIND[bottomKind],
  )

  return h(
    "board",
    {
      title: name,
      width: "10mm",
      height: "10mm",
      autorouterVersion: "v6",
    },
    h(DetectedComponent, {
      kind: topKind,
      name: `${name}_top`,
      layer: "top",
    }),
    h(DetectedComponent, {
      kind: bottomKind,
      name: `${name}_bottom`,
      layer: "bottom",
    }),
    Array.from({ length: connectedPinCount }).map((_, index) => {
      const pinName = `pin${index + 1}`

      return h("trace", {
        key: `trace_${pinName}`,
        from: `.${name}_top > .${pinName}`,
        to: `.${name}_bottom > .${pinName}`,
      })
    }),
  )
}
