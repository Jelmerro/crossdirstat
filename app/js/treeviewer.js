import {access, lstat, readdir} from "node:fs"
import {basename, dirname, join, resolve} from "node:path"
import {saveTree, updateCounter} from "./main.js"

/**
 * Check if a specific location is a directory.
 * @param {FileOrDirType} fileOrDir
 * @returns {fileOrDir is DirType}
 */
// eslint-disable-next-line no-use-before-define
const isDir = fileOrDir => fileOrDir instanceof Dir

/** @type {string[]} */
let readErrors = []

/** File object that stores all relevant file info. */
export const File = class {
    /**
     * Construct a new file based on location and size.
     * @param {string} loc
     * @param {number} size
     */
    constructor(loc, size) {
        updateCounter("File")
        this.location = loc
        this.size = size
        this.name = basename(this.location)
        this.dir = dirname(this.location)
    }
}
/** @typedef {import("./treeviewer.js").File} FileType */

/** Dir object that stores all relevant directory info. */
export const Dir = class {
    /**
     * Construct a new directory for a location.
     * @param {string} loc
     */
    constructor(loc) {
        updateCounter("Dir")
        this.location = loc
        this.size = 0
        this.name = basename(this.location) || this.location
        this.dir = dirname(this.location)
        /** @type {FileOrDirType[]} */
        this.children = []
        this.subfiles = 0
        this.subfolders = 0
    }

    /**
     * Add a subdirectory or a file inside the directory to this directory.
     * @param {FileOrDirType} fileOrDir
     */
    add(fileOrDir) {
        this.children.push(fileOrDir)
        this.size += fileOrDir.size
        if (isDir(fileOrDir)) {
            this.subfiles += fileOrDir.subfiles
            this.subfolders += fileOrDir.subfolders + 1
        } else {
            this.subfiles += 1
        }
    }
}
/** @typedef {import("./treeviewer.js").Dir} DirType */
/** @typedef {DirType|FileType} FileOrDirType */

/**
 * Process an entire location and show loading state.
 * @param {string} rawLoc
 * @param {string[]} ignoreList
 * @param {(file: FileOrDirType) => void} callback
 */
export const processLocation = (rawLoc, ignoreList, callback) => {
    const loc = resolve(rawLoc)
    for (const p of ignoreList) {
        if (loc.startsWith(p)) {
            callback(new File(loc, 0))
            return
        }
    }
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

/**
 * Convert a percentage to a color from red to green without brown as center.
 * @param {number} perc
 */
const progressColor = perc => {
    const bright = (50 - Math.floor(Math.abs(perc - 50))) * 2
    const red = Math.min(
        255, Math.max(17, Math.floor(255 - perc * 2.4)) + bright)
    const green = Math.min(255, Math.max(17, Math.floor(perc * 2.4)) + bright)
    return `#${red.toString(16)}${green.toString(16)}00`
}

/**
 * Generate a progressbar element based on current and maximum values.
 * @param {number} current
 * @param {number} max
 */
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

/** Clear all existing read errors. */
export const emptyReadErrors = () => {
    readErrors = []
}

/** Get a list of all read errors. */
export const getReadErrors = () => readErrors

/**
 * Format any number of bytes to a value with a nice unit.
 * @param {number} size
 */
export const prettySize = size => {
    const exp = Math.min(Math.floor(Math.log(size) / Math.log(1024)), 10)
    const unit = (size / 1024 ** exp || 0).toFixed(2).replace(/\.?0+$/g, "")
    return `${unit} ${" KMGTPEZYRQ"[exp]?.trim() ?? ""}B`
}

/**
 * Add a file to the DOM tree.
 * @param {FileType} f
 * @param {number} dirSize
 */
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

/**
 * Compare the size of two files or directories.
 * @param {FileOrDirType} a
 * @param {FileOrDirType} b
 */
const compareSizes = (a, b) => {
    if (a.size < b.size) {
        return -1
    }
    return 1
}

/**
 * Add a dir to the DOM tree.
 * @param {DirType} f
 * @param {number} dirSize
 */
const dirInTree = (f, dirSize) => {
    const el = document.createElement("li")
    el.className = "dir"
    // HEAD
    const head = document.createElement("div")
    const dropdown = document.createElement("div")
    head.addEventListener("click", () => {
        if (dropdown.style.display === "none") {
            dropdown.style.display = "inline"
        } else {
            dropdown.style.display = "none"
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
    const size = document.createElement("span")
    size.className = "truncate"
    size.style.width = "20%"
    size.textContent = prettySize(f.size)
    head.appendChild(size)
    // BODY
    dropdown.style.display = "none"
    dropdown.className = "collapsible-body"
    if (f.children.length > 0) {
        const ul = document.createElement("ul")
        for (const sub of f.children.sort(compareSizes).reverse()) {
            if (isDir(sub)) {
                ul.appendChild(dirInTree(sub, f.size))
            } else {
                ul.appendChild(fileInTree(sub, f.size))
            }
        }
        dropdown.appendChild(ul)
    } else {
        dropdown.textContent = "This directory is completely empty"
    }
    el.appendChild(dropdown)
    return el
}

/**
 * Fill the DOM tree with all files found recursively.
 * @param {DirType} baseDir
 */
export const fillTree = baseDir => {
    const tree = document.getElementById("directories")
    if (!tree) {
        return
    }
    tree.innerHTML = ""
    const head = document.createElement("div")
    head.style.display = "flex"
    const title = document.createElement("span")
    title.className = "truncate"
    title.id = "directory-title"
    title.textContent = `${baseDir.name} - ${prettySize(baseDir.size)}
    containing ${baseDir.subfiles} files and ${baseDir.subfolders} folders`
    head.appendChild(title)
    if (baseDir.children.length === 0) {
        tree.appendChild(document.createTextNode(
            "This directory is completely empty"))
        return
    }
    const exportBtn = document.createElement("button")
    exportBtn.className = "btn"
    exportBtn.textContent = "Save tree"
    exportBtn.addEventListener("click", () => saveTree())
    head.appendChild(exportBtn)
    tree.appendChild(head)
    const rootLocation = document.createElement("span")
    rootLocation.className = "truncate"
    rootLocation.textContent = baseDir.location
    tree.appendChild(rootLocation)
    const ul = document.createElement("ul")
    for (const f of baseDir.children.sort(compareSizes).reverse()) {
        if (isDir(f)) {
            ul.appendChild(dirInTree(f, baseDir.size))
        } else {
            ul.appendChild(fileInTree(f, baseDir.size))
        }
    }
    tree.appendChild(ul)
}
