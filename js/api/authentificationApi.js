// Requetes liees a la connexion de l'utilisateur
const adresseAuthentification = "/api/auth";

async function envoyerRequete(adresse, options) {
    let reponse = await fetch(adresse, options);
    let contenu = null;

    if (reponse.status !== 204) {
        contenu = await reponse.json();
    }

    if (!reponse.ok) {
        let erreur = new Error(
            contenu && contenu.erreur
                ? contenu.erreur
                : "La demande au serveur a echoue."
        );

        erreur.statut = reponse.status;
        throw erreur;
    }

    return contenu;
}

export async function chargerConfigurationGoogle() {
    return envoyerRequete(adresseAuthentification + "/configuration");
}

export async function connecterAvecGoogle(credential) {
    return envoyerRequete(adresseAuthentification + "/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credential })
    });
}

export async function obtenirUtilisateurConnecte() {
    return envoyerRequete(adresseAuthentification + "/moi");
}

export async function seDeconnecter() {
    return envoyerRequete(adresseAuthentification + "/deconnexion", {
        method: "POST"
    });
}
