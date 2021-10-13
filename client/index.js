/** Color2 is an improved color picker for Adobe Photoshop
    Copyright (C) 2021  Peter Gregory

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>. */

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

function getForegroundHSB() {
    return new Promise((resolve, reject) => {
        csInterface.evalScript("getForegroundHSB()", resolve);
    })
    .then(result => JSON.parse(result));
}

function getForegroundAndBackgroundHSB() {
    return new Promise((resolve, reject) => {
        csInterface.evalScript("getForegroundAndBackgroundHSB()", resolve);
    })
    .then(result => JSON.parse(result));
}

function setForegroundColorHSB([h, s, b]) {
    csInterface.evalScript(`setForegroundHSB(${h}, ${s}, ${b})`);
}

// All colors are stored in HSB
let foregroundColor = [0, 0, 0];
let backgroundColor = [0, 0, 100];

let colorA = [0, 0, 0];
let colorB = [0, 0, 100];

let hueCube = document.getElementById("hue-cube");
let hueRing = document.getElementById("hue-ring");
let cubeReticle = document.getElementById("cube-reticle");
let ringReticle = document.getElementById("ring-reticle");

let colorButtonA = document.getElementById("color-a");
let colorMix = document.getElementById("color-mix");
let colorButtonB = document.getElementById("color-b");

// Initialize the panel.
(_ => {
    let degrees = [...Array(360/15).keys()].map(x => x * 15).concat(360);
    let colors = degrees.map(x => `hsl(${360 - x}, 100%, 50%) ${x}deg`).join(", ");
    let background = `conic-gradient(from ${ROTATION}deg, ${colors})`;
    hueRing.style.background = background;

    getForegroundAndBackgroundHSB().then(([fg, bg]) => {
        foregroundColor = fg;
        backgroundColor = bg;
        colorA = fg;
        colorB = bg;
        updateHue(foregroundColor);
        updateSaturationBrightness(foregroundColor);
        updateMix(colorA, colorB);
    })
})();

// Listen for the Exch, Rset, and setd Photoshop events, and update the panel
// when we recieve any of them
register(EVENT_EXCH);
register(EVENT_RSET);
register(EVENT_SETD);

function photoshopEventCallback(event) {
    getForegroundAndBackgroundHSB().then(([fg, bg]) => {
        foregroundColor = fg;
        backgroundColor = bg;
        updateHue(foregroundColor);
        updateSaturationBrightness(foregroundColor);
    })
}

// Listen for canvas events
hueCube.onmousedown = _ => {
    window.onmousemove = event => {
        foregroundColor = mapCubeMouseToHSB(event, foregroundColor);
        updateSaturationBrightness(foregroundColor);
    };
    window.onmouseup = event => {
        foregroundColor = mapCubeMouseToHSB(event, foregroundColor);
        setForegroundColorHSB(foregroundColor);
        window.onmousemove = null;
        window.onmouseup = null;
    };
};

hueRing.onmousedown = _ => {
    window.onmousemove = event => {
        foregroundColor = mapRingMouseToHSB(event, foregroundColor);
        updateHue(foregroundColor);
    };
    window.onmouseup = event => {
        foregroundColor = mapRingMouseToHSB(event, foregroundColor);
        setForegroundColorHSB(foregroundColor);
        window.onmousemove = null;
        window.onmouseup = null;
    };
};

colorButtonA.onmousedown = _ => {
    colorA = [...foregroundColor];
    updateMix(colorA, colorB);
};

colorButtonB.onmousedown = _ => {
    colorB = [...foregroundColor];
    updateMix(colorA, colorB);
};

colorMix.onmousedown = event => {
    window.onmousemove = event => {
        foregroundColor = mapMixMouseToHSB(event, colorA, colorB);
        updateHue(foregroundColor);
        updateSaturationBrightness(foregroundColor);
    };
    window.onmouseup = event => {
        foregroundColor = mapMixMouseToHSB(event, colorA, colorB);
        setForegroundColorHSB(foregroundColor);
        window.onmousemove = null;
        window.onmouseup = null;
    };
};

[0, 25, 50, 75, 100].map(x => {
    document.getElementById(`white-${x}`).onmousedown = _ => {
        foregroundColor = [foregroundColor[0], 0, x];
        setForegroundColorHSB(foregroundColor);
    };
});

window.onresize = _ => {
    updateHue(foregroundColor);
    updateSaturationBrightness(foregroundColor);
};

function updateHue([h, s, b]) {
    // Update the hue-cube background color
    hueCube.style.background = `hsl(${h}, 100%, 50%)`;

    // Update the ring-reticle color and position
    let hueRingRect = hueRing.getBoundingClientRect();
    let halfWidth = (hueRingRect.width - REM) / 2.0;
    let halfHeight = (hueRingRect.height - REM) / 2.0;
    let x, y;
    let toa = (theta, adjacent) => Math.tan(degrees_to_radians(theta)) * adjacent;
    if (h < 90 || 270 < h) {
        x = -halfWidth;
        y = toa(h, halfWidth);
        if (y < -halfHeight) {
            x = -toa(h - 90, halfHeight);
            y = -halfHeight;
        } else if (halfHeight < y) {
            x = toa(h + 90, halfHeight);
            y = halfHeight;
        }
    } else {
        x = halfWidth;
        y = -toa(h - 180, halfWidth);
        if (y < -halfHeight) {
            x = -toa(h - 90, halfHeight);
            y = -halfHeight;
        } else if (halfHeight < y) {
            x = toa(h + 270, halfHeight);
            y = halfHeight;
        }
    }

    x = x + halfWidth;
    y = y + halfHeight;

    ringReticle.style.borderColor = (50 < h && h < 85) ? "black" : "white";
    ringReticle.style.background = `hsl(${h}, 100%, 50%)`;
    ringReticle.style.left = `${hueRingRect.left + x}px`;
    ringReticle.style.top = `${hueRingRect.top + y}px`;
}

function updateSaturationBrightness([h, s, b]) {
    // Update the cube-reticle color and position
    let hueCubeRect = hueCube.getBoundingClientRect();
    cubeReticle.style.borderColor = (s < 30 && b > 70) ? "black" : "white";
    cubeReticle.style.background = hsb_to_css_hsl([h, s, b]);
    cubeReticle.style.left = `${(hueCubeRect.left) + (hueCubeRect.width - REM) * (s / 100)}px`;
    cubeReticle.style.top = `${(hueCubeRect.top) + (hueCubeRect.height - REM) * ((100 - b) / 100)}px`;
}

function updateMix(a, b) {
    colorButtonA.style.borderColor = (a[1] < 30 && a[2] > 70) ? "black" : "white";
    colorButtonA.style.background = hsb_to_css_hsl(a);
    colorMix.style.background = `linear-gradient(to right, ${hsb_to_css_hsl(a)} 1rem, ${hsb_to_css_hsl(b)} calc(100% - 1rem))`
    colorButtonB.style.borderColor = (b[1] < 30 && b[2] > 70) ? "black" : "white";
    colorButtonB.style.background = hsb_to_css_hsl(b);
}

function mapCubeMouseToHSB(event, [h, s, b]) {
    // Normalize mouse coordinates
    let hueCubeRect = hueCube.getBoundingClientRect();
    let x = (event.clientX - hueCubeRect.left - HALF_REM) / (hueCubeRect.width - REM);
    let y = (event.clientY - hueCubeRect.top - HALF_REM) / (hueCubeRect.height - REM);
    // Convert mouse coordinates to saturation and brightness
    return [h, clamp(x, 0, 1) * 100, clamp(1 - y, 0, 1) * 100];
}

function mapRingMouseToHSB(event, [h, s, b]) {
    // Get transformed mouse coordinates
    let hueRingRect = hueRing.getBoundingClientRect();
    let x = (event.clientX - hueRingRect.left - HALF_REM) - (hueRingRect.width - REM) /  2.0;
    let y = (event.clientY - hueRingRect.top - HALF_REM) - (hueRingRect.height - REM) / 2.0;
    // Convert mouse coordinates to h
    return [pointToDegrees([-x, y]), s, b];
}

function mapMixMouseToHSB(event, a, b) {
    // Normalize mouse position
    colorMixRect = colorMix.getBoundingClientRect();
    let x = (event.clientX - colorMixRect.left - REM) / (colorMixRect.width - 2.0 * REM);
    // Lerp between a and b
    return rgb_to_hsb(lerpRGB(hsb_to_rgb(a), hsb_to_rgb(b), clamp(x, 0, 1)));
}

function lerpRGB(a, b, t) {
    return [
        lerp(a[0], b[0], t),
        lerp(a[1], b[1], t),
        lerp(a[2], b[2], t)
    ]
}

function lerp(a, b, t) {
    return a * (1.0 - t) + b * t;
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

function hsb_to_css_hsl(hsb) {
    [h, s, l] = hsb_to_hsl(hsb);
    return `hsl(${h}, ${s}%, ${l}%)`
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