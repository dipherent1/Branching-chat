"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type Dispatch,
  type ReactNode,
} from "react";
import type { ConversationTree, Settings, ViewMode, ChatNode } from "./types";
import { createBranchNode } from "./tree-utils";
import React from "react";

// ── State ──

export type AppState = {
  tree: ConversationTree | null;
  selectedNodeId: string | null;
  activeView: ViewMode;
  settings: Settings;
};

const defaultSettings: Settings = {
  apiProvider: "gemini",
  geminiApiKey: "",
  geminiModel: "google/gemini-2.5-pro",
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const saved = localStorage.getItem("branching-chats-settings");
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {}
  return defaultSettings;
}

const initialState: AppState = {
  tree: null,
  selectedNodeId: null,
  activeView: "tree",
  settings: defaultSettings,
};

// ── Actions ──

type Action =
  | { type: "IMPORT_TREE"; tree: ConversationTree }
  | { type: "SELECT_NODE"; nodeId: string | null }
  | { type: "SET_VIEW"; view: ViewMode }
  | { type: "UPDATE_SETTINGS"; settings: Partial<Settings> }
  | { type: "BRANCH_FROM_NODE"; nodeId: string }
  | { type: "UPDATE_NODE"; nodeId: string; patch: Partial<ChatNode> }
  | { type: "INIT_SETTINGS" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "IMPORT_TREE":
      return {
        ...state,
        tree: action.tree,
        selectedNodeId: action.tree.rootId,
        activeView: "tree",
      };

    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.nodeId };

    case "SET_VIEW":
      return { ...state, activeView: action.view };

    case "UPDATE_SETTINGS": {
      const newSettings = { ...state.settings, ...action.settings };
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "branching-chats-settings",
          JSON.stringify(newSettings),
        );
      }
      return { ...state, settings: newSettings };
    }

    case "BRANCH_FROM_NODE": {
      if (!state.tree) return state;
      const { nodes, newNodeId } = createBranchNode(
        action.nodeId,
        state.tree.nodes,
      );
      return {
        ...state,
        tree: { ...state.tree, nodes },
        selectedNodeId: newNodeId,
        activeView: "path",
      };
    }

    case "UPDATE_NODE": {
      if (!state.tree) return state;
      const node = state.tree.nodes[action.nodeId];
      if (!node) return state;
      return {
        ...state,
        tree: {
          ...state.tree,
          nodes: {
            ...state.tree.nodes,
            [action.nodeId]: { ...node, ...action.patch },
          },
        },
      };
    }

    case "INIT_SETTINGS":
      return { ...state, settings: loadSettings() };

    default:
      return state;
  }
}

// ── Context ──

const StoreContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
} | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load settings from localStorage on mount
  React.useEffect(() => {
    dispatch({ type: "INIT_SETTINGS" });
  }, []);

  return React.createElement(
    StoreContext.Provider,
    { value: { state, dispatch } },
    children,
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ── Convenience hooks ──

export function useActions() {
  const { dispatch } = useStore();

  return {
    importTree: useCallback(
      (tree: ConversationTree) => dispatch({ type: "IMPORT_TREE", tree }),
      [dispatch],
    ),
    selectNode: useCallback(
      (nodeId: string | null) => dispatch({ type: "SELECT_NODE", nodeId }),
      [dispatch],
    ),
    setView: useCallback(
      (view: ViewMode) => dispatch({ type: "SET_VIEW", view }),
      [dispatch],
    ),
    updateSettings: useCallback(
      (settings: Partial<Settings>) =>
        dispatch({ type: "UPDATE_SETTINGS", settings }),
      [dispatch],
    ),
    branchFromNode: useCallback(
      (nodeId: string) => dispatch({ type: "BRANCH_FROM_NODE", nodeId }),
      [dispatch],
    ),
    updateNode: useCallback(
      (nodeId: string, patch: Partial<ChatNode>) =>
        dispatch({ type: "UPDATE_NODE", nodeId, patch }),
      [dispatch],
    ),
  };
}
