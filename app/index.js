"use strict"
const electron = require("electron")
const {app, BrowserWindow} = electron
const path = require("path")
const url = require("url")
let mainWindow = null

app.on("ready", () => {
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
    mainWindow = new BrowserWindow({
        "width": Math.floor(width / 1.5),
        "height": Math.floor(height / 1.33),
        "icon": path.join(__dirname, "icons/1024x1024.png"),
        "frame": false,
        "webPreferences": {
            "plugins": true,
            "nodeIntegration": true
        }
    })
    mainWindow.setMinimumSize(750, 750)
    mainWindow.webContents.openDevTools()
    mainWindow.loadURL(url.format({
        "pathname": path.join(__dirname, "index.html"),
        "protocol": "file:"
    }))
})
