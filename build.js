"use strict"

const builder = require("electron-builder")
const {rmSync, readdir, unlinkSync} = require("fs")
const ebuilder = {"config": {
    /**
     * Remove all locales except English US from the build.
     * @param {import("electron-builder").AfterPackContext} context
     */
    "afterPack": context => {
        const localeDir = `${context.appOutDir}/locales/`
        readdir(localeDir, (_err, files) => {
            files?.filter(f => !f.match(/en-US\.pak/))
                .forEach(f => unlinkSync(localeDir + f))
        })
    }
}}
process.argv.slice(1).forEach(a => {
    if (a === "--help") {
        console.info("Basic crossdirstat build script, these are its options:")
        console.info(" --all, --linux, --win, --mac")
        console.info("By default it will only build for the current platform.")
        process.exit(0)
    }
    if (a === "--linux" || a === "--all") {
        ebuilder.linux = []
    }
    if (a === "--win" || a === "--all") {
        ebuilder.win = []
    }
    if (a === "--mac" || a === "--all") {
        ebuilder.mac = []
    }
})
rmSync("dist/", {"force": true, "recursive": true})
builder.build(ebuilder).then(e => console.info(e)).catch(e => console.error(e))
