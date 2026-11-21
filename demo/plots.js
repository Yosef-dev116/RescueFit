(function initializePlots(root) {
  "use strict";

  const COLORS = {baseline:"#b2291f",fit_only:"#2f4b6e",rescuefit:"#2f5d43"};
  const TITLE = {baseline:"Storage only",fit_only:"Kitchen fit",rescuefit:"Fit + redirect"};

  function setup(canvas) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    return {ctx,width:bounds.width,height:bounds.height};
  }

  // Hand-drawn geographic reference from approximate town positions.
  // This coastline is schematic and has no role in distance calculations.
  const coast = [
    [-64.04,47.00],[-63.97,46.96],[-63.99,46.87],[-63.90,46.76],[-63.87,46.66],
    [-63.73,46.55],[-63.64,46.50],[-63.48,46.51],[-63.34,46.48],[-63.20,46.46],
    [-62.98,46.44],[-62.82,46.48],[-62.71,46.46],[-62.58,46.47],[-62.44,46.47],
    [-62.27,46.44],[-62.10,46.49],[-61.98,46.47],[-62.09,46.39],[-62.15,46.32],
    [-62.31,46.30],[-62.39,46.23],[-62.52,46.23],[-62.54,46.14],[-62.48,46.09],
    [-62.42,46.00],[-62.56,45.97],[-62.72,46.04],[-62.73,46.10],[-62.88,46.16],
    [-63.03,46.17],[-63.11,46.20],[-63.19,46.15],[-63.35,46.18],[-63.47,46.20],
    [-63.56,46.19],[-63.72,46.24],[-63.77,46.32],[-63.90,46.34],[-64.09,46.40],
    [-64.18,46.48],[-64.34,46.62],[-64.37,46.72],[-64.23,46.82],[-64.15,46.92],
  ];

  function island(canvas, agencies, origin, selected, possible, closed, onSelect) {
    const stage = setup(canvas);
    if (!stage) return;
    const {ctx,width,height} = stage;
    const pad = 25;
    const pt = (lon,lat) => [pad + (lon+64.47)/2.6*(width-pad*2),
      pad + (47.07-lat)/1.18*(height-pad*2)];
    ctx.fillStyle = "#e4eff0";
    ctx.fillRect(0,0,width,height);
    ctx.strokeStyle = "#cadae0";
    ctx.lineWidth = .6;
    for (let x=25; x<width; x+=35) {
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();
    }
    for (let y=22; y<height; y+=31) {
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();
    }
    ctx.beginPath();
    coast.forEach(([lon,lat],i) => i ? ctx.lineTo(...pt(lon,lat)) : ctx.moveTo(...pt(lon,lat)));
    ctx.closePath();
    ctx.fillStyle = "#cfdfc2";ctx.fill();
    ctx.strokeStyle = "#8fa992";ctx.lineWidth = 1.4;ctx.stroke();
    const dot = (agency) => pt(agency.lon,agency.lat);
    if (origin && selected) {
      ctx.beginPath();ctx.moveTo(...dot(origin));ctx.lineTo(...dot(selected));
      ctx.setLineDash([4,3]);ctx.strokeStyle = "#26593f";ctx.lineWidth=2.6;ctx.stroke();ctx.setLineDash([]);
    }
    const hits = [];
    for (const agency of agencies) {
      const [x,y] = dot(agency);
      const local = agency.id === origin?.id;
      const active = agency.id === selected?.id;
      const can = possible.has(agency.id);
      ctx.fillStyle = local ? "#183d31" : active ? "#174a34" : can ? "#4f8966" : closed.has(agency.id) ? "#aa6448" : "#8da59b";
      ctx.strokeStyle = "#f8fcf2"; ctx.lineWidth = active ? 2.4 : 1.4;
      ctx.beginPath();
      if (local) ctx.rect(x-5,y-5,10,10); else ctx.arc(x,y,active ? 7.5 : can ? 5.1 : 3.6,0,Math.PI*2);
      ctx.fill();ctx.stroke();
      if (can) hits.push({x,y,id:agency.id});
    }
    ctx.font = "700 11px system-ui";
    function label(agency, text, above) {
      if (!agency) return;
      let [x,y] = dot(agency);
      const size = ctx.measureText(text).width;
      x = Math.max(7,Math.min(width-8-size,x-size/2));
      y += above ? -12 : 21;
      ctx.fillStyle = "#f9fcf4";
      ctx.fillRect(x-4,y-11,size+8,15);
      ctx.fillStyle = "#1f4032";
      ctx.fillText(text,x,y);
    }
    label(origin, origin?.town || "", true);
    label(selected, selected?.town || "", false);
    ctx.font = "600 11px system-ui";
    ctx.fillStyle = "#325769";
    ctx.fillText("PEI · schematic",13,height-12);
    canvas.onclick = (event) => {
      if (!onSelect) return;
      const rect = canvas.getBoundingClientRect();
      const nearest = hits.map((hit) => ({...hit,d:Math.hypot(hit.x-event.clientX+rect.x,hit.y-event.clientY+rect.y)}))
        .sort((a,b) => a.d-b.d)[0];
      if (nearest && nearest.d < 17) onSelect(nearest.id);
    };
  }

  function trend(canvas, daily, totalDays, focusedDay) {
    const stage = setup(canvas);
    if (!stage) return;
    const {ctx,width,height} = stage;
    const xStart=48, xEnd=width-16, yTop=15, yBottom=height-31;
    const rawMax = Math.max(0, ...daily.flatMap((row) => Object.keys(TITLE).map((p) => row[p])));
    const axisMax = Math.max(1, Math.ceil(rawMax / 4) * 4);
    const x = (day) => xStart + (day-1)/Math.max(1,totalDays-1)*(xEnd-xStart);
    const y = (value) => yBottom-value/axisMax*(yBottom-yTop);
    ctx.font = "11px \"Courier Prime\", \"Courier New\", monospace";
    ctx.fillStyle = "#4a463c";
    ctx.strokeStyle = "#e2dccd";
    ctx.lineWidth = 1;
    for (let i=0;i<=4;i++) {
      const value=axisMax*i/4;
      const at=y(value);
      ctx.beginPath();ctx.moveTo(xStart,at);ctx.lineTo(xEnd,at);ctx.stroke();
      ctx.fillText(new Intl.NumberFormat("en-CA",{maximumFractionDigits:1}).format(value),2,at+4);
    }
    const labels=[...new Set([1,Math.max(1,Math.round(totalDays/2)),totalDays])];
    for (const day of labels) {
      const label="Day "+day;
      ctx.fillText(label,Math.min(width-ctx.measureText(label).width-1,x(day)-9),height-10);
    }
    if (focusedDay) {
      ctx.beginPath();ctx.moveTo(x(focusedDay),yTop);ctx.lineTo(x(focusedDay),yBottom);
      ctx.setLineDash([3,4]);ctx.strokeStyle="#607c6d";ctx.stroke();ctx.setLineDash([]);
    }
    for (const policy of Object.keys(TITLE)) {
      const rows = focusedDay ? daily.filter((row) => row.day<=focusedDay) : daily;
      ctx.strokeStyle = COLORS[policy];ctx.lineWidth = 2.4;
      ctx.beginPath();
      rows.forEach((row,i) => i ? ctx.lineTo(x(row.day),y(row[policy])) : ctx.moveTo(x(row.day),y(row[policy])));
      ctx.stroke();
      const last=rows.at(-1);
      if (last) {
        ctx.beginPath();ctx.fillStyle=COLORS[policy];ctx.arc(x(last.day),y(last[policy]),3,0,2*Math.PI);ctx.fill();
      }
    }
  }
  root.RescuePlots = {island,trend,COLORS,TITLE};
}(globalThis));
