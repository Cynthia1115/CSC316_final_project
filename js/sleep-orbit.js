(function() {
    const container = document.getElementById("sleep-orbit-vis");
    const width = (container.clientWidth || 980);
    const height = 400;

    const innerR = 200;
    const outerR = 300;

    // For main arc
    const cx = width/2;
    const cy = outerR + 50

    // semicircle angles: 0 to 180 in radians
    // zeros are different compared to arc
    const startAngle = 0;
    const endAngle = -Math.PI;
    const slider_radius = (outerR + innerR) / 2;

    const ticksize = 10;

    const sliders = [{
        angle: -1
    },
    {
        angle: -2
    },
    { 
        angle: -3
    }]

    function renderSleepOrbit() {
        root = d3.select(container)

        const svg = root.append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("id", "sleep-orbit-svg")
            .append("g")
            .attr("transform", "translate(" + cx +  "," + cy + ")");
        sunset_colors = ["#BF3475","#50366F","#1F214D","#FFCE61"].reverse()

        const arcs = d3.range(sliders.length - 1).map(i => ({
            color: sunset_colors[1+i],
            startAngle: sliders[i].angle + Math.PI / 2,
            endAngle: sliders[i + 1].angle + Math.PI / 2
        }));
        
        arcs.push({
            color: sunset_colors[0],
            startAngle: startAngle + Math.PI / 2,
            endAngle: sliders[0].angle + Math.PI / 2
        }); // First slice

        arcs.push({
            color: sunset_colors[3],
            startAngle: sliders[sliders.length-1].angle + Math.PI / 2,
            endAngle: endAngle + Math.PI / 2
        }); // Last slice

        console.log(arcs)

        const arcGen = d3.arc() // Start/end angle already set in data
            .innerRadius(innerR)
            .outerRadius(outerR)
        

        svg.append("g") // Add SVG group for arcs
            .selectAll("path")
            .data(arcs)
            .enter()
            .append("path")
            .attr("d", d => arcGen(d))
            .attr("fill", d => d.color);

        // draw sliders
        svg.selectAll("circle")
            .data(sliders)
            .enter()
            .append("circle")
            .attr("cx", s => slider_radius * Math.cos(s.angle))
            .attr("cy", s => slider_radius * Math.sin(s.angle))
            .attr("r", 10)
            .attr("fill", "white");
        
        const tick_angles = d3.range(17).map(i => { // 16 segments for 16 hours, so 17 ticks
            const time = (36 - i)%24 // Hour in 24H time (starting at 8pm), reversed
            let timestring;
            if (time == 0) {
                timestring = "12 AM";
            } else if (time == 12) {
                timestring = time + " PM";
            } else if (time >= 13) {
                timestring = time%12 + " PM";
            } else {
                timestring = time + " AM"
            }

            return {
                angle: startAngle + ((endAngle-startAngle)*i/16),
                time: timestring
            };
        })

        // draw ticks
        svg.append("g")
            .selectAll("line")
            .data(tick_angles)
            .enter()
            .append("line")
            .attr("x1", t => outerR * Math.cos(t.angle))
            .attr("y1", t => outerR * Math.sin(t.angle))
            .attr("x2", t => (outerR+ticksize) * Math.cos(t.angle))
            .attr("y2", t => (outerR+ticksize) * Math.sin(t.angle))
            .attr("stroke", "#333")
            .attr("stroke-width", 2)
        
        // draw time labels
        svg.append("g")
            .selectAll("text")
            .data(tick_angles)
            .enter()
            .append("text")
            .attr("x", t => (outerR+ticksize+5) * Math.cos(t.angle))
            .attr("y", t => (outerR+ticksize+5) * Math.sin(t.angle))
            .text(t => t.time)
            .attr("fill", "grey")
            .attr("font-size", 7);

        dummy_data = []
    
        svg.append("g")
            .selectAll("path")
            .data()
            
    }
    
    window.renderSleepOrbit = renderSleepOrbit;
})()