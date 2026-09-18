import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const filePath = path.join(process.cwd(), "openapi", "umoja.yaml");
  const content = await readFile(filePath, "utf8");
  return new NextResponse(content, {
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
