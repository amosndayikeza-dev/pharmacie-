/**
 * ============================================================
 * DASHBOARD — Tableau de bord
 * ============================================================
 *
 * Affiche :
 *  - Stats financières (CA facturé, CA encaissé, créances, bénéfice)
 *  - Graphique évolution 7 jours (facturé vs encaissé)
 *  - Répartition paiements (espèces vs crédit)
 *  - Top médicaments
 *  - État du stock
 *  - Alertes stock + péremption
 *  - Ventes récentes
 */

Guard.requireAuth();

// ============================================================
// INSTANCES CHART.JS
// ============================================================

const Charts = {
    hello:                null,
    finance:              null,
    repartitionPaiements: null,
    topMedicaments:       null,
    etatStock:            null,
};

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboard();

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadDashboard);
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadDashboard() {
    const loader  = document.getElementById('loader');
    const content = document.getElementById('dashboardContent');
    const btn     = document.getElementById('refreshBtn');

    if (loader)  loader.hidden = false;
    if (content) content.hidden = true;
    if (btn)     btn.disabled = true;

    try {
        const response = await Api.get('/dashboard');
        const data = response.data || {};

        // Renders individuels protégés
        try { renderStats(data.stats || {}); } catch (e) { console.error('[stats]', e); }
        try { renderAlertesStock(data.alertes_stock || []); } catch (e) { console.error('[alertes stock]', e); }
        try { renderAlertesPeremption(data.alertes_peremption || {}); } catch (e) { console.error('[alertes peremption]', e); }
        try { renderVentesRecentes(data.ventes_recentes || []); } catch (e) { console.error('[ventes recentes]', e); }

        // Graphiques (protégés)
        if (typeof Chart !== 'undefined') {
            setupChartDefaults();
            try { renderChartHero(data.evolution_finance || []); } catch (e) { console.error('[chart hero]', e); }
            try { renderChartFinance(data.evolution_finance || []); } catch (e) { console.error('[chart finance]', e); }
            try { renderChartTopMedicaments(data.top_medicaments || []); } catch (e) { console.error('[chart top]', e); }
            try { renderChartEtatStock(data.stats || {}); } catch (e) { console.error('[chart stock]', e); }
        }

        if (content) content.hidden = false;
    } catch (error) {
        console.error('[Dashboard] Erreur:', error);

        if (content) {
            content.hidden = false;
            content.innerHTML = `
                <div class="card">
                    <div class="card-body" style="text-align: center; padding: 40px;">
                        <p style="color: var(--color-danger); font-size: 1rem; font-weight: 600;">
                            ⚠️ Erreur de chargement
                        </p>
                        <p style="color: var(--color-text-muted); margin-top: 8px;">
                            ${escapeHtml(error.message || 'Erreur inconnue')}
                        </p>
                    </div>
                </div>
            `;
        }
        try { Toast.error('Erreur : ' + (error.message || 'inconnue')); } catch (e) {}
    } finally {
        if (loader) { loader.hidden = true; loader.style.display = 'none'; }
        if (btn) btn.disabled = false;
    }
}

// ============================================================
// RENDU — CARTES STATS
// ============================================================

function renderStats(stats) {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    // ═══ HERO ═══
    const caEncaisseMois = parseFloat(stats.ca_encaisse_mois || 0);
    const caFactureMois  = parseFloat(stats.ca_facture_mois || 0);
    const pct = caFactureMois > 0 ? (caEncaisseMois / caFactureMois) * 100 : 0;

    setText('heroCaEncaisse', formatMoney(caEncaisseMois));
    setText('heroSubtitle', `sur ${formatMoney(caFactureMois)} facturés`);
    setText('heroBadge', `${pct.toFixed(0)}% encaissé`);

    // ═══ KPIs SECONDAIRES ═══
    const caFactureJour = parseFloat(stats.ca_facture_jour || 0);
    const ticketsJour   = parseInt(stats.tickets_jour || 0);

    setText('statCaFactureJour', formatMoney(caFactureJour));
    setText('statTicketsJour', `${ticketsJour} ticket${ticketsJour > 1 ? 's' : ''}`);

    setText('statCreances', formatMoney(stats.creances || 0));

    const benefice = parseFloat(stats.benefice_mois || 0);
    const margePct = caFactureMois > 0 ? (benefice / caFactureMois) * 100 : 0;

    setText('statBenefice', formatMoney(benefice));
    setText('statPctMarge', `Marge : ${margePct.toFixed(1)}%`);

    // ═══ MINI-KPIs ═══
    setText('statAnimaux',     stats.nb_animaux || 0);
    setText('statMedicaments', stats.nb_medicaments || 0);
    setText('statLots',        stats.nb_lots || 0);

    const lotsEnAlerte = (stats.nb_lots_perimes || 0) + (stats.nb_lots_alerte || 0);
    setText('statLotsAlerte', lotsEnAlerte);

    // ═══ NOM UTILISATEUR ═══
    const user = Storage.getUser();
    if (user) {
        const prenom = user.prenom || user.nom_complet?.split(' ')[0] || '';
        setText('welcomeName', prenom);
    }
}

/**
 * Retourne un texte du type "67% encaissé".
 */
function pctEncaisse(encaisse, facture) {
    if (facture <= 0) return 'Aucune vente';
    const pct = (encaisse / facture) * 100;
    return `${pct.toFixed(0)}% encaissé`;
}

// ============================================================
// RENDU — ALERTES
// ============================================================

function renderAlertesStock(alertes) {
    const container = document.getElementById('alertesStock');
    if (!container) return;

    if (!alertes || alertes.length === 0) {
        container.innerHTML = '<p class="empty">✅ Aucune alerte de stock</p>';
        return;
    }

    container.innerHTML = alertes.map(a => `
        <div class="alert-item alert-warning">
            <div class="alert-item-body">
                <strong>${escapeHtml(a.nom)}</strong>
                <small>${escapeHtml(a.code_cip)}</small>
            </div>
            <span class="badge badge-warning">
                ${a.stock_actuel} / seuil ${a.seuil_alerte}
            </span>
        </div>
    `).join('');
}

function renderAlertesPeremption(data) {
    const container = document.getElementById('alertesPeremption');
    if (!container) return;

    const total =
        (data.perimes?.length || 0) +
        (data.critiques?.length || 0) +
        (data.attention?.length || 0);

    if (total === 0) {
        container.innerHTML = '<p class="empty">✅ Aucun lot en alerte</p>';
        return;
    }

    let html = '';

    if (data.perimes?.length) {
        html += `<h4 class="alert-group-title danger">Périmés (${data.perimes.length})</h4>`;
        html += data.perimes.slice(0, 5).map(l => renderLotAlert(l, 'danger')).join('');
    }
    if (data.critiques?.length) {
        html += `<h4 class="alert-group-title warning">Expire dans 7 jours (${data.critiques.length})</h4>`;
        html += data.critiques.slice(0, 5).map(l => renderLotAlert(l, 'warning')).join('');
    }

    container.innerHTML = html;
}

function renderLotAlert(lot, niveau) {
    return `
        <div class="alert-item alert-${niveau}">
            <div class="alert-item-body">
                <strong>${escapeHtml(lot.medicament)}</strong>
                <small>Lot ${escapeHtml(lot.numero_lot)}</small>
            </div>
            <span class="badge badge-${niveau}">
                ${lot.jours_restants < 0 ? 'Périmé' : 'J-' + lot.jours_restants}
                · ${lot.quantite}
            </span>
        </div>
    `;
}

// ============================================================
// RENDU — VENTES RÉCENTES
// ============================================================

/**
 * Affiche les 5 dernières ventes dans le tableau du dashboard.
 *
 * Colonnes : Ticket · Client · Animal · Montant · Heure
 */
function renderVentesRecentes(ventes) {
    const tbody = document.querySelector('#ventesRecentes tbody');
    if (!tbody) return;

    // Cas vide
    if (!ventes || ventes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty">Aucune vente récente</td>
            </tr>
        `;
        return;
    }

    // Rendu des lignes
    tbody.innerHTML = ventes.map(v => {
        // Badge statut
        const statutConfig = {
            validee:   { label: 'Payée',     class: 'badge-success' },
            partielle: { label: 'Partielle', class: 'badge-warning' },
            credit:    { label: 'Crédit',    class: 'badge-danger'  },
            annulee:   { label: 'Annulée',   class: 'badge-neutral' },
            avoir:     { label: 'Avoir',     class: 'badge-info'    },
        };
        const statut = statutConfig[v.statut] || { label: v.statut, class: 'badge-neutral' };

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(v.numero_ticket)}</strong>
                    <br><span class="badge ${statut.class}" style="font-size: 0.65rem;">${statut.label}</span>
                </td>
                <td>${escapeHtml(v.proprietaire)}</td>
                <td>
                    ${v.animal
                        ? `<span class="badge badge-info">🐾 ${escapeHtml(v.animal)}</span>`
                        : '<span class="text-muted">—</span>'}
                </td>
                <td class="text-right">${formatMoney(v.montant_ttc)}</td>
                <td>${formatTime(v.date_heure)}</td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// GRAPHIQUES
// ============================================================

function setupChartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#6b7280';
}

/**
 * Graphique 1 — CA facturé vs encaissé (barres groupées).
 */
/**
 * Graphique 1 — CA facturé vs encaissé (courbes).
 */
function renderChartFinance(evolution) {
    if (typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chartFinance');
    if (!canvas) return;

    if (Charts.finance) Charts.finance.destroy();

    const labels    = evolution.map(e => e.label || '—');
    const factures  = evolution.map(e => e.facture || 0);
    const encaisses = evolution.map(e => e.encaisse || 0);

    const ctx = canvas.getContext('2d');

    // Dégradé indigo pour le facturé
    const gradientFacture = ctx.createLinearGradient(0, 0, 0, 320);
    gradientFacture.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    gradientFacture.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

    // Dégradé émeraude pour l'encaissé
    const gradientEncaisse = ctx.createLinearGradient(0, 0, 0, 320);
    gradientEncaisse.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    gradientEncaisse.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

    Charts.finance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'CA facturé',
                    data: factures,
                    borderColor: '#6366f1',
                    backgroundColor: gradientFacture,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                },
                {
                    label: 'CA encaissé',
                    data: encaisses,
                    borderColor: '#10b981',
                    backgroundColor: gradientEncaisse,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: { size: 13, weight: '600' },
                    },
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 14,
                    titleFont: { size: 13, weight: '600' },
                    bodyFont: { size: 12 },
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label} : ${formatMoney(ctx.parsed.y)}`,
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (v) => {
                            if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
                            if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
                            return v;
                        },
                    },
                    grid: { color: '#f3f4f6', drawBorder: false },
                },
                x: {
                    grid: { display: false },
                },
            },
        },
    });
}



/**
 * Graphique 3 — Top 5 médicaments.
 */
function renderChartTopMedicaments(top) {
    if (typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chartTopMedicaments');
    if (!canvas) return;

    if (Charts.topMedicaments) Charts.topMedicaments.destroy();

    const top5 = (top || []).slice(0, 5);

    if (!top5.length) {
        canvas.parentElement.innerHTML = '<p class="empty">Aucune vente ce mois</p>';
        return;
    }

    Charts.topMedicaments = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: top5.map(m => m.nom || '—'),
            datasets: [{
                label: 'Quantité vendue',
                data: top5.map(m => m.quantite_vendue || 0),
                backgroundColor: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'],
                borderRadius: 6,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    callbacks: { label: (ctx) => `${ctx.parsed.x} unités` },
                },
            },
            scales: {
                x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f3f4f6' } },
                y: { grid: { display: false } },
            },
        },
    });
}

/**
 * Graphique 4 — État du stock.
 */
function renderChartEtatStock(stats) {
    if (typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chartEtatStock');
    if (!canvas) return;

    if (Charts.etatStock) Charts.etatStock.destroy();

    const actifs  = parseInt(stats.nb_medicaments || 0);
    const perimes = parseInt(stats.nb_lots_perimes || 0);
    const alerte  = parseInt(stats.nb_lots_alerte || 0);

    if (actifs + perimes + alerte === 0) {
        canvas.parentElement.innerHTML = '<p class="empty">Aucune donnée de stock</p>';
        return;
    }

    Charts.etatStock = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Médicaments actifs', 'Lots périmés', 'Lots en alerte'],
            datasets: [{
                data: [actifs, perimes, alerte],
                backgroundColor: ['#10b981', '#dc2626', '#f59e0b'],
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
                    labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 },
                },
                tooltip: { backgroundColor: '#1f2937', padding: 12 },
            },
        },
    });
}

// ============================================================
// HELPERS
// ============================================================

function formatMoney(value) {
    return new Intl.NumberFormat('fr-BI', {
        style: 'currency', currency: 'BIF',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value || 0);
}

function formatTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit',
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Mini-graphe dans la hero card (sparkline).
 * Montre l'évolution du CA facturé sur 7 jours.
 */
function renderChartHero(evolution) {
    if (typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chartHero');
    if (!canvas) return;

    if (Charts.hero) Charts.hero.destroy();

    const labels = evolution.map(e => e.label || '');
    const data   = evolution.map(e => e.facture || 0);

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 80);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    Charts.hero = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data,
                borderColor: 'rgba(255, 255, 255, 0.9)',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#fff',
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false },
            },
            elements: { line: { borderCapStyle: 'round' } },
        },
    });
}