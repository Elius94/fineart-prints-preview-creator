const fs = require('fs');
const sharp = require('sharp');

const version = '1.0.0';
const verbose = process.argv.includes('--verbose');
const wallColor = process.argv.includes('--wall-color') ? process.argv[process.argv.indexOf('--wall-color') + 1] : '#ffffff';
const pattern = process.argv.includes('--pattern');
const patternFile = pattern ? process.argv[process.argv.indexOf('--pattern') + 1] : null;
const size = process.argv.includes('--size') ? process.argv[process.argv.indexOf('--size') + 1] : null;
const frameType = process.argv.includes('--frame-type') ? process.argv[process.argv.indexOf('--frame-type') + 1] : 'nice';
const paddings = process.argv.includes('--paddings') ? process.argv[process.argv.indexOf('--paddings') + 1] : null;
const thickness = process.argv.includes('--thickness') ? process.argv[process.argv.indexOf('--thickness') + 1] : null;
const color = process.argv.includes('--frame-color') ? process.argv[process.argv.indexOf('--frame-color') + 1] : null;
const paddingColor = process.argv.includes('--padding-color') ? process.argv[process.argv.indexOf('--padding-color') + 1] : null;
const creatorSignature = process.argv.includes('--creator-signature') ? process.argv[process.argv.indexOf('--creator-signature') + 1] : null;
const signatureSize = process.argv.includes('--signature-size') ? process.argv[process.argv.indexOf('--signature-size') + 1] : 30;
const signatureFont = process.argv.includes('--signature-font') ? process.argv[process.argv.indexOf('--signature-font') + 1] : 'Arial';
const signatureAlignment = process.argv.includes('--signature-align') ? process.argv[process.argv.indexOf('--signature-align') + 1] : 'right';
const outputSize = process.argv.includes('--output-size') ? process.argv[process.argv.indexOf('--output-size') + 1] : 3000;
const dir = process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : null;
const outputDir = dir ? dir + "/previews/" : process.cwd() + "/previews/";
const outputRatio = process.argv.includes('--output-ratio') ? process.argv[process.argv.indexOf('--output-ratio') + 1] : 1;
let ratio
switch (outputRatio) {
    case '1x1':
        ratio = 1;
        break;
    case '4x3':
        ratio = 4 / 3;
        break;
    case '4x5':
        ratio = 4 / 5;
        break;
    case '9x16':
        ratio = 9 / 16;
        break;
    case '3x4':
        ratio = 3 / 4;
        break;
    case '5x4':
        ratio = 5 / 4;
        break;
    case '16x9':
        ratio = 16 / 9;
        break;
    default:
        ratio = 1;
}

/**
 * @description 
 */
const createFineArtPreviews = async() => {
    if (process.argv.length > 2) {
        try {
            if (process.argv.includes('--help')) {
                console.log(printHelp());
                return;
            }
            if (process.argv.includes('--version')) {
                console.log(version);
                return;
            }

            // check if output directory exists and create it if not
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }

            // check if --dir is set and if the directory exists
            if (dir && fs.existsSync(dir)) {
                // iterate over all files in the directory and check if they are images
                const files = fs.readdirSync(dir);
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const path = dir + "/" + file
                        // check if the item is a directory and skip it
                    if (fs.lstatSync(path).isDirectory()) {
                        continue;
                    }
                    log(`Processing file ${path}`);
                    await createImagePreview(path, outputDir);
                }
            } else {
                // check if the file exists
                const file = process.argv[process.argv.length - 1];
                if (!fs.existsSync(file)) {
                    console.log(`File ${file} does not exist.`);
                    return;
                }
                log(`Processing file ${file}`);
                await createImagePreview(file, outputDir);
            }
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    } else {
        console.error('Wrong image path');
        process.exit(1);
    }
}

const createImagePreview = async(path, output) => {
    const image = await sharp(path);
    const metadata = await image.metadata();
    if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
        console.log(`File ${dir}/${file} is not a PNG or JPEG image.`);
        return;
    }
    // check if the image is large enough
    if (metadata.width < 1000 || metadata.height < 1000) {
        console.log(`File ${file} is too small.`);
        return;
    }

    // check if image is vertical or horizontal
    const orientation = metadata.width > metadata.height ? 'horizontal' : 'vertical';

    // Create Canvas to validate image
    const { createCanvas, loadImage } = require('canvas')
    const resultWidth = outputSize * ratio;
    const resultHeight = outputSize;
    const backgroundColor = wallColor;
    const canvas = createCanvas(resultWidth, resultHeight);
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, resultWidth, resultHeight);

    // Add the signature if set
    if (creatorSignature) {
        // draw the signature text on the bottom right corner of the canvas
        ctx.font = `bold ${signatureSize}px ${signatureFont}`;
        ctx.fillStyle = '#222';
        ctx.textAlign = signatureAlignment;
        ctx.textBaseline = 'bottom';
        ctx.fillText(creatorSignature, resultWidth - 10, resultHeight - 10);
    }

    // Load Image
    const img = await loadImage(path);

    // Draw the image on the center of the canvas keeping the aspect ratio of the image
    const _size = size > 0 && size <= 1 ? size : 0.75;
    /*const imgWidth = Math.round(resultWidth * _size);
    const imgHeight = Math.round((imgWidth * img.height) / img.width);*/
    let imgWidth = 0;
    let imgHeight = 0;
    if (orientation === 'horizontal') {
        imgWidth = Math.round(resultWidth * _size);
        imgHeight = Math.round((imgWidth * img.height) / img.width);
    } else {
        imgHeight = Math.round(resultHeight * _size);
        imgWidth = Math.round((imgHeight * img.width) / img.height);
    }
    const imgX = Math.round((resultWidth - imgWidth) / 2);
    const imgY = Math.round((resultHeight - imgHeight) / 2);

    // Add a black frame around the image to make it look like a print on a wall mounted canvas
    const frame = { thickness: 10, paddings: { x: 0, y: 0 }, color: '#000000', paddingColor: '#ffffff' };
    frame.color = color ? color : frame.color;
    frame.thickness = Math.round(imgWidth * (thickness && thickness >= 0 && thickness <= 1 ? thickness : 0.02)); // 2% of the image width
    if (frame.thickness > 0) {
        frame.paddings.x = imgWidth * (paddings && paddings > 0 && paddings <= 1 ? paddings : 0.05); // 5% of the image width
        frame.paddings.y = imgWidth * (paddings && paddings > 0 && paddings <= 1 ? paddings : 0.05); // 5% of the image height
    } else {
        frame.paddings.x = 0;
        frame.paddings.y = 0;
    }
    frame.paddingColor = paddingColor ? paddingColor : frame.paddingColor;
    ctx.fillStyle = frame.color;
    ctx.shadowColor = "#212121"
    ctx.shadowBlur = frame.thickness;
    ctx.shadowOffsetX = frame.thickness * 0.5;
    ctx.shadowOffsetY = frame.thickness * 0.5;

    switch (frameType) {
        case 'solid':
            {
                // Draw an outer white rectangle before the image
                ctx.fillStyle = frame.paddingColor;
                ctx.fillRect(imgX - frame.paddings.x - frame.thickness, imgY - frame.paddings.y - frame.thickness, imgWidth + frame.paddings.x * 2 + frame.thickness * 2, imgHeight + frame.paddings.y * 2 + frame.thickness * 2);

                ctx.fillStyle = frame.color;

                if (pattern) {
                    // Load pattern image
                    const patternImg = await loadImage(patternFile);
                    ctx.strokeStyle = ctx.createPattern(patternImg, "repeat");
                }

                ctx.shadowBlur = frame.thickness;
                ctx.shadowOffsetX = frame.thickness * 0.3;
                ctx.shadowOffsetY = frame.thickness * 0.3;

                ctx.lineWidth = frame.thickness;
                // Draw the whole frame as single piece of solid
                ctx.beginPath()
                ctx.rect(imgX - frame.paddings.x - frame.thickness, imgY - frame.paddings.y - frame.thickness, imgWidth + frame.paddings.x * 2 + frame.thickness * 2, imgHeight + frame.paddings.y * 2 + frame.thickness * 2);
                ctx.stroke()

                // Change the shadow for the image
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                // Draw the image
                ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 2;
                ctx.strokeRect(imgX, imgY, imgWidth, imgHeight);

            }
            break;
        case 'nice':
            {
                // Draw an outer white rectangle before the image
                ctx.fillStyle = frame.paddingColor;
                ctx.fillRect(imgX - frame.paddings.x - frame.thickness, imgY - frame.paddings.y - frame.thickness, imgWidth + frame.paddings.x * 2 + frame.thickness * 2, imgHeight + frame.paddings.y * 2 + frame.thickness * 2);

                ctx.fillStyle = frame.color;

                if (pattern) {
                    // Load pattern image
                    const patternImg = await loadImage(patternFile);
                    ctx.fillStyle = ctx.createPattern(patternImg, "repeat");
                }

                ctx.shadowBlur = frame.thickness;
                ctx.shadowOffsetX = frame.thickness * 0.3;
                ctx.shadowOffsetY = frame.thickness * 0.3;

                ctx.lineWidth = 1;
                ctx.strokeStyle = '#555';

                // Draw the single trapezoid frames woods lists
                // Top wooden part
                ctx.beginPath()
                ctx.moveTo(imgX - frame.paddings.x - frame.thickness, imgY - frame.paddings.y - frame.thickness);
                ctx.lineTo(imgX + imgWidth + frame.paddings.x + frame.thickness, imgY - frame.paddings.y - frame.thickness);
                ctx.lineTo(imgX + imgWidth + frame.paddings.x, imgY - frame.paddings.y);
                ctx.lineTo(imgX - frame.paddings.x, imgY - frame.paddings.y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Bottom wooden part
                ctx.beginPath()
                ctx.lineTo(imgX - frame.paddings.x, imgY + imgHeight + frame.paddings.y);
                ctx.lineTo(imgX + imgWidth + frame.paddings.x, imgY + imgHeight + frame.paddings.y);
                ctx.lineTo(imgX + imgWidth + frame.paddings.x + frame.thickness, imgY + imgHeight + frame.paddings.y + frame.thickness);
                ctx.lineTo(imgX - frame.paddings.x - frame.thickness, imgY + imgHeight + frame.paddings.y + frame.thickness);
                ctx.closePath()
                ctx.fill()
                ctx.stroke();
                // Left wooden part
                ctx.beginPath()
                ctx.lineTo(imgX - frame.paddings.x - frame.thickness, imgY - frame.paddings.y - frame.thickness);
                ctx.lineTo(imgX - frame.paddings.x - frame.thickness, imgY + imgHeight + frame.paddings.y + frame.thickness);
                ctx.lineTo(imgX - frame.paddings.x, imgY + imgHeight + frame.paddings.y);
                ctx.lineTo(imgX - frame.paddings.x, imgY - frame.paddings.y);
                ctx.closePath()
                ctx.fill()
                ctx.stroke();
                // Right wooden part
                ctx.beginPath()
                ctx.lineTo(imgX + imgWidth + frame.paddings.x, imgY - frame.paddings.y);
                ctx.lineTo(imgX + imgWidth + frame.paddings.x, imgY + imgHeight + frame.paddings.y);
                ctx.lineTo(imgX + imgWidth + frame.paddings.x + frame.thickness, imgY + imgHeight + frame.paddings.y + frame.thickness);
                ctx.lineTo(imgX + imgWidth + frame.paddings.x + frame.thickness, imgY - frame.paddings.y - frame.thickness);
                ctx.closePath()
                ctx.fill()
                ctx.stroke();

                // Change the shadow for the image
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                // Draw the image
                ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 2;
                ctx.strokeRect(imgX, imgY, imgWidth, imgHeight);
            }
            break;
        case 'no_frame':
        case 'panel':
        case 'canvas':
            {
                // Draw the image
                ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
            }
            break;
        default:
            {
                console.log(`Unknown frame type ${frameType}`);
                process.exit(1);
            }
    }

    // Save the canvas as a JPEG file naming it '{file_without_extension}.preview.jpg'
    // take the file name without extension and path and add the preview extension
    const fileName = path.includes('/') ? path.split('/').pop().split('.')[0] : path.split('\\').pop().split('.')[0];
    const previewFile = fileName.replace(/\.[^/.]+$/, "") + '.preview.jpg';
    const buf = canvas.toBuffer('image/jpeg', { quality: 1 })
    fs.writeFileSync(output + previewFile, buf);
    log(`Preview saved to ${previewFile}`);
}

/**
 * 
 * @param {*} message - The message to log to the console
 * @description Logs a message to the console if verbose mode is enabled
 */
function log(message) {
    if (verbose) {
        console.log(message);
    }
}

/**
 * 
 * @returns {string} - The help text for the program in the console
 */
function printHelp() {
    return `\n\nCreate Fine Art Preview - v${version}\n\n` +
        `A simple program to create a nice wall art preview of a given image. It returns a picture containing your input print on a wall mounted canvas.\n` +
        `Usage: wallpreview [options] <image>\n\n` +
        `Options:\n` +
        `  --help                               Print this help message\n` +
        `  --version                            Print the version of this tool\n` +
        `  --verbose                            Print verbose output\n` +
        `  --size <size>                        The size of the image to be printed on the canvas. The size is a percentage (0-1) of the image size.\n` +
        `  --paddings <paddings>                The paddings of the frame. The paddings are a percentage (0-1) of the image size.\n` +
        `  --padding-color <color>              The color of the padding around the image. The color is a hexadecimal value.\n` +
        `  --frame-color <color>                The color of the frame. The color can be a hexadecimal value or a color name.\n` +
        `  --frame-type <frame-type>            The type of frame to be used. The frame type can be one of the following:\n` +
        `                                       'no_frame', 'panel', 'canvas', 'solid' and 'nice'.\n` +
        `  --pattern <pattern>                  The pattern to be used to fill the frame. The pattern is a path to an image file.\n` +
        `  --thickness <thickness>              The thickness of the frame. The thickness is a percentage (0-1) of the image size.\n` +
        `  --creator-signature <signature>      The signature to be used to fill the frame. The signature is for example the name of the photographer.\n` +
        `  --signature-size <size>              The size of the signature. The size is a number. [default: 30] \n` +
        `  --signature-font <font>              The font of the signature. The font is the installed font name. [default: Arial]\n` +
        `  --signature-align <align>            The alignment of the signature. The alignment is one of the following:\n` +
        `                                       'left', 'center' and 'right'. [default: right]\n` +
        `  --dir <dir>                          The directory where the output files will be saved.\n` +
        `  --output-size <size>                 The size of the output image. The returned image is a square.\n` +
        `  --output-ratio <ratio>               The ratio of the output image. The ratio is a number. [default: 1x1] and can be one of the following:\n` +
        `                                       '1x1', '4x3', '3x4', '16x9', '9x16', '5x4', '4x5'.\n` +

        `\n\n` +
        `Examples:\n` +
        `  wallpreview --verbose image.png\n` +
        `  wallpreview path/to/image.png\n` +
        `  wallpreview --pattern "./test/darkwood.jfif" --frame-type "nice" --dir "C:\\Users\\Mario\\Downloads\\test" --creator-signature "John Lord" --verbose --signature-size 50\n` +
        `\n\n`;
}


(async() => {
    await createFineArtPreviews();
    process.exit(0);
})()