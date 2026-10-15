export type Proficiency = "beginner" | "intermediate" | "advanced";
export type NodeStatus = "completed" | "in-progress" | "locked" | "unlocked";

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedHours: number;
  hoursLogged: number;
  prerequisites: string[];
  learningOutcomes: string[];
  proficiencyAchieved?: Proficiency;
}

export interface UserSkill {
  skillId: string;
  proficiency: Proficiency;
}

export interface Role {
  id: string;
  title: string;
  demandScore: number; // 1-100
  requiredSkills: { skillId: string; required: boolean }[];
  avgSalary: string;
  openings: number;
}

export interface PathNode {
  skillId: string;
  order: number;
  status: NodeStatus;
  estimatedHours: number;
  rationale: string;
}

export interface Path {
  id: string;
  roleId: string;
  name: string;
  totalHours: number;
  nodes: PathNode[];
  demandScore: number;
  speedScore: number;
  relevanceScore: number;
}

export interface ProgressEntry {
  skillId: string;
  completedAt: string;
}

// ── Skills ──────────────────────────────────────────────────────────────────

export const skills: Skill[] = [
  {
    id: "py", name: "Python", category: "Programming",
    description: "Core Python programming, data structures, and OOP.",
    estimatedHours: 40, hoursLogged: 40,
    prerequisites: [],
    proficiencyAchieved: "intermediate",
    learningOutcomes: [
      "Variables, control flow, and functions",
      "Lists, dicts, sets, and comprehensions",
      "Object-oriented programming and class design",
      "File I/O, exceptions, and context managers",
      "Writing reusable modules and packages",
      "Virtual environments and dependency management",
    ],
  },
  {
    id: "sql", name: "SQL", category: "Data",
    description: "Relational databases, queries, joins, and aggregations.",
    estimatedHours: 24, hoursLogged: 24,
    prerequisites: [],
    proficiencyAchieved: "beginner",
    learningOutcomes: [
      "SELECT, WHERE, ORDER BY, and LIMIT clauses",
      "INNER, LEFT, and OUTER JOIN patterns",
      "GROUP BY aggregations and HAVING filters",
      "Subqueries and common table expressions (CTEs)",
      "Schema design and normalisation basics",
    ],
  },
  {
    id: "stats", name: "Statistics", category: "Math",
    description: "Descriptive and inferential statistics, probability theory.",
    estimatedHours: 32, hoursLogged: 32,
    prerequisites: [],
    proficiencyAchieved: "beginner",
    learningOutcomes: [
      "Measures of central tendency and spread",
      "Probability distributions: normal, binomial, Poisson",
      "Hypothesis testing and p-values",
      "Confidence intervals and effect sizes",
      "Correlation vs. causation and Simpson's paradox",
      "Bayesian reasoning fundamentals",
    ],
  },
  {
    id: "ml", name: "Machine Learning", category: "AI/ML",
    description: "Supervised/unsupervised learning, model evaluation.",
    estimatedHours: 60, hoursLogged: 22,
    prerequisites: ["py", "stats"],
    learningOutcomes: [
      "Linear and logistic regression from scratch",
      "Decision trees, random forests, and gradient boosting",
      "Model evaluation: precision, recall, ROC-AUC",
      "Cross-validation and hyperparameter tuning",
      "Clustering: k-means, DBSCAN, hierarchical",
      "Dimensionality reduction: PCA, t-SNE",
    ],
  },
  {
    id: "dl", name: "Deep Learning", category: "AI/ML",
    description: "Neural networks, CNNs, RNNs, transformers.",
    estimatedHours: 80, hoursLogged: 0,
    prerequisites: ["ml"],
    learningOutcomes: [
      "Feedforward networks, activations, and backpropagation",
      "Convolutional neural networks for image tasks",
      "Recurrent networks, LSTMs, and sequence modelling",
      "Attention mechanism and transformer architecture",
      "Transfer learning and fine-tuning pretrained models",
      "Regularisation: dropout, batch norm, weight decay",
    ],
  },
  {
    id: "nlp", name: "NLP", category: "AI/ML",
    description: "Text processing, embeddings, LLMs, fine-tuning.",
    estimatedHours: 50, hoursLogged: 0,
    prerequisites: ["dl"],
    learningOutcomes: [
      "Tokenisation, stemming, and lemmatisation",
      "TF-IDF and word2vec embeddings",
      "Named entity recognition and dependency parsing",
      "Fine-tuning BERT-class models on custom tasks",
      "Retrieval-augmented generation (RAG) pipelines",
      "Prompt engineering and instruction tuning",
    ],
  },
  {
    id: "da", name: "Data Analysis", category: "Data",
    description: "Pandas, NumPy, exploratory data analysis.",
    estimatedHours: 28, hoursLogged: 0,
    prerequisites: ["py", "sql"],
    learningOutcomes: [
      "DataFrame manipulation: indexing, merging, reshaping",
      "Handling missing values and outliers",
      "NumPy array operations and broadcasting",
      "Exploratory data analysis (EDA) workflows",
      "Time-series resampling and rolling statistics",
    ],
  },
  {
    id: "viz", name: "Data Visualization", category: "Data",
    description: "Matplotlib, Seaborn, Plotly, Tableau.",
    estimatedHours: 20, hoursLogged: 0,
    prerequisites: ["da"],
    learningOutcomes: [
      "Choosing the right chart type for your data",
      "Matplotlib figure/axes API and styling",
      "Statistical plots with Seaborn",
      "Interactive dashboards with Plotly Express",
      "Accessibility and colorblind-safe palettes",
    ],
  },
  {
    id: "cloud", name: "Cloud Platforms", category: "Engineering",
    description: "AWS/GCP/Azure fundamentals, deployment, storage.",
    estimatedHours: 36, hoursLogged: 0,
    prerequisites: ["py"],
    learningOutcomes: [
      "IAM roles, policies, and least-privilege access",
      "Object storage: S3, GCS bucket patterns",
      "Compute: EC2, Cloud Run, Lambda serverless",
      "Managed databases and connection pooling",
      "Infrastructure as code with Terraform basics",
      "Cost monitoring and resource tagging",
    ],
  },
  {
    id: "mlops", name: "MLOps", category: "Engineering",
    description: "Model deployment, CI/CD pipelines, monitoring.",
    estimatedHours: 44, hoursLogged: 0,
    prerequisites: ["ml", "cloud"],
    learningOutcomes: [
      "Experiment tracking with MLflow or W&B",
      "Feature stores and data versioning with DVC",
      "Model serving: FastAPI + Docker containers",
      "CI/CD pipelines for model retraining",
      "Drift detection and production monitoring",
      "A/B testing and shadow deployment patterns",
    ],
  },
  {
    id: "fe", name: "React & TypeScript", category: "Frontend",
    description: "Component architecture, hooks, state management.",
    estimatedHours: 50, hoursLogged: 50,
    prerequisites: [],
    proficiencyAchieved: "advanced",
    learningOutcomes: [
      "TypeScript generics, utility types, and strict mode",
      "React component patterns: composition, HOCs, render props",
      "State management: useState, useReducer, Context API",
      "Performance: useMemo, useCallback, React.memo",
      "Data fetching with React Query or SWR",
      "Testing with React Testing Library and Vitest",
    ],
  },
  {
    id: "be", name: "Node.js & APIs", category: "Backend",
    description: "Express, REST API design, authentication.",
    estimatedHours: 40, hoursLogged: 0,
    prerequisites: ["py"],
    learningOutcomes: [
      "Express routing, middleware, and error handling",
      "RESTful API design and OpenAPI documentation",
      "JWT authentication and refresh token rotation",
      "Input validation and sanitisation",
      "Rate limiting and security headers",
    ],
  },
  {
    id: "pg", name: "PostgreSQL", category: "Data",
    description: "Advanced queries, indexing, performance tuning.",
    estimatedHours: 30, hoursLogged: 0,
    prerequisites: ["sql"],
    learningOutcomes: [
      "EXPLAIN ANALYZE and query planning",
      "B-tree, GIN, and GiST index strategies",
      "Window functions and lateral joins",
      "JSONB operators and document queries",
      "Partitioning and vacuum strategies",
    ],
  },
  {
    id: "docker", name: "Docker & K8s", category: "Engineering",
    description: "Containerisation, orchestration, production deployment.",
    estimatedHours: 35, hoursLogged: 0,
    prerequisites: ["cloud"],
    learningOutcomes: [
      "Dockerfile best practices: layer caching, multi-stage builds",
      "Docker Compose for local development",
      "Kubernetes pods, deployments, and services",
      "ConfigMaps, secrets, and persistent volumes",
      "Horizontal pod autoscaling and resource limits",
    ],
  },
  {
    id: "spark", name: "Apache Spark", category: "Engineering",
    description: "Distributed data processing at scale.",
    estimatedHours: 45, hoursLogged: 0,
    prerequisites: ["py", "sql"],
    learningOutcomes: [
      "Spark architecture: driver, executors, and DAG scheduler",
      "DataFrame API vs. RDD operations",
      "Spark SQL and window functions at scale",
      "Partitioning strategies and shuffle optimisation",
      "Structured Streaming for real-time pipelines",
      "Integration with Delta Lake and data lakehouses",
    ],
  },
];

// ── Roles ────────────────────────────────────────────────────────────────────

export const roles: Role[] = [
  {
    id: "mle",
    title: "Machine Learning Engineer",
    demandScore: 92,
    avgSalary: "$145k",
    openings: 4800,
    requiredSkills: [
      { skillId: "py", required: true },
      { skillId: "ml", required: true },
      { skillId: "dl", required: true },
      { skillId: "mlops", required: true },
      { skillId: "cloud", required: false },
      { skillId: "sql", required: false },
    ],
  },
  {
    id: "ds",
    title: "Data Scientist",
    demandScore: 88,
    avgSalary: "$130k",
    openings: 6200,
    requiredSkills: [
      { skillId: "py", required: true },
      { skillId: "stats", required: true },
      { skillId: "ml", required: true },
      { skillId: "da", required: true },
      { skillId: "viz", required: false },
      { skillId: "sql", required: false },
    ],
  },
  {
    id: "de",
    title: "Data Engineer",
    demandScore: 85,
    avgSalary: "$125k",
    openings: 5400,
    requiredSkills: [
      { skillId: "py", required: true },
      { skillId: "sql", required: true },
      { skillId: "spark", required: true },
      { skillId: "cloud", required: true },
      { skillId: "docker", required: false },
      { skillId: "pg", required: false },
    ],
  },
  {
    id: "nlpeng",
    title: "NLP / LLM Engineer",
    demandScore: 95,
    avgSalary: "$160k",
    openings: 2900,
    requiredSkills: [
      { skillId: "py", required: true },
      { skillId: "ml", required: true },
      { skillId: "dl", required: true },
      { skillId: "nlp", required: true },
      { skillId: "cloud", required: false },
    ],
  },
  {
    id: "fse",
    title: "Full-Stack Engineer",
    demandScore: 80,
    avgSalary: "$115k",
    openings: 9800,
    requiredSkills: [
      { skillId: "fe", required: true },
      { skillId: "be", required: true },
      { skillId: "pg", required: true },
      { skillId: "docker", required: false },
    ],
  },
];

// ── Paths ────────────────────────────────────────────────────────────────────

export const paths: Path[] = [
  {
    id: "mle-primary",
    roleId: "mle",
    name: "ML Engineer — Core Path",
    totalHours: 219,
    demandScore: 92,
    speedScore: 72,
    relevanceScore: 95,
    nodes: [
      { skillId: "py",    order: 1, status: "completed",   estimatedHours: 40, rationale: "Foundation for all ML tooling." },
      { skillId: "sql",   order: 2, status: "completed",   estimatedHours: 24, rationale: "Data retrieval and feature extraction." },
      { skillId: "stats", order: 3, status: "completed",   estimatedHours: 32, rationale: "Statistical intuition underpins model behaviour." },
      { skillId: "ml",    order: 4, status: "in-progress", estimatedHours: 60, rationale: "Core algorithms and evaluation methodology." },
      { skillId: "cloud", order: 5, status: "unlocked",    estimatedHours: 36, rationale: "Deploy and scale models in production." },
      { skillId: "dl",    order: 6, status: "locked",      estimatedHours: 80, rationale: "Required for complex feature learning." },
      { skillId: "mlops", order: 7, status: "locked",      estimatedHours: 44, rationale: "Close the loop from experiment to production." },
    ],
  },
  {
    id: "mle-fast",
    roleId: "mle",
    name: "ML Engineer — Fast Track",
    totalHours: 180,
    demandScore: 92,
    speedScore: 90,
    relevanceScore: 78,
    nodes: [
      { skillId: "py",    order: 1, status: "completed",   estimatedHours: 40, rationale: "Non-negotiable starting point." },
      { skillId: "stats", order: 2, status: "completed",   estimatedHours: 32, rationale: "Skip SQL for speed — revisit later." },
      { skillId: "ml",    order: 3, status: "in-progress", estimatedHours: 60, rationale: "Core ML without the database detour." },
      { skillId: "dl",    order: 4, status: "locked",      estimatedHours: 80, rationale: "Accelerated progression to deep learning." },
    ],
  },
  {
    id: "mle-deep",
    roleId: "mle",
    name: "ML Engineer — Deep Specialisation",
    totalHours: 316,
    demandScore: 94,
    speedScore: 45,
    relevanceScore: 98,
    nodes: [
      { skillId: "py",    order: 1, status: "completed",   estimatedHours: 40, rationale: "Foundation." },
      { skillId: "sql",   order: 2, status: "completed",   estimatedHours: 24, rationale: "Data access." },
      { skillId: "stats", order: 3, status: "completed",   estimatedHours: 32, rationale: "Deep statistical grounding." },
      { skillId: "da",    order: 4, status: "in-progress", estimatedHours: 28, rationale: "Strong data intuition before modelling." },
      { skillId: "viz",   order: 5, status: "locked",      estimatedHours: 20, rationale: "Communicate findings clearly." },
      { skillId: "ml",    order: 6, status: "locked",      estimatedHours: 60, rationale: "Core algorithms." },
      { skillId: "cloud", order: 7, status: "locked",      estimatedHours: 36, rationale: "Scalable infrastructure." },
      { skillId: "dl",    order: 8, status: "locked",      estimatedHours: 80, rationale: "Deep learning specialisation." },
      { skillId: "mlops", order: 9, status: "locked",      estimatedHours: 44, rationale: "Production engineering." },
    ],
  },
];

// ── Graph Nodes & Edges ───────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  category: string;
  x: number;
  y: number;
  status?: NodeStatus;
  estimatedHours: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export const graphNodes: GraphNode[] = [
  { id: "py",    label: "Python",             category: "Programming", x: 380, y: 300, status: "completed",   estimatedHours: 40 },
  { id: "sql",   label: "SQL",                category: "Data",        x: 200, y: 420, status: "completed",   estimatedHours: 24 },
  { id: "stats", label: "Statistics",         category: "Math",        x: 560, y: 420, status: "completed",   estimatedHours: 32 },
  { id: "da",    label: "Data Analysis",      category: "Data",        x: 160, y: 580, status: "in-progress", estimatedHours: 28 },
  { id: "viz",   label: "Data Viz",           category: "Data",        x: 60,  y: 720, status: "locked",      estimatedHours: 20 },
  { id: "ml",    label: "Machine Learning",   category: "AI/ML",       x: 440, y: 570, status: "in-progress", estimatedHours: 60 },
  { id: "dl",    label: "Deep Learning",      category: "AI/ML",       x: 440, y: 720, status: "locked",      estimatedHours: 80 },
  { id: "nlp",   label: "NLP",                category: "AI/ML",       x: 580, y: 850, status: "locked",      estimatedHours: 50 },
  { id: "cloud", label: "Cloud Platforms",    category: "Engineering", x: 600, y: 300, status: "unlocked",    estimatedHours: 36 },
  { id: "mlops", label: "MLOps",              category: "Engineering", x: 680, y: 570, status: "locked",      estimatedHours: 44 },
  { id: "fe",    label: "React & TS",         category: "Frontend",    x: 100, y: 180, status: "completed",   estimatedHours: 50 },
  { id: "be",    label: "Node.js & APIs",     category: "Backend",     x: 260, y: 150, status: "unlocked",    estimatedHours: 40 },
  { id: "pg",    label: "PostgreSQL",         category: "Data",        x: 340, y: 870, status: "locked",      estimatedHours: 30 },
  { id: "docker",label: "Docker & K8s",       category: "Engineering", x: 760, y: 400, status: "locked",      estimatedHours: 35 },
  { id: "spark", label: "Apache Spark",       category: "Engineering", x: 260, y: 700, status: "locked",      estimatedHours: 45 },
];

export const graphEdges: GraphEdge[] = [
  { source: "py",    target: "ml" },
  { source: "py",    target: "da" },
  { source: "py",    target: "cloud" },
  { source: "py",    target: "be" },
  { source: "py",    target: "spark" },
  { source: "sql",   target: "da" },
  { source: "sql",   target: "pg" },
  { source: "sql",   target: "spark" },
  { source: "stats", target: "ml" },
  { source: "da",    target: "viz" },
  { source: "ml",    target: "dl" },
  { source: "ml",    target: "mlops" },
  { source: "dl",    target: "nlp" },
  { source: "cloud", target: "mlops" },
  { source: "cloud", target: "docker" },
  { source: "da",    target: "spark" },
  { source: "pg",    target: "spark" },
  { source: "be",    target: "pg" },
];

// ── User state (simulated) ────────────────────────────────────────────────────

export const userSkills: UserSkill[] = [
  { skillId: "py",    proficiency: "intermediate" },
  { skillId: "sql",   proficiency: "beginner" },
  { skillId: "stats", proficiency: "beginner" },
  { skillId: "fe",    proficiency: "advanced" },
];

export const progressLog: ProgressEntry[] = [
  { skillId: "py",    completedAt: "2024-10-12" },
  { skillId: "sql",   completedAt: "2024-11-03" },
  { skillId: "stats", completedAt: "2024-12-18" },
];
