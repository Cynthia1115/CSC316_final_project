
// ternary.js — Emotion Constellation Triangle
(function() {
    const width = 980, height = 480, margin = {top: 30, right: 20, bottom: 40, left: 40};

    function barycentricToXY(a, b, c, side=1) {
        // a+b+c = 1; vertices: A(top), B(bottom-left), C(bottom-right)
        const x = 0.5 * (2*c + b) / (a + b + c);
        const y = (Math.sqrt(3)/2) * b / (a + b + c);
        // invert y to screen space
        return [x * side, (Math.sqrt(3)/2)*side - y * side];
    }

    function renderTriangle(data) {
        const svg = d3.select("#triangle-vis")
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`);

        const side = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) - 20;
        const originX = (width - side) / 2, originY = (height - Math.sqrt(3)/2 * side) / 2 + 10;

        const g = svg.append("g").attr("transform", `translate(${originX}, ${originY})`);

        // Triangle border
        g.append("path")
            .attr("d", d3.path()
                .moveTo(0.5*side, 0)
                .lineTo(0, Math.sqrt(3)/2*side)
                .lineTo(side, Math.sqrt(3)/2*side)
                .closePath()
                .toString()
            )
            .attr("fill", "none")
            .attr("stroke", "#374151").attr("stroke-width", 2);

        // Axes labels
        const labels = [
            {x: 0.5*side, y: -8, text: "STRESS (PSS-10)"},
            {x: -10, y: Math.sqrt(3)/2*side + 16, text: "ANXIETY (GAD-7)"},
            {x: side + 10, y: Math.sqrt(3)/2*side + 16, text: "DEPRESSION (PHQ-9)", anchor: "end"}
        ];
        g.selectAll(".axlab").data(labels).join("text")
            .attr("class","legend")
            .attr("x", d=>d.x).attr("y", d=>d.y)
            .attr("text-anchor", d=>d.anchor||"middle")
            .text(d=>d.text);

        // Grid (optional small tick markers)
        const ticks = 5;
        for (let i=1;i<ticks;i++){
            const t=i/ticks;
            // parallels to sides
            const p1 = barycentricToXY(t, 1-t, 0, side);
            const p2 = barycentricToXY(t, 0, 1-t, side);
            g.append("line").attr("x1", p1[0]).attr("y1", p1[1]).attr("x2", p2[0]).attr("y2", p2[1]).attr("stroke", "#1f2937").attr("opacity", 0.6);
            const q1 = barycentricToXY(1-t, t, 0, side);
            const q2 = barycentricToXY(0, t, 1-t, side);
            g.append("line").attr("x1", q1[0]).attr("y1", q1[1]).attr("x2", q2[0]).attr("y2", q2[1]).attr("stroke", "#1f2937").attr("opacity", 0.4);
            const r1 = barycentricToXY(1-t, 0, t, side);
            const r2 = barycentricToXY(0, 1-t, t, side);
            g.append("line").attr("x1", r1[0]).attr("y1", r1[1]).attr("x2", r2[0]).attr("y2", r2[1]).attr("stroke", "#1f2937").attr("opacity", 0.35);
        }

        const tip = VisUtils.createTooltip(d3.select("#triangle-vis"));

        // Prepare points
        const points = data.map(d => {
            const s = Math.max(0, +d.stress_score);
            const a = Math.max(0, +d.anxiety_score);
            const p = Math.max(0, +d.depression_score);
            const sum = s + a + p || 1;
            const st = s/sum, an = a/sum, de = p/sum;
            const [x, y] = barycentricToXY(st, an, de, side);
            const severity = (s/40 + a/21 + p/27)/3; // normalized 0..1
            return { x, y, st, an, de, severity, raw: d };
        });

        const color = d3.scaleSequential(d3.interpolateTurbo).domain([0,1]); // low->high
        const r = d3.scaleSqrt().domain([0,1]).range([2.2, 4]);

        g.selectAll("circle.pt")
            .data(points)
            .join("circle")
            .attr("class","pt")
            .attr("cx", d=>d.x)
            .attr("cy", d=>d.y)
            .attr("r", d=>r(d.severity))
            .attr("fill", d=>color(d.severity))
            .attr("opacity", 0.85)
            .on("mousemove", (event, d) => {
                const html = `<b>Student #${d.raw.id}</b><br/>
          Stress=${d.raw.stress_score}, Anxiety=${d.raw.anxiety_score}, Depression=${d.raw.depression_score}<br/>
          Coping: ${d.raw.coping_strategy}, Sleep: ${d.raw.sleep_hours}h`;
                tip.show(html, d3.pointer(event, event.currentTarget.ownerSVGElement));
            })
            .on("mouseleave", () => tip.hide());
    }

    window.renderTriangle = renderTriangle;
})();
