import type { ChatNode, ConversationTree } from "./types"

// ── JSON Import ──

type ExportedMessage = { role: "Prompt" | "Response"; say: string }
type ExportedJson = {
  metadata: {
    title: string
    user: { name: string; email: string }
    dates: { created: string; updated: string; exported: string }
  }
  messages: ExportedMessage[]
}

/**
 * Parse ChatGPT Exporter JSON into our ConversationTree.
 * Pairs consecutive Prompt/Response messages into nodes.
 */
export function parseImportedJson(raw: unknown): ConversationTree {
  const json = raw as ExportedJson

  if (!json?.metadata || !Array.isArray(json.messages)) {
    throw new Error("Invalid ChatGPT Exporter JSON format")
  }

  const nodes: Record<string, ChatNode> = {}
  const pairs: { prompt: string; response: string }[] = []

  // Pair consecutive Prompt + Response messages
  for (let i = 0; i < json.messages.length; i++) {
    const msg = json.messages[i]
    if (msg.role === "Prompt") {
      const next = json.messages[i + 1]
      const response = next?.role === "Response" ? next.say : ""
      pairs.push({ prompt: msg.say, response })
      if (next?.role === "Response") i++ // skip the response, it's consumed
    }
  }

  if (pairs.length === 0) {
    throw new Error("No prompt/response pairs found in the JSON")
  }

  // Build a linear chain of nodes
  let prevId: string | null = null
  let rootId = ""

  pairs.forEach((pair, index) => {
    const id = `node-${index}`
    if (index === 0) rootId = id

    nodes[id] = {
      id,
      prompt: pair.prompt,
      response: pair.response,
      parentId: prevId,
      childIds: [],
      source: "imported",
    }

    // Link to parent
    if (prevId) {
      nodes[prevId].childIds.push(id)
    }

    prevId = id
  })

  return {
    metadata: {
      title: json.metadata.title || "Imported Conversation",
      user: json.metadata.user || { name: "Unknown", email: "" },
      dates: json.metadata.dates || { created: "", updated: "", exported: "" },
    },
    nodes,
    rootId,
  }
}

// ── Tree Traversal ──

/**
 * Walk parentId chain from a node to root.
 * Returns IDs in root-to-node order.
 */
export function getPathToRoot(
  nodeId: string,
  nodes: Record<string, ChatNode>
): string[] {
  const path: string[] = []
  let current: string | null = nodeId

  while (current) {
    path.unshift(current)
    current = nodes[current]?.parentId ?? null
  }

  return path
}

/**
 * Build chat history from root to a given node.
 * Returns an array of { role, content } suitable for the AI API.
 */
export function buildChatHistory(
  nodeId: string,
  nodes: Record<string, ChatNode>
): { role: "user" | "assistant"; content: string }[] {
  const path = getPathToRoot(nodeId, nodes)
  const messages: { role: "user" | "assistant"; content: string }[] = []

  for (const id of path) {
    const node = nodes[id]
    if (node.prompt) {
      messages.push({ role: "user", content: node.prompt })
    }
    if (node.response) {
      messages.push({ role: "assistant", content: node.response })
    }
  }

  return messages
}

// ── Tree Mutations ──

/**
 * Create a new branch node as a child of parentId.
 * Returns the updated nodes map and the new node's id.
 */
export function createBranchNode(
  parentId: string,
  nodes: Record<string, ChatNode>
): { nodes: Record<string, ChatNode>; newNodeId: string } {
  const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const updated = { ...nodes }

  updated[newId] = {
    id: newId,
    prompt: "",
    response: "",
    parentId,
    childIds: [],
    source: "generated",
  }

  // Add to parent's children
  updated[parentId] = {
    ...updated[parentId],
    childIds: [...updated[parentId].childIds, newId],
  }

  return { nodes: updated, newNodeId: newId }
}

// ── Tree Layout ──

type LayoutPosition = { x: number; y: number }

/**
 * Compute x,y positions for an auto-layout tree.
 * Uses a simple recursive algorithm that positions leaves left-to-right
 * and centers parents over their children.
 */
export function computeTreeLayout(
  rootId: string,
  nodes: Record<string, ChatNode>,
  nodeWidth = 240,
  nodeHeight = 120,
  hGap = 40,
  vGap = 60
): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>()
  let leafCounter = 0

  function layoutNode(id: string, depth: number): { minX: number; maxX: number } {
    const node = nodes[id]
    if (!node) return { minX: 0, maxX: 0 }

    const y = depth * (nodeHeight + vGap)

    if (node.childIds.length === 0) {
      // Leaf node
      const x = leafCounter * (nodeWidth + hGap)
      leafCounter++
      positions.set(id, { x, y })
      return { minX: x, maxX: x }
    }

    // Layout children first
    let globalMin = Infinity
    let globalMax = -Infinity

    for (const childId of node.childIds) {
      const { minX, maxX } = layoutNode(childId, depth + 1)
      globalMin = Math.min(globalMin, minX)
      globalMax = Math.max(globalMax, maxX)
    }

    // Center parent over children
    const x = (globalMin + globalMax) / 2
    positions.set(id, { x, y })
    return { minX: globalMin, maxX: globalMax }
  }

  layoutNode(rootId, 0)
  return positions
}

/**
 * Get depth of a node in the tree.
 */
export function getNodeDepth(
  nodeId: string,
  nodes: Record<string, ChatNode>
): number {
  let depth = 0
  let current: string | null = nodeId
  while (current && nodes[current]?.parentId) {
    depth++
    current = nodes[current].parentId
  }
  return depth
}
