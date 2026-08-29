import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Anna CMS — Content Administration",
  description: "Private content administration for Anna the Counselor.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

