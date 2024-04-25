"use strict"
/* global TABS DIR VISUAL SETTINGS */

const {ipcRenderer, shell} = require("electron")

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
    window.addEventListener("keydown", e => {
        if (e.key === "F12") {
            ipcRenderer.invoke("toggle-devtools")
        } else if (e.key === "Enter") {
            if (e.target === document.getElementById("folder-path")) {
                const {access} = require("fs")
                access(e.target.value, err => {
                    if (!err) {
                        go(e.target.value)
                    }
                })
            } else if (e.target.tagName.toLowerCase() !== "button") {
                e.target.click()
            }
        }
    })
}

const pickFolder = async() => {
    const folders = await ipcRenderer.invoke("show-open-dialog", {
        "properties": ["openDirectory"], "title": "Select a folder"
    })
    if (!folders || !folders.length) {
        return
    }
    [document.getElementById("folder-path").value] = folders
    updateStartButton()
}

const go = loc => {
    folderCounter = 0
    fileCounter = 0
    const {access} = require("fs")
    access(loc, err => {
        if (!err) {
            resetProgressBars()
            TABS.switchToTab("progress")
            updateCurrentStep("scan")
            DIR.emptyReadErrors()
            let ignoreList = []
            if (loc === "/") {
                ignoreList = SETTINGS.getIgnoreList()
            }
            DIR.processLocation(loc, ignoreList, files => {
                allFiles = files
                updateCurrentStep("tree")
                setTimeout(() => {
                    DIR.fillTree(allFiles)
                    updateCurrentStep("visual")
                    setTimeout(VISUAL.generate, 30)
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
    document.getElementById("read-errors").textContent = ""
    if (readErrors.length === 1) {
        document.getElementById("read-errors").appendChild(
            document.createTextNode("There was a single read error:"))
        document.getElementById("read-errors").appendChild(
            document.createElement("br"))
        document.getElementById("read-errors").appendChild(
            document.createElement("br"))
    } else {
        document.getElementById("read-errors").appendChild(
            document.createTextNode(`There were a total of ${
                readErrors.length} read errors:`))
        document.getElementById("read-errors").appendChild(
            document.createElement("br"))
        document.getElementById("read-errors").appendChild(
            document.createElement("br"))
    }
    readErrors.forEach(error => {
        document.getElementById("read-errors").appendChild(
            document.createTextNode(error))
        document.getElementById("read-errors").appendChild(
            document.createElement("br"))
    })
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
    }
}

const updateCurrentStep = (step, current, total) => {
    const text = document.getElementById("progress-text")
    const scan = document.getElementById("progress-scan")
    const tree = document.getElementById("progress-tree")
    const squarify = document.getElementById("progress-squarify")
    const canvas = document.getElementById("progress-canvas")
    if (step === "scan") {
        scan.classList.add("amber")
        text.textContent = "Scanning disk for files"
    } else if (step === "tree") {
        scan.classList.remove("amber")
        scan.classList.add("green")
        tree.classList.add("amber")
        text.textContent = "Chopping files into directories"
    } else if (step === "squarify") {
        tree.classList.remove("amber")
        tree.classList.add("green")
        squarify.classList.add("amber")
        text.textContent = "Fitting files into squares"
        canvas.style.width = "0%"
    } else if (step === "canvas") {
        const perc = Math.floor(current / total * 100)
        canvas.style.width = `${perc}%`
        squarify.classList.remove("amber")
        squarify.classList.add("green")
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
    const loc = document.getElementById("folder-path").value
    const {access} = require("fs")
    access(loc, err => {
        if (err) {
            document.getElementById("start-button").disabled = "disabled"
        } else {
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
            const {execSync} = require("child_process")
            const output = execSync(`${wmic} logicaldisk get name`).toString()
            disks = []
            const lines = output.split("\n")
            for (const d of lines.filter(l => (/[A-z]:/).test(l))) {
                const disk = `${d.trim()}\\`
                try {
                    const {accessSync, constants} = require("fs")
                    accessSync(disk, constants.R_OK)
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
        button.textContent = disk
        button.className = "btn"
        button.addEventListener("click", () => go(disk))
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
        "add": disk => {
            allFiles.children.push(disk)
            allFiles.size += disk.size
            allFiles.subfiles += disk.subfiles
            allFiles.subfolders += disk.subfolders + 1
        },
        "children": [],
        "location": "All disks",
        "name": "All disks",
        "size": 0,
        "subfiles": 0,
        "subfolders": 0
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
                    DIR.fillTree(allFiles)
                    updateCurrentStep("visual")
                    setTimeout(VISUAL.generate, 30)
                }, 30)
            } else {
                processDisk(allDisks[allFiles.children.length])
            }
        })
    }, 0)
}

const saveTree = async() => {
    const filename = await ipcRenderer.invoke("show-save-dialog", {
        "filters": [{
            "extensions": ["json"], "name": "JavaScript Object Notation file"
        }],
        "title": "Select the save location"
    })
    if (!filename) {
        return
    }
    const json = {"errors": DIR.getReadErrors(), "files": allFiles}
    writeToFile(filename, JSON.stringify(json, null, 4))
}

const writeToFile = (loc, contents, encoding = "utf8") => {
    const {writeFile} = require("fs")
    writeFile(loc, contents, encoding, err => {
        if (err) {
            ipcRenderer.invoke("show-message-box", {
                "buttons": ["Ok"],
                "detail": err.toString(),
                "message": "Could not save file",
                "title": "Error",
                "type": "error"
            })
        } else {
            ipcRenderer.invoke("show-message-box", {
                "buttons": ["Ok"],
                "message": "File saved successfully",
                "title": "Success",
                "type": "info"
            })
        }
    })
}

module.exports = {
    getAllFiles,
    handleErrors,
    init,
    saveTree,
    updateCounter,
    updateCurrentStep,
    writeToFile
}
