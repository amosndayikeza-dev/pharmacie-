/**
 * Logique de la caisse — Point de vente.
 *
 * Fonctionnement :
 *  1. Recherche/scan des médicaments
 *  2. Ajout au panier
 *  3. Sélection client (optionnel)
 *  4. Encaissement multi-paiement
 *  5. Enregistrement de la vente (FEFO côté backend)
 */

Guard.requireAuth();

// === État ===
const State = {
    medicaments: [],        // Cache des médicaments
    proprietaires: [],
    animaux: [],
    panier: [],             // [{medicament_id, nom, prix_ttc, quantite, stock_dispo}]
    paiements: [],          // [{type, montant}]
    searchTimeout: null,
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([loadMedicaments(), loadProprietaires()]);
    } catch (e) {
        console.warn('[Caisse] Erreur chargement listes', e);
    }

    // Préparer les lignes de paiement par défaut
    initialiserPaiements();

    setupEventListeners();
    document.getElementById('searchMedicament').focus();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadMedicaments() {
    const response = await Api.get('/medicaments?per_page=500&actif=true');
    State.medicaments = response.data || [];
    // Le stock disponible sera récupéré à la demande via /lots/fefo/{id}
}

async function loadProprietaires() {
    const response = await Api.get('/proprietaires?per_page=300');
    State.proprietaires = response.data || [];

    const select = document.getElementById('proprietaireId');
    State.proprietaires.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nom_complet || `${p.prenom || ''} ${p.nom}`.trim();
        select.appendChild(opt);
    });
}

async function loadAnimauxDuProprietaire(proprietaireId) {
    if (!proprietaireId) {
        State.animaux = [];
        document.getElementById('animalField').style.display = 'none';
        return;
    }

    try {
        const response = await Api.get(`/animaux?proprietaire_id=${proprietaireId}&per_page=100`);
        State.animaux = response.data || [];

        const select = document.getElementById('animalId');
        while (select.options.length > 1) select.remove(1);

        State.animaux.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = `${a.nom || 'Animal'} (${a.espece?.nom || '—'})`;
            select.appendChild(opt);
        });

        document.getElementById('animalField').style.display = State.animaux.length ? 'block' : 'none';
    } catch (e) {
        console.warn('loadAnimauxDuProprietaire', e);
    }
}

// ============================================================
// RECHERCHE
// ============================================================

function rechercherMedicaments(query) {
    const q = query.toLowerCase().trim();

    if (!q) return [];

    return State.medicaments
        .filter(m => {
            const nom = (m.nom || '').toLowerCase();
            const cip = (m.code_cip || '').toLowerCase();
            const barre = (m.code_barre || '').toLowerCase();
            const dci = (m.denomination_commune || '').toLowerCase();

            return nom.includes(q) || cip.includes(q) || barre.includes(q) || dci.includes(q);
        })
        .slice(0, 10);
}

function afficherResultats(resultats) {
    const container = document.getElementById('searchResults');

    if (!resultats.length) {
        container.hidden = true;
        return;
    }

    container.hidden = false;
    container.innerHTML = resultats.map(m => `
        <div class="search-result-item" data-id="${m.id}">
            <div>
                <strong>${escapeHtml(m.nom)}</strong>
                <small>${escapeHtml(m.code_cip)} ${m.denomination_commune ? '· ' + escapeHtml(m.denomination_commune) : ''}</small>
            </div>
            <div class="search-result-price">
                ${formatMoney(m.prix_vente_ttc_reference)}
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.getAttribute('data-id'), 10);
            ajouterAuPanier(id);
            document.getElementById('searchMedicament').value = '';
            container.hidden = true;
        });
    });
}

// ============================================================
// PANIER
// ============================================================

function ajouterAuPanier(medicamentId) {
    const med = State.medicaments.find(m => m.id === medicamentId);
    if (!med) {
        Toast.error('Médicament introuvable');
        return;
    }

    const existant = State.panier.find(l => l.medicament_id === medicamentId);
    if (existant) {
        existant.quantite++;
    } else {
        State.panier.push({
            medicament_id: medicamentId,
            nom: med.nom,
            prix_ttc: parseFloat(med.prix_vente_ttc_reference),
            quantite: 1,
        });
    }

    renderPanier();
    updateTotaux();
    Toast.success(`${med.nom} ajouté`);
}

function retirerDuPanier(index) {
    State.panier.splice(index, 1);
    renderPanier();
    updateTotaux();
}

function modifierQuantite(index, quantite) {
    if (quantite < 1) return;
    State.panier[index].quantite = quantite;
    renderPanier();
    updateTotaux();
}

function viderPanier() {
    if (!State.panier.length) return;
    if (!confirm('Vider le panier ?')) return;

    State.panier = [];
    renderPanier();
    updateTotaux();
    Toast.info('Panier vidé');
}

function renderPanier() {
    const container = document.getElementById('panierBody');
    const nbArticles = State.panier.reduce((s, l) => s + l.quantite, 0);

    document.getElementById('nbArticles').textContent = nbArticles;

    if (!State.panier.length) {
        container.innerHTML = `
            <div class="panier-empty">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="icon"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                <p>Le panier est vide</p>
                <small>Recherchez un médicament pour commencer</small>
            </div>
        `;
        return;
    }

    container.innerHTML = State.panier.map((l, idx) => `
        <div class="panier-ligne">
            <div class="panier-ligne-info">
                <strong>${escapeHtml(l.nom)}</strong>
                <small>${formatMoney(l.prix_ttc)} × ${l.quantite}</small>
            </div>

            <div class="panier-ligne-qte">
                <button type="button" class="qte-btn" onclick="modifierQuantite(${idx}, ${l.quantite - 1})" ${l.quantite <= 1 ? 'disabled' : ''}>−</button>
                <input type="number" value="${l.quantite}" min="1"
                       onchange="modifierQuantite(${idx}, parseInt(this.value) || 1)">
                <button type="button" class="qte-btn" onclick="modifierQuantite(${idx}, ${l.quantite + 1})">+</button>
            </div>

            <div class="panier-ligne-total">
                ${formatMoney(l.prix_ttc * l.quantite)}
            </div>

            <button type="button" class="btn btn-ghost btn-icon panier-ligne-del"
                    onclick="retirerDuPanier(${idx})" title="Retirer">
                <span data-icon="trash"></span>
            </button>
        </div>
    `).join('');

    // Réinjecter les icônes
    container.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (Icons[name]) el.innerHTML = Icons[name];
    });
}

// ============================================================
// TOTAUX
// ============================================================

function updateTotaux() {
    const nbArticles = State.panier.reduce((s, l) => s + l.quantite, 0);
    const totalTtc   = State.panier.reduce((s, l) => s + (l.prix_ttc * l.quantite), 0);

    // Hypothèse : TVA 0% (à adapter selon ta config)
    const totalHt  = totalTtc;
    const totalTva = 0;

    document.getElementById('totalArticles').textContent = nbArticles;
    document.getElementById('totalHt').textContent  = formatMoney(totalHt);
    document.getElementById('totalTva').textContent = formatMoney(totalTva);
    document.getElementById('totalTtc').textContent = formatMoney(totalTtc);
    document.getElementById('btnTotal').textContent = formatMoney(totalTtc);

    // Activer/désactiver le bouton valider
    document.getElementById('validerVenteBtn').disabled = !State.panier.length;

    // Mettre à jour le modal paiement
    document.getElementById('paiementTotal').textContent = formatMoney(totalTtc);
    updatePaiementReste();
}

// ============================================================
// PAIEMENT
// ============================================================

function initialiserPaiements() {
    State.paiements = [
        { type: 'especes',      montant: 0 },
        { type: 'carte',        montant: 0 },
        { type: 'mobile_money', montant: 0 },
        { type: 'credit',       montant: 0 },
    ];
    renderPaiements();
}

function renderPaiements() {
    const container = document.getElementById('paiementLignes');

    const libelles = {
        especes:      '💵 Espèces',
        carte:        '💳 Carte bancaire',
        mobile_money: '📱 Mobile Money',
        credit:       '📝 Crédit',
    };

    container.innerHTML = State.paiements.map((p, idx) => `
        <div class="paiement-ligne">
            <label>${libelles[p.type]}</label>
            <input type="number" min="0" step="100"
                   value="${p.montant || ''}"
                   placeholder="0"
                   onchange="modifierPaiement(${idx}, parseFloat(this.value) || 0)">
        </div>
    `).join('');
}

function modifierPaiement(index, montant) {
    State.paiements[index].montant = montant;
    updatePaiementReste();
}

function updatePaiementReste() {
    const totalTtc = State.panier.reduce((s, l) => s + (l.prix_ttc * l.quantite), 0);
    const totalPaye = State.paiements.reduce((s, p) => s + (p.montant || 0), 0);
    const reste = totalTtc - totalPaye;

    const resteEl = document.getElementById('paiementReste');
    resteEl.textContent = formatMoney(reste);
    resteEl.style.color = reste <= 0 ? 'var(--color-success)' : 'var(--color-danger)';

    document.getElementById('paiementValiderBtn').disabled = reste > 0;
}

// ============================================================
// VALIDATION DE LA VENTE
// ============================================================

async function validerVente() {
    if (!State.panier.length) return;

    // Ouvrir le modal de paiement
    updatePaiementReste();
    document.getElementById('paiementModal').classList.add('open');
}

async function encaisser() {
    const btn = document.getElementById('paiementValiderBtn');
    btn.disabled = true;

    const totalTtc = State.panier.reduce((s, l) => s + (l.prix_ttc * l.quantite), 0);
    const paiementsActifs = State.paiements.filter(p => p.montant > 0);

    const data = {
        proprietaire_id: document.getElementById('proprietaireId').value
                            ? parseInt(document.getElementById('proprietaireId').value, 10)
                            : null,
        animal_id:       document.getElementById('animalId').value
                            ? parseInt(document.getElementById('animalId').value, 10)
                            : null,
        ordonnance_id:   null,
        montant_total_ht:  totalTtc,
        montant_total_tva: 0,
        montant_total_ttc: totalTtc,
        montant_remise:    0,
        lignes: State.panier.map(l => ({
            medicament_id: l.medicament_id,
            quantite:      l.quantite,
        })),
        paiements: paiementsActifs,
    };

    console.log('[Caisse] Payload vente :', JSON.stringify(data, null, 2));

    try {
        const response = await Api.post('/ventes', data);

        // Succès
        closeModal('paiementModal');
        document.getElementById('succesNumero').textContent = response.data?.numero_ticket || '—';
        document.getElementById('succesTotal').textContent = formatMoney(response.data?.montant_total_ttc || totalTtc);
        document.getElementById('succesModal').classList.add('open');

        Toast.success('Vente enregistrée avec succès !');
    } catch (error) {
        console.error('Erreur vente:', error);

        if (error.errors) {
            const msg = Object.entries(error.errors)
                .map(([field, msgs]) => `${field} : ${msgs[0]}`)
                .join('\n');
            Toast.error('Erreur de validation :\n' + msg, 8000);
        } else {
            Toast.error(error.message || 'Erreur lors de l\'enregistrement');
        }
    } finally {
        btn.disabled = false;
    }
}

function reinitialiserCaisse() {
    State.panier = [];
    State.paiements.forEach(p => p.montant = 0);
    document.getElementById('proprietaireId').value = '';
    document.getElementById('animalId').value = '';
    document.getElementById('animalField').style.display = 'none';

    renderPanier();
    updateTotaux();
    renderPaiements();

    closeModal('succesModal');
    document.getElementById('searchMedicament').focus();
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

    // Recherche médicament
    const searchInput = document.getElementById('searchMedicament');
    searchInput.addEventListener('input', (e) => {
        clearTimeout(State.searchTimeout);
        State.searchTimeout = setTimeout(() => {
            const resultats = rechercherMedicaments(e.target.value);
            afficherResultats(resultats);
        }, 200);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const resultats = rechercherMedicaments(e.target.value);
            if (resultats.length === 1) {
                ajouterAuPanier(resultats[0].id);
                searchInput.value = '';
                document.getElementById('searchResults').hidden = true;
            } else if (resultats.length > 1) {
                afficherResultats(resultats);
            }
        }
        if (e.key === 'Escape') {
            document.getElementById('searchResults').hidden = true;
        }
    });

    // Fermer résultats si clic ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.caisse-search-box')) {
            document.getElementById('searchResults').hidden = true;
        }
    });

    // Client / Animal
    safe('proprietaireId', 'change', (e) => {
        loadAnimauxDuProprietaire(e.target.value);
    });

    safe('nouveauClientBtn', 'click', () => {
        window.location.href = 'proprietaires.html';
    });

    // Panier
    safe('viderPanierBtn', 'click', viderPanier);
    safe('validerVenteBtn', 'click', validerVente);

    // Paiement
    safe('paiementCloseBtn', 'click', () => closeModal('paiementModal'));
    safe('paiementCancelBtn', 'click', () => closeModal('paiementModal'));
    safe('paiementValiderBtn', 'click', encaisser);

    // Succès
    safe('succesCloseBtn', 'click', () => closeModal('succesModal'));
    safe('succesNouveauBtn', 'click', reinitialiserCaisse);
}

// ============================================================
// HELPERS
// ============================================================

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