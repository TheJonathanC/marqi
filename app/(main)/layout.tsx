import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LauncherScripts } from "@/components/LauncherScripts";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <LauncherScripts />
    </>
  );
}
