// Hand-written OpenAPI 3 spec for all API-N-* endpoints (spec v4.0, Part 4)

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ 'application/json': { schema } });
const body = (schema) => ({ required: true, content: json(schema) });
const msg = (description = 'Success') => ({
  description,
  content: json({ type: 'object', properties: { message: { type: 'string' } } })
});
const ok = (schema, description = 'Success') => ({ description, content: json(schema) });
const err = (description) => ({ description, content: json(ref('Error')) });

const R = {
  400: err('Validation error / invalid id'),
  401: err('Missing, invalid or revoked token'),
  403: err('Admin access required'),
  404: err('Not found'),
  409: err('Conflict'),
  503: err('Python service unavailable')
};
const pick = (...codes) => Object.fromEntries(codes.map(c => [c, R[c]]));

const secured = [{ bearerAuth: [] }];
const idParam = (name, description) => ({ name, in: 'path', required: true, description, schema: { type: 'string' } });
const objectId = { type: 'string', example: '64f0c0ffee0c0ffee0c0ffee' };
const proficiency = { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] };

const adminOp = (tag, summary, extra) => ({ tags: [tag], summary, security: secured, ...extra });

const schemas = {
  Error: {
    type: 'object',
    properties: { error: { type: 'string' } },
    required: ['error']
  },
  User: {
    type: 'object',
    properties: {
      _id: objectId,
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['learner', 'admin'] },
      currentSkills: {
        type: 'array',
        items: {
          type: 'object',
          properties: { skillId: objectId, proficiency, addedAt: { type: 'string', format: 'date-time' } }
        }
      },
      completedSkills: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            skillId: objectId,
            proficiency,
            targetRoleId: objectId,
            fromPathId: objectId,
            completedAt: { type: 'string', format: 'date-time' }
          }
        }
      },
      targetRoleId: { ...objectId, nullable: true },
      activePathId: { ...objectId, nullable: true },
      selectedPathRank: { type: 'integer' }
    }
  },
  Skill: {
    type: 'object',
    properties: {
      _id: objectId,
      slug: { type: 'string' },
      name: { type: 'string' },
      category: { type: 'string', example: 'programming' },
      description: { type: 'string' },
      aliases: { type: 'array', items: { type: 'string' } },
      baseDifficulty: { type: 'integer', minimum: 1, maximum: 5 },
      estHours: { type: 'number', description: 'Defaults to baseDifficulty x 8 when omitted' },
      marketDemand: { type: 'number', minimum: 0, maximum: 1 }
    }
  },
  Edge: {
    type: 'object',
    properties: {
      _id: objectId,
      sourceSkillId: objectId,
      targetSkillId: objectId,
      type: { type: 'string', enum: ['prerequisite_of', 'corequisite_with'] },
      group: { type: 'string', nullable: true, description: 'Only for prerequisite_of; null = mandatory' },
      source: { type: 'string' }
    }
  },
  Role: {
    type: 'object',
    properties: {
      _id: objectId,
      slug: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string', enum: ['data', 'engineering', 'design', 'product', 'management'] },
      demandScore: { type: 'number', minimum: 0, maximum: 1 },
      requiredSkills: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            anyOf: { type: 'array', items: objectId },
            label: { type: 'string' },
            minProficiency: proficiency
          }
        }
      }
    }
  },
  ComputedPath: {
    type: 'object',
    properties: {
      _id: objectId,
      userId: objectId,
      targetRoleId: objectId,
      generatedAt: { type: 'string', format: 'date-time' },
      algorithm: { type: 'string', enum: ['a_star', 'dijkstra', 'greedy_fallback'] },
      alpha: { type: 'number' },
      beta: { type: 'number' },
      stats: { type: 'object', properties: { statesExpanded: { type: 'integer' }, elapsedMs: { type: 'number' } } },
      status: { type: 'string', enum: ['active', 'stale', 'archived'] },
      paths: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rank: { type: 'integer' },
            type: { type: 'string', enum: ['primary', 'alternative'] },
            totalLearningCost: { type: 'number' },
            marketDemandAvg: { type: 'number' },
            compositeScore: { type: 'number' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skillId: objectId,
                  order: { type: 'integer' },
                  fromRank: { type: 'integer' },
                  toRank: { type: 'integer' },
                  estCost: { type: 'number' },
                  rationale: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
};

const skillBody = {
  type: 'object',
  required: ['slug', 'name', 'category', 'baseDifficulty', 'marketDemand'],
  properties: { ...schemas.Skill.properties, _id: undefined }
};
const roleBody = { type: 'object', required: ['slug', 'title'], properties: { ...schemas.Role.properties, _id: undefined } };

const paths = {
  // ── Public / auth ──
  '/api/stats/public': {
    get: {
      tags: ['Public'],
      summary: 'API-N-1: Public skill and role counts',
      responses: {
        200: ok({ type: 'object', properties: { skillCount: { type: 'integer' }, roleCount: { type: 'integer' } } })
      }
    }
  },
  '/api/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'API-N-2: Register a new user',
      requestBody: body({
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string' } }
      }),
      responses: {
        201: ok({ type: 'object', properties: { message: { type: 'string' }, userId: objectId } }, 'Registered'),
        ...pick(400, 409)
      }
    }
  },
  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'API-N-3: Log in and receive a JWT',
      requestBody: body({
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } }
      }),
      responses: {
        200: ok({
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: objectId,
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['learner', 'admin'] }
              }
            }
          }
        }),
        ...pick(400, 401)
      }
    }
  },
  '/api/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'API-N-28: Log out (revokes the session)',
      security: secured,
      responses: { 200: msg('Logged out'), ...pick(401) }
    }
  },

  // ── Skills ──
  '/api/skills': {
    get: {
      tags: ['Skills'],
      summary: 'API-N-4: List skills or typeahead search (word-prefix on name + aliases)',
      parameters: [{ name: 'search', in: 'query', schema: { type: 'string' }, description: 'Max 20 results when set' }],
      responses: { 200: ok({ type: 'array', items: ref('Skill') }) }
    }
  },
  '/api/skills/{id}': {
    get: {
      tags: ['Skills'],
      summary: 'API-N-4b: Skill detail with connected edges',
      parameters: [idParam('id', 'Skill id')],
      responses: {
        200: ok({ allOf: [ref('Skill'), { type: 'object', properties: { edges: { type: 'array', items: ref('Edge') } } }] }),
        ...pick(400, 404)
      }
    }
  },

  // ── Roles ──
  '/api/roles': {
    get: {
      tags: ['Roles'],
      summary: 'API-N-6: List roles',
      parameters: [{ name: 'sort', in: 'query', schema: { type: 'string', enum: ['demand'] }, description: 'demand = by demandScore desc' }],
      responses: { 200: ok({ type: 'array', items: ref('Role') }) }
    }
  },
  '/api/roles/{id}': {
    get: {
      tags: ['Roles'],
      summary: 'API-N-7: Role detail with skill names joined',
      parameters: [idParam('id', 'Role id')],
      responses: { 200: ok(ref('Role')), ...pick(400, 404) }
    }
  },

  // ── Users ──
  '/api/users/me': {
    get: {
      tags: ['Users'],
      summary: 'API-N-26: Current user profile',
      security: secured,
      responses: { 200: ok(ref('User')), ...pick(401, 404) }
    },
    delete: {
      tags: ['Users'],
      summary: 'API-N-17: Delete account (cascades sessions and paths)',
      security: secured,
      responses: { 200: msg('Account deleted'), ...pick(401) }
    }
  },
  '/api/users/me/skills': {
    post: {
      tags: ['Users'],
      summary: 'API-N-5: Replace currentSkills (marks active path stale)',
      security: secured,
      requestBody: body({
        type: 'object',
        required: ['skills'],
        properties: {
          skills: {
            type: 'array',
            items: { type: 'object', required: ['skillId', 'proficiency'], properties: { skillId: objectId, proficiency } }
          }
        }
      }),
      responses: { 200: msg('Skills updated'), ...pick(400, 401) }
    }
  },
  '/api/users/me/skills/{id}': {
    patch: {
      tags: ['Users'],
      summary: 'API-N-15: Update proficiency of one current skill',
      security: secured,
      parameters: [idParam('id', 'Skill id')],
      requestBody: body({ type: 'object', required: ['proficiency'], properties: { proficiency } }),
      responses: { 200: msg('Proficiency updated'), ...pick(400, 401, 404) }
    },
    delete: {
      tags: ['Users'],
      summary: 'API-N-16: Remove a skill from currentSkills',
      security: secured,
      parameters: [idParam('id', 'Skill id')],
      responses: { 200: msg('Skill removed'), ...pick(400, 401) }
    }
  },
  '/api/users/me/target-role': {
    post: {
      tags: ['Users'],
      summary: 'API-N-8: Set target role (marks active path stale)',
      security: secured,
      requestBody: body({ type: 'object', required: ['roleId'], properties: { roleId: objectId } }),
      responses: { 200: msg('Target role updated'), ...pick(400, 401, 404) }
    }
  },
  '/api/users/me/skills/complete': {
    post: {
      tags: ['Users'],
      summary: 'API-N-14: Mark a path step complete and recompute',
      security: secured,
      requestBody: body({ type: 'object', required: ['skillId'], properties: { skillId: objectId } }),
      responses: {
        200: ok({ type: 'object', properties: { message: { type: 'string' }, path: ref('ComputedPath') } }, 'Completed and path recomputed'),
        202: ok(
          { type: 'object', properties: { recomputePending: { type: 'boolean' }, message: { type: 'string' } } },
          'Completion saved; recompute pending (Python service down)'
        ),
        ...pick(400, 401, 409)
      }
    }
  },

  // ── Paths ──
  '/api/paths/compute': {
    post: {
      tags: ['Paths'],
      summary: 'API-N-9: Compute learning paths via the Python service',
      security: secured,
      responses: { 200: ok(ref('ComputedPath')), ...pick(400, 401, 404, 503) }
    }
  },
  '/api/paths/active': {
    get: {
      tags: ['Paths'],
      summary: 'API-N-10: Latest non-archived computed path',
      security: secured,
      responses: { 200: ok(ref('ComputedPath')), ...pick(401, 404) }
    }
  },
  '/api/paths/history': {
    get: {
      tags: ['Paths'],
      summary: 'API-N-27: Archived computed paths',
      security: secured,
      responses: { 200: ok({ type: 'array', items: ref('ComputedPath') }), ...pick(401) }
    }
  },
  '/api/paths/select': {
    post: {
      tags: ['Paths'],
      summary: 'API-N-13: Select which ranked path is active (no recompute)',
      security: secured,
      requestBody: body({ type: 'object', required: ['rank'], properties: { rank: { type: 'integer', minimum: 1 } } }),
      responses: { 200: msg('Rank selected'), ...pick(400, 401, 404) }
    }
  },
  '/api/paths/{pathDocId}/alternatives': {
    get: {
      tags: ['Paths'],
      summary: 'API-N-12: All ranked paths of a computed doc',
      security: secured,
      parameters: [idParam('pathDocId', 'computed_paths document id')],
      responses: {
        200: ok({
          type: 'object',
          properties: {
            paths: schemas.ComputedPath.properties.paths,
            algorithm: { type: 'string' },
            stats: schemas.ComputedPath.properties.stats
          }
        }),
        ...pick(400, 401, 404)
      }
    }
  },

  // ── Graph ──
  '/api/graph': {
    get: {
      tags: ['Graph'],
      summary: 'API-N-11: Skill graph (full or path-scoped)',
      security: secured,
      parameters: [{ name: 'scope', in: 'query', schema: { type: 'string', enum: ['path', 'full'], default: 'full' } }],
      responses: {
        200: ok({
          type: 'object',
          properties: {
            nodes: { type: 'array', items: ref('Skill') },
            edges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source: objectId,
                  target: objectId,
                  type: { type: 'string', enum: ['prerequisite_of', 'corequisite_with'] },
                  group: { type: 'string', nullable: true }
                }
              }
            }
          }
        }),
        ...pick(401)
      }
    }
  },

  // ── Admin ──
  '/api/admin/skills': {
    post: adminOp('Admin', 'API-N-18: Create skill', {
      requestBody: body(skillBody),
      responses: { 201: ok(ref('Skill'), 'Created'), ...pick(400, 401, 403) }
    })
  },
  '/api/admin/skills/{id}': {
    patch: adminOp('Admin', 'API-N-19: Update skill', {
      parameters: [idParam('id', 'Skill id')],
      requestBody: body({ type: 'object', properties: skillBody.properties }),
      responses: { 200: ok(ref('Skill')), ...pick(400, 401, 403, 404) }
    }),
    delete: adminOp('Admin', 'API-N-20: Delete skill (blocked if a role requires it)', {
      parameters: [idParam('id', 'Skill id')],
      responses: { 200: msg('Deleted with cascade'), ...pick(400, 401, 403, 409) }
    })
  },
  '/api/admin/edges': {
    get: adminOp('Admin', 'API-N-30: List edges', {
      parameters: [{ name: 'skillId', in: 'query', schema: { type: 'string' }, description: 'Only edges touching this skill' }],
      responses: { 200: ok({ type: 'array', items: ref('Edge') }), ...pick(400, 401, 403) }
    }),
    post: adminOp('Admin', 'API-N-21: Create edge (self-loop, duplicate and cycle checks)', {
      requestBody: body({
        type: 'object',
        required: ['sourceSkillId', 'targetSkillId', 'type'],
        properties: schemas.Edge.properties
      }),
      responses: { 201: ok(ref('Edge'), 'Created'), ...pick(400, 401, 403, 404, 409) }
    })
  },
  '/api/admin/edges/{id}': {
    patch: adminOp('Admin', 'API-N-22: Update edge (re-validated, updated in place)', {
      parameters: [idParam('id', 'Edge id')],
      requestBody: body({ type: 'object', properties: schemas.Edge.properties }),
      responses: { 200: ok(ref('Edge')), ...pick(400, 401, 403, 404, 409) }
    }),
    delete: adminOp('Admin', 'API-N-23: Delete edge', {
      parameters: [idParam('id', 'Edge id')],
      responses: { 200: msg('Edge deleted'), ...pick(400, 401, 403, 404) }
    })
  },
  '/api/admin/roles': {
    post: adminOp('Admin', 'API-N-24: Create role', {
      requestBody: body(roleBody),
      responses: { 201: ok(ref('Role'), 'Created'), ...pick(400, 401, 403) }
    })
  },
  '/api/admin/roles/{id}': {
    patch: adminOp('Admin', 'API-N-25: Update role', {
      parameters: [idParam('id', 'Role id')],
      requestBody: body({ type: 'object', properties: roleBody.properties }),
      responses: { 200: ok(ref('Role')), ...pick(400, 401, 403, 404) }
    }),
    delete: adminOp('Admin', 'API-N-29: Delete role (resets users targeting it)', {
      parameters: [idParam('id', 'Role id')],
      responses: { 200: msg('Role deleted'), ...pick(400, 401, 403, 404) }
    })
  },
  '/api/admin/graph/metrics': {
    get: adminOp('Admin', 'API-N-31: Graph health metrics (proxies API-P-3)', {
      responses: {
        200: ok({ type: 'object', additionalProperties: true }),
        ...pick(401, 403, 503)
      }
    })
  }
};

module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'SKILLORA Node.js API',
    version: '1.0.0',
    description: 'All API-N-* endpoints for the SKILLORA skill-gap navigator'
  },
  servers: [{ url: 'http://localhost:5000' }],
  tags: ['Public', 'Auth', 'Skills', 'Roles', 'Users', 'Paths', 'Graph', 'Admin'].map(name => ({ name })),
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas
  }
};
