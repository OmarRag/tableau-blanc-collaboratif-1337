// Coordinateur principal : relier l'interface, les outils et le canvas
import { canvas, ctx } from "./canvas.js";
import { formes } from "./formes/index.js";
import { redessiner as dessinerCanvas } from "./canvas/rendu.js";
import { obtenirDecalageVue } from "./canvas/camera.js";
import {
    obtenirFormes,
    remplacerFormes,
    appliquerOperations
} from "./etat/etatDessin.js";
import {
    initialiserHistorique,
    enregistrerEtat as enregistrerDansHistorique,
    annulerDernierEtat,
    refaireDernierEtat,
    peutAnnuler,
    peutRefaire
} from "./etat/historique.js";
import {
    obtenirIdentifiantTableau,
    chargerDessin,
    sauvegarderDessin
} from "./stockage/stockageLocal.js";
import { annulerSelection, obtenirFormeSelectionnee } from "./outils/selection.js";
import { obtenirFormeEnCours } from "./outils/dessinForme.js";
import { installerGestionInteractions } from "./interaction/gestionInteractions.js";
import {
    demarrerSynchronisation,
    envoyerDessin,
    envoyerApercu,
    envoyerCurseur
} from "./tempsReel/synchronisation.js";
import { afficherCurseursDistants } from "./tempsReel/curseursDistants.js";
import { chargerTableau as chargerTableauDepuisServeur } from "./api/tableauxApi.js";
import "./interface/barreOutils.js";

const identifiantTableau = obtenirIdentifiantTableau();
const parametresAdresse = new URLSearchParams(window.location.search);
const jetonPartage = parametresAdresse.get("partage") || "";
let dessinSauvegarde = chargerDessin(identifiantTableau);
let permissionTableau = "modification";

// PostgreSQL est la source principale, localStorage reste une copie de secours.
try {
    let tableauServeur = await chargerTableauDepuisServeur(
        identifiantTableau,
        jetonPartage
    );

    if (Array.isArray(tableauServeur.formes)) {
        dessinSauvegarde = tableauServeur.formes;
        sauvegarderDessin(identifiantTableau, dessinSauvegarde);
    }

    permissionTableau = tableauServeur.permission;
}
catch (erreur) {
    if (erreur.statut === 403 || erreur.statut === 404) {
        window.alert("Tu n'as pas accès à ce tableau.");
        window.location.replace("tableaux.html");

        // Arreter ce module pendant le changement de page.
        await new Promise(function () {});
    }

    console.warn("Dessin charge depuis la copie locale.", erreur.message);
}

remplacerFormes(dessinSauvegarde);

const formesDessinees = obtenirFormes();
const btnAnnuler = document.getElementById("annuler");
const btnRefaire = document.getElementById("refaire");
const modeLecture = document.getElementById("mode-lecture");
const lectureSeule = permissionTableau !== "modification";
let apercusDistants = [];
let curseursDistants = [];

// Cette sauvegarde conserve aussi les identifiants ajoutes aux anciennes formes.
sauvegarderDessin(identifiantTableau, formesDessinees);

initialiserHistorique(formesDessinees);

// Historique des actions
function mettreAJourBoutonsHistorique() {
    btnAnnuler.disabled = !peutAnnuler();
    btnRefaire.disabled = !peutRefaire();
}

function enregistrerEtat() {
    enregistrerDansHistorique(formesDessinees);
    sauvegarderDessin(identifiantTableau, formesDessinees);
    envoyerDessin(formesDessinees);
    mettreAJourBoutonsHistorique();
}

function annulerDerniereAction() {
    let anciennesFormes = annulerDernierEtat();

    if (anciennesFormes === null) {
        return;
    }

    remplacerFormes(anciennesFormes);
    sauvegarderDessin(identifiantTableau, formesDessinees);
    envoyerDessin(formesDessinees);
    annulerSelection();
    redessiner();
    mettreAJourBoutonsHistorique();
}

function refaireDerniereAction() {
    let nouvellesFormes = refaireDernierEtat();

    if (nouvellesFormes === null) {
        return;
    }

    remplacerFormes(nouvellesFormes);
    sauvegarderDessin(identifiantTableau, formesDessinees);
    envoyerDessin(formesDessinees);
    annulerSelection();
    redessiner();
    mettreAJourBoutonsHistorique();
}

if (!lectureSeule) {
    btnAnnuler.addEventListener("click", annulerDerniereAction);
    btnRefaire.addEventListener("click", refaireDerniereAction);
}

mettreAJourBoutonsHistorique();

if (lectureSeule) {
    modeLecture.hidden = false;
    canvas.style.cursor = "default";

    let controlesModification = document.querySelectorAll(
        "#barre-outils button, "
        + "#barre-outils input, "
        + "#historique-outil button, "
        + "#importerJSON"
    );

    for (const controle of controlesModification) {
        controle.disabled = true;
    }
}

// Redessin general du canvas
function redessiner() {
    let decalageVue = obtenirDecalageVue();
    let formeSelectionnee = obtenirFormeSelectionnee();
    let formeEnCours = obtenirFormeEnCours();

    dessinerCanvas(
        formesDessinees,
        formeEnCours,
        formeSelectionnee,
        formes,
        decalageVue.x,
        decalageVue.y,
        decalageVue.zoom,
        apercusDistants
    );

    afficherCurseursDistants(curseursDistants, decalageVue);
}

canvas.addEventListener("redessiner", function() {
    redessiner();
});

// Enregistrer un dessin remplace, par exemple apres un import JSON
canvas.addEventListener("dessinModifie", function () {
    enregistrerEtat();
    redessiner();
});

// Installation des interactions du canvas
if (!lectureSeule) {
    installerGestionInteractions(
        canvas,
        ctx,
        formesDessinees,
        formes,
        redessiner,
        enregistrerEtat,
        envoyerApercu,
        envoyerCurseur
    );
}

redessiner();

// Recevoir les changements des autres navigateurs ouverts sur le meme tableau
demarrerSynchronisation(
    identifiantTableau,
    jetonPartage,
    function () {
        return formesDessinees;
    },
    function (dessinRecu) {
        remplacerFormes(dessinRecu);
        sauvegarderDessin(identifiantTableau, formesDessinees);
        initialiserHistorique(formesDessinees);
        annulerSelection();
        mettreAJourBoutonsHistorique();
        redessiner();
    },
    function (modifications, suppressions) {
        let formeSelectionnee = obtenirFormeSelectionnee();

        appliquerOperations(modifications, suppressions);
        sauvegarderDessin(identifiantTableau, formesDessinees);
        initialiserHistorique(formesDessinees);

        if (
            formeSelectionnee
            && suppressions.includes(formeSelectionnee.id)
        ) {
            annulerSelection();
        }

        mettreAJourBoutonsHistorique();
        redessiner();
    },
    function (nouveauxApercus) {
        apercusDistants = nouveauxApercus;
        redessiner();
    },
    function (nouveauxCurseurs) {
        curseursDistants = nouveauxCurseurs;
        afficherCurseursDistants(curseursDistants, obtenirDecalageVue());
    }
);
