![](https://img.shields.io/badge/Foundry-v12-informational)
![Latest Release Download Count](https://img.shields.io/github/downloads/FolkvangrForgent/pf2e-hex/latest/module.zip)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fpf2e-hex&colorB=4aa94a)

# PF2e Hex Enhancements

This module aims to enhance the use of hex grids while using the PF2e system. Verified for FVTT 12.330 and PF2e 6.2.0.

**WARNING** - This module uses a lot of function patching and so it is suggested to run it on the exact version of FoundryVTT and PF2e that it is verified for.

**NOTE** - There are no official area rules for rectangles in pf2e, as such I will try my best to leave their functionality as open as possible.

## Features

### Templates

- Snapping
    - Grid
        - `emanation` snaps to centers or vertices
        - `burst` snaps to vertices
        - `cone` snaps to centers or midpoints or vertices
        - `line` doesn't snap
        - `hex` snaps to centers
        - `rectangle` doesn't snap
    - Angle
        - `cone` snaps to 30 degree increments when drawing
        - SHIFT + MouseWheel will rotate placed templates in 30 degree increments
- Highlights
    - Improve preview rendering
    - Wall collision coloring (currently only does movement collisions)
- Rendering
    - `emanation`, `burst`, and `cone` display distance next to the origin of the template
    - `hex` does not display distance
    - `emanation`, `burst`,`cone`, and `hex` do not render outline shape
- Emulate `gridTemplates` behavior when on hex grids
- Buttons for `emanation`, `burst`, `cone`, `line`,  `hex`, and `rectangle` in `Measurement Controls`