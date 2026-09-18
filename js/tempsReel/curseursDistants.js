// Afficher les curseurs des autres utilisateurs au-dessus du canvas
const coucheCurseurs = document.getElementById("curseurs-distants");
const elementsCurseurs = new Map();

function creerElementCurseur() {
    let element = document.createElement("div");
    let pointe = document.createElement("span");
    let nom = document.createElement("span");

    element.className = "curseur-distant";
    pointe.className = "pointe-curseur-distant";
    nom.className = "nom-curseur-distant";

    element.appendChild(pointe);
    element.appendChild(nom);
    coucheCurseurs.appendChild(element);

    return {
        element: element,
        nom: nom
    };
}

export function afficherCurseursDistants(curseurs, decalageVue) {
    let utilisateursPresents = new Set();

    for (const curseur of curseurs) {
        if (
            !curseur
            || !curseur.utilisateur
            || !Number.isFinite(curseur.x)
            || !Number.isFinite(curseur.y)
        ) {
            continue;
        }

        utilisateursPresents.add(curseur.utilisateur);

        if (!elementsCurseurs.has(curseur.utilisateur)) {
            elementsCurseurs.set(curseur.utilisateur, creerElementCurseur());
        }

        let curseurAffiche = elementsCurseurs.get(curseur.utilisateur);
        let positionEcranX = curseur.x * decalageVue.zoom + decalageVue.x;
        let positionEcranY = curseur.y * decalageVue.zoom + decalageVue.y;

        curseurAffiche.element.style.left = positionEcranX + "px";
        curseurAffiche.element.style.top = positionEcranY + "px";
        curseurAffiche.element.style.setProperty(
            "--couleur-utilisateur",
            curseur.couleur
        );
        curseurAffiche.nom.textContent = curseur.nom;
    }

    for (const [utilisateur, curseurAffiche] of elementsCurseurs) {
        if (!utilisateursPresents.has(utilisateur)) {
            curseurAffiche.element.remove();
            elementsCurseurs.delete(utilisateur);
        }
    }
}
