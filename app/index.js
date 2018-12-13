"use strict"
const electron = require("electron")
const {app, BrowserWindow} = electron
const path = require("path")
const url = require("url")
let mainWindow

app.on("ready", () => {
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
    mainWindow = new BrowserWindow({
        width: Math.floor(width / 1.5),
        height: Math.floor(height / 1.33),
        icon: path.join(__dirname, "img/crossdirstat.png"),
        frame: false
    })
    mainWindow.setMinimumSize(750, 750)
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file:"
    }))
})
