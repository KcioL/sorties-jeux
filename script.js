// Gestion des États (State) de l'Application
const state = {
    clientId: localStorage.getItem('igdb_client_id') || '',
    accessToken: localStorage.getItem('igdb_access_token') || '',
    currentQuarter: 'all',
    currentPlatform: 'all',
    searchQuery: ''
};

// Éléments du DOM
const gamesContainer = document.getElementById('games-container');
const sectionTitle = document.getElementById('section-title');
const loadingSpinner = document.getElementById('loading');
const errorDisplay = document.getElementById('error-display');

// Définition des mois associés à chaque Trimestre (Année courante 2026)
const CURRENT_YEAR = 2026;
const quartersTimestamps = {
    Q1: { start: Math.floor(new Date(`${CURRENT_YEAR}-01-01`).getTime() / 1000), end: Math.floor(new Date(`${CURRENT_YEAR}-03-31T23:59:59`).getTime() / 1000) },
    Q2: { start: Math.floor(new Date(`${CURRENT_YEAR}-04-01`).getTime() / 1000), end: Math.floor(new Date(`${CURRENT_YEAR}-06-30T23:59:59`).getTime() / 1000) },
    Q3: { start: Math.floor(new Date(`${CURRENT_YEAR}-07-01`).getTime() / 1000), end: Math.floor(new Date(`${CURRENT_YEAR}-09-30T23:59:59`).getTime() / 1000) },
    Q4: { start: Math.floor(new Date(`${CURRENT_YEAR}-10-01`).getTime() / 1000), end: Math.floor(new Date(`${CURRENT_YEAR}-12-31T23:59:59`).getTime() / 1000) },
    all: { start: Math.floor(new Date(`${CURRENT_YEAR}-01-01`).getTime() / 1000), end: Math.floor(new Date(`${CURRENT_YEAR}-12-31T23:59:59`).getTime() / 1000) }
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initApiConfig();
    setupEventListeners();
    if (state.clientId && state.accessToken) {
        loadGames();
    } else {
        showError("Veuillez renseigner vos identifiants d'API IGDB ci-dessus pour charger les données.");
    }
});

// Gestion du panneau de configuration des clés API
function initApiConfig() {
    if (state.clientId) document.getElementById('client-id').value = state.clientId;
    if (state.accessToken) document.getElementById('access-token').value = state.accessToken;

    document.getElementById('save-config-btn').addEventListener('click', () => {
        const cid = document.getElementById('client-id').value.trim();
        const token = document.getElementById('access-token').value.trim();

        if (cid && token) {
            localStorage.setItem('igdb_client_id', cid);
            localStorage.setItem('igdb_access_token', token);
            state.clientId = cid;
            state.accessToken = token;
            errorDisplay.style.display = 'none';
            loadGames();
        } else {
            alert('Veuillez remplir les deux champs.');
        }
    });
}

// Configuration des écouteurs d'événements pour les filtres et la recherche
function setupEventListeners() {
    // Filtres de trimestres
    document.getElementById('quarter-filters').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('#quarter-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.currentQuarter = e.target.dataset.quarter;
            state.searchQuery = ''; // Réinitialise la recherche textuelle lors du filtrage par période
            document.getElementById('search-input').value = '';
            loadGames();
        }
    });

    // Filtres de plateformes
    document.getElementById('platform-filters').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('#platform-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.currentPlatform = e.target.dataset.platform;
            loadGames();
        }
    });

    // Bouton et Entrée pour la recherche
    document.getElementById('search-btn').addEventListener('click', executeSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') executeSearch();
    });
}

function executeSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (query) {
        state.searchQuery = query;
        // Désélectionne les trimestres spécifiques pour la recherche globale
        document.querySelectorAll('#quarter-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-quarter="all"]').classList.add('active');
        state.currentQuarter = 'all';
        loadGames();
    }
}

// Construction de la requête IGDB (Syntaxe Apicalypse) et appel API
async function loadGames() {
    showLoading(true);
    errorDisplay.style.display = 'none';
    gamesContainer.innerHTML = '';

    // Détermination de l'intitulé de la section
    if (state.searchQuery) {
        sectionTitle.textContent = `Résultats de recherche pour : "${state.searchQuery}"`;
    } else {
        const qText = state.currentQuarter === 'all' ? "de l'année" : `du ${state.currentQuarter}`;
        sectionTitle.textContent = `Sorties jeux vidéo ${qText} ${CURRENT_YEAR}`;
    }

    // Elaboration de la requête IGDB Body
    let bodyQuery = '';
    const fields = "fields name, cover.url, first_release_date, platforms.name, total_rating;";
    
    if (state.searchQuery) {
        // Mode recherche textuelle
        bodyQuery = `${fields} search "${state.searchQuery}"; limit 40;`;
    } else {
        // Mode catalogue par dates / trimestres
        const timeRange = quartersTimestamps[state.currentQuarter];
        let conditions = `first_release_date >= ${timeRange.start} & first_release_date <= ${timeRange.end}`;
        
        // Ajout du filtre plateforme si sélectionné
        if (state.currentPlatform !== 'all') {
            conditions += ` & platforms = ${state.currentPlatform}`;
        }
        
        bodyQuery = `${fields} where ${conditions}; sort first_release_date asc; limit 40;`;
    }

    try {
        const response = await fetch('https://corsproxy.io/?https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Client-ID': state.clientId,
                'Authorization': `Bearer ${state.accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'text/plain'
            },
            body: bodyQuery
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("Vos accès API (Client ID ou Access Token) sont incorrects ou expirés.");
            }
            throw new Error(`Erreur serveur IGDB (Code: ${response.status})`);
        }

        const games = await response.json();
        renderGames(games);
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Rendu des cartes de jeux dans la grille HTML
function renderGames(games) {
    if (!games || games.length === 0) {
        gamesContainer.innerHTML = `<div class="loading-spinner">Aucun jeu trouvé pour les critères sélectionnés.</div>`;
        return;
    }

    // Filtrage secondaire optionnel si on est en mode recherche textuelle (pour la plateforme uniquement)
    let filteredGames = games;
    if (state.searchQuery && state.currentPlatform !== 'all') {
        filteredGames = games.filter(game => 
            game.platforms && game.platforms.some(p => p.id == state.currentPlatform)
        );
    }

    filteredGames.forEach(game => {
        // Gestion de l'image de couverture (remplacement de 't_thumb' par 't_cover_big' pour une meilleure qualité)
        let coverUrl = 'https://via.placeholder.com/264x352/121e36/f1f5f9?text=Pas+d%27image';
        if (game.cover && game.cover.url) {
            coverUrl = game.cover.url.replace('t_thumb', 't_cover_big');
            if (!coverUrl.startsWith('http')) {
                coverUrl = 'https:' + coverUrl;
            }
        }

        // Formatage de la date de sortie française
        let releaseDateStr = "Date inconnue";
        if (game.first_release_date) {
            const dateObj = new Date(game.first_release_date * 1000);
            releaseDateStr = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        }

        // Note arrondie
        const rating = game.total_rating ? Math.round(game.total_rating) + ' / 100' : 'N/A';

        // Badges des plateformes
        const platformsHtml = game.platforms 
            ? game.platforms.map(p => `<span class="platform-badge">${p.name}</span>`).join('')
            : '<span class="platform-badge">Inconnue</span>';

        // Création de l'élément carte
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div class="cover-wrapper">
                <img src="${coverUrl}" alt="Jaquette de ${game.name}" loading="lazy">
                <div class="game-rating">${rating}</div>
            </div>
            <div class="game-info">
                <div class="game-title">${game.name}</div>
                <div class="game-release-date">📅 ${releaseDateStr}</div>
                <div class="game-platforms">
                    ${platformsHtml}
                </div>
            </div>
        `;
        gamesContainer.appendChild(card);
    });
}

function showLoading(isLoading) {
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
}

function showError(msg) {
    errorDisplay.textContent = msg;
    errorDisplay.style.display = 'block';
}
