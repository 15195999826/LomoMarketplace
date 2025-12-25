"use client";

interface ColorPaletteProps {
  colors: string[];
  size?: "sm" | "md" | "lg";
}

export function ColorPalette({ colors, size = "md" }: ColorPaletteProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="color-palette">
      {colors.map((color, index) => (
        <div
          key={index}
          className={`color-swatch ${sizeClasses[size]}`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}
