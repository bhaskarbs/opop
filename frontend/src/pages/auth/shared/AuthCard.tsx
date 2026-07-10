import type { ReactNode } from 'react'

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-68px)] items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px] rounded-card border border-border bg-surface p-9">
        {children}
      </div>
    </div>
  )
}
