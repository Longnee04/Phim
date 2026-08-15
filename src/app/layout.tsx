import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIAssistant from "@/components/AIAssistant";
import { ChangelogModal } from "@/components/ChangelogModal";
import MovieModal from "@/components/MovieModal";
import { ModalProvider } from "@/context/ModalContext";

export const metadata: Metadata = {
  title: "LPhim - Xem Phim Online Miễn Phí Mới Nhất HD Vietsub",
  description: "LPhim - Trang web xem phim online miễn phí chất lượng cao HD Vietsub. Kho phim lẻ, phim bộ, hoạt hình phong phú cập nhật liên tục tại LPhim.",
  keywords: ["lphim", "xem phim lphim", "xem phim online", "phim vietsub", "phim thuyet minh", "phim le", "phim bo", "longphim"],
  openGraph: {
    title: "LPhim - Xem Phim Online Miễn Phí Mới Nhất HD Vietsub",
    description: "LPhim - Trang web xem phim online miễn phí chất lượng cao HD Vietsub. Kho phim lẻ, phim bộ, hoạt hình phong phú cập nhật liên tục tại LPhim.",
    url: "https://phim-three.vercel.app/",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ModalProvider>
          <Navbar />
          {children}
          <Footer />
          <MovieModal />
          <AIAssistant />
          <ChangelogModal />
        </ModalProvider>
      </body>
    </html>
  );
}
