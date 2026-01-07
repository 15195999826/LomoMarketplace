"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  HexGridModel,
  type AxialCoord,
  hexKey,
  hexEquals,
} from '@lomo/hex-grid';

interface HexGrid3DProps {
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

export function HexGrid3D({ model, walls, start, end, path, pathSet, visited, hover, onTileClick, onTileHover }: HexGrid3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Init Scene
  useEffect(() => {
    if (!containerRef.current) return;

    // 捕获本地变量，确保 cleanup 能正确访问（React 18 Strict Mode 兼容）
    const container = containerRef.current;
    let frameId = 0;

    // Dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(0, 500, 400);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(100, 300, 100);
    scene.add(dirLight);

    // 赋值给 refs（供其他 useEffect 使用）
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    // Animation Loop（使用本地变量）
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup：使用闭包捕获的本地变量，确保正确清理
    return () => {
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();

      // 安全移除 canvas
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // 清理 refs
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  // Resize Observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
        if (!cameraRef.current || !rendererRef.current) return;
        
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
                cameraRef.current.aspect = width / height;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(width, height);
            }
        }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Sync Meshes with Model
  useEffect(() => {
    if (!sceneRef.current || !model) return;
    
    // Clear old meshes
    meshesRef.current.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
        else (mesh.material as THREE.Material).dispose();
        sceneRef.current?.remove(mesh);
    });
    meshesRef.current.clear();

    const hexSize = model.config.hexSize;
    const geometry = new THREE.CylinderGeometry(hexSize - 1, hexSize - 1, 10, 6);
    // Three.js CylinderGeometry 默认是 pointy 样式，flat 需要旋转 30 度
    geometry.rotateY(model.config.orientation === 'flat' ? Math.PI / 6 : 0);

    for (const tile of model.getAllTiles()) {
        const pos = model.coordToWorld(tile.coord);
        // 3D coords: x -> x, y -> z
        const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(pos.x, 0, pos.y);
        mesh.userData = { coord: tile.coord };
        
        sceneRef.current.add(mesh);
        meshesRef.current.set(hexKey(tile.coord), mesh);
    }

  }, [model, model.config.rows, model.config.columns, model.config.hexSize, model.config.orientation]);

  // Update Colors
  useEffect(() => {
    if (!model) return;

    for (const tile of model.getAllTiles()) {
        const key = hexKey(tile.coord);
        const mesh = meshesRef.current.get(key);
        if (!mesh) continue;

        const mat = mesh.material as THREE.MeshLambertMaterial;
        let color = 0xffffff;
        let yPos = 0;
        let scaleY = 1;

        if (walls.has(key)) {
            color = 0x455a64; // Dark
            yPos = 15; // Taller wall
            scaleY = 4;
        } else {
            scaleY = 1;
            if (start && hexEquals(start, tile.coord)) {
                color = 0x66bb6a; // Green
                yPos = 5;
                scaleY = 2;
            } else if (end && hexEquals(end, tile.coord)) {
                color = 0xef5350; // Red
                yPos = 5;
                scaleY = 2;
            } else if (pathSet.has(key)) {
                color = 0xfff176; // Yellow
                yPos = 2;
                scaleY = 1.4;
            } else if (visited.has(key)) {
                color = 0xe3f2fd; // Light Blue
            }
        }

        // Hover highlight
        if (hover && hexEquals(hover, tile.coord)) {
            mat.emissive.setHex(0x666666);
            yPos += 2; // Pop up slightly
        } else {
            mat.emissive.setHex(0x000000);
        }

        mat.color.setHex(color);
        mesh.scale.setY(scaleY);
        mesh.position.y = yPos;
    }
  }, [model, walls, start, end, pathSet, visited, hover]);

  // Handlers
  const handlePointer = useCallback((e: React.MouseEvent, type: 'move' | 'click' | 'contextmenu') => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    
    if (type === 'contextmenu') e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    const intersects = raycasterRef.current.intersectObjects(Array.from(meshesRef.current.values()));
    
    if (intersects.length > 0) {
        const hit = intersects.find(i => i.object.userData.coord);
        if (hit) {
            const coord = hit.object.userData.coord as AxialCoord;
            if (type === 'move') {
                onTileHover(coord);
            } else if (type === 'click') {
                onTileClick(coord, false);
            } else if (type === 'contextmenu') {
                onTileClick(coord, true);
            }
            return;
        }
    } 
    
    if (type === 'move') {
        onTileHover(null);
    }
  }, [onTileClick, onTileHover]);

  return (
    <div 
        ref={containerRef} 
        style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden',
            // Force z-index to ensure it's above any potential background but below UI (which is side panel)
            // But side panel is sibling flex item, so stacking context is separate. This is fine.
        }}
        onClick={(e) => handlePointer(e, 'click')}
        onContextMenu={(e) => handlePointer(e, 'contextmenu')}
        onMouseMove={(e) => handlePointer(e, 'move')}
        onMouseLeave={() => onTileHover(null)}
    />
  );
}