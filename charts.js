// ============================================================
// TN SSO — Shared hierarchy breakdown chart.
// Horizontal bars, one navy ordinal shade per tier (dark = top
// tier / fewest, light = bottom tier / most numerous). Bar width
// uses a sqrt scale so small top-tier counts stay visible next
// to bottom-tier counts that are 10,000x larger — every value is
// still shown as an exact number alongside its bar.
// ============================================================
const HBAR_RAMP = ["#00144c", "#00217a", "#002da8", "#0039d6", "#0548ff", "#3369ff", "#618bff", "#8fadff"];

function renderHierarchyBarChart(container, items) {
  const nums = items.map((i) => Number(String(i.value).replace(/,/g, "")) || 0);
  const max = Math.max(...nums, 1);
  const summary = items.map((i) => `${i.label} ${i.value}`).join(", ");

  const rows = items
    .map((item, i) => {
      const n = nums[i];
      const pct = Math.max((Math.sqrt(n) / Math.sqrt(max)) * 100, 2);
      const color = HBAR_RAMP[i % HBAR_RAMP.length];
      return `
        <div class="hbar-row">
          <span class="hbar-label">${item.label}</span>
          <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="hbar-value">${item.value}</span>
        </div>`;
    })
    .join("");

  container.innerHTML = `<div class="hbar-chart" role="img" aria-label="Organisation hierarchy breakdown: ${summary}">${rows}</div>`;
}

// ---- Donut variant: same navy ordinal ramp, arcs + legend ----
function renderHierarchyDonutChart(container, items) {
  const nums = items.map((i) => Number(String(i.value).replace(/,/g, "")) || 0);
  const total = nums.reduce((a, b) => a + b, 0) || 1;
  const summary = items.map((i) => `${i.label} ${i.value}`).join(", ");

  const R = 90, r = 54, cx = 100, cy = 100;
  const gapDeg = 1.6; // angular surface gap between segments
  let angle = -90; // start at 12 o'clock

  function point(rad, deg) {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  }

  const arcs = items
    .map((item, i) => {
      const n = nums[i];
      const sweep = (n / total) * 360;
      const start = angle + gapDeg / 2;
      const end = angle + sweep - gapDeg / 2;
      angle += sweep;
      const large = end - start > 180 ? 1 : 0;
      const [x1, y1] = point(R, start);
      const [x2, y2] = point(R, end);
      const [x3, y3] = point(r, end);
      const [x4, y4] = point(r, start);
      const color = HBAR_RAMP[i % HBAR_RAMP.length];
      const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`;
      return `<path d="${d}" fill="${color}"><title>${item.label}: ${item.value}</title></path>`;
    })
    .join("");

  const legend = items
    .map((item, i) => {
      const color = HBAR_RAMP[i % HBAR_RAMP.length];
      return `
        <div class="donut-legend-row">
          <span class="donut-swatch" style="background:${color}"></span>
          <span class="donut-legend-label">${item.label}</span>
          <span class="donut-legend-value">${item.value}</span>
        </div>`;
    })
    .join("");

  container.innerHTML = `
    <div class="donut-chart" role="img" aria-label="Organisation hierarchy breakdown: ${summary}">
      <div class="donut-svg-wrap">
        <svg viewBox="0 0 200 200" width="220" height="220">${arcs}</svg>
        <div class="donut-center">
          <span class="donut-center-value">${total.toLocaleString("en-IN")}</span>
          <span class="donut-center-label">Total</span>
        </div>
      </div>
      <div class="donut-legend">${legend}</div>
    </div>`;
}
