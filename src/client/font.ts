import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader"

const fontLoader = new FontLoader()
let ornateFont: Font
let textFont: Font

// Initialize Fonts
const initFonts = async () => {
    return await Promise.all(
        [
            new Promise<Font>((resolve, reject) => {
                fontLoader.load(
                    "/fonts/ornamental_versals_regular.json",
                    (font) => {
                        ornateFont = font
                        resolve(font)
                    },
                    undefined,
                    (error) => reject(error)
                )
            }), new Promise<Font>((resolve, reject) => {
                if (textFont) { resolve(textFont) }
                fontLoader.load(
                    "/fonts/best_christmas_personal_use_regular.json",
                    (font) => {
                        textFont = font
                        resolve(font)
                    },
                    undefined,
                    (error) => reject(error)
                )
            })
        ]
    )
    
}

// Load Font
const getOrnateFont = () => ornateFont
const getTextFont = () => textFont

export { getOrnateFont, getTextFont, initFonts }