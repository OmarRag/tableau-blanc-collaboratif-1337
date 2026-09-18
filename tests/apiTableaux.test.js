import assert from "node:assert/strict";
import {
    creerAuthentificationTest,
    nettoyerAuthentificationTest
} from "./aideAuthentification.js";

const adresseSite = (process.env.TEST_BASE_URL || "http://localhost:8000")
    .replace(/\/$/, "");
const adresseApi = adresseSite + "/api/tableaux";
const identifiantTest = "test-api-" + Date.now();
const deuxiemeIdentifiantTest = identifiantTest + "-second";
const authentification = await creerAuthentificationTest("api");
const autreAuthentification = await creerAuthentificationTest("api-autre");

async function envoyerRequete(
    adresse,
    options,
    connexion = authentification
) {
    let optionsFinales = options || {};

    optionsFinales.headers = {
        ...optionsFinales.headers,
        Cookie: connexion.cookie
    };

    let reponse = await fetch(adresse, optionsFinales);
    let contenu = null;

    if (reponse.status !== 204) {
        contenu = await reponse.json();
    }

    return {
        statut: reponse.status,
        contenu: contenu
    };
}

try {
    let creation = await envoyerRequete(adresseApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: identifiantTest,
            nom: "Tableau API",
            formes: []
        })
    });

    assert.equal(creation.statut, 201);
    assert.equal(creation.contenu.id, identifiantTest);

    let nomDuplique = await envoyerRequete(adresseApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: identifiantTest + "-doublon-nom",
            nom: "tableau api",
            formes: []
        })
    });

    assert.equal(nomDuplique.statut, 409);

    let deuxiemeCreation = await envoyerRequete(adresseApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: deuxiemeIdentifiantTest,
            nom: "Deuxieme tableau API",
            formes: []
        })
    });

    assert.equal(deuxiemeCreation.statut, 201);

    let accesPriveRefuse = await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(identifiantTest),
        undefined,
        autreAuthentification
    );
    assert.equal(accesPriveRefuse.statut, 403);

    let lienLecture = await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(identifiantTest) + "/liens",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ permission: "lecture" })
        }
    );
    assert.equal(lienLecture.statut, 201);

    let lectureParLien = await envoyerRequete(
        adresseApi
            + "/"
            + encodeURIComponent(identifiantTest)
            + "?partage="
            + encodeURIComponent(lienLecture.contenu.jeton),
        undefined,
        autreAuthentification
    );
    assert.equal(lectureParLien.statut, 200);
    assert.equal(lectureParLien.contenu.permission, "lecture");

    let lienModification = await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(identifiantTest) + "/liens",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ permission: "modification" })
        }
    );
    assert.equal(lienModification.statut, 201);

    let ancienLienDesactive = await envoyerRequete(
        adresseApi
            + "/"
            + encodeURIComponent(identifiantTest)
            + "?partage="
            + encodeURIComponent(lienLecture.contenu.jeton),
        undefined,
        autreAuthentification
    );
    assert.equal(ancienLienDesactive.statut, 403);

    let modificationParLien = await envoyerRequete(
        adresseApi
            + "/"
            + encodeURIComponent(identifiantTest)
            + "?partage="
            + encodeURIComponent(lienModification.contenu.jeton),
        undefined,
        autreAuthentification
    );
    assert.equal(modificationParLien.statut, 200);
    assert.equal(modificationParLien.contenu.permission, "modification");

    let partages = await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(identifiantTest) + "/partage"
    );
    assert.equal(partages.contenu.liens.length, 1);
    assert.equal(partages.contenu.liens[0].permission, "modification");

    let doublon = await envoyerRequete(adresseApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: identifiantTest,
            nom: "Doublon",
            formes: []
        })
    });

    assert.equal(doublon.statut, 409);

    let liste = await envoyerRequete(adresseApi);
    assert.equal(liste.statut, 200);
    assert.ok(liste.contenu.some(function (tableau) {
        return tableau.id === identifiantTest;
    }));
    assert.ok(
        liste.contenu.findIndex(function (tableau) {
            return tableau.id === identifiantTest;
        }) < liste.contenu.findIndex(function (tableau) {
            return tableau.id === deuxiemeIdentifiantTest;
        })
    );

    let renommageDuplique = await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(deuxiemeIdentifiantTest),
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nom: "TABLEAU API",
                formes: []
            })
        }
    );

    assert.equal(renommageDuplique.statut, 409);

    let chargement = await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(identifiantTest)
    );

    assert.equal(chargement.statut, 200);
    assert.equal(chargement.contenu.nom, "Tableau API");

    let modification = await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(identifiantTest),
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nom: "Tableau API modifie",
                formes: [
                    {
                        id: "forme-api",
                        type: "cercle",
                        x: 30,
                        y: 40
                    }
                ]
            })
        }
    );

    assert.equal(modification.statut, 200);
    assert.equal(modification.contenu.nom, "Tableau API modifie");
    assert.equal(modification.contenu.formes.length, 1);

    let suppression = await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(identifiantTest),
        { method: "DELETE" }
    );

    assert.equal(suppression.statut, 204);

    let apresSuppression = await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(identifiantTest)
    );

    assert.equal(apresSuppression.statut, 404);
    console.log("Test API reussi : creer, lister, charger, modifier et supprimer.");
}
finally {
    await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(identifiantTest),
        { method: "DELETE" }
    );
    await envoyerRequete(
        adresseApi + "/" + encodeURIComponent(deuxiemeIdentifiantTest),
        { method: "DELETE" }
    );
    await nettoyerAuthentificationTest(
        authentification.utilisateur.id,
        false
    );
    await nettoyerAuthentificationTest(autreAuthentification.utilisateur.id);
}
