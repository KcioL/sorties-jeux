// Gestion des États (State) de l'Application
const state = {
    currentYear: '2026', // L'année sélectionnée par défaut
    currentQuarter: 'all',
    currentPlatform: 'all',
    searchQuery: '',
    currentSort: 'date_asc', 
    currentGenre: 'all',
    currentTheme: 'all',
    offset: 0 
};

// Éléments du DOM
const gamesContainer = document.getElementById('games-container');
const sectionTitle = document.getElementById('section-title');
const loadingSpinner = document.getElementById('loading');
const errorDisplay = document.getElementById('error-display');

// Fonction dynamique pour calculer les dates selon l'année choisie
function getTimestamps(year) {
    return {
        Q1: { start: Math.floor(new Date(`${year}-01-01`).getTime() / 1000), end: Math.floor(new Date(`${year}-03-31T23:59:59`).getTime() / 1000) },
        Q2: { start: Math.floor(new Date(`${year}-04-01`).getTime() / 1000), end: Math.floor(new Date(`${year}-06-30T23:59:59`).getTime() / 1000) },
        Q3: { start: Math.floor(new Date(`${year}-07-01`).getTime() / 1000), end: Math.floor(new Date(`${year}-09-30T23:59:59`).getTime() / 1000) },
        Q4: { start: Math.floor(new Date(`${year}-10-01`).getTime() / 1000), end: Math.floor(new Date(`${year}-12-31T23:59:59`).getTime() / 1000) },
        all: { start: Math.floor(new Date(`${year}-01-01`).getTime() / 1000), end: Math.floor(new Date(`${year}-12-31T23:59:59`).getTime() / 1000) }
    };
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadGames(); 
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Écouteur pour l'année
    document.getElementById('year-select').addEventListener('change', (e) => {
        state.currentYear = e.target.value;
        state.offset = 0; 
        loadGames();
    });

    // Filtres de trimestres
    document.getElementById('quarter-filters').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('#quarter-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.currentQuarter = e.target.dataset.quarter;
            state.searchQuery = ''; 
            document.getElementById('search-input').value = '';
            
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
            
            state.offset = 0; 
            loadGames();
        }
    });

    // Recherche textuelle
    document.getElementById('search-btn').addEventListener('click', executeSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') executeSearch();
    });

    // Bouton "Charger plus"
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            state.offset += 40; 
            loadGames(true); 
        });
    }

    // Menus déroulants
    document.getElementById('sort-select').addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        state.offset = 0; 
        if(state.currentQuarter === 'anticipated') {
            document.querySelectorAll('#quarter-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('[data-quarter="all"]').classList.add('active');
            state.currentQuarter = 'all';
        }
        loadGames();
    });

    document.getElementById('genre-select').addEventListener('change', (e) => {
        state.currentGenre = e.target.value;
        state.offset = 0; 
        loadGames();
    });

    document.getElementById('theme-select').addEventListener('change', (e) => {
        state.currentTheme = e.target.value;
        state.offset = 0; 
        loadGames();
    });
}

// Fonction de recherche textuelle
function executeSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (query) {
        state.searchQuery = query;
        document.querySelectorAll('#quarter-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-quarter="all"]').classList.add('active');
        state.currentQuarter = 'all';
        state.offset = 0; 
        loadGames();
    }
}

// Construction de la requête IGDB et appel API
async function loadGames(isAppending = false) {
    if (!isAppending) {
        showLoading(true);
        gamesContainer.innerHTML = '';
        state.offset = 0; 
    } else {
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) loadMoreBtn.textContent = 'Chargement en cours...';
    }
    
    errorDisplay.style.display = 'none';

    if (state.searchQuery) {
        sectionTitle.textContent = `Résultats de recherche pour : "${state.searchQuery}"`;
    } else {
        const qText = state.currentQuarter === 'all' ? "de l'année" : `du ${state.currentQuarter}`;
        sectionTitle.textContent = `Sorties jeux vidéo ${qText} ${state.currentYear}`;
    }

    let bodyQuery = '';
    // NOUVEAU : Ajout de websites.category et websites.url dans la requête
    const fields = "fields name, cover.url, first_release_date, platforms.name, total_rating, websites.category, websites.url;";
    
    if (state.searchQuery) {
        bodyQuery = `${fields} search "${state.searchQuery}"; limit 40; offset ${state.offset};`;
    } else if (state.currentQuarter === 'anticipated') {
        sectionTitle.textContent = `Les 30 jeux les plus attendus de ${state.currentYear}`;
        document.getElementById('sort-select').value = 'date_asc'; 
        
        const timeRange = getTimestamps(state.currentYear)['all'];
        let conditions = `first_release_date >= ${timeRange.start} & first_release_date <= ${timeRange.end} & hypes != null`;
        
        if (state.currentPlatform !== 'all') {
            conditions += ` & platforms = ${state.currentPlatform}`;
        }
        if (state.currentGenre !== 'all') {
            conditions += ` & genres = ${state.currentGenre}`;
        }
        if (state.currentTheme !== 'all') {
            conditions += ` & themes = ${state.currentTheme}`;
        }
        
        bodyQuery = `${fields} where ${conditions}; sort hypes desc; limit 30; offset ${state.offset};`;
        
    } else {
        const timeRange = getTimestamps(state.currentYear)[state.currentQuarter];
        let conditions = `first_release_date >= ${timeRange.start} & first_release_date <= ${timeRange.end}`;
        
        if (state.currentPlatform !== 'all') {
            conditions += ` & platforms = ${state.currentPlatform}`;
        }
        if (state.currentGenre !== 'all') {
            conditions += ` & genres = ${state.currentGenre}`;
        }
        if (state.currentTheme !== 'all') {
            conditions += ` & themes = ${state.currentTheme}`;
        }
        
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
                conditions += " & total_rating_count != null"; 
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

    try {
        const response = await fetch('/.netlify/functions/getGames', {
            method: 'POST',
            body: bodyQuery
        });

        if (!response.ok) {
            throw new Error(`Erreur de chargement (Code: ${response.status})`);
        }

        const games = await response.json();
        renderGames(games, isAppending);
    } catch (error) {
        showError(error.message);
    } finally {
        if (!isAppending) showLoading(false);
    }
}

// Rendu des cartes HTML
function renderGames(games, isAppending) {
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (!games || games.length === 0) {
        if (!isAppending) {
            gamesContainer.innerHTML = `<div class="loading-spinner">Aucun jeu trouvé pour les critères sélectionnés.</div>`;
        }
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    if (loadMoreBtn) {
        if (games.length < 40) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-block';
            loadMoreBtn.textContent = 'Charger plus de jeux';
        }
    }

    let filteredGames = games;
    if (state.searchQuery && state.currentPlatform !== 'all') {
        filteredGames = games.filter(game => 
            game.platforms && game.platforms.some(p => p.id == state.currentPlatform)
        );
    }

    filteredGames.forEach(game => {
        let coverUrl = 'https://via.placeholder.com/264x352/121e36/f1f5f9?text=Pas+d%27image';
        if (game.cover && game.cover.url) {
            coverUrl = game.cover.url.replace('t_thumb', 't_cover_big');
            if (!coverUrl.startsWith('http')) {
                coverUrl = 'https:' + coverUrl;
            }
        }

        let releaseDateStr = "Date inconnue";
        if (game.first_release_date) {
            const dateObj = new Date(game.first_release_date * 1000);
            releaseDateStr = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        }

        const rating = game.total_rating ? Math.round(game.total_rating) + ' / 100' : 'N/A';

        const platformsHtml = game.platforms 
            ? game.platforms.map(p => `<span class="platform-badge">${p.name}</span>`).join('')
            : '<span class="platform-badge">Inconnue</span>';

        // Recherche du lien Steam (Catégorie 13)
        let steamUrl = null;
        if (game.websites) {
            const steamSite = game.websites.find(site => site.category === 13);
            if (steamSite) {
                steamUrl = steamSite.url;
            }
        }

        // Création de la carte (<a> si Steam, <div> sinon)
        const card = steamUrl ? document.createElement('a') : document.createElement('div');
        card.className = 'game-card';
        
        if (steamUrl) {
            card.href = steamUrl;
            card.target = "_blank"; 
            card.rel = "noopener noreferrer"; 
            card.style.textDecoration = "none"; 
            card.style.color = "inherit"; 
            card.title = "Voir sur Steam"; 
        }

        card.innerHTML = `
            <div class="cover-wrapper">
                <img src="${coverUrl}" alt="Jaquette de ${game.name}" loading="lazy">
                <div class="game-rating">${rating}</div>
            </div>
            <div class="game-info">
                <div class="game-title">
                    ${game.name} 
                    ${steamUrl ? '<span style="font-size: 0.8em; opacity: 0.7;" title="Lien Steam disponible">🔗</span>' : ''}
                </div>
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
