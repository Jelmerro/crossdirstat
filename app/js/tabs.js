/** @typedef {"start"|"directories"|"visual"|"progress"} Tabname */
/** @type {(Tabname)[]} */
const tabs = ["start", "directories", "visual", "progress"]

/**
 * Switch to a tab by name.
 * @param {Tabname} newTab
 * @param {boolean} force
 */
export const switchToTab = (newTab, force = false) => {
    const tabDoesNotExist = tabs.indexOf(newTab) === -1
    const currentTab = tabs.find(tab => document.getElementById(
        tab)?.style.display !== "none")
    const inProgress = currentTab === "progress"
    if (tabDoesNotExist || inProgress && !force) {
        return
    }
    for (const tab of tabs) {
        const tabEl = document.getElementById(tab)
        if (tabEl) {
            tabEl.style.display = "none"
        }
        const menuEl = document.getElementById(`menu-${tab}`)
        if (menuEl) {
            menuEl.className = "menu-item"
            if (newTab === "progress") {
                menuEl.style.display = "none"
            } else {
                menuEl.style.display = ""
            }
        }
    }
    const newTabEl = document.getElementById(newTab)
    if (newTabEl) {
        newTabEl.style.display = ""
    }
    const newMenuEl = document.getElementById(`menu-${newTab}`)
    if (newMenuEl) {
        newMenuEl.className = "menu-item selected"
    }
}
