
// utils.js — helpers (scales, tooltip)
window.VisUtils = (function() {
    function createTooltip(container) {
        const tip = container.append("div")
            .attr("class", "tooltip");
        function show(html, [x, y]) {
            tip.html(html)
                .style("left", `${x + 14}px`)
                .style("top", `${y + 14}px`)
                .style("opacity", 1)
                .style("transform", "translateY(-2px)");
        }
        function move([x, y]) {
            tip.style("left", `${x + 14}px`).style("top", `${y + 14}px`);
        }
        function hide() {
            tip.style("opacity", 0).style("transform", "translateY(0px)");
        }
        return { show, move, hide, el: tip };
    }

    function niceNumber(n, digits=2) {
        return (Math.round(n * 10**digits) / 10**digits).toLocaleString();
    }

    return { createTooltip, niceNumber };
})();
