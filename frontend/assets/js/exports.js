/**
 * Logique de la page Exports.
 *
 * Utilise fetch + blob pour télécharger les fichiers CSV avec token Bearer.
 */

Guard.requireAuth();

document.addEventListener('DOMContentLoaded', () => {
    // Dates par défaut
    const today = new Date().toISOString().split('T')[0];
    const debutMois = new Date();
    debutMois.setDate(1);

    document.getElementById('ventesDateDebut').value = debutMois.toISOString().split('T')[0];
    document.getElementById('ventesDateFin').value   = today;
    document.getElementById('rapportDate').value     = today;

    setupEventListeners();
});

// ============================================================
// TÉLÉCHARGEMENT
// ============================================================

/**
 * Télécharge un fichier depuis l'API avec le token Bearer.
 */
async function telechargerFichier(endpoint, nomFichier) {
    const token = Storage.getToken();
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': '*/*',
            },
        });

        if (!response.ok) {
            // Essayer de lire un message d'erreur JSON
            let message = `Erreur ${response.status}`;
            try {
                const data = await response.json();
                message = data.message || message;
            } catch (e) { /* silencieux */ }
            throw new Error(message);
        }

        // Récupérer le blob
        const blob = await response.blob();

        // Déclencher le téléchargement
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomFichier;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Nettoyer
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);

        Toast.success('Fichier téléchargé avec succès.');
    } catch (error) {
        console.error('[Export] Erreur:', error);
        Toast.error('Erreur de téléchargement : ' + error.message);
    }
}

// ============================================================
// ACTIONS
// ============================================================

async function exportVentes() {
    const debut = document.getElementById('ventesDateDebut').value;
    const fin   = document.getElementById('ventesDateFin').value;

    if (!debut || !fin) {
        Toast.warning('Veuillez choisir les deux dates.');
        return;
    }

    if (debut > fin) {
        Toast.warning('La date de début doit être antérieure à la date de fin.');
        return;
    }

    const btn = document.getElementById('exportVentesBtn');
    btn.disabled = true;

    try {
        await telechargerFichier(
            `/exports/ventes?date_debut=${debut}&date_fin=${fin}`,
            `ventes_${debut}_${fin}.csv`
        );
    } finally {
        btn.disabled = false;
    }
}

async function exportStock() {
    const btn = document.getElementById('exportStockBtn');
    btn.disabled = true;

    try {
        const today = new Date().toISOString().split('T')[0];
        await telechargerFichier(
            '/exports/stock',
            `stock_${today}.csv`
        );
    } finally {
        btn.disabled = false;
    }
}

async function exportLotsPerimes() {
    const btn = document.getElementById('exportLotsPerimesBtn');
    btn.disabled = true;

    try {
        const today = new Date().toISOString().split('T')[0];
        await telechargerFichier(
            '/exports/lots-perimes',
            `lots_perimes_${today}.csv`
        );
    } finally {
        btn.disabled = false;
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    document.getElementById('exportVentesBtn').addEventListener('click', exportVentes);
    document.getElementById('exportStockBtn').addEventListener('click', exportStock);
    document.getElementById('exportLotsPerimesBtn').addEventListener('click', exportLotsPerimes);

    // Bouton PDF désactivé (mais on garde le listener pour éviter les erreurs)
    const pdfBtn = document.getElementById('exportRapportPdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            Toast.info('Export PDF non disponible. Installez barryvdh/laravel-dompdf.');
        });
    }
}