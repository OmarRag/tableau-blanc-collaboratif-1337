// Outil de dessin et de saisie du texte
import { canvas } from "../canvas.js";

// Creation et mise a jour de la zone texte
export function commencerTexte(x, y, couleur, epaisseur) {
    return {
        type: "texte",
        x: x,
        y: y,
        largeur: 0,
        hauteur: 0,
        couleur: couleur,
        epaisseur: epaisseur,
        taillePolice: 20,
        angle: 0
    };
}

export function mettreAJourTexte(forme, x, y) {
    forme.largeur = x - forme.x;
    forme.hauteur = y - forme.y;
    return forme;
}

// Apercu ou dessin du texte final
export function dessinerTexte(ctx, forme) {
    if (!forme.texte) {
        let x = Math.min(forme.x, forme.x + forme.largeur);
        let y = Math.min(forme.y, forme.y + forme.hauteur);
        let largeur = Math.abs(forme.largeur);
        let hauteur = Math.abs(forme.hauteur);

        ctx.strokeStyle = "gray";
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, largeur, hauteur);
        ctx.setLineDash([]);

        return;
    }

    let taillePolice = forme.taillePolice || 20;
    ctx.fillStyle = forme.couleur;
    ctx.font = taillePolice + "px Arial";
    let lignes = forme.texte.split("\n");
    let largeurTexte = obtenirLargeurTexte(ctx, lignes);
    let hauteurTexte = lignes.length * taillePolice * 1.2;
    let centreX = forme.x + largeurTexte / 2;
    let centreY = forme.y - taillePolice + hauteurTexte / 2;

    ctx.save();
    ctx.translate(centreX, centreY);
    ctx.rotate(forme.angle || 0);

    lignes.forEach(function(ligne, index) {
        let positionY = -hauteurTexte / 2 + taillePolice
            + index * taillePolice * 1.2;
        ctx.fillText(ligne, -largeurTexte / 2, positionY);
    });

    ctx.restore();
}

// Calculer la largeur de la ligne de texte la plus longue
function obtenirLargeurTexte(ctx, lignes) {
    let largeurTexte = 0;

    for (let i = 0; i < lignes.length; i++) {
        largeurTexte = Math.max(largeurTexte, ctx.measureText(lignes[i]).width);
    }

    return largeurTexte;
}

// Transformer la position de la souris vers le texte non tourne
function obtenirPointLocal(forme, x, y, ctx) {
    let taillePolice = forme.taillePolice || 20;
    ctx.font = taillePolice + "px Arial";
    let lignes = forme.texte.split("\n");
    let largeurTexte = obtenirLargeurTexte(ctx, lignes);
    let hauteurTexte = lignes.length * taillePolice * 1.2;
    let centreX = forme.x + largeurTexte / 2;
    let centreY = forme.y - taillePolice + hauteurTexte / 2;
    let angle = -(forme.angle || 0);
    let differenceX = x - centreX;
    let differenceY = y - centreY;

    return {
        x: differenceX * Math.cos(angle) - differenceY * Math.sin(angle)
            + centreX,
        y: differenceX * Math.sin(angle) + differenceY * Math.cos(angle)
            + centreY
    };
}

// Creer temporairement la zone de saisie HTML
export function terminerTexte(forme, ajouterForme, decalageVue) {
    let largeur = Math.abs(forme.largeur);
    let hauteur = Math.abs(forme.hauteur);
    let texteX = Math.min(forme.x, forme.x + forme.largeur);
    let texteY = Math.min(forme.y, forme.y + forme.hauteur);
    let positionCanvas = canvas.getBoundingClientRect();
    let decalageX = 0;
    let decalageY = 0;
    let zoom = 1;

    if (decalageVue) {
        decalageX = decalageVue.x;
        decalageY = decalageVue.y;

        if (decalageVue.zoom) {
            zoom = decalageVue.zoom;
        }
    }

    if (largeur < 30) {
        return;
    }

    if (hauteur < 20) {
        return;
    }

    let zone = document.createElement("textarea");
    // getBoundingClientRect() donne une position relative à la fenêtre.
    // fixed utilise le même repère et évite un décalage de la zone texte.
    zone.style.position = "fixed";
    zone.style.left = positionCanvas.left + decalageX + texteX * zoom + "px";
    zone.style.top = positionCanvas.top + decalageY + texteY * zoom + "px";
    zone.style.width = (largeur - 4) * zoom + "px";
    zone.style.height = (hauteur - 4) * zoom + "px";
    zone.style.border = "1px dashed gray";
    zone.style.outline = "none";
    zone.style.padding = 6 * zoom + "px";
    zone.style.background = "transparent";
    zone.style.font = 20 * zoom + "px Arial";
    zone.style.resize = "none";
    zone.style.boxSizing = "border-box";

    document.body.appendChild(zone);
    zone.focus();

    zone.addEventListener("blur", function() {
        if (zone.value.trim() !== "") {
            ajouterForme({
                id: forme.id,
                type: "texte",
                x: texteX + 6,
                y: texteY + 26,
                largeur: largeur,
                hauteur: hauteur,
                texte: zone.value,
                couleur: forme.couleur,
                epaisseur: forme.epaisseur,
                taillePolice: 20,
                angle: 0
            });
        }

        zone.remove();
    }, {
        once: true
    });
}

// Tests utilises par la selection et la gomme
export function contientPoint(forme, x, y, ctx) {
    let taillePolice = forme.taillePolice || 20;
    ctx.font = taillePolice + "px Arial";

    let lignes = forme.texte.split("\n");
    let largeurTexte = obtenirLargeurTexte(ctx, lignes);

    let hauteurTexte = lignes.length * taillePolice * 1.2;
    let pointLocal = obtenirPointLocal(forme, x, y, ctx);

    if (pointLocal.x >= forme.x
        && pointLocal.x <= forme.x + largeurTexte
        && pointLocal.y >= forme.y - taillePolice
        && pointLocal.y <= forme.y - taillePolice + hauteurTexte) {
        return true;
    }

    return false;
}

export function dessinerSelection(ctx, forme) {
    let taillePolice = forme.taillePolice || 20;
    ctx.font = taillePolice + "px Arial";

    let lignes = forme.texte.split("\n");
    let largeurTexte = obtenirLargeurTexte(ctx, lignes);

    let hauteurTexte = lignes.length * taillePolice * 1.2;
    ctx.strokeStyle = "#2d6cdf";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(forme.x - 4, forme.y - taillePolice - 4, largeurTexte + 8, hauteurTexte + 8);
    ctx.setLineDash([]);
}

export function procheContour(forme, x, y, ctx) {
    let taillePolice = forme.taillePolice || 20;
    ctx.font = taillePolice + "px Arial";

    let lignes = forme.texte.split("\n");
    let largeurTexte = obtenirLargeurTexte(ctx, lignes);

    let hauteurTexte = lignes.length * taillePolice * 1.2;
    let tolerance = 8;
    let pointLocal = obtenirPointLocal(forme, x, y, ctx);
    let gauche = forme.x;
    let droite = forme.x + largeurTexte;
    let haut = forme.y - taillePolice;
    let bas = haut + hauteurTexte;

    let dansZoneExterieure = false;
    let dansZoneInterieure = false;

    if (pointLocal.x >= gauche - tolerance && pointLocal.x <= droite + tolerance
        && pointLocal.y >= haut - tolerance && pointLocal.y <= bas + tolerance) {
        dansZoneExterieure = true;
    }

    if (pointLocal.x > gauche + tolerance && pointLocal.x < droite - tolerance
        && pointLocal.y > haut + tolerance && pointLocal.y < bas - tolerance) {
        dansZoneInterieure = true;
    }

    if (dansZoneExterieure && !dansZoneInterieure) {
        return true;
    }

    return false;
}
