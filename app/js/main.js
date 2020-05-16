"use strict"
/* global TABS DIR VISUAL SETTINGS */

const {ipcRenderer, shell} = require("electron")
const exec = require("child_process").execSync
const fs = require("fs")

let allFiles = null
let allDisks = []
let folderCounter = 0
let fileCounter = 0

const init = () => {
    populateDisks()
    document.getElementById("link-me").addEventListener("click", () => {
        shell.openExternal("https://github.com/Jelmerro")
    })
    document.getElementById("link-repo").addEventListener("click", () => {
        shell.openExternal("https://github.com/Jelmerro/crossdirstat")
    })
    document.getElementById("link-releases").addEventListener("click", () => {
        shell.openExternal("https://github.com/Jelmerro/crossdirstat/releases")
    })
    document.getElementById("menu-start").addEventListener(
        "click", () => TABS.switchToTab("start"))
    document.getElementById("menu-directories").addEventListener(
        "click", () => TABS.switchToTab("directories"))
    document.getElementById("menu-visual").addEventListener(
        "click", () => TABS.switchToTab("visual"))
    document.querySelector(".close-button").addEventListener(
        "click", () => ipcRenderer.invoke("quit-app"))
    document.getElementById("save-image").addEventListener(
        "click", () => VISUAL.saveImage())
    document.getElementById("visual-toggle-button").addEventListener(
        "click", () => SETTINGS.toggleVisualConfig())
    document.getElementById("square-view").addEventListener(
        "mousemove", VISUAL.setFilenameOnHover)
}

const pickFolder = async () => {
    const folders = await ipcRenderer.invoke("show-open-dialog", {
        "title": "Select a folder", "properties": ["openDirectory"]
    })
    if (!folders || !folders.length) {
        return
    }
    document.getElementById("folder-path").value = folders[0]
    updateStartButton()
}

const go = location => {
    folderCounter = 0
    fileCounter = 0
    fs.access(location, err => {
        if (!err) {
            resetProgressBars()
            TABS.switchToTab("progress")
            updateCurrentStep("scan")
            DIR.emptyReadErrors()
            const enableIgnoreList = location === "/"
            let ignoreList = []
            if (enableIgnoreList) {
                ignoreList = SETTINGS.getIgnoreList()
            }
            DIR.processLocation(location, ignoreList, files => {
                allFiles = files
                updateCurrentStep("tree")
                setTimeout(() => {
                    DIR.fillTree(allFiles, "directories")
                    updateCurrentStep("visual")
                    setTimeout(() => {
                        VISUAL.generate()
                    }, 30)
                }, 30)
            })
        }
    })
}

const handleErrors = () => {
    const readErrors = DIR.getReadErrors()
    if (readErrors.length === 0) {
        document.getElementById("read-errors").textContent
            = "There were no read errors"
        document.getElementById("read-errors").style.color = "#5c0"
        TABS.switchToTab("start", true)
        return
    }
    let readErrorsText = ""
    if (readErrors.length === 1) {
        readErrorsText = "There was a single read error:<br /><br />"
    } else {
        readErrorsText = "There were a total of "
        readErrorsText += readErrors.length
        readErrorsText += " read errors:<br /><br />"
    }
    for (const error of readErrors) {
        readErrorsText += `${error}<br />`
    }
    document.getElementById("read-errors").innerHTML = readErrorsText
    document.getElementById("read-errors").style.color = "#f50"
    TABS.switchToTab("start", true)
}

const resetProgressBars = () => {
    const text = document.getElementById("progress-text")
    const scan = document.getElementById("progress-scan")
    const tree = document.getElementById("progress-tree")
    const squarify = document.getElementById("progress-squarify")
    const canvas = document.getElementById("progress-canvas")
    text.textContent = ""
    for (const bar of [scan, tree, squarify, canvas]) {
        bar.classList.remove("green")
        bar.classList.remove("amber")
        bar.style.width = "100%"
        bar.classList.add("grey")
    }
}

const updateCurrentStep = (step, current, total) => {
    const text = document.getElementById("progress-text")
    const scan = document.getElementById("progress-scan")
    const tree = document.getElementById("progress-tree")
    const squarify = document.getElementById("progress-squarify")
    const canvas = document.getElementById("progress-canvas")
    if (step === "scan") {
        scan.classList.remove("grey")
        scan.classList.add("amber")
        text.textContent = "Scanning disk for files"
    } else if (step === "tree") {
        scan.classList.remove("amber")
        scan.classList.add("green")
        tree.classList.remove("grey")
        tree.classList.add("amber")
        text.textContent = "Chopping files into directories"
    } else if (step === "squarify") {
        tree.classList.remove("amber")
        tree.classList.add("green")
        squarify.classList.remove("grey")
        squarify.classList.add("amber")
        text.textContent = "Fitting files into squares"
        canvas.style.width = "0%"
    } else if (step === "canvas") {
        const perc = Math.floor(current / total * 100)
        canvas.style.width = `${perc}%`
        squarify.classList.remove("amber")
        squarify.classList.add("green")
        canvas.classList.remove("grey")
        canvas.classList.add("amber")
        text.textContent = `Adding squares to canvas: ${current}/${total}`
    } else if (step === "errors") {
        canvas.style.width = "100%"
        canvas.classList.remove("amber")
        canvas.classList.add("green")
        text.textContent = "Finishing up"
    }
}

const updateCounter = type => {
    const text = document.getElementById("progress-text")
    if (type === "Dir") {
        folderCounter += 1
    } else if (type === "File") {
        fileCounter += 1
    }
    text.textContent
        = `Scanned ${fileCounter} files and ${folderCounter} folders so far`
}

const updateStartButton = () => {
    const location = document.getElementById("folder-path").value
    fs.access(location, err => {
        if (err) {
            document.getElementById("start-button").title
                = "The selected location is unavailable"
            document.getElementById("start-button").disabled = "disabled"
        } else {
            document.getElementById("start-button").title = ""
            document.getElementById("start-button").removeAttribute("disabled")
        }
    })
}

const getAllFiles = () => allFiles

const populateDisks = () => {
    let disks = ["/"]
    // Platform specific disks
    if (process.platform === "win32") {
        try {
            const wmic = "%SystemRoot%\\System32\\Wbem\\wmic.exe"
            const output = exec(`${wmic} logicaldisk get name`).toString()
            disks = []
            for (const d of output.split("\n").filter(l => /[A-z]:/.test(l))) {
                const disk = `${d.trim()}\\`
                try {
                    fs.accessSync(disk, fs.constants.R_OK)
                    disks.push(disk)
                } catch (e) {
                    // Disk could not be accessed
                }
            }
        } catch (e) {
            disks = ["C:\\"]
        }
    } else {
        disks = SETTINGS.getUnixVolumes()
    }
    // Add disks as an option to the start tab
    const diskElement = document.getElementById("pre-configured-folders")
    for (const disk of disks) {
        const button = document.createElement("button")
        button.innerHTML = disk
        button.className = "btn"
        button.addEventListener("click", () => {
            go(disk)
        })
        diskElement.appendChild(button)
    }
    // Add the all disk option
    const allButton = document.createElement("button")
    allButton.textContent = "All disks"
    allButton.className = "btn"
    allButton.addEventListener("click", goAllDisks)
    diskElement.appendChild(allButton)
    allDisks = disks
    // Add event listener to existing elements
    document.getElementById("folder-path")
        .addEventListener("input", updateStartButton)
    document.getElementById("start-button").addEventListener("click", () => {
        go(document.getElementById("folder-path").value)
    })
    document.getElementById("pick-button").addEventListener("click", pickFolder)
}

const goAllDisks = () => {
    folderCounter = 0
    fileCounter = 0
    resetProgressBars()
    TABS.switchToTab("progress")
    updateCurrentStep("scan")
    DIR.emptyReadErrors()
    allFiles = {
        "size": 0,
        "name": "All disks",
        "location": "All disks",
        "children": [],
        "subfiles": 0,
        "subfolders": 0,
        "add": disk => {
            allFiles.children.push(disk)
            allFiles.size += disk.size
            allFiles.subfiles += disk.subfiles
            allFiles.subfolders += disk.subfolders + 1
        }
    }
    processDisk(allDisks[0])
}

const processDisk = disk => {
    setTimeout(() => {
        const shouldEnableIgnoreList = disk === "/"
        let ignoreList = []
        if (shouldEnableIgnoreList) {
            ignoreList = SETTINGS.getIgnoreList()
        }
        DIR.processLocation(disk, ignoreList, files => {
            allFiles.add(files)
            if (allFiles.children.length === allDisks.length) {
                updateCurrentStep("tree")
                setTimeout(() => {
                    DIR.fillTree(allFiles, "directories")
                    updateCurrentStep("visual")
                    setTimeout(() => {
                        VISUAL.generate()
                    }, 30)
                }, 30)
            } else {
                processDisk(allDisks[allFiles.children.length])
            }
        })
    }, 0)
}

const saveTree = async () => {
    const filename = await ipcRenderer.invoke("show-save-dialog", {
        "title": "Select the save location",
        "filters": [{
            "name": "JavaScript Object Notation file", "extensions": ["json"]
        }]
    })
    if (!filename) {
        return
    }
    const json = {"files": allFiles, "errors": DIR.getReadErrors()}
    writeToFile(filename, JSON.stringify(json, null, 4))
}

const writeToFile = (location, contents, encoding = "utf8") => {
    fs.writeFile(location, contents, encoding, err => {
        if (err) {
            ipcRenderer.invoke("show-message-box", {
                "title": "Error",
                "type": "error",
                "buttons": ["Ok"],
                "message": "Could not save file",
                "detail": err.toString()
            })
        } else {
            ipcRenderer.invoke("show-message-box", {
                "title": "Success",
                "type": "info",
                "buttons": ["Ok"],
                "message": "File saved successfully"
            })
        }
    })
}

module.exports = {
    init,
    handleErrors,
    updateCurrentStep,
    updateCounter,
    updateStartButton,
    getAllFiles,
    saveTree,
    writeToFile
}
