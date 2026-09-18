// Gerer les interactions de la souris avec le canvas
import { getFormeChoisie, getCouleurChoisie, getEpaisseurChoisie } from "../etat/etatOutils.js";
import {
    ajouterForme,
    assurerIdentifiantForme
} from "../etat/etatDessin.js";
import {
    obtenirPositionDansCanvas,
    commencerDeplacement,
    mettreAJourDeplacement,
    terminerDeplacement,
    estEnDeplacement,
    obtenirDecalageVue,
    mettreAJourZoom
} from "../canvas/camera.js";
import { installerEvenementsCanvas } from "../canvas/evenements.js";
import {
    commencerSelection,
    mettreAJourSelection,
    terminerSelection,
    annulerSelection,
    estEnSelection
} from "../outils/selection.js";
import { commencerGomme, terminerGomme, estEnGomme, ajouterEffacement } from "../outils/gomme.js";
import { remplirZoneVisible } from "../outils/remplissage.js";
import { supprimerForme as supprimerAvecSouris } from "../outils/suppression.js";
import {
    commencerForme,
    mettreAJourForme,
    obtenirFormeEnCours,
    terminerForme,
    annulerForme
} from "../outils/dessinForme.js";

// Installer les interactions du canvas
export function installerGestionInteractions(
    canvas,
    ctx,
    formesDessinees,
    formes,
    redessiner,
    enregistrerEtat,
    partagerApercu,
    partagerCurseur
) {
    // Bouton gauche de la souris enfonce
    function gererSourisEnfoncee(evenementSouris) {
        if (getFormeChoisie() === "deplacerCanvas") {
            commencerDeplacement(evenementSouris);
            canvas.style.cursor = "grabbing";
            return;
        }

        let positionSouris = obtenirPositionDansCanvas(evenementSouris);

        if (getFormeChoisie() === "supprimer") {
            let suppressionEffectuee = supprimerAvecSouris(
                formesDessinees,
                formes,
                positionSouris.x,
                positionSouris.y,
                ctx
            );

            if (suppressionEffectuee) {
                enregistrerEtat();
                redessiner();
            }

            return;
        }

        if (getFormeChoisie() === "gomme") {
            commencerGomme();
            ajouterEffacement(
                formesDessinees,
                formes,
                positionSouris.x,
                positionSouris.y,
                ctx,
                getEpaisseurChoisie() * 4
            );
            redessiner();
            return;
        }

        if (getFormeChoisie() === "remplir") {
            let zoneRemplie = remplirZoneVisible(
                canvas,
                ctx,
                evenementSouris.offsetX,
                evenementSouris.offsetY,
                getCouleurChoisie(),
                obtenirDecalageVue()
            );

            if (zoneRemplie) {
                ajouterForme(zoneRemplie);
                enregistrerEtat();
                redessiner();
            }

            return;
        }

        if (getFormeChoisie() === "selection") {
            commencerSelection(
                formesDessinees,
                formes,
                positionSouris.x,
                positionSouris.y,
                ctx
            );

            redessiner();
            return;
        }

        let nomOutilChoisi = getFormeChoisie();
        let outilForme = formes[nomOutilChoisi];

        if (outilForme) {
            commencerForme(
                outilForme,
                positionSouris.x,
                positionSouris.y,
                getCouleurChoisie(),
                getEpaisseurChoisie()
            );

            let formeCommencee = obtenirFormeEnCours();
            assurerIdentifiantForme(formeCommencee);
            partagerApercu(formeCommencee);
            redessiner();
        }
    }

    // Souris en mouvement
    function gererSourisDeplacee(evenementSouris) {
        if (getFormeChoisie() === "deplacerCanvas") {
            if (estEnDeplacement()) {
                mettreAJourDeplacement(evenementSouris);
                partagerCurseur(obtenirPositionDansCanvas(evenementSouris));
                redessiner();
                return;
            }
        }

        let positionSouris = obtenirPositionDansCanvas(evenementSouris);
        partagerCurseur(positionSouris);

        if (getFormeChoisie() === "gomme") {
            if (estEnGomme()) {
                ajouterEffacement(
                    formesDessinees,
                    formes,
                    positionSouris.x,
                    positionSouris.y,
                    ctx,
                    getEpaisseurChoisie() * 4
                );
            }

            redessiner();
            return;
        }

        if (getFormeChoisie() === "selection") {
            if (estEnSelection()) {
                mettreAJourSelection(formes, positionSouris.x, positionSouris.y);
                redessiner();
                return;
            }
        }

        let formeEnCours = obtenirFormeEnCours();

        if (!formeEnCours) {
            return;
        }

        let outilForme = formes[formeEnCours.type];
        mettreAJourForme(outilForme, positionSouris.x, positionSouris.y);
        partagerApercu(obtenirFormeEnCours());
        redessiner();
    }

    // Bouton gauche de la souris relache
    function gererSourisRelachee() {
        if (getFormeChoisie() === "deplacerCanvas") {
            terminerDeplacement();
            canvas.style.cursor = "grab";
            return;
        }

        if (getFormeChoisie() === "gomme") {
            if (estEnGomme()) {
                enregistrerEtat();
            }
        }

        terminerGomme();

        if (getFormeChoisie() === "selection") {
            let actionSelectionEnCours = estEnSelection();
            terminerSelection();

            if (actionSelectionEnCours) {
                enregistrerEtat();
            }

            redessiner();
            return;
        }

        let formeTerminee = obtenirFormeEnCours();

        if (!formeTerminee) {
            return;
        }

        let outilForme = formes[formeTerminee.type];
        terminerForme();
        redessiner();

        if (outilForme.terminer) {
            outilForme.terminer(
                formeTerminee,
                function (nouvelleForme) {
                    ajouterFormeEtActualiser(nouvelleForme);
                },
                obtenirDecalageVue()
            );
            partagerApercu(null);
        }
        else {
            ajouterFormeEtActualiser(formeTerminee);
            partagerApercu(null);
        }
    }

    // Ajouter une forme puis actualiser l'affichage et l'historique
    function ajouterFormeEtActualiser(forme) {
        ajouterForme(forme);
        enregistrerEtat();
        redessiner();
    }

    // Souris sortie du canvas
    function gererSourisSortie() {
        partagerCurseur(null);

        let gommeEtaitEnCours = estEnGomme();
        let selectionEtaitEnCours = estEnSelection();

        terminerDeplacement();
        terminerGomme();

        if (gommeEtaitEnCours) {
            enregistrerEtat();
        }

        if (getFormeChoisie() === "deplacerCanvas") {
            canvas.style.cursor = "grab";
            return;
        }

        if (getFormeChoisie() === "selection") {
            if (selectionEtaitEnCours) {
                enregistrerEtat();
            }

            annulerSelection();
            redessiner();
            return;
        }

        if (obtenirFormeEnCours()) {
            annulerForme();
            partagerApercu(null);
            redessiner();
        }
    }

    // Molette de la souris pour zoomer
    function gererMolette(evenementMolette) {
        evenementMolette.preventDefault();
        mettreAJourZoom(evenementMolette);
        redessiner();
    }

    installerEvenementsCanvas(canvas, {
        sourisEnfoncee: gererSourisEnfoncee,
        sourisDeplacee: gererSourisDeplacee,
        sourisRelachee: gererSourisRelachee,
        sourisSortie: gererSourisSortie,
        molette: gererMolette
    });
}
