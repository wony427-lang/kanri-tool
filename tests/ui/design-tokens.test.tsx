import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemeSample } from "@/app/(app)/dev/theme/ThemeSample";

const GLOBALS_CSS = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf-8",
);

const SEMANTIC_COLOR_VARS = [
  "--primary",
  "--primary-foreground",
  "--success",
  "--success-foreground",
  "--warning",
  "--warning-foreground",
  "--error",
  "--error-foreground",
  "--muted",
  "--muted-foreground",
] as const;

const LAYOUT_TOKEN_VARS = [
  "--spacing-1",
  "--spacing-2",
  "--spacing-4",
  "--spacing-6",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--shadow-sm",
  "--shadow-md",
  "--font-size-sm",
  "--font-size-base",
  "--font-size-lg",
  "--line-height-tight",
  "--line-height-normal",
  "--font-weight-medium",
  "--font-weight-semibold",
] as const;

function expectCssVarDefined(css: string, varName: string) {
  expect(css).toMatch(
    new RegExp(
      `${varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*[^;]+;`,
    ),
  );
}

describe("design tokens (task 3.1)", () => {
  it("defines semantic color tokens on :root", () => {
    for (const varName of SEMANTIC_COLOR_VARS) {
      expectCssVarDefined(GLOBALS_CSS, varName);
    }
  });

  it("defines spacing, radius, shadow, and typography tokens on :root", () => {
    for (const varName of LAYOUT_TOKEN_VARS) {
      expectCssVarDefined(GLOBALS_CSS, varName);
    }
  });

  it("switches token values under prefers-color-scheme: dark", () => {
    expect(GLOBALS_CSS).toMatch(
      /@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)/,
    );
    const darkBlock =
      GLOBALS_CSS.split("@media (prefers-color-scheme: dark)")[1] ?? "";
    for (const varName of ["--background", "--primary", "--muted"]) {
      expectCssVarDefined(darkBlock, varName);
    }
  });

  it("maps CSS variables to Tailwind utilities via @theme inline", () => {
    expect(GLOBALS_CSS).toMatch(/--color-primary:\s*var\(--primary\)/);
    expect(GLOBALS_CSS).toMatch(/--color-muted:\s*var\(--muted\)/);
    expect(GLOBALS_CSS).toMatch(/--color-success:\s*var\(--success\)/);
    expect(GLOBALS_CSS).toMatch(/--color-warning:\s*var\(--warning\)/);
    expect(GLOBALS_CSS).toMatch(/--color-error:\s*var\(--error\)/);
    expect(GLOBALS_CSS).toMatch(/--radius-md:\s*var\(--radius-md\)/);
    expect(GLOBALS_CSS).toMatch(/--shadow-sm:\s*var\(--shadow-sm\)/);
    expect(GLOBALS_CSS).toMatch(/--text-base:\s*var\(--font-size-base\)/);
  });

  it("documents the no-color-literal styling convention", () => {
    expect(GLOBALS_CSS).toMatch(/色リテラル|color literal|トークン経由/i);
  });

  it("ThemeSample exposes token-backed utility classes", () => {
    render(<ThemeSample />);

    expect(screen.getByTestId("primary-text")).toHaveClass("text-primary");
    expect(screen.getByTestId("muted-surface")).toHaveClass("bg-muted");
    expect(screen.getByTestId("success-badge")).toHaveClass("bg-success");
    expect(screen.getByTestId("warning-badge")).toHaveClass("bg-warning");
    expect(screen.getByTestId("error-badge")).toHaveClass("bg-error");
  });
});
