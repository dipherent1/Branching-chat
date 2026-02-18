// ── Core data model for the branching conversation tree ──

export type ChatNode = {
  id: string
  prompt: string          // user message
  response: string        // assistant message
  parentId: string | null
  childIds: string[]
  source: "imported" | "generated"
}

export type ConversationMetadata = {
  title: string
  user: { name: string; email: string }
  dates: { created: string; updated: string; exported: string }
}

export type ConversationTree = {
  metadata: ConversationMetadata
  nodes: Record<string, ChatNode>
  rootId: string
}

export type ApiProvider = "gateway" | "gemini"

export type Settings = {
  apiProvider: ApiProvider
  geminiApiKey: string
  geminiModel: string
}

export type ViewMode = "tree" | "path"
