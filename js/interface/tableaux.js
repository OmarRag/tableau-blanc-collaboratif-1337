// Afficher et gerer les tableaux sauvegardes sur le serveur
import { chargerDessin, supprimerDessin } from "../stockage/stockageLocal.js";
import {
    listerTableaux,
    creerTableau,
    chargerTableau,
    modifierTableau,
    supprimerTableau,
    creerLienPartage
} from "../api/tableauxApi.js";
import {
    obtenirUtilisateurConnecte,
    seDeconnecter
} from "../api/authentificationApi.js";

const listeTableaux = document.getElementById("liste-tableaux");
const boutonNouveauTableau = document.getElementById("nouveau-tableau");
const boutonDeconnexion = document.getElementById("deconnexion");
const messageTableaux = document.getElementById("message-tableaux");
const fenetrePartage = document.getElementById("fenetre-partage");
const nomTableauPartage = document.getElementById("nom-tableau-partage");
const boutonFermerPartage = document.getElementById("fermer-partage");
const boutonLienLecture = document.getElementById("creer-lien-lecture");
const boutonLienModification = document.getElementById("creer-lien-modification");
const conteneurLienGenere = document.getElementById("lien-genere-conteneur");
const champLienGenere = document.getElementById("lien-genere");
const boutonCopierLien = document.getElementById("copier-lien");
const messagePartage = document.getElementById("message-partage");
const cleListeLocale = "tableauxUtilisateur";
const cleMigration = "tableauxTransferesVersServeur";

let tableaux = [];
let tableauPartageActuel = null;

// Lire les anciens tableaux avant leur transfert vers PostgreSQL
function lireTableauxLocaux() {
    let listeSauvegardee = localStorage.getItem(cleListeLocale);

    if (!listeSauvegardee) {
        return [];
    }

    try {
        let liste = JSON.parse(listeSauvegardee);
        return Array.isArray(liste) ? liste : [];
    }
    catch (erreur) {
        console.error("Lecture des anciens tableaux impossible.", erreur);
        return [];
    }
}

// Transferer une seule fois les anciennes donnees locales vers le serveur
async function transfererTableauxLocaux() {
    if (localStorage.getItem(cleMigration) === "oui") {
        return;
    }

    let tableauxLocaux = lireTableauxLocaux();
    let tableauxServeur = await listerTableaux();
    let identifiantsServeur = new Set();

    for (const tableau of tableauxServeur) {
        identifiantsServeur.add(tableau.id);
    }

    for (const tableau of tableauxLocaux) {
        if (
            !tableau
            || typeof tableau.id !== "string"
            || typeof tableau.nom !== "string"
            || identifiantsServeur.has(tableau.id)
        ) {
            continue;
        }

        await creerTableau(
            tableau.id,
            tableau.nom,
            chargerDessin(tableau.id)
        );
    }

    if (tableauxLocaux.length === 0 && tableauxServeur.length === 0) {
        await creerTableau("premier-tableau", "Mon premier tableau", []);
    }

    localStorage.setItem(cleMigration, "oui");
}

// Copier un lien, meme si le navigateur refuse l'API moderne du presse-papiers
async function copierLien(lien) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(lien);
        return;
    }

    let zoneTemporaire = document.createElement("textarea");
    zoneTemporaire.value = lien;
    zoneTemporaire.style.position = "fixed";
    zoneTemporaire.style.opacity = "0";
    document.body.appendChild(zoneTemporaire);
    zoneTemporaire.select();
    document.execCommand("copy");
    zoneTemporaire.remove();
}

function ouvrirFenetrePartage(tableau) {
    tableauPartageActuel = tableau;
    nomTableauPartage.textContent = tableau.nom;
    messagePartage.textContent = "";
    conteneurLienGenere.hidden = true;
    fenetrePartage.showModal();
}

boutonFermerPartage.addEventListener("click", function () {
    fenetrePartage.close();
});

async function creerEtAfficherLien(permission) {
    if (!tableauPartageActuel) {
        return;
    }

    try {
        let lienCree = await creerLienPartage(
            tableauPartageActuel.id,
            permission
        );
        let adresse = new URL("index.html", window.location.href);

        adresse.searchParams.set("tableau", tableauPartageActuel.id);
        adresse.searchParams.set("nom", tableauPartageActuel.nom);
        adresse.searchParams.set("partage", lienCree.jeton);
        champLienGenere.value = adresse.href;
        conteneurLienGenere.hidden = false;
        tableauPartageActuel.permission_partage = permission;
        messagePartage.textContent = "";
        afficherTableaux();
    }
    catch (erreur) {
        messagePartage.textContent = erreur.message;
    }
}

if (boutonLienLecture) {
    boutonLienLecture.addEventListener("click", function () {
        creerEtAfficherLien("lecture");
    });
}

if (boutonLienModification) {
    boutonLienModification.addEventListener("click", function () {
        creerEtAfficherLien("modification");
    });
}

boutonCopierLien.addEventListener("click", async function () {
    try {
        await copierLien(champLienGenere.value);
        messagePartage.textContent = "Lien copié.";
    }
    catch (erreur) {
        window.prompt("Copie ce lien :", champLienGenere.value);
    }
});

// Afficher les tableaux sous forme de cartes
function afficherTableaux() {
    listeTableaux.innerHTML = "";

    if (tableaux.length === 0) {
        let aucunTableau = document.createElement("p");
        aucunTableau.className = "aucun-tableau";
        aucunTableau.textContent = "Aucun tableau pour le moment.";
        listeTableaux.appendChild(aucunTableau);
        return;
    }

    for (const tableau of tableaux) {
        let carte = document.createElement("article");
        let titre = document.createElement("h2");
        let identifiant = document.createElement("p");
        let statutPartage = document.createElement("p");
        let actions = document.createElement("div");
        let lienOuvrir = document.createElement("a");
        let boutonPartager = document.createElement("button");
        let boutonRenommer = document.createElement("button");
        let boutonSupprimer = document.createElement("button");

        carte.className = "carte-tableau";
        titre.textContent = tableau.nom;
        identifiant.textContent = "Identifiant : " + tableau.id;
        statutPartage.className = "statut-partage-tableau";
        statutPartage.textContent = tableau.permission_partage === "modification"
            ? "Lien de modification actif"
            : tableau.permission_partage === "lecture"
                ? "Lien de lecture actif"
                : "Privé";
        actions.className = "actions-carte-tableau";

        lienOuvrir.className = "ouvrir-tableau";
        lienOuvrir.href = "index.html?tableau="
            + encodeURIComponent(tableau.id)
            + "&nom="
            + encodeURIComponent(tableau.nom);
        lienOuvrir.textContent = "Ouvrir";

        boutonPartager.className = "partager-tableau";
        boutonPartager.type = "button";
        boutonPartager.title = "Gérer le partage";
        boutonPartager.setAttribute("aria-label", "Gérer le partage");
        boutonPartager.textContent = "🔗";

        boutonRenommer.className = "renommer-tableau";
        boutonRenommer.type = "button";
        boutonRenommer.title = "Renommer le tableau";
        boutonRenommer.setAttribute("aria-label", "Renommer le tableau");
        boutonRenommer.textContent = "✎";

        boutonSupprimer.className = "supprimer-tableau";
        boutonSupprimer.type = "button";
        boutonSupprimer.title = "Supprimer le tableau";
        boutonSupprimer.setAttribute("aria-label", "Supprimer le tableau");
        boutonSupprimer.textContent = "🗑";

        boutonPartager.addEventListener("click", function () {
            ouvrirFenetrePartage(tableau);
        });

        boutonRenommer.addEventListener("click", async function () {
            let nouveauNom = window.prompt("Nouveau nom du tableau :", tableau.nom);

            if (!nouveauNom || nouveauNom.trim() === "") {
                return;
            }

            boutonRenommer.disabled = true;

            try {
                let tableauComplet = await chargerTableau(tableau.id);
                let tableauModifie = await modifierTableau(
                    tableau.id,
                    nouveauNom.trim(),
                    tableauComplet.formes
                );

                tableau.nom = tableauModifie.nom;
                messageTableaux.textContent = "Le tableau a été renommé.";
                afficherTableaux();
            }
            catch (erreur) {
                console.error("Modification du tableau impossible.", erreur);
                messageTableaux.textContent = erreur.message;
                boutonRenommer.disabled = false;
            }
        });

        boutonSupprimer.addEventListener("click", async function () {
            let confirmation = window.confirm(
                "Supprimer le tableau « " + tableau.nom + " » et son dessin ?"
            );

            if (!confirmation) {
                return;
            }

            boutonSupprimer.disabled = true;

            try {
                await supprimerTableau(tableau.id);
                tableaux = tableaux.filter(function (tableauActuel) {
                    return tableauActuel.id !== tableau.id;
                });
                supprimerDessin(tableau.id);
                messageTableaux.textContent = "Le tableau a été supprimé.";
                afficherTableaux();
            }
            catch (erreur) {
                console.error("Suppression du tableau impossible.", erreur);
                messageTableaux.textContent = erreur.message;
                boutonSupprimer.disabled = false;
            }
        });

        actions.append(
            lienOuvrir,
            boutonPartager,
            boutonRenommer,
            boutonSupprimer
        );
        carte.append(titre, identifiant, statutPartage, actions);
        listeTableaux.appendChild(carte);
    }
}

// Creer un nouveau tableau sur le serveur
boutonNouveauTableau.addEventListener("click", async function () {
    let nom = window.prompt("Nom du nouveau tableau :");

    if (!nom || nom.trim() === "") {
        return;
    }

    boutonNouveauTableau.disabled = true;

    try {
        let nouveauTableau = await creerTableau(
            "tableau-" + Date.now(),
            nom.trim(),
            []
        );

        tableaux.unshift(nouveauTableau);
        messageTableaux.textContent = "Le tableau a été créé.";
        afficherTableaux();
    }
    catch (erreur) {
        console.error("Creation du tableau impossible.", erreur);
        messageTableaux.textContent = erreur.message;
    }
    finally {
        boutonNouveauTableau.disabled = false;
    }
});

// Fermer la session de notre application
boutonDeconnexion.addEventListener("click", async function () {
    boutonDeconnexion.disabled = true;

    try {
        await seDeconnecter();
        sessionStorage.removeItem("nomUtilisateur");
        window.location.replace("connexion.html");
    }
    catch (erreur) {
        console.error("Deconnexion impossible.", erreur);
        messageTableaux.textContent = erreur.message;
        boutonDeconnexion.disabled = false;
    }
});

// Charger la page depuis PostgreSQL
async function initialiserPage() {
    boutonNouveauTableau.disabled = true;
    messageTableaux.textContent = "Chargement des tableaux...";

    try {
        let utilisateur = await obtenirUtilisateurConnecte();
        sessionStorage.setItem("nomUtilisateur", utilisateur.nom);
        await transfererTableauxLocaux();
        tableaux = await listerTableaux();
        messageTableaux.textContent = "";
        afficherTableaux();
    }
    catch (erreur) {
        if (erreur.statut === 401) {
            window.location.replace("connexion.html");
            return;
        }

        console.error("Chargement des tableaux impossible.", erreur);
        messageTableaux.textContent = erreur.message;
    }
    finally {
        boutonNouveauTableau.disabled = false;
    }
}

initialiserPage();
