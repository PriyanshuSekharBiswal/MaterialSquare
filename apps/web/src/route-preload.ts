/** Start the small route chunk request when a visitor points to a page link. */
export function prefetchRoute(path: string): void {
  const pathname = path.split("?", 1)[0];
  switch (pathname) {
    case "/": void import("./pages/HomePage"); break;
    case "/marketplace": void import("./pages/MarketplacePage"); break;
    case "/why-us": void import("./pages/WhyUsPage"); break;
    case "/guides": void import("./pages/EngineeringGuidesPage"); break;
    case "/get-quote": void import("./pages/GetQuotePage"); break;
    case "/contact": void import("./pages/ContactPage"); break;
    case "/blogs":
    case "/experts":
    case "/locations": void import("./pages/BusinessContentPages"); break;
    case "/privacy":
    case "/terms": void import("./pages/LegalPages"); break;
    case "/material-list": void import("./pages/MaterialListPage"); break;
    case "/account": void import("./pages/CustomerAccountPage"); break;
    default:
      if (pathname.startsWith("/product/")) void import("./pages/ProductDetailPage");
  }
}
