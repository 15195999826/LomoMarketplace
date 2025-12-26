# Hexagonal Grid Formulas Quick Reference

This document provides all essential formulas for hexagonal grid implementations.

## Coordinate Systems

### Offset Coordinates

Two main variants based on which rows/columns are offset:

**Odd-q (odd columns shifted):**
```
  0   1   2   3
    ⬡   ⬡   ⬡
  ⬡   ⬡   ⬡   ⬡
    ⬡   ⬡   ⬡
```

**Even-q (even columns shifted):**
```
  ⬡   ⬡   ⬡   ⬡
    ⬡   ⬡   ⬡
  ⬡   ⬡   ⬡   ⬡
```

**Odd-r / Even-r:** Same concept but for rows (used with pointy-top hexagons).

### Cube Coordinates

Three axes (q, r, s) with constraint: `q + r + s = 0`

```
        +s
         |
    -q   |   +r
      \  |  /
       \ | /
        \|/
        /|\
       / | \
      /  |  \
    -r   |   +q
         |
        -s
```

**Key property:** Distance = `max(|dq|, |dr|, |ds|)`

### Axial Coordinates

Simplified cube coordinates using only (q, r), with s derived: `s = -q - r`

### Doubled Coordinates

Alternative to offset that avoids parity issues.

**Doubled Width** (flat-top, "double-width"):
```
  col = 2*q + r
  row = r

Constraint: col + row is always even
```

**Doubled Height** (pointy-top, "double-height"):
```
  col = q
  row = 2*r + q

Constraint: col + row is always even
```

Advantage: Neighbor directions are consistent (no parity lookup needed).

## Coordinate Conversions

### Offset ↔ Cube

**Odd-q offset to cube:**
```
q_cube = col
r_cube = row - (col - (col & 1)) / 2
s_cube = -q_cube - r_cube
```

**Even-q offset to cube:**
```
q_cube = col
r_cube = row - (col + (col & 1)) / 2
s_cube = -q_cube - r_cube
```

**Cube to odd-q offset:**
```
col = q
row = r + (q - (q & 1)) / 2
```

**Cube to even-q offset:**
```
col = q
row = r + (q + (q & 1)) / 2
```

**Odd-r offset to cube:**
```
q_cube = col - (row - (row & 1)) / 2
r_cube = row
s_cube = -q_cube - r_cube
```

**Even-r offset to cube:**
```
q_cube = col - (row + (row & 1)) / 2
r_cube = row
s_cube = -q_cube - r_cube
```

### Axial ↔ Cube

```
# Axial to Cube
q_cube = q_axial
r_cube = r_axial
s_cube = -q_axial - r_axial

# Cube to Axial
q_axial = q_cube
r_axial = r_cube
```

### Doubled ↔ Axial

**Doubled width (flat-top):**
```
# Doubled to Axial
q = (col - row) / 2
r = row

# Axial to Doubled
col = 2*q + r
row = r
```

**Doubled height (pointy-top):**
```
# Doubled to Axial
q = col
r = (row - col) / 2

# Axial to Doubled
col = q
row = 2*r + q
```

## Pixel ↔ Hex Conversions

### Hex Size

- **size**: Distance from center to corner
- **width** (flat-top): `size * 2`
- **height** (flat-top): `size * sqrt(3)`
- **width** (pointy-top): `size * sqrt(3)`
- **height** (pointy-top): `size * 2`

### Hex to Pixel (Axial Coordinates)

**Flat-top orientation:**
```
x = size * (3/2 * q)
y = size * (sqrt(3)/2 * q + sqrt(3) * r)
```

**Pointy-top orientation:**
```
x = size * (sqrt(3) * q + sqrt(3)/2 * r)
y = size * (3/2 * r)
```

### Pixel to Hex (Axial Coordinates)

**Flat-top orientation:**
```
q = (2/3 * x) / size
r = (-1/3 * x + sqrt(3)/3 * y) / size
```

**Pointy-top orientation:**
```
q = (sqrt(3)/3 * x - 1/3 * y) / size
r = (2/3 * y) / size
```

**Important:** Results need rounding to nearest hex (see algorithms.md).

## Neighbor Directions

### Cube Coordinate Directions

```
Direction 0: (+1, -1,  0)  # East / Right
Direction 1: (+1,  0, -1)  # Northeast / Upper-right
Direction 2: ( 0, +1, -1)  # Northwest / Upper-left
Direction 3: (-1, +1,  0)  # West / Left
Direction 4: (-1,  0, +1)  # Southwest / Lower-left
Direction 5: ( 0, -1, +1)  # Southeast / Lower-right
```

### Offset Coordinate Directions

**Odd-q (flat-top):**
```
Even columns: [(+1,  0), (+1, -1), (0, -1), (-1,  0), (0, +1), (+1, +1)]
Odd columns:  [(+1,  0), ( 0, -1), (-1, -1), (-1, 0), (-1, +1), (0, +1)]
```

**Even-q (flat-top):**
```
Even columns: [(+1,  0), ( 0, -1), (-1, -1), (-1, 0), (-1, +1), (0, +1)]
Odd columns:  [(+1,  0), (+1, -1), (0, -1), (-1,  0), (0, +1), (+1, +1)]
```

**Odd-r (pointy-top):**
```
Even rows: [(+1, 0), (+1, -1), (0, -1), (-1, 0), (0, +1), (+1, +1)]
Odd rows:  [(+1, 0), ( 0, -1), (-1, -1), (-1, 0), (-1, +1), (0, +1)]
```

**Even-r (pointy-top):**
```
Even rows: [(+1, 0), ( 0, -1), (-1, -1), (-1, 0), (-1, +1), (0, +1)]
Odd rows:  [(+1, 0), (+1, -1), (0, -1), (-1, 0), (0, +1), (+1, +1)]
```

### Doubled Coordinate Directions

**Doubled width (flat-top):** No parity needed!
```
[(+2, 0), (+1, -1), (-1, -1), (-2, 0), (-1, +1), (+1, +1)]
```

**Doubled height (pointy-top):** No parity needed!
```
[(+1, +1), (+1, -1), (0, -2), (-1, -1), (-1, +1), (0, +2)]
```

### Diagonal Neighbors (Cube)

```
Direction 0: (+2, -1, -1)
Direction 1: (+1, +1, -2)
Direction 2: (-1, +2, -1)
Direction 3: (-2, +1, +1)
Direction 4: (-1, -1, +2)
Direction 5: (+1, -2, +1)
```

## Distance Formulas

### Cube Distance

```
distance = max(|q1 - q2|, |r1 - r2|, |s1 - s2|)
```

Or equivalently:
```
distance = (|q1 - q2| + |r1 - r2| + |s1 - s2|) / 2
```

### Axial Distance

```
distance = (|q1 - q2| + |q1 + r1 - q2 - r2| + |r1 - r2|) / 2
```

### Offset Distance

Convert to cube coordinates first, then use cube distance.

### Doubled Distance

**Doubled width:**
```
dcol = |col1 - col2|
drow = |row1 - row2|
distance = drow + max(0, (dcol - drow) / 2)
```

**Doubled height:**
```
dcol = |col1 - col2|
drow = |row1 - row2|
distance = dcol + max(0, (drow - dcol) / 2)
```

## Rotation Formulas

### 60° Rotation Around Origin (Cube)

**Clockwise:**
```
q_new = -r
r_new = -s
s_new = -q
```

**Counter-clockwise:**
```
q_new = -s
r_new = -q
s_new = -r
```

### Rotation Around Arbitrary Center

```
# Translate to origin
vec = hex - center

# Rotate
rotated = rotate(vec)

# Translate back
result = rotated + center
```

## Reflection Formulas (Cube)

```
# Reflect across q axis (swap r and s)
reflected = (q, s, r)

# Reflect across r axis (swap q and s)
reflected = (s, r, q)

# Reflect across s axis (swap q and r)
reflected = (r, q, s)
```

## Ring and Spiral Formulas

### Ring at Distance N

Total hexes in ring: `6 * N` (for N > 0), 1 (for N = 0)

### Spiral (All Hexes within Distance N)

Total hexes: `3 * N * (N + 1) + 1`

Or: `1 + 6 + 12 + 18 + ... + 6N = 1 + 6 * (1 + 2 + ... + N)`

## Layout Matrix (Advanced)

### Orientation Matrix

```
# Flat-top
f0 = 3/2,      f1 = 0
f2 = sqrt(3)/2, f3 = sqrt(3)
b0 = 2/3,      b1 = 0
b2 = -1/3,     b3 = sqrt(3)/3
start_angle = 0

# Pointy-top
f0 = sqrt(3),   f1 = sqrt(3)/2
f2 = 0,         f3 = 3/2
b0 = sqrt(3)/3, b1 = -1/3
b2 = 0,         b3 = 2/3
start_angle = 0.5  # 30 degrees
```

### Hex Corner Position

```
angle = 2 * PI * (start_angle + corner) / 6
corner_x = center_x + size * cos(angle)
corner_y = center_y + size * sin(angle)
```

Where corner is 0-5.
