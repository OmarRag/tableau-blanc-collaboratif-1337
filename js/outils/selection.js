// Etat de la selection et du deplacement d'une forme
let formeSelectionnee = null;
let decalageX = 0;
let decalageY = 0;
let actionEnCours = null;
let formeAvantRedimensionnement = null;
let cadreAvantRedimensionnement = null;
let poigneeUtilisee = null;
let angleAvantRotation = 0;
let angleSourisAuDepart = 0;
let centreRotation = null;
let formeAvantRotation = null;

// Copier une forme avant de commencer son redimensionnement
function copierForme(forme) {
    return JSON.parse(JSON.stringify(forme));
}

// Deplacer aussi les marques d'effacement liees a la forme
function deplacerEffacements(forme, deplacementX, deplacementY) {
    if (!forme.effacements) {
        return;
    }

    for (let i = 0; i < forme.effacements.length; i++) {
        forme.effacements[i].x += deplacementX;
        forme.effacements[i].y += deplacementY;
    }
}

// Recuperer le point de depart de chaque forme
function obtenirPointDeDepart(forme) {
    if (forme.type === "fleche" || forme.type === "ligne") {
        return {
            x: forme.x1,
            y: forme.y1
        };
    }

    if (forme.type === "crayon") {
        return {
            x: forme.points[0].x,
            y: forme.points[0].y
        };
    }

    return {
        x: forme.x,
        y: forme.y
    };
}

// Obtenir le rectangle qui entoure une forme
export function obtenirCadre(forme, ctx) {
    if (forme.type === "rectangle") {
        let centreX = forme.x + forme.largeur / 2;
        let centreY = forme.y + forme.hauteur / 2;
        let demiLargeur = Math.abs(forme.largeur) / 2;
        let demiHauteur = Math.abs(forme.hauteur) / 2;
        let angle = forme.angle || 0;
        let largeurCadre = Math.sqrt(
            demiLargeur * demiLargeur * Math.cos(angle) * Math.cos(angle)
            + demiHauteur * demiHauteur * Math.sin(angle) * Math.sin(angle)
        ) * 2;
        let hauteurCadre = Math.sqrt(
            demiLargeur * demiLargeur * Math.sin(angle) * Math.sin(angle)
            + demiHauteur * demiHauteur * Math.cos(angle) * Math.cos(angle)
        ) * 2;

        return {
            gauche: centreX - largeurCadre / 2,
            haut: centreY - hauteurCadre / 2,
            droite: centreX + largeurCadre / 2,
            bas: centreY + hauteurCadre / 2
        };
    }

    if (forme.type === "cercle") {
        return {
            gauche: forme.x - forme.rayon,
            haut: forme.y - forme.rayon,
            droite: forme.x + forme.rayon,
            bas: forme.y + forme.rayon
        };
    }

    if (forme.type === "ellipse") {
        let angle = forme.angle || 0;
        let largeurCadre = Math.sqrt(
            forme.rayonX * forme.rayonX * Math.cos(angle) * Math.cos(angle)
            + forme.rayonY * forme.rayonY * Math.sin(angle) * Math.sin(angle)
        );
        let hauteurCadre = Math.sqrt(
            forme.rayonX * forme.rayonX * Math.sin(angle) * Math.sin(angle)
            + forme.rayonY * forme.rayonY * Math.cos(angle) * Math.cos(angle)
        );

        return {
            gauche: forme.x - largeurCadre,
            haut: forme.y - hauteurCadre,
            droite: forme.x + largeurCadre,
            bas: forme.y + hauteurCadre
        };
    }

    if (forme.type === "ligne" || forme.type === "fleche") {
        return {
            gauche: Math.min(forme.x1, forme.x2),
            haut: Math.min(forme.y1, forme.y2),
            droite: Math.max(forme.x1, forme.x2),
            bas: Math.max(forme.y1, forme.y2)
        };
    }

    if (forme.type === "crayon") {
        let gauche = forme.points[0].x;
        let droite = forme.points[0].x;
        let haut = forme.points[0].y;
        let bas = forme.points[0].y;

        for (let i = 1; i < forme.points.length; i++) {
            gauche = Math.min(gauche, forme.points[i].x);
            droite = Math.max(droite, forme.points[i].x);
            haut = Math.min(haut, forme.points[i].y);
            bas = Math.max(bas, forme.points[i].y);
        }

        return { gauche, haut, droite, bas };
    }

    if (forme.type === "texte") {
        let taillePolice = forme.taillePolice || 20;
        ctx.font = taillePolice + "px Arial";
        let lignes = forme.texte.split("\n");
        let largeur = 0;

        for (let i = 0; i < lignes.length; i++) {
            largeur = Math.max(largeur, ctx.measureText(lignes[i]).width);
        }

        let hauteur = lignes.length * taillePolice * 1.2;
        let centreX = forme.x + largeur / 2;
        let centreY = forme.y - taillePolice + hauteur / 2;
        let angle = forme.angle || 0;
        let demiLargeur = largeur / 2;
        let demiHauteur = hauteur / 2;
        let largeurCadre = Math.sqrt(
            demiLargeur * demiLargeur * Math.cos(angle) * Math.cos(angle)
            + demiHauteur * demiHauteur * Math.sin(angle) * Math.sin(angle)
        );
        let hauteurCadre = Math.sqrt(
            demiLargeur * demiLargeur * Math.sin(angle) * Math.sin(angle)
            + demiHauteur * demiHauteur * Math.cos(angle) * Math.cos(angle)
        );

        return {
            gauche: centreX - largeurCadre,
            haut: centreY - hauteurCadre,
            droite: centreX + largeurCadre,
            bas: centreY + hauteurCadre
        };
    }

    return null;
}

// Obtenir les positions des huit poignees du cadre
function obtenirPoignees(cadre) {
    let milieuX = (cadre.gauche + cadre.droite) / 2;
    let milieuY = (cadre.haut + cadre.bas) / 2;

    return [
        { nom: "hautGauche", x: cadre.gauche, y: cadre.haut },
        { nom: "haut", x: milieuX, y: cadre.haut },
        { nom: "hautDroite", x: cadre.droite, y: cadre.haut },
        { nom: "droite", x: cadre.droite, y: milieuY },
        { nom: "basDroite", x: cadre.droite, y: cadre.bas },
        { nom: "bas", x: milieuX, y: cadre.bas },
        { nom: "basGauche", x: cadre.gauche, y: cadre.bas },
        { nom: "gauche", x: cadre.gauche, y: milieuY }
    ];
}

// Trouver une poignee proche du clic
function trouverPoignee(forme, x, y, ctx) {
    let cadre = obtenirCadre(forme, ctx);

    if (!cadre) {
        return null;
    }

    let poignees = obtenirPoignees(cadre);
    let tolerance = 10;

    for (let i = 0; i < poignees.length; i++) {
        let poignee = poignees[i];
        let procheHorizontalement = Math.abs(x - poignee.x) <= tolerance;
        let procheVerticalement = Math.abs(y - poignee.y) <= tolerance;

        if (procheHorizontalement && procheVerticalement) {
            return poignee.nom;
        }
    }

    return null;
}

// Trouver la poignee de rotation au-dessus du cadre
function trouverPoigneeRotation(forme, x, y, ctx) {
    if (forme.type === "remplissagePixels") {
        return false;
    }

    let cadre = obtenirCadre(forme, ctx);
    let centreX = (cadre.gauche + cadre.droite) / 2;
    let rotationY = cadre.haut - 30;
    let distanceX = x - centreX;
    let distanceY = y - rotationY;
    let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (distance <= 10) {
        return true;
    }

    return false;
}

// Dessiner le cadre et les poignees de redimensionnement
export function dessinerCadreSelection(ctx, forme) {
    let cadre = obtenirCadre(forme, ctx);

    if (!cadre) {
        return;
    }

    let marge = 6;
    let largeur = cadre.droite - cadre.gauche;
    let hauteur = cadre.bas - cadre.haut;

    ctx.strokeStyle = "#2d6cdf";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
        cadre.gauche - marge,
        cadre.haut - marge,
        largeur + marge * 2,
        hauteur + marge * 2
    );
    ctx.setLineDash([]);

    let poignees = obtenirPoignees(cadre);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "#2d6cdf";

    for (let i = 0; i < poignees.length; i++) {
        let poignee = poignees[i];
        ctx.fillRect(poignee.x - 4, poignee.y - 4, 8, 8);
        ctx.strokeRect(poignee.x - 4, poignee.y - 4, 8, 8);
    }

    if (forme.type !== "remplissagePixels") {
        // Poignee speciale pour tourner la forme
        let centreX = (cadre.gauche + cadre.droite) / 2;
        let rotationY = cadre.haut - 30;
        ctx.beginPath();
        ctx.moveTo(centreX, cadre.haut);
        ctx.lineTo(centreX, rotationY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centreX, rotationY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

// Calculer le nouveau cadre selon la poignee deplacee
function obtenirNouveauCadre(cadre, poignee, x, y) {
    let nouveauCadre = {
        gauche: cadre.gauche,
        haut: cadre.haut,
        droite: cadre.droite,
        bas: cadre.bas
    };
    let tailleMinimum = 5;

    if (poignee.includes("Gauche")) {
        nouveauCadre.gauche = Math.min(x, cadre.droite - tailleMinimum);
    }

    if (poignee === "haut" || poignee.includes("haut")) {
        nouveauCadre.haut = Math.min(y, cadre.bas - tailleMinimum);
    }

    if (poignee.includes("Droite") || poignee === "droite") {
        nouveauCadre.droite = Math.max(x, cadre.gauche + tailleMinimum);
    }

    if (poignee.includes("bas") || poignee === "bas") {
        nouveauCadre.bas = Math.max(y, cadre.haut + tailleMinimum);
    }

    return nouveauCadre;
}

// Transformer un point d'un ancien cadre vers un nouveau cadre
function transformerPoint(point, ancienCadre, nouveauCadre) {
    let largeurAncienne = ancienCadre.droite - ancienCadre.gauche;
    let hauteurAncienne = ancienCadre.bas - ancienCadre.haut;
    let positionX = 0;
    let positionY = 0;

    if (largeurAncienne !== 0) {
        positionX = (point.x - ancienCadre.gauche) / largeurAncienne;
    }

    if (hauteurAncienne !== 0) {
        positionY = (point.y - ancienCadre.haut) / hauteurAncienne;
    }

    return {
        x: nouveauCadre.gauche
            + positionX * (nouveauCadre.droite - nouveauCadre.gauche),
        y: nouveauCadre.haut
            + positionY * (nouveauCadre.bas - nouveauCadre.haut)
    };
}

// Redimensionner les marques d'effacement d'une forme
function redimensionnerEffacements(forme, ancienneForme, ancienCadre, nouveauCadre) {
    if (!ancienneForme.effacements) {
        return;
    }

    forme.effacements = [];
    let largeurAncienne = ancienCadre.droite - ancienCadre.gauche;
    let largeurNouvelle = nouveauCadre.droite - nouveauCadre.gauche;
    let facteur = 1;

    if (largeurAncienne !== 0) {
        facteur = largeurNouvelle / largeurAncienne;
    }

    for (let i = 0; i < ancienneForme.effacements.length; i++) {
        let ancienEffacement = ancienneForme.effacements[i];
        let nouvelEffacement = transformerPoint(
            ancienEffacement,
            ancienCadre,
            nouveauCadre
        );

        forme.effacements.push({
            x: nouvelEffacement.x,
            y: nouvelEffacement.y,
            taille: ancienEffacement.taille * Math.abs(facteur)
        });
    }
}

// Appliquer le nouveau cadre aux differents types de formes
function redimensionnerForme(forme, ancienneForme, ancienCadre, nouveauCadre) {
    if (forme.type === "rectangle") {
        forme.x = nouveauCadre.gauche;
        forme.y = nouveauCadre.haut;
        forme.largeur = nouveauCadre.droite - nouveauCadre.gauche;
        forme.hauteur = nouveauCadre.bas - nouveauCadre.haut;
    }

    else if (forme.type === "cercle") {
        let largeur = nouveauCadre.droite - nouveauCadre.gauche;
        let hauteur = nouveauCadre.bas - nouveauCadre.haut;
        let rayon = Math.min(largeur, hauteur) / 2;

        forme.x = (nouveauCadre.gauche + nouveauCadre.droite) / 2;
        forme.y = (nouveauCadre.haut + nouveauCadre.bas) / 2;
        forme.rayon = rayon;
    }

    else if (forme.type === "ellipse") {
        forme.x = (nouveauCadre.gauche + nouveauCadre.droite) / 2;
        forme.y = (nouveauCadre.haut + nouveauCadre.bas) / 2;
        forme.rayonX = (nouveauCadre.droite - nouveauCadre.gauche) / 2;
        forme.rayonY = (nouveauCadre.bas - nouveauCadre.haut) / 2;
    }

    else if (forme.type === "ligne" || forme.type === "fleche") {
        let premierPoint = transformerPoint(
            { x: ancienneForme.x1, y: ancienneForme.y1 },
            ancienCadre,
            nouveauCadre
        );
        let deuxiemePoint = transformerPoint(
            { x: ancienneForme.x2, y: ancienneForme.y2 },
            ancienCadre,
            nouveauCadre
        );

        forme.x1 = premierPoint.x;
        forme.y1 = premierPoint.y;
        forme.x2 = deuxiemePoint.x;
        forme.y2 = deuxiemePoint.y;
    }

    else if (forme.type === "crayon") {
        forme.points = [];

        for (let i = 0; i < ancienneForme.points.length; i++) {
            forme.points.push(transformerPoint(
                ancienneForme.points[i],
                ancienCadre,
                nouveauCadre
            ));
        }
    }

    else if (forme.type === "texte") {
        let ancienneLargeur = ancienCadre.droite - ancienCadre.gauche;
        let nouvelleLargeur = nouveauCadre.droite - nouveauCadre.gauche;
        let ancienneTaille = ancienneForme.taillePolice || 20;

        if (ancienneLargeur !== 0) {
            forme.taillePolice = Math.max(
                8,
                ancienneTaille * nouvelleLargeur / ancienneLargeur
            );
        }

        forme.x = nouveauCadre.gauche;
        forme.y = nouveauCadre.haut + forme.taillePolice;
    }

    redimensionnerEffacements(
        forme,
        ancienneForme,
        ancienCadre,
        nouveauCadre
    );
}

// Tourner un point autour du centre de la forme
function tournerPoint(point, centre, angle) {
    let differenceX = point.x - centre.x;
    let differenceY = point.y - centre.y;

    return {
        x: centre.x + differenceX * Math.cos(angle)
            - differenceY * Math.sin(angle),
        y: centre.y + differenceX * Math.sin(angle)
            + differenceY * Math.cos(angle)
    };
}

// Appliquer une rotation aux formes qui sont composees de points
function tournerForme(forme, ancienneForme, centre, angle) {
    if (forme.type === "ligne" || forme.type === "fleche") {
        let premierPoint = tournerPoint(
            { x: ancienneForme.x1, y: ancienneForme.y1 },
            centre,
            angle
        );
        let deuxiemePoint = tournerPoint(
            { x: ancienneForme.x2, y: ancienneForme.y2 },
            centre,
            angle
        );

        forme.x1 = premierPoint.x;
        forme.y1 = premierPoint.y;
        forme.x2 = deuxiemePoint.x;
        forme.y2 = deuxiemePoint.y;
    }

    if (forme.type === "crayon") {
        forme.points = [];

        for (let i = 0; i < ancienneForme.points.length; i++) {
            forme.points.push(tournerPoint(
                ancienneForme.points[i],
                centre,
                angle
            ));
        }
    }

    if (forme.type === "texte") {
        forme.angle = (ancienneForme.angle || 0) + angle;
    }
}

// Chercher la forme sous le clic et memoriser l'action a effectuer
export function commencerSelection(formesDessinees, formes, x, y, ctx) {
    actionEnCours = null;

    if (formeSelectionnee) {
        if (trouverPoigneeRotation(formeSelectionnee, x, y, ctx)) {
            let cadre = obtenirCadre(formeSelectionnee, ctx);
            centreRotation = {
                x: (cadre.gauche + cadre.droite) / 2,
                y: (cadre.haut + cadre.bas) / 2
            };
            angleAvantRotation = formeSelectionnee.angle || 0;
            angleSourisAuDepart = Math.atan2(
                y - centreRotation.y,
                x - centreRotation.x
            );
            formeAvantRotation = copierForme(formeSelectionnee);
            actionEnCours = "tourner";
            return;
        }

        let poignee = trouverPoignee(formeSelectionnee, x, y, ctx);

        if (poignee) {
            actionEnCours = "redimensionner";
            poigneeUtilisee = poignee;
            formeAvantRedimensionnement = copierForme(formeSelectionnee);
            cadreAvantRedimensionnement = obtenirCadre(formeSelectionnee, ctx);
            return;
        }

        let outilFormeSelectionnee = formes[formeSelectionnee.type];

        if (outilFormeSelectionnee && outilFormeSelectionnee.contientPoint
            && outilFormeSelectionnee.contientPoint(formeSelectionnee, x, y, ctx)) {
            let pointDeDepart = obtenirPointDeDepart(formeSelectionnee);
            decalageX = x - pointDeDepart.x;
            decalageY = y - pointDeDepart.y;
            actionEnCours = "deplacer";
            return;
        }
    }

    formeSelectionnee = null;

    for (let i = formesDessinees.length - 1; i >= 0; i--) {
        let forme = formesDessinees[i];
        let outilForme = formes[forme.type];

        if (!outilForme || !outilForme.contientPoint) {
            continue;
        }

        if (outilForme.contientPoint(forme, x, y, ctx)) {
            formeSelectionnee = forme;
            let pointDeDepart = obtenirPointDeDepart(forme);
            decalageX = x - pointDeDepart.x;
            decalageY = y - pointDeDepart.y;
            actionEnCours = "deplacer";
            break;
        }
    }
}

// Deplacer ou redimensionner la forme pendant le mouvement de la souris
export function mettreAJourSelection(formes, x, y) {
    if (!formeSelectionnee || !actionEnCours) {
        return;
    }

    if (actionEnCours === "tourner") {
        let angleSouris = Math.atan2(
            y - centreRotation.y,
            x - centreRotation.x
        );
        let differenceAngle = angleSouris - angleSourisAuDepart;
        if (formeSelectionnee.type === "rectangle"
            || formeSelectionnee.type === "cercle"
            || formeSelectionnee.type === "ellipse") {
            formeSelectionnee.angle = angleAvantRotation + differenceAngle;
        }
        else {
            tournerForme(
                formeSelectionnee,
                formeAvantRotation,
                centreRotation,
                differenceAngle
            );
        }
        return;
    }

    if (actionEnCours === "redimensionner") {
        let nouveauCadre = obtenirNouveauCadre(
            cadreAvantRedimensionnement,
            poigneeUtilisee,
            x,
            y
        );

        redimensionnerForme(
            formeSelectionnee,
            formeAvantRedimensionnement,
            cadreAvantRedimensionnement,
            nouveauCadre
        );
        return;
    }

    let outilForme = formes[formeSelectionnee.type];
    let nouvelleX = x - decalageX;
    let nouvelleY = y - decalageY;

    if (outilForme.deplacer) {
        let pointDeDepart = obtenirPointDeDepart(formeSelectionnee);
        let deplacementX = nouvelleX - pointDeDepart.x;
        let deplacementY = nouvelleY - pointDeDepart.y;
        outilForme.deplacer(formeSelectionnee, deplacementX, deplacementY);
        deplacerEffacements(formeSelectionnee, deplacementX, deplacementY);
    }
    else {
        let deplacementX = nouvelleX - formeSelectionnee.x;
        let deplacementY = nouvelleY - formeSelectionnee.y;
        formeSelectionnee.x = nouvelleX;
        formeSelectionnee.y = nouvelleY;
        deplacerEffacements(formeSelectionnee, deplacementX, deplacementY);
    }
}

// Terminer la selection sans la faire disparaitre
export function terminerSelection() {
    actionEnCours = null;
    poigneeUtilisee = null;
    formeAvantRedimensionnement = null;
    cadreAvantRedimensionnement = null;
    centreRotation = null;
    formeAvantRotation = null;
}

// Annuler completement la selection
export function annulerSelection() {
    actionEnCours = null;
    poigneeUtilisee = null;
    formeAvantRedimensionnement = null;
    cadreAvantRedimensionnement = null;
    centreRotation = null;
    formeAvantRotation = null;
    formeSelectionnee = null;
}

export function estEnSelection() {
    return actionEnCours !== null;
}

export function obtenirFormeSelectionnee() {
    return formeSelectionnee;
}
