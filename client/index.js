/** Copyright (C) 2021  Peter Gregory */

let EVENT_EXCH = 1165517672; // "Exch"
let EVENT_RSET = 1383294324; // "Rset"
let EVENT_SETD = 1936028772; // "setd"

let ROTATION = -90;

let REM = parseFloat(getComputedStyle(document.documentElement).fontSize);
let HALF_REM = REM * 0.5;

// Establish a line of communication with the host
let csInterface = new CSInterface();
let extensionId = csInterface.getExtensionID();
csInterface.addEventListener(
    "com.adobe.PhotoshopJSONCallback" + extensionId,
    photoshopEventCallback);

function register(eventId) {
    var event = new CSEvent("com.adobe.PhotoshopRegisterEvent", "APPLICATION");
    event.extensionId = extensionId;
    event.data = eventId.toString();
    csInterface.dispatchEvent(event);
}

let foregroundColor = [0, 0, 0];
let backgroundColor = [0, 0, 100];

var cube = document.querySelector("#cube");
let hueCube = document.getElementById("hue-cube");
var ring = document.querySelector("#ring");
var cubeReticle = document.querySelector("#cube-reticle");
var hueReticle = document.querySelector("#hue-reticle");

buildPanel();

// Update the panel, to initialize the h, s, b values
updatePanel();

function buildPanel() {
    let degrees = [...Array(360/15).keys()].map(x => x * 15).concat(360);
    let colors = degrees.map(x => `hsl(${360 - x}, 100%, 50%) ${x}deg`).join(", ");
    let background = `conic-gradient(from ${ROTATION}deg, ${colors})`;
    document.getElementById("ring").style.background = background;
}

// Listen for the Exch, Rset, and setd Photoshop events
register(EVENT_EXCH);
register(EVENT_RSET);
register(EVENT_SETD);

function photoshopEventCallback(event) {
    updatePanel();
}

// Listen for canvas events
cube.addEventListener("mousedown", cubeOnMouseDown);
cubeReticle.addEventListener("mousedown", cubeOnMouseDown);

function cubeOnMouseDown(event) {
    mapCubeMouseToHsb(event);
    updateHSB(foregroundColor);
    // console.log("Hello?");
    window.addEventListener("mousemove", cubeOnMouseMove);
    window.addEventListener("mouseup", cubeOnMouseUp);
}

function cubeOnMouseUp(event) {
    mapCubeMouseToHsb(event);
    updateHSB(foregroundColor);
    setForegroundColor(foregroundColor);
    window.removeEventListener("mousemove", cubeOnMouseMove);
    window.removeEventListener("mouseup", cubeOnMouseUp);
}

function cubeOnMouseMove(event) {
    mapCubeMouseToHsb(event);
    updateHSB(foregroundColor);
}

ring.addEventListener("mousedown", ringOnMouseDown);
hueReticle.addEventListener("mousedown", ringOnMouseDown);

function ringOnMouseDown(event) {
    mapRingMouseToHsb(event);
    updateHSB(foregroundColor);
    window.addEventListener("mousemove", ringOnMouseMove);
    window.addEventListener("mouseup", ringOnMouseUp);
}

function ringOnMouseMove(event) {
    mapRingMouseToHsb(event);
    updateHSB(foregroundColor);
}

function ringOnMouseUp(event) {
    mapRingMouseToHsb(event);
    updateHSB(foregroundColor);
    setForegroundColor(foregroundColor);
    window.removeEventListener("mousemove", ringOnMouseMove);
    window.removeEventListener("mouseup", ringOnMouseUp);
}

window.onresize = _ => updateHSB(foregroundColor);

function setForegroundColor([h, s, b]) {
    csInterface.evalScript(`setForegroundHSB(${h}, ${s}, ${b})`);
}

function updatePanel() {
    csInterface.evalScript("getForegroundHSB()", function (result) {
        foregroundColor = JSON.parse(result);
        updateHSB(foregroundColor);
    });
}

function thetaToOpposite(theta, adjacent) {
    return Math.tan(degrees_to_radians(theta)) * adjacent;
}

function updateHSB([h, s, b]) {
    console.log(h, s, b);
    hueCube.style.background = `hsl(${h}, 100%, 50%)`;

    // Set hue-meter
    let ringRect = ring.getBoundingClientRect();
    let halfWidth = (ringRect.width - REM) / 2.0;
    let halfHeight = (ringRect.height - REM) / 2.0;
    let x, y;
    
    if (h < 90 || 270 < h) {
        x = -halfWidth;
        y = thetaToOpposite(h, halfWidth);
        if (y < -halfHeight) {
            x = -thetaToOpposite(h - 90, halfHeight);
            y = -halfHeight;
        } else if (halfHeight < y) {
            x = thetaToOpposite(h + 90, halfHeight);
            y = halfHeight;
        }
    } else {
        x = halfWidth;
        y = -thetaToOpposite(h - 180, halfWidth);
        if (y < -halfHeight) {
            x = -thetaToOpposite(h - 90, halfHeight);
            y = -halfHeight;
        } else if (halfHeight < y) {
            x = thetaToOpposite(h + 270, halfHeight);
            y = halfHeight;
        }
    }

    x = x + halfWidth;
    y = y + halfHeight;

    hueReticle.style.borderColor = (50 < h && h < 85) ? "black" : "white";
    hueReticle.style.background = `hsl(${h}, 100%, 50%)`;
    hueReticle.style.left = `${ringRect.left + x}px`;
    hueReticle.style.top = `${ringRect.top + y}px`;
    
    // Set cube-meter
    let cubeRect = cube.getBoundingClientRect();
    cubeReticle.style.borderColor = (s < 30 && b > 70) ? "black" : "white";
    cubeReticle.style.background = `hsl(${h}, ${s}%, ${sb_to_l(s, b)}%)`;
    cubeReticle.style.left = `${(cubeRect.left) + (cubeRect.width - REM) * (s / 100)}px`;
    cubeReticle.style.top = `${(cubeRect.top) + (cubeRect.height - REM) * ((100 - b) / 100)}px`;
}

function mapCubeMouseToHsb(event) {
    // Get normalized mouse coordinates
    let cubeRect = cube.getBoundingClientRect();
    
    let x = event.clientX;
    x = (x - cubeRect.left - HALF_REM) / (cubeRect.width - REM);
    x = clamp(x, 0, 1);
    
    let y = event.clientY;
    y = (y - cubeRect.top - HALF_REM) / (cubeRect.height - REM);
    y = clamp(y, 0, 1);
    y = 1 - y;
    
    // Update s, b
    foregroundColor[1] = x * 100;
    foregroundColor[2] = y * 100;
}

function mapRingMouseToHsb(event) {
    // Get transposed mouse coordinates
    let ringRect = ring.getBoundingClientRect();

    let x = event.clientX;
    x = (x - ringRect.left - HALF_REM) - (ringRect.width - REM) /  2.0;

    let y = event.clientY;
    y = (y - ringRect.top - HALF_REM) - (ringRect.height - REM) / 2.0;

    // Convert mouse coordinates to h
    foregroundColor[0] = pointToDegrees([-x, y]);
}

// https://stackoverflow.com/a/31851617
function hsb_to_hsl(h, s, v) {
    return [h, s, sb_to_l(s, v)]
}

function sb_to_l(s, v) {
    s = s / 100;
    v = v / 100;

    // both hsv and hsl values are in [0, 1]
    var l = (2 - s) * v / 2;

    if (l != 0) {
        if (l == 1) {
            s = 0
        } else if (l < 0.5) {
            s = s * v / (l * 2)
        } else {
            s = s * v / (2 - l * 2)
        }
    }

    return l * 100;
}

// Is it easier to find a clamp function on so than to write your own?
// Of course it is.
// https://stackoverflow.com/a/11410079
function clamp(num, min, max) {
    return num <= min ? min : num >= max ? max : num;
}

function pointToDegrees([x, y]) {
    let d = radians_to_degrees(Math.atan2(y, x));
    return (d < 0) ? 360 + d : d;
}

function degrees_to_radians(degrees) {
    return degrees * (Math.PI / 180.0);
}

function radians_to_degrees(radians) {
    return radians * (180.0 / Math.PI);
}