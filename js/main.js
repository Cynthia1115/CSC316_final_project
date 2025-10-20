// main.js (robust loader)
(async function () {
    async function loadCSV() {
        try {
            return await d3.csv("data/cleaned_data.csv", d3.autoType);
        } catch (e1) {
            try {
                return await d3.csv("cleaned_data.csv", d3.autoType);
            } catch (e2) {
                console.error("Failed to load CSV from both paths", e1, e2);
                return [];
            }
        }
    }

    const data = await loadCSV();

    window.__FULL_ROWS__ = data;

    window.applyTriangleSelection = function (subset) {
        const rows = subset && subset.length ? subset : window.__FULL_ROWS__;
        if (window.renderGarden) window.renderGarden(rows);
    };

    if (window.renderTriangle) window.renderTriangle(data);
    if (window.renderGarden) window.renderGarden(data);
})();