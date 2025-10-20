
// ternary.js — Emotion Constellation Triangle (v1.1 with legend & clear labels)
(function() {
  function renderTriangle(data) {
    const root = d3.select("#triangle-vis");
    root.selectAll("*").remove();
    const tip = VisUtils.createTooltip(root);

    const width = Math.max(960, root.node().clientWidth || 960);
    const height = Math.max(560, root.node().clientHeight || 560);
    const margin = { top: 28, right: 200, bottom: 28, left: 28 };

    const side = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom);
    const svg = root.append("svg").attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${margin.left + (width - margin.left - margin.right - side)/2}, ${margin.top + (height - margin.top - margin.bottom - side)/2})`);

    const A = [side/2, 0], B = [0, (Math.sqrt(3)/2)*side], C = [side, (Math.sqrt(3)/2)*side];

    g.append("path").attr("d", d3.path(p => { p.moveTo(...A); p.lineTo(...B); p.lineTo(...C); p.closePath(); }))
      .attr("fill", "none").attr("stroke", "#5c4a35").attr("stroke-width", 1.6);

    // Labels
    g.append("text").attr("x", A[0]).attr("y", A[1]-10).attr("text-anchor","middle")
      .attr("font-weight", 700).attr("font-size", 14).text("Depression (PHQ-9)");
    g.append("text").attr("x", B[0]-8).attr("y", B[1]+20).attr("text-anchor","start")
      .attr("font-weight", 700).attr("font-size", 14).text("Stress (PSS-10)");
    g.append("text").attr("x", C[0]+8).attr("y", C[1]+20).attr("text-anchor","end")
      .attr("font-weight", 700).attr("font-size", 14).text("Anxiety (GAD-7)");

    // Helpers
    const pick = (row, keys) => { for (const k of keys) if (row[k] != null && row[k] !== "") return +row[k]; return NaN; };
    function normalizeTriple(s,a,d){
      s = +s||0; a = +a||0; d = +d||0;
      const sum = s+a+d; if (!sum) return [1/3,1/3,1/3];
      return [s/sum, a/sum, d/sum];
    }
    function bary(a,b,c,side){
      const x = 0.5 * (2*c + b) / (a + b + c);
      const y = (Math.sqrt(3)/2) * b / (a + b + c);
      return [x * side, (Math.sqrt(3)/2)*side - y*side];
    }

    const pts = [];
    for (const row of data) {
      const s = pick(row, ["stress_score","PSS10","stress"]);
      const a = pick(row, ["anxiety_score","GAD7","anxiety"]);
      const d = pick(row, ["depression_score","PHQ9","depression"]);
      if (![s,a,d].every(v => isFinite(v))) continue;
      const [sn, an, dn] = normalizeTriple(s,a,d);
      const [x,y] = bary(dn, sn, an, side);
      const sev = (s + a + d) / 30; // normalize ~0..1 for color
      pts.push({x,y,s,a,d,sev});
    }

    // Grid
    const grid = 6;
    for (let i=1;i<grid;i++){
      const t = i/grid;
      const p1 = bary(1-t, t, 0, side), p2 = bary(1-t, 0, t, side);
      const p3 = bary(t, 1-t, 0, side), p4 = bary(0, 1-t, t, side);
      const p5 = bary(t, 0, 1-t, side), p6 = bary(0, t, 1-t, side);
      g.append("line").attr("x1",p1[0]).attr("y1",p1[1]).attr("x2",p2[0]).attr("y2",p2[1]).attr("stroke","#e2d6c2").attr("opacity",0.4);
      g.append("line").attr("x1",p3[0]).attr("y1",p3[1]).attr("x2",p4[0]).attr("y2",p4[1]).attr("stroke","#e2d6c2").attr("opacity",0.4);
      g.append("line").attr("x1",p5[0]).attr("y1",p5[1]).attr("x2",p6[0]).attr("y2",p6[1]).attr("stroke","#e2d6c2").attr("opacity",0.4);
    }

    const color = d3.scaleSequential(d3.interpolatePlasma).domain(d3.extent(pts, d=>d.sev));
    const r = d3.scaleSqrt().domain(d3.extent(pts, d=>d.sev)).range([1.8, 5.5]);

    g.append("g").selectAll("circle.pt").data(pts).join("circle").attr("class","pt")
      .attr("cx",d=>d.x).attr("cy",d=>d.y).attr("r",d=>r(d.sev)).attr("fill",d=>color(d.sev)).attr("opacity",0.85)
      .on("mouseenter",(ev,d)=>{ tip.show(`<b>Stress</b> ${d.s.toFixed(1)} • <b>Anxiety</b> ${d.a.toFixed(1)} • <b>Depression</b> ${d.d.toFixed(1)}`, d3.pointer(ev, root.node()));})
      .on("mousemove",(ev)=> tip.move(d3.pointer(ev, root.node())))
      .on("mouseleave",()=> tip.hide());

    // Legend for severity
    const legend = svg.append("g").attr("transform", `translate(${width - 160}, ${margin.top})`);
    legend.append("text").text("Combined severity").attr("font-weight",700).attr("font-size",12);
    const Lw = 16, Lh = Math.max(140, side*0.4);
    const defs = svg.append("defs");
    const gid = "sevGrad";
    const gcol = defs.append("linearGradient").attr("id", gid).attr("x1","0%").attr("y1","100%").attr("x2","0%").attr("y2","0%");
    const dom = color.domain();
    const stops = 10;
    for (let i=0;i<=stops;i++){
      const t = i/stops, val = dom[0]*(1-t)+dom[1]*t;
      gcol.append("stop").attr("offset", `${t*100}%`).attr("stop-color", color(val));
    }
    legend.append("rect").attr("x",0).attr("y",16).attr("width",Lw).attr("height",Lh).attr("fill",`url(#${gid})`).attr("rx",3);
    legend.append("text").attr("x",Lw+8).attr("y",22).text(dom[1].toFixed(2));
    legend.append("text").attr("x",Lw+8).attr("y",Lh+14).text(dom[0].toFixed(2));
  }
  window.renderTriangle = renderTriangle;
})();
