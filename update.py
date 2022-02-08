import json
import os
import shutil
import subprocess
import re

overrides = {}


def find_version(text, version):
    matches = re.findall(rf"{version}:\s+(.+)(\s+|$)", text)
    return version if not matches else matches[0][0]


def main():
    with open("package.json") as f:
        package = json.load(f)
    print("\n  = Checking dependencies\n")
    for dep_type in ["devDependencies", "dependencies"]:
        for dep, version in package.get(dep_type, {}).items():
            info = subprocess.run(
                ["npm", "dist-tags", dep], stdout=subprocess.PIPE, check=True)
            info = info.stdout.decode()
            latest = find_version(info, "latest")
            custom = overrides.get(dep, "latest")
            wanted = find_version(info, custom)
            if wanted and latest:
                if wanted == version:
                    print(
                        f"- {dep} already using the '{custom}' "
                        f"version {version}")
                else:
                    print(f"- updating {dep} from {version} to {wanted}")
                if wanted != latest:
                    print(f"  | the 'latest' version is at {latest}")
                package[dep_type][dep] = wanted
            else:
                print(f"- failed to find {wanted} version for {dep}")
    with open("package.json", "w") as f:
        json.dump(package, f, indent=2)
        f.write("\n")

    shutil.rmtree("./node_modules", ignore_errors=True)
    try:
        os.remove("./package-lock.json")
    except OSError:
        pass
    print("\n  = Installing modules\n")
    subprocess.run(["npm", "install", "--legacy-peer-deps"], check=False)
    print("\n  = Fixing audit issues\n")
    subprocess.run(["npm", "audit", "fix", "--legacy-peer-deps"], check=False)
    print("\n  = Deduplicating dependencies\n")
    subprocess.run(["npm", "dedup", "--legacy-peer-deps"], check=False)


if __name__ == "__main__":
    main()
