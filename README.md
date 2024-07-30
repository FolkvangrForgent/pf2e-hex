![](https://img.shields.io/badge/Foundry-v12-informational)
![Latest Release Download Count](https://img.shields.io/github/downloads/FolkvangrForgent/pf2e-hex/latest/module.zip)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fpf2e-hex&colorB=4aa94a)

# PF2e Hex Enhancements

Enchantments for the pf2e system when using Hex Grids. Some of these changes might be bordering on homebrew but they should generally be small fixes or quality of life features. Some of the features may only fully work on pf2e versions newer than 6.1.3 as this started as some removal of hex code from pf2e core.

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