import { seDeconnecter } from "../api/authentificationApi.js";

// Afficher le nom transmis par la page Mes tableaux
const nomTableauOuvert = document.getElementById("nom-tableau-ouvert");
const boutonDeconnexion = document.getElementById("deconnexion-tableau");
const parametres = new URLSearchParams(window.location.search);
const nomTableau = parametres.get("nom") || "Mon tableau";

nomTableauOuvert.textContent = nomTableau;

boutonDeconnexion.addEventListener("click", async function () {
    boutonDeconnexion.disabled = true;

    try {
        await seDeconnecter();
        sessionStorage.removeItem("nomUtilisateur");
        window.location.replace("connexion.html");
    }
    catch (erreur) {
        console.error("Deconnexion impossible.", erreur);
        boutonDeconnexion.disabled = false;
    }
});
