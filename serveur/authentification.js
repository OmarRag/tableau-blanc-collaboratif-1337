// Creer et verifier les sessions de connexion de l'application
import crypto from "crypto";
import {
    creerSession,
    chargerUtilisateurParSession,
    supprimerSession
} from "./baseDeDonnees.js";

const nomCookieSession = "session_tableau_blanc";
const dureeSessionMillisecondes = 7 * 24 * 60 * 60 * 1000;

function lireCookies(requete) {
    let cookies = {};
    let enteteCookie = requete.headers.cookie || "";

    for (const partie of enteteCookie.split(";")) {
        let positionEgal = partie.indexOf("=");

        if (positionEgal === -1) {
            continue;
        }

        let nom = partie.slice(0, positionEgal).trim();
        let valeur = partie.slice(positionEgal + 1).trim();

        cookies[nom] = decodeURIComponent(valeur);
    }

    return cookies;
}

function hacherJeton(jeton) {
    return crypto.createHash("sha256").update(jeton).digest("hex");
}

export function obtenirJetonSession(requete) {
    return lireCookies(requete)[nomCookieSession] || "";
}

export async function creerConnexion(utilisateur, reponse) {
    let jeton = crypto.randomBytes(32).toString("hex");
    let jetonHash = hacherJeton(jeton);
    let dateExpiration = new Date(Date.now() + dureeSessionMillisecondes);

    await creerSession(jetonHash, utilisateur.id, dateExpiration);

    let optionsCookie = [
        nomCookieSession + "=" + jeton,
        "HttpOnly",
        "SameSite=Lax",
        "Path=/",
        "Max-Age=" + Math.floor(dureeSessionMillisecondes / 1000)
    ];

    if (process.env.NODE_ENV === "production") {
        optionsCookie.push("Secure");
    }

    reponse.setHeader("Set-Cookie", optionsCookie.join("; "));
}

export async function fermerConnexion(requete, reponse) {
    let jeton = obtenirJetonSession(requete);

    if (jeton) {
        await supprimerSession(hacherJeton(jeton));
    }

    let optionsCookie = [
        nomCookieSession + "=",
        "HttpOnly",
        "SameSite=Lax",
        "Path=/",
        "Max-Age=0"
    ];

    if (process.env.NODE_ENV === "production") {
        optionsCookie.push("Secure");
    }

    reponse.setHeader("Set-Cookie", optionsCookie.join("; "));
}

export async function obtenirUtilisateurDepuisRequete(requete) {
    let jeton = obtenirJetonSession(requete);

    if (!jeton) {
        return null;
    }

    return chargerUtilisateurParSession(hacherJeton(jeton));
}

export async function authentificationObligatoire(
    requete,
    reponse,
    suivant
) {
    try {
        let utilisateur = await obtenirUtilisateurDepuisRequete(requete);

        if (!utilisateur) {
            reponse.status(401).json({ erreur: "Connexion requise." });
            return;
        }

        requete.utilisateur = utilisateur;
        suivant();
    }
    catch (erreur) {
        console.error("Verification de la session impossible.", erreur);
        reponse.status(500).json({ erreur: "Erreur du serveur." });
    }
}

export function nomDepuisEmail(email) {
    return String(email || "Utilisateur").split("@")[0].slice(0, 30);
}
