import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTheme } from "@mui/material/styles";
import type { DependencyEdge, DependencyNode } from "@roborean/validation";
import { Box, Stack, Typography } from "@roborean/ui";

/**
 * Props for the dependency graph panel.
 */
export type DependencyGraphPanelProps = {
  /** Graph nodes from `@roborean/validation`. */
  nodes: DependencyNode[];

  /** Graph edges from `@roborean/validation`. */
  edges: DependencyEdge[];

  /**
   * Optional display labels for bit nodes keyed by bit id.
   */
  bitLabels?: Record<string, string>;

  /**
   * Called when the user clicks a graph node.
   *
   * @param node - Selected dependency node.
   */
  onNodeSelect?: (node: DependencyNode) => void;
};

/**
 * Pan and zoom state for the SVG viewport.
 */
type Viewport = {
  /** Horizontal pan in SVG units. */
  x: number;

  /** Vertical pan in SVG units. */
  y: number;

  /** Zoom multiplier (`1` fits the layout). */
  scale: number;
};

/**
 * Active pointer drag used for panning.
 */
type DragState = {
  /** Pointer id captured for the drag. */
  pointerId: number;

  /** Last client X used to compute a delta. */
  lastClientX: number;

  /** Last client Y used to compute a delta. */
  lastClientY: number;

  /** Whether the pointer moved far enough to count as a pan. */
  moved: boolean;
};

/** Horizontal inset so circles and centered labels stay inside the SVG. */
const LAYOUT_PAD_X = 44;

/** Top inset for node radius. */
const LAYOUT_PAD_TOP = 18;

/** Space below the last node for labels. */
const LAYOUT_PAD_BOTTOM = 36;

/** Horizontal span between the leftmost and rightmost node centers. */
const LAYOUT_INNER_WIDTH = 252;

/** Vertical distance between kind rows. */
const LAYOUT_ROW_GAP = 68;

/** Minimum zoom multiplier. */
const MIN_SCALE = 0.35;

/** Maximum zoom multiplier. */
const MAX_SCALE = 4;

/** Multiplicative zoom step applied per wheel notch. */
const ZOOM_STEP = 1.1;

/** Pointer movement (CSS px) before a click becomes a pan. */
const PAN_THRESHOLD_PX = 3;

/** Default viewport with no pan and unit zoom. */
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

/**
 * Graph layout result with positions and SVG dimensions.
 */
type GraphLayout = {
  /** Position map keyed by node kind and id/key. */
  positions: Map<string, { x: number; y: number }>;

  /** SVG viewBox width. */
  width: number;

  /** SVG viewBox height. */
  height: number;
};

/**
 * Stable label for a dependency node.
 *
 * @param node - Graph node.
 * @param bitLabels - Optional bit id → display label map.
 * @returns Display label.
 */
function nodeLabel(
  node: DependencyNode,
  bitLabels?: Record<string, string>,
): string {
  if (node.kind === "variable") {
    return node.key;
  }

  if (node.kind === "bit") {
    return bitLabels?.[node.id] ?? node.id;
  }

  return node.id;
}

/**
 * Clamp a zoom multiplier into the allowed range.
 *
 * @param scale - Requested zoom.
 * @returns Clamped zoom.
 */
function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Map node identity to a layout position inside padded bounds.
 *
 * @param nodes - All graph nodes.
 * @returns Positions plus SVG width/height that fit every node and label.
 */
function layoutNodes(nodes: DependencyNode[]): GraphLayout {
  const rows: Record<DependencyNode["kind"], DependencyNode[]> = {
    variable: [],
    bit: [],
    document: [],
  };
  for (const node of nodes) {
    rows[node.kind].push(node);
  }

  // Keep only kinds that have nodes so empty rows do not inflate height.
  const activeKinds = (Object.keys(rows) as DependencyNode["kind"][]).filter(
    (kind) => rows[kind].length > 0,
  );

  const positions = new Map<string, { x: number; y: number }>();
  const width = LAYOUT_PAD_X * 2 + LAYOUT_INNER_WIDTH;
  let lastY = LAYOUT_PAD_TOP;

  activeKinds.forEach((kind, rowIndex) => {
    const row = rows[kind];
    const y = LAYOUT_PAD_TOP + rowIndex * LAYOUT_ROW_GAP;
    lastY = y;

    // Spread nodes across the inner width; a single node sits centered.
    const step = row.length > 1 ? LAYOUT_INNER_WIDTH / (row.length - 1) : 0;
    row.forEach((node, index) => {
      const key =
        node.kind === "variable"
          ? `variable:${node.key}`
          : `${node.kind}:${node.id}`;
      positions.set(key, {
        x:
          row.length === 1
            ? LAYOUT_PAD_X + LAYOUT_INNER_WIDTH / 2
            : LAYOUT_PAD_X + index * step,
        y,
      });
    });
  });

  const height =
    activeKinds.length === 0
      ? LAYOUT_PAD_TOP + LAYOUT_PAD_BOTTOM
      : lastY + LAYOUT_PAD_BOTTOM;

  return { positions, width, height };
}

/**
 * Stable key for a node instance.
 *
 * @param node - Dependency node.
 * @returns Layout map key.
 */
function nodeKey(node: DependencyNode): string {
  if (node.kind === "variable") {
    return `variable:${node.key}`;
  }
  return `${node.kind}:${node.id}`;
}

/**
 * Node fill color for the active palette mode.
 *
 * @param kind - Dependency node kind.
 * @param isDark - Whether the theme uses dark mode.
 * @returns SVG fill color for the node circle.
 */
function nodeFillColor(kind: DependencyNode["kind"], isDark: boolean): string {
  if (isDark) {
    if (kind === "variable") {
      return "#1e3a5f";
    }
    if (kind === "bit") {
      return "#14532d";
    }
    return "#713f12";
  }

  if (kind === "variable") {
    return "#dbeafe";
  }
  if (kind === "bit") {
    return "#dcfce7";
  }
  return "#fef3c7";
}

/**
 * SVG dependency graph with click-to-select, pan, and zoom.
 *
 * @param props - Graph data and optional selection handler.
 * @returns Graph visualization.
 */
export function DependencyGraphPanel({
  nodes,
  edges,
  bitLabels,
  onNodeSelect,
}: DependencyGraphPanelProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Graph chrome colors follow the active MUI palette.
  const labelColor = theme.palette.text.primary;
  const edgeColor = theme.palette.text.secondary;
  const nodeStrokeColor = theme.palette.text.secondary;

  const { positions, width, height } = layoutNodes(nodes);

  // SVG element used to map pointer coordinates into viewBox space.
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Pan/zoom transform applied to the graph content group.
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);

  // In-progress pointer drag for panning (mutable; not rendered).
  const dragRef = useRef<DragState | null>(null);

  // Suppress the click that follows a pan gesture.
  const suppressClickRef = useRef(false);

  // Reset the camera when the laid-out graph size changes.
  useEffect(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, [width, height]);

  // Attach a non-passive wheel listener so zoom can block page scroll.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    /**
     * Zoom toward the pointer on mouse wheel.
     *
     * @param event - Native wheel event from the SVG.
     */
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      // Map the cursor into viewBox space for zoom-to-cursor.
      const pointerX = ((event.clientX - rect.left) / rect.width) * width;
      const pointerY = ((event.clientY - rect.top) / rect.height) * height;

      setViewport((current) => {
        // Zoom in for wheel-up / trackpad pinch-out style deltas.
        const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
        const nextScale = clampScale(current.scale * factor);
        if (nextScale === current.scale) {
          return current;
        }

        // Keep the content point under the cursor fixed while scaling.
        const contentX = (pointerX - current.x) / current.scale;
        const contentY = (pointerY - current.y) / current.scale;
        return {
          x: pointerX - contentX * nextScale,
          y: pointerY - contentY * nextScale,
          scale: nextScale,
        };
      });
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", onWheel);
    };
  }, [width, height]);

  /**
   * Begin a pan drag on primary-button press.
   *
   * @param event - Pointer down on the SVG.
   */
  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }

    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  /**
   * Pan while the primary pointer is dragged.
   *
   * @param event - Pointer move on the SVG.
   */
  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    // Convert CSS-pixel deltas into viewBox units.
    const dx = ((event.clientX - drag.lastClientX) / rect.width) * width;
    const dy = ((event.clientY - drag.lastClientY) / rect.height) * height;
    const distance = Math.hypot(
      event.clientX - drag.lastClientX,
      event.clientY - drag.lastClientY,
    );

    if (distance >= PAN_THRESHOLD_PX || drag.moved) {
      drag.moved = true;
      setViewport((current) => ({
        ...current,
        x: current.x + dx,
        y: current.y + dy,
      }));
    }

    drag.lastClientX = event.clientX;
    drag.lastClientY = event.clientY;
  };

  /**
   * End an active pan drag.
   *
   * @param event - Pointer up or cancel on the SVG.
   */
  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (drag.moved) {
      suppressClickRef.current = true;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  /**
   * Reset pan and zoom on double-click of the canvas background.
   */
  const handleDoubleClick = () => {
    setViewport(DEFAULT_VIEWPORT);
  };

  /**
   * Select a node unless the gesture was a pan.
   *
   * @param node - Clicked dependency node.
   */
  const handleNodeClick = (node: DependencyNode) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onNodeSelect?.(node);
  };

  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        Dependencies ({nodes.length} nodes, {edges.length} edges)
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Scroll to zoom · drag to pan · double-click to reset
      </Typography>
      <Box
        sx={{
          width: "100%",
          maxWidth: width,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          touchAction: "none",
          cursor: "grab",
          "&:active": { cursor: "grabbing" },
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          role="img"
          aria-label="Dependency graph"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        >
          <g
            transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}
          >
            {edges.map((edge, index) => {
              const from = positions.get(nodeKey(edge.from));
              const to = positions.get(nodeKey(edge.to));
              if (!from || !to) {
                return null;
              }
              return (
                <line
                  key={`edge-${index}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={edgeColor}
                  strokeWidth={1}
                  markerEnd="url(#arrow)"
                />
              );
            })}
            <defs>
              <marker
                id="arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill={edgeColor} />
              </marker>
            </defs>
            {nodes.map((node) => {
              const pos = positions.get(nodeKey(node));
              if (!pos) {
                return null;
              }
              const fill = nodeFillColor(node.kind, isDark);
              return (
                <g
                  key={nodeKey(node)}
                  style={{
                    cursor: onNodeSelect ? "pointer" : "inherit",
                  }}
                  onClick={() => handleNodeClick(node)}
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={14}
                    fill={fill}
                    stroke={nodeStrokeColor}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 28}
                    textAnchor="middle"
                    fontSize={9}
                    fill={labelColor}
                  >
                    {nodeLabel(node, bitLabels).slice(0, 12)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </Box>
      {edges.length > 40 ? (
        <Typography variant="caption" color="text.secondary">
          Showing graph layout; see diagnostics for full edge list.
        </Typography>
      ) : null}
    </Stack>
  );
}
