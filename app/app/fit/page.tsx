import { FitView } from "@/components/fit-view";
import { clientWarning, loadAgencies, loadImpactFactors } from "@/lib/data";
import { sampleConsignment } from "@/lib/sample";

export const metadata = {
  title: "Fit check: can this kitchen take it? | RescueFit",
  description:
    "Compare a donation against one kitchen's free space, meals per day, " +
    "shelf life, and diet rules. Accept, Accept part, or Redirect, with " +
    "the arithmetic shown.",
};

export default function FitPage() {
  const agencies = loadAgencies();
  const factors = loadImpactFactors();

  /*
   * Two different audiences, two different sentences.
   *
   * .warning names the missing file and the fixture behind it, which is
   * what a developer needs and what the server log is for. It must not
   * reach a browser: this page is public, so that text would tell a
   * stranger our paths and who on the team wrote the stand-in data.
   * clientWarning() is the neutral sentence that is safe to render.
   */
  for (const developerWarning of [agencies.warning, factors.warning]) {
    if (developerWarning) console.warn(`[fit] ${developerWarning}`);
  }

  const warnings = [
    ...new Set(
      [clientWarning(agencies), clientWarning(factors)].filter(
        (warning): warning is string => Boolean(warning),
      ),
    ),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <FitView
        agencies={agencies.value}
        sampleItems={sampleConsignment()}
        kgPerMeal={factors.value.kg_per_meal}
        dataWarnings={warnings}
      />
    </div>
  );
}
