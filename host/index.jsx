/** Copyright (C) 2021  Peter Gregory */

function getForegroundHSB() {
    var hsb = app.foregroundColor.hsb;
    return ["[", hsb.hue, ", ", hsb.saturation, ", ", hsb.brightness, "]"].join("");
}

function getForegroundAndBackgroundHSB() {
    var fg = app.foregroundColor.hsb;
    var bg = app.backgroundColor.hsb;
    return [
        "[", "[", fg.hue, ", ", fg.saturation, ", ", fg.brightness, "]", ", ",
             "[", bg.hue, ", ", bg.saturation, ", ", bg.brightness, "]", "]"
    ].join("");
}

function setForegroundHSB(h, s, b) {
    // Create a new color object based on the given hsb values, then
    // set foregroundColor once, and only once. This prevents multiple
    // signals being sent back to the client.
    var color = new SolidColor();
    color.hsb.hue = h;
    color.hsb.saturation = s;
    color.hsb.brightness = b;
    app.foregroundColor = color;
}
