(function initializeDecision(root) {
  "use strict";

  const EPS = 1e-6;
  const mass = (value) => Math.round(value * 100) / 100;
  const clampKg = (value) => Math.max(0, Math.floor((value + EPS) * 100) / 100);
  const categoryLabels = {
    bread:"Bread and rolls", root_veg:"Carrots / root vegetables", leafy_veg:"Leafy vegetables", fruit:"Fruit",
    berries:"Berries", potatoes:"Potatoes", tomatoes:"Tomatoes", broccoli:"Broccoli", milk:"Milk",
    yogurt:"Yogurt", cheese:"Cheese", eggs:"Eggs", canned_beans:"Beans and lentils", dry_grains:"Dry grains",
    frozen_veg:"Frozen vegetables", frozen_meat:"Frozen meat", bakery:"Baked treats", prepared:"Prepared meals",
  };

  function tokensFor(shelf) {
    return shelf.flatMap((item) => item.keywords.map((word) => ({word, category:item.category})))
      .sort((a, b) => b.word.length - a.word.length);
  }

  function normalize(text) {
    return text.toLowerCase().replace(/\bpotatoes\b/g, "potato").replace(/\btomatoes\b/g, "tomato")
      .replace(/\bberries\b/g, "berry").replace(/\bcookies\b/g, "cookie").replace(/\bpastries\b/g, "pastry")
      .replace(/\bsandwiches\b/g, "sandwich");
  }

  function classify(name, shelf) {
    const cleaned = normalize(name);
    return tokensFor(shelf).find(({word}) => {
      const token = word.replace(/[.*+?^{}$()|[\]\\]/g, "\\$&");
      return new RegExp("\\b" + token + "s?\\b").test(cleaned);
    })?.category || "";
  }

  function parseText(text, shelf) {
    const samples = text.trim().split(/[;\n]+|,\s*(?=\d|\D+\b\d+(?:\.\d+)?\s*(?:kg|g|lb)\b)/i)
      .map((line) => line.trim()).filter(Boolean).slice(0, 8);
    return samples.map((line) => {
      const quantity = line.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(kilograms?|kgs?|grams?|g|pounds?|lbs?)\b/i);
      const count = !quantity ? line.match(/^(\d+)\s+(?:each\s+|trays?\s+(?:of\s+)?)?(.+)$/i) : null;
      const inferredName = (quantity ? line.replace(quantity[0], " ") : count ? count[2] : line).trim()
        .replace(/^[\s:–-]+|[\s:–-]+$/g, "");
      const name = inferredName.replace(/^of\s+/i, "").slice(0, 70) || "Unnamed item";
      let offered = null;
      if (quantity) {
        const unit = quantity[2].toLowerCase();
        const multiplier = /^(?:lb|pound)/.test(unit) ? .45359237 : /^(?:g|gram)/.test(unit) ? .001 : 1;
        offered = mass(Number(quantity[1]) * multiplier);
      }
      return {name, offered, category:classify(name, shelf), quantity_note:count ? count[1] + " counted units" : ""};
    });
  }

  function serviceNeeds(kitchen) {
    const stock = {...kitchen.starting_stock};
    const cells = [];
    for (const service of [...kitchen.services].sort((a, b) => a.day - b.day)) {
      for (const [category, need] of Object.entries(service.ingredients)) {
        const onHand = Math.min(need, stock[category] || 0);
        stock[category] = mass((stock[category] || 0) - onHand);
        cells.push({service, category, need, onHand, gap:mass(need - onHand), open:mass(need - onHand)});
      }
    }
    return cells;
  }

  function usableAtDestination(agency, lot, reserved, share, kgPerMeal) {
    const stored = reserved.filter((p) => p.storage === lot.storage).reduce((sum,p) => sum+p.kg,0);
    const space = Math.min(agency.capacity_kg[lot.storage], agency.free_kg[lot.storage]) - stored;
    const dailyUse = agency.meals_per_day * kgPerMeal * share;
    const deadlines = [...new Set([lot.use_by, ...reserved.filter((p) => p.use_by >= lot.use_by).map((p) => p.use_by)])];
    const usable = Math.min(...deadlines.map((deadline) => dailyUse * (deadline - lot.arrival + 1)
      - reserved.filter((p) => p.use_by <= deadline).reduce((kg,p) => kg+p.kg,0)));
    return clampKg(Math.min(space, usable));
  }

  function plan(lots, kitchen, agencies, settings) {
    const needs = serviceNeeds(kitchen);
    const remainingSpace = {...kitchen.ready_storage};
    const adjustable = {...kitchen.adjustable_purchases_kg};
    const prep = [...kitchen.prep_kg];
    const origin = agencies.find((a) => a.id === kitchen.origin_id);
    const reservations = new Map();
    const rows = [];
    const priority = lots.slice().sort((a,b) => a.use_by - b.use_by || a.arrival - b.arrival);
    for (const lot of priority) {
      const eligible = lot.reviewed === true && Object.hasOwn(categoryLabels, lot.category)
        && Object.hasOwn(remainingSpace, lot.storage) && Number.isFinite(lot.offered)
        && lot.offered > 0 && Number.isInteger(lot.arrival) && lot.arrival >= 1
        && Number.isInteger(lot.use_by) && lot.use_by >= lot.arrival
        && (lot.stage!=="collected" || (Number.isFinite(lot.collected) && lot.collected>=0 && lot.collected<=lot.offered));
      const collected = lot.stage === "collected" ? lot.collected : 0;
      const available = eligible ? (lot.stage === "collected" ? collected : lot.offered) : 0;
      const candidate = eligible ? needs.filter((cell) => cell.category === lot.category
        && cell.service.day >= lot.arrival && cell.service.day <= lot.use_by) : [];
      const allocations = [];
      const tempPrep = [...prep];
      let kept = 0;
      for (const cell of candidate) {
        const index = cell.service.day - 1;
        const qty = clampKg(Math.min(cell.open, tempPrep[index],
          Math.min(available, remainingSpace[lot.storage]) - kept));
        if (qty <= EPS) continue;
        allocations.push({cell, qty});
        tempPrep[index] = mass(tempPrep[index] - qty);
        kept = mass(kept + qty);
      }
      const wholePickup = lot.stage === "offer" && !lot.may_split && kept + EPS < lot.offered;
      if (wholePickup) {
        allocations.length = 0;
        kept = 0;
      }
      for (const {cell, qty} of allocations) {
        cell.open = mass(cell.open - qty);
        prep[cell.service.day - 1] = mass(prep[cell.service.day - 1] - qty);
      }
      if (kept > 0) remainingSpace[lot.storage] = mass(remainingSpace[lot.storage] - kept);
      const surplus = mass(Math.max(0, collected - kept));
      const potential = eligible && lot.stage === "collected" && lot.may_redirect && surplus > EPS && origin
        ? agencies.filter((a) => a.id !== origin.id && !(settings.closed || []).includes(a.id)).map((agency) => {
          const km = root.RescueSim.distanceKm(origin, agency);
          const room = usableAtDestination(agency, lot, reservations.get(agency.id) || [],
            settings.useShare, settings.kgPerMeal);
          return {id:agency.id, name:agency.name, town:agency.town, km, room, qty:Math.min(surplus, room)};
        }).filter((entry) => entry.km <= settings.radius && entry.qty > EPS)
          .sort((a,b) => a.km - b.km || a.id.localeCompare(b.id)) : [];
      const route = potential.find((x) => x.id === settings.routeOverrides?.[lot.id]) || potential[0] || null;
      if (route) {
        if (!reservations.has(route.id)) reservations.set(route.id, []);
        reservations.get(route.id).push({storage:lot.storage, use_by:lot.use_by, kg:route.qty});
      }
      const replaced = mass(Math.min(kept, adjustable[lot.category] || 0));
      if (replaced > 0) adjustable[lot.category] = mass(adjustable[lot.category] - replaced);
      const net = mass(replaced * lot.price - (kept > 0 ? lot.handling_cost : 0));
      const action = !eligible ? "Review required" : wholePickup ? "Whole offer exceeds fit" :
        kept > 0 ? (kept + EPS >= available ? "Accept" : "Accept part") : route ? "Redirect" : "No kitchen fit";
      const reason = !eligible ? "Confirm the ingredient, storage and use-by window before planning." :
        wholePickup ? "The donor requires a whole-lot pickup. The kitchen can only use a smaller quantity." :
        kept > 0 ? "The quantity fits the meal plan, prep budget and available storage." :
        route ? "This kitchen has no use in the selected window. A modeled recipient has room." :
        "The meal plan, available space or prep budget leaves no usable allocation.";
      rows.push({lot, kept, replaced, net, collected, offered:lot.offered, surplus, route, potential, action, reason, eligible,
        allocation:allocations.map(({cell,qty}) => ({service_id:cell.service.id, day:cell.service.day, name:cell.service.name, qty})),
        unplaced:mass(surplus - (route?.qty || 0))});
    }
    return {rows, needs, remainingSpace, prep};
  }

  function ledgerFor(row) {
    return {id:row.lot.id, collected:row.collected, kitchen:row.lot.stage === "collected" ? row.kept : 0,
      pending:row.route?.qty || 0, transferred:0, used:0, discarded:0, unplaced:row.unplaced,
      confirmed:false, pickedUp:row.lot.stage === "collected", released:false};
  }

  function evolve(ledger, row, event, kg = 0) {
    const next = {...ledger};
    if (event === "pickup" && !next.pickedUp && row.lot.stage === "offer" && row.kept > 0) {
      next.collected = row.kept;
      next.kitchen = row.kept;
      next.pickedUp = true;
    } else if (event === "confirm" && next.pending > 0 && !next.confirmed) {
      next.confirmed = true;
    } else if (event === "transfer" && next.pending > 0 && next.confirmed) {
      next.transferred = mass(next.transferred + next.pending);
      next.pending = 0;
    } else if (event === "release" && next.pending > 0) {
      next.unplaced = mass(next.unplaced + next.pending);
      next.pending = 0;
      next.confirmed = false;
      next.released = true;
    } else if (event === "use" && Number.isFinite(kg) && kg > 0 && kg <= next.kitchen + EPS) {
      next.kitchen = mass(next.kitchen - kg);
      next.used = mass(next.used + kg);
    } else if (event === "discard" && Number.isFinite(kg) && kg > 0 && kg <= next.unplaced + next.kitchen + EPS) {
      const fromUnplaced = Math.min(kg, next.unplaced);
      next.unplaced = mass(next.unplaced - fromUnplaced);
      next.kitchen = mass(next.kitchen - (kg - fromUnplaced));
      next.discarded = mass(next.discarded + kg);
    } else return null;
    const sum = next.kitchen + next.pending + next.transferred + next.used + next.discarded + next.unplaced;
    if (Math.abs(sum - next.collected) > EPS) throw new Error("The lot ledger failed to balance.");
    return next;
  }

  const api = {mass, categoryLabels, parseText, serviceNeeds, plan, ledgerFor, evolve};
  root.RescueDecision = api;
  if (typeof module !== "undefined") module.exports = api;
}(globalThis));
