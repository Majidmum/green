const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/manager", "/api", "/auth", "/profile", "/orders", "/checkout", "/cart", "/favorites"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
