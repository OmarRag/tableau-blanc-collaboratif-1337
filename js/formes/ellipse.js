// Outil de dessin de l'ellipse

// Creation et mise a jour
export function commencerEllipse(x, y, couleur, epaisseur) {
    return {
        type: "ellipse",
        x: x,
        y: y,
        rayonX: 0,
        rayonY: 0,
        couleur: couleur,
        epaisseur: epaisseur,
        angle: 0,
        aRemplir: false,
        couleurRemplissage: null
    };
}

export function mettreAJourEllipse(forme, x, y) {
    forme.rayonX = Math.abs(x - forme.x);
    forme.rayonY = Math.abs(y - forme.y);
    return forme;
}

// Dessin de l'ellipse
export function dessinerEllipse(ctx, forme) {
    ctx.save();
    ctx.translate(forme.x, forme.y);
    ctx.rotate(forme.angle || 0);
    ctx.strokeStyle = forme.couleur;
    ctx.lineWidth = forme.epaisseur;
    ctx.beginPath();
    ctx.ellipse(0, 0, forme.rayonX, forme.rayonY, 0, 0, Math.PI * 2);

    if (forme.aRemplir) {
        ctx.fillStyle = forme.couleurRemplissage;
        ctx.fill();
    }

    ctx.stroke();
    ctx.restore();
}

// Transformer un point vers le repere local de l'ellipse
function obtenirPointLocal(forme, x, y) {
    let angle = -(forme.angle || 0);
    let differenceX = x - forme.x;
    let differenceY = y - forme.y;

    return {
        x: differenceX * Math.cos(angle) - differenceY * Math.sin(angle),
        y: differenceX * Math.sin(angle) + differenceY * Math.cos(angle)
    };
}

export function contientPoint(forme, x, y) {
    if (forme.rayonX === 0) {
        return false;
    }

    if (forme.rayonY === 0) {
        return false;
    }

    let pointLocal = obtenirPointLocal(forme, x, y);
    let distanceX = pointLocal.x;
    let distanceY = pointLocal.y;
    let positionX = (distanceX * distanceX) / (forme.rayonX * forme.rayonX);
    let positionY = (distanceY * distanceY) / (forme.rayonY * forme.rayonY);
    let position = positionX + positionY;

    if (position <= 1) {
        return true;
    }

    return false;
}

export function dessinerSelection(ctx, forme) {
    ctx.strokeStyle = "#2d6cdf";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(forme.x, forme.y, forme.rayonX + 4, forme.rayonY + 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
}

export function procheContour(forme, x, y) {
    if (forme.rayonX === 0) {
        return false;
    }

    if (forme.rayonY === 0) {
        return false;
    }

    let pointLocal = obtenirPointLocal(forme, x, y);
    let distanceX = pointLocal.x;
    let distanceY = pointLocal.y;
    let positionX = (distanceX * distanceX) / (forme.rayonX * forme.rayonX);
    let positionY = (distanceY * distanceY) / (forme.rayonY * forme.rayonY);
    let position = positionX + positionY;

    if (Math.abs(position - 1) <= 0.2) {
        return true;
    }

    return false;
}
