// Adresses HTTP permettant au navigateur de gerer les tableaux
import express from "express";
import {
    creerTableau,
    listerTableaux,
    chargerTableau,
    chargerAccesTableau,
    modifierTableau,
    supprimerTableau,
    listerPartagesTableau,
    enregistrerLienPartage,
    supprimerLienPartage
} from "./baseDeDonnees.js";
import { authentificationObligatoire } from "./authentification.js";
import {
    creerJetonPartage,
    hacherJetonPartage,
    permissionValide
} from "./autorisationsTableaux.js";

const routesTableaux = express.Router();

// Toutes les actions sur les tableaux demandent une connexion valide.
routesTableaux.use(authentificationObligatoire);

function identifiantValide(identifiant) {
    return typeof identifiant === "string"
        && identifiant.trim().length > 0
        && identifiant.length <= 120;
}

function contenuTableauValide(tableau, identifiantObligatoire) {
    if (!tableau || typeof tableau !== "object") {
        return false;
    }

    if (identifiantObligatoire && !identifiantValide(tableau.id)) {
        return false;
    }

    return typeof tableau.nom === "string"
        && tableau.nom.trim().length > 0
        && tableau.nom.length <= 150
        && Array.isArray(tableau.formes);
}

// Creer un tableau
routesTableaux.post("/", async function (requete, reponse) {
    if (!contenuTableauValide(requete.body, true)) {
        reponse.status(400).json({
            erreur: "L'identifiant, le nom ou les formes sont invalides."
        });
        return;
    }

    try {
        let tableau = await creerTableau(
            {
                id: requete.body.id.trim(),
                nom: requete.body.nom.trim(),
                formes: requete.body.formes
            },
            requete.utilisateur.id
        );

        reponse
            .location("/api/tableaux/" + encodeURIComponent(tableau.id))
            .status(201)
            .json(tableau);
    }
    catch (erreur) {
        if (erreur.code === "23505") {
            reponse.status(409).json({
                erreur: "Un tableau avec cet identifiant existe deja."
            });
            return;
        }

        console.error("Creation du tableau impossible.", erreur);
        reponse.status(500).json({ erreur: "Erreur du serveur." });
    }
});

// Lister les tableaux
routesTableaux.get("/", async function (requete, reponse) {
    try {
        let tableaux = await listerTableaux(requete.utilisateur);
        reponse.json(tableaux);
    }
    catch (erreur) {
        console.error("Lecture des tableaux impossible.", erreur);
        reponse.status(500).json({ erreur: "Erreur du serveur." });
    }
});

// Lire le lien actif d'un tableau appartenant a l'utilisateur
routesTableaux.get("/:id/partage", async function (requete, reponse) {
    try {
        let partages = await listerPartagesTableau(
            requete.params.id,
            requete.utilisateur.id
        );

        if (!partages) {
            reponse.status(403).json({ erreur: "Action reservee au proprietaire." });
            return;
        }

        reponse.json(partages);
    }
    catch (erreur) {
        console.error("Lecture des partages impossible.", erreur);
        reponse.status(500).json({ erreur: "Erreur du serveur." });
    }
});

// Creer le seul lien actif : lecture ou modification
routesTableaux.post("/:id/liens", async function (requete, reponse) {
    let permission = requete.body && requete.body.permission;

    if (!permissionValide(permission)) {
        reponse.status(400).json({ erreur: "Permission invalide." });
        return;
    }

    try {
        let jeton = creerJetonPartage();
        let lien = await enregistrerLienPartage(
            requete.params.id,
            hacherJetonPartage(jeton),
            permission,
            requete.utilisateur.id
        );

        if (!lien) {
            reponse.status(403).json({ erreur: "Action reservee au proprietaire." });
            return;
        }

        reponse.status(201).json({
            id: lien.id,
            permission: lien.permission,
            jeton: jeton
        });
    }
    catch (erreur) {
        console.error("Creation du lien impossible.", erreur);
        reponse.status(500).json({ erreur: "Erreur du serveur." });
    }
});

routesTableaux.delete("/:id/liens/:lienId", async function (requete, reponse) {
    try {
        let suppression = await supprimerLienPartage(
            requete.params.id,
            requete.params.lienId,
            requete.utilisateur.id
        );

        if (!suppression) {
            reponse.status(404).json({ erreur: "Lien introuvable." });
            return;
        }

        reponse.sendStatus(204);
    }
    catch (erreur) {
        console.error("Suppression du lien impossible.", erreur);
        reponse.status(500).json({ erreur: "Erreur du serveur." });
    }
});

// Charger un tableau precis
routesTableaux.get("/:id", async function (requete, reponse) {
    try {
        let acces = await chargerAccesTableau(
            requete.params.id,
            requete.utilisateur,
            hacherJetonPartage(requete.query.partage || "")
        );

        if (!acces) {
            let tableauExistant = await chargerTableau(requete.params.id);

            if (!tableauExistant) {
                reponse.status(404).json({ erreur: "Tableau introuvable." });
            }
            else {
                reponse.status(403).json({ erreur: "Acces au tableau refuse." });
            }

            return;
        }

        let tableau = acces.tableau;

        reponse.json({
            id: tableau.id,
            nom: tableau.nom,
            formes: tableau.formes,
            cree_le: tableau.cree_le,
            modifie_le: tableau.modifie_le,
            permission: acces.permission,
            estProprietaire: acces.estProprietaire
        });
    }
    catch (erreur) {
        console.error("Chargement du tableau impossible.", erreur);
        reponse.status(500).json({ erreur: "Erreur du serveur." });
    }
});

// Modifier le nom et le dessin d'un tableau
routesTableaux.put("/:id", async function (requete, reponse) {
    if (!contenuTableauValide(requete.body, false)) {
        reponse.status(400).json({
            erreur: "Le nom ou les formes sont invalides."
        });
        return;
    }

    try {
        let tableau = await modifierTableau(requete.params.id, {
            nom: requete.body.nom.trim(),
            formes: requete.body.formes
        }, requete.utilisateur.id);

        if (!tableau) {
            reponse.status(404).json({ erreur: "Tableau introuvable." });
            return;
        }

        reponse.json(tableau);
    }
    catch (erreur) {
        console.error("Modification du tableau impossible.", erreur);
        reponse.status(500).json({ erreur: "Erreur du serveur." });
    }
});

// Supprimer un tableau
routesTableaux.delete("/:id", async function (requete, reponse) {
    try {
        let suppressionEffectuee = await supprimerTableau(
            requete.params.id,
            requete.utilisateur.id
        );

        if (!suppressionEffectuee) {
            reponse.status(404).json({ erreur: "Tableau introuvable." });
            return;
        }

        reponse.sendStatus(204);
    }
    catch (erreur) {
        console.error("Suppression du tableau impossible.", erreur);
        reponse.status(500).json({ erreur: "Erreur du serveur." });
    }
});

export default routesTableaux;
