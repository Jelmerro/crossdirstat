import {build} from "electron-builder"
import {execSync} from "node:child_process"
import {readdir, rmSync, unlinkSync} from "node:fs"

const ebuilder = {"config": {
    /**
     * Remove all locales except English US from the build.
     * @param {import("electron-builder").AfterPackContext} context
     */
    "afterPack": context => {
        const localeDir = `${context.appOutDir}/locales/`
        readdir(localeDir, (_err, files) => {
            files?.filter(f => !f.match(/en-US\.pak/))
                .forEach(f => unlinkSync(localeDir + f))
        })
    },
    "appId": "com.github.Jelmerro.crossdirstat",
    "copyright": "Copyright @ Jelmer van Arnhem | "
        + "Licensed as free software (GPL-3.0 or later)",
    "deb": {
        "afterInstall": "./after-install.sh",
        "fpm": ["--after-upgrade=./after-install.sh"]
    },
    "linux": {
        "category": "Office;Utility;",
        "executableArgs": ["--ozone-platform-hint=auto"],
        "executableName": "crossdirstat",
        "icon": "app/icons",
        "maintainer": "Jelmer van Arnhem",
        "publish": null,
        "target": [
            {"arch": ["arm64", "x64"], "target": "AppImage"},
            {"arch": ["arm64", "x64"], "target": "deb"},
            {"arch": ["arm64", "x64"], "target": "pacman"},
            {"arch": ["arm64", "x64"], "target": "rpm"},
            {"arch": ["x64"], "target": "snap"},
            {"arch": ["arm64", "x64"], "target": "tar.gz"}
        ]
    },
    "mac": {
        "category": "public.app-category.utilities",
        "icon": "app/icons",
        "publish": null,
        "target": [
            {"arch": ["arm64", "x64"], "target": "zip"}
        ]
    },
    "nsis": {
        "differentialPackage": false,
        "license": "LICENSE",
        "oneClick": false
    },
    "productName": "Crossdirstat",
    "rpm": {
        "afterInstall": "./after-install.sh",
        "fpm": [
            "--rpm-rpmbuild-define=_build_id_links none",
            "--after-upgrade=./after-install.sh"
        ]
    },
    "win": {
        "icon": "app/icons/512x512.png",
        "legalTrademarks": "Copyright @ Jelmer van Arnhem | "
            + "Licensed as free software (GPL-3.0 or later)",
        "publish": null,
        "target": [
            {"arch": ["x64"], "target": "nsis"},
            {"arch": ["x64"], "target": "portable"},
            {"arch": ["arm64", "x64"], "target": "zip"}
        ]
    }
}}
process.argv.slice(2).forEach(a => {
    if (a === "--help") {
        console.info("Basic crossdirstat build script, these are its options:")
        console.info(" --all, --linux, --win, --mac")
        console.info("By default it will only build for the current platform.")
        process.exit(0)
    }
    if (a === "--linux" || a === "--all") {
        ebuilder.linux = []
    }
    if (a === "--win" || a === "--all") {
        ebuilder.win = []
    }
    if (a === "--mac" || a === "--all") {
        ebuilder.mac = []
    }
})
rmSync("dist/", {"force": true, "recursive": true})

/** Apply new buildroot argument to electron-builder's internal outdated fpm. */
const fixBuildrootRpmArgumentInFpm = async() => {
    try {
        console.info(">> PATCH buildroot arg missing in electron-builder's fpm")
        execSync(
            `sed -i -e 's/args = \\["rpmbuild", "-bb"\\]/args = \\["rpmbuild", `
            + `"-bb", "--buildroot", "#{build_path}\\/BUILD"\\]/g' ~/.cache/ele`
            + `ctron-builder/fpm/fpm*/lib/app/lib/fpm/package/rpm.rb`)
        console.info(">> PATCH done")
        return
    } catch {
        console.warn(">> PATCH failed, running dummy build to fetch fpm")
    }
    try {
        // Running dummy build that will fail due to incorrect outdated args.
        await build({
            "config": {
                ...ebuilder.config,
                "files": ebuilder.files,
                "linux": {
                    ...ebuilder.config.linux,
                    "target": {"arch": ["x64"], "target": "rpm"}
                }
            },
            "linux": []
        })
    } catch {
        // Applying fix again when dummy build fails.
        execSync(
            `sed -i -e 's/args = \\["rpmbuild", "-bb"\\]/args = \\["rpmbuild", `
            + `"-bb", "--buildroot", "#{build_path}\\/BUILD"\\]/g' ~/.cache/ele`
            + `ctron-builder/fpm/fpm*/lib/app/lib/fpm/package/rpm.rb`)
        console.info(">> PATCH done")
    } finally {
        rmSync("dist/", {"force": true, "recursive": true})
    }
}

const rpmConf = ebuilder.config.linux?.target?.find(t => t.target === "rpm")
if (rpmConf) {
    await fixBuildrootRpmArgumentInFpm(ebuilder)
}
build(ebuilder).then(e => console.info(e)).catch(e => console.error(e))
