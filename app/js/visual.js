/* global MAIN SETTINGS DIR */

import {ipcRenderer} from "electron"

let filetypes = {}
let callbacks = 0
let squares = []

const changeHex = (hex, change) => {
    const calculated = parseInt(hex, 16) + change
    const newHex = Math.min(255, Math.max(0, calculated))
    return newHex.toString(16).padStart(2, "0")
}

const changeColor = (color, change) => {
    const red = changeHex(color.substring(1, 3), change)
    const green = changeHex(color.substring(3, 5), change)
    const blue = changeHex(color.substring(5, 7), change)
    return `#${red}${green}${blue}`
}

const doneStroking = () => {
    callbacks += 1
    MAIN.updateCurrentStep("canvas", callbacks, squares.length)
    if (callbacks === squares.length) {
        MAIN.updateCurrentStep("errors")
        setTimeout(MAIN.handleErrors, 30)
    }
}

const getFiletypesBySize = () => Object.keys(filetypes).sort(
    (one, two) => filetypes[two].size - filetypes[one].size)

const colorChange = event => {
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

const setFilenameOnHover = e => {
    const canvas = document.getElementById("square-view")
    const r = canvas.getBoundingClientRect()
    const x = (e.clientX - r.left) / (r.right - r.left) * canvas.width
    const y = (e.clientY - r.top) / (r.bottom - r.top) * canvas.height
    for (const s of squares) {
        if (x > s.x0 && y > s.y0 && x < s.x1 && y < s.y1) {
            document.getElementById("file-name").textContent
                = `${s.location} (${DIR.prettySize(s.size)})`
            return
        }
    }
}

const filetype = f => {
    let type = (/^.+\.([^.]+)$/).exec(f.name)
    if (type) {
        [, type] = type
    } else {
        type = "none"
    }
    if (filetypes[type]) {
        filetypes[type].size += f.size
        filetypes[type].count += 1
    } else {
        filetypes[type] = {}
        filetypes[type].size = f.size
        filetypes[type].count = 1
    }
    return type
}

const processNode = node => {
    node.value = node.size
    if (!node.children) {
        node.type = filetype(node)
        return node
    }
    node.children.forEach((child, index) => {
        node.children[index] = processNode(child)
    })
    return node
}

const saveSVG = async() => {
    const filename = await ipcRenderer.invoke("show-save-dialog", {
        "filters": [{
            "extensions": ["svg"], "name": "Scalable Vector Graphics file"
        }],
        "title": "Select the save location"
    })
    if (!filename) {
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
        if (!color) {
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

const savePNG = async() => {
    const filename = await ipcRenderer.invoke("show-save-dialog", {
        "filters": [{
            "extensions": ["png"], "name": "Portable Network Graphics file"
        }],
        "title": "Select the save location"
    })
    if (!filename) {
        return
    }
    const canvas = document.getElementById("square-view")
    const imageData = canvas.toDataURL().replace(/^data:image\/png;base64,/, "")
    MAIN.writeToFile(filename, imageData, "base64")
}

const saveJSON = async() => {
    const filename = await ipcRenderer.invoke("show-save-dialog", {
        "filters": [{
            "extensions": ["json"], "name": "JavaScript Object Notation file"
        }],
        "title": "Select the save location"
    })
    if (!filename) {
        return
    }
    const json = {
        "colors": SETTINGS.getSelectedColors(),
        "filetypes": getFiletypesBySize(),
        squares
    }
    MAIN.writeToFile(filename, JSON.stringify(json, null, 4))
}

const saveImage = () => {
    const buttons = ["SVG", "PNG"]
    let message = "SVG: Vector with filenames as tooltip hover\n"
    message += "PNG: 10000x10000 lossless image render (multiple seconds)\n"
    if (!document.querySelector("#directories button").disabled) {
        message += "JSON: List of squares, colors and filetype statistics"
        buttons.push("JSON")
    }
    buttons.push("Cancel")
    ipcRenderer.invoke("show-message-box", {
        buttons, message, "title": "Export type", "type": "question"
    }).then(response => {
        if (response === 0) {
            saveSVG()
        } else if (response === 1) {
            savePNG()
        } else if (response === 2 && buttons.length === 4) {
            saveJSON()
        }
    })
}

const generateStatsAndColors = () => {
    const allColors = SETTINGS.getSelectedColors()
    const colorsElement = document.getElementById("colors-config")
    colorsElement.textContent = ""
    let index = 0
    for (const type of getFiletypesBySize()) {
        let color = allColors.filetypes[index]
        if (!color) {
            color = allColors.default
        }
        const colorDiv = document.createElement("div")
        const colorInput = document.createElement("input")
        colorInput.value = color
        colorInput.type = "color"
        colorInput.setAttribute("index", index)
        colorInput.addEventListener("change", colorChange)
        colorDiv.appendChild(colorInput)
        const typeEl = document.createElement("span")
        typeEl.textContent = type
        typeEl.className = "type"
        colorDiv.appendChild(typeEl)
        const countEl = document.createElement("span")
        countEl.className = "count"
        countEl.textContent = `${filetypes[type].count} files ${
            DIR.prettySize(filetypes[type].size)}`
        colorDiv.appendChild(countEl)
        colorsElement.appendChild(colorDiv)
        index += 1
    }
}

const parseSquares = () => {
    const allColors = SETTINGS.getSelectedColors()
    const typesBySize = getFiletypesBySize()
    const canvas = document.getElementById("square-view")
    const ctx = canvas.getContext("2d")
    for (const s of squares) {
        setTimeout(() => {
            if (s.value > 0) {
                let color = allColors.filetypes[typesBySize.indexOf(s.type)]
                if (!color) {
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
        }, 0)
    }
    document.querySelectorAll(`#visual button`).forEach(b => {
        b.removeAttribute("disabled")
    })
    generateStatsAndColors()
}

const generate = () => {
    filetypes = {}
    callbacks = 0
    document.getElementById("file-name").textContent = ""
    const allFiles = MAIN.getAllFiles()
    if (allFiles.size === 0) {
        MAIN.updateCurrentStep("errors")
        setTimeout(MAIN.handleErrors, 30)
        squares = []
        const canvas = document.getElementById("square-view")
        const context = canvas.getContext("2d")
        context.clearRect(0, 0, canvas.width, canvas.height)
        generateStatsAndColors()
        return
    }
    const processedFiles = processNode(allFiles)
    MAIN.updateCurrentStep("squarify", 0, processedFiles.subfiles)
    import("squarify").then(s => {
        const squarify = s?.default?.default || s?.default || s
        setTimeout(() => {
            squares = squarify(processedFiles.children, {
                "x0": 0, "x1": 10000, "y0": 0, "y1": 10000
            })
            setTimeout(parseSquares, 30)
        }, 30)
    })
}

export default {generate, saveImage, setFilenameOnHover}
