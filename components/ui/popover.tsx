"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverContent({
  className,
  children,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup> & {
  sideOffset?: number;
}) {
  return (
    <PopoverPrimitive.Portal>
      {/* z-50 WAJIB di Positioner (bukan cuma di Popup) -- Positioner sudah
          punya "transform" (dipakai Base UI untuk memposisikan popover),
          dan "transform" SENDIRI sudah membuat elemen ini punya stacking
          context baru walau z-index-nya masih "auto". Stacking context yang
          urutannya "auto" itu tetap kalah dari elemen lain di halaman yang
          punya z-index eksplisit positif (mis. StatCard menaikkan angkanya
          ke z-10 supaya di atas hiasan glow-nya sendiri) -- z-50 di Popup
          saja TIDAK CUKUP, karena z-index Popup cuma berlaku relatif di
          dalam stacking context Positioner, bukan dibandingkan langsung ke
          elemen di luar Positioner. Sudah pernah kejadian nyata: kartu
          dashboard Kinerja Pengajuan ke Pusat menembus popover ini. */}
      <PopoverPrimitive.Positioner sideOffset={sideOffset} collisionPadding={12} className="z-50">
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "w-72 rounded-lg border border-border bg-card p-3 text-sm leading-relaxed text-foreground shadow-lg outline-none",
            className,
          )}
          {...props}
        >
          <PopoverPrimitive.Arrow className="data-[side=bottom]:-top-1.75 data-[side=top]:-bottom-1.75 data-[side=left]:-right-1.75 data-[side=right]:-left-1.75">
            <svg width="14" height="7" viewBox="0 0 14 7" className="fill-card stroke-border data-[side=top]:rotate-180">
              <path d="M0 0 L7 7 L14 0" strokeWidth="1" />
            </svg>
          </PopoverPrimitive.Arrow>
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
