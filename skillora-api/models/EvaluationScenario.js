const mongoose = require('mongoose');

const evalSchema = new mongoose.Schema({
  scenarioName:   { type: String, required: true, unique: true },
  currentSkills:  [{ skillId: mongoose.Schema.Types.ObjectId, proficiency: String }],
  targetRoleId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  humanExpertPath: [mongoose.Schema.Types.ObjectId],
  systemPath:      [mongoose.Schema.Types.ObjectId],
  baselinePath:    [mongoose.Schema.Types.ObjectId],
  metrics: {
    systemHours:              Number,
    baselineHours:            Number,
    timeSavedPct:             Number,
    redundantSkillsAvoided:   Number,
    systemOrderViolations:    Number,
    baselineOrderViolations:  Number,
    expertJaccard:            Number,
    expertKendallTau:         Number,
    statesExpandedAStar:      Number,
    statesExpandedDijkstra:   Number
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('EvaluationScenario', evalSchema, 'evaluation_scenarios');
