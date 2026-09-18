import assert from "node:assert/strict";
import {
    enregistrerUtilisateurGoogle,
    creerTableau,
    chargerTableau,
    modifierTableau,
    supprimerTableau,
    supprimerUtilisateur,
    fermerConnexionBaseDeDonnees
} from "../serveur/baseDeDonnees.js";

const identifiantTest = "test-base-" + Date.now();
const formesTest = [
    {
        id: "rectangle-test",
        type: "rectangle",
        x: 10,
        y: 20
    }
];
const utilisateurTest = await enregistrerUtilisateurGoogle({
    googleId: "google-base-" + Date.now(),
    email: "base-" + Date.now() + "@example.com"
});

try {
    await creerTableau({
        id: identifiantTest,
        nom: "Tableau de test",
        formes: formesTest
    }, utilisateurTest.id);

    let tableauCharge = await chargerTableau(identifiantTest);

    assert.ok(tableauCharge, "Le tableau n'a pas ete retrouve.");
    assert.equal(tableauCharge.nom, "Tableau de test");
    assert.deepEqual(tableauCharge.formes, formesTest);

    let tableauModifie = await modifierTableau(identifiantTest, {
        nom: "Tableau modifie",
        formes: []
    }, utilisateurTest.id);

    assert.equal(tableauModifie.nom, "Tableau modifie");
    assert.deepEqual(tableauModifie.formes, []);

    console.log("Test PostgreSQL reussi : creation, lecture et modification.");
}
finally {
    await supprimerTableau(identifiantTest, utilisateurTest.id);
    await supprimerUtilisateur(utilisateurTest.id);
    await fermerConnexionBaseDeDonnees();
}
