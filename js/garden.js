/* ---------------------------------------------------------------------------
 * garden.js — Coping Strategy Garden with ANCHORED CALLOUT LABELS
 * - Hover a flower (or its stem): show a small black callout pinned at the flower top
 * - y-encoding: EXACT COLUMN 'stress_score'
 * - Optional fields (auto-detected): exercise_hours_per_week | exercise_hours | avg_exercise
 * - Group key: coping_strategy (fallback: coping / activity / behavior)
 * --------------------------------------------------------------------------*/

(function () {
    window.renderGarden = renderGarden;

    // Toggle if you also want small static numbers above flowers at all times
    const SHOW_STATIC_NUM_LABELS = false;

    // Helper to pick first available property name
    function pick(obj, keys, fallback = undefined) {
        for (const k of keys) {
            if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
        }
        return fallback;
    }

    function renderGarden(rows) {
        const mount = d3.select('#garden-vis');
        mount.selectAll('*').remove();

        // ------- Dimensions
        const width = Math.min(mount.node().clientWidth || 980, 1280);
        const height = 560;
        const margin = { top: 22, right: 24, bottom: 88, left: 80 };

        // ------- Accessors (stress locked to 'stress_score')
        const copingAccessor   = d => pick(d, ['coping_strategy', 'coping', 'activity', 'behavior', 'Coping']);
        const stressAccessor   = d => +d.stress_score; // exact column
        const exerciseAccessor = d => +pick(d, ['exercise_hours_per_week', 'exercise_hours', 'avg_exercise', 'Exercise_Hours']);

        // ------- Filter & aggregate
        const valid = rows.filter(r => copingAccessor(r) && Number.isFinite(stressAccessor(r)));

        const grouped = d3.rollups(
            valid,
            v => {
                const n = v.length;
                const avgStress = d3.mean(v, stressAccessor);
                const exVals = v.map(exerciseAccessor).filter(Number.isFinite);
                const avgExercise = exVals.length ? d3.mean(exVals) : null;
                return { coping: copingAccessor(v[0]), n, avgStress, avgExercise };
            },
            copingAccessor
        );

        const data = grouped.map(([_, d]) => d).sort((a, b) => d3.ascending(a.avgStress, b.avgStress));
        if (!data.length) {
            mount.append('div').style('padding', '1rem').text('No valid coping strategy data to display.');
            return;
        }

        // ------- Scales
        const x = d3.scaleBand()
            .domain(data.map(d => d.coping))
            .range([margin.left, width - margin.right])
            .paddingInner(0.25)
            .paddingOuter(0.15);

        const y = d3.scaleLinear()
            .domain([0, Math.max(10, d3.max(data, d => d.avgStress) || 10)]) // show at least 0–10
            .nice()
            .range([height - margin.bottom, margin.top]);

        const baselineY = y(0);

        // Petal size by (optional) exercise
        const exValues = data.map(d => d.avgExercise).filter(v => v != null && Number.isFinite(v));
        const petalR = d3.scaleSqrt()
            .domain(exValues.length ? [d3.min(exValues), d3.max(exValues)] : [0, 1])
            .range(exValues.length ? [8, 18] : [12, 12]); // constant size if no exercise

        // Petal color by frequency
        const freq = data.map(d => d.n);
        const color = d3.scaleLinear()
            .domain([d3.min(freq), d3.max(freq)])
            .range(['#bfe7f2', '#1f78b4']); // adjust if you want a different palette

        const stemColor = '#58a65c';

        // ------- SVG
        const svg = mount.append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('width', '100%')
            .attr('height', '100%');

        // ------- Axes
        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y))
            .call(g => g.selectAll('.domain, .tick line').attr('opacity', 0.15))
            .call(g => g.selectAll('.tick text').style('font-size', '12px'))
            .call(g => g.append('text')
                .attr('x', 0)
                .attr('y', margin.top - 10)
                .attr('fill', '#333')
                .attr('font-weight', 700)
                .text('Average Stress Score'));

        svg.append('g')
            .attr('transform', `translate(0,${baselineY})`)
            .call(d3.axisBottom(x))
            .call(g => g.selectAll('.domain, .tick line').attr('opacity', 0.15))
            .call(g => g.selectAll('.tick text')
                .style('font-size', '12px')
                .attr('text-anchor', 'end')
                .attr('transform', 'translate(-3,8) rotate(-20)'));

        // ------- Rows (one per coping)
        const rowsG = svg.append('g')
            .attr('class', 'garden-rows')
            .selectAll('.row')
            .data(data)
            .join('g')
            .attr('class', 'row')
            .attr('transform', d => `translate(${x(d.coping) + x.bandwidth() / 2},0)`);

        // ------- Stems
        rowsG.append('line')
            .attr('class', 'stem')
            .attr('x1', 0).attr('x2', 0)
            .attr('y1', baselineY)
            .attr('y2', d => y(d.avgStress)) // lower stress -> smaller y -> longer stem
            .attr('stroke', stemColor)
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round');

        // ------- Flowers (5-petal)
        const flowers = rowsG.append('g')
            .attr('class', 'flower')
            .attr('transform', d => `translate(0, ${y(d.avgStress)})`);

        const PETALS = 5;
        flowers.each(function (d) {
            const g = d3.select(this);
            const R = petalR(d);
            const inner = Math.max(4, R * 0.45);

            for (let k = 0; k < PETALS; k++) {
                const angle = (k / PETALS) * 2 * Math.PI;
                const px = Math.cos(angle) * R;
                const py = Math.sin(angle) * R;

                g.append('path')
                    .attr('d', `M 0 0
                      C ${R * 0.55} ${-R * 0.25}, ${R * 0.55} ${R * 0.25}, 0 ${R}
                      C ${-R * 0.55} ${R * 0.25}, ${-R * 0.55} ${-R * 0.25}, 0 0 Z`)
                    .attr('transform', `translate(${px},${py}) rotate(${(angle * 180) / Math.PI})`)
                    .attr('fill', color(d.n))
                    .attr('fill-opacity', 0.85)
                    .attr('stroke', '#333')
                    .attr('stroke-opacity', 0.6)
                    .attr('stroke-width', 1.5);
            }

            g.append('circle')
                .attr('r', inner)
                .attr('fill', '#2f3e46')
                .attr('stroke', '#2f3e46')
                .attr('stroke-width', 1);
        });

        // ------- Anchored callout (hidden by default) — one per row
        // We pre-create the group so position is stable; then show/hide on hover.
        const callouts = rowsG.append('g')
            .attr('class', 'callout')
            .attr('transform', d => `translate(0, ${y(d.avgStress) - 26})`) // just above the flower
            .style('opacity', 0);

        // Background rounded rect
        callouts.append('rect')
            .attr('x', -66).attr('y', -24)
            .attr('rx', 8).attr('ry', 8)
            .attr('width', 132).attr('height', 38)
            .attr('fill', 'rgba(20,20,20,0.94)')
            .attr('stroke', 'rgba(255,255,255,0.15)');

        // Pointer triangle (downwards)
        callouts.append('path')
            .attr('d', 'M 0 16 l 7 10 l -14 0 Z')
            .attr('fill', 'rgba(20,20,20,0.94)');

        // Text lines
        callouts.append('text')
            .attr('class', 'co-title')
            .attr('text-anchor', 'middle')
            .attr('y', -8)
            .attr('fill', '#fff')
            .attr('font-size', 12.5)
            .attr('font-weight', 700)
            .text(d => d.coping);

        callouts.append('text')
            .attr('class', 'co-value')
            .attr('text-anchor', 'middle')
            .attr('y', 8)
            .attr('fill', '#f6f6f6')
            .attr('font-size', 12)
            .text(d => `Avg stress: ${Number.isFinite(d.avgStress) ? d.avgStress.toFixed(2) : '—'}`);

        // (Optional) add these two lines if you also want n/exercise in the box:
        // callouts.append('text').attr('text-anchor','middle').attr('y', 22).attr('fill','#ddd').attr('font-size',11)
        //        .text(d => `n=${d.n}${d.avgExercise!=null?`, ex ${d.avgExercise.toFixed(1)}h/w`:''}`);

        // ------- Hover behavior (on the whole row: stem + flower)
        rowsG
            .on('mouseenter', function () {
                d3.select(this).selectAll('.stem').attr('stroke-width', 5);
                d3.select(this).selectAll('.flower path').attr('stroke-width', 2.5);
                d3.select(this).selectAll('.callout').style('opacity', 1);
            })
            .on('mouseleave', function () {
                d3.select(this).selectAll('.stem').attr('stroke-width', 3);
                d3.select(this).selectAll('.flower path').attr('stroke-width', 1.5);
                d3.select(this).selectAll('.callout').style('opacity', 0);
            });

        // ------- Optional always-on tiny numbers (set flag at top)
        if (SHOW_STATIC_NUM_LABELS) {
            rowsG.append('text')
                .attr('y', d => y(d.avgStress) - 8)
                .attr('text-anchor', 'middle')
                .attr('fill', '#333')
                .attr('font-size', 11)
                .attr('font-weight', 700)
                .text(d => Number.isFinite(d.avgStress) ? d.avgStress.toFixed(1) : '');
        }
    }
})();
