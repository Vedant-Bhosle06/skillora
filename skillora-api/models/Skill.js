const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  slug:           { type: String, required: true, unique: true },
  name:           { type: String, required: true },
  category:       { type: String, required: true },  // "programming"|"math"|"tool"|"domain"|"soft-skill"
  description:    { type: String, default: '' },
  aliases:        [String],
  baseDifficulty: { type: Number, required: true, min: 1, max: 5 },
  estHours:       { type: Number },              // if omitted, set to baseDifficulty × 8 in pre-save hook
  marketDemand:   { type: Number, min: 0, max: 1, required: true }
}, { timestamps: true });

// Default estHours = baseDifficulty × 8 when omitted
skillSchema.pre('save', function () {
  if (this.estHours == null) this.estHours = this.baseDifficulty * 8;
});

module.exports = mongoose.model('Skill', skillSchema);
