var ffmpeg = require('fluent-ffmpeg')
const probe = require('ffmpeg-probe')
const extractFrames = require('ffmpeg-extract-frames')
const fs = require('fs-extra')
const path = require('path')
const jsonfile = require('jsonfile')
const posenet = require('./posenet-node')
var timetamps = []
var outputImagesFolder = './output'
var inputVideo = './input.mp4';
const walkSync = require('walk-sync');
var videoFPS = 25
var targetFPS = 2
var WIDTH = 1280;
var HEIGHT = 720;
var jsonFilePath = path.join(outputImagesFolder, 'images.json')

async function main() {
    var metadata = await probe(inputVideo);

    await fs.ensureDir(outputImagesFolder)
    await fs.emptyDir(outputImagesFolder)

    await extractFrames({
        fps: targetFPS,
        input: inputVideo,
        output: path.join(outputImagesFolder, `/%d.png`)
    })

}

async function writeToJsonFile(number, pose) {
    if (await fs.exists(jsonFilePath)) {

        var _obj = jsonfile.readFileSync(jsonFilePath);
        _obj[number] = pose
        jsonfile.writeFileSync(jsonFilePath, _obj)

    } else {
        jsonfile.writeFileSync(jsonFilePath, {})
    }
}

function getL2NormalisedPoseVector(pose) {
    let xPos = pose.keypoints.map(k => {
        let x = k.position.x
        if (x > WIDTH) {
            x = WIDTH
        } else if (x < 0) {
            x = 0.00001
        }
        return x
    });
    let yPos = pose.keypoints.map((k) => {

        let y = k.position.y
        if (y > HEIGHT) {
            y = HEIGHT
        } else if (y < 0) {
            y = 0.00001
        }
        return y

    });

    let minX = Math.min(...xPos);
    let minY = Math.min(...yPos);

    const vector = [];
    for (let i = 0; i < xPos.length; i++) {
        let x = xPos[i] - minX
        let y = yPos[i] - minY
        let length = Math.sqrt(x * x + y * y);
        x = Number.isNaN(x / length) ? 0.00001 : x / length
        y = Number.isNaN(y / length) ? 0.00001 : y / length

        vector.push(x)
        vector.push(y)
    }
    return vector;

}

async function getPoseAndUpdateJson() {

    fs.removeSync(jsonFilePath)
    await posenet.initPosenet(WIDTH, HEIGHT);
    const images = walkSync(outputImagesFolder, { directories: false, ignore: ['images.json'] })
    for (var i = 0; i < images.length; i++) {
        var image = images[i].trim()

        console.log('Getting pose for ' + image)
        var pose = await posenet.getPoseResult(path.join(outputImagesFolder, image), WIDTH, HEIGHT)
        if (pose) {
            await writeToJsonFile(path.basename(image).replace('.png', '').trim(), getL2NormalisedPoseVector(pose))
        } else {
            console.log('pose not found for ' + image)
        }


    }
}

getPoseAndUpdateJson()