"use strict"

const tabs = ["start", "directories", "visual", "progress"]

function currentTab() {
    for (const tab of tabs) {
        if (document.getElementById(tab).style.display !== "none") {
            return tab
        }
    }
}

function switchToTab(newTab, force=false) {
    if ((tabs.indexOf(newTab) === -1 || currentTab() === "progress")
        && !force) {
        return
    }
    for (const tab of tabs) {
        document.getElementById(tab).style.display = "none"
        try {
            document.getElementById(`menu-${tab}`).className = "menu-item"
        } catch (e) {
            // When a tab has no menu item
        }
    }
    document.getElementById(newTab).style.display = ""
    try {
        document.getElementById(`menu-${newTab}`).className =
            "menu-item selected"
    } catch (e) {
        // When a tab has no menu item
    }
}

module.exports = {
    currentTab,
    switchToTab
}
