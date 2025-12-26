# hex-grid

A Claude Code plugin providing comprehensive guidance for hexagonal grid development.

## Features

- **Complete Coordinate Systems**: Cube, Axial, Offset, and Doubled coordinates
- **Essential Algorithms**: Distance, neighbors, line drawing, pathfinding, field of view
- **Pixel Conversions**: Hex to pixel and pixel to hex for both orientations
- **Best Practices**: Common pitfalls and recommended approaches
- **Authoritative Reference**: Based on Red Blob Games' definitive hexagonal grids guide

## Installation

```bash
# Add marketplace
/plugin marketplace add https://github.com/LomoMarketplace/LomoMarketplace.git

# Install plugin
/plugin install hex-grid@LomoMarketplace
```

Or test locally:
```bash
claude --plugin-dir /path/to/hex-grid
```

## Usage

The skill automatically activates when you ask about:

- "hexagonal grids", "hex grid", "hex map"
- "cube coordinates", "axial coordinates", "offset coordinates"
- "hex distance", "hex neighbors", "hex pathfinding"
- "hex rotation", "hex ring", "hex spiral"
- "pixel to hex", "hex to pixel"

### Example Queries

- "How do I calculate distance between two hexes?"
- "What coordinate system should I use for my hex game?"
- "How to find all neighbors of a hex?"
- "Convert pixel coordinates to hex coordinates"
- "How does hex rotation work?"

## Skill Contents

### SKILL.md
Core concepts and quick reference for hexagonal grid development.

### references/formulas.md
Complete formula reference including:
- All coordinate system conversions
- Pixel ↔ Hex conversions
- Neighbor directions for all coordinate systems
- Distance formulas
- Rotation and reflection formulas

### references/algorithms.md
Detailed pseudocode for:
- Cube rounding
- Line drawing
- Range queries
- Pathfinding (A*)
- Field of view
- Map storage patterns

## Reference

This plugin is based on concepts from the authoritative [Red Blob Games Hexagonal Grids Guide](https://www.redblobgames.com/grids/hexagons/) by Amit Patel.

## License

MIT
