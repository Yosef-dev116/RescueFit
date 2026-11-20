# RescueFit paired simulation

The reference scenario covers 30 days, 81 synthetic donors and 22 synthetic recipients. It runs seeds 2026 through 2125. Historical signup counts from the PEI Food Recovery Network report size the fictional network. Study results are modeled outcomes.

## Inputs

- **Food mix.** Chart 1 in the PEI report gives weight shares for food rescued. The model maps six groups totaling 98 reported percentage points into 18 categories. The app treats that as the expected shape of offered weight. The within-group splits are assumptions. Beverages, condiments and formula/replacements are excluded. The user can compare with a uniform category mix.
- **Donors.** Each seed gives a donor a synthetic home kitchen and daily offer probability uniformly drawn from 8% to 30%. Offer size is uniformly drawn from 2 to 25 kg, multiplied by the selected weight scale. The same expected mass distribution applies across categories.
- **Receiving sites.** Capacity, free space and preparation throughput are synthetic. Locations are approximate town centres. Free storage is capped by total capacity. The app's directory research is separate from the model.
- **Use window.** Remaining-use days are fixed synthetic inputs per category and storage type. Food can be used on arrival day up to the day before expiry. Actual operators review handling information and define their approved window.
- **Use capacity.** The reference plans use at 30% of nominal meals/day multiplied by 0.544310844 kg per meal equivalent. Actual simulated use varies uniformly by up to 30% on either side of the plan for each site and day. Every policy sees the same variations. All kilograms are modeled as edible. The model treats staffing and recipes as a generic capacity, while the kitchen decision app uses approved meal ingredients.

## Policies and limits

| Policy | Decision rule |
| --- | --- |
| Storage only | Take as much as fits the first kitchen's storage. Use the oldest deadlines first. |
| Kitchen fit | Also check cumulative planned use through each existing and new lot deadline. |
| Fit + redirect | Apply kitchen fit first. An offer-specific draw qualifies a remaining portion to try one additional site. Choose the nearest feasible site within the selected straight-line radius. |
| Accept-all stress test | Model immediate discard for volumes over storage at the original site. Keep this case separate from the headline comparison. |

The reference confirmation setting is 55% per eligible offer. The probability is a scenario knob, with same-day transfer and at most one alternate modeled per offer. Distance is approximate straight line. The simulation does not model driving, cold-chain steps, actual safety rules or actual donor permission.

Each paired seed uses identical food, offer order, home destinations and daily use variation. Fit may prevent a future expiry but reject useful food if actual use exceeds the plan. An unavailable alternate can leave additional weight unallocated.

## Accounting

**Offered kg = used kg + expired kg at receiving sites + unallocated kg + ending stock kg.**

Received weight equals used, expired and ending stock. Redirected weight is part of received weight. “Used” describes use in modeled kitchen preparation. Ending stock has a later outcome that is outside the 30-day horizon. The downstream fate of unallocated food is unknown.

Differences are paired by seed. The reported central 90% range is the fifth through ninety-fifth percentile of those 100 modeled differences. The code contains a stress metric combining expiry and unallocated; keep the two outcomes separate for the headline comparison.

Meal equivalents use Feeding America's reporting convention of 1.2 lb per equivalent. A modeled quantity may represent ingredients used in different meals. The reference leaves PEI emissions and cash savings unestimated. The impact screen accepts an optional sourced treatment factor for the change in expiry. The demo CAD calculation uses the proposed reduction in adjustable purchases and sample handling costs.

## Reproduce

Run **python3 model/simulate.py** then **python3 model/sensitivity.py**. The reference values come from **app/public/data/scenario_config.json**. Call **python3 model/simulate.py --help** for scenario overrides. Output can be written to a separate file using **--output**. After changing the reference values, run **python3 model/build_demo.py** and **node --test model/test_workspace.cjs** to check the live engine.
