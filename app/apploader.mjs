window.addEventListener("DOMContentLoaded", async() => {
    window.MAIN = (await import("./js/main.js")).default
    window.TABS = (await import("./js/tabs.js")).default
    window.DIR = (await import("./js/treeviewer.js")).default
    window.VISUAL = (await import("./js/visual.js")).default
    window.SETTINGS = (await import("./js/settings.js")).default
    window.MAIN.init()
})
