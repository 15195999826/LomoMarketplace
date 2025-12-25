"use client";

import type { Element } from "@inkmon/core";

interface ElementBadgeProps {
  element: Element;
  size?: "sm" | "md" | "lg";
}

const ELEMENT_NAMES: Record<Element, string> = {
  fire: "火",
  water: "水",
  grass: "草",
  electric: "电",
  ice: "冰",
  rock: "岩",
  ground: "地",
  flying: "飞",
  bug: "虫",
  poison: "毒",
  dark: "暗",
  light: "光",
  steel: "钢",
  dragon: "龙",
};

export function ElementBadge({ element, size = "md" }: ElementBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span className={`element-badge element-${element} ${sizeClasses[size]}`}>
      {ELEMENT_NAMES[element]}
    </span>
  );
}
