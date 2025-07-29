import {BrowserWindow, app, dialog, ipcMain, screen} from "electron"
import {join} from "path"

/** @type {Electron.BrowserWindow|null} */
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
        "icon": join(import.meta.dirname, "icons/1024x1024.png"),
        "title": "crossdirstat",
        "webPreferences": {
            "preload": join(import.meta.dirname, "apploader.mjs"),
            "sandbox": false
        },
        "width": Math.floor(width / 1.5)
    })
    mainWindow.setMinimumSize(750, 750)
    mainWindow.loadURL(`file://${join(import.meta.dirname, "index.html")}`)
    mainWindow.webContents.once("did-finish-load", () => {
        const version = process.env.npm_package_version || app.getVersion()
        mainWindow?.webContents.executeJavaScript(
            `document.getElementById("version").textContent = "${version}"`)
    })
})
// Main tasks called from the renderer
ipcMain.handle("quit-app", () => mainWindow?.close())
ipcMain.handle("show-open-dialog", (_, options) => {
    if (mainWindow) {
        dialog.showOpenDialogSync(mainWindow, options)
    }
})
ipcMain.handle("show-save-dialog", (_, options) => {
    if (mainWindow) {
        dialog.showSaveDialogSync(mainWindow, options)
    }
})
ipcMain.handle("show-message-box", (_, options) => {
    if (mainWindow) {
        dialog.showMessageBoxSync(mainWindow, options)
    }
})
ipcMain.handle("toggle-devtools",
    () => mainWindow?.webContents.toggleDevTools())
