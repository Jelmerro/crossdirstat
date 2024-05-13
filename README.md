crossdirstat
============

![crossdirstat](app/icons/128x128.png)

Free open-source cross-platform file & directory statistics as found on [Github](https://github.com/Jelmerro/crossdirstat)

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

## Installation

### Easy download

Download a stable installer or executable for your platform from the [github releases page](https://github.com/Jelmerro/crossdirstat/releases).

### Run directly

Clone/download the latest source and run `npm ci` and `npm start`.

### Make your own build

Create your own build with `node build`, see `node build --help` for other options.

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

## License

crossdirstat was made by [Jelmer van Arnhem](https://github.com/Jelmerro) and is MIT licensed, see LICENSE for details.

This project makes use of the following libraries:

- [Electron](https://github.com/electron/electron) (MIT @ GitHub Inc.)
- [squarify](https://github.com/huy-nguyen/squarify) (MIT @ Huy Nguyen)
