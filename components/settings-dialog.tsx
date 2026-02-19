"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore, useActions } from "@/lib/store";
import type { ApiProvider } from "@/lib/types";

const GEMINI_MODELS = [
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
];

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state } = useStore();
  const { updateSettings } = useActions();
  const { settings } = state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your AI provider and model preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Provider selection */}
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">API Provider</Label>
            <RadioGroup
              value={settings.apiProvider}
              onValueChange={(v: ApiProvider) =>
                updateSettings({ apiProvider: v })
              }
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="gemini" id="provider-gemini" />
                <Label
                  htmlFor="provider-gemini"
                  className="font-normal cursor-pointer"
                >
                  Your Gemini API Key (default)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <RadioGroupItem value="gateway" id="provider-gateway" />
                <Label
                  htmlFor="provider-gateway"
                  className="font-normal cursor-pointer"
                >
                  Vercel AI Gateway
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Gemini API key input */}
          {settings.apiProvider === "gemini" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="gemini-key" className="text-sm font-medium">
                Gemini API Key
              </Label>
              <Input
                id="gemini-key"
                type="password"
                placeholder="AIza..."
                value={settings.geminiApiKey}
                onChange={(e) =>
                  updateSettings({ geminiApiKey: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Your key is stored locally and sent directly to Google.
              </p>
              <p className="text-xs text-muted-foreground">
                Don't have a key? Get one from{" "}
                <a
                  href="https://aistudio.google.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  AI Studio
                </a>
                .
              </p>
            </div>
          )}

          {/* Model picker */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Model</Label>
            <Select
              value={settings.geminiModel}
              onValueChange={(v) => updateSettings({ geminiModel: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GEMINI_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
