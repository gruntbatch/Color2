/** Copyright (C) 2021  Peter Gregory */

let ROTATION = -90

let REM = parseFloat(getComputedStyle(document.documentElement).fontSize);
let HALF_REM = REM * 0.5;

console.log(REM, HALF_REM);

// Establish a line of communication with the host
var csInterface = new CSInterface();
var extensionId = csInterface.getExtensionID();
csInterface.addEventListener(
    "com.adobe.PhotoshopJSONCallback" + extensionId,
    photoshopEventCallback);

var eventExch = 1165517672; // "Exch"
var eventRset = 1383294324; // "Rset"
var eventSetd = 1936028772; // "setd"
register(eventExch);
register(eventSetd);
register(eventRset);

var h = 0;
var s = 100;
var b = 100;

buildPanel();

// Update the panel, to initialize the h, s, b values
updatePanel();

function photoshopEventCallback(event) {
    updatePanel();
}

var cube = document.querySelector("#cube");
cube.addEventListener("mousedown", cubeOnMouseDown);

var ring = document.querySelector("#ring");
ring.addEventListener("mousedown", ringOnMouseDown);

let hueCube = document.getElementById("hue-cube");

var cubeReticle = document.querySelector("#cube-reticle");
cubeReticle.addEventListener("mousedown", cubeOnMouseDown);

var hueReticle = document.querySelector("#hue-reticle");
hueReticle.addEventListener("mousedown", ringOnMouseDown);

function cubeOnMouseDown(event) {
    mapCubeMouseToHsb(event);
    updateHSB(h, s, b);
    window.addEventListener("mousemove", cubeOnMouseMove);
    window.addEventListener("mouseup", cubeOnMouseUp);
}

function cubeOnMouseMove(event) {
    mapCubeMouseToHsb(event);
    updateHSB(h, s, b);
}

function cubeOnMouseUp(event) {
    mapCubeMouseToHsb(event);
    updateHSB(h, s, b);
    setForegroundColor(h, s, b);
    window.removeEventListener("mousemove", cubeOnMouseMove);
    window.removeEventListener("mouseup", cubeOnMouseUp);
}

function ringOnMouseDown(event) {
    mapRingMouseToHsb(event);
    updateHSB(h, s, b);
    window.addEventListener("mousemove", ringOnMouseMove);
    window.addEventListener("mouseup", ringOnMouseUp);
}

function ringOnMouseMove(event) {
    mapRingMouseToHsb(event);
    updateHSB(h, s, b);
}

function ringOnMouseUp(event) {
    mapRingMouseToHsb(event);
    updateHSB(h, s, b);
    setForegroundColor(h, s, b);
    window.removeEventListener("mousemove", ringOnMouseMove);
    window.removeEventListener("mouseup", ringOnMouseUp);
}

function register(eventId) {
    var event = new CSEvent("com.adobe.PhotoshopRegisterEvent", "APPLICATION");
    event.extensionId = extensionId;
    event.data = eventId.toString();
    csInterface.dispatchEvent(event);
}

function setForegroundColor(h, s, b) {
    csInterface.evalScript(`setForegroundHSB(${h}, ${s}, ${b})`);
}

function buildPanel() {
    let degrees = [...Array(360/15).keys()].map(x => x * 15).concat(360);
    let colors = degrees.map(x => `hsl(${360 - x}, 100%, 50%) ${x}deg`).join(", ");
    let background = `conic-gradient(from ${ROTATION}deg, ${colors})`;
    document.getElementById("ring").style.background = background;
}

function updatePanel() {
    csInterface.evalScript("getForegroundHSB()", function (result) {
        [h, s, b] = JSON.parse(result);
        updateHSB(h, s, b);
    });
}

function updateHSB(h, s, b) {
    hueCube.style.background = `hsl(${h}, 100%, 50%)`;

    // Set hue-meter
    let x, y;
    switch (true) {
    case (h < 45):
        x = -1;
        y = -Math.tan(degrees_to_radians(h));
        break;
    case (h < 135):
        x = Math.tan(degrees_to_radians(h - 90));
        y = -1;
        break;
    case (h < 225):
        x = 1;
        y = Math.tan(degrees_to_radians(h - 180));
        break;
    case (h < 315):
        x = -Math.tan(degrees_to_radians(h - 270));
        y = 1;
        break;
    default /* (h <= 360) */:
        x = -1;
        y = -Math.tan(degrees_to_radians(h));
        break;
    }

    x = (1.0 + x) / 2.0;
    y = (1.0 - y) / 2.0;
    
    console.log(x, y);

    let ringRect = ring.getBoundingClientRect();
    hueReticle.style.background = `hsl(${h}, 100%, 50%)`;
    hueReticle.style.left = `${ringRect.left + (ringRect.width - REM) * x}px`;
    hueReticle.style.top = `${ringRect.top + (ringRect.height - REM) * y}px`;
    
    // Set cube-meter
    let cubeRect = cube.getBoundingClientRect();
    if (s < 30 && b > 70) {
        cubeReticle.style.borderColor = "black";
    } else {
        cubeReticle.style.borderColor = "white";
    }
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
    s = x * 100;
    b = y * 100;
}

function mapRingMouseToHsb(event) {
    // Get transposed mouse coordinates
    let ringRect = ring.getBoundingClientRect();

    let x = event.clientX;
    x = (x - ringRect.left - HALF_REM) - (ringRect.width - REM) /  2.0;

    let y = event.clientY;
    y = (y - ringRect.top - HALF_REM) - (ringRect.height - REM) / 2.0;

    // Convert mouse coordinates to h
    h = pointToDegrees([-x, y]);
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