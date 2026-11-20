(function initializeSimulation(root) {
  "use strict";

  const EPS = 1e-8;
  const UINT32 = 4294967296;
  const STORAGE = {dry: "pantry_days", fridge: "fridge_days", freezer: "freezer_days"};
  const POLICIES = ["baseline", "fit_only", "rescuefit", "accept_all_stress_test"];
  const METRICS = ["kg_offered", "kg_received", "kg_wasted_at_agency", "kg_used", "kg_unallocated",
    "kg_remaining", "kg_redirected", "meals", "co2e_kg", "cad", "kg_with_co2e_factor", "kg_with_cad_factor",
    "transfers", "redirect_kg_km"];
  const DAILY = {waste: "kg_wasted_at_agency", used: "kg_used", unallocated: "kg_unallocated",
    remaining: "kg_remaining", redirected: "kg_redirected"};

  function mixBits(value) {
    value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
    value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
    return (value ^ (value >>> 16)) >>> 0;
  }

  function random(seed) {
    let state = seed >>> 0;
    return function draw() {
      state = (state + 0x9e3779b9) >>> 0;
      return mixBits(state) / UINT32;
    };
  }

  function distanceKm(a, b) {
    const rad = Math.PI / 180;
    const hav = Math.sin((b.lat - a.lat) * rad / 2) ** 2
      + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(Math.min(1, hav)));
  }

  function computeNeighbors(agencies, radiusKm) {
    return agencies.map((a, i) => agencies.map((b, j) => ({index: j, id: b.id, km: distanceKm(a, b)}))
      .filter((b) => b.index !== i && b.km <= radiusKm + EPS)
      .sort((a, b) => a.km - b.km || a.id.localeCompare(b.id)));
  }

  function createInputs(fixtures, settings) {
    const categories = {};
    for (const item of fixtures.shelf) {
      const storage = Object.keys(STORAGE).find((key) => item[STORAGE[key]] > 0);
      if (storage) categories[item.category] = {storage, days: item[STORAGE[storage]], weight: settings.mix === "uniform" ? 1 : 0};
    }
    if (settings.mix === "pei") {
      for (const group of fixtures.evidence.groups) {
        group.categories.forEach((name, i) => {
          categories[name].weight += group.percent * group.within_group_weights[i];
        });
      }
    }
    const names = Object.keys(categories).filter((name) => categories[name].weight > 0).sort();
    if (!names.length) throw new Error("No categories have a usable simulation weight.");
    const totalWeight = names.reduce((total, key) => total + categories[key].weight, 0);
    const demand = fixtures.agencies.map((a) => a.meals_per_day * fixtures.factors.kg_per_meal * settings.use_share);
    const free = fixtures.agencies.map((a) => Object.fromEntries(Object.keys(STORAGE)
      .map((storage) => [storage, Math.min(a.free_kg[storage] || 0, a.capacity_kg[storage] || 0)])));
    return {categories, names, totalWeight, demand, free, neighbors: computeNeighbors(fixtures.agencies, settings.radius_km)};
  }

  function offerStream(settings, seed, inputs, agencyCount) {
    const draw = random(seed);
    const homes = Array.from({length: settings.donors}, () => Math.floor(draw() * agencyCount));
    const activation = homes.map(() => settings.min_donor_active + draw() * (settings.max_donor_active - settings.min_donor_active));
    const useDraw = random(seed ^ 0xd1b54a35);
    const realized = Array.from({length: settings.days}, () => Array.from({length: agencyCount},
      () => 1 + settings.use_uncertainty * (2 * useDraw() - 1)));
    const days = [];
    for (let day = 1; day <= settings.days; day++) {
      const offers = [];
      for (let donor = 0; donor < homes.length; donor++) {
        if (draw() >= activation[donor]) continue;
        let choice = draw() * inputs.totalWeight;
        const kind = inputs.names.find((name) => {
          choice -= inputs.categories[name].weight;
          return choice < 0;
        }) ?? inputs.names.at(-1);
        const size = settings.min_offer_kg + draw() * (settings.max_offer_kg - settings.min_offer_kg);
        const ticket = seed ^ Math.imul(day, 0xb5297a4d) ^ Math.imul(donor + 1, 0x68e31da4);
        offers.push({home: homes[donor], kind, kg: Math.round(size * settings.offer_scale * 100) / 100,
          confirmation: mixBits(ticket) / UINT32});
      }
      days.push(offers);
    }
    return {days, realized};
  }

  function useBefore(lots, deadline, day, planned) {
    const deadlines = new Set([deadline]);
    for (const lot of lots) if (lot.expires >= deadline) deadlines.add(lot.expires);
    let remaining = Infinity;
    for (const end of deadlines) {
      const reserved = lots.reduce((sum, lot) => sum + (lot.expires <= end ? lot.kg : 0), 0);
      remaining = Math.min(remaining, planned * (end - day) - reserved);
    }
    return remaining;
  }

  function runPolicy(stream, inputs, factors, settings, policy) {
    const fit = policy === "fit_only" || policy === "rescuefit";
    let stocks = inputs.demand.map(() => []);
    const total = Object.fromEntries(METRICS.map((metric) => [metric, 0]));
    const daily = [];
    for (let i = 0; i < settings.days; i++) {
      const day = i + 1;
      const today = {kg_offered: 0, kg_used: 0, kg_unallocated: 0, kg_redirected: 0, kg_wasted_at_agency: 0, kg_remaining: 0};
      stocks = stocks.map((lots) => lots.filter((lot) => {
        if (lot.expires > day) return true;
        today.kg_wasted_at_agency += lot.kg;
        return false;
      }));
      for (const offer of stream.days[i]) {
        const category = inputs.categories[offer.kind];
        const expires = day + category.days;
        const local = {index: offer.home, km: 0};
        const canRedirect = policy === "rescuefit" && offer.confirmation < settings.confirmation;
        const candidates = canRedirect ? [local, ...inputs.neighbors[offer.home]] : [local];
        let left = offer.kg;
        today.kg_offered += left;
        for (const {index, km} of candidates) {
          if (left < EPS) break;
          const lots = stocks[index];
          const stored = lots.reduce((sum, lot) => sum + (lot.storage === category.storage ? lot.kg : 0), 0);
          const space = inputs.free[index][category.storage] - stored;
          const usable = fit ? useBefore(lots, expires, day, inputs.demand[index]) : Infinity;
          const amount = Math.min(left, Math.max(0, Math.min(space, usable)));
          if (amount <= EPS) continue;
          lots.push({kind: offer.kind, storage: category.storage, expires, kg: amount});
          total.kg_received += amount;
          left -= amount;
          if (index !== offer.home) {
            today.kg_redirected += amount;
            total.transfers++;
            total.redirect_kg_km += km * amount;
            break;
          }
        }
        if (policy === "accept_all_stress_test") {
          total.kg_received += left;
          today.kg_wasted_at_agency += left;
        } else today.kg_unallocated += left;
      }
      stocks = stocks.map((lots, index) => {
        let capacity = inputs.demand[index] * stream.realized[i][index];
        // Equal deadlines use the dry/fridge/freezer insertion order of the reference model.
        const order = Object.keys(STORAGE);
        const queue = lots.slice().sort((a, b) => a.expires - b.expires || order.indexOf(a.storage) - order.indexOf(b.storage));
        for (const lot of queue) {
          if (capacity < EPS) break;
          const used = Math.min(lot.kg, capacity);
          lot.kg -= used;
          capacity -= used;
          today.kg_used += used;
          const coefficient = factors.categories[lot.kind] ?? {};
          if (coefficient.co2e_per_kg != null) {
            total.co2e_kg += used * coefficient.co2e_per_kg;
            total.kg_with_co2e_factor += used;
          }
          if (coefficient.cad_per_kg != null) {
            total.cad += used * coefficient.cad_per_kg;
            total.kg_with_cad_factor += used;
          }
        }
        return lots.filter((lot) => lot.kg > EPS);
      });
      today.kg_remaining = stocks.reduce((sum, lots) => sum + lots.reduce((kg, lot) => kg + lot.kg, 0), 0);
      for (const metric of Object.keys(today)) if (metric !== "kg_remaining") total[metric] += today[metric];
      total.kg_remaining = today.kg_remaining;
      daily.push(today);
    }
    total.meals = total.kg_used / factors.kg_per_meal;
    const accounted = total.kg_used + total.kg_unallocated + total.kg_remaining + total.kg_wasted_at_agency;
    if (Math.abs(total.kg_offered - accounted) > 1e-6) throw new Error("Mass balance failed during simulation.");
    return {total, daily};
  }

  const round4 = (value) => Math.round(value * 10000) / 10000;
  const average = (entries) => entries.reduce((sum, value) => sum + value, 0) / entries.length;

  function interval(entries) {
    const ordered = entries.slice().sort((a, b) => a - b);
    function percentile(q) {
      const index = (ordered.length - 1) * q;
      const left = Math.floor(index);
      return ordered[left] + (ordered[Math.min(left + 1, ordered.length - 1)] - ordered[left]) * (index - left);
    }
    return {mean: round4(average(entries)), p05: round4(percentile(.05)), p95: round4(percentile(.95))};
  }

  function createRunner(fixtures, parameters) {
    const settings = {...fixtures.config, ...parameters};
    const ints = {days: [1, 60], donors: [1, 150], seeds: [1, 200], seed_start: [0, 4294967095]};
    const decimals = {offer_scale: [.1, 4], use_share: [0, 1], confirmation: [0, 1], radius_km: [0, 300], use_uncertainty: [0, 1]};
    for (const [key, [min, max]] of Object.entries({...ints, ...decimals})) {
      const value = settings[key];
      if (!Number.isFinite(value) || value < min || value > max || (key in ints && !Number.isInteger(value))) {
        throw new Error(key + " must be between " + min + " and " + max + ".");
      }
    }
    if (!["pei", "uniform"].includes(settings.mix)) throw new Error("Choose an offer mix.");
    const inputs = createInputs(fixtures, settings);
    const outcomes = Object.fromEntries(POLICIES.map((policy) => [policy, []]));
    let completed = 0;
    function step(count) {
      for (let i = 0; i < count && completed < settings.seeds; i++, completed++) {
        const stream = offerStream(settings, settings.seed_start + completed, inputs, fixtures.agencies.length);
        for (const policy of POLICIES) outcomes[policy].push(runPolicy(stream, inputs, fixtures.factors, settings, policy));
      }
      return completed;
    }

    function finish() {
      if (completed !== settings.seeds) throw new Error("The requested runs have not finished.");
      const uncertainty = {};
      for (const policy of POLICIES) uncertainty[policy] = Object.fromEntries(METRICS.map((metric) =>
        [metric, interval(outcomes[policy].map((run) => run.total[metric]))]));
      function pairedDelta(metric, first, second) {
        return interval(outcomes[first].map((run, i) => run.total[metric] - outcomes[second][i].total[metric]));
      }
      uncertainty.paired_delta = {
        kg_used_increase: pairedDelta("kg_used", "rescuefit", "baseline"),
        kg_used_increase_over_fit_only: pairedDelta("kg_used", "rescuefit", "fit_only"),
        kg_wasted_at_agency_reduction: pairedDelta("kg_wasted_at_agency", "baseline", "rescuefit"),
        kg_unallocated_reduction: pairedDelta("kg_unallocated", "baseline", "rescuefit"),
        kg_wasted_plus_unallocated_reduction: interval(outcomes.baseline.map((run,i)=>
          run.total.kg_wasted_at_agency + run.total.kg_unallocated -
          outcomes.rescuefit[i].total.kg_wasted_at_agency - outcomes.rescuefit[i].total.kg_unallocated)),
      };
      const daily = Array.from({length: settings.days}, (_, i) => {
        const row = {day: i + 1, offered_kg: round4(average(outcomes.baseline.map((run) => run.daily[i].kg_offered)))};
        for (const policy of POLICIES) for (const [alias, metric] of Object.entries(DAILY)) {
          row[policy + "_" + alias + "_kg"] = round4(average(outcomes[policy].map((run) => run.daily[i][metric])));
        }
        return row;
      });
      const result = {model_version: 2, data_status: "synthetic_scenario_not_measured",
        days: settings.days, donors: settings.donors, agencies: fixtures.agencies.length,
        seeds: settings.seeds, seed_start: settings.seed_start, settings, daily, uncertainty,
        kg_per_meal: fixtures.factors.kg_per_meal, assumptions: fixtures.reference.assumptions, replay: {}};
      for (const policy of POLICIES) {
        result[policy] = Object.fromEntries(METRICS.map((metric) => [metric, uncertainty[policy][metric].mean]));
        result.replay[policy] = outcomes[policy][0].daily.map((row) =>
          Object.fromEntries(Object.entries(row).map(([key, value]) => [key, round4(value)])));
      }
      return result;
    }
    return {step, finish};
  }

  const api = {createRunner, distanceKm, POLICIES};
  root.RescueSim = api;
  if (typeof module !== "undefined") module.exports = api;
}(globalThis));
