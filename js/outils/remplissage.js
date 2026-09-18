// Remplir la zone visible autour du clic

// Comparer deux couleurs avec une petite marge pour les contours lisses
function couleursSemblables(donnees, indice, couleur) {
    let marge = 10;
    let alphaDuPixel = donnees[indice + 3];

    // Le fond du canvas est transparent dans les pixels.
    // Un contour presque transparent doit quand meme rester un contour.
    if (couleur[3] === 0) {
        return alphaDuPixel === 0;
    }

    let differenceRouge = Math.abs(donnees[indice] - couleur[0]);
    let differenceVerte = Math.abs(donnees[indice + 1] - couleur[1]);
    let differenceBleue = Math.abs(donnees[indice + 2] - couleur[2]);
    let differenceAlpha = Math.abs(alphaDuPixel - couleur[3]);

    return differenceRouge <= marge
        && differenceVerte <= marge
        && differenceBleue <= marge
        && differenceAlpha <= marge;
}

// Transformer une couleur comme #ff0000 en valeurs RGBA
function convertirCouleur(couleur) {
    let codeCouleur = couleur.replace("#", "");

    if (codeCouleur.length === 3) {
        codeCouleur = codeCouleur[0] + codeCouleur[0]
            + codeCouleur[1] + codeCouleur[1]
            + codeCouleur[2] + codeCouleur[2];
    }

    if (codeCouleur.length !== 6) {
        return [0, 0, 0, 255];
    }

    let rouge = parseInt(codeCouleur.substring(0, 2), 16);
    let vert = parseInt(codeCouleur.substring(2, 4), 16);
    let bleu = parseInt(codeCouleur.substring(4, 6), 16);

    return [rouge, vert, bleu, 255];
}

// Ajouter les pixels presque transparents juste a l'interieur du contour.
// Ils correspondent au lissage du trait et sont souvent la cause des petits espaces.
function ajouterBordInterieur(donnees, largeurCanvas, hauteurCanvas, pixelsDeLaZone) {
    let seuilTransparence = 80;
    let nombrePixelsInterieur = pixelsDeLaZone.length;
    let pixelsAjoutes = new Uint8Array(largeurCanvas * hauteurCanvas);
    let directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
    ];

    for (let i = 0; i < nombrePixelsInterieur; i++) {
        let pixel = pixelsDeLaZone[i];

        for (let j = 0; j < directions.length; j++) {
            let voisinX = pixel.x + directions[j].x;
            let voisinY = pixel.y + directions[j].y;

            if (voisinX < 0 || voisinX >= largeurCanvas
                || voisinY < 0 || voisinY >= hauteurCanvas) {
                continue;
            }

            let indiceVoisin = voisinY * largeurCanvas + voisinX;

            if (pixelsAjoutes[indiceVoisin] === 1) {
                continue;
            }

            let indiceCouleur = indiceVoisin * 4;
            let alpha = donnees[indiceCouleur + 3];

            if (alpha > 0 && alpha <= seuilTransparence) {
                pixelsAjoutes[indiceVoisin] = 1;
                pixelsDeLaZone.push({
                    x: voisinX,
                    y: voisinY
                });
            }
        }
    }
}

// Remplir une region de pixels visible sur le canvas
export function remplirZoneVisible(canvas, ctx, x, y, couleur, decalageVue) {
    let largeurCanvas = canvas.width;
    let hauteurCanvas = canvas.height;
    let pixelX = Math.floor(x);
    let pixelY = Math.floor(y);

    if (pixelX < 0 || pixelX >= largeurCanvas || pixelY < 0 || pixelY >= hauteurCanvas) {
        return null;
    }

    let imageActuelle = ctx.getImageData(0, 0, largeurCanvas, hauteurCanvas);
    let donnees = imageActuelle.data;
    let indiceDepart = (pixelY * largeurCanvas + pixelX) * 4;
    let couleurDepart = [
        donnees[indiceDepart],
        donnees[indiceDepart + 1],
        donnees[indiceDepart + 2],
        donnees[indiceDepart + 3]
    ];
    let couleurRemplissage = convertirCouleur(couleur);

    if (couleursSemblables(donnees, indiceDepart, couleurRemplissage)) {
        return null;
    }

    let pixelsVisites = new Uint8Array(largeurCanvas * hauteurCanvas);
    let pixelsAVisiter = [{
        x: pixelX,
        y: pixelY
    }];
    let pixelsDeLaZone = [];
    let zoneToucheLeBord = false;

    while (pixelsAVisiter.length > 0) {
        let pixel = pixelsAVisiter.pop();

        if (pixel.x < 0 || pixel.x >= largeurCanvas
            || pixel.y < 0 || pixel.y >= hauteurCanvas) {
            continue;
        }

        let indiceVisite = pixel.y * largeurCanvas + pixel.x;

        if (pixelsVisites[indiceVisite] === 1) {
            continue;
        }

        let indicePixel = indiceVisite * 4;

        if (!couleursSemblables(donnees, indicePixel, couleurDepart)) {
            continue;
        }

        pixelsVisites[indiceVisite] = 1;
        pixelsDeLaZone.push(pixel);

        if (pixel.x === 0 || pixel.x === largeurCanvas - 1
            || pixel.y === 0 || pixel.y === hauteurCanvas - 1) {
            zoneToucheLeBord = true;
        }

        pixelsAVisiter.push({ x: pixel.x + 1, y: pixel.y });
        pixelsAVisiter.push({ x: pixel.x - 1, y: pixel.y });
        pixelsAVisiter.push({ x: pixel.x, y: pixel.y + 1 });
        pixelsAVisiter.push({ x: pixel.x, y: pixel.y - 1 });
    }

    // Ne pas remplir tout le fond du canvas quand le clic est a l'exterieur
    if (pixelsDeLaZone.length === 0 || zoneToucheLeBord) {
        return null;
    }

    // Colorer aussi le bord intérieur lissé pour éviter les petits espaces blancs.
    ajouterBordInterieur(donnees, largeurCanvas, hauteurCanvas, pixelsDeLaZone);

    let minimumX = largeurCanvas;
    let minimumY = hauteurCanvas;
    let maximumX = 0;
    let maximumY = 0;

    for (let i = 0; i < pixelsDeLaZone.length; i++) {
        let pixel = pixelsDeLaZone[i];
        minimumX = Math.min(minimumX, pixel.x);
        minimumY = Math.min(minimumY, pixel.y);
        maximumX = Math.max(maximumX, pixel.x);
        maximumY = Math.max(maximumY, pixel.y);
    }

    let largeurZone = maximumX - minimumX + 1;
    let hauteurZone = maximumY - minimumY + 1;
    let pixelsRemplis = new Uint8ClampedArray(largeurZone * hauteurZone * 4);

    for (let i = 0; i < pixelsDeLaZone.length; i++) {
        let pixel = pixelsDeLaZone[i];
        let positionX = pixel.x - minimumX;
        let positionY = pixel.y - minimumY;
        let indiceRemplissage = (positionY * largeurZone + positionX) * 4;

        pixelsRemplis[indiceRemplissage] = couleurRemplissage[0];
        pixelsRemplis[indiceRemplissage + 1] = couleurRemplissage[1];
        pixelsRemplis[indiceRemplissage + 2] = couleurRemplissage[2];
        pixelsRemplis[indiceRemplissage + 3] = couleurRemplissage[3];
    }

    let zoom = decalageVue.zoom;

    return {
        type: "remplissagePixels",
        x: (minimumX - decalageVue.x) / zoom,
        y: (minimumY - decalageVue.y) / zoom,
        largeur: largeurZone / zoom,
        hauteur: hauteurZone / zoom,
        largeurPixels: largeurZone,
        hauteurPixels: hauteurZone,
        pixels: Array.from(pixelsRemplis)
    };
}
