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
