// Etat des choix actuels de l'utilisateur
let formeChoisie = "";
let couleurChoisie = "#000000";
let epaisseurChoisie = 2;

// Modifier l'outil choisi
export function choisirOutil(nomOutil) {
    formeChoisie = nomOutil;
}

// Modifier la couleur choisie
export function choisirCouleur(couleur) {
    couleurChoisie = couleur;
}

// Modifier l'epaisseur choisie
export function choisirEpaisseur(epaisseur) {
    epaisseurChoisie = epaisseur;
}

// Lire les choix actuels
export function getFormeChoisie() {
    return formeChoisie;
}

export function getCouleurChoisie() {
    return couleurChoisie;
}

export function getEpaisseurChoisie() {
    return epaisseurChoisie;
}
