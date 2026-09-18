import WebSocket from "ws";
import {
    creerAuthentificationTest,
    nettoyerAuthentificationTest
} from "./aideAuthentification.js";

const adresseSite = (process.env.TEST_BASE_URL || "http://localhost:8000")
    .replace(/\/$/, "");
const adresseServeur = adresseSite
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:");
const adresseApi = adresseSite + "/api/tableaux";
const identifiantSalle = "test-" + Date.now();
const authentification = await creerAuthentificationTest("temps-reel");
const authentificationLecture = await creerAuthentificationTest("lecture");

function connecter(
    formes,
    utilisateur,
    connexion = authentification,
    jetonPartage = ""
) {
    return new Promise(function (resoudre, rejeter) {
        let minuterie = setTimeout(function () {
            socket.close();
            rejeter(new Error("Connexion WebSocket sans etat initial."));
        }, 5000);
        let socket = new WebSocket(adresseServeur, {
            headers: { Cookie: connexion.cookie }
        });

        socket.on("open", function () {
            socket.send(JSON.stringify({
                type: "rejoindre",
                tableau: identifiantSalle,
                partage: jetonPartage,
                utilisateur: utilisateur,
                nom: utilisateur,
                couleur: "#1976d2",
                formes: formes
            }));
        });

        socket.on("message", function (donnee) {
            let message = JSON.parse(donnee);

            if (message.type === "etatTableau") {
                clearTimeout(minuterie);
                resoudre({
                    socket: socket,
                    formes: message.formes
                });
            }

            if (message.type === "erreur") {
                clearTimeout(minuterie);
                socket.close();
                rejeter(new Error(message.message));
            }
        });

        socket.on("error", rejeter);
    });
}

function attendreErreur(socket) {
    return new Promise(function (resoudre, rejeter) {
        let minuterie = setTimeout(function () {
            rejeter(new Error("Refus de permission non recu."));
        }, 3000);

        function gererMessage(donnee) {
            let message = JSON.parse(donnee);

            if (message.type !== "erreur") {
                return;
            }

            clearTimeout(minuterie);
            socket.off("message", gererMessage);
            resoudre(message);
        }

        socket.on("message", gererMessage);
    });
}

function attendreApercu(socket, utilisateur, formePresente) {
    return new Promise(function (resoudre, rejeter) {
        let minuterie = setTimeout(function () {
            rejeter(new Error("Apercu non recu."));
        }, 3000);

        function gererMessage(donnee) {
            let message = JSON.parse(donnee);

            if (message.type !== "apercu") {
                return;
            }

            if (message.utilisateur !== utilisateur) {
                return;
            }

            if (Boolean(message.forme) !== formePresente) {
                return;
            }

            clearTimeout(minuterie);
            socket.off("message", gererMessage);
            resoudre(message.forme);
        }

        socket.on("message", gererMessage);
    });
}

function attendreCurseur(socket, utilisateur, positionPresente) {
    return new Promise(function (resoudre, rejeter) {
        let minuterie = setTimeout(function () {
            rejeter(new Error("Curseur non recu."));
        }, 3000);

        function gererMessage(donnee) {
            let message = JSON.parse(donnee);

            if (message.type !== "curseur") {
                return;
            }

            if (message.utilisateur !== utilisateur) {
                return;
            }

            if (Boolean(message.position) !== positionPresente) {
                return;
            }

            clearTimeout(minuterie);
            socket.off("message", gererMessage);
            resoudre(message.position);
        }

        socket.on("message", gererMessage);
    });
}

function attendreForme(socket, identifiantForme) {
    return new Promise(function (resoudre, rejeter) {
        let minuterie = setTimeout(function () {
            rejeter(new Error("Forme non recue : " + identifiantForme));
        }, 3000);

        function gererMessage(donnee) {
            let message = JSON.parse(donnee);

            if (message.type !== "operations") {
                return;
            }

            let formeTrouvee = message.modifications.some(function (forme) {
                return forme.id === identifiantForme;
            });

            if (formeTrouvee) {
                clearTimeout(minuterie);
                socket.off("message", gererMessage);
                resoudre();
            }
        }

        socket.on("message", gererMessage);
    });
}

function attendreConfirmation(socket, operationId) {
    return new Promise(function (resoudre, rejeter) {
        let minuterie = setTimeout(function () {
            rejeter(new Error("Confirmation non recue : " + operationId));
        }, 3000);

        function gererMessage(donnee) {
            let message = JSON.parse(donnee);

            if (
                message.type !== "confirmation"
                || message.operationId !== operationId
            ) {
                return;
            }

            clearTimeout(minuterie);
            socket.off("message", gererMessage);
            resoudre();
        }

        socket.on("message", gererMessage);
    });
}

let formesInitiales = [
    {
        id: "forme-a",
        type: "rectangle",
        x: 1,
        y: 1
    }
];

let creationTableau = await fetch(adresseApi, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Cookie: authentification.cookie
    },
    body: JSON.stringify({
        id: identifiantSalle,
        nom: "Test temps reel",
        formes: formesInitiales
    })
});

if (creationTableau.status !== 201) {
    throw new Error("Creation du tableau de test impossible.");
}

let premierClient = await connecter(formesInitiales, "utilisateur-a");

let deuxiemeClient = await connecter([], "utilisateur-b");

if (deuxiemeClient.formes.length !== 1) {
    throw new Error("Le deuxieme client ne recoit pas le dessin initial.");
}

let receptionCurseur = attendreCurseur(
    deuxiemeClient.socket,
    "utilisateur-a",
    true
);

premierClient.socket.send(JSON.stringify({
    type: "curseur",
    position: {
        x: 25,
        y: 40
    }
}));

let curseurRecu = await receptionCurseur;

if (curseurRecu.x !== 25 || curseurRecu.y !== 40) {
    throw new Error("La position du curseur est incorrecte.");
}

let disparitionCurseur = attendreCurseur(
    deuxiemeClient.socket,
    "utilisateur-a",
    false
);

premierClient.socket.send(JSON.stringify({
    type: "curseur",
    position: null
}));

await disparitionCurseur;

let receptionApercu = attendreApercu(
    deuxiemeClient.socket,
    "utilisateur-a",
    true
);

premierClient.socket.send(JSON.stringify({
    type: "apercu",
    forme: {
        id: "forme-temporaire",
        type: "rectangle",
        x: 10,
        y: 10,
        largeur: 30,
        hauteur: 20
    }
}));

let apercuRecu = await receptionApercu;

if (apercuRecu.id !== "forme-temporaire") {
    throw new Error("Le contenu de l'apercu est incorrect.");
}

let suppressionApercu = attendreApercu(
    deuxiemeClient.socket,
    "utilisateur-a",
    false
);

premierClient.socket.send(JSON.stringify({
    type: "apercu",
    forme: null
}));

await suppressionApercu;

let receptionCercle = attendreForme(deuxiemeClient.socket, "forme-x");

premierClient.socket.send(JSON.stringify({
    type: "modifier",
    operationId: "operation-x",
    modifications: [
        {
            id: "forme-x",
            type: "cercle",
            x: 2,
            y: 2
        }
    ],
    suppressions: []
}));

await receptionCercle;

let receptionLigne = attendreForme(premierClient.socket, "forme-y");

deuxiemeClient.socket.send(JSON.stringify({
    type: "modifier",
    operationId: "operation-y",
    modifications: [
        {
            id: "forme-y",
            type: "ligne",
            x1: 0,
            y1: 0,
            x2: 5,
            y2: 5
        }
    ],
    suppressions: []
}));

await receptionLigne;

// Deux modifications simultanees de la meme forme sont departagees par leur date.
let receptionModificationRecente = attendreForme(
    premierClient.socket,
    "forme-a"
);

deuxiemeClient.socket.send(JSON.stringify({
    type: "modifier",
    operationId: "conflit-recent",
    date: 200,
    horloge: {
        "utilisateur-b": 1
    },
    modifications: [
        {
            id: "forme-a",
            type: "rectangle",
            x: 20,
            y: 20
        }
    ],
    suppressions: []
}));

await receptionModificationRecente;

let confirmationModificationAncienne = attendreConfirmation(
    premierClient.socket,
    "conflit-ancien"
);

premierClient.socket.send(JSON.stringify({
    type: "modifier",
    operationId: "conflit-ancien",
    date: 100,
    horloge: {
        "utilisateur-a": 1
    },
    modifications: [
        {
            id: "forme-a",
            type: "rectangle",
            x: 10,
            y: 10
        }
    ],
    suppressions: []
}));

await confirmationModificationAncienne;

let troisiemeClient = await connecter([], "utilisateur-c");
let identifiants = troisiemeClient.formes.map(function (forme) {
    return forme.id;
});

identifiants.sort();

if (identifiants.join(",") !== "forme-a,forme-x,forme-y") {
    throw new Error("Etat final incorrect : " + identifiants.join(","));
}

let formeApresConflit = troisiemeClient.formes.find(function (forme) {
    return forme.id === "forme-a";
});

if (!formeApresConflit || formeApresConflit.x !== 20) {
    throw new Error("La modification ancienne a remplace la plus recente.");
}

// Verifier une diffusion avec cinq utilisateurs connectes en meme temps.
let quatriemeClient = await connecter([], "utilisateur-d");
let cinquiemeClient = await connecter([], "utilisateur-e");
let receptionsCurseurCharge = [
    deuxiemeClient,
    troisiemeClient,
    quatriemeClient,
    cinquiemeClient
].map(function (client) {
    return attendreCurseur(client.socket, "utilisateur-a", true);
});

premierClient.socket.send(JSON.stringify({
    type: "curseur",
    position: {
        x: 75,
        y: 90
    }
}));

let curseursRecusCharge = await Promise.all(receptionsCurseurCharge);

if (curseursRecusCharge.some(function (curseur) {
    return curseur.x !== 75 || curseur.y !== 90;
})) {
    throw new Error("Diffusion incorrecte avec cinq utilisateurs.");
}

let reponseLienLecture = await fetch(
    adresseApi + "/" + encodeURIComponent(identifiantSalle) + "/liens",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: authentification.cookie
        },
        body: JSON.stringify({ permission: "lecture" })
    }
);
let lienLecture = await reponseLienLecture.json();
let clientLecture = await connecter(
    [],
    "utilisateur-lecture",
    authentificationLecture,
    lienLecture.jeton
);
let refusModification = attendreErreur(clientLecture.socket);

clientLecture.socket.send(JSON.stringify({
    type: "modifier",
    operationId: "operation-interdite",
    modifications: [
        {
            id: "forme-interdite",
            type: "cercle",
            x: 100,
            y: 100
        }
    ],
    suppressions: []
}));

await refusModification;

let reponseTableauSauvegarde = await fetch(
    adresseApi + "/" + encodeURIComponent(identifiantSalle),
    { headers: { Cookie: authentification.cookie } }
);
let tableauSauvegarde = await reponseTableauSauvegarde.json();
let identifiantsSauvegardes = tableauSauvegarde.formes.map(function (forme) {
    return forme.id;
});

identifiantsSauvegardes.sort();

if (identifiantsSauvegardes.join(",") !== "forme-a,forme-x,forme-y") {
    throw new Error("Le dessin temps reel n'est pas sauvegarde dans PostgreSQL.");
}

console.log(
    "Test temps reel reussi avec cinq utilisateurs : "
    + identifiants.join(", ")
);

premierClient.socket.close();
deuxiemeClient.socket.close();
troisiemeClient.socket.close();
quatriemeClient.socket.close();
cinquiemeClient.socket.close();
clientLecture.socket.close();

await fetch(
    adresseApi + "/" + encodeURIComponent(identifiantSalle),
    {
        method: "DELETE",
        headers: { Cookie: authentification.cookie }
    }
);

await nettoyerAuthentificationTest(
    authentification.utilisateur.id,
    false
);
await nettoyerAuthentificationTest(
    authentificationLecture.utilisateur.id
);
