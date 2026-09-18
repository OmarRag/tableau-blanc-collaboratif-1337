// References du canvas et de son contexte de dessin
export const canvas = document.getElementById('tableau');
export const ctx = canvas.getContext('2d');
const barreOutils = document.getElementById('barre-outils');

// Adapter la taille du canvas a la fenetre
function ajusterCanvas() {
    canvas.width = window.innerWidth - barreOutils.offsetWidth;
    canvas.height = window.innerHeight;
}

ajusterCanvas();

// Recalculer la taille quand la fenetre change
window.addEventListener("resize", function () {
    ajusterCanvas();
    canvas.dispatchEvent(new Event("redessiner"));
});
