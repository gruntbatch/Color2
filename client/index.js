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

// Update the panel, to initialize the h, s, b values
updatePanel();

function photoshopEventCallback(event) {
    updatePanel();
}

var cube = document.querySelector("#cube");
cube.addEventListener("mousedown", cubeOnMouseDown);

var ring = document.querySelector("#ring");
ring.addEventListener("mousedown", ringOnMouseDown);

function cubeOnMouseDown(event) {
    // TODO Update panel's hsb
    window.addEventListener("mouseup", cubeOnMouseUp);
}

function cubeOnMouseUp(event) {
    mapCubeMouseToHsb(event);
    updateHSB(h, s, b);
    setForegroundColor(h, s, b);
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

function updatePanel() {
    csInterface.evalScript("getForegroundHSB()", function (result) {
        [h, s, b] = JSON.parse(result);
        updateHSB(h, s, b);
    });
}

function updateHSB(h, s, b) {
    var hue = document.querySelector("#hue-cube");
    hue.style.background = `hsl(${h}, 100%, 50%)`;
}

function mapCubeMouseToHsb(event) {
    // Get normalized mouse coordinates
    var [x, y] = normalizeMouseCoordinates(event.clientX, event.clientY, cube);
    // Update h, s, b
    [s, b] = nmc_to_sb(x, y);
}

function mapRingMouseToHsb(event) {
    // Get normalized mouse coordinates
    // Note, because the corners of the ring are single solid colors, it is
    // more accurate to use the inner edge of the ring (the cube) to calculate
    // client coordinates than the outer edge of the ring.
    var [x, y] = normalizeMouseCoordinates(event.clientX, event.clientY, cube);
    // Update h, s, b
    h = nmc_to_h(x, y);
}

function normalizeMouseCoordinates(x, y, client) {
    var clientRect = client.getBoundingClientRect();
    var mouseX = (x - clientRect.left) / clientRect.width;
    var mouseY = (y - clientRect.top) / clientRect.height;
    return [clamp(mouseX, 0, 1), clamp(mouseY, 0, 1)];
}

function nmc_to_sb(x, y) {
    y = 1 - y;
    return [x * 100, y * 100];
}

function nmc_to_h(x, y) {
    var x_ = 2 * x - 1;
    var y_ = 1 - 2 * y;

    switch (true) {
        case (0 <= y_ && y_ <= x_):
            var scalar = y_ / Math.abs(x_);
            return 45 * scalar;
        case (x_ <= y_ && -x_ <= y_):
            var scalar = x_ / Math.abs(y_);
            scalar = (scalar + 1) / 2;
            return 45 + 90 * (1 - scalar);
        case (y_ <= -x_ && -y_ <= -x_):
            var scalar = y_ / Math.abs(x_);
            scalar = (scalar + 1) / 2;
            return 135 + 90 * (1 - scalar);
        case (-x_ <= -y_ && x_ <= -y_):
            var scalar = x_ / Math.abs(y_);
            scalar = (scalar + 1) / 2;
            return 225 + 90 * scalar;
        default /* -y_ <= x_ && y_ <= 0 */:
            var scalar = y_ / Math.abs(x_);
            return 315 + 45 * (1 + scalar);
    }
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