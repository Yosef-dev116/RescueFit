# RescueFit evidence register

We reviewed **IMPAC_Datasets.xlsx**, sheet **Register**, with 150 listed sources and tools. The exported shortlist is **app/public/data/impac_register_audit.json**. A workbook row points to an original source. A reported licence classification is a starting point for checking permitted reuse.

| Workbook row | Input and role | Boundary |
| --- | --- | --- |
| 90 | PEI Food Recovery Network final report. Table 1 records 81 new donor signups, 22 new nonprofit signups and over 147,000 meals rescued in the project KPI. Chart 1 reports category shares of rescued pounds from Nov. 1, 2021 to Jan. 13, 2023. The normalized 98 percentage points implemented in the reference model are 41 bread/grains, 34 produce, 15 desserts/baked goods/snacks, 3 dairy, 3 meat/protein and 2 prepared meals. | Historical, link only. The shares are rounded and represent rescued food, which the scenario uses as an assumption for offered food. No event-level data or site capacities were available. |
| 92 and 100 | PEI directory and OpenStreetMap. Sourced candidate locations are in **pei_agency_sources.md**. | No live capacity, consent or partner availability. The simulation uses 22 fictional sites. |
| 39 | USDA FoodKeeper storage reference. | Staff supply use windows. Modeled category windows are synthetic. |
| 43 | Statistics Canada 18-10-0245-01, retail price reference. | No matched ingredient, period and package weight was entered. The demo's CAD 2.50/kg and CAD 2 handling are stated example inputs. |
| 68 and 83 | ECCC treatment comparison and IWMC local sorting context. | The product leaves the default PEI emissions result unavailable. Enter a sourced factor to estimate a treatment-only comparison. |
| 61 and 91 | HungerCount and Second Harvest research and service documentation. | Context and existing services. Visits and deliveries do not give site-level eligible offer time series. |
| 4 and 8 | School and university canteen waste leads. | Excluded from donation forecasting. |
| 19, 28 and 29 | Possible image benchmark data after task and licence review. | No image accuracy result is reported. |

## Source links

1. [Holland College assignment](https://hollandcollege.com/about/applied-research/impac/impac_assignment.docx) and [competition page](https://hollandcollege.com/about/applied-research/impac/). Submission, judging and eligibility.
2. [Second Harvest PEI Food Recovery Network Final Report](https://cdnsm5-hosted.civiclive.com/UserFiles/Servers/Server_10500298/File/Environment%20and%20Sustainability/Food/ES%2023-08%20Attachment%20-%20PEI%20Food%20Recovery%20Network%20Final.pdf). Table 1 and Chart 1 supply aggregate inputs.
3. [Government of PEI, engagement feedback on a food waste reduction strategy](https://www.princeedwardisland.ca/en/information/agriculture/a-summary-of-engagement-feedback-on-food-waste-reduction). Some community organizations reported discarding food intended for redistribution. Limited participation prevents province-wide prevalence estimates.
4. [Second Harvest Food Rescue App](https://www.secondharvest.ca/programs/app). Existing posting, claiming and pickup.
5. [Buisman et al., Donation management for menu planning at soup kitchens](https://doi.org/10.1016/j.ejor.2018.06.005). Precedent for joint donation acceptance and meal planning.
6. [Feeding America reporting method](https://www.feedingamerica.org/ways-to-give/faq/about-our-claims). 1.2 lb per meal equivalent, converted to 0.544310844 kg.
7. [ECCC GHG Calculator for Organic Waste Management](https://www.canada.ca/en/environment-climate-change/services/managing-reducing-waste/municipal-solid/waste-greenhouse-gases-canada-actions/calculator.html). Treatment scenarios.
8. [Island Waste Management Corporation](https://iwmc.pe.ca/commercial/). Commercial sorting context.
9. [Statistics Canada Table 18-10-0245-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810024501). Retail prices.
10. [PEI Donation of Food Act](https://www.princeedwardisland.ca/en/legislation/donation-food-act). Discuss applicability and procedures with the pilot partner.
