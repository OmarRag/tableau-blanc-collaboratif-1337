// Outil de dessin du cercle

// Creation et mise a jour
export function commencerCercle(x, y, couleur, epaisseur) {
    return {
        type: "cercle",
        x: x,
        y: y,
        rayon: 0,
        couleur: couleur,
        epaisseur: epaisseur,
        angle: 0,
        aRemplir: false,
        couleurRemplissage: null
    };
}
export function mettreAJourCercle(forme, x, y) {
    let dx = x - forme.x;
    let dy = y - forme.y;
    forme.rayon = Math.sqrt(dx * dx + dy * dy);
    return forme;
}
// Dessin du cercle
export function dessinerCercle(ctx, forme) {
    ctx.strokeStyle = forme.couleur;
    ctx.lineWidth = forme.epaisseur;
    ctx.beginPath();
    ctx.arc(forme.x, forme.y, forme.rayon, 0, Math.PI * 2);

    if (forme.aRemplir) {
        ctx.fillStyle = forme.couleurRemplissage;
        ctx.fill();
    }

    ctx.stroke();
}

// Tests utilises par les outils
export function contientPoint(forme, x, y) {
    let distanceX = x - forme.x;
    let distanceY = y - forme.y;
    let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (distance <= forme.rayon) {
        return true;
    }

    return false;
}

export function dessinerSelection(ctx, forme) {
    ctx.strokeStyle = "#2d6cdf";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(forme.x, forme.y, forme.rayon + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
}

export function procheContour(forme, x, y) {
    let distanceX = x - forme.x;
    let distanceY = y - forme.y;
    let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (Math.abs(distance - forme.rayon) <= 8) {
        return true;
    }

    return false;
}
