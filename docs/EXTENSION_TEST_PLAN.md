# Optional features and their evidence

## Donation forecast

The target is eligible edible kg **offered per day**. Collect dated offer IDs, weights and explicit days with zero offers. Distinguish missing days from zeroes. A receiving program's history should include declined offers where available to avoid training only on accepted quantities.

**model/forecast_offers.py** checks a complete series and reports chronological holdout MAE for same weekday last week and the prior-week mean. It also provides a seven-day seasonal baseline. Re-check the dataset licence and operator consent before including any field data in the submission. Finland school waste and university canteen disposal do not answer this question.

## Photo and label intake

The browser can attach a photo and attempt printed-label extraction when supported. Users may always enter the label text and measured weight. A future benchmark needs a declared model, held-out labelled photos, split by lot, category precision/recall and abstentions. Report weight error only with independently measured weights. Do not infer food safety, storage history, allergens or an approved use window from pixels.

## Operational acceptance scenarios

| Case | Expected result |
| --- | --- |
| Donor permits splitting before pickup | Collect the proposed portion only. Weight left at the donor is outside the receiving ledger. |
| Reviewed lot is already collected | Preserve the full collected mass through allocations, handoff, use and discard. |
| Requested split is unavailable | Hold or decline the whole offer if it exceeds fit. |
| Candidate cannot receive | Replan in draft or release the saved pending quantity back into unplaced stock. |
| Offer or kitchen changes | Rerun the comparison and preserve the same settings across paired policies. |

Use the model comparison and local workflow checks before planning a measured operator trial. Code results and observed kitchen outcomes belong in separate evidence columns.
