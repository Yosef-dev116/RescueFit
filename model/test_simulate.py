import math
import unittest
from simulate import Offer, arrivals, prepare, run_policy, simulate


def agency(i, lon, free=10, meals=10):
    return dict(id=i, lat=46.2, lon=lon, meals_per_day=meals,
                capacity_kg={"dry": free}, free_kg={"dry": free})


class SimulationTests(unittest.TestCase):
    agencies = [agency("home", -63.13), agency("near", -63.12), agency("too-far", -64.5)]
    shelf = [dict(category="bread", pantry_days=2, fridge_days=0, freezer_days=0)]
    factors = dict(kg_per_meal=.5, categories={"bread": dict(co2e_per_kg=2, cad_per_kg=3)})

    def test_one_offer_has_no_double_counting(self):
        args = prepare(self.agencies, self.shelf, self.factors)
        offer = Offer(1, 0, "bread", 12, 0)
        state, _ = run_policy([offer], self.agencies, *args, 3, "rescuefit")
        self.assertAlmostEqual(state["kg_received"], 6)
        self.assertAlmostEqual(state["kg_redirected"], 3)
        self.assertAlmostEqual(state["kg_unallocated"], 6)
        self.assertAlmostEqual(state["kg_used"], 6)
        self.assertAlmostEqual(state["kg_wasted_at_agency"], 0)
        self.assertAlmostEqual(state["co2e_kg"], 12)

    def test_baselines_account_for_waste(self):
        args = prepare(self.agencies, self.shelf, self.factors)
        offer = Offer(1, 0, "bread", 12, 0)
        normal, _ = run_policy([offer], self.agencies, *args, 3, "capacity_only")
        stress, _ = run_policy([offer], self.agencies, *args, 3, "accept_all")
        self.assertAlmostEqual(normal["kg_wasted_at_agency"], 7)
        self.assertAlmostEqual(normal["kg_unallocated"], 2)
        self.assertAlmostEqual(stress["kg_wasted_at_agency"], 9)
        self.assertAlmostEqual(stress["kg_unallocated"], 0)

    def test_pending_stock_not_counted_as_waste_or_use(self):
        args = prepare(self.agencies, self.shelf, self.factors)
        offer = Offer(1, 0, "bread", 10, 0)
        state, _ = run_policy([offer], self.agencies, *args, 1, "capacity_only")
        self.assertAlmostEqual(state["kg_remaining"], 8.5)
        self.assertAlmostEqual(state["kg_used"], 1.5)
        self.assertEqual(state["kg_wasted_at_agency"], 0)

    def test_reproducible_paired_contract(self):
        args = (self.agencies, self.shelf, self.factors)
        a = simulate(*args, days=5, donors=8, seeds=5)
        self.assertEqual(a, simulate(*args, days=5, donors=8, seeds=5))
        self.assertEqual(a["baseline"]["kg_offered"], a["rescuefit"]["kg_offered"])
        self.assertEqual(len(a["daily"]), 5)
        for group in a["uncertainty"].values():
            for metric in group.values():
                self.assertLessEqual(metric["p05"], metric["p95"])
        for group in (a["baseline"], a["rescuefit"]):
            self.assertTrue(math.isclose(group["kg_offered"], sum(group[k] for k in (
                "kg_used", "kg_wasted_at_agency", "kg_unallocated", "kg_remaining")), abs_tol=.0003))

    def test_unknown_impact_factors_keep_coverage_at_zero(self):
        factors = dict(kg_per_meal=.5, categories={})
        args = prepare(self.agencies, self.shelf, factors)
        state, _ = run_policy([Offer(1, 0, "bread", 5, 0)], self.agencies, *args, 3, "rescuefit")
        self.assertGreater(state["kg_used"], 0)
        self.assertEqual(state["kg_with_co2e_factor"], 0)
        self.assertEqual(state["kg_with_cad_factor"], 0)


if __name__ == "__main__":
    unittest.main()
