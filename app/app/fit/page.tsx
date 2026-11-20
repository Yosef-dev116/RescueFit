import { FitView } from "@/components/fit-view";
import { loadAgencies, loadImpactFactors } from "@/lib/data";
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

  const warnings = [agencies.warning, factors.warning].filter(
    (warning): warning is string => Boolean(warning),
  );

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
