/** Copyright (C) 2021  Peter Gregory */

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

var cube = document.querySelector("#cube");
cube.addEventListener("mousedown", cubeOnMouseDown);

var ring = document.querySelector("#ring");
ring.addEventListener("mousedown", ringOnMouseDown);

function cubeOnMouseDown(event) {
    // TODO Update panel's hsb
    window.addEventListener("mouseup", cubeOnMouseUp);
}

function cubeOnMouseUp(event) {
    // Get normalized mouse coordinates
    var [x, y] = normalizeMouseCoordinates(event.clientX, event.clientY, cube.getBoundingClientRect());
    // Modify according to our specific needs
    y = 1 - y;
    // Do shit
    s = x * 100;
    b = y * 100;
    updateHSB();
    window.removeEventListener("mouseup", cubeOnMouseUp);
}

function ringOnMouseDown(event) {
    window.addEventListener("mouseup", ringOnMouseUp);
}

function ringOnMouseUp(event) {
    // Get normalized mouse coordinates
    var [x, y] = normalizeMouseCoordinates(event.clientX, event.clientY, cube.getBoundingClientRect());
    // Modify according to our specific needs
    x = 2 * x - 1;
    y = 1 - 2 * y;
    // Do shit
    console.log("RING", x, y);
    window.removeEventListener("mouseup", ringOnMouseUp);
}

createPanel();

function photoshopEventCallback(event) {
    updatePanel();
}

function onClickEventCallback(event) {
    console.log(event);
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

function createPanel() {
    // createSaturation();
    // createPalette();
    updatePanel();
}

function updatePanel() {
    csInterface.evalScript("getForegroundHSB()", function (result) {
        var h, s, b;
        [h, s, b] = JSON.parse(result);
        updateHSB(h, s, b);
    });
}

function updateHSB(h, s, b) {
    var hue = document.querySelector("#hue-cube");
    hue.style.background = `hsl(${h}, 100%, 50%)`;

    var s_ = Math.floor((100 - s) / 100 * 255);
    var saturation = document.querySelector("#saturation-ring");
    saturation.style.background = `rgb(${s_}, ${s_}, ${s_})`;

    var b_ = Math.floor(b / 100 * 255);
    var value = document.querySelector("#value-ring");
    value.style.background = `rgb(${b_}, ${b_}, ${b_})`;
}

function normalizeMouseCoordinates(x, y, clientRect) {
    var mouseX = (x - clientRect.left) / clientRect.width;
    var mouseY = (y - clientRect.top) / clientRect.height;
    return [clamp(mouseX, 0, 1), clamp(mouseY, 0, 1)];
}

// https://stackoverflow.com/a/31851617
function hsb_to_hsl(h, s, v) {
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

    return [h, s * 100, l * 100]
}

// Is it easier to find a clamp function on so than to write your own?
// Of course it is.
// https://stackoverflow.com/a/11410079
function clamp(num, min, max) {
    return num <= min ? min : num >= max ? max : num;
}