![](https://img.shields.io/badge/Foundry-v12-informational)
![Latest Release Download Count](https://img.shields.io/github/downloads/FolkvangrForgent/pf2e-hex/latest/module.zip)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fpf2e-hex&colorB=4aa94a)

# PF2e Hex Enhancements

This module aims to enhance the use of hex grids while using the PF2e system. A full list of features can be found below. If you are looking for a particular feature or are having an issue please open up an `Issue`!

**WARNING** - This module uses a lot of function patching and so it is suggested to run it on the exact version of FoundryVTT that it is verified for. The latest version is verified for FVTT 12.330.

**NOTE** - There are no official area rules for rectangles in pf2e, as such I will try my best to leave their functionality as open as possible.

## Features

### Templates

- Snapping
    - Grid
        - `hex` snaps to centers
        - `emanation` snaps to centers or vertices
        - `burst` snaps to vertices
        - `cone` snaps to centers or midpoints or vertices
        - `line` doesn't snap
        - `rectangle` doesn't snap
    - Angle
        - `cone` snaps to 30 degree increments when placing
        - `Shift` + `MouseWheel` will rotate placed templates in 30 degree increments
    - Distance
        - `hex` only highlights a single hex
        - `emanation`,`burst`,`cone`, and `line` snap to grid unit increments
- Highlights
    - Custom `line` algorithm
        - More accurate than default
    - Improved preview rendering
    - Wall collision coloring (only does movement at the moment)
- Rendering
    - `emanation`, `burst`, and `cone` display distance next to the origin of the template
    - `hex` does not display distance
    - `emanation`, `burst`,`cone` and `hex` do not render outline shape
    - `line` renders a line instead of box and text contains width if it is larger than a grid unit
- Emulate `gridTemplates` behavior when on hex grids
- Buttons for `emanation`, `burst`, `cone`, `line`, `hex`, and `rectangle` in `Measurement Controls`
- Settings
    - `cone` internal angle can be configured (defaults to 60 degree)