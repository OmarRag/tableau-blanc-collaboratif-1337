// Relier les evenements de la souris aux fonctions du canvas
export function installerEvenementsCanvas(canvas, gestionnaires) {
    canvas.addEventListener("mousedown", gestionnaires.sourisEnfoncee);
    canvas.addEventListener("mousemove", gestionnaires.sourisDeplacee);
    canvas.addEventListener("mouseup", gestionnaires.sourisRelachee);
    canvas.addEventListener("mouseleave", gestionnaires.sourisSortie);

    if (gestionnaires.molette) {
        canvas.addEventListener(
            "wheel",
            gestionnaires.molette,
            {
                passive: false
            }
        );
    }
}
