const colorThief = require('colorthief')

function toRgbArray(color) {
    if (Array.isArray(color)) return color

    return [
        color.r ?? color._r,
        color.g ?? color._g,
        color.b ?? color._b,
    ]
}

function getColorPopulation(color) {
    return color.population ?? 0
}

function rgbToHex(color) {
    const values = toRgbArray(color)
    const toHex = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase()
    const [r, g, b] = values

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function rgbToHsl([r, g, b]) {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const lightness = (max + min) / 2

    if (max === min) {
        return { hue: 0, saturation: 0, lightness }
    }

    const delta = max - min
    const saturation = lightness > 0.5
        ? delta / (2 - max - min)
        : delta / (max + min)

    let hue
    switch (max) {
        case r:
            hue = (g - b) / delta + (g < b ? 6 : 0)
            break
        case g:
            hue = (b - r) / delta + 2
            break
        default:
            hue = (r - g) / delta + 4
            break
    }

    return { hue: hue / 6, saturation, lightness }
}

function scoreMutedColor(color) {
    const { saturation, lightness } = rgbToHsl(toRgbArray(color))
    const mutedSaturation = 1 - Math.abs(saturation - 0.35)
    const mutedLightness = 1 - Math.abs(lightness - 0.5)
    const population = Math.min(getColorPopulation(color) / 50000, 1)

    return mutedSaturation * 0.55 + mutedLightness * 0.3 + population * 0.15
}

async function getMutedColor(imagePath) {
    const palette = await colorThief.getPalette(imagePath, 8)
    const candidates = palette
        .filter((color) => {
            const [r, g, b] = toRgbArray(color)
            return !(r > 240 && g > 240 && b > 240)
        })
        .sort((a, b) => scoreMutedColor(b) - scoreMutedColor(a))
    const muted = candidates[0] || palette[0]

    return muted ? rgbToHex(muted) : null
}

module.exports = {
    getMutedColor,
    rgbToHex,
    rgbToHsl,
    scoreMutedColor,
}
