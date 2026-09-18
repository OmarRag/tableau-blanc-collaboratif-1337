// Communication entre le serveur Node.js et PostgreSQL
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ quiet: true });

const Pool = pg.Pool;
const adresseBaseDeDonnees = process.env.DATABASE_URL;

if (!adresseBaseDeDonnees) {
    throw new Error("La variable DATABASE_URL est absente.");
}

const connexions = new Pool({
    connectionString: adresseBaseDeDonnees
});

export async function verifierConnexionBaseDeDonnees() {
    await connexions.query("SELECT 1");
}

// Creer ou retrouver un utilisateur deja verifie par Google
export async function enregistrerUtilisateurGoogle(compteGoogle) {
    let resultat = await connexions.query(
        `INSERT INTO utilisateurs (google_id, email)
         VALUES ($1, $2)
         ON CONFLICT (google_id)
         DO UPDATE SET email = EXCLUDED.email
         RETURNING id, email, cree_le`,
        [compteGoogle.googleId, compteGoogle.email]
    );

    return resultat.rows[0];
}

// Donner les anciens tableaux locaux au premier compte cree
export async function attribuerAnciensTableaux(utilisateurId) {
    await connexions.query(
        `UPDATE tableaux
         SET proprietaire_id = $1
         WHERE proprietaire_id IS NULL
           AND (SELECT COUNT(*) FROM utilisateurs) = 1`,
        [utilisateurId]
    );
}

export async function creerSession(jetonHash, utilisateurId, dateExpiration) {
    await connexions.query(
        `INSERT INTO sessions (jeton_hash, utilisateur_id, expire_le)
         VALUES ($1, $2, $3)`,
        [jetonHash, utilisateurId, dateExpiration]
    );
}

export async function chargerUtilisateurParSession(jetonHash) {
    let resultat = await connexions.query(
        `SELECT utilisateurs.id, utilisateurs.email
         FROM sessions
         JOIN utilisateurs
           ON utilisateurs.id = sessions.utilisateur_id
         WHERE sessions.jeton_hash = $1
           AND sessions.expire_le > NOW()`,
        [jetonHash]
    );

    return resultat.rows[0] || null;
}

export async function supprimerSession(jetonHash) {
    await connexions.query(
        "DELETE FROM sessions WHERE jeton_hash = $1",
        [jetonHash]
    );
}

export async function supprimerSessionsExpirees() {
    await connexions.query("DELETE FROM sessions WHERE expire_le <= NOW()");
}

export async function creerTableau(tableau, proprietaireId) {
    let resultat = await connexions.query(
        `INSERT INTO tableaux (id, nom, formes, proprietaire_id)
         VALUES ($1, $2, $3::jsonb, $4)
         RETURNING id, nom, formes, cree_le, modifie_le`,
        [
            tableau.id,
            tableau.nom,
            JSON.stringify(tableau.formes),
            proprietaireId
        ]
    );

    return resultat.rows[0];
}

// Verifier qu'un proprietaire ne possede pas deja un tableau du meme nom.
export async function nomTableauExiste(
    nom,
    proprietaireId,
    identifiantIgnore = null
) {
    let resultat = await connexions.query(
        `SELECT EXISTS (
             SELECT 1
             FROM tableaux
             WHERE proprietaire_id = $1
               AND LOWER(BTRIM(nom)) = LOWER(BTRIM($2))
               AND ($3::text IS NULL OR id <> $3)
         ) AS existe`,
        [proprietaireId, nom, identifiantIgnore]
    );

    return resultat.rows[0].existe;
}

export async function listerTableaux(utilisateur) {
    let resultat = await connexions.query(
        `SELECT tableaux.id,
                tableaux.nom,
                tableaux.cree_le,
                tableaux.modifie_le,
                lien_actif.permission AS permission_partage
         FROM tableaux
         LEFT JOIN LATERAL (
             SELECT permission
             FROM liens_partage
             WHERE liens_partage.tableau_id = tableaux.id
             ORDER BY cree_le DESC
             LIMIT 1
         ) AS lien_actif ON TRUE
         WHERE tableaux.proprietaire_id = $1
         ORDER BY tableaux.cree_le ASC, tableaux.id ASC`,
        [utilisateur.id]
    );

    return resultat.rows;
}

export async function chargerTableau(identifiantTableau) {
    let resultat = await connexions.query(
        `SELECT id, nom, formes, proprietaire_id, cree_le, modifie_le
         FROM tableaux
         WHERE id = $1`,
        [identifiantTableau]
    );

    return resultat.rows[0] || null;
}

export async function modifierTableau(
    identifiantTableau,
    tableau,
    proprietaireId
) {
    let resultat = await connexions.query(
        `UPDATE tableaux
         SET nom = $2,
             formes = $3::jsonb,
             modifie_le = NOW()
         WHERE id = $1
           AND proprietaire_id = $4
         RETURNING id, nom, formes, cree_le, modifie_le`,
        [
            identifiantTableau,
            tableau.nom,
            JSON.stringify(tableau.formes),
            proprietaireId
        ]
    );

    return resultat.rows[0] || null;
}

export async function sauvegarderFormesTableau(identifiantTableau, formes) {
    let resultat = await connexions.query(
        `UPDATE tableaux
         SET formes = $2::jsonb,
             modifie_le = NOW()
         WHERE id = $1`,
        [identifiantTableau, JSON.stringify(formes)]
    );

    return resultat.rowCount > 0;
}

export async function supprimerTableau(identifiantTableau, proprietaireId) {
    let resultat = await connexions.query(
        `DELETE FROM tableaux
         WHERE id = $1
           AND proprietaire_id = $2`,
        [identifiantTableau, proprietaireId]
    );

    return resultat.rowCount > 0;
}

// Determiner ce qu'un utilisateur peut faire sur un tableau
export async function chargerAccesTableau(
    identifiantTableau,
    utilisateur,
    jetonPartageHash
) {
    let tableau = await chargerTableau(identifiantTableau);

    if (!tableau) {
        return null;
    }

    let estProprietaire = String(tableau.proprietaire_id)
        === String(utilisateur.id);

    if (estProprietaire) {
        return {
            tableau: tableau,
            permission: "modification",
            estProprietaire: true
        };
    }

    let permissionLien = null;

    if (jetonPartageHash) {
        let resultat = await connexions.query(
            `SELECT permission
             FROM liens_partage
             WHERE tableau_id = $1
               AND jeton_hash = $2`,
            [identifiantTableau, jetonPartageHash]
        );

        permissionLien = resultat.rows[0]
            ? resultat.rows[0].permission
            : null;
    }

    if (permissionLien === "modification") {
        return {
            tableau: tableau,
            permission: "modification",
            estProprietaire: false
        };
    }

    if (permissionLien === "lecture") {
        return {
            tableau: tableau,
            permission: "lecture",
            estProprietaire: false
        };
    }

    return null;
}

export async function listerPartagesTableau(
    identifiantTableau,
    proprietaireId
) {
    let proprietaire = await connexions.query(
        `SELECT id
         FROM tableaux
         WHERE id = $1
           AND proprietaire_id = $2`,
        [identifiantTableau, proprietaireId]
    );

    if (!proprietaire.rows[0]) {
        return null;
    }

    let liens = await connexions.query(
        `SELECT id, permission, cree_le
         FROM liens_partage
         WHERE tableau_id = $1
         ORDER BY cree_le DESC`,
        [identifiantTableau]
    );

    return {
        liens: liens.rows
    };
}

export async function enregistrerLienPartage(
    identifiantTableau,
    jetonHash,
    permission,
    proprietaireId
) {
    let resultat = await connexions.query(
        `WITH tableau_proprietaire AS (
             SELECT 1
             FROM tableaux
             WHERE id = $1
               AND proprietaire_id = $4
         ), anciens_liens AS (
             DELETE FROM liens_partage
             WHERE tableau_id = $1
               AND EXISTS (SELECT 1 FROM tableau_proprietaire)
         )
         INSERT INTO liens_partage (tableau_id, jeton_hash, permission)
         SELECT $1, $2, $3
         WHERE EXISTS (SELECT 1 FROM tableau_proprietaire)
         RETURNING id, permission, cree_le`,
        [identifiantTableau, jetonHash, permission, proprietaireId]
    );

    return resultat.rows[0] || null;
}

export async function supprimerLienPartage(
    identifiantTableau,
    lienId,
    proprietaireId
) {
    let resultat = await connexions.query(
        `DELETE FROM liens_partage
         WHERE id = $1
           AND tableau_id = $2
           AND EXISTS (
               SELECT 1
               FROM tableaux
               WHERE id = $2
                 AND proprietaire_id = $3
           )`,
        [lienId, identifiantTableau, proprietaireId]
    );

    return resultat.rowCount > 0;
}

// Utilise uniquement pour nettoyer les comptes crees par les tests
export async function supprimerUtilisateur(utilisateurId) {
    await connexions.query(
        "DELETE FROM utilisateurs WHERE id = $1",
        [utilisateurId]
    );
}

export async function fermerConnexionBaseDeDonnees() {
    await connexions.end();
}
