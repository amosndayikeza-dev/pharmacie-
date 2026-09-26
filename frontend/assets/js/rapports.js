/**
 * ============================================================
 * LOGIQUE DE LA PAGE RAPPORTS
 * ============================================================
 *
 * Permet de consulter les rapports sur différentes périodes :
 *   - Jour    (aujourd'hui)
 *   - Hebdo   (semaine en cours)
 *   - Mensuel (mois en cours)
 *   - Annuel  (année en cours)
 *   - Custom  (période personnalisée)
 *
 * Affiche : CA facturé, CA encaissé, bénéfice, créances,
 *           tickets, clients uniques, panier moyen
 */

Guard.requireAuth();

const State = {
    period: 'jour',
    dateDebut: null,
    dateFin: null,
};

let chartEvolution = null;
let chartRepartition = null;

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    const today = new Date().toISOString().split('T')[0];
    State.dateDebut = today;
    State.dateFin = today;

    // Générer les rapports du jour avant de charger
    try {
        await Api.post('/rapports/generer');
    } catch (e) {
        console.warn('[Rapports] Génération auto ignorée :', e.message || e);
    }

    await chargerRapport('jour');
    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function chargerRapport(period, dateDebut = null, dateFin = null) {
    const loader  = document.getElementById('loader');
    const content = document.getElementById('content');

    loader.hidden = false;
    content.hidden = true;

    State.period = period;

    try {
        let url = '/rapports';

        if (period === 'jour') {
            const date = dateDebut || new Date().toISOString().split('T')[0];
            url = `/rapports/${date}`;
        } else if (period === 'hebdo') {
            url = '/rapports/hebdo';
        } else if (period === 'mensuel') {
            url = '/rapports/mensuel';
        } else if (period === 'annuel') {
            url = '/rapports/annuel';
        } else if (period === 'custom' && dateDebut && dateFin) {
            url = `/rapports?date_debut=${dateDebut}&date_fin=${dateFin}`;
        }

        const response = await Api.get(url);
        renderRapport(response.data, response.meta);
        content.hidden = false;
    } catch (error) {
        console.error('[Rapports]', error);

        // Cas 404 → générer puis réessayer
        if (error.status === 404 && period === 'jour') {
            try {
                await Api.post('/rapports/generer');
                const date = dateDebut || new Date().toISOString().split('T')[0];
                const retry = await Api.get(`/rapports/${date}`);
                renderRapport(retry.data, retry.meta);
                content.hidden = false;
                Toast.info('Rapport généré automatiquement.');
                return;
            } catch (e) {
                showEmptyState();
                return;
            }
        }

        Toast.error('Erreur : ' + (error.message || 'inconnue'));
        showEmptyState();
    } finally {
        loader.hidden = true;
    }
}

// ============================================================
// RENDU
// ============================================================

function renderRapport(data, meta) {
    let stats;
    let periodLabelText;

    // Si tableau (hebdo/mensuel/annuel) → agréger
    if (Array.isArray(data)) {
        stats = agregerRapports(data);
        periodLabelText = labelPeriode(State.period, data);
    } else if (data === null || data === undefined) {
        showEmptyState();
        return;
    } else {
        stats = data;
        periodLabelText = labelPeriode(State.period, stats?.date_reference);
    }

    document.getElementById('periodLabel').textContent = periodLabelText;

    // ═══════════════════════════════════════════════════════
    // STATS PRINCIPALES
    // ═══════════════════════════════════════════════════════
    const caTtc      = parseFloat(stats.total_ca_ttc || 0);
    const caHt       = parseFloat(stats.total_ca_ht || 0);
    const caTva      = parseFloat(stats.total_ca_tva || 0);
    const caEncaisse = parseFloat(stats.total_ca_encaisse ?? caTtc);   // fallback si pas dispo
    const creances   = parseFloat(stats.creances ?? 0);
    const marge      = parseFloat(stats.total_marge_brute_ttc || 0);
    const nbTickets  = parseInt(stats.nb_tickets || 0);
    const nbClients  = parseInt(stats.nb_clients_uniques || 0);
    const panier     = parseFloat(stats.panier_moyen || 0);

    setText('statCaTtc',      formatMoney(caTtc));
    setText('statCaHt',       `HT : ${formatMoney(caHt)}`);

    setText('statCaEncaisse', formatMoney(caEncaisse));
    setText('statPctEncaisse', caTtc > 0
        ? `${((caEncaisse / caTtc) * 100).toFixed(0)}% encaissé`
        : 'Aucune vente');

    setText('statMarge',      formatMoney(marge));
    setText('statMargePct',   caTtc > 0
        ? `Marge : ${((marge / caTtc) * 100).toFixed(1)}%`
        : '—');

    setText('statCreances',   formatMoney(creances));

    setText('statTickets',    nbTickets);
    setText('statClients',    nbClients);
    setText('statPanier',     formatMoney(panier));

    // ═══════════════════════════════════════════════════════
    // RÉSUMÉ FINANCIER
    // ═══════════════════════════════════════════════════════
    setText('financeCaHt',       formatMoney(caHt));
    setText('financeCaTva',      formatMoney(caTva));
    setText('financeCaTtc',      formatMoney(caTtc));
    setText('financeCaEncaisse', formatMoney(caEncaisse));
    setText('financeCreances',   formatMoney(creances));
    setText('financeBenefice',   formatMoney(marge));

    // ═══════════════════════════════════════════════════════
    // GRAPHIQUES
    // ═══════════════════════════════════════════════════════
    if (typeof Chart !== 'undefined') {
        renderChartEvolution(Array.isArray(data) ? data : [data]);
        renderChartRepartition(stats);
    }

    // ═══════════════════════════════════════════════════════
    // TOP MÉDICAMENTS
    // ═══════════════════════════════════════════════════════
    renderTopMedicaments(stats);
}

function agregerRapports(rapports) {
    const agg = {
        total_ca_ht: 0, total_ca_tva: 0, total_ca_ttc: 0,
        total_ca_encaisse: 0,
        total_marge_brute_ttc: 0,
        nb_tickets: 0, nb_clients_uniques: 0,
        total_especes: 0, total_carte: 0, total_mobile_money: 0, total_credit: 0,
        top_medicament: null,
    };

    rapports.forEach(r => {
        agg.total_ca_ht          += parseFloat(r.total_ca_ht || 0);
        agg.total_ca_tva         += parseFloat(r.total_ca_tva || 0);
        agg.total_ca_ttc         += parseFloat(r.total_ca_ttc || 0);
        agg.total_ca_encaisse    += parseFloat(r.total_ca_encaisse ?? r.total_especes ?? 0);
        agg.total_marge_brute_ttc += parseFloat(r.total_marge_brute_ttc || 0);
        agg.nb_tickets           += parseInt(r.nb_tickets || 0);
        agg.nb_clients_uniques   += parseInt(r.nb_clients_uniques || 0);
        agg.total_especes        += parseFloat(r.total_especes || 0);
        agg.total_carte          += parseFloat(r.total_carte || 0);
        agg.total_mobile_money   += parseFloat(r.total_mobile_money || 0);
        agg.total_credit         += parseFloat(r.total_credit || 0);
    });

    agg.panier_moyen = agg.nb_tickets > 0
        ? agg.total_ca_ttc / agg.nb_tickets
        : 0;

    // Top médicament (prend le premier trouvé)
    const firstWithTop = rapports.find(r => r.top_medicament);
    if (firstWithTop) {
        agg.top_medicament = firstWithTop.top_medicament;
    }

    return agg;
}

function renderTopMedicaments(stats) {
    const tbody = document.getElementById('topMedicamentsTbody');
    if (!tbody) return;

    const tm = stats.top_medicament;

    if (!tm) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="empty">
                    Aucune vente sur la période
                </td>
            </tr>
        `;
        return;
    }

    const qte = tm.quantite_vendue || stats.top_medicament_quantite || 0;
    const ca  = tm.ca_total || 0;

    tbody.innerHTML = `
        <tr>
            <td>
                <strong>${escapeHtml(tm.nom || '—')}</strong>
                <br><small class="text-muted">${escapeHtml(tm.code_cip || '')}</small>
            </td>
            <td class="text-right">${qte}</td>
            <td class="text-right">${formatMoney(ca)}</td>
        </tr>
    `;
}

function showEmptyState() {
    const content = document.getElementById('content');

    ['statCaTtc', 'statCaEncaisse', 'statMarge', 'statCreances',
     'statTickets', 'statClients', 'statPanier'].forEach(id => {
        setText(id, '0 BIF');
    });

    setText('statCaHt', 'HT : 0 BIF');
    setText('statPctEncaisse', 'Aucune vente');
    setText('statMargePct', '—');

    setText('financeCaHt', '0 BIF');
    setText('financeCaTva', '0 BIF');
    setText('financeCaTtc', '0 BIF');
    setText('financeCaEncaisse', '0 BIF');
    setText('financeCreances', '0 BIF');
    setText('financeBenefice', '0 BIF');

    const tbody = document.getElementById('topMedicamentsTbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty">Aucune vente</td></tr>`;
    }

    setText('periodLabel', 'Aucun rapport pour cette période');

    content.hidden = false;
}

// ============================================================
// GRAPHIQUES
// ============================================================

function renderChartEvolution(rapports) {
    if (typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chartEvolution');
    if (!canvas) return;

    if (chartEvolution) chartEvolution.destroy();

    // Si 1 seul rapport → dupliquer en 2 points pour tracer une ligne
    const labels = rapports.length > 1
        ? rapports.map(r => formatShortDate(r.date_reference))
        : ['Début', 'Fin'];

    const caFacture = rapports.length > 1
        ? rapports.map(r => parseFloat(r.total_ca_ttc || 0))
        : [0, parseFloat(rapports[0]?.total_ca_ttc || 0)];

    const caEncaisse = rapports.length > 1
        ? rapports.map(r => parseFloat(r.total_ca_encaisse ?? r.total_especes ?? 0))
        : [0, parseFloat(rapports[0]?.total_ca_encaisse ?? rapports[0]?.total_especes ?? 0)];

    const ctx = canvas.getContext('2d');

    const gradientFacture = ctx.createLinearGradient(0, 0, 0, 340);
    gradientFacture.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    gradientFacture.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

    const gradientEncaisse = ctx.createLinearGradient(0, 0, 0, 340);
    gradientEncaisse.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    gradientEncaisse.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

    chartEvolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'CA facturé',
                    data: caFacture,
                    borderColor: '#6366f1',
                    backgroundColor: gradientFacture,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                },
                {
                    label: 'CA encaissé',
                    data: caEncaisse,
                    borderColor: '#10b981',
                    backgroundColor: gradientEncaisse,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, pointStyle: 'circle', padding: 20 },
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 12,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label} : ${formatMoney(ctx.parsed.y)}`,
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (v) => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' :
                                          v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v,
                    },
                    grid: { color: '#f3f4f6' },
                },
                x: { grid: { display: false } },
            },
        },
    });
}

function renderChartRepartition(stats) {
    if (typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chartRepartition');
    if (!canvas) return;

    if (chartRepartition) chartRepartition.destroy();

    const especes = parseFloat(stats.total_especes || 0);
    const carte   = parseFloat(stats.total_carte || 0);
    const mobile  = parseFloat(stats.total_mobile_money || 0);
    const credit  = parseFloat(stats.total_credit || 0);
    const total   = especes + carte + mobile + credit;

    if (total === 0) {
        canvas.parentElement.innerHTML = '<p class="empty">Aucun paiement sur la période</p>';
        return;
    }

    chartRepartition = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Espèces', 'Carte', 'Mobile Money', 'Crédit'],
            datasets: [{
                data: [especes, carte, mobile, credit],
                backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
                borderWidth: 2,
                borderColor: '#fff',
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, pointStyle: 'circle', padding: 14 },
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 12,
                    callbacks: {
                        label: (ctx) => {
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return `${ctx.label} : ${formatMoney(ctx.parsed)} (${pct}%)`;
                        },
                    },
                },
            },
        },
    });
}

// ============================================================
// LABELS PÉRIODE
// ============================================================

function labelPeriode(period, extra) {
    const today = new Date();

    switch (period) {
        case 'jour': {
            const d = typeof extra === 'string' ? new Date(extra) : today;
            const formatted = d.toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            });
            return `Aujourd'hui — ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`;
        }
        case 'hebdo': {
            const debut = Array.isArray(extra) && extra.length > 0 ? extra[0].date_reference : null;
            const fin   = Array.isArray(extra) && extra.length > 0 ? extra[extra.length - 1].date_reference : null;
            return `Semaine — du ${formatShortDate(debut)} au ${formatShortDate(fin)}`;
        }
        case 'mensuel':
            return `Mois — ${today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
        case 'annuel':
            return `Année ${today.getFullYear()}`;
        case 'custom':
            return `Période personnalisée — du ${formatShortDate(State.dateDebut)} au ${formatShortDate(State.dateFin)}`;
        default:
            return '—';
    }
}

// ============================================================
// ACTIONS
// ============================================================

async function genererRapports() {
    const btn = document.getElementById('genererBtn');
    btn.disabled = true;

    try {
        const response = await Api.post('/rapports/generer');
        Toast.success(response.message || 'Rapports générés avec succès.');
        await chargerRapport(State.period, State.dateDebut, State.dateFin);
    } catch (error) {
        Toast.error(error.message);
    } finally {
        btn.disabled = false;
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Onglets
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const period = tab.getAttribute('data-period');

            if (period === 'custom') {
                document.getElementById('customDateToolbar').hidden = false;
                return;
            }

            document.getElementById('customDateToolbar').hidden = true;
            await chargerRapport(period);
        });
    });

    // Charger custom
    const chargerCustomBtn = document.getElementById('chargerCustomBtn');
    if (chargerCustomBtn) {
        chargerCustomBtn.addEventListener('click', async () => {
            const debut = document.getElementById('dateDebut').value;
            const fin   = document.getElementById('dateFin').value;

            if (!debut || !fin) {
                Toast.warning('Veuillez choisir les deux dates.');
                return;
            }

            if (debut > fin) {
                Toast.warning('La date de début doit être antérieure à la date de fin.');
                return;
            }

            State.dateDebut = debut;
            State.dateFin = fin;
            await chargerRapport('custom', debut, fin);
        });
    }

    // Générer
    const genererBtn = document.getElementById('genererBtn');
    if (genererBtn) genererBtn.addEventListener('click', genererRapports);
}

// ============================================================
// HELPERS
// ============================================================

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatMoney(value) {
    const num = parseFloat(value || 0);
    return new Intl.NumberFormat('fr-BI', {
        style: 'currency', currency: 'BIF',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(num);
}

function formatShortDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}