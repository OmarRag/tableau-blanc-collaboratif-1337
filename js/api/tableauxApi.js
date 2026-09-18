// Requetes envoyees par le navigateur vers l'API des tableaux
const adresseTableaux = "/api/tableaux";

async function envoyerRequete(adresse, options) {
    let reponse = await fetch(adresse, options);
    let contenu = null;

    if (reponse.status !== 204) {
        contenu = await reponse.json();
    }

    if (!reponse.ok) {
        let message = contenu && contenu.erreur
            ? contenu.erreur
            : "La demande au serveur a echoue.";
        let erreur = new Error(message);

        erreur.statut = reponse.status;
        throw erreur;
    }

    return contenu;
}

export async function listerTableaux() {
    return envoyerRequete(adresseTableaux);
}

export async function creerTableau(id, nom, formes) {
    return envoyerRequete(adresseTableaux, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: id,
            nom: nom,
            formes: formes
        })
    });
}

export async function chargerTableau(id, jetonPartage = "") {
    let adresse = adresseTableaux + "/" + encodeURIComponent(id);

    if (jetonPartage) {
        adresse += "?partage=" + encodeURIComponent(jetonPartage);
    }

    return envoyerRequete(adresse);
}

export async function creerLienPartage(id, permission) {
    return envoyerRequete(
        adresseTableaux + "/" + encodeURIComponent(id) + "/liens",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ permission: permission })
        }
    );
}

export async function modifierTableau(id, nom, formes) {
    return envoyerRequete(
        adresseTableaux + "/" + encodeURIComponent(id),
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nom: nom,
                formes: formes
            })
        }
    );
}

export async function supprimerTableau(id) {
    return envoyerRequete(
        adresseTableaux + "/" + encodeURIComponent(id),
        { method: "DELETE" }
    );
}
