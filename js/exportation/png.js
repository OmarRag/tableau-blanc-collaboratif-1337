import { canvas } from "../canvas.js";

// Exporter la vue actuelle du canvas en image PNG
export function exporterPNG() {
    let canvasExport = document.createElement("canvas");
    canvasExport.width = canvas.width;
    canvasExport.height = canvas.height;

    let ctxExport = canvasExport.getContext("2d");
    let couleurFond = getComputedStyle(canvas).backgroundColor;

    ctxExport.fillStyle = couleurFond;
    ctxExport.fillRect(0, 0, canvasExport.width, canvasExport.height);
    ctxExport.drawImage(canvas, 0, 0);

    let imagePNG = canvasExport.toDataURL("image/png");
    let lien = document.createElement("a");
    lien.href = imagePNG;
    lien.download = "mon-dessin.png";

    document.body.appendChild(lien);
    lien.click();
    lien.remove();
}
