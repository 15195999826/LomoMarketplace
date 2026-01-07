"use client";

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  HexGridModel,
  type AxialCoord,
  type PixelCoord,
  hexKey,
  hexEquals,
} from '@lomo/hex-grid';

interface HexGrid2DProps {
  model: HexGridModel;
  walls: Set<string>;
  start: AxialCoord | null;
  end: AxialCoord | null;
  path: AxialCoord[];
  pathSet: Set<string>; // O(1) lookup for path membership
  visited: Map<string, number>;
  hover: AxialCoord | null;
  onTileClick: (coord: AxialCoord, isRightClick: boolean) => void;
  onTileHover: (coord: AxialCoord | null) => void;
}

function drawHex(
  ctx: CanvasRenderingContext2D,
  center: PixelCoord,
  size: number,
  orientation: 'flat' | 'pointy',
  fillStyle?: string,
  strokeStyle: string = '#e0e0e0',
  lineWidth: number = 1
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle_deg = orientation === 'flat' ? 60 * i : 60 * i - 30;
    const angle_rad = Math.PI / 180 * angle_deg;
    const x = center.x + size * Math.cos(angle_rad);
    const y = center.y + size * Math.sin(angle_rad);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function HexGrid2D({ model, walls, start, end, path, pathSet, visited, hover, onTileClick, onTileHover }: HexGrid2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  // 1. Resize Observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      setCanvasSize({ width, height });
    });

    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  // 2. Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !model || canvasSize.width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 应用变换：先移到中心，再应用缩放和平移
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(dpr * zoom, dpr * zoom);
    ctx.translate(pan.x, pan.y);

    const hexSize = model.config.hexSize;
    const orientation = model.config.orientation;

    // Draw Tiles
    for (const tile of model.getAllTiles()) {
        const pos = model.coordToWorld(tile.coord);
        const key = hexKey(tile.coord);

        let color = '#ffffff';
        let stroke = '#e0e0e0';
        let strokeWidth = 1;

        if (walls.has(key)) {
            color = '#455a64';
            stroke = '#37474f';
        } else if (start && hexEquals(start, tile.coord)) {
            color = '#66bb6a';
            stroke = '#2e7d32';
        } else if (end && hexEquals(end, tile.coord)) {
            color = '#ef5350';
            stroke = '#c62828';
        } else if (pathSet.has(key)) {
            color = '#fff176';
            stroke = '#fbc02d';
        } else if (visited.has(key)) {
            color = '#e3f2fd';
            stroke = '#bbdefb';
        }

        if (hover && hexEquals(hover, tile.coord)) {
            stroke = '#29b6f6';
            strokeWidth = 2;
            if (!walls.has(key)) {
                color = color === '#ffffff' ? '#fafafa' : color;
            }
        }

        drawHex(ctx, pos, hexSize - 1, orientation, color, stroke, strokeWidth / zoom);

        // 根据缩放级别决定是否显示坐标文字
        const effectiveSize = hexSize * zoom;
        if (effectiveSize >= 20) {
            ctx.fillStyle = walls.has(key) ? '#78909c' : '#bdbdbd';
            ctx.font = `${Math.max(8, 10 / zoom)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${tile.coord.q},${tile.coord.r}`, pos.x, pos.y);
        }
    }

    // Draw Path Lines
    if (path.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#f57f17';
        ctx.lineWidth = 3 / zoom;
        ctx.lineJoin = 'round';
        const startPos = model.coordToWorld(path[0]);
        ctx.moveTo(startPos.x, startPos.y);
        for (let i = 1; i < path.length; i++) {
            const p = model.coordToWorld(path[i]);
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    }

  }, [model, walls, start, end, path, pathSet, visited, hover, canvasSize, zoom, pan]);

  // 3. 转换屏幕坐标到世界坐标
  const screenToWorld = useCallback((screenX: number, screenY: number): { x: number, y: number } => {
    if (!canvasRef.current || canvasSize.width === 0) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const mouseX = screenX - rect.left;
    const mouseY = screenY - rect.top;

    // 反向应用变换
    const worldX = (mouseX - centerX) / zoom - pan.x;
    const worldY = (mouseY - centerY) / zoom - pan.y;

    return { x: worldX, y: worldY };
  }, [canvasSize, zoom, pan]);

  const getCoordFromEvent = useCallback((e: React.MouseEvent): AxialCoord | null => {
    if (!model) return null;

    const world = screenToWorld(e.clientX, e.clientY);
    const coord = model.worldToCoord(world);

    if (!model.hasTile(coord)) return null;
    return coord;
  }, [model, screenToWorld]);

  // 4. 滚轮缩放 (使用 native event 以支持 passive: false)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const zoomFactor = 1.1;
      const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

      setZoom(prevZoom => {
        const newZoom = Math.min(Math.max(prevZoom * delta, 0.2), 5);

        // 以鼠标位置为中心缩放
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;

        setPan(prevPan => ({
          x: prevPan.x - (mouseX / prevZoom - mouseX / newZoom),
          y: prevPan.y - (mouseY / prevZoom - mouseY / newZoom)
        }));

        return newZoom;
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // 5. 鼠标中键拖拽平移
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { // 中键
      e.preventDefault();
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = (e.clientX - lastPanPosRef.current.x) / zoom;
      const dy = (e.clientY - lastPanPosRef.current.y) / zoom;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    } else {
      const coord = getCoordFromEvent(e);
      onTileHover(coord);
    }
  }, [zoom, getCoordFromEvent, onTileHover]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      isPanningRef.current = false;
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (isPanningRef.current) return;
    const coord = getCoordFromEvent(e);
    if (!coord) return;
    onTileClick(coord, false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const coord = getCoordFromEvent(e);
    if (!coord) return;
    onTileClick(coord, true);
  };

  const handleMouseLeave = () => {
    isPanningRef.current = false;
    onTileHover(null);
  };

  // 双击重置视图
  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // 6. WASD 键盘控制平移
  useEffect(() => {
    const MOVE_SPEED = 30; // 基础移动速度（像素）
    const keysPressed = new Set<string>();
    let animationId: number | null = null;

    const updatePan = () => {
      let dx = 0;
      let dy = 0;

      if (keysPressed.has('w') || keysPressed.has('arrowup')) dy += MOVE_SPEED;
      if (keysPressed.has('s') || keysPressed.has('arrowdown')) dy -= MOVE_SPEED;
      if (keysPressed.has('a') || keysPressed.has('arrowleft')) dx += MOVE_SPEED;
      if (keysPressed.has('d') || keysPressed.has('arrowright')) dx -= MOVE_SPEED;

      if (dx !== 0 || dy !== 0) {
        setPan(p => ({
          x: p.x + dx / zoom,
          y: p.y + dy / zoom
        }));
      }

      if (keysPressed.size > 0) {
        animationId = requestAnimationFrame(updatePan);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        // 避免在输入框中触发
        if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

        e.preventDefault();
        if (!keysPressed.has(key)) {
          keysPressed.add(key);
          if (keysPressed.size === 1) {
            animationId = requestAnimationFrame(updatePan);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.delete(key);
      if (keysPressed.size === 0 && animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    };

    // 失去焦点时清除所有按键状态
    const handleBlur = () => {
      keysPressed.clear();
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [zoom]);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
      <canvas
          ref={canvasRef}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          style={{ width: '100%', height: '100%', cursor: isPanningRef.current ? 'grabbing' : 'default' }}
      />
      {/* 缩放指示器 */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        background: 'rgba(255,255,255,0.9)',
        padding: '6px 12px',
        borderRadius: 8,
        fontSize: 13,
        color: '#475569',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        pointerEvents: 'none'
      }}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
