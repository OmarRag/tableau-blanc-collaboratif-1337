import {
    chargerConfigurationGoogle,
    connecterAvecGoogle,
    obtenirUtilisateurConnecte
} from "../api/authentificationApi.js";

const zoneBoutonGoogle = document.getElementById("bouton-google");
const messageConnexion = document.getElementById("message-connexion");

// Retrouver la page interne demandee avant la connexion.
function obtenirDestinationApresConnexion() {
    let parametres = new URLSearchParams(window.location.search);
    let retour = parametres.get("retour");

    if (!retour) {
        return "tableaux.html";
    }

    try {
        let destination = new URL(retour, window.location.origin);

        if (
            destination.origin !== window.location.origin
            || destination.pathname === "/connexion.html"
        ) {
            return "tableaux.html";
        }

        return destination.pathname + destination.search + destination.hash;
    }
    catch (erreur) {
        return "tableaux.html";
    }
}

const destinationApresConnexion = obtenirDestinationApresConnexion();

// Attendre que la bibliotheque officielle de Google soit chargee
function attendreGoogle() {
    return new Promise(function (resoudre, rejeter) {
        if (window.google && window.google.accounts) {
            resoudre();
            return;
        }

        let scriptGoogle = document.querySelector(
            "script[src='https://accounts.google.com/gsi/client']"
        );

        scriptGoogle.addEventListener("load", resoudre, { once: true });
        scriptGoogle.addEventListener("error", function () {
            rejeter(new Error("Le service Google ne peut pas etre charge."));
        }, { once: true });
    });
}

// Envoyer au serveur le jeton d'identite retourne par Google
async function traiterReponseGoogle(reponseGoogle) {
    messageConnexion.textContent = "Vérification du compte Google...";

    try {
        let utilisateur = await connecterAvecGoogle(reponseGoogle.credential);
        sessionStorage.setItem("nomUtilisateur", utilisateur.nom);
        window.location.replace(destinationApresConnexion);
    }
    catch (erreur) {
        console.error("Connexion Google impossible.", erreur);
        messageConnexion.textContent = erreur.message;
    }
}

async function initialiserConnexion() {
    try {
        await obtenirUtilisateurConnecte();
        window.location.replace(destinationApresConnexion);
        return;
    }
    catch (erreur) {
        if (erreur.statut !== 401) {
            messageConnexion.textContent = erreur.message;
            return;
        }
    }

    try {
        let configuration = await chargerConfigurationGoogle();
        await attendreGoogle();

        window.google.accounts.id.initialize({
            client_id: configuration.clientId,
            callback: traiterReponseGoogle
        });

        window.google.accounts.id.renderButton(zoneBoutonGoogle, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: 318
        });
    }
    catch (erreur) {
        console.error("Initialisation de Google impossible.", erreur);
        messageConnexion.textContent = erreur.message;
    }
}

initialiserConnexion();
