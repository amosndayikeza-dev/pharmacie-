/**
 * ============================================================
 * LOGIQUE DE LA CAISSE — POINT DE VENTE
 * ============================================================
 *
 * FONCTIONNEMENT :
 *   1. Recherche / scan d'un médicament
 *   2. Ajout au panier (avec quantité ajustable)
 *   3. Sélection client (propriétaire + animal, optionnel)
 *   4. Encaissement (ESPÈCES + CRÉDIT uniquement)
 *   5. Enregistrement de la vente (FEFO côté backend)
 *
 * MODES DE PAIEMENT :
 *   - Espèces : montant payé immédiatement
 *   - Crédit  : le reste dû (dette client)
 *
 * RÈGLE MÉTIER :
 *   Si le client ne paie pas la totalité, il DOIT être identifié
 *   (propriétaire obligatoire) pour tracer la dette.
 *
 * ⚠️ Insert-only : une vente ne peut pas être modifiée ni supprimée.
 *    En cas d'erreur → créer un AVOIR (à implémenter plus tard).
 */

// ============================================================
// SÉCURITÉ : Vérifier que l'utilisateur est connecté
// ============================================================
Guard.requireAuth();

// ============================================================
// ÉTAT DE LA PAGE
// ============================================================

const State = {
    /** @type {Array} Cache de tous les médicaments actifs */
    medicaments: [],

    /** @type {Array} Cache de tous les propriétaires */
    proprietaires: [],

    /** @type {Array} Animaux du propriétaire sélectionné */
    animaux: [],

    /**
     * Panier en cours.
     * @type {Array<{medicament_id: number, nom: string, prix_ttc: number, quantite: number}>}
     */
    panier: [],

    /** @type {number} Montant payé en espèces (saisi par le vendeur) */
    montantPaye: 0,

    /** @type {number|null} Timer pour le debounce de la recherche */
    searchTimeout: null,
};

// ============================================================
// INITIALISATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Charger les données de référence
    try {
        await Promise.all([loadMedicaments(), loadProprietaires()]);
    } catch (e) {
        console.warn('[Caisse] Erreur chargement listes', e);
    }

    // 2. Brancher les événements
    setupEventListeners();

    // 3. Focus automatique sur la recherche
    document.getElementById('searchMedicament')?.focus();
});

// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================

/**
 * Charge tous les médicaments actifs dans le cache.
 * Le stock disponible sera récupéré à la demande (FEFO côté backend).
 */
async function loadMedicaments() {
    const response = await Api.get('/medicaments?per_page=500&actif=true');
    State.medicaments = response.data || [];
}

/**
 * Charge tous les propriétaires et remplit le <select>.
 */
async function loadProprietaires() {
    const response = await Api.get('/proprietaires?per_page=300');
    State.proprietaires = response.data || [];

    const select = document.getElementById('proprietaireId');
    if (!select) return;

    State.proprietaires.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nom_complet || `${p.prenom || ''} ${p.nom || ''}`.trim();
        select.appendChild(opt);
    });
}

/**
 * Charge les animaux d'un propriétaire donné (ou vide la liste si aucun).
 *
 * @param {string|number} proprietaireId
 */
async function loadAnimauxDuProprietaire(proprietaireId) {
    const animalField = document.getElementById('animalField');

    if (!proprietaireId) {
        State.animaux = [];
        if (animalField) animalField.style.display = 'none';
        return;
    }

    try {
        const response = await Api.get(`/animaux?proprietaire_id=${proprietaireId}&per_page=100`);
        State.animaux = response.data || [];

        const select = document.getElementById('animalId');
        if (!select) return;

        // Vider sauf la première option
        while (select.options.length > 1) select.remove(1);

        State.animaux.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = `${a.nom || 'Animal'} (${a.espece?.nom || '—'})`;
            select.appendChild(opt);
        });

        if (animalField) {
            animalField.style.display = State.animaux.length ? 'block' : 'none';
        }
    } catch (e) {
        console.warn('[Caisse] loadAnimauxDuProprietaire', e);
    }
}

// ============================================================
// RECHERCHE DE MÉDICAMENTS
// ============================================================

/**
 * Recherche les médicaments correspondant à la requête (nom, CIP, code-barre, DCI).
 *
 * @param {string} query
 * @returns {Array}
 */
function rechercherMedicaments(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    return State.medicaments
        .filter(m => {
            const nom   = (m.nom || '').toLowerCase();
            const cip   = (m.code_cip || '').toLowerCase();
            const barre = (m.code_barre || '').toLowerCase();
            const dci   = (m.denomination_commune || '').toLowerCase();

            return nom.includes(q) || cip.includes(q) || barre.includes(q) || dci.includes(q);
        })
        .slice(0, 10);
}

/**
 * Affiche les résultats de recherche dans le dropdown.
 *
 * @param {Array} resultats
 */
function afficherResultats(resultats) {
    const container = document.getElementById('searchResults');
    if (!container) return;

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

    // Brancher les clics
    container.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.getAttribute('data-id'), 10);
            ajouterAuPanier(id);

            const input = document.getElementById('searchMedicament');
            if (input) input.value = '';
            container.hidden = true;
        });
    });
}

// ============================================================
// PANIER
// ============================================================

/**
 * Ajoute un médicament au panier (ou incrémente la quantité).
 *
 * @param {number} medicamentId
 */
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
            nom:           med.nom,
            prix_ttc:      parseFloat(med.prix_vente_ttc_reference),
            quantite:      1,
        });
    }

    renderPanier();
    updateTotaux();
    Toast.success(`${med.nom} ajouté`);
}

/**
 * Retire un article du panier.
 *
 * @param {number} index
 */
function retirerDuPanier(index) {
    State.panier.splice(index, 1);
    renderPanier();
    updateTotaux();
}

/**
 * Modifie la quantité d'un article du panier.
 *
 * @param {number} index
 * @param {number} quantite
 */
function modifierQuantite(index, quantite) {
    if (quantite < 1) return;
    State.panier[index].quantite = quantite;
    renderPanier();
    updateTotaux();
}

/**
 * Vide complètement le panier (avec confirmation).
 */
function viderPanier() {
    if (!State.panier.length) return;
    if (!confirm('Vider le panier ?')) return;

    State.panier = [];
    renderPanier();
    updateTotaux();
    Toast.info('Panier vidé');
}

/**
 * Affiche le contenu du panier.
 */
function renderPanier() {
    const container = document.getElementById('panierBody');
    if (!container) return;

    const nbArticles = State.panier.reduce((s, l) => s + l.quantite, 0);
    const nbEl = document.getElementById('nbArticles');
    if (nbEl) nbEl.textContent = nbArticles;

    // Panier vide
    if (!State.panier.length) {
        container.innerHTML = `
            <div class="panier-empty">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="icon">
                    <circle cx="8" cy="21" r="1"/>
                    <circle cx="19" cy="21" r="1"/>
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                </svg>
                <p>Le panier est vide</p>
                <small>Recherchez un médicament pour commencer</small>
            </div>
        `;
        return;
    }

    // Lignes du panier
    container.innerHTML = State.panier.map((l, idx) => `
        <div class="panier-ligne">
            <div class="panier-ligne-info">
                <strong>${escapeHtml(l.nom)}</strong>
                <small>${formatMoney(l.prix_ttc)} × ${l.quantite}</small>
            </div>

            <div class="panier-ligne-qte">
                <button type="button" class="qte-btn"
                        onclick="modifierQuantite(${idx}, ${l.quantite - 1})"
                        ${l.quantite <= 1 ? 'disabled' : ''}>−</button>
                <input type="number" value="${l.quantite}" min="1"
                       onchange="modifierQuantite(${idx}, parseInt(this.value) || 1)">
                <button type="button" class="qte-btn"
                        onclick="modifierQuantite(${idx}, ${l.quantite + 1})">+</button>
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

    // Réinjecter les icônes SVG
    container.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (Icons[name]) el.innerHTML = Icons[name];
    });
}

// ============================================================
// TOTAUX
// ============================================================

/**
 * Recalcule et affiche les totaux de la vente.
 * Met aussi à jour le résumé du modal de paiement.
 */
function updateTotaux() {
    const nbArticles = State.panier.reduce((s, l) => s + l.quantite, 0);
    const totalTtc   = State.panier.reduce((s, l) => s + (l.prix_ttc * l.quantite), 0);

    // Hypothèse : TVA 0% (à adapter si besoin)
    const totalHt  = totalTtc;
    const totalTva = 0;

    // Mise à jour des affichages
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('totalArticles', nbArticles);
    setText('totalHt',       formatMoney(totalHt));
    setText('totalTva',      formatMoney(totalTva));
    setText('totalTtc',      formatMoney(totalTtc));
    setText('btnTotal',      formatMoney(totalTtc));
    setText('paiementTotal', formatMoney(totalTtc));

    // Bouton "Valider la vente" : actif seulement si panier non vide
    const validerBtn = document.getElementById('validerVenteBtn');
    if (validerBtn) validerBtn.disabled = !State.panier.length;

    // Mettre à jour le résumé du modal paiement
    updatePaiementResume();
}

// ============================================================
// PAIEMENT (ESPÈCES / CRÉDIT)
// ============================================================

/**
 * Met à jour le résumé du paiement dans le modal :
 *   - Payé en espèces
 *   - Reste à crédit
 *   - Bouton "Valider la vente" activé/désactivé
 */
function updatePaiementResume() {
    const totalTtc = State.panier.reduce((s, l) => s + (l.prix_ttc * l.quantite), 0);

    const input = document.getElementById('montantPaye');
    const montantPaye = parseFloat(input?.value) || 0;

    // On ne peut pas payer plus que le total
    const montantEffectif = Math.min(Math.max(0, montantPaye), totalTtc);
    const reste = totalTtc - montantEffectif;

    // Mise à jour des affichages
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('paiementTotal', formatMoney(totalTtc));
    setText('paiementPaye',  formatMoney(montantEffectif));
    setText('paiementReste', formatMoney(reste));

    // Couleur du "Reste" (orange si dette, vert si soldé)
    const resteEl = document.getElementById('paiementReste');
    if (resteEl) {
        resteEl.style.color = reste > 0 ? '#f59e0b' : '#10b981';
    }

    // Activer le bouton si panier non vide
    const validerBtn = document.getElementById('paiementValiderBtn');
    if (validerBtn) validerBtn.disabled = totalTtc === 0;
}

/**
 * Ouvre le modal de paiement avec les valeurs réinitialisées.
 */
function validerVente() {
    if (!State.panier.length) return;

    // Réinitialiser le montant payé
    const input = document.getElementById('montantPaye');
    if (input) input.value = '';
    State.montantPaye = 0;

    updatePaiementResume();
    document.getElementById('paiementModal')?.classList.add('open');
}

/**
 * Enregistre la vente avec le split Espèces / Crédit.
 *
 * Règles :
 *   - Si montant payé < total → le client doit être identifié (crédit)
 *   - Envoie `montant_paye` au backend qui crée 1 ou 2 paiements
 */
async function encaisser() {
    const btn = document.getElementById('paiementValiderBtn');
    if (btn) btn.disabled = true;

    const totalTtc = State.panier.reduce((s, l) => s + (l.prix_ttc * l.quantite), 0);
    const montantPayeSaisi = parseFloat(document.getElementById('montantPaye')?.value) || 0;
    const montantPaye = Math.min(montantPayeSaisi, totalTtc);

    // Règle : crédit → client obligatoire
    const proprietaireId = document.getElementById('proprietaireId')?.value;
    if (montantPaye < totalTtc && !proprietaireId) {
        Toast.error('Un client identifié est obligatoire pour enregistrer un crédit.');
        if (btn) btn.disabled = false;
        return;
    }

    // Construction du payload
    const data = {
        proprietaire_id: proprietaireId ? parseInt(proprietaireId, 10) : null,
        animal_id:       document.getElementById('animalId')?.value
                            ? parseInt(document.getElementById('animalId').value, 10)
                            : null,
        ordonnance_id:   null,
        montant_remise:  0,
        montant_paye:    montantPaye,
        lignes: State.panier.map(l => ({
            medicament_id: l.medicament_id,
            quantite:      l.quantite,
        })),
    };

    console.log('[Caisse] Payload vente :', JSON.stringify(data, null, 2));

    try {
        const response = await Api.post('/ventes', data);

        // Succès
        closeModal('paiementModal');

        const successNumero = document.getElementById('succesNumero');
        const successTotal  = document.getElementById('succesTotal');
        if (successNumero) successNumero.textContent = response.data?.numero_ticket || '—';
        if (successTotal)  successTotal.textContent = formatMoney(totalTtc);

        document.getElementById('succesModal')?.classList.add('open');
        Toast.success('Vente enregistrée avec succès !');
    } catch (error) {
        console.error('[Caisse] Erreur vente:', error);

        if (error.errors) {
            const msg = Object.entries(error.errors)
                .map(([field, msgs]) => `${field} : ${msgs[0]}`)
                .join('\n');
            Toast.error('Erreur de validation :\n' + msg, 8000);
        } else {
            Toast.error(error.message || 'Erreur lors de l\'enregistrement');
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Réinitialise toute la caisse pour une nouvelle vente.
 * Appelé après "Nouvelle vente" ou fermeture du modal succès.
 */
function reinitialiserCaisse() {
    // Vider le panier
    State.panier = [];
    State.montantPaye = 0;

    // Vider les champs client / animal
    const propId = document.getElementById('proprietaireId');
    const animId = document.getElementById('animalId');
    const animField = document.getElementById('animalField');
    const montant = document.getElementById('montantPaye');

    if (propId) propId.value = '';
    if (animId) animId.value = '';
    if (animField) animField.style.display = 'none';
    if (montant) montant.value = '';

    // Rafraîchir l'interface
    renderPanier();
    updateTotaux();

    // Fermer le modal succès
    closeModal('succesModal');

    // Re-focus sur la recherche
    document.getElementById('searchMedicament')?.focus();
}

// ============================================================
// MODALS
// ============================================================

/**
 * Ferme un modal par son ID.
 *
 * @param {string} id
 */
function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
}

// ============================================================
// EVENT LISTENERS
// ============================================================

/**
 * Branche tous les événements de la page.
 */
function setupEventListeners() {
    /**
     * Petit utilitaire pour attacher un événement en toute sécurité.
     */
    const safe = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    // === Recherche de médicament ===
    const searchInput = document.getElementById('searchMedicament');

    if (searchInput) {
        // Recherche au fur et à mesure (debounce 200ms)
        searchInput.addEventListener('input', (e) => {
            clearTimeout(State.searchTimeout);
            State.searchTimeout = setTimeout(() => {
                const resultats = rechercherMedicaments(e.target.value);
                afficherResultats(resultats);
            }, 200);
        });

        // Touches spéciales
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const resultats = rechercherMedicaments(e.target.value);

                if (resultats.length === 1) {
                    // Un seul résultat → ajout direct
                    ajouterAuPanier(resultats[0].id);
                    searchInput.value = '';
                    document.getElementById('searchResults').hidden = true;
                } else if (resultats.length > 1) {
                    // Plusieurs résultats → afficher la liste
                    afficherResultats(resultats);
                }
            }
            if (e.key === 'Escape') {
                document.getElementById('searchResults').hidden = true;
            }
        });
    }

    // Fermer les résultats si clic à l'extérieur
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.caisse-search-box')) {
            const results = document.getElementById('searchResults');
            if (results) results.hidden = true;
        }
    });

    // === Sélection client / animal ===
    safe('proprietaireId', 'change', (e) => {
        loadAnimauxDuProprietaire(e.target.value);
    });

    safe('nouveauClientBtn', 'click', () => {
        window.location.href = 'proprietaires.html';
    });

    // === Panier ===
    safe('viderPanierBtn', 'click', viderPanier);
    safe('validerVenteBtn', 'click', validerVente);

    // === Modal paiement ===
    safe('paiementCloseBtn', 'click', () => closeModal('paiementModal'));
    safe('paiementCancelBtn', 'click', () => closeModal('paiementModal'));
    safe('paiementValiderBtn', 'click', encaisser);

    // ⚠️ NOUVEAU : input "Montant payé" → recalcul en temps réel
    safe('montantPaye', 'input', updatePaiementResume);

    // ⚠️ NOUVEAU : bouton "Payer la totalité"
    safe('payerTotalBtn', 'click', () => {
        const totalTtc = State.panier.reduce((s, l) => s + (l.prix_ttc * l.quantite), 0);
        const input = document.getElementById('montantPaye');
        if (input) {
            input.value = totalTtc;
            updatePaiementResume();
        }
    });

    // === Modal succès ===
    safe('succesCloseBtn', 'click', () => closeModal('succesModal'));
    safe('succesNouveauBtn', 'click', reinitialiserCaisse);
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Formate un montant en BIF.
 *
 * @param {number|string} value
 * @returns {string}
 */
function formatMoney(value) {
    if (value === null || value === undefined) return '—';

    return new Intl.NumberFormat('fr-BI', {
        style: 'currency',
        currency: 'BIF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Échappe le HTML pour éviter les injections XSS.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}