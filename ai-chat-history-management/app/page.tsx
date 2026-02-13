import { StoreProvider } from "@/lib/store"
import { AppShell } from "@/components/app-shell"

export default function Home() {
  return (
    <main className="h-screen w-full overflow-hidden">
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </main>
  )
}
