import assert from "node:assert/strict";
import {
    creerAuthentificationTest,
    nettoyerAuthentificationTest
} from "./aideAuthentification.js";

const adresseSite = (process.env.TEST_BASE_URL || "http://localhost:8000")
    .replace(/\/$/, "");
const adresse = adresseSite + "/api/auth";
const authentification = await creerAuthentificationTest("auth");

try {
    let sansSession = await fetch(adresse + "/moi");
    assert.equal(sansSession.status, 401);

    let avecSession = await fetch(adresse + "/moi", {
        headers: { Cookie: authentification.cookie }
    });
    let utilisateur = await avecSession.json();

    assert.equal(avecSession.status, 200);
    assert.equal(utilisateur.email, authentification.utilisateur.email);

    let destinationAttendue = "/index.html?tableau=test-partage&partage=secret";
    let redirectionConnexion = await fetch(
        adresseSite + destinationAttendue,
        { redirect: "manual" }
    );
    let adresseConnexion = new URL(
        redirectionConnexion.headers.get("location"),
        adresseSite
    );

    assert.equal(redirectionConnexion.status, 302);
    assert.equal(adresseConnexion.pathname, "/connexion.html");
    assert.equal(
        adresseConnexion.searchParams.get("retour"),
        destinationAttendue
    );

    let redirectionRetour = await fetch(adresseConnexion, {
        headers: { Cookie: authentification.cookie },
        redirect: "manual"
    });

    assert.equal(redirectionRetour.status, 302);
    assert.equal(
        redirectionRetour.headers.get("location"),
        destinationAttendue
    );

    let deconnexion = await fetch(adresse + "/deconnexion", {
        method: "POST",
        headers: { Cookie: authentification.cookie }
    });
    assert.equal(deconnexion.status, 204);

    let apresDeconnexion = await fetch(adresse + "/moi", {
        headers: { Cookie: authentification.cookie }
    });
    assert.equal(apresDeconnexion.status, 401);

    console.log(
        "Test authentification reussi : session, retour et deconnexion."
    );
}
finally {
    await nettoyerAuthentificationTest(authentification.utilisateur.id);
}
