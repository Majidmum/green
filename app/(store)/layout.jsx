import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingFruits from "@/components/animations/FloatingFruits";
import FavoritesLoader from "@/components/store/FavoritesLoader";

export default function StoreLayout({ children }) {
  return (
    <>
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Перейти к содержимому
      </a>
      <FloatingFruits />
      <Header />
      <main id="content" className="min-h-[60vh]">{children}</main>
      <Footer />
      <FavoritesLoader />
    </>
  );
}
