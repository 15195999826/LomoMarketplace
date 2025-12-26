import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

interface RouteParams {
  params: Promise<{ nameEn: string }>;
}

const VALID_SLOTS = ["main", "front", "left", "right", "back"] as const;
type ImageSlot = (typeof VALID_SLOTS)[number];

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * GET /api/inkmon/[nameEn]/images
 * 获取 InkMon 的所有图片
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { nameEn } = await params;
    const imagesDir = path.join(process.cwd(), "public", "images", "inkmon", nameEn);

    if (!existsSync(imagesDir)) {
      return NextResponse.json({ images: {} });
    }

    const files = await readdir(imagesDir);
    const images: Partial<Record<ImageSlot, string>> = {};

    for (const file of files) {
      const slot = file.split(".")[0] as ImageSlot;
      if (VALID_SLOTS.includes(slot)) {
        images[slot] = `/images/inkmon/${nameEn}/${file}`;
      }
    }

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inkmon/[nameEn]/images
 * 上传 InkMon 图片
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { nameEn } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const slot = formData.get("slot") as string | null;

    // 验证参数
    if (!file) {
      return NextResponse.json({ error: "未提供文件" }, { status: 400 });
    }

    if (!slot || !VALID_SLOTS.includes(slot as ImageSlot)) {
      return NextResponse.json(
        { error: `无效的图片槽位，有效值: ${VALID_SLOTS.join(", ")}` },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型，支持: PNG, JPG, WebP` },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `文件大小超过限制 (最大 2MB)` },
        { status: 400 }
      );
    }

    // 创建目录
    const imagesDir = path.join(process.cwd(), "public", "images", "inkmon", nameEn);
    if (!existsSync(imagesDir)) {
      await mkdir(imagesDir, { recursive: true });
    }

    // 删除该槽位的旧图片
    const existingFiles = existsSync(imagesDir) ? await readdir(imagesDir) : [];
    for (const existingFile of existingFiles) {
      if (existingFile.startsWith(`${slot}.`)) {
        await unlink(path.join(imagesDir, existingFile));
      }
    }

    // 确定文件扩展名
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${slot}.${ext}`;
    const filePath = path.join(imagesDir, filename);

    // 写入文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const url = `/images/inkmon/${nameEn}/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      message: `图片上传成功`,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inkmon/[nameEn]/images?slot=main
 * 删除 InkMon 图片
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { nameEn } = await params;
    const { searchParams } = new URL(request.url);
    const slot = searchParams.get("slot");

    if (!slot || !VALID_SLOTS.includes(slot as ImageSlot)) {
      return NextResponse.json(
        { error: `无效的图片槽位，有效值: ${VALID_SLOTS.join(", ")}` },
        { status: 400 }
      );
    }

    const imagesDir = path.join(process.cwd(), "public", "images", "inkmon", nameEn);

    if (!existsSync(imagesDir)) {
      return NextResponse.json({ error: "图片目录不存在" }, { status: 404 });
    }

    // 查找并删除该槽位的图片
    const files = await readdir(imagesDir);
    let deleted = false;

    for (const file of files) {
      if (file.startsWith(`${slot}.`)) {
        await unlink(path.join(imagesDir, file));
        deleted = true;
        break;
      }
    }

    if (!deleted) {
      return NextResponse.json({ error: "图片不存在" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `图片已删除`,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
