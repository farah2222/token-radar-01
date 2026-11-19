// Token Radar radar-6 dashboard. Data comes from ../data.js (window.TOKEN_RADAR_DATA).
// No network: everything renders from that one object.
(function () {
  'use strict';
  var D = window.TOKEN_RADAR_DATA;
  var rows = D.rows;
  var state = { q: '', cat: '', wl: false, nt: false, sort: 'rank', view: 'board' };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var usd = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var usdShort = function (n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
  };
  var pct = function (n) {
    if (n === null || n === undefined) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  };
  var ago = function (r) {
    if (r.listed_at === null) return 'not recorded';
    return r.listed_at + ' · ' + r.age_days + 'd ago';
  };

  // ------------------------------------------------------------ board list
  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = rows.filter(function (r) {
      if (state.wl && !r.watchlist) return false;
      if (state.nt && !r.newly_tracked) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + r.category).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var by = {
      rank: function (a, b) { return a.rank - b.rank; },
      value: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      change: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
      age: function (a, b) { return b.age_days - a.age_days; },
    }[state.sort];
    return list.sort(by);
  }

  function renderBoard() {
    var list = filtered();
    $('count').textContent = list.length + ' of ' + rows.length + ' ranked protocols shown' +
      (state.wl ? ' · watchlist only' : '') + (state.nt ? ' · newly tracked only' : '');
    $('rows').innerHTML = list.map(function (r) {
      var range = r.rank_range[0] === r.rank_range[1]
        ? 'likely ' + r.rank_range[0]
        : 'likely ' + r.rank_range[0] + '–' + r.rank_range[1];
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td><span class="rank">#' + r.rank + '</span><span class="range">' + range + '</span></td>' +
        '<td><strong>' + esc(r.name) + '</strong>' + (r.watchlist ? '<span class="tag">WATCHLIST</span>' : '') +
        '<span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category) + '</td>' +
        '<td class="num">' + usdShort(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td>' + ago(r) + (r.newly_tracked ? '<span class="badge">NEW</span>' : '') + '</td>' +
        '<td class="num" title="' + esc(r.chains.join(', ')) + '">' + r.chain_count + '</td>' +
        '<td class="num"><strong>' + usd(r.implied_value_usd) + '</strong></td>' +
        '<td class="num">' + r.multiple.toFixed(2) + (r.multiple_source === 'global' ? ' <span class="slug">global</span>' : '') + '</td>' +
        '</tr>';
    }).join('');
  }

  // --------------------------------------------------------------- detail
  function comparablesTable(r) {
    var list = D.comparables_by_category[r.category] || [];
    var n = list.length;
    var medianIdx = n === 0 ? -1 : (n - 1) / 2;
    var note;
    if (r.multiple_source === 'global') {
      note = '<p class="note">Only ' + n + ' live ' + esc(r.category) + ' protocol' + (n === 1 ? '' : 's') +
        ' record' + (n === 1 ? 's' : '') + ' a market cap — fewer than the 3 needed for a category multiple — ' +
        'so the global median of ' + D.global.multiple.toFixed(2) + ' (from all ' + D.counts.comparables +
        ' live-token protocols) is used instead.</p>';
    } else {
      note = '<p class="note">The median row is highlighted; the category multiple of ' + r.multiple.toFixed(2) +
        ' is the median Mcap/TVL of these ' + n + ' live ' + esc(r.category) + ' protocols.</p>';
    }
    if (n === 0) {
      return note + '<p class="note">No live ' + esc(r.category) + ' protocol records a market cap.</p>';
    }
    var body = list.map(function (c, i) {
      var isMedian = n % 2 === 1 ? i === medianIdx : (i === Math.floor(medianIdx) || i === Math.ceil(medianIdx));
      return '<tr' + (isMedian ? ' class="median-row"' : '') + '><td>' + esc(c.name) + '</td>' +
        '<td class="num">' + usdShort(c.mcap_usd) + '</td><td class="num">' + usdShort(c.tvl_usd) +
        '</td><td class="num">' + c.ratio.toFixed(3) + (isMedian ? ' · median' : '') + '</td></tr>';
    }).join('');
    return note + '<table><thead><tr><th>Live ' + esc(r.category) + ' protocol</th><th>Market cap</th><th>TVL</th><th>Mcap / TVL</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderDetail(slug) {
    var r = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) r = rows[i];
    var el = $('detail');
    if (!r) { el.hidden = true; el.innerHTML = ''; return; }
    var f = r.farm_total;
    var hours = (f.minutes / 60).toFixed(1);
    var steps = r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    el.innerHTML =
      '<h2>' + esc(r.name) + ' <span class="rank">#' + r.rank + '</span>' +
      (r.watchlist ? '<span class="tag">WATCHLIST</span>' : '') +
      (r.newly_tracked ? '<span class="badge">NEW</span>' : '') + '</h2>' +
      '<p class="meta">' + esc(r.slug) + ' · ' + esc(r.category) + ' · First tracked by DefiLlama on ' +
      (r.listed_at || 'a date not recorded') + ', ' + r.age_days + ' days before the snapshot · ' +
      'Likely rank ' + r.rank_range[0] + '–' + r.rank_range[1] + ' from the comparables\u2019 spread.</p>' +
      '<h3>Why it ranks here</h3><ul class="drivers">' +
      r.drivers.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' +
      '<h3>Model breakdown</h3><table><tbody>' +
      '<tr><td>TVL</td><td class="num">' + usd(r.tvl_usd) + '</td></tr>' +
      '<tr><td>Category multiple (' + (r.multiple_source === 'category' ? 'category median' : 'global median') + ', ' + r.comparables_count + ' comparables)</td><td class="num">' + r.multiple.toFixed(3) + '</td></tr>' +
      '<tr><td>Base value (TVL × multiple)</td><td class="num">' + usd(r.base_value_usd) + '</td></tr>' +
      '<tr><td>Growth multiplier (7-day ' + pct(r.change_7d) + ')</td><td class="num">× ' + r.growth_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Maturity multiplier (' + r.age_days + ' days)</td><td class="num">× ' + r.maturity_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Breadth multiplier (' + r.chain_count + ' chain' + (r.chain_count === 1 ? '' : 's') + ')</td><td class="num">× ' + r.breadth_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td><strong>Implied value</strong></td><td class="num"><strong>' + usd(r.implied_value_usd) + '</strong></td></tr>' +
      '</tbody></table>' +
      '<p class="note">Formula: max(1, round(' + usd(r.base_value_usd) + ' × ' + r.growth_multiplier.toFixed(3) +
      ' × ' + r.maturity_multiplier.toFixed(3) + ' × ' + r.breadth_multiplier.toFixed(3) + ')) = ' + usd(r.implied_value_usd) + '.</p>' +
      '<h3>Farm plan</h3><ol class="steps">' + steps + '</ol>' +
      '<p class="totals">Farm total: about $' + f.cost_usd + ' in gas and fees over ' + f.weeks + ' weeks, ' +
      'plus $' + f.capital_usd + ' of capital deployed (recoverable on exit). About ' + hours + ' hours of hands-on time.</p>' +
      '<h3>Comparables — ' + esc(r.category) + '</h3>' + comparablesTable(r);
    el.hidden = false;
    var sel = document.querySelector('#rows tr.sel');
    if (sel) sel.classList.remove('sel');
    var tr = document.querySelector('#rows tr[data-slug="' + slug + '"]');
    if (tr) tr.classList.add('sel');
  }

  // ------------------------------------------------------- model + ledger
  function renderModel() {
    $('cat-rows').innerHTML = D.categories.map(function (c) {
      return '<tr><td>' + esc(c.category) + '</td><td class="num"><strong>' + c.multiple.toFixed(2) + '</strong></td>' +
        '<td>' + (c.multiple_source === 'category' ? 'category median' : 'global median') + '</td>' +
        '<td class="num">' + c.comparables + '</td><td class="num">' + c.q1.toFixed(2) + '</td>' +
        '<td class="num">' + c.median.toFixed(2) + '</td><td class="num">' + c.q3.toFixed(2) + '</td></tr>';
    }).join('') + '<tr><td><strong>Global (all live-token protocols)</strong></td><td class="num"><strong>' +
      D.global.multiple.toFixed(2) + '</strong></td><td>global median</td><td class="num">' + D.global.comparables +
      '</td><td class="num">' + D.global.q1.toFixed(2) + '</td><td class="num">' + D.global.median.toFixed(2) +
      '</td><td class="num">' + D.global.q3.toFixed(2) + '</td></tr>';
  }

  function renderLedger() {
    var L = D.ledger;
    var lines = [
      ['Ranked on the board', L.ranked, L.watchlist + ' on the watchlist + ' + L.early + ' early-discovery protocols below the $50M floor'],
      ['Above the floor, off the watchlist', L.above_floor_off_watchlist, 'Left out on purpose — see the note below'],
      ['Pre-token products set aside', L.pretoken_excluded, 'Wrapped, staked or bridged products, versioned names, exchange products'],
      ['Already trading', L.already_trading, L.trading_comparables + ' with a market cap (the comparables) + ' + L.trading_no_mcap + ' record no market cap + ' + L.trading_dead_mcap + ' record a dead market cap of zero or less + ' + L.trading_exchanges + ' exchanges'],
      ['Total', L.total, 'Every protocol in the snapshot, accounted for'],
    ];
    $('ledger-rows').innerHTML = lines.map(function (x) {
      return '<tr><td>' + x[0] + '</td><td class="num"><strong>' + x[1] + '</strong></td><td>' + x[2] + '</td></tr>';
    }).join('');
  }

  // ------------------------------------------------------------ live view
  function renderLive() {
    $('live-rows').innerHTML = D.live_tokens.map(function (c, i) {
      return '<tr><td class="num">' + (i + 1) + '</td><td><strong>' + esc(c.name) + '</strong>' +
        '<span class="slug">' + esc(c.slug) + '</span></td><td>' + esc(c.category) + '</td>' +
        '<td class="num">' + usdShort(c.tvl_usd) + '</td><td class="num">' + usdShort(c.mcap_usd) +
        '</td><td class="num">' + c.ratio.toFixed(3) + '</td></tr>';
    }).join('');
  }

  // -------------------------------------------------------------- wiring
  function setView(view) {
    state.view = view;
    $('v-board').classList.toggle('on', view === 'board');
    $('v-live').classList.toggle('on', view === 'live');
    $('board-sec').hidden = view !== 'board';
    $('detail').hidden = view !== 'board' ? true : $('detail').hidden;
    $('live-sec').hidden = view !== 'live';
    if (view === 'live') renderLive();
  }

  function applyHash() {
    var h = location.hash || '';
    if (h.indexOf('#row-') === 0) {
      var slug = decodeURIComponent(h.slice(5));
      setView('board');
      renderDetail(slug);
      var el = $('detail');
      if (!el.hidden) el.scrollIntoView();
    } else if (h === '#filter=new') {
      state.nt = true;
      $('nt').checked = true;
      setView('board');
      renderBoard();
    }
  }

  function init() {
    var cats = [];
    rows.forEach(function (r) { if (cats.indexOf(r.category) === -1) cats.push(r.category); });
    cats.sort().forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      $('cat').appendChild(o);
    });
    $('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); });
    $('cat').addEventListener('change', function (e) { state.cat = e.target.value; renderBoard(); });
    $('wl').addEventListener('change', function (e) { state.wl = e.target.checked; renderBoard(); });
    $('nt').addEventListener('change', function (e) { state.nt = e.target.checked; renderBoard(); });
    $('sort').addEventListener('change', function (e) { state.sort = e.target.value; renderBoard(); });
    $('v-board').addEventListener('click', function () { setView('board'); });
    $('v-live').addEventListener('click', function () { setView('live'); });
    $('rows').addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-slug]');
      if (!tr) return;
      renderDetail(tr.getAttribute('data-slug'));
      history.replaceState(null, '', '#row-' + tr.getAttribute('data-slug'));
      $('detail').scrollIntoView();
    });
    window.addEventListener('hashchange', applyHash);
    renderBoard();
    renderModel();
    renderLedger();
    applyHash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
