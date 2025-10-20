// main.js — bootstraps all sections (safe if some functions aren't ready yet)
(async function () {
    const data = await d3.csv("data/cleaned_data.csv", d3.autoType);

    // Rising Insights (implemented)
    if (typeof renderTriangle === "function") renderTriangle(data);  // Emotion Triangle
    if (typeof renderGarden === "function") renderGarden(data);      // Coping Garden

    // Rising Insights (placeholders; call when ready)
    if (typeof renderClassroom === "function") renderClassroom(data);  // Classroom of Stress
    if (typeof renderOrbit === "function") renderOrbit(data);          // Sleep Orbit Map

    // Main Messages (placeholder)
    if (typeof renderBalance === "function") renderBalance(data);      // Balance Radar / small multiples
})();
