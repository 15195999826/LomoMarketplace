#!/usr/bin/env node
/**
 * PreToolUse Hook: Validate browser control tool parameters
 *
 * This hook validates parameters for browser_* MCP tools before execution,
 * ensuring proper format and required fields are present.
 */

const fs = require('fs');

// Read hook input from stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    input += chunk;
  }
});

process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(input);
    const { tool_name, tool_input } = hookData;

    // Only validate browser_* tools
    if (!tool_name || !tool_name.startsWith('browser_')) {
      outputResult({ decision: 'allow' });
      return;
    }

    const errors = [];

    // Validate browser_click
    if (tool_name === 'browser_click' || tool_name === 'mcp__browser-control__browser_click') {
      if (!tool_input.coordinate && !tool_input.ref) {
        errors.push('browser_click requires either "coordinate" or "ref" parameter');
      }
      if (tool_input.coordinate) {
        if (!Array.isArray(tool_input.coordinate) || tool_input.coordinate.length !== 2) {
          errors.push('coordinate must be an array of [x, y]');
        } else {
          const [x, y] = tool_input.coordinate;
          if (typeof x !== 'number' || typeof y !== 'number') {
            errors.push('coordinate values must be numbers');
          }
          if (x < 0 || y < 0) {
            errors.push('coordinate values must be non-negative');
          }
        }
      }
      if (tool_input.ref && typeof tool_input.ref !== 'string') {
        errors.push('ref must be a string like "ref_1"');
      }
      if (tool_input.button && !['left', 'right', 'middle'].includes(tool_input.button)) {
        errors.push('button must be "left", "right", or "middle"');
      }
      if (tool_input.clickCount && ![1, 2, 3].includes(tool_input.clickCount)) {
        errors.push('clickCount must be 1, 2, or 3');
      }
    }

    // Validate browser_type
    if (tool_name === 'browser_type' || tool_name === 'mcp__browser-control__browser_type') {
      if (!tool_input.text || typeof tool_input.text !== 'string') {
        errors.push('browser_type requires a non-empty "text" string parameter');
      }
    }

    // Validate browser_key
    if (tool_name === 'browser_key' || tool_name === 'mcp__browser-control__browser_key') {
      if (!tool_input.key || typeof tool_input.key !== 'string') {
        errors.push('browser_key requires a "key" string parameter');
      }
      if (tool_input.repeat !== undefined) {
        if (typeof tool_input.repeat !== 'number' || tool_input.repeat < 1) {
          errors.push('repeat must be a positive number');
        }
      }
    }

    // Validate browser_scroll
    if (tool_name === 'browser_scroll' || tool_name === 'mcp__browser-control__browser_scroll') {
      if (!tool_input.direction) {
        errors.push('browser_scroll requires a "direction" parameter');
      } else if (!['up', 'down', 'left', 'right'].includes(tool_input.direction)) {
        errors.push('direction must be "up", "down", "left", or "right"');
      }
      if (tool_input.amount !== undefined) {
        if (typeof tool_input.amount !== 'number' || tool_input.amount <= 0) {
          errors.push('amount must be a positive number');
        }
      }
    }

    // Validate browser_navigate
    if (tool_name === 'browser_navigate' || tool_name === 'mcp__browser-control__browser_navigate') {
      if (!tool_input.url || typeof tool_input.url !== 'string') {
        errors.push('browser_navigate requires a "url" string parameter');
      } else {
        try {
          new URL(tool_input.url);
        } catch {
          errors.push('url must be a valid URL (include http:// or https://)');
        }
      }
    }

    // Validate browser_read_page
    if (tool_name === 'browser_read_page' || tool_name === 'mcp__browser-control__browser_read_page') {
      if (tool_input.filter && !['all', 'interactive'].includes(tool_input.filter)) {
        errors.push('filter must be "all" or "interactive"');
      }
    }

    // Output result
    if (errors.length > 0) {
      outputResult({
        decision: 'block',
        message: `Parameter validation failed:\n${errors.map(e => `- ${e}`).join('\n')}\n\nPlease fix the parameters and try again.`
      });
    } else {
      outputResult({ decision: 'allow' });
    }

  } catch (error) {
    // On parse error, allow the tool to proceed
    outputResult({ decision: 'allow' });
  }
});

function outputResult(result) {
  console.log(JSON.stringify(result));
}
