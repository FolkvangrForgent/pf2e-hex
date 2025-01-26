![](https://img.shields.io/badge/Foundry-v12-informational)
![Latest Release Download Count](https://img.shields.io/github/downloads/FolkvangrForgent/pf2e-hex/latest/module.zip)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fpf2e-hex&colorB=4aa94a)

# PF2e Hex Enhancements

This module aims to enhance the use of hex grids while using the PF2e system. A full list of features can be found below. If you are looking for a particular feature or are having an issue please open up an `Issue`!

**WARNING** - This module uses a lot of function patching and so it is suggested to run it on the exact version of FoundryVTT that it is verified for. The latest version is verified for FVTT 12.331.

**NOTE** - There are no official area rules for rectangles in pf2e, as such I will try my best to leave their functionality as open as possible.

## Plan

I plan to overhaul this module under a different name when v13 release and I have time. The updated module will support both pf2e and sf2e (when it releases as a separate system) as well as support enhancing both hex and gridless functionality.

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
- Token target helper prompt on template creation
    - Holding Control will skip the target helper if it is enabled
- Settings
    - (GM) `cone` internal angle can be configured (defaults to 60 degree)
    - (GM) Collision type to use for wall collision coloring and target helper check
    - (User) Target helper can be enabled or disabled

### Token

- Measurement
    - Custom `distanceTo` function for correct range calculation between tokens

### Languages
- English
- Polish

## Not implemented

### Auras

I am waiting on pf2e system support for extending the aura system. PoC MR already created.

### Flanking

I have no current intention to implement a custom flanking detector as I don't have a generalized solution in mind yet. It is possible to still use the system flanking detector on hex grids to mixed results. I have turned off said automation and instead given PCs a custom feat that adds a `Target is Off Guard` toggle the player can check and given NPCs a custom effect that does the same.

#### Feat

Create a new feat, adding the following Rule Elements before adding it to the bonus feat section of all PCs. I highly suggest naming the feat.

##### RollOption
`{"key":"RollOption","domain":"all","option":"off-guard","label":"Target is Off Guard","toggleable":true}`

##### EphemeralEffect
`{"key":"EphemeralEffect","predicate":["off-guard"],"selectors":["strike-attack-roll","spell-attack-roll","strike-damage","attack-spell-damage"],"uuid":"Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg"}`

#### Effect

Create a new effect, adding the following Rule Element. You will have to remember to drop this on each NPC to add the toggle. I highly suggest naming the effect and unchecking the `Show token icon?` button to hide it from appearing.

##### RollOption
`{"key":"RollOption","domain":"all","option":"off-guard","label":"Target is Off Guard","toggleable":true}`

##### EphemeralEffect
`{"key":"EphemeralEffect","predicate":["off-guard"],"selectors":["strike-attack-roll","spell-attack-roll","strike-damage","attack-spell-damage"],"uuid":"Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg"}`

### Large Token Drag Movement Highlighting

This looks to be a native feature that v13 adds therefore I am not looking to add this feature.