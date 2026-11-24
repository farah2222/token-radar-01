// Token Radar radar-7 dashboard. Data comes from ../data.js (window.TOKEN_RADAR_DATA).
// No network: everything renders from that one object.
(function () {
  'use strict';
  var D = window.TOKEN_RADAR_DATA;
  var rows = D.rows;
  var state = { q: '', cat: '', status: 'pretoken', wl: false, nt: false, sort: 'rank' };

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
  var statusLabel = function (r) {
    if (r.status === 'live') return '<span class="tag-live">LIVE</span>';
    if (r.status === 'pretoken-flagged') return '<span class="tag-flag">FLAGGED</span>';
    return '<span class="tag">PRE-TOKEN</span>';
  };
  var oddsCell = function (r) {
    if (r.status === 'live') {
      if (r.model_vs_market === null) return '<span class="slug">mcap not recorded</span>';
      return 'model ' + r.model_vs_market.toFixed(2) + '× market';
    }
    return Math.round(r.token_odds * 100) + '%';
  };
  var farmCell = function (r) {
    if (!r.farm_economics) return '—';
    var v = r.farm_economics.scenario_dollars_per_hour;
    var sign = v < 0 ? '-' : '';
    return '<span class="' + (v < 0 ? 'neg' : '') + '">' + sign + '$' + Math.abs(v).toFixed(2) + '/h</span>';
  };

  // ------------------------------------------------------------ board list
  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = rows.filter(function (r) {
      if (state.status && r.status !== state.status) return false;
      if (state.wl && !r.watchlist) return false;
      if (state.nt && !r.newly_tracked) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + r.category).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var by = {
      rank: function (a, b) { return (a.rank === null ? 99999 : a.rank) - (b.rank === null ? 99999 : b.rank) || a.census_rank - b.census_rank; },
      census: function (a, b) { return a.census_rank - b.census_rank; },
      value: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      change: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
      age: function (a, b) { return b.age_days - a.age_days; },
      odds: function (a, b) { return (b.token_odds === null ? -1 : b.token_odds) - (a.token_odds === null ? -1 : a.token_odds); },
      farm: function (a, b) {
        var av = a.farm_economics ? a.farm_economics.scenario_dollars_per_hour : -Infinity;
        var bv = b.farm_economics ? b.farm_economics.scenario_dollars_per_hour : -Infinity;
        return bv - av;
      },
      vsmarket: function (a, b) { return (b.model_vs_market === null ? -1 : b.model_vs_market) - (a.model_vs_market === null ? -1 : a.model_vs_market); },
    }[state.sort];
    return list.sort(by);
  }

  function rankCell(r) {
    if (r.rank !== null) {
      var range = r.rank_range && r.rank_range[0] !== r.rank_range[1]
        ? 'likely ' + r.rank_range[0] + '–' + r.rank_range[1]
        : 'likely ' + r.rank_range[0];
      return '<span class="rank">#' + r.rank + '</span><span class="range">' + range +
        '</span><span class="range">census #' + r.census_rank + '</span>';
    }
    return '<span class="range">census #' + r.census_rank + '</span>';
  }

  function renderBoard() {
    var list = filtered();
    var statusWord = state.status === 'pretoken' ? ' · pre-token only'
      : state.status === 'pretoken-flagged' ? ' · flagged only'
      : state.status === 'live' ? ' · already trading only' : '';
    $('count').textContent = list.length + ' of ' + rows.length + ' protocols shown' + statusWord +
      (state.wl ? ' · watchlist only' : '') + (state.nt ? ' · newly tracked only' : '');
    $('rows').innerHTML = list.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td>' + rankCell(r) + '</td>' +
        '<td><strong>' + esc(r.name) + '</strong>' + (r.watchlist ? '<span class="tag">WATCHLIST</span>' : '') +
        (r.newly_tracked ? '<span class="badge">NEW</span>' : '') +
        '<span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + statusLabel(r) + '</td>' +
        '<td>' + esc(r.category) + '</td>' +
        '<td class="num">' + usdShort(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td>' + ago(r) + '</td>' +
        '<td class="num" title="' + esc(r.chains.join(', ')) + '">' + r.chain_count + '</td>' +
        '<td class="num"><strong>' + usd(r.implied_value_usd) + '</strong></td>' +
        '<td class="num">' + r.multiple.toFixed(2) + (r.multiple_source === 'global' ? ' <span class="slug">global</span>' : '') + '</td>' +
        '<td class="num">' + oddsCell(r) + '</td>' +
        '<td class="num">' + farmCell(r) + '</td>' +
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

  function farmEconomicsTable(r) {
    var e = r.farm_economics;
    var perHour = e.scenario_dollars_per_hour;
    var perHourText = perHour < 0 ? '-$' + Math.abs(perHour).toFixed(2) : '$' + perHour.toFixed(2);
    return '<h3>Farm economics — in dollars</h3><table><tbody>' +
      '<tr><td>Deposit (deployed capital, recoverable on exit)</td><td class="num">' + usd(e.deposit_usd) + '</td></tr>' +
      '<tr><td>Gas and fees over ' + r.farm_total.weeks + ' weeks (the only sunk cash cost)</td><td class="num">' + usd(e.gas_cost_usd) + '</td></tr>' +
      '<tr><td>Hands-on time</td><td class="num">' + e.hours.toFixed(1) + ' hours</td></tr>' +
      '<tr><td>Farmer\u2019s share at implied value (' + usd(e.deposit_usd) + ' × ' + e.value_ratio.toFixed(3) + ')</td><td class="num">' + usd(e.stake_implied_usd) + '</td></tr>' +
      '<tr><td><strong>Break-even airdrop</strong> — the airdrop must be worth at least this</td><td class="num"><strong>' + usd(e.breakeven_airdrop_usd) + '</strong></td></tr>' +
      '<tr><td>Break-even value ratio (gas / deposit)</td><td class="num">' + e.breakeven_ratio.toFixed(3) + ' vs actual ' + e.value_ratio.toFixed(3) + '</td></tr>' +
      '<tr><td>Scenario net (pro-rata share minus gas)</td><td class="num">' + (e.scenario_net_usd < 0 ? '-$' + Math.abs(e.scenario_net_usd).toLocaleString('en-US') : usd(e.scenario_net_usd)) + '</td></tr>' +
      '<tr><td><strong>Scenario dollars per hour</strong></td><td class="num"><strong>' + perHourText + '/h</strong></td></tr>' +
      '</tbody></table>' +
      '<p class="note">The scenario asks what the farm would pay if the airdrop were shared out purely pro-rata by TVL at implied value. Real airdrops are rarely pro-rata, so use it to compare farms, not as a promised payout. The deposit itself is not lost: it comes back when the position is withdrawn.</p>';
  }

  function renderDetail(slug) {
    var r = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) r = rows[i];
    var el = $('detail');
    if (!r) { el.hidden = true; el.innerHTML = ''; return; }
    var f = r.farm_total;
    var hours = (f.minutes / 60).toFixed(1);
    var rankLine = r.rank !== null
      ? 'Launch rank #' + r.rank + (r.rank_range ? ' · likely ' + r.rank_range[0] + '–' + r.rank_range[1] : '') + ' · census rank #' + r.census_rank
      : 'Census rank #' + r.census_rank + ' · no launch rank';
    var head =
      '<h2>' + esc(r.name) + ' <span class="rank">' + (r.rank !== null ? '#' + r.rank : '') + '</span>' +
      (r.watchlist ? '<span class="tag">WATCHLIST</span>' : '') +
      (r.newly_tracked ? '<span class="badge">NEW</span>' : '') + ' ' + statusLabel(r) + '</h2>' +
      '<p class="meta">' + esc(r.slug) + ' · ' + esc(r.category) + ' · First tracked by DefiLlama on ' +
      (r.listed_at || 'a date not recorded') + ', ' + r.age_days + ' days before the snapshot · ' + rankLine + '.</p>';
    var flag = r.flag_reason ? '<p class="flag-note">' + esc(r.flag_reason) + '</p>' : '';
    var modelRows =
      '<tr><td>TVL</td><td class="num">' + usd(r.tvl_usd) + '</td></tr>' +
      '<tr><td>Category multiple (' + (r.multiple_source === 'category' ? 'category median' : 'global median') + ', ' + (r.comparables_count === 1 ? '1 comparable' : r.comparables_count + ' comparables') + ')</td><td class="num">' + r.multiple.toFixed(3) + '</td></tr>' +
      '<tr><td>Base value (TVL × multiple)</td><td class="num">' + usd(r.base_value_usd) + '</td></tr>' +
      '<tr><td>Growth multiplier (7-day ' + pct(r.change_7d) + ')</td><td class="num">× ' + r.growth_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Maturity multiplier (' + r.age_days + ' days)</td><td class="num">× ' + r.maturity_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Breadth multiplier (' + r.chain_count + ' chain' + (r.chain_count === 1 ? '' : 's') + ')</td><td class="num">× ' + r.breadth_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td><strong>Implied value</strong></td><td class="num"><strong>' + usd(r.implied_value_usd) + '</strong></td></tr>';
    if (r.status === 'live') {
      modelRows += r.actual_mcap_usd !== null
        ? '<tr><td>Actual market cap</td><td class="num">' + usd(r.actual_mcap_usd) + '</td></tr>' +
          '<tr><td>Model vs market</td><td class="num">' + r.model_vs_market.toFixed(2) + '×</td></tr>'
        : '<tr><td>Actual market cap</td><td class="num">Not recorded in the snapshot</td></tr>';
    }
    var odds = '';
    if (r.status !== 'live') {
      odds = '<h3>Token odds — ' + Math.round(r.token_odds * 100) + '%</h3>' +
        '<p>The model gives this protocol a ' + Math.round(r.token_odds * 100) +
        '% chance of launching a token. ' + (r.odds_note ? esc(r.odds_note) : '') +
        ' Fitted on the snapshot\u2019s own 416 launched versus 342 pre-token protocols; held-out AUC ' +
        D.validation.odds_auc.toFixed(3) + ' — a modest signal, not a prediction.</p>';
    }
    var farm = '';
    if (r.status === 'live') {
      farm = '<h3>Farm plan</h3><p class="note">Already trading — not a farm target. The comparables below are what this protocol\u2019s market cap prices.</p>';
    } else {
      var steps = r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
      farm = '<h3>Farm plan</h3><ol class="steps">' + steps + '</ol>' +
        '<p class="totals">Farm total: about $' + f.cost_usd + ' in gas and fees over ' + f.weeks + ' weeks, ' +
        'plus $' + f.capital_usd + ' of capital deployed (recoverable on exit). About ' + hours + ' hours of hands-on time.</p>' +
        farmEconomicsTable(r);
    }
    el.innerHTML = head + flag +
      '<h3>Why it ranks here</h3><ul class="drivers">' +
      r.drivers.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' +
      '<h3>Model breakdown</h3><table><tbody>' + modelRows + '</tbody></table>' +
      '<p class="note">Formula: max(1, round(' + usd(r.base_value_usd) + ' × ' + r.growth_multiplier.toFixed(3) +
      ' × ' + r.maturity_multiplier.toFixed(3) + ' × ' + r.breadth_multiplier.toFixed(3) + ')) = ' + usd(r.implied_value_usd) + '.</p>' +
      odds + farm +
      '<h3>Comparables — ' + esc(r.category) + '</h3>' + comparablesTable(r);
    el.hidden = false;
    var sel = document.querySelector('#rows tr.sel');
    if (sel) sel.classList.remove('sel');
    var tr = document.querySelector('#rows tr[data-slug="' + slug + '"]');
    if (tr) tr.classList.add('sel');
  }

  // ------------------------------------------------- model, ledger, strip
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
    $('val-rows').innerHTML = D.validation.variants.map(function (v) {
      return '<tr><td>' + esc(v.name) + '</td><td class="num">' + (v.mdape * 100).toFixed(1) + '%</td>' +
        '<td class="num">' + (v.mean_ape * 100).toFixed(1) + '%</td><td class="num">' + (v.within_2x * 100).toFixed(0) + '%</td>' +
        '<td class="num">' + (v.within_1_5x * 100).toFixed(0) + '%</td><td class="num">' + (v.bias_pct * 100).toFixed(1) + '%</td></tr>';
    }).join('');
    var full = D.validation.variants[0];
    var multOnly = D.validation.variants[D.validation.variants.length - 1];
    $('val-note').textContent = 'The multiples spread is wide: the held-out median error is ' + (full.mdape * 100).toFixed(1) +
      '% — treat implied values as order-of-magnitude ranks, not prices. The multipliers barely move the median error, ' +
      'but they cut the mean error from ' + (multOnly.mean_ape * 100).toFixed(1) + '% (multiple only) to ' +
      (full.mean_ape * 100).toFixed(1) + '% (full model), so they tame the worst misses.';
    var om = D.odds_model;
    $('odds-rows').innerHTML = om.features.map(function (f, i) {
      return '<tr><td>' + esc(f) + '</td><td class="num">' + om.coefficients[i].toFixed(3) + '</td></tr>';
    }).join('') + '<tr><td><strong>Intercept</strong></td><td class="num"><strong>' + om.intercept.toFixed(3) + '</strong></td></tr>';
    $('odds-note').textContent = 'Fitted on all ' + om.trained_on + ' protocols (' + om.positives +
      ' launched, ' + om.negatives + ' pre-token). Cross-validated AUC ' + om.auc_cv.toFixed(3) +
      ' — better than chance (0.500), far from certain. "Records no token" is not proof that no token exists, ' +
      'so some training labels are wrong and the odds inherit that noise.';
  }

  function renderLedger() {
    var L = D.ledger;
    var lines = [
      ['Ranked on the board', L.ranked, L.pretoken + ' clean pre-token + ' + L.pretoken_flagged + ' flagged + ' + L.live + ' already trading'],
      ['Clean pre-token', L.pretoken, L.watchlist + ' on the watchlist + ' + L.early + ' early-discovery protocols below the $50M floor'],
      ['Flagged pre-token', L.pretoken_flagged, L.flagged_above_floor + ' above the floor and off the watchlist + ' + L.flagged_versioned + ' versioned names + ' + L.flagged_product + ' wrapped / staked / bridged products + ' + L.flagged_exchange + ' exchange products'],
      ['Already trading', L.live, L.live_comparables + ' with a market cap (the comparables) + ' + L.live_no_mcap + ' record no market cap + ' + L.live_dead_mcap + ' record a dead market cap of zero or less + ' + L.live_exchanges + ' exchanges'],
      ['Total', L.total, 'Every protocol in the snapshot, accounted for'],
    ];
    $('ledger-rows').innerHTML = lines.map(function (x) {
      return '<tr><td>' + x[0] + '</td><td class="num"><strong>' + x[1] + '</strong></td><td>' + x[2] + '</td></tr>';
    }).join('');
  }

  function renderIntegrity() {
    var I = D.integrity;
    var sha = I.snapshot_sha256.slice(0, 12);
    var facts = [
      'Snapshot: DefiLlama ' + I.as_of,
      'SHA-256: ' + sha + '…',
      'Protocols: ' + I.protocols_total,
      'Ledger reconciles: ' + D.ledger.pretoken + ' + ' + D.ledger.pretoken_flagged + ' + ' + D.ledger.live + ' = ' + D.ledger.total,
      'Watchlist: ' + I.watchlist_covered,
      'Held-out median error: ' + (I.validation_mdape * 100).toFixed(1) + '%',
      'Token-odds AUC: ' + I.odds_auc.toFixed(3),
      'Model: ' + I.model + ' · ' + I.deterministic,
    ];
    $('integrity').innerHTML = facts.map(function (f) {
      return '<span><strong>' + esc(f.split(': ')[0]) + ':</strong> ' + esc(f.split(': ').slice(1).join(': ')) + '</span>';
    }).join('');
  }

  // -------------------------------------------------------------- wiring
  function applyHash() {
    var h = location.hash || '';
    if (h.indexOf('#row-') === 0) {
      var slug = decodeURIComponent(h.slice(5));
      renderDetail(slug);
      var el = $('detail');
      if (!el.hidden) el.scrollIntoView();
    } else if (h === '#filter=new') {
      state.nt = true;
      $('nt').checked = true;
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
    $('status').addEventListener('change', function (e) { state.status = e.target.value; renderBoard(); });
    $('wl').addEventListener('change', function (e) { state.wl = e.target.checked; renderBoard(); });
    $('nt').addEventListener('change', function (e) { state.nt = e.target.checked; renderBoard(); });
    $('sort').addEventListener('change', function (e) { state.sort = e.target.value; renderBoard(); });
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
    renderIntegrity();
    applyHash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
