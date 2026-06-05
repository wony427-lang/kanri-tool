import { ThemeSample } from "./ThemeSample";

export default function ThemeDevPage() {
  return (
    <div className="min-h-full bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <ThemeSample />
      </div>
    </div>
  );
}
