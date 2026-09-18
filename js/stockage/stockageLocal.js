// Prefixe utilise pour separer les dessins dans localStorage
const prefixeDessin = "dessinTableau:";

// Lire l'identifiant du tableau dans l'adresse de la page
export function obtenirIdentifiantTableau() {
    let parametres = new URLSearchParams(window.location.search);
    let identifiant = parametres.get("tableau");

    if (!identifiant) {
        return "tableau-principal";
    }

    return identifiant;
}

// Charger les formes d'un tableau
export function chargerDessin(identifiant) {
    let cleDessin = prefixeDessin + identifiant;
    let dessinSauvegarde = localStorage.getItem(cleDessin);

    if (!dessinSauvegarde) {
        return [];
    }

    try {
        let formes = JSON.parse(dessinSauvegarde);

        if (Array.isArray(formes)) {
            return formes;
        }
    }
    catch (erreur) {
        console.error("Impossible de charger le tableau.", erreur);
    }

    return [];
}

// Sauvegarder les formes d'un tableau
export function sauvegarderDessin(identifiant, formes) {
    let cleDessin = prefixeDessin + identifiant;

    try {
        localStorage.setItem(cleDessin, JSON.stringify(formes));
    }
    catch (erreur) {
        console.error("Impossible de sauvegarder le tableau.", erreur);
    }
}

// Supprimer le dessin sauvegarde d'un tableau
export function supprimerDessin(identifiant) {
    let cleDessin = prefixeDessin + identifiant;
    localStorage.removeItem(cleDessin);
}
