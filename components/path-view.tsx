"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { User, Bot, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat-input";
import { useStore, useActions } from "@/lib/store";
import { getPathToRoot, buildChatHistory } from "@/lib/tree-utils";
import { cn } from "@/lib/utils";

export function PathView() {
  const { state } = useStore();
  const { selectNode, branchFromNode, updateNode } = useActions();
  const { tree, selectedNodeId, settings } = state;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  // Compute the path of messages to display
  const pathNodeIds = useMemo(() => {
    if (!tree || !selectedNodeId) return [];
    return getPathToRoot(selectedNodeId, tree.nodes);
  }, [tree, selectedNodeId]);

  // Build flat message list from path
  const messages = useMemo(() => {
    if (!tree) return [];
    const msgs: {
      id: string;
      role: "user" | "assistant";
      content: string;
      nodeId: string;
      source: "imported" | "generated";
    }[] = [];

    for (const nodeId of pathNodeIds) {
      const node = tree.nodes[nodeId];
      if (!node) continue;
      if (node.prompt) {
        msgs.push({
          id: `${nodeId}-prompt`,
          role: "user",
          content: node.prompt,
          nodeId,
          source: node.source,
        });
      }
      if (node.response) {
        msgs.push({
          id: `${nodeId}-response`,
          role: "assistant",
          content: node.response,
          nodeId,
          source: node.source,
        });
      }
    }

    return msgs;
  }, [tree, pathNodeIds]);

  // Current node for branching context
  const currentNode =
    tree && selectedNodeId ? tree.nodes[selectedNodeId] : null;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, streamingText]);

  // Branch selector: show siblings when current node has siblings
  const parentNode =
    currentNode?.parentId && tree ? tree.nodes[currentNode.parentId] : null;
  const siblings = parentNode ? parentNode.childIds : [];

  const handleSendToNode = useCallback(
    async (text: string, nodeId?: string) => {
      if (!tree) return;

      const targetId = nodeId || selectedNodeId;
      if (!targetId) return;

      // Update the node's prompt
      updateNode(targetId, { prompt: text });

      // Build chat history up to the parent of this node
      const parentId = tree.nodes[targetId]?.parentId;
      const history = parentId ? buildChatHistory(parentId, tree.nodes) : [];
      // Add the new user message
      history.push({ role: "user", content: text });

      console.log("[v0] Sending chat history:", {
        targetId,
        parentId,
        historyLength: history.length,
        history: history.map((m) => ({
          role: m.role,
          contentPreview: m.content.slice(0, 50),
        })),
      });

      setIsStreaming(true);
      setStreamingText("");

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (settings.apiProvider === "gemini" && settings.geminiApiKey) {
          headers["x-gemini-api-key"] = settings.geminiApiKey;
        }

        // Log headers and payload for debugging
        console.log("[v0] Request headers:", {
          apiProvider: settings.apiProvider,
          hasGeminiKey: !!settings.geminiApiKey,
          headersPreview: Object.keys(headers),
        });

        const payload = {
          messages: history,
          model: settings.geminiModel,
          apiProvider: settings.apiProvider,
        };
        console.log("[v0] Sending POST /api/chat", {
          payloadSummary: {
            messages: history.length,
            model: payload.model,
            apiProvider: payload.apiProvider,
          },
        });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        console.log("[v0] /api/chat response status:", res.status);

        if (!res.ok) throw new Error("Failed to get response");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setStreamingText(fullText);
        }

        // Save the completed response to the node
        updateNode(targetId, { response: fullText });
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Error getting response";
        updateNode(targetId, { response: `Error: ${errorMsg}` });
      } finally {
        setIsStreaming(false);
        setStreamingText("");
      }
    },
    [tree, selectedNodeId, settings, updateNode],
  );

  // Store pending message for after branch creation
  const pendingMessage = useRef<string | null>(null);

  // When sending a message, branch first if needed, then send
  const handleChatSend = useCallback(
    async (text: string) => {
      if (!tree || !selectedNodeId) return;

      if (
        currentNode &&
        currentNode.prompt === "" &&
        currentNode.response === "" &&
        currentNode.source === "generated"
      ) {
        // This is already an empty branch node created previously: fill it in
        await handleSendToNode(text, selectedNodeId);
      } else {
        // Create a new branch from current node and queue the message
        pendingMessage.current = text;
        branchFromNode(selectedNodeId);
      }
    },
    [tree, selectedNodeId, currentNode, branchFromNode, handleSendToNode],
  );

  // Effect to send pending message after branch is created
  useEffect(() => {
    if (
      pendingMessage.current &&
      currentNode &&
      currentNode.prompt === "" &&
      currentNode.response === "" &&
      currentNode.source === "generated"
    ) {
      const msg = pendingMessage.current;
      pendingMessage.current = null;
      handleSendToNode(msg, selectedNodeId!);
    }
  }, [selectedNodeId, currentNode, handleSendToNode]);

  if (!tree || !selectedNodeId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a node to view the conversation path
      </div>
    );
  }

  // Check if the selected node is a fresh branch with no content
  const isFreshBranch =
    currentNode?.prompt === "" && currentNode?.response === "";

  return (
    <div className="flex h-full flex-col">
      {/* Branch selector bar */}
      {siblings.length > 1 && (
        <div className="flex items-center gap-2 border-b px-4 py-2 overflow-x-auto">
          <span className="text-xs text-muted-foreground shrink-0">
            Branches:
          </span>
          {siblings.map((sibId, i) => (
            <Button
              key={sibId}
              variant={pathNodeIds.includes(sibId) ? "default" : "outline"}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => selectNode(sibId)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="mx-auto max-w-2xl flex flex-col gap-4 p-4 pb-2">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Streaming response */}
          {isStreaming && streamingText && (
            <MessageBubble
              message={{
                id: "streaming",
                role: "assistant",
                content: streamingText,
                nodeId: selectedNodeId,
                source: "generated",
              }}
            />
          )}

          {isStreaming && !streamingText && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-4">
              <div className="flex gap-1">
                <span className="animate-bounce [animation-delay:0ms] size-1.5 rounded-full bg-muted-foreground" />
                <span className="animate-bounce [animation-delay:150ms] size-1.5 rounded-full bg-muted-foreground" />
                <span className="animate-bounce [animation-delay:300ms] size-1.5 rounded-full bg-muted-foreground" />
              </div>
              Thinking...
            </div>
          )}
        </div>
      </div>

      {/* Chat input */}
      <ChatInput
        onSend={handleChatSend}
        disabled={isStreaming}
        placeholder={
          isFreshBranch
            ? "Type your message to start this branch..."
            : "Type a message to create a new branch..."
        }
      />
    </div>
  );
}

// ── Message Bubble ──

function MessageBubble({
  message,
}: {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    nodeId: string;
    source: "imported" | "generated";
  };
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
          {message.source === "generated" ? (
            <Sparkles className="size-3.5 text-accent" />
          ) : (
            <Bot className="size-3.5 text-muted-foreground" />
          )}
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm break-words overflow-wrap-anywhere",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_pre]:my-2 [&_ul]:my-1 [&_ol]:my-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="size-3.5 text-primary" />
        </div>
      )}
    </div>
  );
}
