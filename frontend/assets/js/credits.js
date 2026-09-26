/**
 * ============================================================
 * LOGIQUE DE LA PAGE CRÉDITS CLIENTS
 * ============================================================
 *
 * Permet de :
 *   - Voir les dettes clients (crédits non soldés)
 *   - Encaisser un règlement (partiel ou total)
 *   - Suivre les statistiques (créances, total réglé, etc.)
 *
 * RÈGLES MÉTIER :
 *   - Seuls les paiements de type "credit" avec montant > 0 apparaissent
 *   - Un crédit soldé disparaît automatiquement de la liste
 *   - Tolérance flottante de 0.01 BIF pour éviter les erreurs d'arrondi
 */

// ============================================================
// SÉCURITÉ
// ============================================================
Guard.requireAuth();

// ============================================================
// ÉTAT DE LA PAGE
// ============================================================

const State = {
    credits: [],            // Liste complète des crédits
    filtered: [],           // Liste filtrée (recherche)
    reglementPaiementId: null,
    reglementReste: 0,
};

// ============================================================
// INITIALISATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadStats(), loadCredits()]);
    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

/**
 * Charge les statistiques globales des crédits.
 */
async function loadStats() {
    try {
        const response = await Api.get('/credits/stats');
        const s = response.data;

        document.getElementById('statCreances').textContent = formatMoney(s.creances_actuelles);
        document.getElementById('statRegle').textContent    = formatMoney(s.total_regle);
        document.getElementById('statClients').textContent  = s.clients_debiteurs;
        document.getElementById('statTotal').textContent    = formatMoney(s.total_credits);
    } catch (e) {
        console.warn('[Credits] Erreur stats:', e);
    }
}

/**
 * Charge la liste des crédits non soldés.
 */
async function loadCredits() {
    const tbody = document.getElementById('creditsTbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="empty">
                <div class="spinner" style="margin: 20px auto;"></div>
            </td>
        </tr>
    `;

    try {
        const response = await Api.get('/credits');
        State.credits = response.data || [];
        State.filtered = State.credits;
        renderTable();
    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty" style="color: var(--color-danger); padding: 20px; text-align: center;">
                    ⚠️ ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}

// ============================================================
// RENDU
// ============================================================

/**
 * Affiche le tableau des crédits.
 */
function renderTable() {
    const tbody = document.getElementById('creditsTbody');

    // Cas : aucun crédit
    if (!State.filtered.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    ✅ Aucune dette client pour le moment
                </td>
            </tr>
        `;
        return;
    }

    // Rendu des lignes
    tbody.innerHTML = State.filtered.map(c => `
        <tr>
            <td><code>${escapeHtml(c.numero_ticket || '—')}</code></td>
            <td><strong>${escapeHtml(c.client_nom)}</strong></td>
            <td>${escapeHtml(c.client_telephone || '—')}</td>
            <td>${formatDate(c.date_vente)}</td>
            <td class="text-right">${formatMoney(c.montant_initial)}</td>
            <td class="text-right">${formatMoney(c.montant_regle)}</td>
            <td class="text-right">
                <strong style="color: #f59e0b;">${formatMoney(c.reste_a_payer)}</strong>
            </td>
            <td class="text-right">
                <button class="btn btn-primary btn-sm"
                        data-action="regler"
                        data-paiement-id="${c.paiement_id}">
                    <span data-icon="money"></span>
                    Encaisser
                </button>
            </td>
        </tr>
    `).join('');

    // Réinjecter les icônes SVG
    tbody.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (Icons[name]) el.innerHTML = Icons[name];
    });

    // Attacher les listeners sur les boutons "Encaisser"
    tbody.querySelectorAll('[data-action="regler"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const paiementId = parseInt(btn.getAttribute('data-paiement-id'), 10);
            ouvrirReglement(paiementId);
        });
    });
}

// ============================================================
// RÈGLEMENT
// ============================================================

/**
 * Ouvre le modal de règlement pré-rempli avec le reste à payer exact.
 *
 * @param {number} paiementId
 */
function ouvrirReglement(paiementId) {
    const credit = State.credits.find(c => c.paiement_id === paiementId);
    if (!credit) return;

    State.reglementPaiementId = paiementId;

    // ⚠️ Arrondir à 2 décimales pour éviter les erreurs flottantes
    const reste = Math.round(parseFloat(credit.reste_a_payer || 0) * 100) / 100;
    State.reglementReste = reste;

    document.getElementById('reglementPaiementId').value = paiementId;
    document.getElementById('reglementClientNom').textContent = credit.client_nom;
    document.getElementById('reglementTicket').textContent = `Ticket ${credit.numero_ticket}`;
    document.getElementById('reglementReste').value = formatMoney(reste);

    // ⚠️ Champ montant : pré-rempli avec le reste exact + step="any"
    const montantInput = document.getElementById('reglementMontant');
    montantInput.value = reste;
    montantInput.max   = reste;
    montantInput.min   = 1;
    montantInput.step  = 'any';       // ← autorise n'importe quelle décimale

    document.getElementById('reglementNotes').value = '';

    document.getElementById('reglementModal').classList.add('open');
    montantInput.focus();
}

/**
 * Soumet le formulaire de règlement.
 */
async function submitReglement(e) {
    e.preventDefault();

    const paiementId = State.reglementPaiementId;

    // ⚠️ Arrondir à 2 décimales
    const montant = Math.round(
        parseFloat(document.getElementById('reglementMontant').value || 0) * 100
    ) / 100;

    const mode = document.getElementById('reglementMode').value;
    const notes = document.getElementById('reglementNotes').value.trim() || null;

    // Validation basique
    if (!montant || montant <= 0) {
        Toast.error('Montant invalide.');
        return;
    }

    // ⚠️ Vérification avec tolérance de 0.01 (évite les erreurs flottantes)
    if (montant > State.reglementReste + 0.01) {
        Toast.error(
            `Le montant ne peut pas dépasser ${formatMoney(State.reglementReste)}.`
        );
        return;
    }

    const btn = document.getElementById('reglementSubmitBtn');
    btn.disabled = true;

    try {
        const response = await Api.post(`/credits/${paiementId}/regler`, {
            montant,
            mode,
            notes,
        });

        Toast.success(response.message || 'Règlement enregistré.');

        if (response.solde) {
            Toast.info('Crédit entièrement soldé.');
        }

        closeModal('reglementModal');
        await Promise.all([loadStats(), loadCredits()]);
    } catch (error) {
        Toast.error(error.message);
    } finally {
        btn.disabled = false;
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

    // Modal règlement
    safe('reglementCloseBtn',  'click', () => closeModal('reglementModal'));
    safe('reglementCancelBtn', 'click', () => closeModal('reglementModal'));
    safe('reglementForm',      'submit', submitReglement);

    // Rafraîchir
    safe('refreshBtn', 'click', () => Promise.all([loadStats(), loadCredits()]));

    // Recherche
    safe('searchInput', 'input', (e) => {
        const q = e.target.value.toLowerCase().trim();

        State.filtered = !q
            ? State.credits
            : State.credits.filter(c =>
                (c.client_nom || '').toLowerCase().includes(q) ||
                (c.numero_ticket || '').toLowerCase().includes(q) ||
                (c.client_telephone || '').includes(q)
            );

        renderTable();
    });

    // Fermer un modal si clic sur l'overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Formate un montant en BIF.
 */
function formatMoney(value) {
    return new Intl.NumberFormat('fr-BI', {
        style: 'currency',
        currency: 'BIF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value || 0);
}

/**
 * Formate une date ISO en JJ/MM/AAAA.
 */
function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

/**
 * Échappe le HTML pour éviter les injections XSS.
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}