![](https://img.shields.io/badge/Foundry-v12-informational)
![Latest Release Download Count](https://img.shields.io/github/downloads/FolkvangrForgent/pf2e-hex/latest/module.zip)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fpf2e-hex&colorB=4aa94a)

# PF2e Hex Enhancements

This module aims to enhance the use of hex grids while using the pf2e system.

**WARNING** - This module uses a lot of function patching and so it is suggested to run it on the exact version of FoundryVTT and PF2e that it is verified for. It will likely run fine but even now some features will only fully work on the version after 6.1.3.

## Features

### Templates

- Snapping
    - Grid
        - `cone` snaps to center or midpoints or vertices
        - `emanation` snaps to center or vertices
        - `burst` snaps to vertices
        - `line` snaps to midpoints or vertices
    - Angle
        - `cone`, `emanation`, and `burst` snaps to 30 degree increments
- Highlights
    - Improve rendering when not placed on grid
    - Accurate `line` paths
    - Wall Collision Coloring
- Emulate `gridTemplates` behavior when on hex grids