import { PlanView } from "@/components/plan-view";
import { loadAgencies, loadImpactFactors } from "@/lib/data";
import { sampleConsignment } from "@/lib/sample";

export const metadata = {
  title: "Use-first plan: cook the soonest expiry first | RescueFit",
  description:
    "A three-day menu and prep list for a charity kitchen, built around " +
    "the donated items that expire soonest.",
};

export default function PlanPage() {
  const agencies = loadAgencies();
  const factors = loadImpactFactors();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PlanView
        agencies={agencies.value}
        sampleItems={sampleConsignment()}
        kgPerMeal={factors.value.kg_per_meal}
      />
    </div>
  );
}
