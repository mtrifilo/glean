export const NOISE_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "canvas",
  "svg",
  "nav",
  "footer",
  "aside",
  "button",
  "input",
  "select",
  "textarea",
  "form",
  "meta",
  "link",
]);

export const AGGRESSIVE_NOISE_TAGS = new Set([
  "header",
  "dialog",
]);

export const NOISE_ROLE_VALUES = new Set([
  "navigation",
  "banner",
  "complementary",
  "search",
  "contentinfo",
]);

export const NOISE_KEYWORDS = [
  "advert",
  "ads",
  "banner",
  "cookie",
  "consent",
  "disclosure",
  "footer",
  "header",
  "legal",
  "menu",
  "modal",
  "nav",
  "newsletter",
  "popup",
  "promo",
  "recommend",
  "related",
  "share",
  "sidebar",
  "social",
  "sponsor",
  "subscribe",
  "toolbar",
  "tracking",
];

export const AGGRESSIVE_NOISE_KEYWORDS = [
  "author",
  "breadcrumb",
  "comment",
  "community",
  "pagination",
  "tag-cloud",
  "widget",
];

export const GLOBAL_ALLOWED_ATTRIBUTES = new Set(["lang"]);

export const TAG_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "title"]),
  source: new Set(["src", "srcset", "type"]),
  th: new Set(["colspan", "rowspan"]),
  td: new Set(["colspan", "rowspan"]),
};

export const NOISY_ATTRIBUTE_PREFIXES = [
  "data-",
  "aria-",
  "on",
  "x-",
  "ng-",
];

export const ABSOLUTE_URL_PROTOCOLS = ["http:", "https:", "mailto:"];
