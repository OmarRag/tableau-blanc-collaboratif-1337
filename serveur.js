import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { rateLimit } from "express-rate-limit";
import { WebSocketServer, WebSocket } from "ws";
import {
    verifierConnexionBaseDeDonnees,
    chargerTableau,
    sauvegarderFormesTableau,
    chargerAccesTableau
} from "./serveur/baseDeDonnees.js";
import routesTableaux from "./serveur/routesTableaux.js";
import routesAuthentification from "./serveur/routesAuthentification.js";
import {
    obtenirUtilisateurDepuisRequete,
    nomDepuisEmail
} from "./serveur/authentification.js";
import { hacherJetonPartage } from "./serveur/autorisationsTableaux.js";

const application = express();

if (process.env.NODE_ENV === "production") {
    application.set("trust proxy", 1);
}

// Entetes necessaires au bouton Google pendant le developpement local
application.use(function (requete, reponse, suivant) {
    reponse.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    reponse.setHeader(
        "Cross-Origin-Opener-Policy",
        "same-origin-allow-popups"
    );
    suivant();
});

application.use(express.json({ limit: "10mb" }));
const serveurHttp = http.createServer(application);
const serveurWebSocket = new WebSocketServer({
    server: serveurHttp,
    maxPayload: 10 * 1024 * 1024
});

const cheminFichierServeur = fileURLToPath(import.meta.url);
const dossierProjet = path.dirname(cheminFichierServeur);
const port = process.env.PORT || 8000;

// Un tableau correspond a une salle contenant des formes et des utilisateurs.
const salles = new Map();

function copier(donnee) {
    return JSON.parse(JSON.stringify(donnee));
}

// Garder uniquement les compteurs valides d'une horloge recue
function normaliserHorloge(horloge) {
    let resultat = {};

    if (!horloge || typeof horloge !== "object") {
        return resultat;
    }

    for (const utilisateur in horloge) {
        let compteur = Number(horloge[utilisateur]);

        if (Number.isFinite(compteur) && compteur >= 0) {
            resultat[utilisateur] = Math.floor(compteur);
        }
    }

    return resultat;
}

// Garder le plus grand compteur connu pour chaque utilisateur
function fusionnerHorloges(horlogeDestination, horlogeRecue) {
    for (const utilisateur in horlogeRecue) {
        let compteurActuel = horlogeDestination[utilisateur] || 0;

        if (horlogeRecue[utilisateur] > compteurActuel) {
            horlogeDestination[utilisateur] = horlogeRecue[utilisateur];
        }
    }
}

// Retourner 1 si la premiere horloge est plus recente, -1 si elle est plus ancienne
// et 0 lorsque les deux modifications sont simultanees.
function comparerHorloges(premiereHorloge, deuxiemeHorloge) {
    let premiereAvance = false;
    let deuxiemeAvance = false;
    let utilisateurs = new Set([
        ...Object.keys(premiereHorloge),
        ...Object.keys(deuxiemeHorloge)
    ]);

    for (const utilisateur of utilisateurs) {
        let premierCompteur = premiereHorloge[utilisateur] || 0;
        let deuxiemeCompteur = deuxiemeHorloge[utilisateur] || 0;

        if (premierCompteur > deuxiemeCompteur) {
            premiereAvance = true;
        }

        if (deuxiemeCompteur > premierCompteur) {
            deuxiemeAvance = true;
        }
    }

    if (premiereAvance && !deuxiemeAvance) {
        return 1;
    }

    if (deuxiemeAvance && !premiereAvance) {
        return -1;
    }

    return 0;
}

function creerVersion(message) {
    return {
        horloge: normaliserHorloge(message.horloge),
        date: Number.isFinite(message.date) ? message.date : 0,
        operationId: String(message.operationId || "")
    };
}

// En cas de modifications simultanees, la date puis l'identifiant les departagent.
function comparerVersions(nouvelleVersion, ancienneVersion) {
    if (!ancienneVersion) {
        return 1;
    }

    if (
        nouvelleVersion.operationId
        && nouvelleVersion.operationId === ancienneVersion.operationId
    ) {
        return 0;
    }

    let comparaisonHorloges = comparerHorloges(
        nouvelleVersion.horloge,
        ancienneVersion.horloge
    );

    if (comparaisonHorloges !== 0) {
        return comparaisonHorloges;
    }

    if (nouvelleVersion.date !== ancienneVersion.date) {
        return nouvelleVersion.date > ancienneVersion.date ? 1 : -1;
    }

    if (nouvelleVersion.operationId === ancienneVersion.operationId) {
        return 0;
    }

    return nouvelleVersion.operationId > ancienneVersion.operationId ? 1 : -1;
}

function obtenirSalle(identifiantTableau) {
    if (!salles.has(identifiantTableau)) {
        salles.set(identifiantTableau, {
            formes: [],
            initialisee: false,
            utilisateurs: new Set(),
            horloge: {},
            versionsFormes: new Map(),
            initialisationEnCours: null,
            sauvegardeEnCours: Promise.resolve()
        });
    }

    return salles.get(identifiantTableau);
}

// Charger une salle une seule fois depuis PostgreSQL
async function initialiserSalle(salle, identifiantTableau) {
    if (salle.initialisee) {
        return;
    }

    if (!salle.initialisationEnCours) {
        salle.initialisationEnCours = (async function () {
            let tableau = await chargerTableau(identifiantTableau);

            if (!tableau) {
                throw new Error("Tableau introuvable dans PostgreSQL.");
            }

            salle.formes = Array.isArray(tableau.formes)
                ? copier(tableau.formes)
                : [];
            salle.versionsFormes.clear();

            for (const forme of salle.formes) {
                if (forme && typeof forme.id === "string") {
                    salle.versionsFormes.set(forme.id, {
                        horloge: {},
                        date: 0,
                        operationId: "etat-initial"
                    });
                }
            }

            salle.initialisee = true;
        })();
    }

    try {
        await salle.initialisationEnCours;
    }
    catch (erreur) {
        salle.initialisationEnCours = null;
        throw erreur;
    }
}

// Enregistrer les salles dans le meme ordre que leurs modifications
async function sauvegarderSalle(salle, identifiantTableau) {
    let copieFormes = copier(salle.formes);

    salle.sauvegardeEnCours = salle.sauvegardeEnCours
        .catch(function () {
            // Une nouvelle tentative reste possible apres une erreur precedente.
        })
        .then(async function () {
            let sauvegardeEffectuee = await sauvegarderFormesTableau(
                identifiantTableau,
                copieFormes
            );

            if (!sauvegardeEffectuee) {
                throw new Error("Le tableau n'existe plus dans PostgreSQL.");
            }
        });

    await salle.sauvegardeEnCours;
}

function appliquerOperations(salle, message) {
    let modifications = message.modifications;
    let suppressions = message.suppressions;

    if (!Array.isArray(modifications)) {
        modifications = [];
    }

    if (!Array.isArray(suppressions)) {
        suppressions = [];
    }

    let versionRecue = creerVersion(message);
    let modificationsAcceptees = [];
    let suppressionsAcceptees = [];
    let conflitTrouve = false;

    fusionnerHorloges(salle.horloge, versionRecue.horloge);

    // Supprimer les formes indiquees par leur identifiant.
    for (const identifiantForme of suppressions) {
        if (typeof identifiantForme !== "string") {
            continue;
        }

        let ancienneVersion = salle.versionsFormes.get(identifiantForme);
        let comparaison = comparerVersions(versionRecue, ancienneVersion);

        if (comparaison > 0) {
            salle.formes = salle.formes.filter(function (forme) {
                return forme.id !== identifiantForme;
            });
            salle.versionsFormes.set(identifiantForme, copier(versionRecue));
            suppressionsAcceptees.push(identifiantForme);
        }
        else if (comparaison < 0) {
            conflitTrouve = true;
        }
    }

    // Ajouter les nouvelles formes ou remplacer les formes modifiees.
    for (const formeRecue of modifications) {
        if (!formeRecue || typeof formeRecue.id !== "string") {
            continue;
        }

        let ancienneVersion = salle.versionsFormes.get(formeRecue.id);
        let comparaison = comparerVersions(versionRecue, ancienneVersion);

        if (comparaison < 0) {
            conflitTrouve = true;
            continue;
        }

        if (comparaison === 0) {
            continue;
        }

        let index = salle.formes.findIndex(function (forme) {
            return forme.id === formeRecue.id;
        });

        if (index === -1) {
            salle.formes.push(copier(formeRecue));
        }
        else {
            salle.formes[index] = copier(formeRecue);
        }

        salle.versionsFormes.set(formeRecue.id, copier(versionRecue));
        modificationsAcceptees.push(copier(formeRecue));
    }

    return {
        modifications: modificationsAcceptees,
        suppressions: suppressionsAcceptees,
        conflit: conflitTrouve,
        version: versionRecue
    };
}

function envoyer(socket, message) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}

function diffuser(salle, message, socketIgnore) {
    for (const utilisateur of salle.utilisateurs) {
        if (utilisateur !== socketIgnore) {
            envoyer(utilisateur, message);
        }
    }
}

function quitterSalle(socket) {
    if (!socket.identifiantTableau) {
        return;
    }

    let salle = salles.get(socket.identifiantTableau);

    if (salle) {
        diffuser(salle, {
            type: "apercu",
            utilisateur: socket.identifiantUtilisateur,
            forme: null
        }, socket);

        diffuser(salle, {
            type: "curseur",
            utilisateur: socket.identifiantUtilisateur,
            position: null
        }, socket);

        salle.utilisateurs.delete(socket);
    }

    socket.identifiantTableau = null;
    socket.permissionTableau = null;
    socket.jetonPartageHash = "";
}

serveurWebSocket.on("connection", function (socket, requete) {
    socket.identifiantTableau = null;
    socket.identifiantUtilisateur = null;
    socket.permissionTableau = null;
    socket.jetonPartageHash = "";
    socket.nomUtilisateur = "Utilisateur";
    socket.couleurUtilisateur = "#2d6cdf";
    socket.authentificationEnCours = obtenirUtilisateurDepuisRequete(requete);

    socket.on("message", async function (donneeBrute) {
        let message;
        let utilisateurConnecte;

        try {
            utilisateurConnecte = await socket.authentificationEnCours;
        }
        catch (erreur) {
            console.error("Authentification WebSocket impossible.", erreur);
            socket.close(1011, "Erreur d'authentification");
            return;
        }

        if (!utilisateurConnecte) {
            envoyer(socket, {
                type: "erreur",
                message: "Connexion requise."
            });
            socket.close(1008, "Connexion requise");
            return;
        }

        try {
            message = JSON.parse(donneeBrute.toString());
        }
        catch (erreur) {
            envoyer(socket, {
                type: "erreur",
                message: "Le message recu n'est pas un JSON valide."
            });
            return;
        }

        if (message.type === "rejoindre") {
            let identifiantTableau = String(message.tableau || "").trim();
            let jetonPartageHash = hacherJetonPartage(message.partage || "");

            if (!identifiantTableau) {
                return;
            }

            quitterSalle(socket);

            let acces = await chargerAccesTableau(
                identifiantTableau,
                utilisateurConnecte,
                jetonPartageHash
            );

            if (!acces) {
                envoyer(socket, {
                    type: "erreur",
                    message: "Acces au tableau refuse."
                });
                return;
            }

            let salle = obtenirSalle(identifiantTableau);

            try {
                await initialiserSalle(salle, identifiantTableau);
            }
            catch (erreur) {
                envoyer(socket, {
                    type: "erreur",
                    message: erreur.message
                });
                return;
            }

            socket.identifiantTableau = identifiantTableau;
            socket.identifiantUtilisateur = String(message.utilisateur || "");
            socket.permissionTableau = acces.permission;
            socket.jetonPartageHash = jetonPartageHash;
            socket.nomUtilisateur = nomDepuisEmail(utilisateurConnecte.email);

            if (/^#[0-9a-f]{6}$/i.test(message.couleur)) {
                socket.couleurUtilisateur = message.couleur;
            }

            salle.utilisateurs.add(socket);

            envoyer(socket, {
                type: "etatTableau",
                formes: salle.formes,
                horloge: salle.horloge
            });
            return;
        }

        if (message.type === "apercu") {
            let salle = salles.get(socket.identifiantTableau);

            if (
                !salle
                || !socket.identifiantUtilisateur
                || socket.permissionTableau !== "modification"
            ) {
                return;
            }

            let forme = null;

            if (message.forme && typeof message.forme === "object") {
                forme = copier(message.forme);
            }

            diffuser(salle, {
                type: "apercu",
                utilisateur: socket.identifiantUtilisateur,
                forme: forme
            }, socket);
            return;
        }

        if (message.type === "curseur") {
            let salle = salles.get(socket.identifiantTableau);
            let position = message.position;

            if (!salle || !socket.identifiantUtilisateur) {
                return;
            }

            if (
                position !== null
                && (
                    !position
                    || !Number.isFinite(position.x)
                    || !Number.isFinite(position.y)
                )
            ) {
                return;
            }

            diffuser(salle, {
                type: "curseur",
                utilisateur: socket.identifiantUtilisateur,
                nom: socket.nomUtilisateur,
                couleur: socket.couleurUtilisateur,
                position: position
            }, socket);
            return;
        }

        if (message.type === "modifier") {
            let salle = salles.get(socket.identifiantTableau);

            if (!salle) {
                return;
            }

            let accesActuel = await chargerAccesTableau(
                socket.identifiantTableau,
                utilisateurConnecte,
                socket.jetonPartageHash
            );

            if (!accesActuel || accesActuel.permission !== "modification") {
                socket.permissionTableau = accesActuel
                    ? accesActuel.permission
                    : null;
                envoyer(socket, {
                    type: "erreur",
                    message: "Permission de modification requise."
                });
                return;
            }

            let resultat = appliquerOperations(salle, message);

            try {
                await sauvegarderSalle(salle, socket.identifiantTableau);
            }
            catch (erreur) {
                console.error("Sauvegarde du dessin impossible.", erreur);
                envoyer(socket, {
                    type: "erreur",
                    message: "La modification n'a pas encore ete sauvegardee."
                });
                return;
            }

            envoyer(socket, {
                type: "confirmation",
                operationId: message.operationId,
                horloge: salle.horloge
            });

            if (resultat.conflit) {
                envoyer(socket, {
                    type: "correction",
                    formes: salle.formes,
                    horloge: salle.horloge
                });
            }

            if (
                resultat.modifications.length > 0
                || resultat.suppressions.length > 0
            ) {
                diffuser(salle, {
                    type: "operations",
                    operationId: resultat.version.operationId,
                    date: resultat.version.date,
                    horloge: resultat.version.horloge,
                    modifications: resultat.modifications,
                    suppressions: resultat.suppressions
                }, socket);
            }
        }
    });

    socket.on("close", function () {
        quitterSalle(socket);
    });
});

// Permet a l'hebergeur de verifier simplement que le serveur fonctionne.
application.get("/api/sante", function (requete, reponse) {
    reponse.json({ serveur: "actif" });
});

// Eviter qu'une meme adresse envoie trop de requetes a l'API.
const limiteurApi = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        erreur: "Trop de requetes. Reessaie dans quelques minutes."
    }
});

application.use("/api", limiteurApi);

// API de connexion puis API utilisee pour communiquer avec PostgreSQL
application.use("/api/auth", routesAuthentification);
application.use("/api/tableaux", routesTableaux);

// Ne pas rendre les fichiers du serveur accessibles dans le navigateur.
application.use(function (requete, reponse, suivant) {
    let chemin = requete.path.toLowerCase();

    if (
        chemin === "/serveur.js"
        || chemin === "/package.json"
        || chemin === "/package-lock.json"
        || chemin === "/.env"
        || chemin === "/.env.example"
        || chemin.startsWith("/serveur/")
        || chemin.startsWith("/tests/")
        || chemin.startsWith("/node_modules/")
    ) {
        reponse.sendStatus(404);
        return;
    }

    suivant();
});

// Accepter uniquement une page interne comme destination apres la connexion.
function obtenirDestinationApresConnexion(valeur) {
    if (typeof valeur !== "string" || valeur.length > 2000) {
        return "/tableaux.html";
    }

    try {
        let origineInterne = "http://application-interne";
        let destination = new URL(valeur, origineInterne);

        if (
            destination.origin !== origineInterne
            || destination.pathname === "/connexion.html"
        ) {
            return "/tableaux.html";
        }

        return destination.pathname + destination.search + destination.hash;
    }
    catch (erreur) {
        return "/tableaux.html";
    }
}

async function envoyerPageSelonConnexion(
    requete,
    reponse,
    nomFichier,
    connexionObligatoire
) {
    try {
        let utilisateur = await obtenirUtilisateurDepuisRequete(requete);

        if (connexionObligatoire && !utilisateur) {
            let retour = encodeURIComponent(requete.originalUrl);
            reponse.redirect("/connexion.html?retour=" + retour);
            return;
        }

        if (!connexionObligatoire && utilisateur) {
            reponse.redirect(
                obtenirDestinationApresConnexion(requete.query.retour)
            );
            return;
        }

        reponse.sendFile(path.join(dossierProjet, nomFichier));
    }
    catch (erreur) {
        console.error("Ouverture de la page impossible.", erreur);
        reponse.sendStatus(500);
    }
}

application.get("/", function (requete, reponse) {
    envoyerPageSelonConnexion(
        requete,
        reponse,
        "connexion.html",
        false
    );
});

application.get("/connexion.html", function (requete, reponse) {
    envoyerPageSelonConnexion(
        requete,
        reponse,
        "connexion.html",
        false
    );
});

application.get("/tableaux.html", function (requete, reponse) {
    envoyerPageSelonConnexion(
        requete,
        reponse,
        "tableaux.html",
        true
    );
});

application.get("/index.html", function (requete, reponse) {
    envoyerPageSelonConnexion(
        requete,
        reponse,
        "index.html",
        true
    );
});

application.use(express.static(dossierProjet));

try {
    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error("La variable GOOGLE_CLIENT_ID est absente.");
    }

    await verifierConnexionBaseDeDonnees();
    console.log("Connexion PostgreSQL reussie.");

    serveurHttp.listen(port, "0.0.0.0", function () {
        console.log("Serveur ouvert sur http://localhost:" + port);
    });
}
catch (erreur) {
    console.error("Impossible de se connecter a PostgreSQL.", erreur.message);
    process.exit(1);
}
