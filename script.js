// Gestion des États (State) de l'Application
// Gestion des États (State) de l'Application
const state = {
    currentQuarter: 'all',
    currentPlatform: 'all',
    searchQuery: '',
    currentSort: 'date_asc', // Ajout du tri par défaut
    offset: 0 // <-- On commence à 0
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
// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadGames(); // On lance directement le chargement des jeux via Netlify
});

// Configuration des écouteurs d'événements pour les filtres et la recherche
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
            
            // NOUVEAU : On remet l'offset à zéro quand on change de trimestre
            state.offset = 0; 
            loadGames();
        }
    });

    // Filtres de plateformes
    document.getElementById('platform-filters').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('#platform-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.currentPlatform = e.target.dataset.platform;
            
            // NOUVEAU : On remet l'offset à zéro quand on change de plateforme
            state.offset = 0; 
            loadGames();
        }
    });

    // Bouton et Entrée pour la recherche
    document.getElementById('search-btn').addEventListener('click', executeSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') executeSearch();
    });

    // NOUVEAU : Écouteur pour le bouton "Charger plus"
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            state.offset += 40; // On décale de 40 jeux
            loadGames(true); // Le "true" indique qu'on ajoute à la suite sans effacer
        });
    }
    document.getElementById('sort-select').addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        state.offset = 0; // On remet à zéro quand on change le tri
        
        // Si on était sur "Les plus attendus", on repasse sur "Toute l'année" 
        // car le tri personnalise l'affichage
        if(state.currentQuarter === 'anticipated') {
            document.querySelectorAll('#quarter-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('[data-quarter="all"]').classList.add('active');
            state.currentQuarter = 'all';
        }
        loadGames();
    });
}

// Fonction de recherche textuelle
function executeSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (query) {
        state.searchQuery = query;
        // Désélectionne les trimestres spécifiques pour la recherche globale
        document.querySelectorAll('#quarter-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-quarter="all"]').classList.add('active');
        state.currentQuarter = 'all';
        
        // NOUVEAU : On remet l'offset à zéro pour une nouvelle recherche
        state.offset = 0; 
        loadGames();
    }
}

// Construction de la requête IGDB et appel API (PARTIE C)
// Construction de la requête IGDB et appel API (PARTIE C)
async function loadGames(isAppending = false) {
    // Gestion de l'affichage selon si on charge une nouvelle page ou la suite
    if (!isAppending) {
        showLoading(true);
        gamesContainer.innerHTML = '';
        state.offset = 0; // Sécurité
    } else {
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) loadMoreBtn.textContent = 'Chargement en cours...';
    }
    
    errorDisplay.style.display = 'none';

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
        bodyQuery = `${fields} search "${state.searchQuery}"; limit 40; offset ${state.offset};`;
    } else if (state.currentQuarter === 'anticipated') {
        // LOGIQUE POUR LES JEUX LES PLUS ATTENDUS (Top 30)
        sectionTitle.textContent = `Les 30 jeux les plus attendus de ${CURRENT_YEAR}`;
        document.getElementById('sort-select').value = 'date_asc'; // Visuellement réinitialiser le tri
        
        const timeRange = quartersTimestamps['all'];
        // On exige qu'il y ait des hypes (attentes) pour ce jeu
        let conditions = `first_release_date >= ${timeRange.start} & first_release_date <= ${timeRange.end} & hypes != null`;
        
        if (state.currentPlatform !== 'all') {
            conditions += ` & platforms = ${state.currentPlatform}`;
        }
        
        // On trie par le nombre de "hypes" décroissant et on limite à 30
        bodyQuery = `${fields} where ${conditions}; sort hypes desc; limit 30; offset ${state.offset};`;
        
    } else {
        // MODE CATALOGUE STANDARD
        const timeRange = quartersTimestamps[state.currentQuarter];
        let conditions = `first_release_date >= ${timeRange.start} & first_release_date <= ${timeRange.end}`;
        
        if (state.currentPlatform !== 'all') {
            conditions += ` & platforms = ${state.currentPlatform}`;
        }
        
        // Application du tri sélectionné dans le menu déroulant
        let sortLogic = "";
        switch(state.currentSort) {
            case 'date_asc': 
                sortLogic = "sort first_release_date asc;"; 
                break;
            case 'date_desc': 
                sortLogic = "sort first_release_date desc;"; 
                break;
            case 'popular': 
                sortLogic = "sort total_rating_count desc;"; 
                conditions += " & total_rating_count != null"; // On évite les jeux inconnus
                break;
            case 'rating_desc': 
                sortLogic = "sort total_rating desc;"; 
                conditions += " & total_rating != null"; 
                break;
            case 'rating_asc': 
                sortLogic = "sort total_rating asc;"; 
                conditions += " & total_rating != null"; 
                break;
        }
        
        bodyQuery = `${fields} where ${conditions}; ${sortLogic} limit 40; offset ${state.offset};`;
    }

    // NOUVEAU (Le bloc manquant pour appeler le serveur Netlify)
    try {
        const response = await fetch('/.netlify/functions/getGames', {
            method: 'POST',
            body: bodyQuery
        });

        if (!response.ok) {
            throw new Error(`Erreur de chargement (Code: ${response.status})`);
        }

        const games = await response.json();
        
        // On transmet la variable isAppending au rendu
        renderGames(games, isAppending);
    } catch (error) {
        showError(error.message);
    } finally {
        if (!isAppending) showLoading(false);
    }
}
// Rendu des cartes de jeux dans la grille HTML (PARTIE D)
function renderGames(games, isAppending) {
    const loadMoreBtn = document.getElementById('load-more-btn');

    // NOUVEAU : Gestion du bouton si la base de données n'a plus de jeux à donner
    if (!games || games.length === 0) {
        if (!isAppending) {
            gamesContainer.innerHTML = `<div class="loading-spinner">Aucun jeu trouvé pour les critères sélectionnés.</div>`;
        }
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    // NOUVEAU : Si on reçoit moins de 40 jeux, on est à la fin, on cache le bouton
    if (loadMoreBtn) {
        if (games.length < 40) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-block';
            loadMoreBtn.textContent = 'Charger plus de jeux';
        }
    }

    // Filtrage secondaire optionnel si on est en mode recherche textuelle (pour la plateforme uniquement)
    let filteredGames = games;
    if (state.searchQuery && state.currentPlatform !== 'all') {
        filteredGames = games.filter(game => 
            game.platforms && game.platforms.some(p => p.id == state.currentPlatform)
        );
    }

    filteredGames.forEach(game => {
        // Gestion de l'image de couverture
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
