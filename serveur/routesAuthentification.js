// Routes de connexion avec un compte Google verifie
import express from "express";
import { OAuth2Client } from "google-auth-library";
import {
    enregistrerUtilisateurGoogle,
    attribuerAnciensTableaux,
    supprimerSessionsExpirees
} from "./baseDeDonnees.js";
import {
    authentificationObligatoire,
    creerConnexion,
    fermerConnexion,
    nomDepuisEmail
} from "./authentification.js";

const routesAuthentification = express.Router();
const identifiantClientGoogle = process.env.GOOGLE_CLIENT_ID;
const clientGoogle = new OAuth2Client(identifiantClientGoogle);

function presenterUtilisateur(utilisateur) {
    return {
        id: utilisateur.id,
        email: utilisateur.email,
        nom: nomDepuisEmail(utilisateur.email)
    };
}

// Donner au navigateur l'identifiant public necessaire au bouton Google
routesAuthentification.get("/configuration", function (requete, reponse) {
    reponse.json({ clientId: identifiantClientGoogle });
});

// Verifier le jeton retourne par le bouton officiel Google
routesAuthentification.post("/google", async function (requete, reponse) {
    let jetonGoogle = requete.body && requete.body.credential;

    if (typeof jetonGoogle !== "string" || jetonGoogle.length > 10000) {
        reponse.status(400).json({ erreur: "Jeton Google invalide." });
        return;
    }

    try {
        let ticket = await clientGoogle.verifyIdToken({
            idToken: jetonGoogle,
            audience: identifiantClientGoogle
        });
        let compteGoogle = ticket.getPayload();

        if (
            !compteGoogle
            || !compteGoogle.sub
            || !compteGoogle.email
            || compteGoogle.email_verified !== true
        ) {
            reponse.status(401).json({ erreur: "Compte Google non verifie." });
            return;
        }

        let utilisateur = await enregistrerUtilisateurGoogle({
            googleId: compteGoogle.sub,
            email: compteGoogle.email.toLowerCase()
        });

        await attribuerAnciensTableaux(utilisateur.id);
        await supprimerSessionsExpirees();
        await creerConnexion(utilisateur, reponse);

        reponse.json(presenterUtilisateur(utilisateur));
    }
    catch (erreur) {
        console.error("Connexion Google refusee.", erreur.message);
        reponse.status(401).json({ erreur: "Connexion Google invalide." });
    }
});

// Retourner le compte lie a la session actuelle
routesAuthentification.get(
    "/moi",
    authentificationObligatoire,
    function (requete, reponse) {
        reponse.json(presenterUtilisateur(requete.utilisateur));
    }
);

// Fermer uniquement la session de notre application
routesAuthentification.post("/deconnexion", async function (requete, reponse) {
    try {
        await fermerConnexion(requete, reponse);
        reponse.sendStatus(204);
    }
    catch (erreur) {
        console.error("Deconnexion impossible.", erreur);
        reponse.status(500).json({ erreur: "Erreur du serveur." });
    }
});

export default routesAuthentification;
