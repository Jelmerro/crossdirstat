"use strict"
/* global MAIN SETTINGS DIR squarify remote */

let filetypes = {}
let callbacks = 0
let squares = []

function generate() {
    filetypes = {}
    callbacks = 0
    document.getElementById("file-name").textContent = ""
    const allFiles = MAIN.getAllFiles()
    if (allFiles.size === 0) {
        MAIN.updateCurrentStep("errors")
        setTimeout(() => {
            MAIN.handleErrors()
        }, 30)
        squares = []
        const canvas = document.getElementById("square-view")
        const context = canvas.getContext("2d")
        context.clearRect(0, 0, canvas.width, canvas.height)
        generateStatsAndColors()
        return
    }
    const processedFiles = processNode(allFiles)
    MAIN.updateCurrentStep("squarify", 0, processedFiles.subfiles)
    setTimeout(() => {
        squares = squarify.default(processedFiles.children, {
            x0: 0, y0: 0, x1: 10000, y1: 10000})
        setTimeout(() => {
            parseSquares()
        }, 30)
    }, 30)
}

function parseSquares() {
    const allColors = SETTINGS.getSelectedColors()
    const typesBySize = getFiletypesBySize()
    const canvas = document.getElementById("square-view")
    const ctx = canvas.getContext("2d")
    for (const s of squares) {
        setTimeout(() => {
            if (s.value > 0) {
                let color = allColors.filetypes[typesBySize.indexOf(s.type)]
                if (color === undefined) {
                    color = allColors.default
                }
                const gradient = ctx.createLinearGradient(
                    s.x0, s.y0, s.x1, s.y1)
                gradient.addColorStop(0, changeColor(color, 100))
                gradient.addColorStop(0.5, color)
                gradient.addColorStop(1, changeColor(color, -100))
                ctx.fillStyle = gradient
                ctx.fillRect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0)
            }
            doneStroking()
        }, 1)
    }
    document.querySelectorAll(`#visual button`).forEach(b => {
        b.removeAttribute("disabled")
    })
    generateStatsAndColors()
}

function changeColor(color, change) {
    const red = changeHex(color.substring(1, 3), change)
    const green = changeHex(color.substring(3, 5), change)
    const blue = changeHex(color.substring(5, 7), change)
    return `#${red}${green}${blue}`
}

function changeHex(hex, change) {
    const calculated = parseInt(hex, 16) + change
    const newHex = Math.min(255, Math.max(0, calculated))
    return newHex.toString(16).padStart(2, "0")
}

function doneStroking() {
    callbacks += 1
    MAIN.updateCurrentStep("canvas", callbacks, squares.length)
    if (callbacks === squares.length) {
        MAIN.updateCurrentStep("errors")
        setTimeout(() => {
            MAIN.handleErrors()
        }, 30)
    }
}

function generateStatsAndColors() {
    const allColors = SETTINGS.getSelectedColors()
    const colorsElement = document.getElementById("colors-config")
    colorsElement.innerHTML = ""
    let index = 0
    for (const type of getFiletypesBySize()) {
        let color = allColors.filetypes[index]
        if (color === undefined) {
            color = allColors.default
        }
        colorsElement.innerHTML += `<div>
            <input type="color" value="${color}" index="${index}"
                onchange="VISUAL.colorChange(event)">
            ${type}<br />${filetypes[type].count} files
            ${DIR.prettySize(filetypes[type].size)}
        </div>`
        index += 1
    }
}

function colorChange(event) {
    const index = event.srcElement.getAttribute("index")
    const color = event.srcElement.value
    const canvas = document.getElementById("square-view")
    const ctx = canvas.getContext("2d")
    const type = getFiletypesBySize()[index]
    for (const s of squares) {
        if (s.type === type) {
            setTimeout(() => {
                if (s.value > 0) {
                    const gradient = ctx.createLinearGradient(
                        s.x0, s.y0, s.x1, s.y1)
                    gradient.addColorStop(0, changeColor(color, 100))
                    gradient.addColorStop(0.5, color)
                    gradient.addColorStop(1, changeColor(color, -100))
                    ctx.fillStyle = gradient
                    ctx.fillRect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0)
                }
            }, 0)
        }
    }
}

function getFiletypesBySize() {
    return Object.keys(filetypes).sort((one, two) => {
        return filetypes[two].size - filetypes[one].size
    })
}

function setFilenameOnHover(e) {
    const canvas = document.getElementById("square-view")
    const r = canvas.getBoundingClientRect()
    const x = (e.clientX - r.left) / (r.right - r.left) * canvas.width
    const y = (e.clientY - r.top) / (r.bottom - r.top) * canvas.height
    for (const s of squares) {
        if (x > s.x0 && y > s.y0 && x < s.x1 && y < s.y1) {
            document.getElementById("file-name").textContent = s.location
            return
        }
    }
}

function processNode(node) {
    node.value = node.size
    if (node.children === undefined) {
        node.type = filetype(node)
        return node
    }
    for (const num in node.children) {
        node.children[num] = processNode(node.children[num])
    }
    return node
}

function filetype(f) {
    let type = /^.+\.([^.]+)$/.exec(f.name)
    type = type === null ? "none" : type[1]
    if (filetypes[type] === undefined) {
        filetypes[type] = {}
        filetypes[type].size = f.size
        filetypes[type].count = 1
    } else {
        filetypes[type].size += f.size
        filetypes[type].count += 1
    }
    return type
}

function saveImage() {
    let message = "SVG: Vector with filenames as tooltip hover\n"
    message += "PNG: 10000x10000 lossless image render (multiple seconds)\n"
    message += "JSON: List of squares, colors and filetype statistics"
    const response = remote.dialog.showMessageBoxSync(remote.getCurrentWindow(), {
        type: "question",
        title: "Export type",
        buttons: ["SVG", "PNG", "JSON", "Cancel"],
        message: message
    })
    if (response === 0) {
        saveSVG()
    } else if (response === 1) {
        savePNG()
    } else if (response === 2) {
        saveJSON()
    }
}

function saveSVG() {
    const filename = remote.dialog.showSaveDialogSync(remote.getCurrentWindow(), {
        title: "Select the save location",
        filters: [{name: "Scalable Vector Graphics file", extensions: ["svg"]}]
    })
    if (filename === undefined) {
        return
    }
    let body = `<?xml version="1.0" encoding="UTF-8" ?>\n`
    body += `<!-- Generated with crossdirstat: `
    body += `Free open-source cross-platform file & directory statistics -->\n`
    body += `<!-- For more details see `
    body += `https://github.com/jelmerro/crossdirstat -->\n<svg height="1000" `
    body += `width="1000" xmlns="http://www.w3.org/2000/svg" version="1.1">\n`
    const allColors = SETTINGS.getSelectedColors()
    const types = getFiletypesBySize()
    for (const s of squares) {
        let color = allColors.filetypes[types.indexOf(s.type)]
        if (color === undefined) {
            color = allColors.default
        }
        body += `<g><title>${s.location}</title>
            <rect x="${s.x0 / 10}" y="${s.y0 / 10}" fill="${color}"
                width="${(s.x1 - s.x0) / 10}"
                height="${(s.y1 - s.y0) / 10}"></rect></g>\n`
    }
    body += "</svg>"
    MAIN.writeToFile(filename, body)
}

function savePNG() {
    const filename = remote.dialog.showSaveDialogSync(remote.getCurrentWindow(), {
        title: "Select the save location",
        filters: [{name: "Portable Network Graphics file", extensions: ["png"]}]
    })
    if (filename === undefined) {
        return
    }
    const canvas = document.getElementById("square-view")
    const imageData = canvas.toDataURL().replace(/^data:image\/png;base64,/, "")
    MAIN.writeToFile(filename, imageData, "base64")
}

function saveJSON() {
    const filename = remote.dialog.showSaveDialogSync(remote.getCurrentWindow(), {
        title: "Select the save location",
        filters: [
            {name: "JavaScript Object Notation file", extensions: ["json"]}]
    })
    if (filename === undefined) {
        return
    }
    const json = {
        squares: squares,
        colors: SETTINGS.getSelectedColors(),
        filetypes: getFiletypesBySize()
    }
    MAIN.writeToFile(filename, JSON.stringify(json, null, 4))
}

module.exports = {
    generate,
    colorChange,
    getFiletypesBySize,
    setFilenameOnHover,
    saveImage
}
