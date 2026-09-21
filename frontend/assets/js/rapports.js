/**
 * Logique de la page Rapports.
 *
 * Gère :
 *  - Chargement auto des rapports (avec génération si 404)
 *  - Onglets de période (jour / hebdo / mensuel / annuel / custom)
 *  - Stats, top médicament, répartition paiements
 */

Guard.requireAuth();

const State = {
    period: 'jour',
    dateDebut: null,
    dateFin: null,
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
    // Par défaut : aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    State.dateDebut = today;
    State.dateFin = today;

    // ⚠️ Générer les rapports AVANT de charger (idempotent côté backend)
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
    const loader = document.getElementById('loader');
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
        const data = response.data;

        renderRapport(data, response.meta);
        content.hidden = false;
    } catch (error) {
        // Cas 404 : pas encore de rapport → générer puis réessayer
        if (error.status === 404 && period === 'jour') {
            console.log('[Rapports] Aucun rapport pour cette date, génération...');

            try {
                await Api.post('/rapports/generer');
                const date = dateDebut || new Date().toISOString().split('T')[0];
                const retry = await Api.get(`/rapports/${date}`);
                renderRapport(retry.data, retry.meta);
                content.hidden = false;
                Toast.info('Rapport généré automatiquement.');
                return;
            } catch (retryError) {
                console.warn('[Rapports] Échec après génération :', retryError);
                showEmptyState();
                return;
            }
        }

        // Autres erreurs (500, 401, réseau...)
        const msg = error.status ? `[${error.status}] ${error.message}` : error.message;
        console.error('[Rapports]', error);
        Toast.error('Erreur de chargement : ' + msg);
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

    // Si c'est un tableau (hebdo/mensuel/annuel), on agrège
    if (Array.isArray(data)) {
        stats = agregerRapports(data);
        periodLabelText = labelPeriode(State.period, data);
    } else if (data === null || data === undefined) {
        // Pas de rapport
        showEmptyState();
        return;
    } else {
        stats = data;
        periodLabelText = labelPeriode(State.period, stats?.date_reference);
    }

    document.getElementById('periodLabel').textContent = periodLabelText;

    // Cartes stats
    const totalTtc = parseFloat(stats.total_ca_ttc || 0);
    const totalHt  = parseFloat(stats.total_ca_ht  || 0);
    const totalMarge = parseFloat(stats.total_marge_brute_ttc || 0);
    const nbTickets = parseInt(stats.nb_tickets || 0);
    const nbClients = parseInt(stats.nb_clients_uniques || 0);
    const panierMoyen = parseFloat(stats.panier_moyen || 0);

    document.getElementById('statCaTtc').textContent = formatMoney(totalTtc);
    document.getElementById('statCaHt').textContent  = `HT : ${formatMoney(totalHt)}`;
    document.getElementById('statMarge').textContent = formatMoney(totalMarge);

    const margePct = totalTtc > 0
        ? ((totalMarge / totalTtc) * 100).toFixed(1) + '%'
        : '—';
    document.getElementById('statMargePct').textContent = `Soit ${margePct} du CA`;

    document.getElementById('statTickets').textContent = nbTickets;
    document.getElementById('statClients').textContent = `${nbClients} client(s) unique(s)`;

    document.getElementById('statPanier').textContent = formatMoney(panierMoyen);

    // Top médicament
    renderTopMedicament(stats);

    // Répartition paiements
    renderRepartitionPaiements(stats);
}

function agregerRapports(rapports) {
    const agg = {
        total_ca_ht: 0, total_ca_tva: 0, total_ca_ttc: 0,
        total_marge_brute_ttc: 0,
        nb_tickets: 0, nb_clients_uniques: 0,
        total_especes: 0, total_carte: 0, total_mobile_money: 0, total_credit: 0,
    };

    rapports.forEach(r => {
        agg.total_ca_ht           += parseFloat(r.total_ca_ht || 0);
        agg.total_ca_tva          += parseFloat(r.total_ca_tva || 0);
        agg.total_ca_ttc          += parseFloat(r.total_ca_ttc || 0);
        agg.total_marge_brute_ttc += parseFloat(r.total_marge_brute_ttc || 0);
        agg.nb_tickets            += parseInt(r.nb_tickets || 0);
        agg.nb_clients_uniques    += parseInt(r.nb_clients_uniques || 0);
        agg.total_especes         += parseFloat(r.total_especes || 0);
        agg.total_carte           += parseFloat(r.total_carte || 0);
        agg.total_mobile_money    += parseFloat(r.total_mobile_money || 0);
        agg.total_credit          += parseFloat(r.total_credit || 0);
    });

    agg.panier_moyen = agg.nb_tickets > 0
        ? agg.total_ca_ttc / agg.nb_tickets
        : 0;

    // Top médicament : premier trouvé
    const firstWithTop = rapports.find(r => r.top_medicament);
    if (firstWithTop) {
        agg.top_medicament = firstWithTop.top_medicament;
    }

    return agg;
}

function renderTopMedicament(stats) {
    const container = document.getElementById('topMedicamentCard');

    if (!stats.top_medicament) {
        container.innerHTML = `<p class="empty">Aucune vente sur la période</p>`;
        return;
    }

    const tm = stats.top_medicament;

    container.innerHTML = `
        <div class="top-medicament">
            <div class="top-med-rank">🏆</div>
            <div class="top-med-info">
                <strong>${escapeHtml(tm.nom || '—')}</strong>
                <small>${escapeHtml(tm.code_cip || '')}</small>
            </div>
            <div class="top-med-qte">
                <strong>${tm.quantite_vendue || stats.top_medicament_quantite || 0}</strong>
                <small>vendus</small>
            </div>
        </div>
    `;
}

function renderRepartitionPaiements(stats) {
    const container = document.getElementById('repartitionPaiements');

    const repartition = [
        { label: 'Espèces',      value: parseFloat(stats.total_especes || 0),      icon: '💵', color: '#059669' },
        { label: 'Carte',        value: parseFloat(stats.total_carte || 0),        icon: '💳', color: '#3b82f6' },
        { label: 'Mobile Money', value: parseFloat(stats.total_mobile_money || 0), icon: '📱', color: '#8b5cf6' },
        { label: 'Crédit',       value: parseFloat(stats.total_credit || 0),       icon: '📝', color: '#f59e0b' },
    ];

    const total = repartition.reduce((s, r) => s + r.value, 0);

    if (total === 0) {
        container.innerHTML = `<p class="empty">Aucun paiement sur la période</p>`;
    } else {
        container.innerHTML = repartition.map(r => {
            const pct = total > 0 ? (r.value / total) * 100 : 0;

            return `
                <div class="repartition-ligne">
                    <div class="repartition-label">
                        <span>${r.icon}</span>
                        <span>${r.label}</span>
                        <strong>${formatMoney(r.value)}</strong>
                    </div>
                    <div class="repartition-bar">
                        <div class="repartition-bar-fill" style="width: ${pct}%; background: ${r.color};"></div>
                    </div>
                    <div class="repartition-pct">${pct.toFixed(1)}%</div>
                </div>
            `;
        }).join('');
    }

    // Détails chiffrés (3 cartes en bas)
    document.getElementById('detailEspeces').innerHTML = formatBigMoney(stats.total_especes || 0);
    document.getElementById('detailCarte').innerHTML   = formatBigMoney(stats.total_carte || 0);
    document.getElementById('detailMobile').innerHTML  = formatBigMoney(stats.total_mobile_money || 0);
}

/**
 * Affiche un état vide quand le rapport n'existe pas.
 */
function showEmptyState() {
    const content = document.getElementById('content');

    // Cartes stats à zéro
    document.getElementById('statCaTtc').textContent = formatMoney(0);
    document.getElementById('statCaHt').textContent  = `HT : ${formatMoney(0)}`;
    document.getElementById('statMarge').textContent = formatMoney(0);
    document.getElementById('statMargePct').textContent = 'Aucune donnée';
    document.getElementById('statTickets').textContent = '0';
    document.getElementById('statClients').textContent = '0 client(s) unique(s)';
    document.getElementById('statPanier').textContent = formatMoney(0);

    // Sections vides
    document.getElementById('topMedicamentCard').innerHTML =
        `<p class="empty">Aucune vente sur la période</p>`;

    document.getElementById('repartitionPaiements').innerHTML =
        `<p class="empty">Aucun paiement sur la période</p>`;

    document.getElementById('detailEspeces').innerHTML = formatBigMoney(0);
    document.getElementById('detailCarte').innerHTML   = formatBigMoney(0);
    document.getElementById('detailMobile').innerHTML  = formatBigMoney(0);

    document.getElementById('periodLabel').textContent = 'Aucun rapport disponible pour cette période';

    content.hidden = false;
}

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
            const debut = Array.isArray(extra) && extra.length > 0
                ? extra[0].date_reference
                : null;
            const fin = Array.isArray(extra) && extra.length > 0
                ? extra[extra.length - 1].date_reference
                : null;
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

    // Générer rapports
    const genererBtn = document.getElementById('genererBtn');
    if (genererBtn) {
        genererBtn.addEventListener('click', genererRapports);
    }
}

// ============================================================
// HELPERS
// ============================================================

function formatMoney(value) {
    const num = parseFloat(value || 0);
    return new Intl.NumberFormat('fr-BI', {
        style: 'currency', currency: 'BIF',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(num);
}

function formatBigMoney(value) {
    return `<div style="font-size: 1.5rem; font-weight: 700; color: var(--color-primary-dark);">${formatMoney(value)}</div>`;
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