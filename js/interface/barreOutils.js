// Recuperer les elements de l'interface
import { canvas } from "../canvas.js";
import { choisirZoom } from "../canvas/camera.js";
import { exporterPNG } from "../exportation/png.js";
import { exporterJSON, importerJSON } from "../exportation/json.js";
import { obtenirFormes, remplacerFormes } from "../etat/etatDessin.js";
import { annulerSelection } from "../outils/selection.js";
import {
    choisirOutil,
    choisirCouleur,
    choisirEpaisseur,
    getFormeChoisie,
    getEpaisseurChoisie
} from "../etat/etatOutils.js";

const btnCrayon = document.getElementById('crayon');
const btnRectangle = document.getElementById('rectangle');
const btnCercle = document.getElementById('cercle');
const btnEllipse = document.getElementById('ellipse');
const btnLigne = document.getElementById('ligne');
const btnFleche = document.getElementById('fleche');
const btnTexte = document.getElementById('texte');
const btnDeplacerCanvas = document.getElementById('deplacerCanvas');
const btnSelection = document.getElementById('selection');
const btnSupprimer = document.getElementById('supprimer');
const btnGomme = document.getElementById('gomme');
const btnRemplir = document.getElementById('remplir');
const btnExporterPNG = document.getElementById('exporterPNG');
const btnExporterJSON = document.getElementById('exporterJSON');
const btnImporterJSON = document.getElementById('importerJSON');
const fichierJSON = document.getElementById('fichierJSON');
const btnOuvrirMenuExport = document.getElementById('ouvrirMenuExport');
const menuExport = document.getElementById('menu-export');
const choixCouleur = document.getElementById('couleur');
const choixEpaisseur = document.getElementById('epaisseur');
const choixZoom = document.getElementById('zoom');
const btnDiminuerEpaisseur = document.getElementById('diminuerEpaisseur');
const btnAugmenterEpaisseur = document.getElementById('augmenterEpaisseur');
const btnDiminuerZoom = document.getElementById('diminuerZoom');
const btnAugmenterZoom = document.getElementById('augmenterZoom');
const couleurs = document.querySelectorAll('.couleur');
const barreOutils = document.getElementById('barre-outils');

// Bloquer le geste a deux doigts sur la barre d'outils
barreOutils.addEventListener('wheel', function (evenement) {
    evenement.preventDefault();
}, { passive: false });

// Construire le curseur circulaire de la gomme
function mettreAJourCurseurGomme() {
    let rayon = getEpaisseurChoisie() * 4;
    let diametre = rayon * 2;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${diametre}" height="${diametre}" viewBox="0 0 ${diametre} ${diametre}">
        <circle cx="${rayon}" cy="${rayon}" r="${rayon - 1}" fill="gainsboro" stroke="#555555" stroke-width="1" />
    </svg>`;
    let imageCurseur = "data:image/svg+xml," + encodeURIComponent(svg);

    canvas.style.cursor = `url("${imageCurseur}") ${rayon} ${rayon}, crosshair`;
}

// Choisir un outil et mettre a jour son apparence
function activerOutil(nomOutil) {
    if (nomOutil !== "selection") {
        annulerSelection();
    }

    choisirOutil(nomOutil);

    if (nomOutil === "gomme") {
        mettreAJourCurseurGomme();
    }
    else if (nomOutil === "deplacerCanvas") {
        canvas.style.cursor = "grab";
    }
    else {
        canvas.style.cursor = "crosshair";
    }

    btnCrayon.classList.remove("outil-selectionne");
    btnRectangle.classList.remove("outil-selectionne");
    btnCercle.classList.remove("outil-selectionne");
    btnEllipse.classList.remove("outil-selectionne");
    btnLigne.classList.remove("outil-selectionne");
    btnFleche.classList.remove("outil-selectionne");
    btnTexte.classList.remove("outil-selectionne");
    btnDeplacerCanvas.classList.remove("outil-selectionne");
    btnSelection.classList.remove("outil-selectionne");
    btnSupprimer.classList.remove("outil-selectionne");
    btnGomme.classList.remove("outil-selectionne");
    btnRemplir.classList.remove("outil-selectionne");

    document.getElementById(nomOutil).classList.add("outil-selectionne");
}

// Choix de la couleur avec la palette ou le selecteur
choixCouleur.addEventListener('input', function () {
    choisirCouleur(choixCouleur.value);
});

// Choix de l'epaisseur
choixEpaisseur.addEventListener('input', function () {
    choisirEpaisseur(Number(choixEpaisseur.value));

    if (getFormeChoisie() === "gomme") {
        mettreAJourCurseurGomme();
    }
});

// Modifier un curseur avec un bouton
function modifierValeurCurseur(curseur, changement) {
    let valeurActuelle = Number(curseur.value);
    let pas = Number(curseur.step);
    let valeurMinimum = Number(curseur.min);
    let valeurMaximum = Number(curseur.max);
    let nouvelleValeur = valeurActuelle + changement * pas;

    if (nouvelleValeur < valeurMinimum) {
        nouvelleValeur = valeurMinimum;
    }

    if (nouvelleValeur > valeurMaximum) {
        nouvelleValeur = valeurMaximum;
    }

    curseur.value = nouvelleValeur;
    curseur.dispatchEvent(new Event('input'));
}

btnDiminuerEpaisseur.addEventListener('click', function () {
    modifierValeurCurseur(choixEpaisseur, -1);
});

btnAugmenterEpaisseur.addEventListener('click', function () {
    modifierValeurCurseur(choixEpaisseur, 1);
});

// Choix du zoom avec le curseur
choixZoom.addEventListener('input', function () {
    choisirZoom(Number(choixZoom.value) / 100);
    canvas.dispatchEvent(new Event("redessiner"));
});

btnDiminuerZoom.addEventListener('click', function () {
    modifierValeurCurseur(choixZoom, -1);
});

btnAugmenterZoom.addEventListener('click', function () {
    modifierValeurCurseur(choixZoom, 1);
});

// Synchroniser le curseur quand le zoom est change avec la molette
canvas.addEventListener("zoomModifie", function (evenementZoom) {
    choixZoom.value = evenementZoom.detail.zoom * 100;
});

// Boutons de la palette de couleurs
couleurs.forEach(function (bouton) {
    bouton.addEventListener('click', function () {
        choisirCouleur(bouton.dataset.couleur);
        choixCouleur.value = bouton.dataset.couleur;
    });
});

// Boutons des outils
btnCrayon.addEventListener('click', function () {
    activerOutil("crayon");
});
btnRectangle.addEventListener('click', function () {
    activerOutil("rectangle");
});
btnCercle.addEventListener('click', function () {
    activerOutil("cercle");
});
btnEllipse.addEventListener('click', function () {
    activerOutil("ellipse");
});
btnLigne.addEventListener('click', function () {
    activerOutil("ligne");
});
btnFleche.addEventListener('click', function () {
    activerOutil("fleche");
});
btnTexte.addEventListener('click', function () {
    activerOutil("texte");
});
btnDeplacerCanvas.addEventListener('click', function () {
    activerOutil("deplacerCanvas");
});
btnSelection.addEventListener('click', function () {
    activerOutil("selection");
});
btnGomme.addEventListener('click', function () {
    activerOutil("gomme");
});
btnRemplir.addEventListener('click', function () {
    activerOutil("remplir");
});
btnSupprimer.addEventListener('click', function () {
    activerOutil("supprimer");
});

// Exporter le dessin en PNG
btnExporterPNG.addEventListener('click', function () {
    exporterPNG();
    fermerMenuExport();
});

// Exporter le dessin en JSON
btnExporterJSON.addEventListener('click', function () {
    exporterJSON(obtenirFormes());
    fermerMenuExport();
});

// Ouvrir ou fermer le menu des exports
btnOuvrirMenuExport.addEventListener('click', function (evenement) {
    evenement.stopPropagation();
    menuExport.classList.toggle('menu-ouvert');
});

// Garder le menu ouvert quand on clique a l'interieur
menuExport.addEventListener('click', function (evenement) {
    evenement.stopPropagation();
});

// Fermer le menu quand on clique ailleurs
document.addEventListener('click', function () {
    fermerMenuExport();
});

function fermerMenuExport() {
    menuExport.classList.remove('menu-ouvert');
}

// Ouvrir la fenetre de choix d'un fichier JSON
btnImporterJSON.addEventListener('click', function () {
    fermerMenuExport();
    fichierJSON.click();
});

// Importer les formes du fichier choisi
fichierJSON.addEventListener('change', function () {
    let fichierChoisi = fichierJSON.files[0];

    if (!fichierChoisi) {
        return;
    }

    importerJSON(fichierChoisi, function (formesImportees) {
        remplacerFormes(formesImportees);
        annulerSelection();
        canvas.dispatchEvent(new Event("dessinModifie"));
    });

    // Permettre de choisir deux fois le meme fichier
    fichierJSON.value = "";
});
