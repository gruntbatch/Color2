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

// Create client graphics
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
        updateHue(h);
    });
}

function updateHue(h) {
    var hue = document.querySelector("#hue");
    hue.style.background = `hsl(${h}, 100%, 50%)`;
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