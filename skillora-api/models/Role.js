const mongoose = require('mongoose');
const { PROFICIENCY_LEVELS } = require('../utils/proficiencyRank');

const roleSchema = new mongoose.Schema({
  slug:        { type: String, required: true, unique: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  category:    { type: String, enum: ['data', 'engineering', 'design', 'product', 'management'] },
  demandScore: { type: Number, min: 0, max: 1, default: 0.5 },
  requiredSkills: [{
    anyOf:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    label:          { type: String, default: '' },   // e.g. "BI tool"
    minProficiency: { type: String, enum: PROFICIENCY_LEVELS, required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
