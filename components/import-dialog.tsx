"use client"

import { useState, useCallback } from "react"
import { Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useActions } from "@/lib/store"
import { parseImportedJson } from "@/lib/tree-utils"

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const { importTree } = useActions()

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string)
          const tree = parseImportedJson(json)
          importTree(tree)
          onOpenChange(false)
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to parse JSON file"
          )
        }
      }
      reader.readAsText(file)
    },
    [importTree, onOpenChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file?.name.endsWith(".json")) {
        handleFile(file)
      } else {
        setError("Please drop a .json file")
      }
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Conversation</DialogTitle>
          <DialogDescription>
            Upload a JSON file exported with ChatGPT Exporter.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }`}
        >
          <Upload className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Drag and drop your JSON file here, or click below
          </p>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>Choose File</span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleFileInput}
              className="sr-only"
            />
          </label>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
