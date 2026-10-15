export type Proficiency = 'beginner' | 'intermediate' | 'advanced';
export type UserRole = 'learner' | 'admin';
export type EdgeType = 'prerequisite_of' | 'corequisite_with';
export type PathStatus = 'active' | 'stale' | 'archived';
export type Algorithm = 'a_star' | 'dijkstra' | 'greedy_fallback';
export type RoleCategory = 'data' | 'engineering' | 'design' | 'product' | 'management';

export interface SkillRef { _id: string; slug: string; name: string; category: string }   // populated refs in /users/me
export interface Skill { _id: string; slug: string; name: string; category: string; description: string; aliases: string[];
  baseDifficulty: number; estHours: number; marketDemand: number }
export interface SkillEdge { _id: string; sourceSkillId: string; targetSkillId: string; type: EdgeType; group: string | null;
  source: string /* curation NOTE, not a skill id */ }
export interface SkillDetail extends Skill { edges: SkillEdge[] }

export interface RoleRequirement { _id?: string; anyOf: string[]; label: string; minProficiency: Proficiency }
export interface Role { _id: string; slug: string; title: string; description: string; category?: RoleCategory;
  demandScore: number /* 0..1 */; requiredSkills: RoleRequirement[] }
export interface RoleDetail extends Omit<Role, 'requiredSkills'> {
  requiredSkills: Array<RoleRequirement & { anyOfSkills: Array<{ _id: string; slug?: string; name?: string; estHours?: number; marketDemand?: number }> }> }

export interface CurrentSkill { _id: string; skillId: SkillRef | null; proficiency: Proficiency; addedAt: string }
export interface CompletedSkill { _id: string; skillId: SkillRef | null; proficiency: Proficiency;
  targetRoleId: string /* NOT populated */; completedAt: string; fromPathId: string }
export interface Me { _id: string; name: string; email: string; role: UserRole;
  currentSkills: CurrentSkill[]; completedSkills: CompletedSkill[];
  targetRoleId: { _id: string; slug: string; title: string } | null /* populated */;
  activePathId: string | null; selectedPathRank: number }

export interface LoginResponse { token: string; user: { id: string; name: string; email: string; role: UserRole } }
export interface RegisterResponse { message: string; userId: string }
export interface MessageResponse { message: string }

export interface PathStep { skillId: string; order: number; fromRank: number; toRank: number; estCost: number; rationale: string }
export interface RankedPath { rank: number; type: 'primary' | 'alternative'; totalLearningCost: number;
  marketDemandAvg: number; compositeScore: number /* lower = better */; steps: PathStep[] }
export interface ComputedPathDoc { _id: string; userId: string; targetRoleId: string; generatedAt: string; algorithm: Algorithm;
  alpha: number; beta: number; stats: PathStats; status: PathStatus; paths: RankedPath[] }
export interface PathStats { statesExpanded: number; statesToPrimary?: number | null; elapsedMs: number /* may be fractional */; capped?: boolean }
export interface AlternativesResponse { paths: RankedPath[]; algorithm: Algorithm; stats: PathStats }
export type CompleteSkillResponse = { message: string; path: ComputedPathDoc } | { recomputePending: true; message: string };

export interface GraphNode { _id: string; slug: string; name: string; category: string; estHours: number; marketDemand: number }
export interface GraphEdge { source: string; target: string; type: EdgeType; group: string | null }
export interface GraphResponse { nodes: GraphNode[]; edges: GraphEdge[] }
export interface PublicStats { skillCount: number; roleCount: number }
export interface GraphMetrics { nodeCount: number; prerequisiteEdgeCount: number; corequisiteEdgeCount: number; groupCount: number;
  isDAG: boolean; cycle: string[] | null /* skill ids */; orphanCount: number;
  orphans: Array<{ skillId: string; name: string } | string> /* code returns objects; OpenAPI says strings – handle both */;
  avgDegree: number; roots: string[] /* skill ids */; maxDepth: number | null }

export interface SkillInput { slug: string; name: string; category: string; description?: string; aliases?: string[];
  baseDifficulty: number; estHours?: number; marketDemand: number }
export interface EdgeInput { sourceSkillId: string; targetSkillId: string; type: EdgeType; group?: string | null; source?: string }
export interface RoleInput { slug: string; title: string; description?: string; category: RoleCategory; demandScore: number;
  requiredSkills: Array<{ anyOf: string[]; label?: string; minProficiency: Proficiency }> }
