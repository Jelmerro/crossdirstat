"use strict"
const {
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    screen
} = require("electron")
const path = require("path")
const url = require("url")
let mainWindow = null

app.on("ready", () => {
    const {width, height} = screen.getPrimaryDisplay().workAreaSize
    mainWindow = new BrowserWindow({
        "title": "crossdirstat",
        "width": Math.floor(width / 1.5),
        "height": Math.floor(height / 1.33),
        "icon": path.join(__dirname, "icons/1024x1024.png"),
        "frame": false,
        "webPreferences": {
            "preload": path.join(__dirname, "apploader.js"),
            "sandbox": false,
            "contextIsolation": false,
            "disableBlinkFeatures": "Auxclick",
            "nodeIntegration": false,
            "enableRemoteModule": false
        }
    })
    mainWindow.setMinimumSize(750, 750)
    mainWindow.loadURL(url.format({
        "pathname": path.join(__dirname, "index.html"), "protocol": "file:"
    }))
    mainWindow.webContents.once("did-finish-load", () => {
        const version = process.env.npm_package_version || app.getVersion()
        mainWindow.webContents.executeJavaScript(
            `document.getElementById("version").textContent = "${version}"`)
    })
})

// Main tasks called from the renderer
ipcMain.handle("quit-app", () => mainWindow.close())
ipcMain.handle("show-open-dialog", (_, options) => dialog
    .showOpenDialogSync(mainWindow, options))
ipcMain.handle("show-save-dialog", (_, options) => dialog
    .showSaveDialogSync(mainWindow, options))
ipcMain.handle("show-message-box", (_, options) => dialog
    .showMessageBoxSync(mainWindow, options))
