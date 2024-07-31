# 1.2.1

- Template Snapping is vastly simplified

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