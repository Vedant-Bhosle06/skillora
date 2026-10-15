const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  skillId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  order:     Number,
  fromRank:  Number,
  toRank:    Number,
  estCost:   Number,
  rationale: String
}, { _id: false });

const pathSchema = new mongoose.Schema({
  rank:              Number,
  type:              { type: String, enum: ['primary', 'alternative'] },
  totalLearningCost: Number,
  marketDemandAvg:   Number,
  compositeScore:    Number,
  steps:             [stepSchema]
}, { _id: false });

const computedPathSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetRoleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  generatedAt:  { type: Date, default: Date.now },
  algorithm:    { type: String, enum: ['a_star', 'dijkstra', 'greedy_fallback'] },
  alpha:        { type: Number, default: 0.7 },
  beta:         { type: Number, default: 0.3 },
  stats:        { statesExpanded: Number, statesToPrimary: Number, elapsedMs: Number, capped: Boolean },
  status:       { type: String, enum: ['active', 'stale', 'archived'], default: 'active' },
  paths:        [pathSchema]
});

// Required indexes per spec
computedPathSchema.index({ userId: 1, status: 1 });
computedPathSchema.index({ userId: 1, generatedAt: -1 });

module.exports = mongoose.model('ComputedPath', computedPathSchema, 'computed_paths');
