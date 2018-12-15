"use strict"
/* globals MAIN path fs M */

let readErrors = []

function File(location, size) {
    MAIN.updateCounter("File", location)
    this.location = location
    this.size = size
    this.name = path.basename(this.location)
    this.dir = path.dirname(this.location)
}

function Dir(location) {
    MAIN.updateCounter("Dir", location)
    this.location = location
    this.size = 0
    this.name = path.basename(this.location) || this.location
    this.dir = path.dirname(this.location)
    this.children = []
    this.subfiles = 0
    this.subfolders = 0

    this.add = function add(file) {
        this.children.push(file)
        this.size += file.size
        if (!isDir(file)) {
            this.subfiles += 1
        } else {
            this.subfiles += file.subfiles
            this.subfolders += file.subfolders + 1
        }
    }
}

function isDir(file) {
    return file.children !== undefined
}

function processLocation(location, ignoreList, callback) {
    for (const path of ignoreList) {
        if (location.startsWith(path)) {
            callback(new File(location, 0))
            return
        }
    }
    fs.access(location, err => {
        if (err) {
            readErrors.push(
                `${location} could not be found, but was listed in the folder`)
            callback(new File(location, 0))
            return
        }
        fs.lstat(location, (err, stats) => {
            if (err) {
                readErrors.push(
                    `${location} does not allow statistics reading: ${err}`)
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

function prettySize(size) {
    if (size < 1024) {
        return size + " B"
    }
    const exp = Math.floor(Math.log(size) / Math.log(1024))
    return `${(size / Math.pow(1024, exp)).toFixed(2)} ${"KMGTPE"[exp - 1]}B`
}

function fillTree(allFiles, elementId) {
    const tree = document.getElementById(elementId)
    let treeContents = `<div style="display: flex;">
            <span class="truncate" id="directory-title">
            ${allFiles.name} - ${prettySize(allFiles.size)} containing
            ${allFiles.subfiles} files and ${allFiles.subfolders} folders</span>
            <button class="btn" onclick="MAIN.saveTree()">Export tree</button>
        </div><span class="truncate">${allFiles.location}</span>
        <ul class="collapsible">`
    for (const f of allFiles.children.sort(compareSizes).reverse()) {
        if (isDir(f)) {
            treeContents += dirInTree(f, elementId, allFiles.size)
        } else {
            treeContents += fileInTree(f, elementId, allFiles.size)
        }
    }
    if (allFiles.children.length === 0) {
        treeContents += "This directory is completely empty"
    }
    tree.innerHTML = treeContents + "</ul>"
    M.Collapsible.init(document.querySelectorAll(".collapsible"))
}

function compareSizes(a, b) {
    if (a.size < b.size) {
        return -1
    }
    return 1
}

function dirInTree(f, parent, dirSize) {
    let contents = `<li><div class="collapsible-header"
        title="${f.size / dirSize *100}%">${progressbar(f.size, dirSize)}
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
            if (isDir(sub)) {
                contents += dirInTree(sub, parent, f.size)
            } else {
                contents += fileInTree(sub, parent, f.size)
            }
        }
        contents += "</ul></div></div></div></li>"
    } else {
        contents += `<div class="collapsible-body">
            This directory is completely empty</div></li>`
    }
    return contents
}

function fileInTree(f, parent, dirSize) {
    return `<li><div class="collection-item"
        title="${f.size / dirSize * 100}%">${progressbar(f.size, dirSize)}
            <span class="truncate" style="width: 80%;">
                ${f.name}</span>
            <span class="truncate" style="width: 20%;">
                ${prettySize(f.size)}</span>
            </div>
        </li>`
}

function progressbar(current, max) {
    return `<div class="progress" style="height: 10px;">
        <div class="progres-bar" 
            style="background-color: ${progressColor(current / max * 100)};
            height: 10px;width: ${current / max * 100}%;" role="progressbar">
        </div></div>`
}

function progressColor(perc) {
    const bright = (50 - Math.floor(Math.abs(perc - 50))) * 2
    const red = Math.min(255, Math.max(17, Math.floor(255 - perc*2.4)) + bright)
    const green = Math.min(255, Math.max(17, Math.floor(perc*2.4)) + bright)
    return `#${red.toString(16)}${green.toString(16)}00`
}

function emptyReadErrors() {
    readErrors = []
}

function getReadErrors() {
    return readErrors
}

module.exports = {
    processLocation,
    fillTree,
    prettySize,
    emptyReadErrors,
    getReadErrors
}
