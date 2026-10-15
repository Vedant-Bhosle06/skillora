const mongoose = require('mongoose');

const skillEdgeSchema = new mongoose.Schema({
  sourceSkillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  targetSkillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  type:          { type: String, enum: ['prerequisite_of', 'corequisite_with'], required: true },
  group:         { type: String, default: null },  // only for prerequisite_of edges; null = mandatory
  source:        { type: String, default: '' }      // curation note
}, { timestamps: { createdAt: true, updatedAt: false } });

// Compound unique index — prevents duplicate edges
skillEdgeSchema.index({ sourceSkillId: 1, targetSkillId: 1, type: 1 }, { unique: true });
// Adjacency lookup indexes
skillEdgeSchema.index({ sourceSkillId: 1 });
skillEdgeSchema.index({ targetSkillId: 1 });

module.exports = mongoose.model('SkillEdge', skillEdgeSchema, 'skill_edges');
