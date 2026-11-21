(function startWorkspace() {
  "use strict";

  const fixtures = JSON.parse(document.getElementById("fixtures").textContent);
  const D = window.RescueDecision;
  const S = window.RescueSim;
  const P = window.RescuePlots;
  const main = document.getElementById("main");
  const nav = document.getElementById("navigation");
  // v3: the lab hides the intake, fit, redirect and plan views, so visitors cannot
  // change saved lots. A new key makes every browser start from the example.
  const saveKey = "rescuefit-pei-v3-lab";
  const STEPS = [
    ["intake","Intake","↳"],["fit","Kitchen fit","▤"],["network","Redirect map","⟷"],
    ["plan","Use-first plan","◷"],["impact","Impact lab","▥"],["evidence","Data sources","◉"],
  ];
  const STORAGE = {fridge:"Refrigerated",freezer:"Frozen",dry:"Dry"};
  const policyIds = ["baseline","fit_only","rescuefit"];
  const ledgerFields = [
    ["kitchen","Kitchen stock"],["pending","Pending handoff"],["transferred","Transferred"],
    ["used","Used in prep"],["discarded","Discarded"],["unplaced","Held without destination"],
  ];
  const eventNames = {pickup:"Recorded collection",confirm:"Recipient confirmed",transfer:"Recorded handoff",
    release:"Released pending handoff",use:"Recorded preparation use",discard:"Recorded discard"};
  const n = new Intl.NumberFormat("en-CA",{maximumFractionDigits:2});
  const num = (value) => n.format(value);
  const kg = (value) => num(value) + " kg";
  const dollars = new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"});
  const money = (value) => dollars.format(value);
  const signed = (value) => (value>0 ? "+" : value<0 ? "−" : "") + num(Math.abs(value));
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
  const blank = (message) => '<p class="inline-alert">' + esc(message) + "</p>";
  const chip = (label,color="") => '<span class="chip '+color+'">'+esc(label)+"</span>";
  const btn = (label,action,options={}) => '<button type="button" class="btn '+(options.style||"")+
    '" data-action="'+action+'"'+(options.arg==null?"":' data-arg="'+esc(options.arg)+'"')+
    (options.disabled?" disabled":"")+'> '+esc(label)+"</button>";
  const go = (label, target, style="") => btn(label, "go", {arg:target,style});
  const input = (label, value, attrs="", type="number") =>
    '<label class="field"><span>'+esc(label)+'</span><input type="'+type+'" value="'+esc(value)+'" '+attrs+'></label>';
  function select(label, value, options, attrs="") {
    return '<label class="field"><span>'+esc(label)+'</span><select '+attrs+'>'+
      Object.entries(options).map(([key,title]) => '<option value="'+esc(key)+'"'+(String(value)===key?" selected":"")+
        '>'+esc(title)+'</option>').join("")+"</select></label>";
  }
  function checkbox(label, checked, attrs) {
    return '<label class="checkbox"><input type="checkbox" '+attrs+(checked?" checked":"")+'><span>'+esc(label)+'</span></label>';
  }
  function card(title, body, subtitle="", className="") {
    return '<section class="card '+className+'"><div class="card-head"><div><h2>'+esc(title)+'</h2>'+
      (subtitle?'<p class="subheading">'+esc(subtitle)+'</p>':"")+'</div></div>'+body+"</section>";
  }
  function metric(label, value, detail="", primary=false) {
    return '<div class="metric '+(primary?"primary":"")+'"><small>'+esc(label)+'</small><strong>'+esc(value)+
      '</strong>'+(detail?'<p class="detail">'+esc(detail)+'</p>':"")+"</div>";
  }
  function rowList(rows) {
    return '<ul class="list">'+rows.map(([key,value]) =>
      '<li><span>'+esc(key)+'</span><strong class="number">'+esc(value)+"</strong></li>").join("")+"</ul>";
  }
  function table(headers, rows, caption) {
    return '<div class="table-wrap"><table><caption class="sr-only">'+esc(caption)+'</caption><thead><tr>'+
      headers.map((head)=>'<th scope="col">'+esc(head)+"</th>").join("")+
      "</tr></thead><tbody>"+rows.map(([label,...cells])=>'<tr><th scope="row">'+esc(label)+'</th>'+
        cells.map((value)=>'<td>'+esc(value)+"</td>").join("")+"</tr>").join("")+"</tbody></table></div>";
  }
  const stepIndex = Object.fromEntries(STEPS.map(([id],i)=>[id,i]));
  // The RescueFit app at / already covers intake, fit, redirect and plan, so the lab
  // shows only its own two steps. The other views stay in the code because the
  // page tests drive the decision engine through them.
  const SHOWN = ["impact","evidence"];
  const fromHash = () => SHOWN.includes(location.hash.slice(1)) ? location.hash.slice(1) : "impact";

  function freshState() {
    return {version:2,kitchen:structuredClone(fixtures.kitchen),lots:[structuredClone(fixtures.kitchen.sample)],
      selected:"DEMO-001",radius:35,closed:[],routeOverrides:{},approved:null,ledgers:{},events:[],
      openLots:["DEMO-001"],note:"12 kg carrots",nextLot:2};
  }
  function restore() {
    try {
      const stored = JSON.parse(localStorage.getItem(saveKey));
      if (stored?.version===2 && Array.isArray(stored.lots) && stored.kitchen?.services?.length) return stored;
    } catch {}
    return freshState();
  }
  let state=restore();
  let page=fromHash();
  let photo=null;
  let toastTimer=0;
  let fitData=null;
  let settings={...fixtures.config};
  let latest=fixtures.reference;
  let scenarioName="Reference run";
  let simulation=null;
  let completed=0;
  let tabMetric="used";
  let replay=false;
  let replayDay=1;
  let timer=null;
  let climate={factor:"",path:""};
  let eventKg="";
  const openPanels=new Set();

  const save = () => {try {localStorage.setItem(saveKey,JSON.stringify(state));} catch {}};
  function announce(message) {
    document.getElementById("notice").textContent=message;
    window.clearTimeout(toastTimer);
    toastTimer=window.setTimeout(()=>{document.getElementById("notice").textContent="";},4800);
  }

  function recompute() {
    fitData=state.approved || D.plan(state.lots,state.kitchen,fixtures.agencies,{
      radius:state.radius,kgPerMeal:fixtures.factors.kg_per_meal,useShare:fixtures.config.use_share,
      routeOverrides:state.routeOverrides,closed:state.closed,
    });
    if (!fitData.rows.some((row)=>row.lot.id===state.selected)) state.selected=fitData.rows[0]?.lot.id ?? "";
  }
  const selectedRow = () => fitData.rows.find((row)=>row.lot.id===state.selected);
  const total = (key) => D.mass(fitData.rows.reduce((sum,row)=>sum+(row[key]||0),0));
  const currentLedger = (row) => state.ledgers[row.lot.id] || D.ledgerFor(row);

  function hero(label,title,copy,detail="") {
    return '<section class="mast"><div><span class="eyebrow">'+esc(label)+'</span><h1>'+esc(title)+
      '</h1><p>'+esc(copy)+'</p></div>'+detail+"</section>";
  }
  function ticket(value, subtitle, id="") {
    return '<div class="lot-ticket"><small>'+esc(id)+'</small><strong>'+esc(value)+'</strong><span>'+
      esc(subtitle)+'</span><div class="ticket-bars" aria-hidden="true"></div></div>';
  }
  function workflow() {
    if (stepIndex[page]>3) return "";
    return '<div class="workflow" aria-label="Decision sequence">'+STEPS.slice(0,4).map(([id,label],i)=>
      (i?'<span class="step-arrow" aria-hidden="true">→</span>':"")+
      '<button type="button" class="step '+(stepIndex[page]>i?"done":"")+'" data-action="go" data-arg="'+id+'"'+
      (page===id?' aria-current="step"':"")+">"+esc(label)+"</button>").join("")+"</div>";
  }
  function chooseLot() {
    return fitData.rows.length>1 ? '<div class="actions lot-picker">'+select("Inspect lot",state.selected,
      Object.fromEntries(fitData.rows.map(({lot})=>[lot.id,lot.id+" · "+lot.name])), 'data-setting="selected"')+"</div>" : "";
  }
  function numFields(attrs,min=0,max=500,step=".01") {
    return ' min="'+min+'" max="'+max+'" step="'+step+'" '+attrs;
  }
  function editLot(lot) {
    const locked=state.approved?" disabled":"";
    const attr=(key) => 'data-field="'+key+'" data-lot="'+esc(lot.id)+'"'+locked;
    const label=lot.offered>0?kg(lot.offered)+" offered":"Weight required";
    const isOpen=state.openLots.includes(lot.id);
    return '<details class="intake-row" data-detail="'+esc(lot.id)+'"'+(isOpen?" open":"")+
      '><summary><span>'+esc(lot.name)+' <small class="row-meta">'+esc(lot.id)+'</small></span><small class="row-meta">'+
      esc(label)+'</small></summary><div class="field-grid">'+
      input("Food",lot.name,attr("name")+' maxlength="70"',"text")+
      select("Ingredient",lot.category,{"":"Choose ingredient",...D.categoryLabels},attr("category"))+
      input("Offered kg",lot.offered??"",numFields(attr("offered"),.01))+
      select("Custody",lot.stage,{collected:"Already collected",offer:"Offer before pickup"},attr("stage"))+
      (lot.stage==="collected"?input("Collected kg",lot.collected??"",numFields(attr("collected"),0,lot.offered||500)):"")+
      select("Storage",lot.storage,{"":"Choose storage",...STORAGE},attr("storage"))+
      input("Arrival day",lot.arrival??"",numFields(attr("arrival"),1,7,1))+
      input("Reviewed use-by day",lot.use_by??"",numFields(attr("use_by"),1,7,1))+
      input("Adjustable price, CAD/kg",lot.price,numFields(attr("price"),0,250))+
      input("Added handling, CAD",lot.handling_cost,numFields(attr("handling_cost"),0,1000))+
      '</div><div class="checklist">'+checkbox("I checked the weight, storage history and this use window.",lot.reviewed,attr("reviewed"))+
      (lot.stage==="offer"?checkbox("Donor allows a partial pickup",lot.may_split,attr("may_split")):
        checkbox("This collected lot can be shared onward",lot.may_redirect,attr("may_redirect")))+
      '</div>'+(!state.approved?'<div class="actions">'+btn("Remove lot","remove-lot",{arg:lot.id,style:"quiet small"})+'</div>':"")+
      (lot.quantity_note?'<p class="form-hint">'+esc(lot.quantity_note)+'. Enter the measured edible weight.</p>':"")+'</details>';
  }

  function intake() {
    const row=selectedRow();
    const label=row?.lot.name || "Incoming lot";
    const draft=state.approved ? '<p class="inline-good">Plan saved. Outcome actions are available on Redirect map and Use-first plan.</p>' : "";
    const photoMarkup = photo ? '<img id="photo-preview" class="photo-preview" src="'+esc(photo.url)+
      '" alt="Attached donation label or item"><div class="actions">'+btn("Read printed label","read-label",{style:"quiet small"})+
      btn("Remove photo","remove-photo",{style:"quiet small"})+"</div>" : "";
    const left=card("Donor message",
      '<label class="field" for="donor-message"><span>Food and quantity</span></label><textarea id="donor-message" maxlength="900" '+
      (state.approved?"disabled ":"")+'placeholder="12 kg carrots, 4 kg potatoes, 20 rolls">'+esc(state.note)+
      '</textarea><div class="actions">'+btn("Parse message","parse",{disabled:!!state.approved})+
      btn("Mixed offer example","sample-text",{style:"quiet",disabled:!!state.approved})+
      '</div><div class="file-pane"><label class="field"><span>Attach a photo of the item or label</span>'+
      '<input type="file" id="photo-input" accept="image/jpeg,image/png,image/webp" '+(state.approved?"disabled":"")+
      '></label>'+photoMarkup+'<div class="form-hint">Review any label text and enter the actual storage and use window.</div></div>',
      "Use kg, g, lb or a count. Counts need a measured weight.");
    const right=card("Receiving capacity",'<div class="stat-list">'+Object.entries(STORAGE).map(([key,title])=>
      '<div><small>'+title+'</small><strong>'+kg(state.kitchen.ready_storage[key])+"</strong></div>").join("")+
      '</div>'+rowList([["Planning window","3 days"],["Approved recipe entries",state.kitchen.services.length]])+
      '<p class="subheading">Update space, stock, prep budget and adjustable purchases on Kitchen fit.</p>'+
      '<div class="actions">'+go("Check kitchen fit","fit")+'</div>',
      "Sample kitchen inputs");
    return hero("Intake","Review a donation","Turn the donor’s message into a weighing and review list.",
      ticket(row?.lot.offered?kg(row.lot.offered):"Draft",label,row?.lot.id||"Intake"))+workflow()+draft+
      '<div class="dashboard two"><div class="stack">'+left+
      card("Review lot details",'<div class="ticket-list">'+state.lots.map(editLot).join("")+
        (!state.lots.length?blank("There are no lots in this intake. Parse a message or add an item."):"")+
        '</div><div class="actions">'+btn("Add an item","add-lot",{style:"quiet",disabled:!!state.approved})+
        go("Check kitchen fit","fit")+"</div>")+'</div><div class="stack">'+right+
      card("What happens next?",'<p class="muted">The fit check matches the reviewed quantities to meals and preparation capacity. A collected surplus stays in the lot ledger until its next outcome is recorded.</p>')+
      "</div></div>";
  }

  function balanced(ledger) {
    return D.mass(ledgerFields.reduce((sum,[key])=>sum+ledger[key],0));
  }
  function ledgerCard(row) {
    const ledger=currentLedger(row);
    const used=balanced(ledger);
    const shown=ledgerFields.filter(([key])=>ledger[key]>0);
    return '<section class="card lot-ledger"><div class="card-head"><div><h2>Lot ledger</h2><p class="subheading">'+
      esc(row.lot.id+" · "+row.lot.name)+(state.approved?" · saved plan":" · draft allocation")+
      '</p></div><span class="balance">'+kg(used)+' / '+kg(ledger.collected)+'</span></div>'+
      '<div class="bar lot-bar" aria-hidden="true">'+shown.map(([key])=>'<i class="segment seg-'+key+'" style="width:'+
      (100*ledger[key]/ledger.collected)+'%"></i>').join("")+
      '</div><div class="ledger-items">'+shown.map(([key,title])=>'<span><i class="swatch seg-'+key+'"></i>'+
      esc(title)+" "+kg(ledger[key])+"</span>").join("")+
      (!shown.length?'<span>Collection pending · '+kg(row.lot.offered)+' offered</span>':"")+
      '</div><p class="subheading">'+(ledger.collected===used?"Collected weight balances.":"Review recorded weights.")+
      (row.lot.stage==="offer"?" Donor-side quantity after proposed pickup: "+kg(Math.max(0,row.offered-row.kept))+".":"")+
      "</p></section>";
  }

  function fit() {
    const row=selectedRow();
    if (!row) return hero("Kitchen fit","Check what fits","Add a lot to start the meal and storage comparison.")+
      workflow()+go("Back to intake","intake");
    const locked = state.approved ? " disabled" : "";
    const catName = D.categoryLabels[row.lot.category] || "Selected ingredient";
    const storage = Object.entries(STORAGE).map(([key,title]) =>
      input(title+" free kg",state.kitchen.ready_storage[key],numFields('data-space="'+key+'"'+locked))).join("");
    const categoryFields = Object.hasOwn(D.categoryLabels,row.lot.category) ?
      input(catName+" on hand, kg",state.kitchen.starting_stock[row.lot.category]||0,
        numFields('data-stock="'+esc(row.lot.category)+'"'+locked))+
      input("Uncommitted "+catName.toLowerCase()+", kg",state.kitchen.adjustable_purchases_kg[row.lot.category]||0,
        numFields('data-buy="'+esc(row.lot.category)+'"'+locked)) : "";
    const prepFields = state.kitchen.prep_kg.map((value,i)=>
      input("Day "+(i+1)+" prep kg",value,numFields('data-prep="'+i+'"'+locked))).join("");
    const decisionRows=fitData.rows.map((r)=>[r.lot.name,r.action,kg(r.kept),kg(r.route?.qty||0),kg(r.replaced)]);
    const serviceRows=fitData.needs.filter((cell)=>cell.category===row.lot.category);
    const need = serviceRows.reduce((sum,cell)=>sum+cell.need,0);
    const usedStock = serviceRows.reduce((sum,cell)=>sum+cell.onHand,0);
    return hero("Kitchen fit","Check what fits","Match each reviewed lot to the three-day meal plan, available storage and prep capacity.",
      ticket(kg(total("kept")),"proposed for the kitchen","Across this intake"))+workflow()+chooseLot()+
      '<div class="metrics">'+metric("Kitchen allocation",kg(total("kept")),"Draft meal assignments",true)+
      metric("Suggested transfer",kg(D.mass(fitData.rows.reduce((sum,r)=>sum+(r.route?.qty||0),0))),"Recipient review required")+
      metric("Adjustable purchases",kg(total("replaced")),"Proposed reduction")+
      metric("Net purchase change",money(total("net")),"Illustrative prices and handling")+"</div>"+
      '<div class="dashboard two"><div class="stack">'+ledgerCard(row)+
      card("Decision for "+row.lot.name,chip(row.action,row.eligible?"":"amber")+
        '<p class="formula">'+kg(need)+' needed − '+kg(usedStock)+' available stock = '+kg(Math.max(0,need-usedStock))+' meal gap</p>'+
        '<p class="muted">'+esc(row.reason)+'</p>'+
        (row.allocation.length?rowList(row.allocation.map((x)=>["Day "+x.day+" · "+x.name,kg(x.qty)])):"")+
        '<div class="actions">'+go("Review redirect options","network")+go("View meal plan","plan","quiet")+"</div>")+
      card("All lot decisions",table(["Food","Decision","Keep","Propose onward","Buy less"],decisionRows,"Lot decisions"))+
      '</div>'+card("Change the kitchen inputs",'<div class="field-grid">'+storage+categoryFields+prepFields+
        '</div><p class="subheading">Prep budgets limit how much donated food can be prepared each day.</p>'+
        '<details class="timeline" data-panel="portions"'+(openPanels.has("portions")?" open":"")+'><summary>Adjust portions for planned services</summary><div class="field-grid">'+
        state.kitchen.services.map((service)=>input(service.name,service.portions,numFields(
          'data-service="'+esc(service.id)+'"'+locked,0,300,1))).join("")+'</div></details>'+
        '<div class="actions">'+go("Edit intake","intake","quiet")+
        (state.approved&&!state.events.length?btn("Reopen draft","reopen",{style:"quiet"}):"")+"</div>",
        state.approved?"This plan is saved.":"Recommendations update when inputs change.")+"</div>";
  }

  function network() {
    const row=selectedRow();
    if (!row) return hero("Redirect map","Place the surplus","Review at least one lot first.")+workflow()+go("Open intake","intake");
    const ledger=currentLedger(row);
    const list=row.potential.filter((x)=>!state.closed.includes(x.id)).slice(0,10);
    const routeExists=!!row.route;
    const selected=routeExists?row.route:null;
    const routeRows=list.map((r)=>'<button type="button" class="route-card" data-action="pick-route" data-arg="'+esc(r.id)+
      '" aria-pressed="'+(r.id===selected?.id)+'"'+(state.approved?" disabled":"")+'><strong>'+esc(r.name+' · '+r.town)+
      '</strong><small>'+kg(r.qty)+' assignable · '+num(r.km)+' km straight line</small></button>').join("");
    let actions="";
    if (state.approved && ledger.pending>0) {
      actions=btn(ledger.confirmed?"Record simulated handoff":"Simulate recipient confirmation",
        ledger.confirmed?"event-transfer":"event-confirm")+btn("Release handoff","event-release",{style:"amber"});
    } else if (!state.approved && selected) {
      actions=btn("Mark this recipient unavailable","close-route",{arg:selected.id,style:"quiet"})+
        go("Review and save plan","plan");
    } else if (!state.approved) actions=go("Continue to meal plan","plan");
    const badge=ledger.transferred>0?chip("Simulated handoff recorded","blue"):ledger.released?chip("Handoff released","amber"):
      ledger.confirmed?chip("Confirmed · awaiting handoff","blue"):ledger.pending>0?chip("Pending confirmation","amber"):chip("No handoff queued");
    return hero("Redirect map","Find room for the surplus","Rank modeled receiving sites by distance after checking space and use capacity.",
      ticket(row.surplus?kg(row.surplus):"0 kg","available for review",row.lot.id))+workflow()+chooseLot()+
      '<div class="dashboard two"><div class="stack">'+
      card("PEI receiving sites",'<div class="map-frame"><canvas id="map-canvas" role="img" aria-label="Schematic of 22 modeled PEI receiving sites. The recipient list provides the same choices."></canvas></div>'+
        '<p class="subheading">Square: starting kitchen. Green circles: possible receiving sites for this lot. The dashed segment shows straight-line distance.</p>'+
        '<div class="actions">'+input("Search radius, km",state.radius,numFields('data-setting="radius"'+(state.approved?" disabled":""),0,150,1))+
        (state.closed.length&&!state.approved?btn("Restore modeled availability","restore-routes",{style:"quiet"}):"")+"</div>",
        "Positions use approximate town centres. All receiving sites and capacities are modeled.")+ledgerCard(row)+
      '</div><div class="stack">'+card("Onward decision",badge+
        (selected?rowList([["Selected site",selected.name],["Town",selected.town],["Available to place",kg(selected.qty)],
          ["Straight-line distance",num(selected.km)+" km"]]):blank(row.lot.stage==="offer"?
          "Record collection before suggesting an onward handoff.":row.surplus?
          "No modeled recipient fits the current review, window and radius.":"The kitchen has no collected surplus for this lot."))+
        '<div class="actions">'+actions+"</div>"+
        (state.approved&&ledger.transferred>0?'<p class="form-hint">Reported use remains '+kg(ledger.used)+' until preparation is recorded.</p>':""))+
      card("Possible recipients",'<div class="route-list">'+(routeRows||'<p class="muted">No candidates for the selected lot.</p>')+'</div>',
        "Select a site to see its proposed quantity.")+"</div></div>";
  }

  function shopping() {
    const planned=Object.entries(state.kitchen.adjustable_purchases_kg).filter(([,amount])=>amount>0);
    return planned.map(([category,qty])=>{
      const replaced=D.mass(fitData.rows.filter((r)=>r.lot.category===category).reduce((sum,r)=>sum+r.replaced,0));
      return [D.categoryLabels[category],kg(qty),kg(replaced),kg(Math.max(0,D.mass(qty-replaced)))];
    });
  }
  function planView() {
    const row=selectedRow();
    if (!row) return hero("Use-first plan","Prepare a meal plan","Review at least one lot first.")+workflow()+go("Open intake","intake");
    const ledger=currentLedger(row);
    const menu='<div class="service-grid">'+[1,2,3].map((day)=>'<div class="day-panel"><h3>Day '+day+'</h3>'+
      state.kitchen.services.filter((s)=>s.day===day).map((service)=>{
        const allocations=fitData.rows.flatMap((r)=>r.allocation.filter((a)=>a.service_id===service.id)
          .map((a)=>r.lot.name+" "+kg(a.qty)));
        return '<div class="service-line"><strong>'+esc(service.name)+'</strong><span class="tiny muted">'+
          service.portions+' planned portions</span><p class="tiny">'+esc(allocations.length?allocations.join(" · "):"Use planned stock and purchases")+
          "</p></div>";
      }).join("")+'</div>').join("")+"</div>";
    const next=state.approved ? '<p class="inline-good">Plan saved in this browser.</p>'+
      '<div class="actions">'+btn("Export decision and ledger","ledger-download",{style:"quiet"})+go("Open impact lab","impact")+'</div>'
      : '<div class="actions">'+btn("Save demo plan","approve",{disabled:state.lots.some((lot)=>!validLot(lot))})+
        go("Review redirect map","network","quiet")+'</div>';
    const outcomes=state.approved?
      card("Record lot outcomes",(row.lot.stage==="offer"&&!ledger.pickedUp&&row.kept>0?
        btn("Record simulated pickup · "+kg(row.kept),"event-pickup"):"")+
        (ledger.pending>0?'<div class="actions">'+go("Complete a handoff","network","quiet")+"</div>":"")+
        '<div class="actions">'+input("Quantity to record, kg",eventKg,numFields('data-setting="event-kg"',.01))+
        btn("Record prep use","event-use",{disabled:ledger.kitchen<=0})+
        btn("Record discard","event-discard",{style:"amber",disabled:ledger.unplaced+ledger.kitchen<=0})+
        '</div>'+rowList([["Used in preparation",kg(ledger.used)],["Discard recorded",kg(ledger.discarded)],["Still allocated in kitchen",kg(ledger.kitchen)]]),
        "Record what took place for "+row.lot.id+"."):card("Review before saving",
          rowList([["Kitchen allocation",kg(total("kept"))],["Reduce planned purchases by",kg(total("replaced"))],
            ["Indicative purchase benefit",money(total("net"))]])+
          '<p class="subheading">Replace adjustable purchases only after staff confirm the receipt and quantity.</p>');
    return hero("Use-first plan","Put the food on the menu","Schedule the earliest reviewed lots and keep a separate record of actual outcomes.",
      ticket(kg(total("replaced")),"less on the proposed list","Adjustable purchases"))+workflow()+chooseLot()+
      '<div class="dashboard"><div class="stack">'+card("Three-day prep plan",menu+next)+
      '<div class="dashboard two equal">'+card("Shopping adjustments",table(["Ingredient","Planned","Replace","Still to buy"],shopping(),
        "Adjustable purchase changes"),"Quantities show the saved or draft decision.")+outcomes+
      '</div>'+ledgerCard(row)+
      (state.events.length?card("Event log",table(["Event","Lot","Weight","Recorded"],state.events.slice(-16).reverse().map((e)=>
        [eventNames[e.type],e.id,kg(e.kg),new Date(e.time).toLocaleTimeString()]),"Recorded demo events")):"")+"</div></div>";
  }

  function validLot(lot) {
    return lot.name.trim().length>0 && Number.isFinite(lot.offered) && lot.offered>=.01 && lot.offered<=500
      && (lot.stage!=="collected" || (Number.isFinite(lot.collected) && lot.collected>=0 && lot.collected<=lot.offered))
      && Number.isInteger(lot.arrival) && lot.arrival>=1 && lot.arrival<=7 && Number.isInteger(lot.use_by)
      && lot.use_by>=lot.arrival && lot.use_by<=7 && Number.isFinite(lot.price) && Number.isFinite(lot.handling_cost);
  }

  const presets = {
    reference:{label:"PEI reference",settings:{}},
    no_redirect:{label:"No alternates",settings:{confirmation:0}},
    more_food:{label:"High offers",settings:{offer_scale:1.55}},
    less_staff:{label:"Limited prep",settings:{use_share:.18,use_uncertainty:.45}},
  };
  const measures = {used:"Food used",waste:"Expired at kitchens",unallocated:"Unallocated",remaining:"On hand"};
  const replayKeys = {used:"kg_used",waste:"kg_wasted_at_agency",unallocated:"kg_unallocated",remaining:"kg_remaining"};

  function timelineRows() {
    if (!replay) return latest.daily.map((row)=>({day:row.day,...Object.fromEntries(
      policyIds.map((id)=>[id,row[id+"_"+tabMetric+"_kg"]]))}));
    return Array.from({length:latest.days},(_,i)=>({day:i+1,...Object.fromEntries(
      policyIds.map((id)=>[id,latest.replay[id][i][replayKeys[tabMetric]]]))}));
  }

  function policyMass() {
    const parts=[["kg_used","Used","used"],["kg_wasted_at_agency","Expired","waste"],
      ["kg_remaining","On hand","remain"],["kg_unallocated","Unallocated","unallocated"]];
    const bars=policyIds.map((id)=>{
      const data=latest[id];
      return '<div class="scenario-bar"><strong>'+P.TITLE[id]+'</strong><div class="bar" aria-hidden="true">'+parts.map(
        ([key,,color])=>'<i class="segment seg-'+color+'" style="width:'+((100*data[key]/(data.kg_offered||1)))+
        '%"></i>').join("")+'</div><small>'+parts.map(([key,label])=>label+" "+kg(data[key])).join(" · ")+"</small></div>";
    }).join("");
    return card("Where the offered food ended up",bars,"Mean across paired runs, kg per modeled period.");
  }

  function slider(key,label,min,max,step,unit,precision=1) {
    const value=settings[key]*precision;
    return '<label class="field"><span>'+label+' <strong id="val-'+key+'">'+num(value)+esc(unit)+
      '</strong></span><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+
      '" data-sim="'+key+'" data-factor="'+precision+'" data-unit="'+esc(unit)+'"'+(simulation?" disabled":"")+'></label>';
  }

  function scenarioControls() {
    const stale=Object.keys(fixtures.config).some((key)=>settings[key]!==latest.settings[key]);
    return card("Scenario controls",'<div class="actions">'+Object.entries(presets).map(([key,p])=>
      btn(p.label,"preset",{arg:key,style:"quiet small"})).join("")+'</div>'+
      '<div class="checklist">'+slider("confirmation","Eligible offers with a confirmed alternate",0,100,5,"%",100)+
      slider("offer_scale","Offered weight",50,175,5,"% of reference",100)+
      slider("use_share","Kitchen throughput available to donations",0,55,1,"%",100)+
      slider("use_uncertainty","Daily kitchen use can vary",0,60,5,"% either way",100)+
      slider("radius_km","Straight-line search radius",0,80,5," km")+'</div><div class="field-grid">'+
      input("Days",settings.days,numFields('data-sim="days"'+(simulation?" disabled":""),1,60,1))+
      input("Donors",settings.donors,numFields('data-sim="donors"'+(simulation?" disabled":""),1,150,1))+
      input("Paired runs",settings.seeds,numFields('data-sim="seeds"'+(simulation?" disabled":""),1,200,1))+
      input("Starting seed",settings.seed_start,numFields('data-sim="seed_start"'+(simulation?" disabled":""),0,4294967095,1))+
      '</div><div class="actions">'+select("Offer mix",settings.mix,{pei:"PEI report profile",uniform:"Uniform categories"},
        'data-sim="mix"'+(simulation?" disabled":""))+'</div><div class="actions">'+
      (simulation?btn("Cancel run","cancel",{style:"amber"}):btn("Run simulation","run"))+
      '<span id="sim-state" class="tiny muted">'+(stale?"Inputs changed. Run to update results.":"")+'</span></div>'+
      '<div id="simulation-progress" class="simulation-progress">'+(simulation?'<progress value="'+completed+'" max="'+settings.seeds+
        '" aria-label="Paired simulations completed"></progress><span id="progress-text" class="tiny muted">'+
        completed+' of '+settings.seeds+' paired runs complete</span>':"")+'</div>',
      "Each run uses identical offers and service shocks for all three policies.");
  }

  function impact() {
    const delta=latest.uncertainty.paired_delta.kg_used_increase;
    const extra=latest.uncertainty.paired_delta.kg_used_increase_over_fit_only;
    const base=latest.baseline;
    const improved=latest.rescuefit;
    const waste=base.kg_wasted_at_agency-improved.kg_wasted_at_agency;
    const travel=improved.transfers ? improved.kg_redirected : 0;
    const series=timelineRows();
    const day=series[replay ? replayDay-1 : series.length-1];
    const rowFor=(key,formatter=kg)=>policyIds.map((id)=>formatter(latest[id][key]));
    const keyTable=table(["Outcome",...policyIds.map((id)=>P.TITLE[id])],
      [["Offered",...rowFor("kg_offered")],["Used",...rowFor("kg_used")],["Expired at kitchens",...rowFor("kg_wasted_at_agency")],
       ["Unallocated",...rowFor("kg_unallocated")],["Ending inventory",...rowFor("kg_remaining")],
       ["Transferred within network",...rowFor("kg_redirected")],["Meal equivalents",...rowFor("meals",num)],
       ["Modeled transfers",...rowFor("transfers",num)],["Transport exposure (kg·km)",...rowFor("redirect_kg_km",num)]],
      "Simulation averages by policy");
    const toggles='<div class="segmented">'+Object.entries(measures).map(([key,label])=>
      '<button type="button" data-action="metric" data-arg="'+key+'" aria-pressed="'+(key===tabMetric)+'">'+label+'</button>')
      .join("")+'</div>';
    const mode='<div class="segmented"><button type="button" data-action="ensemble" aria-pressed="'+!replay+
      '">Mean of runs</button><button type="button" data-action="replay" aria-pressed="'+replay+'">Replay seed '+
      latest.seed_start+'</button></div>';
    const chart=card(measures[tabMetric]+" by day",
      '<div class="actions">'+mode+toggles+'</div><div class="chart-legend">'+policyIds.map((id)=>
        '<span><i class="chart-key" style="background:'+P.COLORS[id]+'"></i>'+P.TITLE[id]+'</span>').join("")+
      '</div><canvas id="trend-canvas" role="img" aria-label="'+esc(measures[tabMetric]+" in kilograms, by policy over time.")+'"></canvas>'+
      '<div class="timeline"><strong>'+ (replay?"Replay day ":"Day ")+day.day+" / "+latest.days+'</strong>'+
      (replay?'<div class="actions">'+btn(timer?"Pause":"Play days",timer?"pause":"play",{style:"quiet small"})+
        btn("Next day","next-day",{style:"quiet small",disabled:replayDay>=latest.days})+'</div>'+
        '<label class="field"><span>Replay position</span><input type="range" min="1" max="'+latest.days+'" step="1" value="'+
        replayDay+'" data-setting="day"></label>':"")+
      rowList(policyIds.map((id)=>[P.TITLE[id],kg(day[id])]))+'</div>'+
      '<details data-panel="daily"'+(openPanels.has("daily")?" open":"")+'><summary>View daily values</summary>'+table(["Day",...policyIds.map((id)=>P.TITLE[id])],
        series.map((row)=>[row.day,...policyIds.map((id)=>kg(row[id]))]),"Daily kilograms by policy")+'</details>',
      "Kg per day. Replay shows one paired set of offers and outcomes.");
    const factor=climate.factor!=="" && Number.isFinite(Number(climate.factor)) && climate.path.trim();
    const conversions=card("Impact conversions",rowList([["Additional meal equivalents",signed(delta.mean/latest.kg_per_meal)],
        ["Planning ledger value",money(total("net"))]])+
      '<p class="subheading">Meal equivalents use the 1.2 lb convention. CAD uses the shopping prices and handling costs of the example kitchen.</p>'+
      '<details class="timeline" data-panel="climate"'+(openPanels.has("climate")?" open":"")+'><summary>Try a treatment emissions factor</summary><div class="field-grid">'+
      input("Factor in kg CO₂e per kg",climate.factor,'data-setting="co2" min="-10" max="10" step=".01"')+
      input("Pathway and factor source",climate.path,'data-setting="co2-path" maxlength="120"',"text")+
      '</div><p class="subheading">'+(factor?esc(signed(waste*Number(climate.factor))+' kg CO₂e · '+climate.path):
      "Enter a factor and its source to calculate a treatment-only estimate.")+
      '</p><p class="form-hint">Applies to the difference in expired kg at kitchens. Excludes transport and unallocated stock.</p></details>',
      "Separate modeled food use from operator-entered costs and emissions assumptions.");
    return hero("Impact lab","Run a paired simulation","Change the conditions and compare what happens across the same fictional kitchens and donations.",
      ticket(latest.days+" days",latest.seeds+" paired runs",scenarioName))+
      '<div class="metrics">'+metric("Additional food used",signed(delta.mean)+" kg",
        num(delta.p05)+" to "+num(delta.p95)+" kg, central 90% of modeled differences",true)+
        metric("Additional use from redirects",signed(extra.mean)+" kg","Compared with kitchen fit alone")+
        metric("Less expiry at kitchens",signed(waste)+" kg","Compared with storage only")+
        metric("Transferred in model",kg(travel),num(improved.transfers)+" average handoffs")+'</div>'+
      '<div class="dashboard two"><div class="stack">'+chart+policyMass()+
      card("Policy outcomes",keyTable+'<p class="subheading">Unallocated food has an unknown next destination. Food on hand stays in closing inventory.</p>')+
      '</div><div class="stack">'+scenarioControls()+conversions+
      card("Export this comparison",'<div class="actions">'+btn("Download JSON","sim-json",{style:"quiet"})+
        btn("Download daily CSV","sim-csv",{style:"quiet"})+'</div>',
      "Exports the results you see, including parameters and seed.")+'</div></div>';
  }

  function evidence() {
    const e=fixtures.evidence;
    const supported=e.groups.filter((group)=>group.categories.length);
    const tally=supported.reduce((sum,group)=>sum+group.percent,0);
    const bars='<div class="source-bars">'+e.groups.map((group)=>
      '<div class="source-bar"><span>'+esc(group.label)+'</span><div class="bar" aria-hidden="true"><i class="segment '+
      (group.categories.length?"seg-used":"seg-unallocated")+'" style="width:'+Math.min(100,group.percent/41*100)+
      '%"></i></div><strong>'+num(group.percent)+'%</strong></div>').join("")+'</div>';
    const items=fixtures.register.map((item)=>[
      String(item.row),item.source,item.use,item.limit,
    ]);
    return hero("Data sources","What went into the model","Review the IMPAC workbook entries and see which published values affect the simulation.",
      ticket(num(tally)+" pp","of published mix represented","Workbook row 90"))+
      '<div class="metrics">'+metric("New donor signups",e.new_donors,"Historical project",true)+
      metric("New nonprofit signups",e.new_nonprofits,"Historical project")+
      metric("Meals rescued, report KPI",num(e.reported_meals_lower_bound)+"+","Historical project")+
      metric("Scenario receiving sites",latest.agencies,"Synthetic capacities")+'</div>'+
      '<div class="dashboard two equal">'+card("Reported mix by rescued weight",bars+
        '<p class="subheading">The model normalizes the six represented groups and uses that mix as an assumption about offered weight.</p>'+
        '<p class="subheading"><a href="'+esc(e.url)+'" target="_blank" rel="noopener">Final report, Chart 1 and Table 1</a></p>',
        e.mix_start+" through "+e.mix_end)+
      card("How to read these values",'<p class="muted">'+esc(e.caveat)+'</p>'+
        '<ul class="list">'+latest.assumptions.slice(1).map((x)=>'<li>'+esc(x)+'</li>').join("")+'</ul>')+
      '</div><div class="dashboard">'+card("IMPAC workbook review",table(["Row","Source","Role in the build","Limit"],items,
        "Review of shortlisted workbook entries")+
        '<details><summary>Open source links</summary><ul>'+fixtures.register.map((r)=>'<li><a href="'+esc(r.url)+
          '" target="_blank" rel="noopener">'+esc(r.source)+'</a></li>').join("")+'</ul></details>')+"</div>";
  }

  const views={intake,fit,network,plan:planView,impact,evidence};
  let renderTimer=0;
  function render() {
    window.clearTimeout(renderTimer);
    const active=document.activeElement;
    const key=active?.id || active?.dataset?.setting;
    const activeLot=active?.dataset?.lot;
    const activeField=active?.dataset?.field;
    const labels=["service","space","stock","buy","prep"];
    const fieldAttribute=labels.find((name)=>active?.dataset?.[name]!==undefined);
    recompute();
    nav.innerHTML=STEPS.filter(([id])=>SHOWN.includes(id)).map(([id,label,glyph])=>
      '<button type="button" class="nav-btn" data-action="go" data-arg="'+id+'"'+(page===id?' aria-current="page"':"")+
      '><span class="nav-glyph" aria-hidden="true">'+glyph+'</span>'+label+'</button>').join("");
    main.innerHTML=views[page]();
    document.title="RescueFit · "+STEPS[stepIndex[page]][1];
    document.getElementById("facility").textContent=STEPS[stepIndex[page]][1];
    save();
    draw();
    if (active?.tagName==="INPUT" || active?.tagName==="SELECT" || active?.tagName==="TEXTAREA") {
      const replacement=key?document.getElementById(key) || main.querySelector('[data-setting="'+CSS.escape(key)+'"]'):
        activeLot&&activeField?main.querySelector('[data-lot="'+CSS.escape(activeLot)+'"][data-field="'+CSS.escape(activeField)+'"]'):
        fieldAttribute?main.querySelector('[data-'+fieldAttribute+'="'+CSS.escape(active.dataset[fieldAttribute])+'"]'):null;
      replacement?.focus({preventScroll:true});
    }
  }

  function draw() {
    const map=document.getElementById("map-canvas");
    const row=selectedRow();
    if (map && row) P.island(map,fixtures.agencies,fixtures.agencies.find((a)=>a.id===state.kitchen.origin_id),
      fixtures.agencies.find((a)=>a.id===row.route?.id),new Set(row.potential.map((r)=>r.id)),new Set(state.closed),
      state.approved?null:(id)=>chooseRoute(id));
    const chart=document.getElementById("trend-canvas");
    if (chart) P.trend(chart,timelineRows(),latest.days,replay?replayDay:null);
  }

  function navigate(id) {
    if (!Object.hasOwn(stepIndex,id)) return;
    stopReplay();
    page=id;
    if (location.hash.slice(1)!==id) {
      try {history.replaceState(null,"","#"+id);} catch {location.hash=id;}
    }
    render();
    window.scrollTo(0,0);
    main.focus({preventScroll:true});
  }

  function draftFrom(parsed) {
    const source=parsed || {name:"New item",category:"",offered:null,quantity_note:""};
    return {id:"DEMO-"+String(state.nextLot++).padStart(3,"0"),...source,collected:0,storage:"",arrival:1,use_by:1,
      reviewed:false,stage:"offer",may_split:false,may_redirect:false,price:state.kitchen.sample_price_per_kg[source.category]||0,handling_cost:0};
  }

  function parseDonation() {
    if (state.approved) return;
    const parsed=D.parseText(state.note,fixtures.shelf);
    if (!parsed.length) return announce("Enter a message with food and quantity.");
    state.lots=parsed.map(draftFrom);
    state.openLots=state.lots.map((lot)=>lot.id);
    state.selected=state.lots[0].id;
    render();
    announce(parsed.length+" draft "+(parsed.length===1?"lot":"lots")+". Review the weight, category and handling details.");
  }

  async function readLabel() {
    if (!photo || state.approved) return;
    if (typeof window.TextDetector!=="function") return announce("Label reading is unavailable in this browser. Enter the label text in the donor message.");
    try {
      const bitmap=await createImageBitmap(photo.file);
      let regions;
      try {regions=await new window.TextDetector().detect(bitmap);} finally {bitmap.close();}
      const found=regions.map((region)=>region.rawValue).join(" ").trim();
      if (!found) return announce("No printed text was read. Enter the label text or add a lot manually.");
      state.note=found.slice(0,900);
      render();
      announce("Label text added to the message for review.");
    } catch {announce("The browser could not read this label. Enter its text in the donor message.");}
  }

  function chooseRoute(id) {
    if (state.approved || !selectedRow()?.potential.some((r)=>r.id===id)) return;
    state.routeOverrides[state.selected]=id;
    render();
  }

  function approve() {
    recompute();
    if (state.approved || !state.lots.length || state.lots.some((lot)=>!validLot(lot))) return announce("Review all lot weights and use windows first.");
    state.approved=structuredClone(fitData);
    state.ledgers=Object.fromEntries(fitData.rows.map((row)=>[row.lot.id,D.ledgerFor(row)]));
    render();
    announce("Plan saved. You can now record collections, handoffs and food use.");
  }

  function record(type) {
    const row=selectedRow();
    if (!row || !state.approved) return announce("Save the plan to record outcomes.");
    const previous=currentLedger(row);
    const quantity=D.mass(Number(eventKg));
    const after=D.evolve(previous,row,type,quantity);
    if (!after) return announce("Enter an eligible quantity or complete the prior step.");
    const changed=type==="use" || type==="discard"?quantity:type==="pickup"?after.collected:previous.pending;
    state.ledgers[row.lot.id]=after;
    state.events.push({id:row.lot.id,time:new Date().toISOString(),type,kg:changed,
      recipient:["confirm","transfer","release"].includes(type)?row.route?.id:undefined});
    eventKg="";
    render();
    announce(eventNames[type]+" · "+kg(changed)+".");
  }

  function download(name,content,type) {
    const href=URL.createObjectURL(new Blob([content],{type}));
    const anchor=document.createElement("a");
    anchor.href=href;
    anchor.download=name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(()=>URL.revokeObjectURL(href),1000);
  }
  function exportLedger() {
    download("rescuefit-demo-ledger.json",JSON.stringify({status:"simulated",kitchen:state.kitchen.name,
      plan:state.approved,balances:state.ledgers,events:state.events},null,2),"application/json");
  }
  function exportResults(asCsv) {
    const stamp="rescuefit-sim-seed-"+latest.seed_start;
    if (!asCsv) return download(stamp+".json",JSON.stringify(latest,null,2),"application/json");
    const keys=Object.keys(latest.daily[0]);
    const lines=[["data_status","starting_seed","runs","days","confirmation","radius_km","use_share","use_uncertainty",
      "offer_scale","mix","donors","agencies",...keys].join(","),
      ...latest.daily.map((row)=>["synthetic",latest.seed_start,latest.seeds,latest.days,latest.settings.confirmation,
        latest.settings.radius_km,latest.settings.use_share,latest.settings.use_uncertainty,latest.settings.offer_scale,
        latest.settings.mix,latest.donors,latest.agencies,...keys.map((key)=>row[key])].join(","))];
    download(stamp+"-daily.csv",lines.join("\n")+"\n","text/csv;charset=utf-8");
  }

  function finishSimulation(task,result) {
    if (simulation!==task) return;
    if (task.worker) task.worker.terminate();
    simulation=null;
    latest=result;
    scenarioName="Browser run";
    replay=false;
    replayDay=1;
    render();
    announce("Simulation complete · "+latest.seeds+" paired runs.");
  }
  function progress(task,value) {
    if (simulation!==task) return;
    completed=value;
    const bar=document.querySelector("#simulation-progress progress");
    if (bar) bar.value=value;
    const label=document.getElementById("progress-text");
    if (label) label.textContent=value+" of "+task.settings.seeds+" paired runs complete";
  }
  function fallbackSimulation(task) {
    try {
      const runner=S.createRunner(fixtures,task.settings);
      function tick() {
        if (simulation!==task) return;
        try {
          const count=runner.step(2);
          progress(task,count);
          if (count===task.settings.seeds) finishSimulation(task,runner.finish());
          else setTimeout(tick,0);
        } catch (error) {failSimulation(task,error.message);}
      }
      setTimeout(tick,0);
    } catch (error) {failSimulation(task,error.message);}
  }
  function failSimulation(task,message) {
    if (simulation!==task) return;
    cancelSimulation(false);
    announce("Could not calculate this scenario. "+message);
  }
  function runSimulation() {
    if (simulation) return;
    const invalid=[...document.querySelectorAll("[data-sim]")].find((node)=>!node.checkValidity() || node.value==="");
    if (invalid) return invalid.reportValidity() || announce("Enter a value for every scenario field.");
    stopReplay();
    const task={settings:{...settings},worker:null};
    simulation=task;
    completed=0;
    render();
    try {
      const code=document.getElementById("sim-code").textContent+
        "\nself.onmessage = (e) => { try { const run = RescueSim.createRunner(e.data.fixtures, e.data.settings); "+
        "let completed = 0; while (completed < e.data.settings.seeds) { completed = run.step(5); self.postMessage({progress:completed}); } "+
        "self.postMessage({result:run.finish()}); } catch (err) { self.postMessage({error:err.message}); } };";
      const url=URL.createObjectURL(new Blob([code],{type:"text/javascript"}));
      const worker=new Worker(url);
      URL.revokeObjectURL(url);
      task.worker=worker;
      worker.onmessage=({data})=> {
        if (data.error) failSimulation(task,data.error);
        else if (data.result) finishSimulation(task,data.result);
        else progress(task,data.progress);
      };
      worker.onerror=(event)=>{
        event.preventDefault();
        if (simulation!==task) return;
        worker.terminate();
        task.worker=null;
        fallbackSimulation(task);
      };
      worker.postMessage({fixtures,settings:task.settings});
    } catch {fallbackSimulation(task);}
  }
  function cancelSimulation(say=true) {
    if (!simulation) return;
    simulation.worker?.terminate();
    simulation=null;
    render();
    if (say) announce("Stopped the run. The previous results are still displayed.");
  }

  function stopReplay() {
    if (timer!==null) clearInterval(timer);
    timer=null;
  }
  function playReplay() {
    if (timer!==null) return;
    if (replayDay>=latest.days) replayDay=1;
    timer=setInterval(()=>{
      replayDay=Math.min(latest.days,replayDay+1);
      if (replayDay===latest.days) stopReplay();
      render();
    },420);
    render();
  }
  function discardPhoto() {
    if (photo) URL.revokeObjectURL(photo.url);
    photo=null;
  }

  const actions={
    go:navigate, reset:()=>{
      stopReplay();
      if (simulation) cancelSimulation(false);
      state=freshState(); settings={...fixtures.config}; latest=fixtures.reference;
      scenarioName="Reference run"; replay=false; replayDay=1; eventKg=""; tabMetric="used"; climate={factor:"",path:""};
      discardPhoto(); navigate("intake"); announce("Example reset.");
    },
    parse:parseDonation, "sample-text":()=>{state.note="12 kg carrots, 4 kg potatoes, 20 rolls";parseDonation();},
    "add-lot":()=>{
      if (state.approved) return;
      if (state.lots.length>=8) return announce("This workspace supports up to eight lots per intake.");
      const lot=draftFrom();state.lots.push(lot);state.openLots.push(lot.id);state.selected=lot.id;render();
    },
    "remove-lot":(id)=>{if (!state.approved){state.lots=state.lots.filter((l)=>l.id!==id);render();}},
    "remove-photo":()=>{discardPhoto();render();},
    "read-label":()=>{void readLabel();}, "pick-route":chooseRoute,
    "close-route":(id)=>{if (!state.approved){state.closed.push(id);render();announce("Recipient marked unavailable in this demo.");}},
    "restore-routes":()=>{if (!state.approved){state.closed=[];state.routeOverrides={};render();}},
    approve, reopen:()=>{if (!state.events.length){state.approved=null;state.ledgers={};render();}},
    "ledger-download":exportLedger, "sim-json":()=>exportResults(false),"sim-csv":()=>exportResults(true),
    preset:(key)=>{if (!simulation && Object.hasOwn(presets,key)){
      settings={...fixtures.config,...presets[key].settings};render();announce(presets[key].label+" inputs selected.");}},
    run:runSimulation,cancel:()=>cancelSimulation(),metric:(key)=>{if(Object.hasOwn(measures,key)){tabMetric=key;render();}},
    ensemble:()=>{stopReplay();replay=false;render();},replay:()=>{replay=true;replayDay=1;render();},
    "next-day":()=>{replayDay=Math.min(latest.days,replayDay+1);render();},play:playReplay,
    pause:()=>{stopReplay();render();},
  };
  document.body.addEventListener("click",(event)=>{
    const button=event.target.closest("button[data-action]");
    if (!button || button.disabled) return;
    const action=button.dataset.action;
    if (action.startsWith("event-")) record(action.slice(6));
    else if (Object.hasOwn(actions,action)) actions[action](button.dataset.arg);
  });
  document.body.addEventListener("toggle",(event)=>{
    const panel=event.target.dataset?.panel;
    if (panel && event.target.isConnected) {
      if (event.target.open) openPanels.add(panel);
      else openPanels.delete(panel);
    }
    const id=event.target.dataset?.detail;
    if (!id || !event.target.isConnected) return;
    state.openLots=state.openLots.filter((x)=>x!==id);
    if (event.target.open) state.openLots.push(id);
    save();
  },true);

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer=window.setTimeout(render,130);
  }
  document.body.addEventListener("input",(event)=>{
    const field=event.target;
    if (field.id==="donor-message") {state.note=field.value;save();return;}
    if (field.dataset.setting==="event-kg") {eventKg=field.value;return;}
    if (field.dataset.sim && field.type==="range") {
      const value=Number(field.value);
      settings[field.dataset.sim]=value/Number(field.dataset.factor);
      document.getElementById("val-"+field.dataset.sim).textContent=num(value)+field.dataset.unit;
      document.getElementById("sim-state").textContent="Inputs changed. Run to update results.";
    } else if (field.dataset.setting==="day") {
      replayDay=Number(field.value);
      draw();
    }
  });

  document.body.addEventListener("change",(event)=>{
    const field=event.target;
    if (field.id==="photo-input") {
      const file=field.files?.[0];
      if (!file) return;
      if (file.size>6*1024*1024 || !["image/jpeg","image/png","image/webp"].includes(file.type)) {
        field.value="";
        return announce("Choose a JPEG, PNG or WebP under 6 MB.");
      }
      discardPhoto();
      photo={file,url:URL.createObjectURL(file)};
      return render();
    }
    if (!field.dataset || !field.checkValidity()) {field.reportValidity?.();return;}
    const key=field.dataset.setting;
    if (field.dataset.sim) {
      if (!simulation && field.type!=="range" && field.value!=="") settings[field.dataset.sim]=field.tagName==="SELECT"?field.value:Number(field.value);
      const label=document.getElementById("sim-state");
      if (label) label.textContent="Inputs changed. Run to update results.";
      return;
    }
    if (key==="selected") {state.selected=field.value;eventKg="";return render();}
    if (key==="day") {stopReplay();return render();}
    if (key==="event-kg") return;
    if (key==="co2" || key==="co2-path") {
      climate[key==="co2"?"factor":"path"]=field.value;
      // Refresh the conversion output in place to keep the input open.
      const panel=field.closest("details");
      const difference=latest.baseline.kg_wasted_at_agency-latest.rescuefit.kg_wasted_at_agency;
      panel.querySelector(".subheading").textContent=climate.path.trim()&&climate.factor!==""?
        signed(difference*Number(climate.factor))+" kg CO₂e · "+climate.path:
        "Enter a factor and its source to calculate a treatment-only estimate.";
      return;
    }
    if (state.approved) return;
    if (key==="radius") {if (field.value!==""){state.radius=Number(field.value);scheduleRender();}return;}
    if (field.dataset.lot) {
      const lot=state.lots.find((item)=>item.id===field.dataset.lot);
      const prop=field.dataset.field;
      if (!lot || !Object.hasOwn(lot,prop)) return;
      const previous=lot[prop];
      lot[prop]=field.type==="checkbox"?field.checked:field.type==="number"?field.value===""?null:Number(field.value):field.value.trim();
      if (prop==="stage" && lot.stage==="collected" && !lot.collected) lot.collected=lot.offered;
      if (prop==="offered" && lot.stage==="collected" && lot.collected===previous) lot.collected=lot.offered;
      if (["category","storage","arrival","use_by","offered","collected","stage"].includes(prop) && lot[prop]!==previous) lot.reviewed=false;
      state.selected=lot.id;
      save();
      return scheduleRender();
    }
    if (field.value==="") return;
    const value=Number(field.value);
    if (field.dataset.space) state.kitchen.ready_storage[field.dataset.space]=value;
    else if (field.dataset.stock) state.kitchen.starting_stock[field.dataset.stock]=value;
    else if (field.dataset.buy) state.kitchen.adjustable_purchases_kg[field.dataset.buy]=value;
    else if (field.dataset.prep!==undefined) state.kitchen.prep_kg[Number(field.dataset.prep)]=value;
    else if (field.dataset.service) {
      const service=state.kitchen.services.find((entry)=>entry.id===field.dataset.service);
      const original=fixtures.kitchen.services.find((entry)=>entry.id===field.dataset.service);
      service.portions=value;
      service.ingredients=Object.fromEntries(Object.entries(original.ingredients).map(([category,kg])=>
        [category,D.mass(kg*value/original.portions)]));
    }
    else return;
    save();scheduleRender();
  });

  window.addEventListener("hashchange",()=>{navigate(fromHash());});
  window.addEventListener("resize",draw);
  render();
}());
