/*
 * The document's own footer: the distribution block a real multi-part form
 * carries, saying who keeps which copy.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="perforation mb-5" aria-hidden="true" />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-[46ch]">
            <p className="field-label mb-1">Distribution</p>
            <p className="typed text-[0.8125rem] leading-relaxed text-ink-soft">
              COPY 1 (white) receiving kitchen &middot; COPY 2 (blue) donor
              record &middot; COPY 3 (pink) redirect agency
            </p>
          </div>
          <div className="max-w-[42ch]">
            <p className="field-label mb-1">Prepared by</p>
            <p className="text-[0.875rem] leading-relaxed text-ink-soft">
              A student prototype for IMPAC 2026 at Holland College,
              Innovation stream. Shelf life from the USDA FoodKeeper. Product
              lookup from Open Food Facts.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
