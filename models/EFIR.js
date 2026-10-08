const mongoose = require('mongoose');

const EFIRSchema = new mongoose.Schema(
  {
    touristId: { type: String, required: true, trim: true },
    touristName: { type: String, required: true, trim: true },
    countryOfOrigin: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    emergencyContact: { type: String, required: true, trim: true },

    incidentType: {
      type: String,
      enum: ['Missing Person', 'theft', 'Assault', 'Accident', 'Harassment', 'Other'],
      required: true,
      trim: true,
    },
    incidentDescription: { type: String, required: true, trim: true },

    witnesses: { type: String, default: '', trim: true },
    additionalInformation: { type: String, default: '', trim: true },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'under-review', 'closed'],
      default: 'submitted',
    },

    submittedBy: {
      authorityMongoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority' },
      authorityId: { type: String, default: null },
      fullName: { type: String, default: null },
      role: { type: String, default: null },
    },

    filedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

EFIRSchema.index({ touristId: 1, filedAt: -1 });

module.exports = mongoose.model('EFIR', EFIRSchema);
