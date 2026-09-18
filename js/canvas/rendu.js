import { canvas, ctx } from "../canvas.js";
import { dessinerCadreSelection } from "../outils/selection.js";

// Dessiner les zones effacees d'une forme
function dessinerEffacements(forme) {
    if (!forme.effacements) {
        return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";

    for (let i = 0; i < forme.effacements.length; i++) {
        let effacement = forme.effacements[i];
        ctx.beginPath();
        ctx.arc(effacement.x, effacement.y, effacement.taille, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Effacer puis redessiner tout le canvas
export function redessiner(
    formesDessinees,
    formeEnCours,
    formeSelectionnee,
    formes,
    decalageVueX,
    decalageVueY,
    zoom,
    apercusDistants
) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(decalageVueX, decalageVueY);
    ctx.scale(zoom, zoom);

    if (!Array.isArray(apercusDistants)) {
        apercusDistants = [];
    }

    let identifiantsApercus = new Set();

    for (const apercu of apercusDistants) {
        if (apercu.id) {
            identifiantsApercus.add(apercu.id);
        }
    }

    for (const forme of formesDessinees) {
        // L'apercu remplace visuellement la version precedente de la forme.
        if (identifiantsApercus.has(forme.id)) {
            continue;
        }

        if (formes[forme.type]) {
            formes[forme.type].dessiner(ctx, forme);
            dessinerEffacements(forme);
        }
    }

    if (formeEnCours) {
        if (formes[formeEnCours.type]) {
            formes[formeEnCours.type].dessiner(ctx, formeEnCours);
        }
    }

    // Dessiner les formes que les autres utilisateurs sont en train de tracer
    for (const apercu of apercusDistants) {
        if (formes[apercu.type]) {
            formes[apercu.type].dessiner(ctx, apercu);
        }
    }

    if (formeSelectionnee) {
        dessinerCadreSelection(ctx, formeSelectionnee);
    }
}
