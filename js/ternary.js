// ternary.js — Guided overlay + exact values (raw + %) + touch support
(function () {
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

    function ensureOverlay(){
        if (document.getElementById("tri-insight-overlay")) return;
        const div = document.createElement("div");
        div.id = "tri-insight-overlay";
        Object.assign(div.style, {
            position:"fixed", right:"18px", bottom:"78px", zIndex:9999, display:"flex",
            gap:"10px", alignItems:"center", background:"rgba(255,255,255,0.6)", backdropFilter:"blur(6px)",
            border:"1px solid rgba(0,0,0,0.08)", borderRadius:"12px", padding:"10px 12px",
            boxShadow:"0 4px 12px rgba(0,0,0,0.08)", fontFamily:"Inter, system-ui, sans-serif"
        });
        const label = document.createElement("div");
        label.className="label";
        Object.assign(label.style, {fontWeight:"700", color:"#2b2116"});
        label.textContent = "Triangle tour: Step 1/4";
        const btn = document.createElement("button");
        btn.id="tri-next"; btn.textContent="Next →";
        Object.assign(btn.style, {border:"none", borderRadius:"10px", padding:"8px 12px",
            cursor:"pointer", background:"var(--accent, #a66a2b)", color:"white", fontWeight:"700"});
        btn.onmouseenter = () => btn.style.filter = "brightness(0.92)";
        btn.onmouseleave = () => btn.style.filter = "none";
        div.append(label, btn);
        document.body.appendChild(div);
    }

    function renderTriangle(rows) {
        const root = d3.select("#triangle-vis");
        root.selectAll("*").remove();

        const wrap = root.append("div")
            .style("position","relative")
            .style("width","100%").style("height","100%");
        const tip = htmlTip(wrap);

        const width = root.node().clientWidth || 980;
        const height = 560;
        const margin = { top: 24, right: 180, bottom: 24, left: 24 };

        const side = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom);
        const triH = (Math.sqrt(3) / 2) * side;

        const svg = wrap.append("svg").attr("width", width).attr("height", height);
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
        const norm = (s, a, d) => {
            s = +s || 0; a = +a || 0; d = +d || 0;
            const sum = s + a + d || 1; return [s / sum, a / sum, d / sum];
        };
        const bary = (dep, str, anx) => {
            const x = 0.5 * (2 * anx + str) / (dep + str + anx);
            const y = (Math.sqrt(3) / 2) * str / (dep + str + anx);
            return [x * side, triH - y * side];
        };

        // rows -> points
        const pts = [];
        for (const r of rows) {
            const s = get(r, ["stress_score","PSS10","stress"]);
            const a = get(r, ["anxiety_score","GAD7","anxiety"]);
            const d = get(r, ["depression_score","PHQ9","depression"]);
            if (![s,a,d].every(Number.isFinite)) continue;
            const [sn, an, dn] = norm(s,a,d);
            const [x,y] = bary(dn, sn, an);
            const sev = (s+a+d) / 30; // ~0..1
            pts.push({x,y,s,a,d,sn,an,dn,sev,row:r});
        }

        // color/size
        const color = d3.scaleSequential(d3.interpolatePlasma).domain(d3.extent(pts, d=>d.sev));
        const rr = d3.scaleSqrt().domain(d3.extent(pts, d=>d.sev)).range([1.8, 5.2]);

        const dotG = g.append("g");
        const dots = dotG.selectAll("circle")
            .data(pts).join("circle")
            .attr("cx", d=>d.x).attr("cy", d=>d.y).attr("r", d=>rr(d.sev))
            .attr("fill", d=>color(d.sev)).attr("opacity", 0.0);

        dots.transition().duration(700).attr("opacity", 0.9);

        // Hover halo (JS pulse)
        const halo = g.append("circle")
            .attr("fill","none")
            .attr("stroke","var(--accent, #a66a2b)")
            .attr("stroke-width", 2.5)
            .attr("opacity", 0)
            .attr("pointer-events","none");

        function pulse(cx, cy){
            halo.interrupt().attr("cx", cx).attr("cy", cy).attr("r", 16).attr("opacity", 0.0);
            function loop(){
                halo.transition().duration(900)
                    .attr("opacity", 0.5).attr("stroke-width", 6).attr("r", 26)
                    .transition().duration(900).attr("opacity", 0.0).attr("stroke-width", 2.5).attr("r", 16)
                    .on("end", loop);
            }
            loop();
        }
        function stopPulse(){ halo.interrupt().attr("opacity", 0); }

        // neighbor lines
        const linkG = g.append("g").attr("class","links").attr("stroke","#6b5743").attr("stroke-opacity",0.25);

        const qt = d3.quadtree().x(d=>d.x).y(d=>d.y).addAll(pts);
        function neighbors(p, radius=36, maxN=28){
            const near=[];
            qt.visit(function(node, x0, y0, x1, y1){
                const dx = Math.max(0, Math.max(x0 - p.x, p.x - x1));
                const dy = Math.max(0, Math.max(y0 - p.y, p.y - y1));
                if (dx*dx + dy*dy > radius*radius) return true;
                if (!node.length){
                    do {
                        const d = node.data;
                        if (d && d!==p){
                            const ddx=d.x-p.x, ddy=d.y-p.y;
                            if (ddx*ddx+ddy*ddy<=radius*radius) near.push(d);
                        }
                    } while (node = node.next);
                }
                return false;
            });
            near.sort((a,b)=>((a.x-p.x)**2+(a.y-p.y)**2)-((b.x-p.x)**2+(b.y-p.y)**2));
            return near.slice(0,maxN);
        }

        function tooltipHTML(d){
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

        const showPoint = (ev,d)=>{
            const [px,py] = d3.pointer(ev, wrap.node());
            tip.show(tooltipHTML(d), [px,py]);
            pulse(d.x, d.y);
            const ns = neighbors(d, 48, 36);
            const L = linkG.selectAll("line").data(ns, k=>k.x+"-"+k.y);
            L.join(
                enter => enter.append("line")
                    .attr("x1", d.x).attr("y1", d.y).attr("x2", d.x).attr("y2", d.y)
                    .attr("stroke-width", 1.2)
                    .call(e=>e.transition().duration(250).attr("x2", k=>k.x).attr("y2", k=>k.y)),
                update => update,
                exit => exit.transition().duration(200).attr("x2", d.x).attr("y2", d.y).remove()
            );
        };

        dots
            .on("mouseenter", showPoint)
            .on("mousemove", (ev)=> tip.move(d3.pointer(ev, wrap.node())))
            .on("mouseleave", ()=>{ tip.hide(); stopPulse(); linkG.selectAll("line").transition().duration(200).remove(); })
            // touch support
            .on("touchstart", (ev,d)=>{ ev.preventDefault(); showPoint(ev,d); })
            .on("touchmove", (ev)=>{ ev.preventDefault(); tip.move(d3.pointer(ev, wrap.node())); })
            .on("touchend", ()=>{ tip.hide(); stopPulse(); linkG.selectAll("line").transition().duration(200).remove(); });

        // legend
        const dom = color.domain(), Lh = 140;
        const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 24}, ${margin.top})`);
        legend.append("text").text("Combined severity").attr("font-weight",700);
        const grad = svg.append("defs").append("linearGradient").attr("id","sevGrad").attr("x1","0%").attr("y1","100%").attr("x2","0%").attr("y2","0%");
        for(let i=0;i<=10;i++){ const t=i/10, v=dom[0]*(1-t)+dom[1]*t; grad.append("stop").attr("offset",`${t*100}%`).attr("stop-color",color(v)); }
        legend.append("rect").attr("x",0).attr("y",16).attr("width",16).attr("height",Lh).attr("fill","url(#sevGrad)").attr("rx",3);
        legend.append("text").attr("x",22).attr("y",22).text(dom[1].toFixed(2));
        legend.append("text").attr("x",22).attr("y",Lh+14).text(dom[0].toFixed(2));

        // brush (rectangle) with link to Garden
        const brush = d3.brush()
            .extent([[0,0],[side,triH]])
            .on("start brush end", ({selection})=>{
                if(!selection){
                    dots.attr("opacity", 0.9);
                    if(window.applyTriangleSelection) window.applyTriangleSelection(null);
                    return;
                }
                const [[x0,y0],[x1,y1]] = selection;
                const chosen = pts.filter(p=>p.x>=x0 && p.x<=x1 && p.y>=y0 && p.y<=y1);
                dots.attr("opacity", d => (d.x>=x0 && d.x<=x1 && d.y>=y0 && d.y<=y1) ? 1 : 0.15);
                if(window.applyTriangleSelection) window.applyTriangleSelection(chosen.map(d=>d.row));
            });

        g.append("g").attr("class","brush").call(brush);

        // double-click to clear
        svg.on("dblclick", ()=>{
            g.select(".brush").call(brush.move, null);
            dots.attr("opacity", 0.9);
            if(window.applyTriangleSelection) window.applyTriangleSelection(null);
        });

        // --- Guided narrative overlay (4 clearer steps) ---
        ensureOverlay();
        const overlay = document.getElementById("tri-insight-overlay");
        const label = overlay.querySelector(".label");
        const nextBtn = document.getElementById("tri-next");

        const sevVals = pts.map(p=>p.sev).sort(d3.ascending);
        const sev70 = d3.quantile(sevVals, 0.70) || (dom[0] + 0.7*(dom[1]-dom[0]));

        const steps = [
            { text: "Step 1 — Triangle maps proportions: each point = (%Stress, %Anxiety, %Depression).", filter: null },
            { text: "Step 2 — Cluster along the Stress–Anxiety edge: emotions co-move.", filter: p => (p.s + p.a) > p.d },
            { text: "Step 3 — Brighter colors ≈ higher combined severity.", filter: p => p.sev >= sev70 },
            { text: "Step 4 — Brush a region to filter the Garden view.", filter: null }
        ];
        let idx = -1;
        function applyStep(i){
            if (i < 0) return;
            const st = steps[i];
            label.textContent = "Triangle tour: " + st.text;
            if (!st.filter){
                dots.transition().duration(300).attr("opacity", 0.9);
                return;
            }
            dots.transition().duration(300).attr("opacity", d => st.filter(d) ? 1 : 0.12);
        }
        nextBtn.onclick = () => { idx = (idx + 1) % steps.length; applyStep(idx); };

        // expose for debugging
        window.__trianglePoints = pts;
    }

    window.renderTriangle = renderTriangle;
})();