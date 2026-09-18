// Outils communs aux liens et permissions des tableaux
import crypto from "crypto";

export function creerJetonPartage() {
    return crypto.randomBytes(24).toString("hex");
}

export function hacherJetonPartage(jeton) {
    if (typeof jeton !== "string" || jeton.length > 200) {
        return "";
    }

    return crypto.createHash("sha256").update(jeton).digest("hex");
}

export function permissionValide(permission) {
    return permission === "lecture" || permission === "modification";
}
