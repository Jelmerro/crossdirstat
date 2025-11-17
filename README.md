crossdirstat
============

![crossdirstat](app/icons/128x128.png)

Free open-source cross-platform file & directory statistics

I have personally replaced crossdirstat with ncdu for the most part,
so major features are not planned, but I will update the Electron version occasionally.
See below for features, installation and why I made crossdirstat all those years ago.

## Features

- Generate a directory tree for any given folder
- View any folder as colored rectangles (squarified algorithm)
- Customize the rectangle colors and show statistics about filetypes
- Export the tree as JSON with sizes and file/folder counters
- Export the rectangle view as JSON, SVG or PNG
- Easy start screen with sane default settings

## Install

### [Github](https://github.com/Jelmerro/crossdirstat/releases)

Download a stable installer or executable for your platform from Github.

### [Fedora](https://jelmerro.nl/fedora)

I host a custom Fedora repository that you can use for automatic updates.

```bash
sudo dnf config-manager addrepo --from-repofile=https://jelmerro.nl/fedora/jelmerro.repo
sudo dnf install crossdirstat
```

## Contribute

You can support my work on [ko-fi](https://ko-fi.com/Jelmerro) or [Github sponsors](https://github.com/sponsors/Jelmerro).
Another way to help is to report issues or suggest new features.
Please try to follow the linter styling when developing, see `npm run lint`.
For an example vimrc that can auto-format based on the included linters,
you can check out my personal [vimrc](https://github.com/Jelmerro/vimrc).

## Building

To create your own builds or run from source, you need to install [Node.js](https://nodejs.org).
Please clone or download this repo and run `npm ci` then `npm start`.
You can make your own executable builds using `node build`.
See `node build --help` for other options, the builds will be stored in `dist`.
If you plan to contribute, please follow the included linter, see `npm run lint`.

## Why another *dirstat application?

There are lots of other similar programs, such as KDirStat, QDirStat and WinDirStat.
A couple of my reasons for creating another one:

- KDirStat and QDirStat don't look pretty on my system
- KDirStat needs tons of KDE dependencies
- QDirStat colors the files per category instead of filetype
- WinDirStat is only available on Windows
- I like to have lots of export options
- Creating my own alternative is a nice project and gives me the chance to make a version which suits my needs

All the alternatives are great programs, but none of them are a perfect fit for me.
