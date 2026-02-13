"use client"

import { useState } from "react"
import {
  Upload,
  Settings,
  GitBranch,
  TreePine,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ImportDialog } from "@/components/import-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { TreeView } from "@/components/tree-view"
import { PathView } from "@/components/path-view"
import { useStore, useActions } from "@/lib/store"
import type { ViewMode } from "@/lib/types"

export function AppShell() {
  const { state } = useStore()
  const { setView } = useActions()
  const [importOpen, setImportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { tree, activeView } = state
  const nodeCount = tree ? Object.keys(tree.nodes).length : 0

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b px-4 py-2 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <GitBranch className="size-5 shrink-0 text-primary" />
          <h1 className="text-sm font-semibold truncate">
            {tree ? tree.metadata.title : "Branching Chats"}
          </h1>
          {tree && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {tree && (
            <Tabs
              value={activeView}
              onValueChange={(v) => setView(v as ViewMode)}
            >
              <TabsList>
                <TabsTrigger value="tree" className="gap-1.5 text-xs">
                  <TreePine className="size-3.5" />
                  Tree
                </TabsTrigger>
                <TabsTrigger value="path" className="gap-1.5 text-xs">
                  <MessageSquare className="size-3.5" />
                  Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="gap-1.5"
          >
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">Import</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="size-4" />
            <span className="sr-only">Settings</span>
          </Button>

          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {!tree ? (
          <EmptyState onImport={() => setImportOpen(true)} />
        ) : activeView === "tree" ? (
          <TreeView />
        ) : (
          <PathView />
        )}
      </main>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <GitBranch className="size-7 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">No conversation loaded</h2>
          <p className="text-sm text-muted-foreground">
            Import a ChatGPT Exporter JSON file to visualize and branch your
            conversations.
          </p>
        </div>
        <Button onClick={onImport} className="gap-2">
          <Upload className="size-4" />
          Import Conversation
        </Button>
      </div>
    </div>
  )
}
