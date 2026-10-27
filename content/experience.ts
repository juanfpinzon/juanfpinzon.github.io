/**
 * Career history, from the corrected October 2026 CV.
 *
 * Inventory §2 is the rulebook for this file:
 * - titles are the exact held titles ("Data Product Management Associate
 *   Manager", not "AI Engineer");
 * - employer facts are **CV-reported**: they describe Juan's own role and never
 *   link internal dashboards, systems or data;
 * - production ML (PepsiCo, 2022–), applied research and client proofs of
 *   concept (Novel Software Systems, 2019–2022) and the independent ProcureRAG
 *   project stay three separate things. The current role prototypes agentic
 *   AI; it is not described as shipped enterprise LLM production.
 */

export type Role = {
  title: string;
  employer: string;
  /** Short context shown after the employer on the home page. */
  area?: string;
  start: string;
  end: string;
  /** Compact year range for the home summary rows, e.g. "2022–2026". */
  years: string;
  location: string;
  /** Approved CV bullets, shown on /about. */
  highlights: string[];
};

/** The three roles the home page summarizes (DESIGN §3, recruiter path step 2). */
export const recentRoles: Role[] = [
  {
    title: "Data Product Management Associate Manager",
    employer: "PepsiCo",
    area: "Digital Procurement",
    start: "Jan 2026",
    end: "present",
    years: "2026–present",
    location: "Barcelona, Spain",
    highlights: [
      "Define and prototype the agentic AI roadmap for Digital Procurement (RAG-based knowledge-management agents and RaaS solutions) using Copilot declarative agents and PepsiCo's internal AI platform; contribute to solution architecture and requirements for retrieval and orchestration design.",
      "Built Python data pipelines that automate HR data refreshes, so adoption KPIs are reported accurately to senior leadership across Digital Procurement initiatives.",
    ],
  },
  {
    title: "Data Science Sr. Analyst",
    employer: "PepsiCo",
    area: "production forecasting",
    start: "May 2022",
    end: "Jan 2026",
    years: "2022–2026",
    location: "Barcelona, Spain",
    highlights: [
      "Supported PepsiCo's first Integrated Business Planning (IBP) implementation (Iberia, 2022–2024), operating ML forecasting (XGBoost, LightGBM, ensembles) weekly on millions of multi-country rows; co-led the Sustain model design covering governance, documentation, monitoring and retraining. Stack: Azure Databricks, PySpark, Azure Data Factory.",
      "Designed a cross-functional analytics solution integrating Spend, R&D and bill-of-materials data, with a Power BI dashboard that cut analysis time from 4+ weeks to near-real-time (Beyond Spend, Procurement Excellence, 2024–2025).",
      "Co-led the European rollout of a global spend-visibility platform across 100+ procurement members, then took a global stretch assignment owning transformation, change management and adoption KPIs (SpendHQ, 2025).",
    ],
  },
  {
    title: "Machine Learning Researcher / DL Consultant",
    employer: "Novel Software Systems",
    area: "applied research",
    start: "Aug 2019",
    end: "May 2022",
    years: "2019–2022",
    location: "Novosibirsk, Russia",
    highlights: [
      "Deep learning consultant in a global ML/DL team at a bioinformatics software company, delivering applied AI research and client proofs of concept across biomedical/life-sciences, HR tech and financial sectors.",
      "Built and evaluated neural NER models (Flair/PyTorch BiLSTM-CRF sequence taggers with stacked FastText and contextual string embeddings) for resume parsing, and found that NER alone was insufficient without significant post-processing: first-author journal article (2020) and a public annotated dataset.",
      "Co-developed ML/DL models (LSTM ensembles, XGBoost, Random Forest) for cryptocurrency market prediction from order-book, market and social-sentiment data, and contributed to a PyTorch backtesting framework: AGI 2022 proceedings (published 2023).",
    ],
  },
];

/**
 * Earlier roles (2014–2019). The home page compresses them into one line that
 * links to /about; /about lists them in full. STF Group is the procurement root
 * of ProcureRAG (inventory §2).
 */
export const earlierRoles: Role[] = [
  {
    title: "Business / Systems Analyst",
    employer: "ITMS",
    start: "Nov 2018",
    end: "Aug 2019",
    years: "2018–2019",
    location: "Novosibirsk, Russia",
    highlights: [
      "Gathered requirements and supported QA for blockchain and cryptocurrency projects, translating stakeholder needs into system specifications.",
    ],
  },
  {
    title: "Production Planning Analyst",
    employer: "Aritex de Colombia S.A.S.",
    start: "Aug 2016",
    end: "Dec 2016",
    years: "2016",
    location: "Cali, Colombia",
    highlights: [
      "Established the production-programming function and automated ERP data extraction and reporting for real-time performance monitoring.",
    ],
  },
  {
    title: "Procurement & Inventory Analyst",
    employer: "STF Group",
    start: "Jan 2014",
    end: "Jul 2016",
    years: "2014–2016",
    location: "Cali, Colombia",
    highlights: [
      "Progressive roles across master data, inventory and textile procurement; introduced automated reporting and reduced obsolete inventory by 20%.",
    ],
  },
];

export const education = [
  {
    degree: "M.Sc. Big Data Analytics & AI",
    school: "Novosibirsk State University (NSU)",
    location: "Novosibirsk, Russia",
    years: "2017–2019",
  },
  {
    degree: "B.B.A. Business Administration",
    school: "Universidad ICESI",
    location: "Cali, Colombia",
    years: "2015",
  },
] as const;

export const languages = [
  "Spanish (native)",
  "English (full professional)",
  "Russian (elementary)",
] as const;
