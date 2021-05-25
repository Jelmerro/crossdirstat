"use strict"

const builder = require("electron-builder")
const rimraf = require("rimraf").sync
const archiver = require("archiver")
const {readFileSync, statSync, createWriteStream} = require("fs")
const {version} = JSON.parse(readFileSync("package.json").toString())
const builds = {}

const isDir = loc => {
    try {
        return statSync(loc).isDirectory()
    } catch (e) {
        return false
    }
}

rimraf("dist/")
process.argv.slice(1).forEach(a => {
    if (a === "--linux") {
        builds.linux = []
    }
    if (a === "--win") {
        builds.win = []
    }
    if (a === "--mac") {
        builds.mac = []
    }
})
builder.build(builds).then(e => {
    rimraf("dist/Vieb-*-mac.zip")
    for (const os of ["mac", "mac-arm64"]) {
        if (isDir(`dist/${os}/crossdirstat.app/`)) {
            const zip = createWriteStream(
                `dist/crossdirstat-${version}-${os}.zip`)
            const archive = archiver("zip", {"zlib": {"level": 9}})
            archive.pipe(zip)
            archive.directory(`dist/${os}/crossdirstat.app/`,
                "crossdirstat.app")
            archive.file("README.md", {"name": "README.md"})
            archive.file("LICENSE", {"name": "LICENSE"})
            archive.finalize()
        }
    }
    console.info(e)
}).catch(e => {
    console.error(e)
})
