// Outil de dessin de la fleche

// Creation de la fleche
export function commencerFleche(x, y, couleur, epaisseur) {
    return {
        type: "fleche",
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        couleur: couleur,
        epaisseur: epaisseur
    };
}

// Mise a jour de la fleche pendant le dessin
export function mettreAJourFleche(forme, x, y) {
    forme.x2 = x;
    forme.y2 = y;
    return forme;
}

// Calculer une taille de pointe proportionnelle a l'epaisseur
function obtenirTaillePointe(forme) {
    let taillePointe = forme.epaisseur * 4;

    if (taillePointe < 10) {
        taillePointe = 10;
    }

    let distanceX = forme.x2 - forme.x1;
    let distanceY = forme.y2 - forme.y1;
    let longueurFleche = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (taillePointe > longueurFleche) {
        taillePointe = longueurFleche / 2;
    }

    return taillePointe;
}

// Dessiner la fleche
export function dessinerFleche(ctx, forme) {
    let angle = Math.atan2(forme.y2 - forme.y1, forme.x2 - forme.x1);
    let taillePointe = obtenirTaillePointe(forme);

    let centrePointeX = forme.x2 - (taillePointe / 2) * Math.cos(angle);
    let centrePointeY = forme.y2 - (taillePointe / 2) * Math.sin(angle);

    ctx.strokeStyle = forme.couleur;
    ctx.fillStyle = forme.couleur;
    ctx.lineWidth = forme.epaisseur;

    // Dessiner le trait jusqu'au centre de la pointe
    ctx.beginPath();
    ctx.moveTo(forme.x1, forme.y1);
    ctx.lineTo(centrePointeX, centrePointeY);
    ctx.stroke();

    // Dessiner le triangle de la pointe
    ctx.beginPath();
    ctx.moveTo(forme.x2, forme.y2);

    let pointeGaucheX = forme.x2 - taillePointe * Math.cos(angle - Math.PI / 6);
    let pointeGaucheY = forme.y2 - taillePointe * Math.sin(angle - Math.PI / 6);
    let pointeDroiteX = forme.x2 - taillePointe * Math.cos(angle + Math.PI / 6);
    let pointeDroiteY = forme.y2 - taillePointe * Math.sin(angle + Math.PI / 6);

    ctx.lineTo(pointeGaucheX, pointeGaucheY);
    ctx.lineTo(pointeDroiteX, pointeDroiteY);
    ctx.closePath();
    ctx.fill();
}

// Calculer la distance entre un point et un segment
function distancePointSegment(x, y, debutX, debutY, finX, finY) {
    let distanceX = finX - debutX;
    let distanceY = finY - debutY;
    let longueurCarree = distanceX * distanceX + distanceY * distanceY;

    if (longueurCarree === 0) {
        let ecartX = x - debutX;
        let ecartY = y - debutY;
        return Math.sqrt(ecartX * ecartX + ecartY * ecartY);
    }

    let produitScalaire = (x - debutX) * distanceX
        + (y - debutY) * distanceY;
    let position = produitScalaire / longueurCarree;

    if (position < 0) {
        position = 0;
    }

    if (position > 1) {
        position = 1;
    }

    let pointProcheX = debutX + position * distanceX;
    let pointProcheY = debutY + position * distanceY;
    let ecartX = x - pointProcheX;
    let ecartY = y - pointProcheY;

    return Math.sqrt(ecartX * ecartX + ecartY * ecartY);
}

// Verifier si un point touche la fleche ou sa pointe
export function contientPoint(forme, x, y) {
    if (forme.x1 === forme.x2 && forme.y1 === forme.y2) {
        return false;
    }

    let tolerance = forme.epaisseur + 4;
    let taillePointe = obtenirTaillePointe(forme);

    if (tolerance < 8) {
        tolerance = 8;
    }

    // Une zone plus large est utilisee autour de la pointe triangulaire
    let tolerancePointe = tolerance + taillePointe / 2;
    let distance = distancePointSegment(x, y, forme.x1, forme.y1, forme.x2, forme.y2);

    if (distance <= tolerancePointe) {
        return true;
    }

    return false;
}

// Deplacer la fleche
export function deplacer(forme, deplacementX, deplacementY) {
    forme.x1 += deplacementX;
    forme.y1 += deplacementY;
    forme.x2 += deplacementX;
    forme.y2 += deplacementY;
}

// Dessiner le contour de selection
export function dessinerSelection(ctx, forme) {
    let taillePointe = obtenirTaillePointe(forme);
    let marge = taillePointe + 6;
    let gauche = Math.min(forme.x1, forme.x2) - marge;
    let droite = Math.max(forme.x1, forme.x2) + marge;
    let haut = Math.min(forme.y1, forme.y2) - marge;
    let bas = Math.max(forme.y1, forme.y2) + marge;

    ctx.strokeStyle = "#2d6cdf";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(gauche, haut, droite - gauche, bas - haut);
    ctx.setLineDash([]);
}

// La fleche est supprimee quand on touche son trait ou sa pointe
export function procheContour(forme, x, y) {
    return contientPoint(forme, x, y);
}
