import * as React from 'react'
import { cn } from '@/lib/utils'

export function KaldiLogo({ size = 40, className, withText = false }: { size?: number; className?: string; withText?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className="relative rounded-full overflow-hidden ring-2 ring-amber-500/30 shadow-md shrink-0"
        style={{ width: size, height: size }}
      >
        <img
          src="/kaldis-logo.png"
          alt="Kaldi's Coffee logo"
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      </div>
      {withText && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-[15px] text-sidebar-foreground tracking-tight">Kaldi Academy</span>
          <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Learning Management</span>
        </div>
      )}
    </div>
  )
}
