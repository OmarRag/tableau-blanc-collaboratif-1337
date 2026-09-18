// Forme speciale qui conserve une zone remplie par les pixels
export function dessinerRemplissagePixels(ctx, forme) {
    if (!forme.pixels || !forme.largeurPixels || !forme.hauteurPixels) {
        return;
    }

    let canvasZone = document.createElement("canvas");
    canvasZone.width = forme.largeurPixels;
    canvasZone.height = forme.hauteurPixels;

    let ctxZone = canvasZone.getContext("2d");
    let imageZone = ctxZone.createImageData(forme.largeurPixels, forme.hauteurPixels);
    imageZone.data.set(new Uint8ClampedArray(forme.pixels));
    ctxZone.putImageData(imageZone, 0, 0);

    ctx.drawImage(
        canvasZone,
        forme.x,
        forme.y,
        forme.largeur,
        forme.hauteur
    );
}
