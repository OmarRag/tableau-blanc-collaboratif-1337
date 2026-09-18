// Outil de dessin de la ligne

// Creation et mise a jour
export function commencerLigne(x, y, couleur, epaisseur) {
    return {
        type: "ligne",
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        couleur: couleur,
        epaisseur: epaisseur
    };
}

export function mettreAJourLigne(forme, x, y) {
    forme.x2 = x;
    forme.y2 = y;
    return forme;
}

// Dessin de la ligne
export function dessinerLigne(ctx, forme) {
    ctx.strokeStyle = forme.couleur;
    ctx.lineWidth = forme.epaisseur;
    ctx.beginPath();
    ctx.moveTo(forme.x1, forme.y1);
    ctx.lineTo(forme.x2, forme.y2);
    ctx.stroke();
}

// Verifier si un point touche la ligne
export function contientPoint(forme, x, y) {
    let distanceX = forme.x2 - forme.x1;
    let distanceY = forme.y2 - forme.y1;
    let longueur = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (longueur === 0) {
        return false;
    }

    let produitScalaire = (x - forme.x1) * distanceX
        + (y - forme.y1) * distanceY;
    let position = produitScalaire / (longueur * longueur);

    if (position < 0) {
        position = 0;
    }

    if (position > 1) {
        position = 1;
    }

    let pointProcheX = forme.x1 + position * distanceX;
    let pointProcheY = forme.y1 + position * distanceY;
    let ecartX = x - pointProcheX;
    let ecartY = y - pointProcheY;
    let distance = Math.sqrt(ecartX * ecartX + ecartY * ecartY);
    let tolerance = Math.max(8, forme.epaisseur + 4);

    if (distance <= tolerance) {
        return true;
    }

    return false;
}

// Deplacer la ligne
export function deplacer(forme, deplacementX, deplacementY) {
    forme.x1 += deplacementX;
    forme.y1 += deplacementY;
    forme.x2 += deplacementX;
    forme.y2 += deplacementY;
}

// Dessiner le contour de selection
export function dessinerSelection(ctx, forme) {
    let gauche = Math.min(forme.x1, forme.x2);
    let droite = Math.max(forme.x1, forme.x2);
    let haut = Math.min(forme.y1, forme.y2);
    let bas = Math.max(forme.y1, forme.y2);

    ctx.strokeStyle = "#2d6cdf";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(gauche - 6, haut - 6, droite - gauche + 12, bas - haut + 12);
    ctx.setLineDash([]);
}

// La ligne est supprimee quand on touche son contour
export function procheContour(forme, x, y) {
    return contientPoint(forme, x, y);
}
