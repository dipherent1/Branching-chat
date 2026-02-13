"use client"

import { useState, useRef } from "react"
import { GitBranch, MessageSquare, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ChatNode } from "@/lib/types"
import { cn } from "@/lib/utils"

type TreeNodeCardProps = {
  node: ChatNode
  isSelected: boolean
  isOnPath: boolean
  onClick: () => void
  onBranch: () => void
}

export function TreeNodeCard({
  node,
  isSelected,
  isOnPath,
  onClick,
  onBranch,
}: TreeNodeCardProps) {
  const [showDialog, setShowDialog] = useState(false)
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleClick = (e: React.MouseEvent) => {
    // Only treat as click if mouse didn't move much (not a drag)
    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x)
      const dy = Math.abs(e.clientY - mouseDownPos.current.y)
      
      // If moved less than 5 pixels, it's a click
      if (dx < 5 && dy < 5) {
        setShowDialog(true)
      }
    }
    
    onClick()
  }

  return (
    <>
      <div
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className={cn(
          "w-[220px] cursor-pointer rounded-lg border p-3 transition-all",
          "hover:shadow-md",
          isSelected
            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
            : isOnPath
              ? "border-primary/50 bg-primary/5"
              : node.source === "generated"
                ? "border-accent/50 bg-card"
                : "border-border bg-card"
        )}
      >
      {/* Header with source indicator */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5">
          {node.source === "generated" ? (
            <Sparkles className="size-3 text-accent" />
          ) : (
            <MessageSquare className="size-3 text-muted-foreground" />
          )}
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {node.source === "generated" ? "Branch" : "Imported"}
          </span>
        </div>
        {node.childIds.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {node.childIds.length}
          </Badge>
        )}
      </div>

      {/* Prompt preview */}
      <p className="text-xs font-medium text-foreground line-clamp-2 mb-1">
        {node.prompt || "..."}
      </p>

      {/* Response preview */}
      {node.response && (
        <p className="text-[11px] text-muted-foreground line-clamp-2">
          {node.response}
        </p>
      )}

      {/* Single action button */}
      <div className="flex items-center gap-1 mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] px-2 gap-1"
          onClick={(e) => {
            e.stopPropagation()
            onBranch()
          }}
        >
          <GitBranch className="size-3" />
          Branch
        </Button>
      </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {node.source === "generated" ? (
                <Sparkles className="size-4 text-accent" />
              ) : (
                <MessageSquare className="size-4 text-muted-foreground" />
              )}
              <span>
                {node.source === "generated" ? "Generated Branch" : "Imported Message"}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div 
            className="space-y-4 overflow-y-auto overflow-x-hidden flex-1 pr-2"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted-foreground mb-2">
                Prompt:
              </p>
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap break-words word-break-break-word overflow-wrap-anywhere min-w-0">
                {node.prompt || "No prompt"}
              </div>
            </div>
            
            {node.response && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-muted-foreground mb-2">
                  Response:
                </p>
                <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap break-words word-break-break-word overflow-wrap-anywhere min-w-0">
                  {node.response}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
