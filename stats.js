(function () {
  const COLORS = ['#3b5bfd', '#12b886', '#f59f00', '#e8590c', '#9c36b5', '#1098ad', '#e64980', '#5c7cfa'];

  function fmtNum(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '--';
    const abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return String(Math.round(n * 100) / 100);
  }

  function fmtUsd(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '--';
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }

  function fmtTime(iso) {
    if (!iso) return '尚未发布过数据';
    try {
      const d = new Date(iso);
      return '更新于 ' + d.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }) + '（北京时间）';
    } catch (e) {
      return '';
    }
  }

  function drawTrend(canvas, trend) {
    const emptyEl = document.getElementById('trendEmpty');
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || canvas.parentElement.clientWidth;
    const cssH = 220;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    if (!trend || trend.length === 0) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    const pad = { l: 46, r: 12, t: 14, b: 24 };
    const w = cssW - pad.l - pad.r;
    const h = cssH - pad.t - pad.b;
    const values = trend.map((d) => d.cost || 0);
    const maxV = Math.max(1e-9, ...values);

    ctx.strokeStyle = 'rgba(16,24,40,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = pad.t + (h * i) / 3;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + w, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#6b7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 3; i++) {
      const v = maxV - (maxV * i) / 3;
      const y = pad.t + (h * i) / 3;
      ctx.fillText('$' + v.toFixed(2), pad.l - 8, y + 3);
    }

    const stepX = trend.length > 1 ? w / (trend.length - 1) : 0;
    ctx.beginPath();
    trend.forEach((d, i) => {
      const x = pad.l + stepX * i;
      const y = pad.t + h - (h * (d.cost || 0)) / maxV;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3b5bfd';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.lineTo(pad.l + stepX * (trend.length - 1), pad.t + h);
    ctx.lineTo(pad.l, pad.t + h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + h);
    grad.addColorStop(0, 'rgba(59,91,253,0.16)');
    grad.addColorStop(1, 'rgba(59,91,253,0.01)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    const idxs = trend.length > 1 ? [0, Math.floor((trend.length - 1) / 2), trend.length - 1] : [0];
    idxs.forEach((i) => {
      const x = pad.l + stepX * i;
      ctx.fillText((trend[i].date || '').slice(5), x, cssH - 6);
    });
  }

  function drawDonut(canvas, byModel) {
    const emptyEl = document.getElementById('donutEmpty');
    const legendEl = document.getElementById('donutLegend');
    legendEl.innerHTML = '';
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const items = (byModel || []).filter((m) => (m.tokens || 0) > 0).slice(0, 8);
    const total = items.reduce((s, m) => s + (m.tokens || 0), 0);
    if (!items.length || total <= 0) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    const cx = size / 2, cy = size / 2, rOuter = 84, rInner = 52;
    let start = -Math.PI / 2;
    items.forEach((m, i) => {
      const frac = (m.tokens || 0) / total;
      const end = start + frac * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rOuter, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      start = end;
    });
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    items.forEach((m, i) => {
      const el = document.createElement('div');
      el.className = 'item';
      const pct = ((m.tokens / total) * 100).toFixed(1);
      el.innerHTML = '<span class="dot" style="background:' + COLORS[i % COLORS.length] + '"></span>' + m.model + '（' + pct + '%）';
      legendEl.appendChild(el);
    });
  }

  async function main() {
    let data;
    try {
      const res = await fetch('./data.json', { cache: 'no-store' });
      data = await res.json();
    } catch (e) {
      document.getElementById('updated').textContent = '数据加载失败';
      return;
    }

    document.getElementById('updated').textContent = fmtTime(data.generatedAt);
    document.getElementById('kpiCost').innerHTML = fmtUsd(data.totals && data.totals.cost);
    document.getElementById('kpiTokens').innerHTML = fmtNum(data.totals && data.totals.tokens) + ' <small>tokens</small>';
    document.getElementById('kpiCalls').innerHTML = fmtNum(data.totals && data.totals.calls) + ' <small>次</small>';
    document.getElementById('kpiToday').innerHTML = fmtUsd(data.today && data.today.cost);
    document.getElementById('kpiTopModel').textContent = (data.today && data.today.topModel) || '暂无';

    drawTrend(document.getElementById('trendChart'), data.trend || []);
    drawDonut(document.getElementById('donutChart'), data.byModel || []);
  }

  main();
  window.addEventListener('resize', main);
})();
