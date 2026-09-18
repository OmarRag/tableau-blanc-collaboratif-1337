// Liste des anciennes versions du dessin
let historique = [[]];
let positionHistorique = 0;

function copierFormes(formes) {
    return JSON.parse(JSON.stringify(formes));
}

// Commencer l'historique avec le dessin charge
export function initialiserHistorique(formes) {
    historique = [copierFormes(formes)];
    positionHistorique = 0;
}

// Enregistrer une nouvelle version du dessin
export function enregistrerEtat(formes) {
    historique = historique.slice(0, positionHistorique + 1);
    historique.push(copierFormes(formes));
    positionHistorique++;
}

// Revenir a la version precedente
export function annulerDernierEtat() {
    if (positionHistorique === 0) {
        return null;
    }

    positionHistorique--;
    return copierFormes(historique[positionHistorique]);
}

// Revenir a la version qui vient d'etre annulee
export function refaireDernierEtat() {
    if (positionHistorique >= historique.length - 1) {
        return null;
    }

    positionHistorique++;
    return copierFormes(historique[positionHistorique]);
}

// Savoir si une annulation est possible
export function peutAnnuler() {
    return positionHistorique > 0;
}

// Savoir si une action annulee peut etre refaite
export function peutRefaire() {
    return positionHistorique < historique.length - 1;
}
