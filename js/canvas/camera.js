import { canvas } from "../canvas.js";

// Position actuelle de la vue dans le canvas
let decalageVueX = 0;
let decalageVueY = 0;
let zoom = 1;
let deplacementEnCours = false;
let derniereSourisX = 0;
let derniereSourisY = 0;

// Garder au moins une partie de la zone de dessin visible
function obtenirLimiteDeplacement(tailleCanvas) {
    let limite = tailleCanvas * (zoom - 0.5);
    let limiteMinimum = tailleCanvas * 0.5;

    if (limite < limiteMinimum) {
        limite = limiteMinimum;
    }

    return limite;
}

function limiterDeplacement() {
    let limiteX = obtenirLimiteDeplacement(canvas.width);
    let limiteY = obtenirLimiteDeplacement(canvas.height);

    if (decalageVueX < -limiteX) {
        decalageVueX = -limiteX;
    }

    if (decalageVueX > limiteX) {
        decalageVueX = limiteX;
    }

    if (decalageVueY < -limiteY) {
        decalageVueY = -limiteY;
    }

    if (decalageVueY > limiteY) {
        decalageVueY = limiteY;
    }
}

// Convertir la position de la souris en position de dessin
export function obtenirPositionDansCanvas(evenementSouris) {
    return {
        x: (evenementSouris.offsetX - decalageVueX) / zoom,
        y: (evenementSouris.offsetY - decalageVueY) / zoom
    };
}

// Commencer le deplacement du canvas
export function commencerDeplacement(evenementSouris) {
    deplacementEnCours = true;
    derniereSourisX = evenementSouris.offsetX;
    derniereSourisY = evenementSouris.offsetY;
}

// Mettre a jour le deplacement du canvas
export function mettreAJourDeplacement(evenementSouris) {
    decalageVueX += evenementSouris.offsetX - derniereSourisX;
    decalageVueY += evenementSouris.offsetY - derniereSourisY;
    limiterDeplacement();
    derniereSourisX = evenementSouris.offsetX;
    derniereSourisY = evenementSouris.offsetY;
}

// Appliquer un nouveau zoom autour d'un point donne
function appliquerZoom(nouveauZoom, positionCanvasX, positionCanvasY) {
    let ancienZoom = zoom;
    let positionDessinX = (positionCanvasX - decalageVueX) / ancienZoom;
    let positionDessinY = (positionCanvasY - decalageVueY) / ancienZoom;

    zoom = nouveauZoom;

    if (zoom < 0.5) {
        zoom = 0.5;
    }

    if (zoom > 3) {
        zoom = 3;
    }
    decalageVueX = positionCanvasX - positionDessinX * zoom;
    decalageVueY = positionCanvasY - positionDessinY * zoom;
    limiterDeplacement();
    let evenementZoom = new CustomEvent("zoomModifie", {
        detail: {
            zoom: zoom
        }
    });

    canvas.dispatchEvent(evenementZoom);
}

// Modifier le zoom avec la molette autour de la souris
export function mettreAJourZoom(evenementMolette) {
    let facteur;

    if (evenementMolette.deltaY < 0) {
        facteur = 1.025;
    }
    else {
        facteur = 1 / 1.025;
    }

    let nouveauZoom = zoom * facteur;

    appliquerZoom(nouveauZoom, evenementMolette.offsetX, evenementMolette.offsetY);
}

// Modifier le zoom avec le curseur autour du centre du canvas
export function choisirZoom(nouveauZoom) {
    appliquerZoom(nouveauZoom, canvas.width / 2, canvas.height / 2);
}

// Terminer le deplacement du canvas
export function terminerDeplacement() {
    deplacementEnCours = false;
}

// Connaitre l'etat du deplacement
export function estEnDeplacement() {
    return deplacementEnCours;
}

// Recuperer le decalage actuel de la vue
export function obtenirDecalageVue() {
    return {
        x: decalageVueX,
        y: decalageVueY,
        zoom: zoom
    };
}
