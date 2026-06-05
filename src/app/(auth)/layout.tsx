import { ToastProvider, ToastViewport } from "@/shared/ui/primitives";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <div className="flex min-h-full items-center justify-center bg-background px-6 py-10 text-foreground">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <ToastViewport />
    </ToastProvider>
  );
}
