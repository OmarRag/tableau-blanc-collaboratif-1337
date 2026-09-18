// Exporter toutes les formes dans un fichier JSON
export function exporterJSON(formesDessinees) {
    let contenuJSON = JSON.stringify(formesDessinees, null, 2);
    let fichierJSON = new Blob([contenuJSON], {
        type: "application/json"
    });

    let adresseFichier = URL.createObjectURL(fichierJSON);
    let lien = document.createElement("a");
    lien.href = adresseFichier;
    lien.download = "mon-dessin.json";

    document.body.appendChild(lien);
    lien.click();
    lien.remove();

    // Attendre que le navigateur commence le telechargement
    setTimeout(function () {
        URL.revokeObjectURL(adresseFichier);
    }, 100);
}

// Lire un fichier JSON contenant des formes
export function importerJSON(fichier, apresImportation) {
    let lecteur = new FileReader();

    lecteur.addEventListener("load", function () {
        try {
            let formesImportees = JSON.parse(lecteur.result);

            if (!Array.isArray(formesImportees)) {
                throw new Error("Le fichier ne contient pas une liste de formes.");
            }

            apresImportation(formesImportees);
        }
        catch (erreur) {
            alert("Impossible d'importer ce fichier JSON.");
        }
    });

    lecteur.readAsText(fichier);
}
