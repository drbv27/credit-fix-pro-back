const mongoose = require('mongoose');

const creditReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportData: {
      type: mongoose.Schema.Types.Mixed, // Flexible schema for all credit data
      required: true,
    },
    scrapingStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'completed',
    },
    scrapingDuration: {
      type: Number, // Duration in seconds
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      scrapedSections: [String], // List of sections that were scraped
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for efficient querying
creditReportSchema.index({ userId: 1, createdAt: -1 });

// Method to get summary data
creditReportSchema.methods.getSummary = function () {
  return {
    _id: this._id,
    userId: this.userId,
    scrapedAt: this.createdAt,
    status: this.scrapingStatus,
    duration: this.scrapingDuration,
    hasCreditScores: !!this.reportData?.credit_scores_3b,
    accountCount: this.reportData?.account_history?.length || 0,
  };
};

const CreditReport = mongoose.model('CreditReport', creditReportSchema);

module.exports = CreditReport;
