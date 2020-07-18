"use strict"

window.addEventListener("DOMContentLoaded", () => {
    window.MAIN = require("./js/main.js")
    window.TABS = require("./js/tabs.js")
    window.DIR = require("./js/treeviewer.js")
    window.VISUAL = require("./js/visual.js")
    window.SETTINGS = require("./js/settings.js")
    window.MAIN.init()
})
