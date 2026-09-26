(function () {
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
      return '更新于 ' + d.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
    } catch (e) {
      return '';
    }
  }

  async function main() {
    let data;
    try {
      const res = await fetch('./data.json', { cache: 'no-store' });
      data = await res.json();
    } catch (e) {
      const el = document.getElementById('s-updated');
      if (el) el.textContent = '数据加载失败';
      return;
    }

    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('s-cost', fmtUsd(data.totals && data.totals.cost));
    set('s-tokens', fmtNum(data.totals && data.totals.tokens));
    set('s-calls', fmtNum(data.totals && data.totals.calls));
    set('s-today', fmtUsd(data.today && data.today.cost));
    set('s-topmodel', (data.today && data.today.topModel) || '暂无');
    set('s-updated', fmtTime(data.generatedAt));
  }

  main();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) main(); });
})();
