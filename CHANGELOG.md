# 1.4.1

- Add toolclips to measurement tools
- Fix error when switching grid type with a custom measurement tool selected

# 1.4.0

- Add `hex` template shape that highlights a single hex
- Template rendering
    - outlines now only render on `line` and `rectangle`
    - `emanation`,`burst`,`cone`, and `hex` now render the distance next to the origin of the template
- Template angle snapping
    - `cone` is now the only template to snap to 30 degree angle increments
    - SHIFT + MouseWheel will rotate placed templates in 30 degree increments
- fix error spam

# 1.3.0

- Template grid snapping
    - `line` set to none
    - `rectangle` set to none
    -  properly works with chat message previews
- Template angle snapping
    - `rectangle` set to none
- Rule based template buttons added in `Measurement Controls`
- Template highlighting
    - `line` reverted back to default behavior

# 1.2.1

- Template snapping is vastly simplified

# 1.2.0

- Deprecate use of `gridTemplates` in favor of wrapping functions
    - provides cleaner overall behavior
- Templates now use custom highlighting logic
    - `line` properly highlights grid
    - fix for highlighting not snapping to grid

# 1.1.0

- Templates now use wrapper instead of hook for wall collisions
- Templates snap on placement
- Templates shapes snap (chat)

# 1.0.0

- Templates snap every 30 degree angle increments for `circle` and `cone`
- Templates color based on wall collision
- Templates snap on movement
    - `cone` snaps to center or midpoints or vertices
    - `emanation` snaps to center or vertices
    - `burst` snaps to vertices
    - `line` snaps to midpoints or vertices
- Force `gridTemplates` on for hex grids (and off for square)