import Link from "next/link";

/*
 * The masthead of the document, and its nav.
 *
 * Navigation is set into the form: each link is a numbered box on a filing
 * strip, the way a multi-part form numbers its copies. They still read as
 * links, which is what the world is not allowed to absorb.
 */

const SECTIONS = [
  { href: "/intake", index: "01", label: "Intake" },
  { href: "/fit", index: "02", label: "Fit check" },
  { href: "/plan", index: "03", label: "Use-first plan" },
  { href: "/impact", index: "04", label: "Impact" },
  { href: "/network", index: "05", label: "Network" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b-2 border-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-4 pb-3 sm:px-6">
        <Link
          href="/"
          className="group no-underline"
          aria-label="RescueFit, home"
        >
          <span className="field-label block">Form RF&#8209;1 &middot; Consignment fit record</span>
          <span className="placard block text-[1.75rem] text-ink transition-colors group-hover:text-stamp sm:text-[2.125rem]">
            RescueFit
          </span>
        </Link>

        <nav aria-label="Sections">
          <ul className="flex flex-wrap gap-px bg-ink">
            {SECTIONS.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="flex items-baseline gap-1.5 bg-stock px-2.5 py-1.5 no-underline transition-colors hover:bg-ink hover:text-stock focus-visible:bg-ink focus-visible:text-stock"
                >
                  <span className="typed text-[0.625rem] text-carbon-soft">
                    {section.index}
                  </span>
                  <span className="text-[0.8125rem] font-600 tracking-tight">
                    {section.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
