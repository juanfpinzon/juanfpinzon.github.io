/**
 * Earlier work, publications and learning credentials.
 *
 * Source: inventory §1 (legacy-site migration decisions) and §3 (exact
 * publication, dataset and credential wording). The wording rules that matter
 * most, because the old site or the August CV got them wrong:
 * - the NER paper is a 2020 journal article in *Procesamiento del Lenguaje
 *   Natural* 65, not "SEPLN 2021" and not "a well known NLP conference";
 * - the dataset is "545 CVs with NER annotations (as documented in the dataset
 *   README)", not "500";
 * - the market paper is "AGI 2022 proceedings (published 2023)";
 * - DICOM2STL credits its upstream author and license;
 * - the U-NET work is a client proof of concept, not a deployed clinical product;
 * - course credentials are text only, exactly titled, and never a whole course
 *   when only Unit 1 was completed.
 */

export type WorkLink = {
  label: string;
  href: string;
};

/** One "Selected work and research" card: problem → Juan's role → result → link. */
export type WorkCard = {
  id: string;
  title: string;
  /** Where and when, e.g. "Novel Software Systems · 2020". */
  context: string;
  problem: string;
  role: string;
  result: string;
  links: WorkLink[];
  /** Optional illustration; `alt` must describe what the image shows. */
  image?: {
    src: string;
    width: number;
    height: number;
    alt: string;
    caption: string;
  };
};

export const selectedWork: WorkCard[] = [
  {
    id: "ner",
    title: "Neural NER for resume data extraction",
    context: "Novel Software Systems · team research · 2020",
    problem:
      "A client needed a resume parser that recognizes entities such as names, degrees, experience and skills.",
    role:
      "First author. Built and evaluated Flair/PyTorch BiLSTM-CRF sequence taggers with stacked FastText and contextual string embeddings, on a dataset the team annotated.",
    result:
      "The models did not meet the client's production expectations, and the paper reports that limit honestly. Published as a journal article in Procesamiento del Lenguaje Natural 65 (2020), with a public dataset of 545 CVs with NER annotations (as documented in the dataset README).",
    links: [
      {
        // The journal's HTTPS certificate does not match its host (inventory §1),
        // so the working link is plain HTTP.
        label: "Paper (Procesamiento del Lenguaje Natural, 2020)",
        href: "http://journal.sepln.org/sepln/ojs/ojs/index.php/pln/article/view/6276",
      },
      { label: "Dataset repository", href: "https://github.com/juanfpinzon/resume-dataset" },
      {
        label: "NER training notebook",
        href: "https://github.com/juanfpinzon/juanfpinzon.github.io/blob/master/assets/notebooks/ner-training-template.ipynb",
      },
    ],
  },
  {
    id: "market",
    title: "Causal analysis of time series for market prediction",
    context: "Novel Software Systems · coauthor · 2022",
    problem:
      "Predict cryptocurrency market movement from order-book, market and social-sentiment time series.",
    role:
      "Coauthor. Co-developed the models (LSTM ensembles, XGBoost, Random Forest) and contributed to a PyTorch backtesting framework.",
    result: "Published in the AGI 2022 proceedings (published 2023), Springer LNCS, pp. 30–39.",
    links: [
      { label: "DOI 10.1007/978-3-031-19907-3_4", href: "https://doi.org/10.1007/978-3-031-19907-3_4" },
      { label: "Preprint arXiv:2204.12928", href: "https://arxiv.org/abs/2204.12928" },
    ],
  },
  {
    id: "dicom2stl",
    title: "DICOM2STL: CT scans to 3D meshes",
    context: "Novel Software Systems · client work for Autobone",
    problem:
      "A cranial-implant product needed more than a thousand skull CT scans turned into STL surface meshes for model training.",
    role:
      "Adapted and extended the open-source dicom2stl by David T. Chen (NIAID), licensed Apache-2.0 per its README: a cranial-tuned pipeline, skull extraction, a DICOM organizer, CLI flags and a notebook. Autobone and its implant-prediction model belong to the client; I do not own them.",
    result:
      "Used to convert 1,000+ cranial CT scans into STL meshes for the client's implant-model training data.",
    links: [
      { label: "My adapted dicom2stl repository", href: "https://github.com/juanfpinzon/dicom2stl" },
      { label: "Upstream dicom2stl by David T. Chen", href: "https://github.com/dave3d/dicom2stl" },
    ],
  },
  {
    id: "unet",
    title: "U-NET spine vertebra detection",
    context: "Novel Software Systems · client proof of concept · H1 2020",
    problem:
      "Detect each vertebra on thoracic and lumbar spine X-rays and measure its angle.",
    role:
      "End to end: extracted spine X-rays from a database of more than 100,000 medical images, converted DICOM to PNG, cleaned and filtered them, classified them with or without implants (a basic CNN), hand-annotated vertebra masks, trained a U-NET (PyTorch + fast.ai), and wrote OpenCV post-processing that draws each vertebra and measures its angle.",
    result:
      "A proof of concept for a client, not a deployed clinical product. The client owns the data and the product; the data was anonymized before it reached me.",
    links: [],
    image: {
      src: "/images/unet-spine-vertebrae.webp",
      width: 716,
      height: 801,
      alt: "Front-view spine X-ray with the model's output drawn on top: each detected vertebra is shaded green, with a blue centre point and a red line along its measured angle. The spine curves to one side.",
      caption: "Model output on an anonymized X-ray: detected vertebrae and their measured angles.",
    },
  },
];

/** The archive line under the cards (inventory §1: "Archive", no image). */
export const archive = {
  label: "CS231n self-paced solutions (Stanford, Spring 2019 assignments)",
  href: "https://github.com/juanfpinzon/CS231n-self-paced",
  note: "From-scratch NumPy and PyTorch implementations. Stanford owns the course content.",
} as const;

/** Full citations for /about (inventory §3, exact wording). */
export const publications = [
  {
    id: "ner-2020",
    citation:
      "J. F. Pinzon, S. Krainikovsky, R. Samarev. “Limitations of Neural Networks-based NER for Resume Data Extraction.” Procesamiento del Lenguaje Natural 65 (2020), pp. 53–58.",
    note: "First author.",
    links: [
      { label: "Journal article page", href: "http://journal.sepln.org/sepln/ojs/ojs/index.php/pln/article/view/6276" },
      { label: "545 CVs with NER annotations (as documented in the dataset README)", href: "https://github.com/juanfpinzon/resume-dataset" },
    ],
  },
  {
    id: "agi-2022",
    citation:
      "A. Kolonin, A. Raheman, M. Vishwas, I. Ansari, J. Pinzon, A. Ho. “Causal Analysis of Generic Time Series Data Applied for Market Prediction.” AGI 2022 proceedings (published 2023), LNCS, pp. 30–39.",
    note: "Coauthor.",
    links: [
      { label: "DOI 10.1007/978-3-031-19907-3_4", href: "https://doi.org/10.1007/978-3-031-19907-3_4" },
      { label: "Preprint arXiv:2204.12928 (2022)", href: "https://arxiv.org/abs/2204.12928" },
    ],
  },
] as const;

/**
 * Learning credentials: text only (inventory §3). No certificate image, no
 * "Verify" button and no credential ID, because neither award prints a public
 * verification URL. Each one points at the ProcureRAG evidence it supports.
 * Microsoft Azure AI Engineer Associate is still in progress, so it is not
 * listed here (it stays on the CV as "in progress").
 */
export const credentials = [
  {
    id: "bootdev-rag",
    text: "Boot.dev — Learn Retrieval Augmented Generation, certificate of completion, 18 September 2026.",
    evidence: { label: "Applied in ProcureRAG's retrieval progression", href: "/procurerag#progression" },
  },
  {
    id: "hf-mcp-unit-1",
    text: "Hugging Face — The MCP Course, Unit 1: Fundamentals of MCP, certificate of achievement, 22 October 2026.",
    evidence: { label: "Applied in ProcureRAG's local MCP tool", href: "/procurerag#progression" },
  },
] as const;

/**
 * Secondary personal project (inventory §2.1, wording confirmed by Juan).
 * The upstream URLs for OpenClaw and Hermes Agent are still an open inventory
 * question, so the credit is in text without links.
 */
export const secondaryProject = {
  title: "OpenClaw / Hermes: self-hosted AI agent setup",
  context: "Personal project · 2026–present · self-hosted homelab",
  text: "Configured and extended the open-source OpenClaw and Hermes Agent frameworks (credited upstream) with personally authored Python automations: Linear, GitHub and Telegram connectors, an LLM-based pull-request review watchdog, news and newsletter pipelines, a Markdown shared-memory vault and context-engineering conventions for coding agents.",
  boundary: "I wrote the listed automations; I did not write the frameworks.",
  links: [
    { label: "Newsletter pipeline (AndyJuan_Newsletter)", href: "https://github.com/juanfpinzon/AndyJuan_Newsletter" },
    { label: "News scout (DP_news_scout)", href: "https://github.com/juanfpinzon/DP_news_scout" },
  ],
} as const;
