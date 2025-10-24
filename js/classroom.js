function renderClassroom(data) {
    const TOTAL = 16;
    const majors = [
        "BBA", "Biotech", "Chemical", "Civil",
        "Computer Application", "Computer Science",
        "design", "Designer", "EEE/ECE", "EEE/ECE/EIE",
        "Fashion Technology", "Fine Arts", "industrial engineering",
        "MBBS", "Mechanical", "Statistics"
    ];

    let students = majors.map((major, i) => {
        let d = data[i % data.length]; 
        return {
            stress_level: d.stress_level ?? Math.floor(Math.random()*3),
            major: major,
            age: d.age ?? Math.floor(Math.random() * 10 + 18), 
            gender: d.gender ?? (Math.random() < 0.5 ? "Male" : "Female")
        };
    });

    // average stress, age per major
    let averages = {};
    majors.forEach((major) => {
        let majorData = data.filter(d => d.major === major);
        if (majorData.length === 0) return;

        let avgStress = d3.mean(majorData, d => d.stress_level);
        let avgAge = d3.mean(majorData, d => d.age);
        let genderCounts = d3.rollup(
            majorData,
            v => v.length,
            d => d.gender
        );

        averages[major] = {
            avgStress,
            avgAge,
            genderCounts
        };
    });

    console.log("Averages per major:", averages);

    //layout
    const rows = 4;
    const cols = 4;
    const padding = 20;
    const headR = 12;
    const bodyH = 36;
    const armW = 20;
    const legH = 24;

    const width = cols * (armW * 2 + padding);
    const height = rows * (headR * 2 + bodyH + legH + padding);

    const colourScale = d3.scaleOrdinal()
                        .domain([0, 1, 2])
                        .range(["lightblue", "orange", "red"]);

    d3.select("#classroom-vis").selectAll("*").remove();

    const svg = d3.select("#classroom-vis")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    const tooltip = d3.select("#tooltip");

    students.forEach((d, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * (armW * 2 + padding) + armW + padding / 2;
        const y = row * (headR * 2 + bodyH + legH + padding) + headR;

        const g = svg.append("g")
            .attr("transform", `translate(${x}, ${y})`)
            .style("cursor", "pointer");

        const colour = colourScale(d.stress_level);

        // Head
        g.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", headR)
            .attr("fill", colour);

        // Body
        g.append("line")
            .attr("x1", 0)
            .attr("y1", headR)
            .attr("x2", 0)
            .attr("y2", headR + bodyH)
            .attr("stroke", colour)
            .attr("stroke-width", 2);

        // Arms
        g.append("line")
            .attr("x1", -armW)
            .attr("y1", headR + bodyH / 3)
            .attr("x2", armW)
            .attr("y2", headR + bodyH / 3)
            .attr("stroke", colour)
            .attr("stroke-width", 2);

        // Legs
        g.append("line")
            .attr("x1", 0)
            .attr("y1", headR + bodyH)
            .attr("x2", -armW)
            .attr("y2", headR + bodyH + legH)
            .attr("stroke", colour)
            .attr("stroke-width", 2);

        g.append("line")
            .attr("x1", 0)
            .attr("y1", headR + bodyH)
            .attr("x2", armW)
            .attr("y2", headR + bodyH + legH)
            .attr("stroke", colour)
            .attr("stroke-width", 2);

        //tooltip
        g.on("mouseover", (event) => {
            tooltip.style("display", "block")
                   .html(`
                        <strong>Major:</strong> ${d.major}<br/>
                        <strong>Stress:</strong> ${d.stress_level}<br/>
                        <strong>Age:</strong> ${d.age}<br/>
                        <strong>Gender:</strong> ${d.gender}
                   `);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 12) + "px")
                   .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("display", "none");
        });
    });


    //legend
    const legendData = [
        { label: "Low Stress", color: "lightblue" },
        { label: "Moderate Stress", color: "orange" },
        { label: "High Stress", color: "red" }
    ];

    const legendX = 350; 
    const legendY = height - 250; 
    const legendSpacing = 25;

    const legend = svg.append("g")
        .attr("class", "legend");

    legend.selectAll("rect")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("x", legendX)
        .attr("y", (d, i) => legendY + i * legendSpacing)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", legendX + 30)
        .attr("y", (d, i) => legendY + i * legendSpacing + 15)
        .text(d => d.label)
        .attr("font-size", "14px")
        .attr("fill", "#333");

}

if (window.__FULL_ROWS__ && window.__FULL_ROWS__.length) {
    renderClassroom(window.__FULL_ROWS__);
}
