/**
 * Logique de la page Ventes (historique + détail ticket).
 */

Guard.requireAuth();

const State = {
    ventes: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search: '',
        date:   '',
        statut: '',
    },
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadVentes();
    } catch (error) {
        console.error('[Ventes] Erreur init:', error);
    }
    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadVentes(page = 1) {
    const tbody = document.getElementById('ventesTbody');
    tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });
        if (State.filters.search) params.append('search', State.filters.search);
        if (State.filters.date)   params.append('date', State.filters.date);
        if (State.filters.statut) params.append('statut', State.filters.statut);

        const response = await Api.get(`/ventes?${params}`);
        State.ventes = response.data || [];
        State.pagination = response.meta || {};

        renderTable();
        renderPagination();
        updateStats();
    } catch (error) {
        const msg = error.status ? `[${error.status}] ${error.message}` : error.message;
        tbody.innerHTML = `<tr><td colspan="7" class="empty" style="color:var(--color-danger);padding:20px;text-align:center;">⚠️ ${escapeHtml(msg)}</td></tr>`;
        try { Toast.error(msg); } catch (e) {}
    }
}

// ============================================================
// STATS
// ============================================================

function updateStats() {
    const today = new Date().toDateString();
    let caJour = 0, ticketsJour = 0, total = 0, mois = 0, avoirs = 0;
    const now = new Date();

    State.ventes.forEach(v => {
        const montant = parseFloat(v.montant_total_ttc || 0);
        const date = new Date(v.date_heure);

        total++;

        if (date.toDateString() === today && v.statut === 'validee') {
            caJour += montant;
            ticketsJour++;
        }

        if (date.getMonth() === now.getMonth()
            && date.getFullYear() === now.getFullYear()
            && v.statut === 'validee') {
            mois += montant;
        }

        if (v.statut === 'avoir' || v.statut === 'annulee') avoirs++;
    });

    document.getElementById('statCaJour').textContent = formatMoney(caJour);
    document.getElementById('statTicketsJour').textContent = `${ticketsJour} ticket${ticketsJour > 1 ? 's' : ''}`;
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statMois').textContent = formatMoney(mois);
    document.getElementById('statAvoirs').textContent = avoirs;
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('ventesTbody');

    if (!State.ventes.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                        <p>Aucune vente trouvée</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const statutLabels = {
        validee:   { label: 'Payée',     class: 'badge-success' },
        partielle: { label: 'Partielle', class: 'badge-warning' },
        credit:    { label: 'Crédit',    class: 'badge-danger' },
        annulee:   { label: 'Annulée',   class: 'badge-neutral' },
        avoir:     { label: 'Avoir',     class: 'badge-info' },
    };

    tbody.innerHTML = State.ventes.map(v => {
        const st = statutLabels[v.statut] || { label: v.statut, class: 'badge-neutral' };

        const client = v.proprietaire
            ? (v.proprietaire.nom_complet || `${v.proprietaire.prenom || ''} ${v.proprietaire.nom || ''}`.trim())
            : 'Client anonyme';

        const animal = v.animal?.nom || '—';

        return `
            <tr>
                <td><code>${escapeHtml(v.numero_ticket)}</code></td>
                <td>${escapeHtml(client)}</td>
                <td>${escapeHtml(animal)}</td>
                <td>${formatDateTime(v.date_heure)}</td>
                <td class="text-right"><strong>${formatMoney(v.montant_total_ttc)}</strong></td>
                <td><span class="badge ${st.class}">${st.label}</span></td>
                <td class="text-right">
                    ${v.reste_a_payer > 0.01
                        ? `<strong style="color: #dc2626;">${formatMoney(v.reste_a_payer)}</strong>`
                        : '<span class="badge badge-success">✓ Payée</span>'}
                </td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="view" data-id="${v.id}" title="Voir le ticket">
                        <span data-icon="eye"></span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (Icons[name]) el.innerHTML = Icons[name];
    });

    attachRowListeners();
}

function attachRowListeners() {
    const tbody = document.getElementById('ventesTbody');
    tbody.removeEventListener('click', handleRowClick);
    tbody.addEventListener('click', handleRowClick);
}

function handleRowClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = parseInt(btn.getAttribute('data-id'), 10);
    if (id) showDetail(id);
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total ? `<div class="pagination-info">${total} vente${total > 1 ? 's' : ''}</div>` : '';
        return;
    }

    let html = '<div class="pagination">';
    html += `<button ${current_page === 1 ? 'disabled' : ''} onclick="goToPage(${current_page - 1})">‹</button>`;
    for (let i = 1; i <= last_page; i++) {
        if (i === 1 || i === last_page || Math.abs(i - current_page) <= 2) {
            html += `<button class="${i === current_page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (Math.abs(i - current_page) === 3) {
            html += `<button disabled>…</button>`;
        }
    }
    html += `<button ${current_page === last_page ? 'disabled' : ''} onclick="goToPage(${current_page + 1})">›</button>`;
    html += '</div>';
    html += `<div class="pagination-info">${total} vente${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;
    container.innerHTML = html;
}

function goToPage(page) {
    loadVentes(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// DÉTAIL D'UN TICKET
// ============================================================

async function showDetail(id) {
    const body = document.getElementById('detailBody');
    const numero = document.getElementById('detailNumero');

    body.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
    numero.textContent = '—';
    document.getElementById('detailModal').classList.add('open');

    try {
        const response = await Api.get(`/ventes/${id}`);
        const v = response.data;

        numero.textContent = v.numero_ticket || `#${v.id}`;

        const statutLabels = {
            validee: { label: 'Validée', class: 'badge-success' },
            annulee: { label: 'Annulée', class: 'badge-danger' },
            avoir:   { label: 'Avoir',   class: 'badge-warning' },
        };
        const st = statutLabels[v.statut] || { label: v.statut, class: 'badge-neutral' };

        const client = v.proprietaire
            ? (v.proprietaire.nom_complet || `${v.proprietaire.prenom || ''} ${v.proprietaire.nom || ''}`.trim())
            : 'Client anonyme';

        const lignes   = v.lignes || [];
        const paiements = v.paiements || [];

        body.innerHTML = `
            <!-- En-tête ticket -->
            <div class="ticket-header">
                <div>
                    <span class="detail-label">Ticket</span>
                    <span class="detail-value"><code>${escapeHtml(v.numero_ticket)}</code></span>
                </div>
                <div>
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${formatDateTime(v.date_heure)}</span>
                </div>
                <div>
                    <span class="detail-label">Statut</span>
                    <span class="detail-value"><span class="badge ${st.class}">${st.label}</span></span>
                </div>
            </div>

            <!-- Infos client -->
            <div class="ticket-info">
                <div>
                    <span class="detail-label">Client</span>
                    <span class="detail-value">${escapeHtml(client)}</span>
                </div>
                <div>
                    <span class="detail-label">Animal</span>
                    <span class="detail-value">${escapeHtml(v.animal?.nom || '—')}</span>
                </div>
                <div>
                    <span class="detail-label">Vendeur</span>
                    <span class="detail-value">
                        ${v.utilisateur ? escapeHtml(`${v.utilisateur.prenom || ''} ${v.utilisateur.nom || ''}`.trim()) : '—'}
                    </span>
                </div>
                ${v.ordonnance_id ? `
                    <div>
                        <span class="detail-label">Ordonnance</span>
                        <span class="detail-value">#${v.ordonnance_id}</span>
                    </div>
                ` : ''}
            </div>

            <!-- Lignes -->
            <h4 class="ticket-section-title">Détail des lignes</h4>
            <div class="table-wrapper" style="border: 1px solid var(--color-border); border-radius: 8px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Médicament</th>
                            <th class="text-right">Qté</th>
                            <th class="text-right">Prix unitaire</th>
                            <th class="text-right">Montant TTC</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lignes.length
                            ? lignes.map(l => `
                                <tr>
                                    <td><strong>${escapeHtml(l.medicament?.nom || '—')}</strong></td>
                                    <td class="text-right">${l.quantite}</td>
                                    <td class="text-right">${formatMoney(l.prix_vente_ttc_unitaire)}</td>
                                    <td class="text-right"><strong>${formatMoney(l.montant_ttc)}</strong></td>
                                </tr>
                            `).join('')
                            : '<tr><td colspan="4" class="empty">Aucune ligne</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" class="text-right"><strong>Total TTC :</strong></td>
                            <td class="text-right"><strong>${formatMoney(v.montant_total_ttc)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Paiements -->
            <h4 class="ticket-section-title" style="margin-top: 20px;">Paiements</h4>
            <div class="table-wrapper" style="border: 1px solid var(--color-border); border-radius: 8px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Mode</th>
                            <th>Référence</th>
                            <th class="text-right">Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paiements.length
                            ? paiements.map(p => `
                                <tr>
                                    <td><span class="badge badge-info">${escapeHtml(p.libelle || p.type)}</span></td>
                                    <td>${escapeHtml(p.reference_externe || '—')}</td>
                                    <td class="text-right"><strong>${formatMoney(p.montant)}</strong></td>
                                </tr>
                            `).join('')
                            : '<tr><td colspan="3" class="empty">Aucun paiement</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        body.innerHTML = `<p class="empty" style="color: var(--color-danger);">⚠️ ${escapeHtml(error.message)}</p>`;
    }
}

// ============================================================
// MODALS
// ============================================================

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    const safe = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    safe('detailCloseBtn', 'click', () => closeModal('detailModal'));
    safe('detailCloseBtn2', 'click', () => closeModal('detailModal'));
    safe('detailPrintBtn', 'click', () => window.print());

    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadVentes(1);
        }, 400);
    });

    safe('filterDate', 'change', (e) => {
        State.filters.date = e.target.value;
        loadVentes(1);
    });

    safe('filterStatut', 'change', (e) => {
        State.filters.statut = e.target.value;
        loadVentes(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', date: '', statut: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterDate').value = '';
        document.getElementById('filterStatut').value = '';
        loadVentes(1);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });
}

// ============================================================
// HELPERS
// ============================================================

function formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatMoney(value) {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('fr-BI', {
        style: 'currency', currency: 'BIF',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}