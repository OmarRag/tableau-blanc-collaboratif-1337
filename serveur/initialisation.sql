-- Comptes verifies par Google
CREATE TABLE IF NOT EXISTS utilisateurs (
    id BIGSERIAL PRIMARY KEY,
    google_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions ouvertes apres une connexion Google reussie
CREATE TABLE IF NOT EXISTS sessions (
    jeton_hash TEXT PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    expire_le TIMESTAMPTZ NOT NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table contenant les informations et le dessin de chaque tableau
CREATE TABLE IF NOT EXISTS tableaux (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    formes JSONB NOT NULL DEFAULT '[]'::jsonb,
    proprietaire_id BIGINT REFERENCES utilisateurs(id) ON DELETE CASCADE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT formes_est_un_tableau CHECK (jsonb_typeof(formes) = 'array')
);

-- Ajouter le proprietaire aux bases creees avant l'authentification.
ALTER TABLE tableaux
ADD COLUMN IF NOT EXISTS proprietaire_id BIGINT
REFERENCES utilisateurs(id) ON DELETE CASCADE;

-- Supprimer l'ancien systeme public/prive et les invitations par e-mail.
-- Le partage utilise maintenant un seul lien : lecture ou modification.
DROP TABLE IF EXISTS partages_email;

ALTER TABLE tableaux
DROP COLUMN IF EXISTS visibilite;

-- Liens secrets pouvant accorder la lecture ou la modification
CREATE TABLE IF NOT EXISTS liens_partage (
    id BIGSERIAL PRIMARY KEY,
    tableau_id TEXT NOT NULL REFERENCES tableaux(id) ON DELETE CASCADE,
    jeton_hash TEXT NOT NULL UNIQUE,
    permission TEXT NOT NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT permission_lien_valide
        CHECK (permission IN ('lecture', 'modification'))
);

CREATE INDEX IF NOT EXISTS index_sessions_expiration
ON sessions (expire_le);

CREATE INDEX IF NOT EXISTS index_tableaux_proprietaire
ON tableaux (proprietaire_id);

CREATE INDEX IF NOT EXISTS index_liens_partage_tableau
ON liens_partage (tableau_id);
