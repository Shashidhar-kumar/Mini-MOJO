const COLORS = { LinkedIn: '#2b5fa8', Indeed: '#1f7a5c', ZipRecruiter: '#b7791f', Glassdoor: '#7a4b9a' };
const colorOf = n => COLORS[n] || '#4a5568';
const $ = id => document.getElementById(id);
const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = n => '$' + Math.round(n).toLocaleString('en-US');

let state = JSON.parse($('boot').textContent);
let deltas = {};
let chart;

function render() {
  const { campaign: c, summary: s } = state;
  const pubs = c.publishers;

  $('title').textContent = c.title;
  $('budget').textContent = money0(c.totalBudget);
  const st = $('status');
  st.textContent = c.status === 'Optimized' ? 'Optimized' : 'Waiting to optimize';
  st.className = 'status' + (c.status === 'Optimized' ? ' opt' : '');

  // Budget strip: width = allocated, darker part = already spent, hatched = still movable
  $('strip').innerHTML = pubs.map(p => {
    const pct = p.allocated > 0 ? Math.min(100, (p.spent / p.allocated) * 100) : 0;
    return `<div class="seg" style="flex-grow:${p.allocated};background:${colorOf(p.name)}" title="${p.name}: ${money(p.allocated)} allocated, ${money(p.spent)} spent">
      <div class="hatch"></div><div class="spent" style="width:${pct}%"></div>
      <span class="lbl">${p.name}</span></div>`;
  }).join('');
  $('legend').innerHTML =
    '<li><i class="solid"></i>Already spent, cannot move</li><li><i class="hatched"></i>Unspent, can move</li>';

  $('figures').innerHTML = [
    ['Spent so far', money(s.totalSpent)],
    ['Still unspent', money(s.unspent)],
    ['Applicants', s.totalApps],
    ['Average cost per applicant', money(s.avgCPA)]
  ].map(([k, v]) => `<div class="fig"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  $('rows').innerHTML = pubs.map(p => {
    const d = deltas[p.name];
    const dHtml = d ? `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : '−'}${money(Math.abs(d))}</span>` : '';
    const cls = s.avgCPA && p.apps > 0 ? (p.cpa <= s.avgCPA ? 'good' : p.cpa > s.avgCPA * 1.3 ? 'bad' : '') : '';
    return `<tr>
      <td class="name"><i style="background:${colorOf(p.name)}"></i>${p.name}</td>
      <td class="n">${money(p.allocated)}${dHtml}</td>
      <td class="n">${money(p.spent)}</td>
      <td class="n">${p.apps}</td>
      <td class="n cpa ${cls}">${p.apps > 0 ? money(p.cpa) : 'No data'}</td></tr>`;
  }).join('');

  const hist = (c.history || []).slice().reverse();
  $('history').innerHTML = hist.length
    ? hist.map(h => `<li>${h.message}<time>${new Date(h.at).toLocaleString()}</time></li>`).join('')
    : '<li class="empty">Nothing yet. Simulate a day or two, then rebalance.</li>';

  drawChart(pubs);
}

function drawChart(pubs) {
  const data = pubs.map(p => (p.apps > 0 ? p.cpa : 0));
  const colors = pubs.map(p => colorOf(p.name));
  if (!chart) {
    chart = new Chart($('cpaChart'), {
      type: 'bar',
      data: { labels: pubs.map(p => p.name), datasets: [{ data, backgroundColor: colors }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => money(ctx.raw) } } },
        scales: {
          x: { beginAtZero: true, grid: { color: '#e3e7ec' }, ticks: { callback: v => '$' + v } },
          y: { grid: { display: false } }
        }
      }
    });
  } else {
    chart.data.labels = pubs.map(p => p.name);
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
  }
}

function say(msg, isErr) {
  const n = $('note');
  n.textContent = msg || '';
  n.className = 'note' + (isErr ? ' err' : '');
}

async function act(url, keepDeltas) {
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(b => (b.disabled = true));
  try {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    state = { campaign: data.campaign, summary: data.summary };
    deltas = keepDeltas && data.moves ? Object.fromEntries(data.moves.map(m => [m.name, m.delta])) : {};
    say(data.message);
    render();
  } catch (err) {
    say(err.message, true);
  } finally {
    buttons.forEach(b => (b.disabled = false));
  }
}

const id = () => state.campaign._id;
$('btnSim').onclick = () => act(`/api/campaigns/${id()}/simulate`, false);
$('btnOpt').onclick = () => act(`/api/campaigns/${id()}/optimize`, true);
$('btnReset').onclick = () => act('/api/reset', false);

render();