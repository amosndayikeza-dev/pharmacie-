/**
 * Logique du tableau de bord.
 *
 * ⚠️ Le layout (sidebar, header, footer) est géré par components.js + layout.js
 * Ce fichier ne contient QUE la logique du contenu du dashboard.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Date du jour dans le contenu
    renderDate();

    // 2. Charger le dashboard
    await loadDashboard();

    // 3. Bouton rafraîchir (spécifique au dashboard)
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboard);
    }
});

// ============================================================
// CHARGEMENT DES DONNÉES
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
        const data = response.data;

        renderStats(data.stats);
        renderAlertesStock(data.alertes_stock);
        renderAlertesPeremption(data.alertes_peremption);
        renderVentesRecentes(data.ventes_recentes);
        renderTopMedicaments(data.top_medicaments);

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
        Toast.error('Erreur de chargement : ' + error.message);
    } finally {
        if (loader) loader.hidden = true;
        if (btn)    btn.disabled = false;
    }
}

// ============================================================
// RENDERING
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
    document.getElementById('statCaJour').textContent = formatMoney(stats.ca_jour);
    document.getElementById('statTicketsJour').textContent =
        `${stats.tickets_jour} ticket${stats.tickets_jour > 1 ? 's' : ''}`;
    document.getElementById('statCaMois').textContent = formatMoney(stats.ca_mois);
    document.getElementById('statAnimaux').textContent = stats.nb_animaux;
    document.getElementById('statMedicaments').textContent = stats.nb_medicaments;

    // Nom dans le titre
    const user = Storage.getUser();
    if (user) {
        const prenom = user.prenom || user.nom_complet?.split(' ')[0] || '';
        const el = document.getElementById('welcomeName');
        if (el) el.textContent = prenom;
    }
}

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