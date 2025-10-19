
// main.js — bootstraps both visualizations
(async function() {
    const data = await d3.csv("data/cleaned_data.csv", d3.autoType);

    // Render Novel Vis 1
    renderGarden(data);

    // Render Vis 2
    renderTriangle(data);
})();
