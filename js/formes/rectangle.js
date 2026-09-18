// Outil de dessin du rectangle

// Creation et mise a jour
export function commencerRectangle(x, y, couleur, epaisseur) {
    return {
        type: "rectangle",
        x: x,
        y: y,
        largeur: 0,
        hauteur: 0,
        couleur: couleur,
        epaisseur: epaisseur,
        angle: 0,
        aRemplir: false,
        couleurRemplissage: null
    };
}

export function mettreAJourRectangle(forme, x, y) {
    forme.largeur = x - forme.x;
    forme.hauteur = y - forme.y;
    return forme;
}

// Dessin du rectangle
export function dessinerRectangle(ctx, forme) {
    let largeur = Math.abs(forme.largeur);
    let hauteur = Math.abs(forme.hauteur);
    let centreX = forme.x + forme.largeur / 2;
    let centreY = forme.y + forme.hauteur / 2;

    ctx.save();
    ctx.translate(centreX, centreY);
    ctx.rotate(forme.angle || 0);
    ctx.strokeStyle = forme.couleur;
    ctx.fillStyle = forme.couleurRemplissage;
    ctx.lineWidth = forme.epaisseur;

    if (forme.aRemplir) {
        ctx.fillRect(-largeur / 2, -hauteur / 2, largeur, hauteur);
    }

    ctx.strokeRect(-largeur / 2, -hauteur / 2, largeur, hauteur);
    ctx.restore();
}

// Transformer un point vers le repere local du rectangle
function obtenirPointLocal(forme, x, y) {
    let centreX = forme.x + forme.largeur / 2;
    let centreY = forme.y + forme.hauteur / 2;
    let angle = -(forme.angle || 0);
    let differenceX = x - centreX;
    let differenceY = y - centreY;

    return {
        x: differenceX * Math.cos(angle) - differenceY * Math.sin(angle),
        y: differenceX * Math.sin(angle) + differenceY * Math.cos(angle)
    };
}

// Tests utilises par les outils
export function contientPoint(forme, x, y) {
    let pointLocal = obtenirPointLocal(forme, x, y);
    let largeur = Math.abs(forme.largeur);
    let hauteur = Math.abs(forme.hauteur);

    if (Math.abs(pointLocal.x) <= largeur / 2
        && Math.abs(pointLocal.y) <= hauteur / 2) {
        return true;
    }

    return false;
}

export function procheContour(forme, x, y) {
    let tolerance = 8;
    let pointLocal = obtenirPointLocal(forme, x, y);
    let largeur = Math.abs(forme.largeur);
    let hauteur = Math.abs(forme.hauteur);
    let dansZoneExterieure = Math.abs(pointLocal.x) <= largeur / 2 + tolerance
        && Math.abs(pointLocal.y) <= hauteur / 2 + tolerance;
    let dansZoneInterieure = Math.abs(pointLocal.x) < largeur / 2 - tolerance
        && Math.abs(pointLocal.y) < hauteur / 2 - tolerance;

    if (dansZoneExterieure && !dansZoneInterieure) {
        return true;
    }

    return false;
}
