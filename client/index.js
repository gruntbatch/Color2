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
    let event = new CSEvent("com.adobe.PhotoshopRegisterEvent", "APPLICATION");
    event.extensionId = extensionId;
    event.data = eventId.toString();
    csInterface.dispatchEvent(event);
}

// All colors are stored in HSB
let foregroundColor = [0, 0, 0];
let backgroundColor = [0, 0, 100];

let colorA = [0, 0, 0];
let colorB = [0, 0, 100];

let cube = document.querySelector("#cube");
let hueCube = document.getElementById("hue-cube");
let ring = document.querySelector("#ring");
let cubeReticle = document.querySelector("#cube-reticle");
let hueReticle = document.querySelector("#hue-reticle");

let colorButtonA = document.getElementById("color-a");
let colorMix = document.getElementById("color-mix");
let colorButtonB = document.getElementById("color-b");

buildPanel();

function buildPanel() {
    let degrees = [...Array(360/15).keys()].map(x => x * 15).concat(360);
    let colors = degrees.map(x => `hsl(${360 - x}, 100%, 50%) ${x}deg`).join(", ");
    let background = `conic-gradient(from ${ROTATION}deg, ${colors})`;
    document.getElementById("ring").style.background = background;

    csInterface.evalScript("getForegroundAndBackgroundHSB()", function (result) {
        [colorA, colorB] = JSON.parse(result);
        updateColorMix(colorA, colorB);
    });
}

// Update the panel, to initialize the h, s, b values
updatePanel();

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
    window.addEventListener("mousemove", cubeOnMouseMove);
    window.addEventListener("mouseup", cubeOnMouseUp);
}

function cubeOnMouseUp(event) {
    mapCubeMouseToHsb(event);
    // updateHSB(foregroundColor);
    setForegroundColorHSB(foregroundColor);
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
    setForegroundColorHSB(foregroundColor);
    window.removeEventListener("mousemove", ringOnMouseMove);
    window.removeEventListener("mouseup", ringOnMouseUp);
}

colorButtonA.addEventListener("mousedown", (event) => {
    colorA = [...foregroundColor];
    console.log("A", colorA, colorB);
    updateColorMix(colorA, colorB);
});

colorButtonB.addEventListener("mousedown", (event) => {
    colorB = [...foregroundColor];
    console.log("B", colorA, colorB);
    updateColorMix(colorA, colorB);
});

colorMix.addEventListener("mousedown", (event) => {
    // Map mouse position from 0 to 1
    mixRect = colorMix.getBoundingClientRect();

    let x = event.clientX;
    x = (x - mixRect.left - REM) / (mixRect.width - 2.0 * REM);
    x = clamp(x, 0, 1);

    foregroundColor = rgb_to_hsb(lerpRGB(hsb_to_rgb(colorA), hsb_to_rgb(colorB), x));

    updateHSB(foregroundColor);
    setForegroundColorHSB(foregroundColor);
});

window.onresize = _ => updateHSB(foregroundColor);

function setForegroundColorHSB([h, s, b]) {
    csInterface.evalScript(`setForegroundHSB(${h}, ${s}, ${b})`);
}

function setForegroundColorRGB([r, g, b]) {
    csInterface.evalScript
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
    cubeReticle.style.background = hsb_to_css_hsl([h, s, b]);
    cubeReticle.style.left = `${(cubeRect.left) + (cubeRect.width - REM) * (s / 100)}px`;
    cubeReticle.style.top = `${(cubeRect.top) + (cubeRect.height - REM) * ((100 - b) / 100)}px`;
}

function updateColorMix(a, b) {
    colorButtonA.style.background = hsb_to_css_hsl(a);
    colorMix.style.background = `linear-gradient(to right, ${hsb_to_css_hsl(a)} 1rem, ${hsb_to_css_hsl(b)} calc(100% - 1rem))`
    colorButtonB.style.background = hsb_to_css_hsl(b);
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
function hsb_to_hsl([h, s, v]) {
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

function lerp(a, b, t) {
    return a * (1.0 - t) + b * t;
}

function lerpRGB(a, b, t) {
    // a = [
    //     Math.cos(degrees_to_radians(a[0])) * a[1],
    //     Math.sin(degrees_to_radians(a[0])) * a[1],
    //     a[2]
    // ];

    // b = [
    //     Math.cos(degrees_to_radians(b[0])) * b[1],
    //     Math.sin(degrees_to_radians(b[0])) * b[1],
    //     b[2]
    // ]

    // let c = [
    //     lerp(a[0], b[0], t),
    //     lerp(a[1], b[1], t),
    //     lerp(a[2], b[2], t)
    // ]

    // return [
    //     radians_to_degrees(Math.atan2(c[1], c[0])),
    //     Math.sqrt(c[0] * c[0] + c[1] * c[1]),
    //     c[0]
    // ];

    return [
        lerp(a[0], b[0], t),
        lerp(a[1], b[1], t),
        lerp(a[2], b[2], t)
    ]
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

function hsb_to_css_hsl(hsb) {
    [h, s, l] = hsb_to_hsl(hsb);
    return `hsl(${h}, ${s}%, ${l}%)`
}

function rgb_to_css_rgb([r, g, b]) {
    return `rgb(${r}, ${g}, ${b})`
}

// https://www.30secondsofcode.org/js/s/rgb-to-hsb
function rgb_to_hsb([r, g, b]) {
    const v = Math.max(r, g, b);
    const n = v - Math.min(r, g, b);
    // lol, good luck debugging these heiroglyphics
    const h = n === 0 ? 0 : n && v === r ? (g - b) / n : v === g ? 2 + (b - r) / n : 4 + (r - g) / n;
    return [60 * (h < 0 ? h + 6 : h), v && (n / v) * 100, v * 100];
}

// https://www.30secondsofcode.org/js/s/hsb-to-rgb
function hsb_to_rgb([h, s, b]) {
    s /= 100;
    b /= 100;
    const k = (n) => (n + h / 60) % 6;
    const f = (n) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    return [f(5), f(3), f(1)];
}