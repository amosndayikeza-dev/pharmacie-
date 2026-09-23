/**
 * Logique du tableau de bord.
 *
 * ⚠️ Le layout (sidebar, header, footer) est géré par components.js + layout.js
 * Ce fichier ne contient QUE la logique du contenu du dashboard.
 *
 * ROBUSTESSE :
 *   - Chaque render est isolé dans un try/catch → une erreur n'empêche pas le reste
 *   - Chart.js protégé (si absent, les graphiques sont ignorés, mais la page s'affiche)
 *   - finally garantit que le loader est toujours masqué
 */

// ============================================================
// INSTANCES CHART.JS
// ============================================================

const Charts = {
    ventesSemaine:  null,
    paiements:      null,
    topMedicaments: null,
    etatStock:      null,
};

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Date du jour
    renderDate();

    // 2. Charger le dashboard
    await loadDashboard();

    // 3. Bouton rafraîchir
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboard);
    }
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

        // ⚠️ Chaque render est isolé : une erreur n'empêche pas les autres
        try { renderStats(data.stats || {}); } catch (e) { console.error('[renderStats]', e); }
        try { renderAlertesStock(data.alertes_stock || []); } catch (e) { console.error('[renderAlertesStock]', e); }
        try { renderAlertesPeremption(data.alertes_peremption || {}); } catch (e) { console.error('[renderAlertesPeremption]', e); }
        try { renderVentesRecentes(data.ventes_recentes || []); } catch (e) { console.error('[renderVentesRecentes]', e); }
        try { renderTopMedicaments(data.top_medicaments || []); } catch (e) { console.error('[renderTopMedicaments]', e); }

        // ⚠️ Graphiques : uniquement si Chart.js est chargé
        if (typeof Chart !== 'undefined') {
            try { setupChartDefaults(); } catch (e) { console.error('[chart defaults]', e); }
            try { renderChartVentesSemaine(data.ventes_semaine || []); } catch (e) { console.error('[chart ventes]', e); }
            try { renderChartTopMedicaments(data.top_medicaments || []); } catch (e) { console.error('[chart top]', e); }
            try { renderChartEtatStock(data.stats || {}); } catch (e) { console.error('[chart stock]', e); }
            try { renderChartPaiements(data.stats || {}); } catch (e) { console.error('[chart paiements]', e); }
        } else {
            console.warn('[Dashboard] Chart.js non chargé — graphiques ignorés');
        }

        // Badge alertes dans la sidebar
        const nbAlertes =
            (data.alertes_stock?.length || 0) +
            (data.alertes_peremption?.perimes?.length || 0) +
            (data.alertes_peremption?.critiques?.length || 0);

        const badge = document.getElementById('badgeAlertes');
        if (badge && nbAlertes > 0) {
            badge.textContent = nbAlertes;
            badge.hidden = false;
        }

        if (content) content.hidden = false;

    } catch (error) {
        console.error('[Dashboard] Erreur globale:', error);

        // Afficher un message d'erreur DANS le contenu (au lieu de rester sur le loader)
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
                        <p style="color: var(--color-text-soft); margin-top: 16px; font-size: 0.85rem;">
                            Vérifie la console (F12) pour plus de détails.
                        </p>
                    </div>
                </div>
            `;
        }

        try { Toast.error('Erreur : ' + (error.message || 'inconnue')); } catch (e) {}

    } finally {
        // ⚠️ TOUJOURS masquer le loader, même en cas d'erreur
        if (loader) loader.hidden = true;
        if (btn)    btn.disabled = false;
    }
}

// ============================================================
// RENDERING — INFOS GÉNÉRALES
// ============================================================

function renderDate() {
    const date = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year:    'numeric',
        month:   'long',
        day:     'numeric',
    });
    const el = document.getElementById('currentDate');
    if (el) el.textContent = date.charAt(0).toUpperCase() + date.slice(1);
}

function renderStats(stats) {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('statCaJour',      formatMoney(stats.ca_jour || 0));
    setText('statTicketsJour', `${stats.tickets_jour || 0} ticket${(stats.tickets_jour || 0) > 1 ? 's' : ''}`);
    setText('statCaMois',      formatMoney(stats.ca_mois || 0));
    setText('statAnimaux',     stats.nb_animaux || 0);
    setText('statMedicaments', stats.nb_medicaments || 0);

    // Nom dans le titre
    const user = Storage.getUser();
    if (user) {
        const prenom = user.prenom || user.nom_complet?.split(' ')[0] || '';
        setText('welcomeName', prenom);
    }
}

// ============================================================
// RENDERING — ALERTES
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
        html += data.perimes.map(l => renderLotAlert(l, 'danger')).join('');
    }
    if (data.critiques?.length) {
        html += `<h4 class="alert-group-title warning">Expire dans 7 jours (${data.critiques.length})</h4>`;
        html += data.critiques.map(l => renderLotAlert(l, 'warning')).join('');
    }
    if (data.attention?.length) {
        html += `<h4 class="alert-group-title info">Expire dans 30 jours (${data.attention.length})</h4>`;
        html += data.attention.map(l => renderLotAlert(l, 'info')).join('');
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
// RENDERING — TABLEAUX
// ============================================================

function renderVentesRecentes(ventes) {
    const tbody = document.querySelector('#ventesRecentes tbody');
    if (!tbody) return;

    if (!ventes || ventes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">Aucune vente récente</td></tr>';
        return;
    }

    tbody.innerHTML = ventes.map(v => `
        <tr>
            <td><strong>${escapeHtml(v.numero_ticket)}</strong></td>
            <td>${escapeHtml(v.proprietaire)}</td>
            <td class="text-right">${formatMoney(v.montant_ttc)}</td>
            <td>${formatTime(v.date_heure)}</td>
        </tr>
    `).join('');
}

function renderTopMedicaments(top) {
    const tbody = document.querySelector('#topMedicaments tbody');
    if (!tbody) return;

    if (!top || top.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty">Aucune vente ce mois</td></tr>';
        return;
    }

    tbody.innerHTML = top.map(m => `
        <tr>
            <td>
                <strong>${escapeHtml(m.nom)}</strong><br>
                <small class="text-muted">${escapeHtml(m.code_cip)}</small>
            </td>
            <td class="text-right">${m.quantite_vendue}</td>
            <td class="text-right">${formatMoney(m.ca_total)}</td>
        </tr>
    `).join('');
}

// ============================================================
// GRAPHIQUES (Chart.js)
// ============================================================

/**
 * Configuration commune Chart.js.
 * ⚠️ Appelée uniquement si Chart est chargé.
 */
function setupChartDefaults() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#6b7280';
}

/**
 * Graphique 1 — CA des 7 derniers jours (courbe).
 */
function renderChartVentesSemaine(ventesSemaine) {
    if (typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chartVentesSemaine');
    if (!canvas) return;

    if (Charts.ventesSemaine) Charts.ventesSemaine.destroy();

    const labels = ventesSemaine.map(v => v.label || '—');
    const values = ventesSemaine.map(v => v.ca || 0);

    const ctx = canvas.getContext('2d');

    // Dégradé vert
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(5, 150, 105, 0.3)');
    gradient.addColorStop(1, 'rgba(5, 150, 105, 0.02)');

    Charts.ventesSemaine = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'CA TTC (BIF)',
                data: values,
                borderColor: '#059669',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#059669',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 12,
                    titleFont: { size: 13, weight: '600' },
                    bodyFont: { size: 12 },
                    callbacks: {
                        label: (context) => formatMoney(context.parsed.y),
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => {
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                            return value;
                        },
                    },
                    grid: { color: '#f3f4f6' },
                },
                x: {
                    grid: { display: false },
                },
            },
        },
    });
}

/**
 * Graphique 2 — Top 5 médicaments (barres horizontales).
 */
function renderChartTopMedicaments(topMedicaments) {
    if (typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chartTopMedicaments');
    if (!canvas) return;

    if (Charts.topMedicaments) Charts.topMedicaments.destroy();

    const top5 = (topMedicaments || []).slice(0, 5);

    // Si aucune donnée → message
    if (top5.length === 0) {
        canvas.parentElement.innerHTML = '<p class="empty">Aucune vente ce mois</p>';
        return;
    }

    const labels = top5.map(m => m.nom || '—');
    const values = top5.map(m => m.quantite_vendue || 0);

    Charts.topMedicaments = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Quantité vendue',
                data: values,
                backgroundColor: [
                    '#059669',
                    '#10b981',
                    '#34d399',
                    '#6ee7b7',
                    '#a7f3d0',
                ],
                borderRadius: 6,
                borderSkipped: false,
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
                    padding: 12,
                    callbacks: {
                        label: (context) => `${context.parsed.x} unités vendues`,
                    },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: '#f3f4f6' },
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        callback: function (value) {
                            const label = this.getLabelForValue(value);
                            return label.length > 20 ? label.slice(0, 18) + '…' : label;
                        },
                    },
                },
            },
        },
    });
}

/**
 * Graphique 3 — Répartition des paiements (doughnut).
 */
function renderChartPaiements(stats) {
    if (typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chartPaiements');
    if (!canvas) return;

    if (Charts.paiements) Charts.paiements.destroy();

    const especes = parseFloat(stats.total_especes || 0);
    const carte   = parseFloat(stats.total_carte || 0);
    const mobile  = parseFloat(stats.total_mobile_money || 0);
    const credit  = parseFloat(stats.total_credit || 0);

    const total = especes + carte + mobile + credit;

    if (total === 0) {
        canvas.parentElement.innerHTML = '<p class="empty">Aucun paiement enregistré</p>';
        return;
    }

    Charts.paiements = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Espèces', 'Carte', 'Mobile Money', 'Crédit'],
            datasets: [{
                data: [especes, carte, mobile, credit],
                backgroundColor: [
                    '#059669',
                    '#3b82f6',
                    '#8b5cf6',
                    '#f59e0b',
                ],
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
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'circle',
                    },
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 12,
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed;
                            const pct = ((value / total) * 100).toFixed(1);
                            return `${context.label} : ${formatMoney(value)} (${pct}%)`;
                        },
                    },
                },
            },
        },
    });
}

/**
 * Graphique 4 — État du stock (doughnut).
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
                backgroundColor: [
                    '#10b981',
                    '#dc2626',
                    '#f59e0b',
                ],
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
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'circle',
                    },
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 12,
                },
            },
        },
    });
}

// ============================================================
// HELPERS
// ============================================================

function formatMoney(value) {
    return new Intl.NumberFormat('fr-BI', {
        style: 'currency',
        currency: 'BIF',
        minimumFractionDigits: 0,
    }).format(value || 0);
}

function formatTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString('fr-FR', {
        hour:   '2-digit',
        minute: '2-digit',
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}