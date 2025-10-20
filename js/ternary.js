// ternary.js
(function () {
    function tooltip(container) {
        const t = container.append("div")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("padding", "6px 8px")
            .style("border-radius", "6px")
            .style("background", "rgba(20,20,20,0.92)")
            .style("color", "#fff")
            .style("font", "12px/1.2 system-ui, sans-serif")
            .style("opacity", 0);
        return {
            show(html, [x, y]) { t.html(html).style("left", x + 10 + "px").style("top", y + 10 + "px").style("opacity", 1); },
            move([x, y]) { t.style("left", x + 10 + "px").style("top", y + 10 + "px"); },
            hide() { t.style("opacity", 0); }
        };
    }

    function renderTriangle(rows) {
        const root = d3.select("#triangle-vis");
        root.selectAll("*").remove();

        // wrapper for absolute tooltip positioning
        const wrap = root.append("div").style("position", "relative").style("width", "100%").style("height", "100%");
        const tip = tooltip(wrap);

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
            pts.push({x,y,s,a,d,sev,row:r});
        }

        // color/size
        const color = d3.scaleSequential(d3.interpolatePlasma).domain(d3.extent(pts, d=>d.sev));
        const r = d3.scaleSqrt().domain(d3.extent(pts, d=>d.sev)).range([1.8, 5.2]);

        const dots = g.append("g").selectAll("circle")
            .data(pts).join("circle")
            .attr("cx", d=>d.x).attr("cy", d=>d.y).attr("r", d=>r(d.sev))
            .attr("fill", d=>color(d.sev)).attr("opacity", 0.9)
            .on("mouseenter", (ev,d)=>{
                tip.show(`<b>S</b> ${d.s.toFixed(1)} • <b>A</b> ${d.a.toFixed(1)} • <b>D</b> ${d.d.toFixed(1)}`, d3.pointer(ev, wrap.node()));
            })
            .on("mousemove", (ev)=> tip.move(d3.pointer(ev, wrap.node())))
            .on("mouseleave", ()=> tip.hide());

        // legend
        const dom = color.domain(), Lh = 140;
        const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 24}, ${margin.top})`);
        legend.append("text").text("Combined severity").attr("font-weight",700);
        const grad = svg.append("defs").append("linearGradient").attr("id","sevGrad").attr("x1","0%").attr("y1","100%").attr("x2","0%").attr("y2","0%");
        for(let i=0;i<=10;i++){ const t=i/10, v=dom[0]*(1-t)+dom[1]*t; grad.append("stop").attr("offset",`${t*100}%`).attr("stop-color",color(v)); }
        legend.append("rect").attr("x",0).attr("y",16).attr("width",16).attr("height",Lh).attr("fill","url(#sevGrad)").attr("rx",3);
        legend.append("text").attr("x",22).attr("y",22).text(dom[1].toFixed(2));
        legend.append("text").attr("x",22).attr("y",Lh+14).text(dom[0].toFixed(2));

        // brush (rectangle)
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
    }
    window.renderTriangle = renderTriangle;
})();
