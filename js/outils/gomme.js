// Etat de l'utilisation de la gomme
let gommeEnCours = false;

// Commencer et terminer un passage de gomme
export function commencerGomme() {
    gommeEnCours = true;
}

export function terminerGomme() {
    gommeEnCours = false;
}

export function estEnGomme() {
    return gommeEnCours;
}

// Verifier si le cercle de la gomme touche une forme
function gommeToucheForme(forme, outilForme, x, y, ctx, taille) {
    if (outilForme.contientPoint) {
        if (outilForme.contientPoint(forme, x, y, ctx)) {
            return true;
        }
    }

    if (outilForme.procheContour) {
        if (outilForme.procheContour(forme, x, y, ctx)) {
            return true;
        }
    }

    let nombrePoints = 16;

    for (let i = 0; i < nombrePoints; i++) {
        let angle = (i / nombrePoints) * Math.PI * 2;
        let pointX = x + Math.cos(angle) * taille;
        let pointY = y + Math.sin(angle) * taille;

        if (outilForme.contientPoint) {
            if (outilForme.contientPoint(forme, pointX, pointY, ctx)) {
                return true;
            }
        }

        if (outilForme.procheContour) {
            if (outilForme.procheContour(forme, pointX, pointY, ctx)) {
                return true;
            }
        }
    }

    return false;
}

// Ajouter une zone effacee a la forme touchee
export function ajouterEffacement(formesDessinees, formes, x, y, ctx, taille) {
    for (let i = formesDessinees.length - 1; i >= 0; i--) {
        let forme = formesDessinees[i];
        let outilForme = formes[forme.type];

        if (!gommeToucheForme(forme, outilForme, x, y, ctx, taille)) {
            continue;
        }

        if (!forme.effacements) {
            forme.effacements = [];
        }

        forme.effacements.push({
            x: x,
            y: y,
            taille: taille
        });
        return;
    }
}
