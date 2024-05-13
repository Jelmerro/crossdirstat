"use strict"
/* globals MAIN */

const {basename, dirname, join, resolve} = require("path")

const isDir = file => file.children

let readErrors = []
const File = class {
    constructor(loc, size) {
        MAIN.updateCounter("File", loc)
        this.location = loc
        this.size = size
        this.name = basename(this.location)
        this.dir = dirname(this.location)
    }
}
const Dir = class {
    constructor(loc) {
        MAIN.updateCounter("Dir", loc)
        this.location = loc
        this.size = 0
        this.name = basename(this.location) || this.location
        this.dir = dirname(this.location)
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

const processLocation = (rawLoc, ignoreList, callback) => {
    const loc = resolve(rawLoc)
    for (const p of ignoreList) {
        if (loc.startsWith(p)) {
            callback(new File(loc, 0))
            return
        }
    }
    const {access, lstat, readdir} = require("fs")
    access(loc, e => {
        if (e) {
            readErrors.push(
                `${loc} could not be found, but was listed in the folder`)
            callback(new File(loc, 0))
            return
        }
        lstat(loc, (er, stats) => {
            if (er) {
                readErrors.push(
                    `${loc} does not allow statistics reading: ${er}`)
                callback(new File(loc, 0))
                return
            }
            if (stats.isDirectory()) {
                readdir(loc, (err, files) => {
                    if (err) {
                        readErrors.push(
                            `${loc} does not allow folder listing: ${err}`)
                        callback(new Dir(loc))
                        return
                    }
                    const dir = new Dir(loc)
                    let callbacksReceived = 0
                    for (const f of files) {
                        const combinedPath = join(loc, f)
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
                callback(new File(loc, stats.size))
            }
        })
    })
}

const progressColor = perc => {
    const bright = (50 - Math.floor(Math.abs(perc - 50))) * 2
    const red = Math.min(
        255, Math.max(17, Math.floor(255 - perc * 2.4)) + bright)
    const green = Math.min(255, Math.max(17, Math.floor(perc * 2.4)) + bright)
    return `#${red.toString(16)}${green.toString(16)}00`
}

const progressbar = (current, max) => {
    const progress = document.createElement("div")
    progress.className = "progress"
    const bar = document.createElement("bar")
    const perc = current / max * 100 || 0
    progress.title = `${perc}%`
    bar.style.width = `${perc}%`
    bar.style.backgroundColor = progressColor(perc)
    progress.appendChild(bar)
    return progress
}

const emptyReadErrors = () => {
    readErrors = []
}

const getReadErrors = () => readErrors

const prettySize = size => {
    if (size < 1024) {
        return `${size} B`
    }
    const exp = Math.floor(Math.log(size) / Math.log(1024))
    return `${(size / 1024 ** exp).toFixed(2)} ${"KMGTPE"[exp - 1]}B`
}

const fileInTree = (f, dirSize) => {
    const li = document.createElement("li")
    li.className = "file"
    li.appendChild(progressbar(f.size, dirSize))
    const name = document.createElement("span")
    name.className = "truncate"
    name.style.width = "80%"
    name.textContent = f.name
    li.appendChild(name)
    const size = document.createElement("span")
    size.className = "truncate"
    size.style.width = "20%"
    size.textContent = prettySize(f.size)
    li.appendChild(size)
    return li
}

const compareSizes = (a, b) => {
    if (a.size < b.size) {
        return -1
    }
    return 1
}

const dirInTree = (f, dirSize) => {
    const el = document.createElement("li")
    el.className = "dir"
    // HEAD
    const head = document.createElement("div")
    head.addEventListener("click", () => {
        if (head.nextSibling.style.display === "none") {
            head.nextSibling.style.display = "inline"
        } else {
            head.nextSibling.style.display = "none"
        }
    })
    head.className = "collapsible-header"
    el.appendChild(head)
    head.appendChild(progressbar(f.size, dirSize))
    const name = document.createElement("span")
    name.className = "truncate"
    name.style.width = "40%"
    name.textContent = f.name
    head.appendChild(name)
    const size = document.createElement("span")
    size.className = "truncate"
    size.style.width = "20%"
    size.textContent = prettySize(f.size)
    head.appendChild(size)
    const subfiles = document.createElement("span")
    subfiles.className = "truncate"
    subfiles.style.width = "20%"
    subfiles.textContent = `${f.subfiles} files`
    head.appendChild(subfiles)
    const subfolders = document.createElement("span")
    subfolders.className = "truncate"
    subfolders.style.width = "20%"
    subfolders.textContent = `${f.subfolders} folders`
    head.appendChild(subfolders)
    // BODY
    const body = document.createElement("div")
    body.style.display = "none"
    body.className = "collapsible-body"
    if (f.children.length > 0) {
        const ul = document.createElement("ul")
        for (const sub of f.children.sort(compareSizes).reverse()) {
            if (isDir(sub)) {
                ul.appendChild(dirInTree(sub, f.size))
            } else {
                ul.appendChild(fileInTree(sub, f.size))
            }
        }
        body.appendChild(ul)
    } else {
        body.textContent = "This directory is completely empty"
    }
    el.appendChild(body)
    return el
}

const fillTree = allFiles => {
    const tree = document.getElementById("directories")
    tree.innerHTML = ""
    const head = document.createElement("div")
    head.style.display = "flex"
    const title = document.createElement("span")
    title.className = "truncate"
    title.id = "directory-title"
    title.textContent = `${allFiles.name} - ${prettySize(allFiles.size)}
    containing ${allFiles.subfiles} files and ${allFiles.subfolders} folders`
    head.appendChild(title)
    if (allFiles.children.length === 0) {
        tree.appendChild(document.createTextNode(
            "This directory is completely empty"))
        return
    }
    const exportBtn = document.createElement("button")
    exportBtn.className = "btn"
    exportBtn.textContent = "Save tree"
    exportBtn.addEventListener("click", () => MAIN.saveTree())
    head.appendChild(exportBtn)
    tree.appendChild(head)
    const rootLocation = document.createElement("span")
    rootLocation.className = "truncate"
    rootLocation.textContent = allFiles.location
    tree.appendChild(rootLocation)
    const ul = document.createElement("ul")
    for (const f of allFiles.children.sort(compareSizes).reverse()) {
        if (isDir(f)) {
            ul.appendChild(dirInTree(f, allFiles.size))
        } else {
            ul.appendChild(fileInTree(f, allFiles.size))
        }
    }
    tree.appendChild(ul)
}

module.exports = {
    emptyReadErrors, fillTree, getReadErrors, prettySize, processLocation
}
