"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const S = require("../demo/simulation.js");
const D = require("../demo/decision.js");

const root = path.resolve(__dirname,"..");
const artifacts = {config:"scenario_config",agencies:"agencies",shelf:"shelf_life",
  factors:"impact_factors",evidence:"pei_evidence",reference:"scenario_results",kitchen:"kitchen_demo"};
const fixtures = Object.fromEntries(Object.entries(artifacts).map(([key,name])=>
  [key,JSON.parse(fs.readFileSync(path.join(root,"model/data",name+".json"),"utf8"))]));
fixtures.register = JSON.parse(fs.readFileSync(path.join(root,"model/data/impac_register_audit.json"),"utf8")).shortlist;
const defaults = {radius:35,kgPerMeal:fixtures.factors.kg_per_meal,useShare:.3};
const sample = fixtures.kitchen.sample;

test("worked example respects physical custody and does not count a transfer as food used", () => {
  const [row] = D.plan([sample],fixtures.kitchen,fixtures.agencies,defaults).rows;
  assert.equal(row.kept,6);
  assert.equal(row.replaced,6);
  assert.equal(row.net,13);
  assert.equal(row.route.qty,6);
  const ledger = D.ledgerFor(row);
  assert.equal(D.evolve(ledger,row,"transfer"),null);
  const waiting = D.evolve(ledger,row,"confirm");
  assert.equal(waiting.pending,6);
  const moved = D.evolve(waiting,row,"transfer");
  assert.equal(moved.transferred,6);
  assert.equal(moved.used,0);
  assert.equal(D.evolve(moved,row,"transfer"),null);
  const prepared = D.evolve(moved,row,"use",4);
  assert.equal(D.evolve(prepared,row,"use",3),null);
  const ended = D.evolve(prepared,row,"discard",2);
  assert.equal(ended.kitchen,0);
  assert.equal(ended.used+ended.discarded+ended.transferred,ended.collected);
});

test("whole, partial, blocked and multiple lots preserve fit limits", () => {
  const offer = {...sample,stage:"offer",collected:0,may_split:false};
  const {kitchen,agencies}=fixtures;
  const whole=D.plan([offer],kitchen,agencies,defaults).rows[0];
  assert.equal(whole.kept,0);
  const partial=D.plan([{...offer,may_split:true}],kitchen,agencies,defaults).rows[0];
  assert.equal(partial.kept,6);
  assert.equal(D.evolve(D.ledgerFor(partial),partial,"pickup").collected,6);
  const blocked=D.plan([{...sample,reviewed:false}],kitchen,agencies,defaults).rows[0];
  assert.equal(blocked.unplaced,12);
  assert.equal(blocked.route,null);
  const two=D.plan([{...sample,id:"A",offered:4,collected:4},{...sample,id:"B",offered:4,collected:4}],
    {...kitchen,adjustable_purchases_kg:{root_veg:4}},agencies,defaults).rows;
  assert.equal(two[0].replaced+two[1].replaced,4);
  assert.equal(two[0].kept+two[1].kept,6);
});

test("counted text is held for weight and recognized mass units are normalized", () => {
  const result = D.parseText("12 kg carrots, 4 kg potatoes, 20 rolls\n500 g cheese\n2 lb apples",fixtures.shelf);
  assert.deepEqual(result.map(({category,offered})=>[category,offered]),
    [["root_veg",12],["potatoes",4],["bread",null],["cheese",.5],["fruit",.91]]);
});

// Day 1 reserves 6 kg. On day 2 the next lot requests 6 kg at the same recipient.
for (const [name, firstUseBy, firstStorage, fridgeSpace, dailyUse, expectedKg] of [
  ["a prior-day reservation releases fridge space", 1, "fridge", 6, 20, 6],
  ["a prior-day reservation releases shared prep capacity", 1, "dry", 20, 6, 6],
  ["a reservation due on arrival still occupies its fridge space", 2, "fridge", 8, 20, 2],
  ["a reservation due on arrival still uses prep across storage types", 2, "dry", 20, 8, 2],
]) {
  test(name, () => {
    const kitchen = {...fixtures.kitchen, services: []};
    const origin = fixtures.agencies.find((agency) => agency.id === kitchen.origin_id);
    const space = {fridge: fridgeSpace, dry: 20};
    const recipient = {...origin, id: "recipient", free_kg: space, capacity_kg: space, meals_per_day: dailyUse};
    const lot = {...sample, offered: 6, collected: 6};
    const lots = [
      {...lot, id: "first", arrival: 1, use_by: firstUseBy, storage: firstStorage},
      {...lot, id: "next", arrival: 2, use_by: 2, storage: "fridge"},
    ];
    const settings = {...defaults, useShare: 1, kgPerMeal: 1};
    const [first, next] = D.plan(lots, kitchen, [origin, recipient], settings).rows;
    assert.equal(first.route?.qty, 6);
    assert.equal(next.route?.qty, expectedKg);
    assert.equal(next.unplaced, 6 - expectedKg);
  });
}

test("the live engine reproduces the published Python run and responds to confirmation", () => {
  const cases = S.createRunner(fixtures,{});
  cases.step(fixtures.config.seeds);
  const live = cases.finish();
  for (const policy of S.POLICIES) {
    assert.deepEqual(live[policy], fixtures.reference[policy]);
    assert.deepEqual(live.replay[policy], fixtures.reference.replay[policy]);
  }
  assert.deepEqual(live.daily,fixtures.reference.daily);
  for (const [key,value] of Object.entries(live.uncertainty.paired_delta)) {
    assert.deepEqual(value,fixtures.reference.uncertainty.paired_delta[key]);
  }
  const off = S.createRunner(fixtures,{confirmation:0,seeds:6});
  off.step(6);
  const result = off.finish();
  assert.equal(result.rescuefit.kg_redirected,0);
  assert.equal(result.rescuefit.kg_used,result.fit_only.kg_used);
  assert.equal(result.rescuefit.kg_offered,result.baseline.kg_offered);
});

test("generated workspace starts and completes the sample path without an external request", () => {
  const html = fs.readFileSync(path.join(root,"demo/index.html"),"utf8");
  const tabs = ["intake","fit","network","plan","impact","evidence"];
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  const listeners={}, nodes={};
  for (const id of ["main","navigation","notice","facility"]) nodes[id]={innerHTML:"",textContent:"",focus(){}};
  nodes.fixtures={textContent:scripts.find(([,attrs])=>attrs.includes('id="fixtures"'))[2]};
  const storage=new Map();
  const background=[];
  const sandbox={document:{getElementById:(id)=>nodes[id]??null,activeElement:null,
    querySelectorAll:()=>[],querySelector:()=>null,
    body:{addEventListener:(name,fn)=>{listeners[name]=fn;}}},
    localStorage:{getItem:(key)=>storage.get(key),setItem:(key,value)=>{storage.set(key,value);}},
    location:{hash:""},history:{replaceState(_data,_title,hash){sandbox.location.hash=hash;}},
    Intl,structuredClone,clearTimeout:()=>{},setTimeout:(fn,delay)=>{if(delay===0)background.push(fn);return 0;},
    fetch:()=>{throw new Error("The offline demo attempted a network request.");}};
  sandbox.window=sandbox;
  sandbox.scrollTo=()=>{};
  sandbox.addEventListener=()=>{};
  vm.createContext(sandbox);
  for (const [,attrs,code] of scripts) if (!attrs.includes('application/json')) vm.runInContext(code,sandbox);
  const click=(action,arg)=>listeners.click({target:{closest:()=>({dataset:{action,arg},disabled:false})}});
  for (const tab of tabs) {
    click("go",tab);
    assert.match(nodes.main.innerHTML,/<h1>[^<]+<\/h1>/);
  }
  click("go","plan");
  click("approve");
  click("go","network");
  assert.match(nodes.main.innerHTML,/Pending confirmation/);
  click("event-confirm");
  assert.match(nodes.main.innerHTML,/awaiting handoff/);
  click("event-transfer");
  assert.match(nodes.main.innerHTML,/Transferred 6 kg/);
  assert.match(nodes.main.innerHTML,/Reported use remains 0 kg/);
  click("go","plan");
  listeners.input({target:{dataset:{setting:"event-kg"},value:"4"}});
  click("event-use");
  assert.match(nodes.main.innerHTML,/Used in prep 4 kg/);
  const data=JSON.parse(storage.values().next().value);
  assert.equal(data.ledgers[sample.id].used,4);
  click("go","impact");
  click("preset","no_redirect");
  click("run");
  while(background.length) background.shift()();
  assert.match(nodes.main.innerHTML,/Browser run/);
  assert.match(nodes.main.innerHTML,/Additional use from redirects<\/small><strong>0 kg/);
});
