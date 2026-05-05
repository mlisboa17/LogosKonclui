import type { ItemType } from "@/lib/store/types";

/**
 * Modelos prontos focados em conveniência / varejo (freezers, gôndolas, limpeza).
 * O gestor importa em Modelos e pode editar em "Editar".
 */
export type DemoTemplateItem = {
  title: string;
  itemType: ItemType;
  isCritical: boolean;
  weight: number;
  /** Evidência fotográfica obrigatória mesmo se o tipo for sim/número/texto */
  requiresPhoto?: boolean;
};

export type DemoTemplate = {
  name: string;
  sector: string;
  description: string;
  items: DemoTemplateItem[];
};

export const DEMO_CHECKLIST_TEMPLATES: DemoTemplate[] = [
  {
    name: "Checklist semanal – Conveniência (loja)",
    sector: "Conveniência",
    description:
      "Foco semanal: estoque, validade, preços, limpeza profunda, equipamentos e equipe. Baseado em boas práticas de operação de loja e rotinas de conveniência (limpeza, gôndolas, equipamentos).",
    items: [
      { title: "Validade: checar lanches, iogurtes e pães com vencimento crítico", itemType: "boolean", isCritical: true, weight: 2 },
      {
        title: "Reabastecer gôndolas, geladeiras e ilhas (giro alto)",
        itemType: "boolean",
        isCritical: false,
        weight: 1,
        requiresPhoto: true,
      },
      { title: "Conferir etiquetas de preço e destaque de promoções", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Montar/ajustar displays de ofertas e PDV", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Estoque mínimo de embalagens e insumos de limpeza", itemType: "boolean", isCritical: false, weight: 1 },
      {
        title: "Limpeza interna/externa de freezers e geladeiras de bebidas",
        itemType: "boolean",
        isCritical: true,
        weight: 2,
        requiresPhoto: true,
      },
      { title: "Higienizar máquina de café, forno/estufa de salgados", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Foto da gôndola de pães/salgados (evidência validade/reposição)", itemType: "photo", isCritical: false, weight: 1 },
      { title: "Piso, fachada, banheiros e lixeiras (padrão de loja)", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Balcão, checkout e fila organizados", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Testar checkouts, iluminação e câmaras frias (anomalias?)", itemType: "boolean", isCritical: true, weight: 2 },
      {
        title: "Temperatura registada da câmara fria principal (°C) — foto do display",
        itemType: "number",
        isCritical: true,
        weight: 2,
        requiresPhoto: true,
      },
      { title: "Fachada: cartazes, limpeza de vidros e lâmpadas queimadas", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Banheiros com papel, sabonete e odor aceitável", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Breve alinhamento com equipe (metas / feedback)", itemType: "text", isCritical: false, weight: 1 },
      { title: "Uniforme e higiene pessoal da equipe OK", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Conferência de segurança / procedimentos de caixa", itemType: "boolean", isCritical: true, weight: 2 },
    ],
  },
  {
    name: "Check-list gerencial – Operação da loja",
    sector: "Gestão",
    description:
      "Visão gerencial: indicadores, equipe e conformidade. Inspirado em modelos tipo “check-list gerencial” para rotina de supervisão.",
    items: [
      { title: "Metas do dia/semana comunicadas à equipe", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Registrar ocorrências ou reclamações de clientes (texto)", itemType: "text", isCritical: false, weight: 1 },
      { title: "Conferir perdas, quebras e descarte registrados", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Escalas de pessoal e substituições cobertas", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Treinamento rápido ou recapitulação de procedimento", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Verificar alarmes, câmaras e áreas restritas", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Sinalizar ao gestor regional se houver risco ou não conformidade grave", itemType: "boolean", isCritical: true, weight: 2 },
    ],
  },
  {
    name: "Abertura loja (conveniência)",
    sector: "Conveniência",
    description: "Rotina de abertura padronizada: loja pronta para o primeiro cliente.",
    items: [
      { title: "Iluminação, letreiros e música ambiente", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Cofre e numerário inicial conferidos", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Repor bebidas e impulso na linha de caixa", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Limpeza rápida do piso e área do caixa", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Cheiro e temperatura das geladeiras OK", itemType: "boolean", isCritical: true, weight: 2 },
    ],
  },
  {
    name: "Limpeza profunda – Conveniência",
    sector: "Conveniência",
    description: "Bloco dedicado a higiene profunda (freezers, fornos, banheiros).",
    items: [
      { title: "Degelo / limpeza de condensadores conforme procedimento", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Área de preparo e utensílios sanitizados", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Lixos segregados e sacos substituídos", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Foto da área crítica após limpeza (opcional evidência)", itemType: "photo", isCritical: false, weight: 1 },
    ],
  },
  {
    name: "Turno posto – bombas e praça",
    sector: "Posto",
    description: "Segurança e padrão visual na praça de abastecimento.",
    items: [
      { title: "Preços no totem/bomba conferidos", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Mangueiras e bicos sem vazamentos visíveis", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Parada de emergência testada / acessível", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Área de carga e circulação sem obstruções", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Extintores no prazo e lacres OK", itemType: "boolean", isCritical: true, weight: 2 },
    ],
  },
  {
    name: "Fechamento cozinha (restaurante)",
    sector: "Restaurante",
    description: "Encerramento seguro da produção.",
    items: [
      { title: "Chamas, fryers e equipamentos desligados corretamente", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Câmaras frias com temperatura registrada (°C)", itemType: "number", isCritical: true, weight: 2 },
      { title: "Limpeza chão, ralos e superfícies de trabalho", itemType: "boolean", isCritical: false, weight: 1 },
      { title: "Lixo orgânico e reciclável segregados; saída trancada", itemType: "boolean", isCritical: true, weight: 2 },
    ],
  },
  {
    name: "Abertura / fechamento de caixa",
    sector: "Gestão",
    description: "Controle de numerário e conferência de turno.",
    items: [
      { title: "Conferência de abertura/fechamento com segundo conferente quando aplicável", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Valores conferidos com sistema / sangrias registradas", itemType: "boolean", isCritical: true, weight: 2 },
      { title: "Observações do turno (texto livre)", itemType: "text", isCritical: false, weight: 1 },
    ],
  },
];
