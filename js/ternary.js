// ternary.js — v6.1 (stable render)
// Renders into #triangle-vis > #triangle-stage so overlays never get cleared.
// Overlays/tools are anchored to #triangle-vis and kept on top with z-index.

(function () {
    // ---------- Small tooltip helper ----------
    function htmlTip(container) {
        const t = container.append("div")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("padding", "10px 12px")
            .style("border-radius", "10px")
            .style("background", "rgba(20,20,20,0.94)")
            .style("color", "#fff")
            .style("font", "12px/1.4 system-ui, sans-serif")
            .style("box-shadow", "0 6px 14px rgba(0,0,0,0.25)")
            .style("opacity", 0);
        return {
            show(html, [x, y]) { t.html(html).style("left", (x + 12) + "px").style("top", (y + 12) + "px").style("opacity", 1); },
            move([x, y]) { t.style("left", (x + 12) + "px").style("top", (y + 12) + "px"); },
            hide() { t.style("opacity", 0); }
        };
    }

    // ---------- Overlays (tour, tools, stats) anchored to the triangle container ----------
    function ensureOverlay(){
        const host = document.querySelector("#triangle-vis");
        if (!host) return;

        host.style.position = host.style.position || "relative"; // anchor

        const zTop = 1000;

        if (!document.getElementById("tri-insight-overlay")) {
            const div = document.createElement("div");
            div.id = "tri-insight-overlay";
            Object.assign(div.style, {
                position:"absolute", right:"18px", bottom:"18px", zIndex:zTop,
                display:"flex", gap:"10px", alignItems:"center",
                background:"rgba(255,255,255,0.6)", backdropFilter:"blur(6px)",
                border:"1px solid rgba(0,0,0,0.08)", borderRadius:"12px",
                padding:"10px 12px", boxShadow:"0 4px 12px rgba(0,0,0,0.08)",
                fontFamily:"Inter, system-ui, sans-serif"
            });
            const label = document.createElement("div");
            label.className="label";
            Object.assign(label.style, {fontWeight:"700", color:"#2b2116"});
            label.textContent = "Triangle tour: Step 1/4";
            const btn = document.createElement("button");
            btn.id="tri-next"; btn.textContent="Next →";
            Object.assign(btn.style, {border:"none", borderRadius:"10px", padding:"8px 12px",
                cursor:"pointer", background:"var(--accent, #a66a2b)", color:"white", fontWeight:"700"});
            div.append(label, btn);
            host.appendChild(div);
        }

        if (!document.getElementById("tri-tools")) {
            const tools = document.createElement("div");
            tools.id = "tri-tools";
            Object.assign(tools.style, {
                position:"absolute", right:"18px", bottom:"82px", zIndex:zTop,
                display:"flex", gap:"8px", alignItems:"center",
                background:"rgba(255,255,255,0.75)", backdropFilter:"blur(6px)",
                border:"1px solid rgba(0,0,0,0.08)", borderRadius:"12px",
                padding:"8px 10px", boxShadow:"0 4px 12px rgba(0,0,0,0.08)",
                fontFamily:"Inter, system-ui, sans-serif"
            });
            function mkBtn(id, text){
                const b=document.createElement("button"); b.id=id; b.textContent=text;
                Object.assign(b.style,{border:"none", borderRadius:"10px", padding:"6px 10px", cursor:"pointer",
                    background:"#f0eadf", color:"#2b2116", fontWeight:"700"});
                return b;
            }
            tools.append(mkBtn("tri-heat","Heatmap"), mkBtn("tri-clear","Clear"));
            const hint=document.createElement("span"); hint.textContent="Hold ⇧ Shift = Lasso";
            Object.assign(hint.style,{fontSize:"12px", color:"#6b5b4a", marginLeft:"6px"});
            tools.append(hint);
            host.appendChild(tools);
        }

        if (!document.getElementById("tri-stats")) {
            const chip=document.createElement("div");
            chip.id="tri-stats";
            chip.innerHTML=`<strong>Selected:</strong> <span id="ts-n">0</span> • <span id="ts-mean">—</span>`;
            Object.assign(chip.style, {
                position:"absolute", left:"24px", bottom:"24px", zIndex:zTop,
                background:"rgba(255,255,255,0.75)", backdropFilter:"blur(6px)",
                border:"1px solid rgba(0,0,0,0.08)", borderRadius:"12px",
                padding:"8px 12px", fontFamily:"Inter, system-ui, sans-serif", color:"#2b2116"
            });
            host.appendChild(chip);
        }
    }

    // ---------- Main render (into #triangle-stage) ----------
    function renderTriangle(rows) {
        ensureOverlay();

        const container = document.getElementById("triangle-vis");
        if (!container) return;

        // Create a dedicated stage that we can safely clear
        let stage = document.getElementById("triangle-stage");
        if (!stage) {
            stage = document.createElement("div");
            stage.id = "triangle-stage";
            stage.style.position = "relative";
            container.insertBefore(stage, container.firstChild); // keep overlays on top
        }
        stage.innerHTML = ""; // clear drawing only

        const root = d3.select(stage);
        const wrap = root.append("div").style("position","relative").style("width","100%").style("height","100%");
        const tip = htmlTip(wrap);

        const width = (container.clientWidth || 980);
        const height = 560;
        const margin = { top: 24, right: 180, bottom: 24, left: 24 };

        const side = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom);
        const triH = (Math.sqrt(3) / 2) * side;

        const svg = wrap.append("svg").attr("width", width).attr("height", height);

        // background shimmer
        const defs = svg.append("defs");
        const grad = defs.append("radialGradient").attr("id","triShimmer").attr("cx","50%").attr("cy","50%").attr("r","70%");
        grad.append("stop").attr("offset","0%").attr("stop-color","#ffffff").attr("stop-opacity",0.00);
        grad.append("stop").attr("offset","55%").attr("stop-color","#ffd89a").attr("stop-opacity",0.06);
        grad.append("stop").attr("offset","100%").attr("stop-color","#ff6f61").attr("stop-opacity",0.10);
        svg.append("rect").attr("x",0).attr("y",0).attr("width",width).attr("height",height).attr("fill","url(#triShimmer)");

        // triangle group
        const g = svg.append("g")
            .attr("transform",
                `translate(${margin.left + (width - margin.left - margin.right - side) / 2},
                   ${margin.top + (height - margin.top - margin.bottom - triH) / 2})`);

        const A = [side / 2, 0], B = [0, triH], C = [side, triH];
        g.append("path")
            .attr("d", d3.path(p => { p.moveTo(...A); p.lineTo(...B); p.lineTo(...C); p.closePath(); }))
            .attr("fill", "none").attr("stroke", "#5c4a35");

        g.append("text").attr("x", A[0]).attr("y", A[1] - 8).attr("text-anchor", "middle").attr("font-weight", 700).text("Depression (PHQ-9)");
        g.append("text").attr("x", B[0] + 4).attr("y", B[1] + 18).attr("font-weight", 700).text("Stress (PSS-10)");
        g.append("text").attr("x", C[0] - 4).attr("y", C[1] + 18).attr("text-anchor", "end").attr("font-weight", 700).text("Anxiety (GAD-7)");

        // helpers
        const get = (r, ks) => { for (const k of ks) if (r[k] != null && r[k] !== "") return +r[k]; return NaN; };
        const norm = (s, a, d) => { s = +s || 0; a = +a || 0; d = +d || 0; const sum = s + a + d || 1; return [s / sum, a / sum, d / sum]; };
        const bary = (dep, str, anx) => { const x = 0.5 * (2 * anx + str) / (dep + str + anx); const y = (Math.sqrt(3) / 2) * str / (dep + str + anx); return [x * side, triH - y * side]; };

        // rows -> points
        const pts = [];
        for (const r of rows) {
            const s = get(r, ["stress_score","PSS10","stress"]);
            const a = get(r, ["anxiety_score","GAD7","anxiety"]);
            const d = get(r, ["depression_score","PHQ9","depression"]);
            if (![s,a,d].every(Number.isFinite)) continue;
            const [sn, an, dn] = norm(s,a,d);
            const [x,y] = bary(dn, sn, an);
            const sev = (s+a+d) / 30;
            pts.push({x,y,s,a,d,sn,an,dn,sev,row:r});
        }

        const color = d3.scaleSequential(d3.interpolatePlasma).domain(d3.extent(pts, d=>d.sev));
        const rr = d3.scaleSqrt().domain(d3.extent(pts, d=>d.sev)).range([1.8, 5.2]);

        const dotG = g.append("g");
        const dots = dotG.selectAll("circle")
            .data(pts).join("circle")
            .attr("cx", d=>d.x).attr("cy", d=>d.y).attr("r", d=>rr(d.sev))
            .attr("fill", d=>color(d.sev)).attr("opacity", 0.0);
        dots.transition().duration(700).attr("opacity", 0.9);

        // shimmer reacts to selection/hover
        let activeSeverity = d3.mean(pts, d=>d.sev) || 0.3;
        function updateShimmerIntensity(sev){
            activeSeverity = Math.max(0, Math.min(1, sev));
            const warm = d3.interpolateRgb("#ffd89a", "#ff6f61")(activeSeverity);
            grad.selectAll("stop").remove();
            grad.append("stop").attr("offset","0%").attr("stop-color","#ffffff").attr("stop-opacity",0.00);
            grad.append("stop").attr("offset", (50 - 15*activeSeverity) + "%").attr("stop-color","#ffd89a").attr("stop-opacity", 0.04 + 0.05*activeSeverity);
            grad.append("stop").attr("offset","100%").attr("stop-color", warm).attr("stop-opacity", 0.06 + 0.12*activeSeverity);
        }
        updateShimmerIntensity(activeSeverity);
        let t0 = Date.now();
        d3.timer(()=>{
            const t = (Date.now() - t0) / 1000;
            const speed = 0.004 + activeSeverity*0.01;
            const cx = 50 + 35*Math.sin(t*speed*120);
            const cy = 50 + 25*Math.cos(t*speed*100);
            grad.attr("cx", cx + "%").attr("cy", cy + "%");
        });

        // hover helpers
        const halo = g.append("circle").attr("fill","none").attr("stroke","var(--accent, #a66a2b)").attr("stroke-width", 2.5).attr("opacity", 0).attr("pointer-events","none");
        function pulse(cx, cy){
            halo.interrupt().attr("cx", cx).attr("cy", cy).attr("r", 16).attr("opacity", 0.0);
            function loop(){ halo.transition().duration(900).attr("opacity",0.5).attr("stroke-width",6).attr("r",26)
                .transition().duration(900).attr("opacity",0.0).attr("stroke-width",2.5).attr("r",16).on("end",loop); }
            loop();
        }
        function stopPulse(){ halo.interrupt().attr("opacity", 0); }

        const linkG = g.append("g").attr("class","links").attr("stroke","#6b5743").attr("stroke-opacity",0.25);
        const qt = d3.quadtree().x(d=>d.x).y(d=>d.y).addAll(pts);
        function neighbors(p, radius=36, maxN=28){
            const near=[];
            qt.visit(function(node, x0, y0, x1, y1){
                const dx = Math.max(0, Math.max(x0 - p.x, p.x - x1));
                const dy = Math.max(0, Math.max(y0 - p.y, p.y - y1));
                if (dx*dx + dy*dy > radius*radius) return true;
                if (!node.length){
                    do { const d = node.data; if (d && d!==p){
                        const ddx=d.x-p.x, ddy=d.y-p.y;
                        if (ddx*ddx+ddy*ddy<=radius*radius) near.push(d);
                    } } while (node = node.next);
                }
                return false;
            });
            near.sort((a,b)=>((a.x-p.x)**2+(a.y-p.y)**2)-((b.x-p.x)**2+(b.y-p.y)**2));
            return near.slice(0,maxN);
        }

        function tipHTML(d){
            const mk = (label,val,max,frac)=>{
                const w = Math.max(2, Math.min(100, (val/max)*100));
                const pct = Math.round(frac*100);
                return `<div style="display:flex;align-items:center;gap:6px;margin:3px 0;">
                  <div style="width:64px;opacity:.9"><b>${label}</b></div>
                  <div style="flex:1;height:8px;background:#333;border-radius:6px;overflow:hidden">
                    <div style="width:${w}%;height:100%;background:#ffcf70"></div>
                  </div>
                  <div style="width:86px;text-align:right;opacity:.9">${val.toFixed(1)} (${pct}%)</div>
                </div>`;
            };
            return `<div style="font-weight:800;margin-bottom:6px">Exact values</div>
              ${mk('Stress', d.s, 10, d.sn)}
              ${mk('Anxiety', d.a, 7, d.an)}
              ${mk('Depression', d.d, 9, d.dn)}`;
        }

        const valueLabelG = g.append("g").attr("class","hover-label").style("pointer-events","none").style("opacity",0);
        valueLabelG.append("rect").attr("rx",6).attr("ry",6).attr("fill","rgba(255,255,255,0.92)").attr("stroke","rgba(0,0,0,0.08)");
        const valueText = valueLabelG.append("text").attr("x",8).attr("y",14).attr("font-size",12).attr("font-weight",700).attr("fill","#2b2116");
        let pinned = null;
        function showValueLabel(d){
            const text = `S:${d.s.toFixed(1)}  A:${d.a.toFixed(1)}  D:${d.d.toFixed(1)}`;
            valueText.text(text);
            const bb = valueText.node().getBBox();
            valueLabelG.select("rect").attr("x", bb.x-6).attr("y", bb.y-4).attr("width", bb.width+12).attr("height", bb.height+8);
            valueLabelG.style("opacity",1);
            valueLabelG.attr("transform", `translate(${d.x + 10}, ${d.y - 10})`);
        }
        function hideValueLabel(){ if (!pinned) valueLabelG.style("opacity",0); }

        const showPoint = (ev,d)=>{
            const [px,py] = d3.pointer(ev, wrap.node());
            htmlTip(wrap).show(tipHTML(d), [px,py]);
            pulse(d.x, d.y);
            showValueLabel(d);
            const ns = neighbors(d, 48, 36);
            const L = linkG.selectAll("line").data(ns, k=>k.x+"-"+k.y);
            L.join(
                enter => enter.append("line").attr("x1", d.x).attr("y1", d.y).attr("x2", d.x).attr("y2", d.y)
                    .attr("stroke-width", 1.2).call(e=>e.transition().duration(250).attr("x2", k=>k.x).attr("y2", k=>k.y)),
                update => update,
                exit => exit.transition().duration(200).attr("x2", d.x).attr("y2", d.y).remove()
            );
        };
        function leavePoint(){
            hideValueLabel(); linkG.selectAll("line").transition().duration(200).remove();
            if (!pinned) halo.interrupt().attr("opacity",0);
            updateShimmerIntensity(d3.mean(pts, d=>d.sev) || 0.3);
        }

        dots.on("mouseenter", showPoint)
            .on("mousemove", (ev)=> htmlTip(wrap).move(d3.pointer(ev, wrap.node())))
            .on("mouseleave", leavePoint)
            .on("click", (ev, d)=>{ if (pinned === d){ pinned=null; valueLabelG.style("opacity",0); } else { pinned=d; showValueLabel(d);} });

        // legend
        const dom = color.domain(), Lh = 140;
        const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 24}, ${margin.top})`);
        legend.append("text").text("Combined severity").attr("font-weight",700);
        const ldefs = svg.append("defs").append("linearGradient").attr("id","sevGrad").attr("x1","0%").attr("y1","100%").attr("x2","0%").attr("y2","0%");
        for(let i=0;i<=10;i++){ const t=i/10, v=dom[0]*(1-t)+dom[1]*t; ldefs.append("stop").attr("offset",`${t*100}%`).attr("stop-color",color(v)); }
        legend.append("rect").attr("x",0).attr("y",16).attr("width",16).attr("height",Lh).attr("fill","url(#sevGrad)").attr("rx",3);
        legend.append("text").attr("x",22).attr("y",22).text(dom[1].toFixed(2));
        legend.append("text").attr("x",22).attr("y",Lh+14).text(dom[0].toFixed(2));

        // brush
        const brush = d3.brush()
            .extent([[0,0],[side,triH]])
            .on("start brush end", ({selection})=>{
                if(!selection){
                    if(window.applyTriangleSelection) window.applyTriangleSelection(null);
                    document.getElementById("ts-n").textContent="0";
                    document.getElementById("ts-mean").textContent="—";
                    return;
                }
                const [[x0,y0],[x1,y1]] = selection;
                const chosen = pts.filter(p=>p.x>=x0 && p.x<=x1 && p.y>=y0 && p.y<=y1);
                dots.attr("opacity", d => (d.x>=x0 && d.x<=x1 && d.y>=y0 && d.y<=y1) ? 1 : 0.15);
                if(window.applyTriangleSelection) window.applyTriangleSelection(chosen.map(d=>d.row));
                document.getElementById("ts-n").textContent = chosen.length;
                document.getElementById("ts-mean").textContent = chosen.length ? ("mean severity: " + d3.mean(chosen, d=>d.sev).toFixed(2)) : "—";
            });
        g.append("g").attr("class","brush").call(brush);

        svg.on("dblclick", ()=>{
            g.select(".brush").call(brush.move, null);
            dots.attr("opacity", 0.9);
            if(window.applyTriangleSelection) window.applyTriangleSelection(null);
            document.getElementById("ts-n").textContent="0";
            document.getElementById("ts-mean").textContent="—";
        });

        // lasso (Shift+drag)
        const lassoG = g.append("g").attr("class","lasso");
        let lActive=false, lPoints=[];
        function drawLasso(){
            const path = d3.path();
            if (!lPoints.length) return;
            path.moveTo(lPoints[0][0], lPoints[0][1]);
            for (let i=1;i<lPoints.length;i++) path.lineTo(lPoints[i][0], lPoints[i][1]);
            path.closePath();
            const shape = lassoG.selectAll("path").data([null]);
            shape.join("path").attr("d", path.toString()).attr("fill","rgba(166,106,43,0.12)").attr("stroke","#a66a2b").attr("stroke-width",2);
        }
        function polygonContains(poly, x, y){
            let inside=false;
            for(let i=0, j=poly.length-1; i<poly.length; j=i++){
                const xi=poly[i][0], yi=poly[i][1], xj=poly[j][0], yj=poly[j][1];
                const intersect = ((yi>y)!=(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi);
                if(intersect) inside = !inside;
            }
            return inside;
        }
        svg.on("mousedown", (ev)=>{ if (!ev.shiftKey) return; const [mx,my] = d3.pointer(ev, g.node()); lActive=true; lPoints=[[mx,my]]; drawLasso(); });
        svg.on("mousemove", (ev)=>{ if (!lActive) return; const [mx,my] = d3.pointer(ev, g.node()); lPoints.push([mx,my]); drawLasso(); });
        svg.on("mouseup", (ev)=>{
            if (!lActive) return; lActive=false;
            const poly = lPoints.slice(); lPoints=[]; lassoG.selectAll("*").remove();
            const chosen = pts.filter(p => polygonContains(poly, p.x, p.y));
            if (chosen.length){
                dots.attr("opacity", d => chosen.includes(d) ? 1 : 0.12);
                if(window.applyTriangleSelection) window.applyTriangleSelection(chosen.map(d=>d.row));
                document.getElementById("ts-n").textContent = chosen.length;
                document.getElementById("ts-mean").textContent = "mean severity: " + d3.mean(chosen, d=>d.sev).toFixed(2);
            } else {
                dots.attr("opacity", 0.9);
                document.getElementById("ts-n").textContent="0";
                document.getElementById("ts-mean").textContent="—";
            }
        });

        // heatmap toggle
        const heatG = g.append("g").attr("class","heat").style("opacity",0);
        function renderHeat(){
            const density = d3.contourDensity().x(d=>d.x).y(d=>d.y).weight(d=>d.sev*1.2 + 0.4).size([side, triH]).bandwidth(22)(pts);
            const cScale = d3.scaleLinear().domain(d3.extent(density, d=>d.value)).range([0.1, 0.45]);
            heatG.selectAll("path").data(density).join("path").attr("d", d3.geoPath())
                .attr("fill", (d,i)=> d3.interpolateWarm(i/density.length)).attr("opacity", d=>cScale(d.value)).attr("stroke","none");
            const clip = defs.append("clipPath").attr("id","triClip");
            clip.append("path").attr("d", d3.path(p => { p.moveTo(...A); p.lineTo(...B); p.lineTo(...C); p.closePath(); }).toString());
            heatG.attr("clip-path","url(#triClip)");
        }
        let heatOn=false;
        function toggleHeat(){ if (!heatOn){ renderHeat(); heatG.transition().duration(250).style("opacity",1); heatOn=true; }
        else { heatG.transition().duration(200).style("opacity",0).on("end", ()=>heatG.selectAll("*").remove()); heatOn=false; } }
        document.getElementById("tri-clear").onclick = () => { g.select(".brush").call(brush.move, null); dots.attr("opacity",0.9);
            if(window.applyTriangleSelection) window.applyTriangleSelection(null); document.getElementById("ts-n").textContent="0"; document.getElementById("ts-mean").textContent="—"; };
        document.getElementById("tri-heat").onclick = toggleHeat;

        // bring overlays to top (append again at end)
        ["tri-insight-overlay","tri-tools","tri-stats"].forEach(id=>{
            const el = document.getElementById(id); if (el) container.appendChild(el);
        });

        // guided steps text
        const overlay = document.getElementById("tri-insight-overlay");
        const label = overlay.querySelector(".label");
        const nextBtn = document.getElementById("tri-next");
        const sevVals = pts.map(p=>p.sev).sort(d3.ascending);
        const sev70 = d3.quantile(sevVals, 0.70) || (dom[0] + 0.7*(dom[1]-dom[0]));
        const steps = [
            { text: "Step 1 — Triangle maps proportions: each point = (%Stress, %Anxiety, %Depression).", filter: null },
            { text: "Step 2 — Cluster along the Stress–Anxiety edge: emotions co-move.", filter: p => (p.s + p.a) > p.d },
            { text: "Step 3 — Brighter colors ≈ higher combined severity. Hover to see exact values (dot isolates & labels).", filter: p => p.sev >= sev70 },
            { text: "Step 4 — Brush or ⇧-lasso to filter the Garden; toggle heatmap for cluster density.", filter: null }
        ];
        let idx = -1;
        function applyStep(i){
            if (i < 0) return;
            const st = steps[i];
            label.textContent = "Triangle tour: " + st.text;
            if (!st.filter){ dots.transition().duration(300).attr("opacity", 0.9); return; }
            dots.transition().duration(300).attr("opacity", d => st.filter(d) ? 1 : 0.12);
        }
        nextBtn.onclick = () => { idx = (idx + 1) % steps.length; applyStep(idx); };
    }

    window.renderTriangle = renderTriangle;
})();
