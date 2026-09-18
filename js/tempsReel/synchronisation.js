// Synchronisation du dessin entre plusieurs navigateurs avec WebSocket

let socket = null;
let identifiantTableau = "";
let jetonPartage = "";
let lireDessin = null;
let remplacerDessin = null;
let appliquerOperationsRecues = null;
let afficherApercusRecus = null;
let afficherCurseursRecus = null;
let dernierDessinConnu = [];
let operationsEnAttente = [];
let horlogeLocale = {};
let minuterieReconnexion = null;
let apercusDistants = new Map();
let apercuEnAttente;
let minuterieApercu = null;
let dateDernierApercu = 0;
const delaiEntreApercus = 35;
let curseurEnAttente;
let minuterieCurseur = null;
let dateDernierCurseur = 0;
const delaiEntreCurseurs = 35;
let curseursDistants = new Map();
const identifiantUtilisateur = "utilisateur-"
    + Date.now()
    + "-"
    + Math.random().toString(36).substring(2, 10);

const couleursUtilisateurs = [
    "#d32f2f",
    "#1976d2",
    "#388e3c",
    "#7b1fa2",
    "#f57c00",
    "#00838f"
];

function choisirCouleurUtilisateur() {
    let total = 0;

    for (let i = 0; i < identifiantUtilisateur.length; i++) {
        total += identifiantUtilisateur.charCodeAt(i);
    }

    return couleursUtilisateurs[total % couleursUtilisateurs.length];
}

const couleurUtilisateur = choisirCouleurUtilisateur();

function copier(donnee) {
    return JSON.parse(JSON.stringify(donnee));
}

// Memoriser le plus grand compteur connu pour chaque utilisateur
function fusionnerHorloge(horlogeRecue) {
    if (!horlogeRecue || typeof horlogeRecue !== "object") {
        return;
    }

    for (const utilisateur in horlogeRecue) {
        let compteurRecu = Number(horlogeRecue[utilisateur]);
        let compteurActuel = horlogeLocale[utilisateur] || 0;

        if (Number.isFinite(compteurRecu) && compteurRecu > compteurActuel) {
            horlogeLocale[utilisateur] = Math.floor(compteurRecu);
        }
    }
}

// Avancer notre propre compteur avant une nouvelle action
function avancerHorlogeLocale() {
    let compteurActuel = horlogeLocale[identifiantUtilisateur] || 0;
    horlogeLocale[identifiantUtilisateur] = compteurActuel + 1;

    return copier(horlogeLocale);
}

function formesIdentiques(premiereForme, deuxiemeForme) {
    return JSON.stringify(premiereForme) === JSON.stringify(deuxiemeForme);
}

// Comparer l'ancien dessin et le nouveau dessin
function trouverOperations(ancienDessin, nouveauDessin) {
    let anciennesFormes = new Map();
    let nouvellesFormes = new Map();
    let modifications = [];
    let suppressions = [];

    for (const forme of ancienDessin) {
        anciennesFormes.set(forme.id, forme);
    }

    for (const forme of nouveauDessin) {
        nouvellesFormes.set(forme.id, forme);

        let ancienneForme = anciennesFormes.get(forme.id);

        if (!ancienneForme || !formesIdentiques(ancienneForme, forme)) {
            modifications.push(copier(forme));
        }
    }

    for (const forme of ancienDessin) {
        if (!nouvellesFormes.has(forme.id)) {
            suppressions.push(forme.id);
        }
    }

    return {
        modifications: modifications,
        suppressions: suppressions
    };
}

// Appliquer des operations sur une copie du dessin
function appliquerOperationsSurCopie(dessin, modifications, suppressions) {
    let resultat = copier(dessin);

    resultat = resultat.filter(function (forme) {
        return !suppressions.includes(forme.id);
    });

    for (const formeRecue of modifications) {
        let index = resultat.findIndex(function (forme) {
            return forme.id === formeRecue.id;
        });

        if (index === -1) {
            resultat.push(copier(formeRecue));
        }
        else {
            resultat[index] = copier(formeRecue);
        }
    }

    return resultat;
}

function creerIdentifiantOperation() {
    let date = Date.now();
    let partieAleatoire = Math.random().toString(36).substring(2, 10);

    return "operation-" + date + "-" + partieAleatoire;
}

function socketEstOuvert() {
    return socket && socket.readyState === WebSocket.OPEN;
}

function envoyer(message) {
    if (!socketEstOuvert()) {
        return false;
    }

    socket.send(JSON.stringify(message));
    return true;
}

function envoyerOperationsEnAttente() {
    if (!socketEstOuvert()) {
        return;
    }

    for (const operation of operationsEnAttente) {
        envoyer({
            type: "modifier",
            operationId: operation.id,
            date: operation.date,
            horloge: operation.horloge,
            modifications: operation.modifications,
            suppressions: operation.suppressions
        });
    }
}

function transmettreApercu() {
    clearTimeout(minuterieApercu);
    minuterieApercu = null;

    if (apercuEnAttente === undefined) {
        return;
    }

    envoyer({
        type: "apercu",
        forme: apercuEnAttente
    });

    apercuEnAttente = undefined;
    dateDernierApercu = Date.now();
}

function transmettreCurseur() {
    clearTimeout(minuterieCurseur);
    minuterieCurseur = null;

    if (curseurEnAttente === undefined) {
        return;
    }

    envoyer({
        type: "curseur",
        position: curseurEnAttente
    });

    curseurEnAttente = undefined;
    dateDernierCurseur = Date.now();
}

function actualiserApercusDistants() {
    if (!afficherApercusRecus) {
        return;
    }

    afficherApercusRecus(Array.from(apercusDistants.values()));
}

function actualiserCurseursDistants() {
    if (!afficherCurseursRecus) {
        return;
    }

    afficherCurseursRecus(Array.from(curseursDistants.values()));
}

function programmerReconnexion() {
    clearTimeout(minuterieReconnexion);

    minuterieReconnexion = setTimeout(function () {
        connecter();
    }, 1000);
}

function traiterMessage(message) {
    if (message.type === "etatTableau") {
        let dessinRecu = Array.isArray(message.formes) ? message.formes : [];

        fusionnerHorloge(message.horloge);

        // Reposer les changements locaux qui attendent encore leur envoi.
        for (const operation of operationsEnAttente) {
            dessinRecu = appliquerOperationsSurCopie(
                dessinRecu,
                operation.modifications,
                operation.suppressions
            );
        }

        dernierDessinConnu = copier(dessinRecu);
        remplacerDessin(dessinRecu);
        envoyerOperationsEnAttente();
        return;
    }

    if (message.type === "operations") {
        let modifications = Array.isArray(message.modifications)
            ? message.modifications
            : [];
        let suppressions = Array.isArray(message.suppressions)
            ? message.suppressions
            : [];

        fusionnerHorloge(message.horloge);

        dernierDessinConnu = appliquerOperationsSurCopie(
            dernierDessinConnu,
            modifications,
            suppressions
        );

        // Une modification locale non confirmee reste visible jusqu'a la decision du serveur.
        for (const operation of operationsEnAttente) {
            dernierDessinConnu = appliquerOperationsSurCopie(
                dernierDessinConnu,
                operation.modifications,
                operation.suppressions
            );
        }

        appliquerOperationsRecues(modifications, suppressions);

        for (const operation of operationsEnAttente) {
            appliquerOperationsRecues(
                operation.modifications,
                operation.suppressions
            );
        }
        return;
    }

    if (message.type === "apercu") {
        if (!message.utilisateur) {
            return;
        }

        if (message.forme) {
            apercusDistants.set(message.utilisateur, message.forme);
        }
        else {
            apercusDistants.delete(message.utilisateur);
        }

        actualiserApercusDistants();
        return;
    }

    if (message.type === "curseur") {
        if (!message.utilisateur) {
            return;
        }

        if (message.position) {
            curseursDistants.set(message.utilisateur, {
                utilisateur: message.utilisateur,
                nom: message.nom || "Utilisateur",
                couleur: message.couleur || "#2d6cdf",
                x: message.position.x,
                y: message.position.y
            });
        }
        else {
            curseursDistants.delete(message.utilisateur);
        }

        actualiserCurseursDistants();
        return;
    }

    if (message.type === "confirmation") {
        fusionnerHorloge(message.horloge);

        operationsEnAttente = operationsEnAttente.filter(function (operation) {
            return operation.id !== message.operationId;
        });
        return;
    }

    if (message.type === "correction") {
        let dessinCorrige = Array.isArray(message.formes) ? message.formes : [];

        fusionnerHorloge(message.horloge);

        for (const operation of operationsEnAttente) {
            dessinCorrige = appliquerOperationsSurCopie(
                dessinCorrige,
                operation.modifications,
                operation.suppressions
            );
        }

        dernierDessinConnu = copier(dessinCorrige);
        remplacerDessin(dessinCorrige);
    }
}

function connecter() {
    let protocole = window.location.protocol === "https:" ? "wss:" : "ws:";
    let adresse = protocole + "//" + window.location.host;

    socket = new WebSocket(adresse);

    socket.addEventListener("open", function () {
        envoyer({
            type: "rejoindre",
            tableau: identifiantTableau,
            partage: jetonPartage,
            utilisateur: identifiantUtilisateur,
            couleur: couleurUtilisateur,
            formes: lireDessin()
        });
    });

    socket.addEventListener("message", function (evenement) {
        try {
            let message = JSON.parse(evenement.data);
            traiterMessage(message);
        }
        catch (erreur) {
            console.error("Message temps reel invalide.", erreur);
        }
    });

    socket.addEventListener("close", function () {
        apercusDistants.clear();
        curseursDistants.clear();
        actualiserApercusDistants();
        actualiserCurseursDistants();
        programmerReconnexion();
    });
    socket.addEventListener("error", function () {
        socket.close();
    });
}

// Demarrer la connexion pour le tableau actuellement ouvert
export function demarrerSynchronisation(
    tableau,
    partage,
    obtenirDessin,
    remplacerToutLeDessin,
    appliquerOperationsAuDessin,
    afficherApercus,
    afficherCurseurs
) {
    identifiantTableau = tableau;
    jetonPartage = partage;
    lireDessin = obtenirDessin;
    remplacerDessin = remplacerToutLeDessin;
    appliquerOperationsRecues = appliquerOperationsAuDessin;
    afficherApercusRecus = afficherApercus;
    afficherCurseursRecus = afficherCurseurs;
    dernierDessinConnu = copier(lireDessin());
    horlogeLocale = {};

    connecter();
}

// Partager une forme temporaire pendant son dessin
export function envoyerApercu(forme) {
    if (!forme) {
        clearTimeout(minuterieApercu);
        minuterieApercu = null;
        apercuEnAttente = null;
        transmettreApercu();
        return;
    }

    apercuEnAttente = copier(forme);

    let tempsEcoule = Date.now() - dateDernierApercu;

    if (tempsEcoule >= delaiEntreApercus) {
        transmettreApercu();
        return;
    }

    if (!minuterieApercu) {
        let tempsRestant = delaiEntreApercus - tempsEcoule;
        minuterieApercu = setTimeout(transmettreApercu, tempsRestant);
    }
}

// Partager la position temporaire de la souris
export function envoyerCurseur(position) {
    if (!position) {
        clearTimeout(minuterieCurseur);
        minuterieCurseur = null;
        curseurEnAttente = null;
        transmettreCurseur();
        return;
    }

    curseurEnAttente = {
        x: position.x,
        y: position.y
    };

    let tempsEcoule = Date.now() - dateDernierCurseur;

    if (tempsEcoule >= delaiEntreCurseurs) {
        transmettreCurseur();
        return;
    }

    if (!minuterieCurseur) {
        let tempsRestant = delaiEntreCurseurs - tempsEcoule;
        minuterieCurseur = setTimeout(transmettreCurseur, tempsRestant);
    }
}

// Envoyer les changements produits par une action locale terminee
export function envoyerDessin(dessinActuel) {
    let operations = trouverOperations(dernierDessinConnu, dessinActuel);

    if (
        operations.modifications.length === 0
        && operations.suppressions.length === 0
    ) {
        return;
    }

    let operation = {
        id: creerIdentifiantOperation(),
        date: Date.now(),
        horloge: avancerHorlogeLocale(),
        modifications: operations.modifications,
        suppressions: operations.suppressions
    };

    operationsEnAttente.push(operation);
    dernierDessinConnu = copier(dessinActuel);

    envoyer({
        type: "modifier",
        operationId: operation.id,
        date: operation.date,
        horloge: operation.horloge,
        modifications: operation.modifications,
        suppressions: operation.suppressions
    });
}
