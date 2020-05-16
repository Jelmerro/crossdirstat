"use strict"
/* globals MAIN M */

const fs = require("fs")
const path = require("path")

let readErrors = []

const File = class {
    constructor(location, size) {
        MAIN.updateCounter("File", location)
        this.location = location
        this.size = size
        this.name = path.basename(this.location)
        this.dir = path.dirname(this.location)
    }
}

const Dir = class {
    constructor(location) {
        MAIN.updateCounter("Dir", location)
        this.location = location
        this.size = 0
        this.name = path.basename(this.location) || this.location
        this.dir = path.dirname(this.location)
        this.children = []
        this.subfiles = 0
        this.subfolders = 0
    }
    add(file) {
        this.children.push(file)
        this.size += file.size
        if (isDir(file)) {
            this.subfiles += file.subfiles
            this.subfolders += file.subfolders + 1
        } else {
            this.subfiles += 1
        }
    }
}

const isDir = file => file.children

const processLocation = (location, ignoreList, callback) => {
    for (const p of ignoreList) {
        if (location.startsWith(p)) {
            callback(new File(location, 0))
            return
        }
    }
    fs.access(location, e => {
        if (e) {
            readErrors.push(
                `${location} could not be found, but was listed in the folder`)
            callback(new File(location, 0))
            return
        }
        fs.lstat(location, (er, stats) => {
            if (er) {
                readErrors.push(
                    `${location} does not allow statistics reading: ${er}`)
                callback(new File(location, 0))
                return
            }
            if (stats.isDirectory()) {
                fs.readdir(location, (err, files) => {
                    if (err) {
                        readErrors.push(
                            `${location} does not allow folder listing: ${err}`)
                        callback(new Dir(location))
                        return
                    }
                    const dir = new Dir(location)
                    let callbacksReceived = 0
                    for (const f of files) {
                        const combinedPath = path.join(location, f)
                        processLocation(combinedPath, ignoreList, subpath => {
                            dir.add(subpath)
                            callbacksReceived += 1
                            if (callbacksReceived === files.length) {
                                callback(dir)
                            }
                        })
                    }
                    if (files.length === 0) {
                        callback(dir)
                    }
                })
            } else {
                callback(new File(location, stats.size))
            }
        })
    })
}

const prettySize = size => {
    if (size < 1024) {
        return `${size} B`
    }
    const exp = Math.floor(Math.log(size) / Math.log(1024))
    return `${(size / Math.pow(1024, exp)).toFixed(2)} ${"KMGTPE"[exp - 1]}B`
}

const fillTree = allFiles => {
    const tree = document.getElementById("directories")
    let treeContents = `<div style="display: flex;">
            <span class="truncate" id="directory-title">
            ${allFiles.name} - ${prettySize(allFiles.size)} containing
            ${allFiles.subfiles} files and ${allFiles.subfolders} folders</span>
            <button class="btn" onclick="MAIN.saveTree()">Export tree</button>
        </div><span class="truncate">${allFiles.location}</span>
        <ul class="collapsible">`
    let complete = true
    for (const f of allFiles.children.sort(compareSizes).reverse()) {
        if (treeContents.length > 20000000) {
            complete = false
            break
        }
        if (isDir(f)) {
            treeContents += dirInTree(f, allFiles.size)
        } else {
            treeContents += fileInTree(f, allFiles.size)
        }
    }
    if (allFiles.children.length === 0) {
        treeContents += "This directory is completely empty"
    }
    tree.innerHTML = `${treeContents}</ul>`
    if (!complete) {
        document.querySelector("#directories button").disabled = true
        tree.innerHTML += "<h6>Only a selection of directories are listed here,"
            + " because of the javascript string length limitation. "
            + "Use the visual tab to see all files.</h6>"
    }
    M.Collapsible.init(document.querySelectorAll(".collapsible"))
}

const compareSizes = (a, b) => {
    if (a.size < b.size) {
        return -1
    }
    return 1
}

const dirInTree = (f, dirSize) => {
    let contents = `<li><div class="collapsible-header"
        title="${f.size / dirSize * 100 || 0}%">${progressbar(f.size, dirSize)}
            <span class="truncate" style="width: 40%;">
                ${f.name}</span>
            <span class="truncate" style="width: 20%;">
                ${prettySize(f.size)}</span>
            <span class="truncate" style="width: 20%;">
                ${f.subfiles} files</span>
            <span class="truncate" style="width: 20%;">
                ${f.subfolders} folders</span>
        </div>`
    if (f.children.length > 0) {
        contents += `<div class="collapsible-body"><div class="row">`
        contents += `<div class="col s12 m12"><ul class="collapsible">`
        for (const sub of f.children.sort(compareSizes).reverse()) {
            if (contents.length > 20000000) {
                break
            }
            if (isDir(sub)) {
                contents += dirInTree(sub, f.size)
            } else {
                contents += fileInTree(sub, f.size)
            }
        }
        contents += "</ul></div></div></div></li>"
    } else {
        contents += `<div class="collapsible-body">
            This directory is completely empty</div></li>`
    }
    return contents
}

const fileInTree = (f, dirSize) => `<li><div class="collection-item"
        title="${f.size / dirSize * 100 || 0}%">${progressbar(f.size, dirSize)}
            <span class="truncate" style="width: 80%;">
                ${f.name}</span>
            <span class="truncate" style="width: 20%;">
                ${prettySize(f.size)}</span>
            </div>
        </li>`

const progressbar = (current, max) => `<div class="progress"
    style="height: 10px;"><div class="progres-bar"
        style="background-color: ${progressColor(current / max * 100)};
        height: 10px;width: ${current / max * 100 || 0}%;"
        role="progressbar">
    </div></div>`

const progressColor = perc => {
    const bright = (50 - Math.floor(Math.abs(perc - 50))) * 2
    const red = Math.min(
        255, Math.max(17, Math.floor(255 - perc * 2.4)) + bright)
    const green = Math.min(255, Math.max(17, Math.floor(perc * 2.4)) + bright)
    return `#${red.toString(16)}${green.toString(16)}00`
}

const emptyReadErrors = () => {
    readErrors = []
}

const getReadErrors = () => readErrors

module.exports = {
    processLocation,
    fillTree,
    prettySize,
    emptyReadErrors,
    getReadErrors
}
