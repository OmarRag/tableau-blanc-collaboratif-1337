// Supprimer la forme situee sous le clic
export function supprimerForme(formesDessinees, formes, x, y, ctx) {
    for (let i = formesDessinees.length - 1; i >= 0; i--) {
        let forme = formesDessinees[i];
        let outilForme = formes[forme.type];
        let toucheContour = false;

        if (outilForme.procheContour) {
            toucheContour = outilForme.procheContour(forme, x, y, ctx);
        }
        else if (outilForme.contientPoint) {
            toucheContour = outilForme.contientPoint(forme, x, y, ctx);
        }

        if (toucheContour) {
            formesDessinees.splice(i, 1);
            return true;
        }
    }

    return false;
}
