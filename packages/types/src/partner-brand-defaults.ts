const PARTNER_BRAND_LOGO_FILES: Record<string, string> = {
  ultratech: "ultratech.png",
  ambuja: "ambuja_horizontal_official.png",
  "jk-cement": "jk_cement.png",
  "shree-cement": "shree_cement.png",
  astral: "astral_pipes.png",
  supreme: "supreme.png",
  "finolex-pipes": "finolex_pipes.png",
  "finolex-cables": "finolex_cables.png",
  zoloto: "zoloto.png",
  polycab: "polycab.png",
  havells: "havells.png",
  "asian-paints": "asian_paints_official.jpg",
  "birla-opus": "birla_opus.png",
  jaquar: "jaquar.png",
  cera: "cera_official_transparent.png",
  "tata-tiscon": "tata-tiscon.svg",
  "myk-laticrete": "myk_laticrete.png",
};

/** Default artwork for seeded partner entries; saved logoUrl values take precedence. */
export function partnerBrandDefaultLogoUrl(id: string): string | null {
  const file = PARTNER_BRAND_LOGO_FILES[id.trim().toLocaleLowerCase()];
  return file ? `/images/brands/${file}` : null;
}
