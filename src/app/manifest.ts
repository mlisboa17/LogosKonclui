import type { MetadataRoute } from "next";

/** PWA: instalável “Adicionar ao ecrã”. Ícone SVG funciona na maioria dos browsers; acrescente PNG 192/512 em /public/icons/ se precisar iOS antigo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Logos Konclui",
    short_name: "Konclui",
    description:
      "Checklists operacionais para conveniência, posto e restaurante — execuções, prazos e equipa.",
    start_url: "/operador",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fafaf9",
    theme_color: "#047857",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
