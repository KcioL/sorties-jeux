exports.handler = async function(event, context) {
    // On s'assure qu'on reçoit bien une requête de type POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const bodyQuery = event.body; // C'est la requête Apicalypse envoyée par ton frontend

    try {
        // C'est ici que la magie opère : Netlify lit les variables d'environnement
        const clientId = process.env.TWITCH_CLIENT_ID;
        const accessToken = process.env.TWITCH_ACCESS_TOKEN;

        // Le serveur Netlify interroge IGDB à ta place
        const response = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'text/plain'
            },
            body: bodyQuery
        });

        if (!response.ok) {
            throw new Error(`Erreur IGDB: ${response.status}`);
        }

        const data = await response.json();

        // Le serveur renvoie les données de jeux à ton site web
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};