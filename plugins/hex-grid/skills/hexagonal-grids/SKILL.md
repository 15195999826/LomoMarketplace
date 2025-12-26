---
name: Hexagonal Grids
description: This skill should be used when the user needs to implement hex-based game boards, convert between hex coordinate systems, calculate hex distances, find hex neighbors, implement hex pathfinding, or draw hex maps. Trigger phrases include "hexagonal grids", "hex grid", "hex map", "honeycomb layout", "hex-based game", "hex pathfinding", "hex distance", "hex neighbors", "cube coordinates", "axial coordinates", "offset coordinates", "hex rotation", "hex ring", "hex spiral", "六边形网格", "六边形地图", "蜂窝布局", "蜂窝网格", "六边形坐标", "六边形寻路", "六边形距离", "六边形邻居", "立方坐标", "轴向坐标", "hex战棋", "蜂窝地图算法".
---

# Hexagonal Grids Development Guide

This guide covers various ways to make hexagonal grids, the relationships between different approaches, and common formulas and algorithms. Based on concepts from the authoritative [Red Blob Games Hexagonal Grids Guide](https://www.redblobgames.com/grids/hexagons/).

## Why Hexagons?

Hexagons offer advantages over squares:

- **Uniform distance**: All 6 neighbors are equidistant (unlike squares where diagonals are √2 further)
- **Natural movement**: 6 directions feel more natural for many games
- **Visual appeal**: Hexagonal layouts are aesthetically pleasing
- **Reduced artifacts**: Fewer edge cases in pathfinding and line-of-sight

## Coordinate Systems

### Overview

| System | Components | Storage | Algorithms | Best For |
|--------|------------|---------|------------|----------|
| **Offset** | (col, row) | Easy | Hard | Rectangular storage |
| **Cube** | (q, r, s) | Redundant | Easy | All algorithms |
| **Axial** | (q, r) | Easy | Easy | General purpose |
| **Doubled** | (col, row) | Easy | Medium | Rectangular + algorithms |

**Recommendation**: Use axial as primary. Convert to cube for algorithms, offset for rectangular storage.

### Cube Coordinates

Three axes (q, r, s) with constraint: **q + r + s = 0**

Key properties:
- Distance = `max(|dq|, |dr|, |ds|)`
- Rotation = cycle and negate coordinates
- All algorithms become symmetric and elegant

### Axial Coordinates

Two axes (q, r), deriving s as `-q - r` when needed.

Advantages:
- Only 2 values (efficient storage)
- Retains cube coordinate properties
- Best balance for most implementations

### Offset Coordinates

Standard (col, row) with alternating rows/columns shifted:

- **odd-q / even-q**: Flat-top hexagons (columns shifted)
- **odd-r / even-r**: Pointy-top hexagons (rows shifted)

Characteristics:
- Simple 2D array storage
- Neighbor calculations depend on parity (odd/even)
- Harder algorithms

### Doubled Coordinates

Alternative to offset that avoids parity issues:

- **Doubled width** (col, row): `col + row` always even
- **Doubled height** (col, row): `col + row` always even

Advantage: Neighbors are consistent regardless of position.

## Hex Orientation

### Flat-Top vs Pointy-Top

```
Flat-top:        Pointy-top:
   ___              /\
  /   \            |  |
  \___/             \/
```

Choose based on:
- Visual preference
- Movement direction (vertical corridors → pointy-top)
- Whether rows or columns should align

## Essential Operations

### Getting Neighbors

**Cube directions** (6 neighbors):
```
[(+1,-1,0), (+1,0,-1), (0,+1,-1),
 (-1,+1,0), (-1,0,+1), (0,-1,+1)]
```

To get neighbor: `neighbor = hex + direction[i]`

**Diagonal neighbors** (6 diagonals, distance 2):
```
[(+2,-1,-1), (+1,+1,-2), (-1,+2,-1),
 (-2,+1,+1), (-1,-1,+2), (+1,-2,+1)]
```

### Distance Calculation

**Cube**: `max(|dq|, |dr|, |ds|)`

Or equivalently: `(|dq| + |dr| + |ds|) / 2`

**Axial**: `(|dq| + |dq + dr| + |dr|) / 2`

### Line Drawing

1. Linearly interpolate in cube coordinates (floating point)
2. Round each point to nearest hex using cube rounding
3. Add small epsilon offset to avoid edge ambiguity

### Range (All Hexes within Distance N)

```
for q in -N to +N:
    for r in max(-N, -q-N) to min(+N, -q+N):
        s = -q - r
        yield center + (q, r, s)
```

Total hexes in range: `3*N*(N+1) + 1`

### Rings and Spirals

**Ring at distance N**: Start at one corner, walk around (6*N hexes for N>0)

**Spiral**: Concatenate rings from 0 to N

### Rotation

**60° clockwise** (cube): `(q,r,s) → (-r,-s,-q)`

**60° counter-clockwise** (cube): `(q,r,s) → (-s,-q,-r)`

To rotate around arbitrary center: translate to origin, rotate, translate back.

### Reflection

Swap two coordinates:
- Reflect across q-axis: `(q,r,s) → (q,s,r)`
- Reflect across r-axis: `(q,r,s) → (s,r,q)`
- Reflect across s-axis: `(q,r,s) → (r,q,s)`

## Pixel Conversions

### Hex to Pixel (Axial)

**Flat-top**:
```
x = size * (3/2 * q)
y = size * (sqrt(3)/2 * q + sqrt(3) * r)
```

**Pointy-top**:
```
x = size * (sqrt(3) * q + sqrt(3)/2 * r)
y = size * (3/2 * r)
```

### Pixel to Hex (Axial)

**Flat-top**:
```
q = (2/3 * x) / size
r = (-1/3 * x + sqrt(3)/3 * y) / size
```

**Pointy-top**:
```
q = (sqrt(3)/3 * x - 1/3 * y) / size
r = (2/3 * y) / size
```

Then apply cube rounding (see Common Pitfalls).

## Common Patterns

### Pathfinding

Use A* with cube/axial distance as heuristic. The heuristic is admissible (never overestimates).

### Field of View

Cast rays to each potential target. Target is visible if no blocking hex lies on the line.

### Map Storage

- **Rectangular maps**: Offset coordinates in 2D array
- **Sparse/infinite maps**: Hash map with axial coordinates
- **Chunk-based**: Divide into chunks for large worlds

### Wraparound Maps

For toroidal (wrapping) maps, use modular arithmetic. Rectangular wraparound with offset coordinates is simpler than hexagonal wraparound.

## Common Pitfalls

### Cube Rounding

When converting pixel → hex, simple rounding breaks `q+r+s=0`. Use this algorithm:

```
round all three, then reset the one with largest error:
if |q_diff| > |r_diff| and |q_diff| > |s_diff|:
    q = -r - s
elif |r_diff| > |s_diff|:
    r = -q - s
else:
    s = -q - r
```

### Offset Neighbor Parity

Offset neighbors depend on odd/even column/row. Use lookup tables, not formulas.

### Line Edge Ambiguity

Lines through hex edges create ambiguity. Add epsilon to one endpoint before interpolation.

### Mixing Coordinate Systems

Establish conventions early. Convert explicitly at boundaries.

## Quick Decision Guide

| Task | Approach |
|------|----------|
| Store rectangular map | Offset in 2D array |
| Store sparse map | Axial in hash map |
| Calculate distance | Cube formula |
| Find path | A* with cube heuristic |
| Draw line | Cube interpolation + rounding |
| Get neighbors | Cube addition |
| Rotate/reflect | Cube coordinates |
| Pixel ↔ hex | Axial formulas + cube rounding |

## Reference Files

For detailed formulas, algorithms, and pseudocode:

- **`references/formulas.md`** - Complete formula reference for all conversions
- **`references/algorithms.md`** - Detailed pseudocode for pathfinding, FOV, storage

## Authoritative Reference

For interactive diagrams and comprehensive explanations, consult:
**[Red Blob Games: Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/)**

This is the definitive resource for hexagonal grid development, featuring interactive visualizations and code samples in multiple languages.
