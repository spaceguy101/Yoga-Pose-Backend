const tf = require('@tensorflow/tfjs-node');
const posenet = require('@tensorflow-models/posenet');
const path = require('path');

const {
    createCanvas, Image, loadImage
} = require('canvas')

var net;

const getPoseResult = async (imgSrc, width, height) => {

    var image = await loadImage(imgSrc)
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const input = tf.browser.fromPixels(canvas);
    const pose = await net.estimateMultiplePoses(input, {
        flipHorizontal: false,
        maxDetections: 1,
        scoreThreshold: 0.6,
        nmsRadius: 10
    });
    return pose[0]
}

async function initPosenet(width, height) {
    net = await posenet.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        inputResolution: { width: width, height: height },

    });
}
{

}
async function main() {
    var imageJson = require('./outputImages/images.json')
    for (key in imageJson.images) {
        var imgObj = imageJson.images[key]
        var pose = await getPoseResult(path.join('./outputImages', imgObj.file), 640, 480);
        console.log(pose)
    }

}


exports.initPosenet = initPosenet;
exports.getPoseResult = getPoseResult