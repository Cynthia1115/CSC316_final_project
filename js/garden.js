
// garden.js — Bloom animation + Linked Highlight + Insight Overlay
(function () {
  window.renderGarden = renderGarden;

  function firstNonNull(obj, keys) {
    for (const k of keys) {
      if (obj[k] != null && obj[k] !== "") return obj[k];
    }
    return null;
  }

  // Simple utility to ensure a singleton overlay
  function ensureInsightOverlay(){
    if (document.getElementById("insight-overlay")) return;
    const div = document.createElement("div");
    div.id = "insight-overlay";
    div.innerHTML = `
      <div id="insight-label">Click "Next →" to explore insights</div>
      <button id="insight-next">Next →</button>
      <style>
        #insight-overlay{
          position: fixed; right: 18px; bottom: 18px; z-index: 9999;
          display: flex; gap: 10px; align-items: center;
          background: rgba(255,255,255,0.6); backdrop-filter: blur(6px);
          border: 1px solid rgba(0,0,0,0.08); border-radius: 12px;
          padding: 10px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          font-family: Inter, system-ui, sans-serif;
        }
        #insight-label{ font-weight: 700; color: #2b2116; }
        #insight-next{
          border: none; border-radius: 10px; padding: 8px 12px; cursor: pointer;
          background: #a66a2b; color: white; font-weight: 700;
        }
        #insight-next:hover{ filter: brightness(0.92); }
      </style>`;
    document.body.appendChild(div);
  }

  function renderGarden(rows) {
    const wrap = d3.select("#garden-vis");
    wrap.selectAll("*").remove();

    const width = wrap.node().clientWidth || 1600;
    const height = 560;
    const margin = { top: 30, right: 28, bottom: 110, left: 90 };

    // --- Aggregate from raw rows ---
    const copingKeyOptions = [
      "coping","coping_strategy","what_coping_strategy_you_use_as_a_student?"
    ];
    const stressKeyOptions = ["avg_stress","stress_score","stress_level","rate_your_academic_stress_index"];
    const exerciseKeyOptions = ["avg_exercise","exercise_hours","exercise_hours_per_week"];

    const groups = d3.group(rows, r => firstNonNull(r, copingKeyOptions) || "Unknown");
    const data = Array.from(groups, ([coping, rs]) => {
      const stressVals = rs.map(r => +firstNonNull(r, stressKeyOptions)).filter(v => Number.isFinite(v));
      const exVals = rs.map(r => +firstNonNull(r, exerciseKeyOptions)).filter(v => Number.isFinite(v));
      return {
        coping,
        n: rs.length,
        avgStress: stressVals.length ? d3.mean(stressVals) : NaN,
        avgExercise: exVals.length ? d3.mean(exVals) : NaN
      };
    }).filter(d => Number.isFinite(d.avgStress));

    data.sort((a,b)=>d3.ascending(a.coping,b.coping));

    // --- Scales ---
    const x = d3.scaleBand()
      .domain(data.map(d => d.coping))
      .range([margin.left, width - margin.right])
      .paddingInner(0.9).paddingOuter(0.6);   // spacious

    const y = d3.scaleLinear()
      .domain([0, Math.max(10, d3.max(data, d => d.avgStress))]).nice()
      .range([height - margin.bottom, margin.top]);

    const y0 = y(0);

    const exVals = data.map(d => d.avgExercise).filter(Number.isFinite);
    const rScale = exVals.length
      ? d3.scaleSqrt().domain(d3.extent(exVals)).range([10, 32])   // flower size
      : () => 18;

    // Color encodes frequency (n)
    const nExtent = d3.extent(data, d => d.n);
    const color = d3.scaleLinear()
      .domain([nExtent[0], (nExtent[0]+nExtent[1])/2, nExtent[1]])
      .range(["#fddc9b","#ff7f3f","#c4331e"]);
    const stemColor = "#58a65c";
    const leafFill = "#78b67a";

    // --- SVG & axes ---
    const svg = wrap.append("svg").attr("width", width).attr("height", height);

    // Legend (top-right): frequency color + exercise size
    /*__GARDEN_LEGEND__*/
    (function addGardenLegend(){
      const lg = svg.append("g").attr("class","garden-legend")
        .attr("transform", `translate(${width - margin.right - 220}, ${margin.top + 6})`);
      // Title
      lg.append("text").attr("x",0).attr("y",0).attr("font-weight",800).text("Frequency");
      // color ramp
      const gradId = "freq-grad";
      const defs = svg.append("defs");
      const grad = defs.append("linearGradient").attr("id", gradId).attr("x1","0%").attr("x2","100%").attr("y1","0%").attr("y2","0%");
      const cols = [0,0.5,1].map((t,i)=>({t, c: d3.interpolateRgbBasis(["#fddc9b","#ff7f3f","#c4331e"])(t)}));
      cols.forEach(o => grad.append("stop").attr("offset", (o.t*100)+"%").attr("stop-color", o.c));
      lg.append("rect").attr("x",0).attr("y",8).attr("width",140).attr("height",10).attr("rx",4).attr("fill", `url(#${gradId})`).attr("stroke","rgba(0,0,0,0.15)");
      lg.append("text").attr("x",0).attr("y",32).attr("font-size",12).text(nExtent[0]);
      lg.append("text").attr("x",140).attr("y",32).attr("text-anchor","end").attr("font-size",12).text(nExtent[1]);

      // size legend
      const y0l = 54;
      lg.append("text").attr("x",0).attr("y",y0l).attr("font-weight",800).text("Exercise hrs/wk");
      const sizes = [0.33,0.66,1].map(t => rScale.range()[0] + t * (rScale.range()[1]-rScale.range()[0]));
      const xs = [16, 52, 96];
      sizes.forEach((r,i)=>{
        lg.append("circle").attr("cx", xs[i]).attr("cy", y0l+18).attr("r", r/1.5)
          .attr("fill","#bdbdbd").attr("opacity",0.85).attr("stroke","#333").attr("stroke-opacity",.4);
        const val = Math.round(d3.quantile(exVals.sort(d3.ascending), [0.25,0.5,0.9][i]) || (i*5+10));
        lg.append("text").attr("x", xs[i]).attr("y", y0l+42).attr("text-anchor","middle").attr("font-size",12).text(val);
      });
    })();
    

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("text-anchor","end")
      .attr("transform","rotate(-35)")
      .attr("dx","-0.6em").attr("dy","0.1em");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg.append("text")
      .attr("x", margin.left - 60).attr("y", margin.top - 12)
      .attr("font-weight", 800).attr("dominant-baseline","hanging")
      .text("Average Stress Score");

    // --- Top-left info panel ---
    const infoG = svg.append("g")
      .attr("class","info-panel")
      .attr("transform", `translate(${margin.left + 10}, ${margin.top + 6})`)
      .style("opacity", 0);
    infoG.append("rect").attr("width", 320).attr("height", 96)
      .attr("rx", 10).attr("ry", 10).attr("fill","rgba(255,255,255,0.92)").attr("stroke","rgba(0,0,0,0.08)");
    const t1 = infoG.append("text").attr("x",12).attr("y",22).attr("font-weight",800);
    const t2 = infoG.append("text").attr("x",12).attr("y",42);
    const t3 = infoG.append("text").attr("x",12).attr("y",60);
    const t4 = infoG.append("text").attr("x",12).attr("y",78);
    function showInfo(d){ t1.text(d.coping); t2.text(`Avg stress: ${d.avgStress.toFixed(1)}`); t3.text(`Frequency: ${d.n}`); t4.text(`Avg exercise (hrs/wk): ${Number.isFinite(d.avgExercise)?d.avgExercise.toFixed(1):"—"}`); infoG.style("opacity",1); }
    function hideInfo(){ infoG.style("opacity",0); }

    // --- Rows ---
    const rowsG = svg.append("g").attr("class","rows")
      .selectAll(".row").data(data).join("g").attr("class","row")
      .attr("transform", d => `translate(${x(d.coping) + x.bandwidth()/2},0)`);

    // stems (animate grow)
    const stems = rowsG.append("line").attr("class","stem")
      .attr("x1",0).attr("x2",0).attr("y1",y0).attr("y2", y0)
      .attr("stroke", stemColor).attr("stroke-width",3).attr("stroke-linecap","round");
    stems.transition().duration(1200).ease(d3.easeCubicOut)
      .attr("y2", d => y(d.avgStress));

    // leaves
    const leafY = d => y(d.avgStress) + (y0 - y(d.avgStress)) * 0.55;
    const leafSize = 12;
    rowsG.append("ellipse")
      .attr("cx", 0).attr("cy", leafY).attr("rx", leafSize*1.2).attr("ry", leafSize*0.55)
      .attr("transform", d => `translate(0,0) rotate(-25 ${0},${leafY(d)})`)
      .attr("fill", leafFill).attr("opacity", 0).transition().delay(700).duration(600).attr("opacity",0.9);
    rowsG.append("ellipse")
      .attr("cx", 0).attr("cy", leafY).attr("rx", leafSize*1.2).attr("ry", leafSize*0.55)
      .attr("transform", d => `translate(0,0) rotate(155 ${0},${leafY(d)})`)
      .attr("fill", leafFill).attr("opacity", 0).transition().delay(700).duration(600).attr("opacity",0.9);

    // flowers (5‑petal)
    const flowers = rowsG.append("g").attr("class","flower")
      .attr("transform", d => `translate(0, ${y(d.avgStress)}) scale(0)`); // start scaled down
    flowers.each(function(d){
      const g = d3.select(this);
      const size = Number.isFinite(d.avgExercise) ? rScale(d.avgExercise) : rScale.range()[0];
      const petalRx = size * 0.9;
      const petalRy = size * 0.5;
      const petalDist = size * 0.95;
      const fill = color(d.n);
      const stroke = d3.color(fill).darker(0.8);
      for (let i=0; i<5; i++){
        const angle = (i * 72);
        g.append("ellipse")
          .attr("cx", 0).attr("cy", 0).attr("rx", petalRx).attr("ry", petalRy)
          .attr("transform", `rotate(${angle}) translate(${petalDist},0) rotate(15)`)
          .attr("fill", fill).attr("fill-opacity", 0).attr("stroke", stroke).attr("stroke-width", 1.2);
      }
      g.append("circle").attr("r", size * 0.45)
        .attr("fill", d3.color(fill).darker(0.5)).attr("stroke", "#ffffff").attr("stroke-width", 1).attr("opacity",0);
    });
    // bloom animation
    flowers.transition().delay(850).duration(900).ease(d3.easeBackOut).attr("transform", d => `translate(0, ${y(d.avgStress)}) scale(1)`);
    flowers.selectAll("ellipse").transition().delay(900).duration(900).attr("fill-opacity", 0.9);
    flowers.selectAll("circle").transition().delay(900).duration(900).attr("opacity", 1);

    // callout above each flower
    const callouts = rowsG.append("g")
      .attr("class","callout")
      .attr("transform", d => `translate(0, ${y(d.avgStress) - (rScale(d.avgExercise)||16) - 40})`)
      .style("opacity", 0);
    callouts.append("rect").attr("x",-82).attr("y",-26).attr("rx",8).attr("ry",8)
      .attr("width",164).attr("height",40).attr("fill","rgba(20,20,20,0.94)").attr("stroke","rgba(255,255,255,0.15)");
    callouts.append("path").attr("d","M0 20 l7 9 l-14 0 Z").attr("fill","rgba(20,20,20,0.94)");
    callouts.append("text").attr("y",-8).attr("text-anchor","middle").attr("fill","#fff").attr("font-size",12.5).attr("font-weight",700).text(d => d.coping);
    callouts.append("text").attr("y",10).attr("text-anchor","middle").attr("fill","#f6f6f6").attr("font-size",12).text(d => `Avg stress: ${d.avgStress.toFixed(2)}`);

    // --- Linked highlight: dispatch events on hover ---
    function highlightCoping(coping){
      // Dim all
      rowsG.transition().duration(200).style("opacity", d => d.coping === coping ? 1 : 0.15);
      // Slight scale-up the target flower
      rowsG.selectAll(".flower").transition().duration(200).attr("transform", d => `translate(0, ${y(d.avgStress)}) scale(${d.coping===coping?1.2:1})`);
    }
    function clearHighlight(){
      rowsG.transition().duration(200).style("opacity", 1);
      rowsG.selectAll(".flower").transition().duration(200).attr("transform", d => `translate(0, ${y(d.avgStress)}) scale(1)`);
    }

    rowsG
      .on("mouseenter", function(e, d){
        const g = d3.select(this);
        g.select(".stem").attr("stroke-width",5);
        if (!g.classed("pinned")) g.select(".callout").style("opacity", 1);
        showInfo(d);
        window.dispatchEvent(new CustomEvent("highlightCoping", { detail: { coping: d.coping }}));
      })
      .on("mouseleave", function(e, d){
        const g = d3.select(this);
        if (!g.classed("pinned")) {
          g.select(".callout").style("opacity", 0);
          g.select(".stem").attr("stroke-width",3);
          const anyPinned = !svg.selectAll(".row.pinned").empty();
          if (!anyPinned) hideInfo();
        }
        window.dispatchEvent(new CustomEvent("clearHighlight", {}));
      })
      .on("click", function(e, d){
        const g = d3.select(this);
        const pin = !g.classed("pinned");
        g.classed("pinned", pin);
        g.select(".callout").style("opacity", pin ? 1 : 0);
        g.select(".stem").attr("stroke-width", pin ? 5 : 3);
        if (!pin) {
          const anyPinned = !svg.selectAll(".row.pinned").empty();
          if (!anyPinned) hideInfo();
        } else {
          showInfo(d);
        }
      });

    // Listen to triangle highlights
    window.addEventListener("highlightCoping", (ev) => {
      const coping = ev.detail && ev.detail.coping;
      if (coping) highlightCoping(coping);
    });
    window.addEventListener("clearHighlight", () => { clearHighlight(); });

    // background click clears
    svg.insert("rect", ":first-child")
      .attr("x", 0).attr("y", 0).attr("width", width).attr("height", height)
      .attr("fill", "transparent")
      .on("click", () => {
        svg.selectAll(".row").classed("pinned", false);
        svg.selectAll(".callout").style("opacity", 0);
        svg.selectAll(".stem").attr("stroke-width", 3);
        hideInfo();
        window.dispatchEvent(new CustomEvent("clearHighlight", {}));
      });

    // --- Insight overlay (3 steps) ---
    ensureInsightOverlay();
    const insights = [
      { sel: d => Number.isFinite(d.avgExercise) && d.avgExercise >= (d3.quantile(exVals.sort(d3.ascending), 0.67) || 4),
        text: "Active coping strategies bloom tallest and brightest." },
      { sel: d => Number.isFinite(d.avgExercise) && d.avgExercise <= (d3.quantile(exVals.sort(d3.ascending), 0.33) || 2),
        text: "Avoidant/low-activity strategies are smaller and lower." },
      { sel: d => true, text: "Hover any flower to see details; linked to the triangle view." }
    ];
    let idx = -1;
    function showInsight(i){
      d3.selectAll("#garden-vis .row").style("opacity", d => insights[i].sel(d) ? 1 : 0.15);
      d3.select("#insight-label").textContent = insights[i].text;
    }
    document.getElementById("insight-next").onclick = () => {
      idx = (idx + 1) % insights.length;
      showInsight(idx);
    };

    // expose for debugging
    window.__gardenData = data;
  }
})();
