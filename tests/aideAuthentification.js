// Creer une session directement dans PostgreSQL pour les tests automatiques
import crypto from "node:crypto";
import {
    enregistrerUtilisateurGoogle,
    creerSession,
    supprimerUtilisateur,
    fermerConnexionBaseDeDonnees
} from "../serveur/baseDeDonnees.js";

export async function creerAuthentificationTest(nomTest) {
    let suffixe = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    let utilisateur = await enregistrerUtilisateurGoogle({
        googleId: "google-test-" + nomTest + "-" + suffixe,
        email: nomTest + "-" + suffixe + "@example.com"
    });
    let jeton = crypto.randomBytes(32).toString("hex");
    let jetonHash = crypto.createHash("sha256").update(jeton).digest("hex");
    let expiration = new Date(Date.now() + 60 * 60 * 1000);

    await creerSession(jetonHash, utilisateur.id, expiration);

    return {
        utilisateur: utilisateur,
        cookie: "session_tableau_blanc=" + jeton
    };
}

export async function nettoyerAuthentificationTest(
    utilisateurId,
    fermerConnexions = true
) {
    await supprimerUtilisateur(utilisateurId);

    if (fermerConnexions) {
        await fermerConnexionBaseDeDonnees();
    }
}
