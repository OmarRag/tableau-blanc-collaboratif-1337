// Liste de toutes les formes presentes sur le canvas
let formesDessinees = [];

// Creer un identifiant unique pour reconnaitre une forme entre les navigateurs
function creerIdentifiantForme() {
    let date = Date.now();
    let partieAleatoire = Math.random().toString(36).substring(2, 10);

    return "forme-" + date + "-" + partieAleatoire;
}

// Verifier que chaque forme possede un identifiant
function ajouterIdentifiants(formes) {
    let identifiantsUtilises = new Set();

    for (const forme of formes) {
        if (!forme) {
            continue;
        }

        if (!forme.id || identifiantsUtilises.has(forme.id)) {
            forme.id = creerIdentifiantForme();
        }

        identifiantsUtilises.add(forme.id);
    }
}

// Ajouter un identifiant a une forme avant de la partager
export function assurerIdentifiantForme(forme) {
    ajouterIdentifiants([forme]);
    return forme;
}

// Lire la liste des formes
export function obtenirFormes() {
    return formesDessinees;
}

// Ajouter une forme
export function ajouterForme(forme) {
    assurerIdentifiantForme(forme);
    formesDessinees.push(forme);
}

// Supprimer une forme par son indice
export function supprimerForme(index) {
    formesDessinees.splice(index, 1);
}

// Remplacer la liste, notamment lors d'une annulation
export function remplacerFormes(nouvellesFormes) {
    ajouterIdentifiants(nouvellesFormes);
    formesDessinees.length = 0;
    formesDessinees.push(...nouvellesFormes);
}

// Appliquer les changements recus d'un autre navigateur
export function appliquerOperations(modifications, suppressions) {
    if (!Array.isArray(modifications)) {
        modifications = [];
    }

    if (!Array.isArray(suppressions)) {
        suppressions = [];
    }

    for (let index = formesDessinees.length - 1; index >= 0; index--) {
        let forme = formesDessinees[index];

        if (suppressions.includes(forme.id)) {
            formesDessinees.splice(index, 1);
        }
    }

    for (const formeRecue of modifications) {
        let formeExistante = formesDessinees.find(function (forme) {
            return forme.id === formeRecue.id;
        });

        if (!formeExistante) {
            formesDessinees.push(formeRecue);
            continue;
        }

        // Garder le meme objet evite de casser une selection en cours.
        for (const propriete in formeExistante) {
            if (!(propriete in formeRecue)) {
                delete formeExistante[propriete];
            }
        }

        Object.assign(formeExistante, formeRecue);
    }

    ajouterIdentifiants(formesDessinees);
}
