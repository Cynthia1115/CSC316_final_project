
// garden.js — Coping Strategy Garden (novel vis)
(function() {
    const width = 980, height = 480, margin = {top: 30, right: 20, bottom: 60, left: 60};

    function renderGarden(data) {
        // Aggregate by coping strategy
        const groups = d3.rollups(
            data,
            v => ({
                count: v.length,
                avgStress: d3.mean(v, d => d.stress_score),
                avgExercise: d3.mean(v, d => d.exercise_hours)
            }),
            d => d.coping_strategy
        ).map(([k, o]) => ({ coping: k, ...o }));

        // Sort by effectiveness (lower stress => taller)
        groups.sort((a,b) => d3.ascending(a.avgStress, b.avgStress));

        const x = d3.scaleBand()
            .domain(groups.map(d => d.coping))
            .range([margin.left, width - margin.right])
            .padding(0.3);

        // Height = effectiveness (inverse stress)
        const stressExtent = d3.extent(groups, d => d.avgStress);
        const eff = d3.scaleLinear()
            .domain([stressExtent[1], stressExtent[0]]) // lower stress -> higher value
            .range([80, height - margin.bottom - 40]);

        const color = d3.scaleLinear()
            .domain(d3.extent(groups, d => d.count))
            .range(["#38bdf8", "#f59e0b"]); // frequency: blue -> amber

        const size = d3.scaleSqrt()
            .domain(d3.extent(groups, d => d.avgExercise))
            .range([6, 22]); // flower size by exercise hours

        const svg = d3.select("#garden-vis")
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`);

        // Axes
        const gx = svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .attr("class", "axis")
            .call(d3.axisBottom(x).tickSizeOuter(0));

        gx.selectAll("text").attr("transform", "rotate(-20)").style("text-anchor", "end");

        // Ground line
        svg.append("line")
            .attr("x1", margin.left - 30).attr("x2", width - margin.right + 30)
            .attr("y1", height - margin.bottom).attr("y2", height - margin.bottom)
            .attr("stroke", "#374151").attr("stroke-width", 2);

        const tip = VisUtils.createTooltip(d3.select("#garden-vis"));

        // Plants
        const g = svg.append("g");

        const stems = g.selectAll(".stem")
            .data(groups)
            .join("g")
            .attr("transform", d => `translate(${x(d.coping) + x.bandwidth()/2}, ${height - margin.bottom})`);

        stems.append("line")
            .attr("class", "stem")
            .attr("x1", 0).attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", d => -eff(d.avgStress))
            .attr("stroke", d => color(d.count))
            .attr("stroke-width", 4)
            .attr("stroke-linecap", "round");

        // leaves: small circles along stem proportional to frequency
        stems.append("circle")
            .attr("class", "leaf")
            .attr("cx", -10)
            .attr("cy", d => -eff(d.avgStress)*0.45)
            .attr("r", 6)
            .attr("fill", d => color(d.count))
            .attr("opacity", 0.9);

        stems.append("circle")
            .attr("class", "leaf")
            .attr("cx", 12)
            .attr("cy", d => -eff(d.avgStress)*0.7)
            .attr("r", 5)
            .attr("fill", d => color(d.count))
            .attr("opacity", 0.9);

        // flower top
        stems.append("circle")
            .attr("class", "flower")
            .attr("cx", 0)
            .attr("cy", d => -eff(d.avgStress))
            .attr("r", d => size(d.avgExercise))
            .attr("fill", d => d3.interpolateTurbo(1 - (d.avgStress - stressExtent[0]) / (stressExtent[1]-stressExtent[0] + 1e-6)))
            .attr("stroke", "#0b1220")
            .attr("stroke-width", 1.5)
            .style("cursor", "pointer")
            .on("mousemove", (event, d) => {
                const html = `<b>${d.coping}</b><br/>
          Avg Stress: <b>${VisUtils.niceNumber(d.avgStress, 1)}</b><br/>
          Avg Exercise: <b>${VisUtils.niceNumber(d.avgExercise, 2)}</b> hrs/wk<br/>
          Responses: <b>${d.count}</b>`;
                tip.show(html, d3.pointer(event, event.currentTarget.ownerSVGElement));
            })
            .on("mouseleave", () => tip.hide());

        // Legends
        const legend = svg.append("g").attr("transform", `translate(${width - 220}, ${margin.top})`);

        // frequency legend
        const freqLegend = legend.append("g");
        freqLegend.append("text").text("Frequency").attr("class","legend").attr("y",-6);
        const freqScale = d3.scaleLinear().domain(d3.extent(groups, d => d.count)).range([0, 120]);
        freqLegend.selectAll("rect").data(d3.range(0,1.01,0.1)).join("rect")
            .attr("x", d => d*120).attr("y", 2).attr("width", 12).attr("height", 10)
            .attr("fill", d => color(freqScale.invert(d*120)));
        freqLegend.append("text").text(d3.min(groups, d=>d.count)).attr("class","legend").attr("x",0).attr("y",26);
        freqLegend.append("text").text(d3.max(groups, d=>d.count)).attr("class","legend").attr("x",120).attr("y",26).attr("text-anchor","end");

        // size legend
        const sizeLegend = legend.append("g").attr("transform","translate(0,50)");
        sizeLegend.append("text").text("Exercise hrs/wk").attr("class","legend").attr("y",-6);
        const sizes = [size.domain()[0], d3.mean(size.domain()), size.domain()[1]];
        sizeLegend.selectAll("circle").data(sizes).join("circle")
            .attr("cx", (d,i)=> i*50 + 12).attr("cy", 10).attr("r", d => size(d)).attr("fill", "#f59e0b").attr("opacity", 0.9);
        sizeLegend.selectAll("text.lab").data(sizes).join("text")
            .attr("class","legend lab").attr("x",(d,i)=> i*50 + 12).attr("y", 36).attr("text-anchor","middle")
            .text(d => d.toFixed(1));
    }

    window.renderGarden = renderGarden;
})();
