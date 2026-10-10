const mongoose = require('mongoose');
const { PROFICIENCY_LEVELS } = require('../utils/proficiencyRank');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['learner', 'admin'], default: 'learner' },
  currentSkills: [{
    skillId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    proficiency: { type: String, enum: PROFICIENCY_LEVELS },
    addedAt:     { type: Date, default: Date.now }
  }],
  completedSkills: [{
    skillId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    proficiency:  { type: String, enum: PROFICIENCY_LEVELS },
    targetRoleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    completedAt:  { type: Date, default: Date.now },
    fromPathId:   { type: mongoose.Schema.Types.ObjectId, ref: 'ComputedPath' }
  }],
  targetRoleId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Role', default: null },
  activePathId:     { type: mongoose.Schema.Types.ObjectId, ref: 'ComputedPath', default: null },
  selectedPathRank: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
