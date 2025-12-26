# Hexagonal Grid Algorithms

This document provides detailed algorithms for common hexagonal grid operations.

## Rounding (Pixel to Hex)

When converting from pixel coordinates to hex, the result is a fractional hex coordinate. Round to the nearest valid hex:

### Cube Rounding

```pseudocode
function cube_round(frac_q, frac_r, frac_s):
    q = round(frac_q)
    r = round(frac_r)
    s = round(frac_s)

    q_diff = abs(q - frac_q)
    r_diff = abs(r - frac_r)
    s_diff = abs(s - frac_s)

    # Reset the component with largest rounding error
    if q_diff > r_diff and q_diff > s_diff:
        q = -r - s
    else if r_diff > s_diff:
        r = -q - s
    else:
        s = -q - r

    return (q, r, s)
```

### Axial Rounding

```pseudocode
function axial_round(frac_q, frac_r):
    frac_s = -frac_q - frac_r
    (q, r, s) = cube_round(frac_q, frac_r, frac_s)
    return (q, r)
```

## Neighbor Finding

### Cube Neighbors

```pseudocode
CUBE_DIRECTIONS = [
    (+1, -1,  0), (+1,  0, -1), ( 0, +1, -1),
    (-1, +1,  0), (-1,  0, +1), ( 0, -1, +1)
]

function cube_neighbor(hex, direction):
    dir = CUBE_DIRECTIONS[direction]
    return (hex.q + dir.q, hex.r + dir.r, hex.s + dir.s)

function cube_neighbors(hex):
    neighbors = []
    for direction in 0..5:
        neighbors.append(cube_neighbor(hex, direction))
    return neighbors
```

### Offset Neighbors

```pseudocode
# Odd-q offset (flat-top, odd columns shifted down)
ODD_Q_DIRECTIONS = [
    # even cols                    # odd cols
    [( 0, -1), (+1, -1), (+1,  0), [( 0, -1), (+1,  0), (+1, +1),
     ( 0, +1), (-1,  0), (-1, -1)]  ( 0, +1), (-1, +1), (-1,  0)]
]

function offset_neighbor(hex, direction, parity):
    dir = ODD_Q_DIRECTIONS[parity][direction]
    return (hex.col + dir.col, hex.row + dir.row)
```

### Diagonal Neighbors (Cube)

```pseudocode
CUBE_DIAGONALS = [
    (+2, -1, -1), (+1, +1, -2), (-1, +2, -1),
    (-2, +1, +1), (-1, -1, +2), (+1, -2, +1)
]

function cube_diagonal_neighbor(hex, direction):
    dir = CUBE_DIAGONALS[direction]
    return (hex.q + dir.q, hex.r + dir.r, hex.s + dir.s)
```

## Distance Calculation

### Cube Distance

```pseudocode
function cube_distance(a, b):
    return max(abs(a.q - b.q), abs(a.r - b.r), abs(a.s - b.s))
```

### Axial Distance

```pseudocode
function axial_distance(a, b):
    return (abs(a.q - b.q)
          + abs(a.q + a.r - b.q - b.r)
          + abs(a.r - b.r)) / 2
```

### Offset Distance

```pseudocode
function offset_distance(a, b):
    a_cube = offset_to_cube(a)
    b_cube = offset_to_cube(b)
    return cube_distance(a_cube, b_cube)
```

## Line Drawing

### Cube Linear Interpolation

```pseudocode
function cube_lerp(a, b, t):
    return (
        lerp(a.q, b.q, t),
        lerp(a.r, b.r, t),
        lerp(a.s, b.s, t)
    )

function lerp(a, b, t):
    return a + (b - a) * t
```

### Line Between Two Hexes

```pseudocode
function cube_linedraw(a, b):
    N = cube_distance(a, b)
    results = []

    # Add small offset to avoid landing exactly on edge
    a_nudge = (a.q + 1e-6, a.r + 1e-6, a.s - 2e-6)
    b_nudge = (b.q + 1e-6, b.r + 1e-6, b.s - 2e-6)

    for i in 0..N:
        t = (1.0 / N) * i if N > 0 else 0
        results.append(cube_round(cube_lerp(a_nudge, b_nudge, t)))

    return results
```

**Note:** The nudge prevents ambiguity when the line passes exactly through hex edges.

## Range (All Hexes within Distance)

### Cube Range

```pseudocode
function cube_range(center, N):
    results = []
    for q in -N..+N:
        for r in max(-N, -q-N)..min(+N, -q+N):
            s = -q - r
            results.append((center.q + q, center.r + r, center.s + s))
    return results
```

This generates `3*N*(N+1) + 1` hexes.

### Range Intersection

```pseudocode
function cube_range_intersection(center1, N1, center2, N2):
    results = []
    # Calculate bounding constraints
    q_min = max(center1.q - N1, center2.q - N2)
    q_max = min(center1.q + N1, center2.q + N2)
    r_min = max(center1.r - N1, center2.r - N2)
    r_max = min(center1.r + N1, center2.r + N2)

    for q in q_min..q_max:
        for r in r_min..r_max:
            s = -q - r
            hex = (q, r, s)
            if cube_distance(hex, center1) <= N1 and
               cube_distance(hex, center2) <= N2:
                results.append(hex)
    return results
```

## Ring (Hexes at Exact Distance)

### Single Ring

```pseudocode
function cube_ring(center, radius):
    if radius == 0:
        return [center]

    results = []
    # Start at one corner of the ring
    hex = cube_add(center, cube_scale(cube_direction(4), radius))

    for direction in 0..5:
        for step in 0..radius-1:
            results.append(hex)
            hex = cube_neighbor(hex, direction)

    return results
```

### Spiral (Rings from 0 to N)

```pseudocode
function cube_spiral(center, radius):
    results = [center]
    for k in 1..radius:
        results.extend(cube_ring(center, k))
    return results
```

## Pathfinding

### A* Algorithm for Hex Grids

```pseudocode
function a_star(start, goal, is_passable, cost_function):
    frontier = PriorityQueue()
    frontier.put(start, 0)
    came_from = {start: None}
    cost_so_far = {start: 0}

    while not frontier.empty():
        current = frontier.get()

        if current == goal:
            break

        for neighbor in cube_neighbors(current):
            if not is_passable(neighbor):
                continue

            new_cost = cost_so_far[current] + cost_function(current, neighbor)

            if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                cost_so_far[neighbor] = new_cost
                priority = new_cost + heuristic(goal, neighbor)
                frontier.put(neighbor, priority)
                came_from[neighbor] = current

    # Reconstruct path
    return reconstruct_path(came_from, start, goal)

function heuristic(a, b):
    return cube_distance(a, b)

function reconstruct_path(came_from, start, goal):
    current = goal
    path = []
    while current != start:
        path.append(current)
        current = came_from[current]
    path.append(start)
    path.reverse()
    return path
```

### Breadth-First Search (All Reachable)

```pseudocode
function reachable(start, movement, is_passable):
    visited = {start}
    fringes = [[start]]

    for k in 1..movement:
        fringes.append([])
        for hex in fringes[k-1]:
            for neighbor in cube_neighbors(hex):
                if neighbor not in visited and is_passable(neighbor):
                    visited.add(neighbor)
                    fringes[k].append(neighbor)

    return visited
```

## Field of View / Visibility

### Simple Raycast Visibility

```pseudocode
function is_visible(origin, target, blocks_vision):
    line = cube_linedraw(origin, target)
    for hex in line[1:-1]:  # Exclude origin and target
        if blocks_vision(hex):
            return False
    return True
```

### Field of View (All Visible from Origin)

```pseudocode
function field_of_view(origin, range, blocks_vision):
    visible = {origin}

    for hex in cube_range(origin, range):
        if is_visible(origin, hex, blocks_vision):
            visible.add(hex)

    return visible
```

### Shadowcasting (Advanced)

For better performance with large ranges, use recursive shadowcasting:

```pseudocode
function shadowcast(origin, range, blocks_vision):
    visible = {origin}

    for direction in 0..5:
        cast_light(origin, range, direction, 1.0, 0.0, blocks_vision, visible)

    return visible

function cast_light(origin, range, direction, start_slope, end_slope,
                    blocks_vision, visible):
    # Recursive implementation
    # Maintains "shadow" as a slope range
    # Recursively processes cells in each wedge
    # See detailed shadowcasting resources for full implementation
```

## Rotation

### Rotate Around Origin

```pseudocode
function cube_rotate_left(hex):
    return (-hex.r, -hex.s, -hex.q)

function cube_rotate_right(hex):
    return (-hex.s, -hex.q, -hex.r)
```

### Rotate Around Arbitrary Center

```pseudocode
function cube_rotate_around(hex, center, rotations):
    # Translate to origin
    vec = cube_subtract(hex, center)

    # Apply rotations
    for i in 0..abs(rotations):
        if rotations > 0:
            vec = cube_rotate_right(vec)
        else:
            vec = cube_rotate_left(vec)

    # Translate back
    return cube_add(center, vec)
```

## Reflection

```pseudocode
function cube_reflect_q(hex):
    return (hex.q, hex.s, hex.r)

function cube_reflect_r(hex):
    return (hex.s, hex.r, hex.q)

function cube_reflect_s(hex):
    return (hex.r, hex.q, hex.s)
```

## Map Storage

### Rectangular Map with Offset Coordinates

```pseudocode
class HexMap:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.data = [[None] * width for _ in range(height)]

    def get(self, col, row):
        if 0 <= col < self.width and 0 <= row < self.height:
            return self.data[row][col]
        return None

    def set(self, col, row, value):
        if 0 <= col < self.width and 0 <= row < self.height:
            self.data[row][col] = value
```

### Sparse Map with Hash

```pseudocode
class SparseHexMap:
    def __init__(self):
        self.data = {}

    def _key(self, q, r):
        return (q, r)

    def get(self, q, r):
        return self.data.get(self._key(q, r))

    def set(self, q, r, value):
        self.data[self._key(q, r)] = value

    def remove(self, q, r):
        self.data.pop(self._key(q, r), None)
```

### Chunk-Based Storage

```pseudocode
CHUNK_SIZE = 16

class ChunkedHexMap:
    def __init__(self):
        self.chunks = {}

    def _chunk_key(self, q, r):
        return (q // CHUNK_SIZE, r // CHUNK_SIZE)

    def _local_coords(self, q, r):
        return (q % CHUNK_SIZE, r % CHUNK_SIZE)

    def get(self, q, r):
        chunk = self.chunks.get(self._chunk_key(q, r))
        if chunk:
            local = self._local_coords(q, r)
            return chunk.get(local)
        return None
```

## Wrapping (Toroidal Maps)

### Rectangular Wrapping

```pseudocode
function wrap_offset(col, row, width, height):
    return (col % width, row % height)
```

### Hexagonal Wrapping

For true hexagonal wrapping (like a hexagonal torus), use cube coordinates:

```pseudocode
function wrap_cube(q, r, s, radius):
    # Complex - requires understanding hexagonal topology
    # Consider using a lookup table for boundary hexes
    pass
```

## Performance Considerations

### Pre-compute Neighbor Tables

For offset coordinates, pre-compute direction tables:

```pseudocode
NEIGHBOR_TABLES = {
    'odd-q': {
        'even': [(+1, 0), (+1, -1), (0, -1), (-1, -1), (-1, 0), (0, +1)],
        'odd':  [(+1, +1), (+1, 0), (0, -1), (-1, 0), (-1, +1), (0, +1)]
    },
    # ... other offset types
}
```

### Cache Distance Calculations

For frequently accessed distances:

```pseudocode
class DistanceCache:
    def __init__(self, max_distance):
        self.cache = {}
        self._precompute(max_distance)

    def _precompute(self, max_distance):
        for q in range(-max_distance, max_distance + 1):
            for r in range(-max_distance, max_distance + 1):
                self.cache[(q, r)] = cube_distance((0, 0, 0), (q, r, -q-r))
```

### Use Axial for Most Operations

Axial coordinates require only 2 values instead of 3, reducing memory and simplifying many operations while maintaining the nice properties of cube coordinates.
