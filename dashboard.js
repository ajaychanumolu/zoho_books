// ============================================================
// DASHBOARD — Expense Analytics with Canvas Charts
// ============================================================

let dashAllExpenses = [];
let dashFiltered = [];

// ---- Color palette for charts ----
const CHART_COLORS = [
    '#A37764', '#6A9A6E', '#2B5A76', '#C4956E', '#6B3F6B',
    '#7A5C2E', '#C45B4A', '#3D5A2A', '#8A655A', '#5A5A3D',
    '#334466', '#7A3333', '#2A5A50', '#6B4D2E', '#4A6B8A'
];

const CHART_GRADIENTS = [
    ['#A37764', '#C4956E'], ['#6A9A6E', '#8FBF8A'], ['#2B5A76', '#5A9ABF'],
    ['#C4956E', '#E8D5C4'], ['#6B3F6B', '#A673A6'], ['#7A5C2E', '#BFA162'],
    ['#C45B4A', '#E88A7A'], ['#3D5A2A', '#6B9A4A'], ['#8A655A', '#B8907A'],
    ['#5A5A3D', '#8A8A6D']
];

// ---- Tooltip ----
let tooltip = null;
function getTooltip() {
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'dash-tooltip';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}
function showTooltip(x, y, text) {
    const t = getTooltip();
    t.textContent = text;
    t.classList.add('visible');
    t.style.left = (x + 12) + 'px';
    t.style.top = (y - 10) + 'px';
}
function hideTooltip() {
    const t = getTooltip();
    t.classList.remove('visible');
}

// ============================================================
// LOAD DATA
// ============================================================
async function loadDashboard() {
    const loading = document.getElementById('dashLoading');
    const error = document.getElementById('dashError');
    const content = document.getElementById('dashContent');
    const refreshBtn = document.getElementById('dashRefreshBtn');

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    content.classList.add('hidden');
    refreshBtn.disabled = true;

    try {
        const res = await fetch(CONFIG.GET_EXPENSES_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ action: "getExpenses" })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        let expenses = [];
        if (Array.isArray(data) && data.length > 0 && data[0].expenses) {
            expenses = data[0].expenses;
        } else if (data.expenses) {
            expenses = data.expenses;
        }

        dashAllExpenses = expenses;
        loading.classList.add('hidden');
        content.classList.remove('hidden');

        applyDashFilters();

    } catch (err) {
        console.error('[Dashboard] Error:', err);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        document.getElementById('dashErrorMsg').textContent = `Failed to load: ${err.message}`;
    } finally {
        refreshBtn.disabled = false;
    }
}

// ============================================================
// FILTERS
// ============================================================
function setPreset(btn, range) {
    document.querySelectorAll('.dash-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const now = new Date();
    let from = '', to = '';

    switch (range) {
        case 'thisMonth':
            from = formatISO(new Date(now.getFullYear(), now.getMonth(), 1));
            to = formatISO(now);
            break;
        case 'lastMonth':
            from = formatISO(new Date(now.getFullYear(), now.getMonth() - 1, 1));
            to = formatISO(new Date(now.getFullYear(), now.getMonth(), 0));
            break;
        case 'last3':
            from = formatISO(new Date(now.getFullYear(), now.getMonth() - 3, 1));
            to = formatISO(now);
            break;
        case 'last6':
            from = formatISO(new Date(now.getFullYear(), now.getMonth() - 6, 1));
            to = formatISO(now);
            break;
        case 'ytd':
            from = formatISO(new Date(now.getFullYear(), 0, 1));
            to = formatISO(now);
            break;
        case 'all':
        default:
            from = '';
            to = '';
            break;
    }

    document.getElementById('dashFrom').value = from;
    document.getElementById('dashTo').value = to;
    applyDashFilters();
}

function applyDashFilters() {
    const from = document.getElementById('dashFrom').value;
    const to = document.getElementById('dashTo').value;

    let result = [...dashAllExpenses];
    if (from) result = result.filter(e => e.date >= from);
    if (to) result = result.filter(e => e.date <= to);

    dashFiltered = result;

    // Deactivate presets if custom dates don't match any preset
    if (from || to) {
        const activePreset = document.querySelector('.dash-preset.active');
        if (activePreset && activePreset.dataset.range === 'all' && (from || to)) {
            activePreset.classList.remove('active');
        }
    }

    renderDashboard();
}

// ============================================================
// RENDER ALL
// ============================================================
function renderDashboard() {
    renderKPIs();
    renderPieChart();
    renderBarChart();
    renderTop5();
    renderDailyChart();
    renderPaymentChart();
    renderRecentList();
}

// ============================================================
// KPIs
// ============================================================
function renderKPIs() {
    const expenses = dashFiltered;
    const total = expenses.reduce((s, e) => s + (parseFloat(e.total) || 0), 0);
    const count = expenses.length;
    const avg = count > 0 ? total / count : 0;
    const highest = expenses.reduce((max, e) => Math.max(max, parseFloat(e.total) || 0), 0);
    const categories = new Set(expenses.map(e => e.account_name).filter(Boolean));

    animateValue('kpiTotalSpent', total, true);
    document.getElementById('kpiCount').textContent = count.toLocaleString('en-IN');
    animateValue('kpiAvg', avg, true);
    animateValue('kpiHighest', highest, true);
    document.getElementById('kpiCategories').textContent = categories.size;
}

function animateValue(id, target, isCurrency) {
    const el = document.getElementById(id);
    const duration = 600;
    const startTime = performance.now();
    const startVal = 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = startVal + (target - startVal) * eased;

        if (isCurrency) {
            el.textContent = '₹' + current.toLocaleString('en-IN', {
                minimumFractionDigits: 2, maximumFractionDigits: 2
            });
        } else {
            el.textContent = Math.round(current).toLocaleString('en-IN');
        }

        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ============================================================
// PIE CHART — Category Breakdown
// ============================================================
function renderPieChart() {
    const canvas = document.getElementById('chartPie');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    // Aggregate by category
    const catMap = {};
    dashFiltered.forEach(e => {
        const cat = e.account_name || 'Uncategorized';
        catMap[cat] = (catMap[cat] || 0) + (parseFloat(e.total) || 0);
    });

    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);

    if (sorted.length === 0 || total === 0) {
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#BAAB92';
        ctx.font = '500 14px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', size / 2, size / 2);
        document.getElementById('pieLegend').innerHTML = '';
        return;
    }

    // Draw pie
    const cx = size / 2, cy = size / 2, radius = 110;
    let startAngle = -Math.PI / 2;
    const slices = [];

    ctx.clearRect(0, 0, size, size);

    sorted.forEach(([cat, val], i) => {
        const sliceAngle = (val / total) * 2 * Math.PI;
        const color = CHART_COLORS[i % CHART_COLORS.length];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Thin separator
        ctx.strokeStyle = '#FDFCF7';
        ctx.lineWidth = 2;
        ctx.stroke();

        slices.push({ cat, val, color, startAngle, endAngle: startAngle + sliceAngle });
        startAngle += sliceAngle;
    });

    // Inner circle (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, 2 * Math.PI);
    ctx.fillStyle = '#FDFCF7';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#56453F';
    ctx.font = '700 16px "Menlo", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('₹' + abbreviate(total), cx, cy - 6);
    ctx.font = '500 10px "DM Sans", sans-serif';
    ctx.fillStyle = '#8A655A';
    ctx.fillText('TOTAL', cx, cy + 12);

    // Legend
    const legendEl = document.getElementById('pieLegend');
    const maxLegend = 7;
    const display = sorted.length > maxLegend ? sorted.slice(0, maxLegend) : sorted;
    const othersVal = sorted.length > maxLegend
        ? sorted.slice(maxLegend).reduce((s, [, v]) => s + v, 0)
        : 0;

    legendEl.innerHTML = display.map(([cat, val], i) => `
        <div class="pie-legend-item">
            <div class="pie-legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
            <span class="pie-legend-label">${escapeHtml(cat)}</span>
            <span class="pie-legend-value">${((val / total) * 100).toFixed(1)}%</span>
        </div>
    `).join('') + (othersVal > 0 ? `
        <div class="pie-legend-item">
            <div class="pie-legend-dot" style="background:#999"></div>
            <span class="pie-legend-label">Others</span>
            <span class="pie-legend-value">${((othersVal / total) * 100).toFixed(1)}%</span>
        </div>
    ` : '');

    // Tooltip on hover
    canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dx = mx - cx, dy = my - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 60 && dist < radius) {
            let angle = Math.atan2(dy, dx);
            if (angle < -Math.PI / 2) angle += 2 * Math.PI;
            const slice = slices.find(s => angle >= s.startAngle && angle < s.endAngle);
            if (slice) {
                showTooltip(e.clientX, e.clientY,
                    `${slice.cat}: ₹${slice.val.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${((slice.val / total) * 100).toFixed(1)}%)`
                );
                return;
            }
        }
        hideTooltip();
    };
    canvas.onmouseleave = hideTooltip;
}

// ============================================================
// BAR CHART — Monthly Trend
// ============================================================
function renderBarChart() {
    const canvas = document.getElementById('chartBar');
    const container = canvas.parentElement;
    const width = container.clientWidth - 40; // padding
    const height = 220;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Aggregate by month
    const monthMap = {};
    dashFiltered.forEach(e => {
        if (!e.date) return;
        const key = e.date.substring(0, 7); // YYYY-MM
        monthMap[key] = (monthMap[key] || 0) + (parseFloat(e.total) || 0);
    });

    const keys = Object.keys(monthMap).sort();
    const values = keys.map(k => monthMap[k]);

    if (keys.length === 0) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#BAAB92';
        ctx.font = '500 14px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', width / 2, height / 2);
        return;
    }

    const maxVal = Math.max(...values) * 1.15;
    const marginLeft = 65;
    const marginBottom = 36;
    const marginTop = 10;
    const chartW = width - marginLeft - 20;
    const chartH = height - marginBottom - marginTop;
    const barWidth = Math.min(40, (chartW / keys.length) * 0.6);
    const gap = chartW / keys.length;

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    const gridLines = 5;
    ctx.strokeStyle = '#E8E4D4';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8A655A';
    ctx.font = '500 10px "Menlo", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridLines; i++) {
        const y = marginTop + chartH - (chartH * i / gridLines);
        const val = (maxVal * i / gridLines);

        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillText('₹' + abbreviate(val), marginLeft - 8, y);
    }

    // Bars
    const barRects = [];
    keys.forEach((key, i) => {
        const val = values[i];
        const barH = (val / maxVal) * chartH;
        const x = marginLeft + gap * i + (gap - barWidth) / 2;
        const y = marginTop + chartH - barH;

        // Gradient bar
        const grad = ctx.createLinearGradient(x, y + barH, x, y);
        const colors = CHART_GRADIENTS[i % CHART_GRADIENTS.length];
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, barH);

        barRects.push({ x, y, w: barWidth, h: barH, key, val });

        // Month label
        const label = formatMonthLabel(key);
        ctx.fillStyle = '#8A655A';
        ctx.font = '500 10px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x + barWidth / 2, marginTop + chartH + 8);
    });

    // Tooltip
    canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left);
        const my = (e.clientY - rect.top);
        const hit = barRects.find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
        if (hit) {
            showTooltip(e.clientX, e.clientY,
                `${formatMonthLabel(hit.key)}: ₹${hit.val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
            );
            canvas.style.cursor = 'pointer';
        } else {
            hideTooltip();
            canvas.style.cursor = 'default';
        }
    };
    canvas.onmouseleave = () => { hideTooltip(); canvas.style.cursor = 'default'; };
}

// ============================================================
// TOP 5 CATEGORIES (Horizontal bars)
// ============================================================
function renderTop5() {
    const container = document.getElementById('top5List');
    const catMap = {};
    dashFiltered.forEach(e => {
        const cat = e.account_name || 'Uncategorized';
        catMap[cat] = (catMap[cat] || 0) + (parseFloat(e.total) || 0);
    });

    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

    if (sorted.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#BAAB92;padding:2rem;font-size:0.88rem;">No data available</div>';
        return;
    }

    container.innerHTML = sorted.map(([cat, val], i) => {
        const pct = (val / maxVal * 100).toFixed(1);
        return `
            <div class="top5-item">
                <div class="top5-header">
                    <span class="top5-name">${escapeHtml(cat)}</span>
                    <span class="top5-amount">₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div class="top5-bar-track">
                    <div class="top5-bar-fill" style="width: 0%" data-width="${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');

    // Animate bars in
    requestAnimationFrame(() => {
        container.querySelectorAll('.top5-bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    });
}

// ============================================================
// DAILY SPENDING — Area/Line Chart
// ============================================================
function renderDailyChart() {
    const canvas = document.getElementById('chartDaily');
    const container = canvas.parentElement;
    const width = container.clientWidth - 40;
    const height = 200;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Aggregate by date
    const dayMap = {};
    dashFiltered.forEach(e => {
        if (!e.date) return;
        dayMap[e.date] = (dayMap[e.date] || 0) + (parseFloat(e.total) || 0);
    });

    const keys = Object.keys(dayMap).sort();
    const values = keys.map(k => dayMap[k]);

    if (keys.length === 0) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#BAAB92';
        ctx.font = '500 14px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', width / 2, height / 2);
        return;
    }

    const maxVal = Math.max(...values) * 1.2 || 1;
    const marginLeft = 65;
    const marginBottom = 30;
    const marginTop = 10;
    const marginRight = 20;
    const chartW = width - marginLeft - marginRight;
    const chartH = height - marginBottom - marginTop;

    ctx.clearRect(0, 0, width, height);

    // Grid
    const gridLines = 4;
    ctx.strokeStyle = '#E8E4D4';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8A655A';
    ctx.font = '500 10px "Menlo", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridLines; i++) {
        const y = marginTop + chartH - (chartH * i / gridLines);
        const val = (maxVal * i / gridLines);
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(width - marginRight, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText('₹' + abbreviate(val), marginLeft - 8, y);
    }

    // Build points
    const points = keys.map((k, i) => ({
        x: marginLeft + (chartW * i / (keys.length - 1 || 1)),
        y: marginTop + chartH - (values[i] / maxVal * chartH),
        date: k,
        val: values[i]
    }));

    // Area fill
    const areaGrad = ctx.createLinearGradient(0, marginTop, 0, marginTop + chartH);
    areaGrad.addColorStop(0, 'rgba(163, 119, 100, 0.25)');
    areaGrad.addColorStop(1, 'rgba(163, 119, 100, 0.02)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, marginTop + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, marginTop + chartH);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Line
    ctx.beginPath();
    points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = '#A37764';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Dots
    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#A37764';
        ctx.fill();
        ctx.strokeStyle = '#FDFCF7';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // X labels (show max 8)
    const labelStep = Math.max(1, Math.ceil(keys.length / 8));
    ctx.fillStyle = '#8A655A';
    ctx.font = '500 9px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    keys.forEach((k, i) => {
        if (i % labelStep === 0 || i === keys.length - 1) {
            const x = marginLeft + (chartW * i / (keys.length - 1 || 1));
            ctx.fillText(formatShortDate(k), x, marginTop + chartH + 8);
        }
    });

    // Tooltip
    canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const hit = points.find(p => Math.abs(mx - p.x) < 12);
        if (hit) {
            showTooltip(e.clientX, e.clientY,
                `${formatDateFull(hit.date)}: ₹${hit.val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
            );
            canvas.style.cursor = 'pointer';
        } else {
            hideTooltip();
            canvas.style.cursor = 'default';
        }
    };
    canvas.onmouseleave = () => { hideTooltip(); canvas.style.cursor = 'default'; };
}

// ============================================================
// PAYMENT METHOD PIE CHART
// ============================================================
function renderPaymentChart() {
    const canvas = document.getElementById('chartPayment');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 240;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const payMap = {};
    dashFiltered.forEach(e => {
        const method = e.paid_through_account_name || 'Unknown';
        payMap[method] = (payMap[method] || 0) + (parseFloat(e.total) || 0);
    });

    const sorted = Object.entries(payMap).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);

    if (sorted.length === 0 || total === 0) {
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#BAAB92';
        ctx.font = '500 14px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data', size / 2, size / 2);
        document.getElementById('paymentLegend').innerHTML = '';
        return;
    }

    const cx = size / 2, cy = size / 2, radius = 95;
    let startAngle = -Math.PI / 2;
    const slices = [];

    ctx.clearRect(0, 0, size, size);

    // Use offset colors for payment to differentiate from category pie
    const payColors = ['#2B5A76', '#C4956E', '#6A9A6E', '#6B3F6B', '#C45B4A', '#7A5C2E', '#3D5A2A', '#8A655A'];

    sorted.forEach(([method, val], i) => {
        const sliceAngle = (val / total) * 2 * Math.PI;
        const color = payColors[i % payColors.length];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#FDFCF7';
        ctx.lineWidth = 2;
        ctx.stroke();

        slices.push({ method, val, color, startAngle, endAngle: startAngle + sliceAngle });
        startAngle += sliceAngle;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, 2 * Math.PI);
    ctx.fillStyle = '#FDFCF7';
    ctx.fill();

    ctx.fillStyle = '#56453F';
    ctx.font = '700 12px "Menlo", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sorted.length + '', cx, cy - 4);
    ctx.font = '500 9px "DM Sans", sans-serif';
    ctx.fillStyle = '#8A655A';
    ctx.fillText('METHODS', cx, cy + 10);

    // Legend
    const legendEl = document.getElementById('paymentLegend');
    legendEl.innerHTML = sorted.slice(0, 5).map(([method, val], i) => `
        <div class="pie-legend-item">
            <div class="pie-legend-dot" style="background:${payColors[i % payColors.length]}"></div>
            <span class="pie-legend-label">${escapeHtml(method)}</span>
            <span class="pie-legend-value">${((val / total) * 100).toFixed(1)}%</span>
        </div>
    `).join('');

    // Tooltip
    canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dx = mx - cx, dy = my - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 50 && dist < radius) {
            let angle = Math.atan2(dy, dx);
            if (angle < -Math.PI / 2) angle += 2 * Math.PI;
            const slice = slices.find(s => angle >= s.startAngle && angle < s.endAngle);
            if (slice) {
                showTooltip(e.clientX, e.clientY,
                    `${slice.method}: ₹${slice.val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                );
                return;
            }
        }
        hideTooltip();
    };
    canvas.onmouseleave = hideTooltip;
}

// ============================================================
// RECENT EXPENSES LIST
// ============================================================
function renderRecentList() {
    const container = document.getElementById('recentList');
    const recent = [...dashFiltered]
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 8);

    if (recent.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#BAAB92;padding:2rem;font-size:0.88rem;">No recent expenses</div>';
        return;
    }

    const dotColors = ['#A37764', '#6A9A6E', '#2B5A76', '#C4956E', '#6B3F6B', '#C45B4A', '#7A5C2E', '#3D5A2A'];

    container.innerHTML = recent.map((e, i) => `
        <div class="recent-item">
            <div class="recent-dot" style="background:${dotColors[i % dotColors.length]}"></div>
            <div class="recent-info">
                <div class="recent-cat">${escapeHtml(e.account_name || 'Uncategorized')}</div>
                <div class="recent-date">${formatDateFull(e.date)}</div>
            </div>
            <div class="recent-amount">₹${(parseFloat(e.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
    `).join('');
}

// ============================================================
// HELPERS
// ============================================================
function formatISO(d) {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function formatMonthLabel(yyyymm) {
    const [y, m] = yyyymm.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(m, 10) - 1] + ' ' + y.slice(2);
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDateFull(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function abbreviate(n) {
    if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toFixed(0);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

// ---- Redraw charts on resize ----
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (dashFiltered.length > 0) {
            renderBarChart();
            renderDailyChart();
        }
    }, 200);
});

// ---- Auto-refresh when new expense is added ----
window.addEventListener('storage', function (e) {
    if (e.key === 'expense_added') {
        setTimeout(() => loadDashboard(), 2000);
    }
});

// ---- Initial load ----
loadDashboard();
