// Registre de toutes les formes disponibles
import {
    commencerCrayon,
    mettreAJourCrayon,
    dessinerCrayon,
    contientPoint as contientPointCrayon,
    deplacer as deplacerCrayon,
    dessinerSelection as dessinerSelectionCrayon,
    estFermee as estFermeeCrayon,
    contientInterieur as contientInterieurCrayon
} from "./crayon.js";

import {
    commencerRectangle,
    mettreAJourRectangle,
    dessinerRectangle,
    contientPoint,
    procheContour as procheContourRectangle
} from "./rectangle.js";

import {
    commencerCercle,
    mettreAJourCercle,
    dessinerCercle,
    contientPoint as contientPointCercle,
    dessinerSelection as dessinerSelectionCercle,
    procheContour as procheContourCercle
} from "./cercle.js";

import {
    commencerEllipse,
    mettreAJourEllipse,
    dessinerEllipse,
    contientPoint as contientPointEllipse,
    dessinerSelection as dessinerSelectionEllipse,
    procheContour as procheContourEllipse
} from "./ellipse.js";

import {
    commencerLigne,
    mettreAJourLigne,
    dessinerLigne,
    contientPoint as contientPointLigne,
    deplacer as deplacerLigne,
    dessinerSelection as dessinerSelectionLigne,
    procheContour as procheContourLigne
} from "./ligne.js";

import {
    commencerFleche,
    mettreAJourFleche,
    dessinerFleche,
    contientPoint as contientPointFleche,
    deplacer as deplacerFleche,
    dessinerSelection as dessinerSelectionFleche,
    procheContour as procheContourFleche
} from "./fleche.js";

import {
    commencerTexte,
    mettreAJourTexte,
    dessinerTexte,
    terminerTexte,
    contientPoint as contientPointTexte,
    dessinerSelection as dessinerSelectionTexte,
    procheContour as procheContourTexte
} from "./texte.js";

import { dessinerRemplissagePixels } from "./remplissagePixels.js";

// Chaque forme regroupe les fonctions dont le coordinateur a besoin
export const formes = {
    crayon: {
        commencer: commencerCrayon,
        mettreAJour: mettreAJourCrayon,
        dessiner: dessinerCrayon,
        contientPoint: contientPointCrayon,
        deplacer: deplacerCrayon,
        dessinerSelection: dessinerSelectionCrayon,
        estFermee: estFermeeCrayon,
        contientInterieur: contientInterieurCrayon
    },
    rectangle: {
        commencer: commencerRectangle,
        mettreAJour: mettreAJourRectangle,
        dessiner: dessinerRectangle,
        contientPoint: contientPoint,
        procheContour: procheContourRectangle
    },
    cercle: {
        commencer: commencerCercle,
        mettreAJour: mettreAJourCercle,
        dessiner: dessinerCercle,
        contientPoint: contientPointCercle,
        dessinerSelection: dessinerSelectionCercle,
        procheContour: procheContourCercle
    },
    ellipse: {
        commencer: commencerEllipse,
        mettreAJour: mettreAJourEllipse,
        dessiner: dessinerEllipse,
        contientPoint: contientPointEllipse,
        dessinerSelection: dessinerSelectionEllipse,
        procheContour: procheContourEllipse
    },
    ligne: {
        commencer: commencerLigne,
        mettreAJour: mettreAJourLigne,
        dessiner: dessinerLigne,
        contientPoint: contientPointLigne,
        deplacer: deplacerLigne,
        dessinerSelection: dessinerSelectionLigne,
        procheContour: procheContourLigne
    },
    fleche: {
        commencer: commencerFleche,
        mettreAJour: mettreAJourFleche,
        dessiner: dessinerFleche,
        contientPoint: contientPointFleche,
        deplacer: deplacerFleche,
        dessinerSelection: dessinerSelectionFleche,
        procheContour: procheContourFleche
    },
    texte: {
        commencer: commencerTexte,
        mettreAJour: mettreAJourTexte,
        dessiner: dessinerTexte,
        terminer: terminerTexte,
        contientPoint: contientPointTexte,
        dessinerSelection: dessinerSelectionTexte,
        procheContour: procheContourTexte
    },
    remplissagePixels: {
        dessiner: dessinerRemplissagePixels
    }
};
//
console.log(formes);
