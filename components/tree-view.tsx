"use client"

import { useMemo, useRef, useState, useCallback, useEffect } from "react"
import { useStore, useActions } from "@/lib/store"
import { computeTreeLayout, getPathToRoot } from "@/lib/tree-utils"
import { TreeNodeCard } from "@/components/tree-node-card"

const NODE_W = 220
const NODE_H = 140
const H_GAP = 40
const V_GAP = 80

export function TreeView() {
  const { state } = useStore()
  const { selectNode, branchFromNode, setView } = useActions()
  const { tree, selectedNodeId } = state

  const containerRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 60, y: 40 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })

  // Layout computation
  const layout = useMemo(() => {
    if (!tree) return new Map()
    return computeTreeLayout(tree.rootId, tree.nodes, NODE_W, NODE_H, H_GAP, V_GAP)
  }, [tree])

  // Highlighted path
  const highlightedPath = useMemo(() => {
    if (!tree || !selectedNodeId) return new Set<string>()
    return new Set(getPathToRoot(selectedNodeId, tree.nodes))
  }, [tree, selectedNodeId])

  // Canvas bounds
  const bounds = useMemo(() => {
    let maxX = 0
    let maxY = 0
    layout.forEach(({ x, y }) => {
      maxX = Math.max(maxX, x + NODE_W)
      maxY = Math.max(maxY, y + NODE_H)
    })
    return { width: maxX + 120, height: maxY + 120 }
  }, [layout])

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start panning if clicking on the background (not on cards/buttons)
    const target = e.target as HTMLElement
    const isBackground = 
      target === e.currentTarget || 
      target.tagName === "svg" ||
      target.tagName === "path" ||
      target.classList.contains("tree-canvas")
    
    if (isBackground) {
      setIsPanning(true)
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
      e.preventDefault()
    }
  }, [pan])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return
      e.preventDefault()
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      })
    },
    [isPanning]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    setZoom((z) => Math.max(0.2, Math.min(2, z + delta)))
  }, [])

  // Center tree on first load
  useEffect(() => {
    if (containerRef.current && layout.size > 0) {
      const rect = containerRef.current.getBoundingClientRect()
      const cx = (rect.width - bounds.width * zoom) / 2
      const cy = 40
      setPan({ x: Math.max(cx, 40), y: cy })
    }
    // Only on initial layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.size > 0])

  const handleBranchOrView = useCallback(
    (nodeId: string) => {
      selectNode(nodeId)
      setView("path")
    },
    [selectNode, setView]
  )

  if (!tree) return null

  // Build edges as SVG lines
  const edges: { from: { x: number; y: number }; to: { x: number; y: number }; isHighlighted: boolean }[] = []
  for (const [id, node] of Object.entries(tree.nodes)) {
    const fromPos = layout.get(id)
    if (!fromPos) continue
    for (const childId of node.childIds) {
      const toPos = layout.get(childId)
      if (!toPos) continue
      const isHighlighted = highlightedPath.has(id) && highlightedPath.has(childId)
      edges.push({
        from: { x: fromPos.x + NODE_W / 2, y: fromPos.y + NODE_H },
        to: { x: toPos.x + NODE_W / 2, y: toPos.y },
        isHighlighted,
      })
    }
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden cursor-grab active:cursor-grabbing tree-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ userSelect: isPanning ? "none" : "auto" }}
    >
      <div
        className="tree-canvas"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: bounds.width,
          height: bounds.height,
          position: "relative",
          pointerEvents: "none",
        }}
      >
        {/* SVG edges layer */}
        <svg
          className="absolute inset-0 tree-canvas"
          width={bounds.width}
          height={bounds.height}
          style={{ pointerEvents: "auto" }}
        >
          {edges.map((edge, i) => {
            const midY = (edge.from.y + edge.to.y) / 2
            return (
              <path
                key={i}
                d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x} ${midY}, ${edge.to.x} ${midY}, ${edge.to.x} ${edge.to.y}`}
                fill="none"
                className={
                  edge.isHighlighted
                    ? "stroke-primary"
                    : "stroke-border"
                }
                strokeWidth={edge.isHighlighted ? 2 : 1.5}
                strokeDasharray={edge.isHighlighted ? undefined : undefined}
              />
            )
          })}
        </svg>

        {/* Node cards */}
        {Array.from(layout.entries()).map(([id, pos]) => {
          const node = tree.nodes[id]
          if (!node) return null
          return (
            <div
              key={id}
              className="absolute"
              style={{ left: pos.x, top: pos.y, pointerEvents: "auto" }}
            >
              <TreeNodeCard
                node={node}
                isSelected={selectedNodeId === id}
                isOnPath={highlightedPath.has(id)}
                onClick={() => selectNode(id)}
                onBranch={() => handleBranchOrView(id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
