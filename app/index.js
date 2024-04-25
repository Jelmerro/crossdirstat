"use strict"

const {app, BrowserWindow, dialog, ipcMain, screen} = require("electron")
const {join} = require("path")
let mainWindow = null
const tempDir = join(app.getPath("temp"), "Crossdirstat")
app.setPath("appData", tempDir)
app.setPath("userData", tempDir)
app.setPath("sessionData", tempDir)
app.on("ready", () => {
    const {width, height} = screen.getPrimaryDisplay().workAreaSize
    mainWindow = new BrowserWindow({
        "frame": false,
        "height": Math.floor(height / 1.33),
        "icon": join(__dirname, "icons/1024x1024.png"),
        "title": "crossdirstat",
        "webPreferences": {
            "preload": join(__dirname, "apploader.js"), "sandbox": false
        },
        "width": Math.floor(width / 1.5)
    })
    mainWindow.setMinimumSize(750, 750)
    mainWindow.loadURL(`file://${join(__dirname, "index.html")}`)
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
ipcMain.handle("toggle-devtools", () => mainWindow.webContents.toggleDevTools())
