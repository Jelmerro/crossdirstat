"use strict"

const colors = [
    "#f44336",
    "#ba68c8",
    "#3f51b5",
    "#2196f3",
    "#80d8ff",
    "#009688",
    "#4caf50",
    "#8bc34a",
    "#cddc39",
    "#ffeb3b",
    "#ff9800"
]

const defaultColor = "#777777"

const disks = []

const getSelectedColors = () => ({"filetypes": colors, "default": defaultColor})

const getUnixVolumes = () => {
    if (disks.length !== 0) {
        return disks
    }
    try {
        const {execSync} = require("child_process")
        const output = execSync("df -lkP 2>/dev/null | grep ^/").toString()
        const lines = output.split("\n")
        for (const line of lines) {
            const disk = line.split(" ").pop()
            if (disk.length > 0) {
                try {
                    const {accessSync, constants} = require("fs")
                    accessSync(disk, constants.R_OK)
                    disks.push(disk)
                } catch (e) {
                    // Disk could not be accessed
                }
            }
        }
        return disks
    } catch (e) {
        return []
    }
}

const getIgnoreList = () => {
    if (process.platform === "win32") {
        return []
    }
    const ignore = getUnixVolumes().slice()
    ignore.push("/proc")
    return ignore.filter(d => d !== "/")
}

const toggleVisualConfig = () => {
    const colorConfig = document.getElementById("colors-config")
    const button = document.getElementById("visual-toggle-button")
    if (colorConfig.style.display === "none") {
        colorConfig.style.display = ""
        button.textContent = "Hide colors"
    } else {
        colorConfig.style.display = "none"
        button.textContent = "Show colors"
    }
}

module.exports = {
    getSelectedColors, getIgnoreList, getUnixVolumes, toggleVisualConfig
}
