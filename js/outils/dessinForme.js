// Forme en train d'etre creee
let formeEnCours = null;

// Commencer une forme
export function commencerForme(outilForme, x, y, couleur, epaisseur) {
    formeEnCours = outilForme.commencer(x, y, couleur, epaisseur);
}

// Mettre a jour une forme pendant le mouvement de la souris
export function mettreAJourForme(outilForme, x, y) {
    if (!formeEnCours) {
        return;
    }

    formeEnCours = outilForme.mettreAJour(formeEnCours, x, y);
}

// Lire la forme en cours
export function obtenirFormeEnCours() {
    return formeEnCours;
}

// Terminer la creation de la forme
export function terminerForme() {
    let forme = formeEnCours;
    formeEnCours = null;
    return forme;
}

// Annuler la forme en cours
export function annulerForme() {
    formeEnCours = null;
}
