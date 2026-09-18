// Outil de dessin libre au crayon

// Creation et mise a jour du chemin
export function commencerCrayon(x, y, couleur, epaisseur) {
    let premierPoint = {
        x: x,
        y: y
    };

    return {
        type: "crayon",
        points: [premierPoint],
        couleur: couleur,
        epaisseur: epaisseur,
        aRemplir: false,
        couleurRemplissage: null
    };
}

export function mettreAJourCrayon(forme, x, y) {
    let nouveauPoint = {
        x: x,
        y: y
    };

    forme.points.push(nouveauPoint);
    return forme;
}

// Dessin du chemin
export function dessinerCrayon(ctx, forme) {
    ctx.strokeStyle = forme.couleur;
    ctx.lineWidth = forme.epaisseur;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (forme.aRemplir) {
        let cheminFerme = estFermee(forme);

        if (cheminFerme) {
            ctx.beginPath();
            ctx.moveTo(forme.points[0].x, forme.points[0].y);

            for (let i = 1; i < forme.points.length; i++) {
                ctx.lineTo(forme.points[i].x, forme.points[i].y);
            }

            ctx.closePath();
            ctx.fillStyle = forme.couleurRemplissage;
            ctx.fill();
            ctx.stroke();
            return;
        }
    }

    // Dessiner tout le chemin en une seule fois
    ctx.beginPath();
    ctx.moveTo(forme.points[0].x, forme.points[0].y);

    for (let i = 1; i < forme.points.length; i++) {
        ctx.lineTo(forme.points[i].x, forme.points[i].y);
    }

    ctx.stroke();
}

// Verification d'un chemin ferme
export function estFermee(forme) {
    if (forme.points.length < 3) {
        return false;
    }

    let premierPoint = forme.points[0];
    let dernierPoint = forme.points[forme.points.length - 1];
    let distanceX = dernierPoint.x - premierPoint.x;
    let distanceY = dernierPoint.y - premierPoint.y;
    let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    let tolerance = Math.max(20, forme.epaisseur * 5);

    return distance <= tolerance;
}

export function contientInterieur(forme, x, y) {
    let dedans = false;

    for (let i = 0, j = forme.points.length - 1; i < forme.points.length; j = i++) {
        let pointA = forme.points[i];
        let pointB = forme.points[j];
        let pointsDePartEtDautre = (pointA.y > y) !== (pointB.y > y);
        let positionDuCroisement = (pointB.x - pointA.x) * (y - pointA.y)
            / (pointB.y - pointA.y) + pointA.x;
        let croisement = pointsDePartEtDautre && x < positionDuCroisement;

        if (croisement) {
            dedans = !dedans;
        }
    }

    return dedans;
}

export function contientPoint(forme, x, y) {
    let tolerance = 8;

    for (let i = 0; i < forme.points.length - 1; i++) {
        let pointDebut = forme.points[i];
        let pointFin = forme.points[i + 1];
        let distanceX = pointFin.x - pointDebut.x;
        let distanceY = pointFin.y - pointDebut.y;
        let longueur = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        if (longueur === 0) {
            continue;
        }

        let produitScalaire = (x - pointDebut.x) * distanceX
            + (y - pointDebut.y) * distanceY;
        let position = produitScalaire / (longueur * longueur);
        position = Math.max(0, Math.min(1, position));

        let pointProcheX = pointDebut.x + position * distanceX;
        let pointProcheY = pointDebut.y + position * distanceY;
        let ecartX = x - pointProcheX;
        let ecartY = y - pointProcheY;
        let distance = Math.sqrt(ecartX * ecartX + ecartY * ecartY);

        if (distance <= tolerance) {
            return true;
        }
    }

    return false;
}

// Deplacement du chemin
export function deplacer(forme, deplacementX, deplacementY) {
    for (let i = 0; i < forme.points.length; i++) {
        forme.points[i].x += deplacementX;
        forme.points[i].y += deplacementY;
    }
}

export function dessinerSelection(ctx, forme) {
    let minX = forme.points[0].x;
    let maxX = forme.points[0].x;
    let minY = forme.points[0].y;
    let maxY = forme.points[0].y;

    for (let i = 1; i < forme.points.length; i++) {
        minX = Math.min(minX, forme.points[i].x);
        maxX = Math.max(maxX, forme.points[i].x);
        minY = Math.min(minY, forme.points[i].y);
        maxY = Math.max(maxY, forme.points[i].y);
    }

    ctx.strokeStyle = "#2d6cdf";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
    ctx.setLineDash([]);
}
