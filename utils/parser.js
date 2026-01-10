/**
 * Utility functions for parsing SmartCredit data
 */

/**
 * Extract numeric value from text
 * Examples:
 *   "813" -> 813
 *   "+34 pts" -> 34
 *   "-168 pts" -> -168
 *   "$652.05" -> 652.05
 *   34 -> 34 (FASE 5: Accept numbers directly)
 */
function extractNumber(text) {
  if (!text && text !== 0) return null;

  // If already a number, return it (FASE 5)
  if (typeof text === 'number') {
    return isNaN(text) ? null : text;
  }

  // Convert to string if not already
  const str = String(text);

  // Remove everything except numbers, dots, minus, and plus
  const cleaned = str.replace(/[^\d.\-+]/g, '');

  // Parse as float
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : num;
}

/**
 * Parse date from SmartCredit format
 * Input: "As of 12/10/2025" or "12/10/2025"
 * Output: "2025-12-10" (ISO format)
 */
function parseScoreDate(dateText) {
  if (!dateText) return null;

  // Extract date pattern MM/DD/YYYY
  const match = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (!match) return null;

  const [, month, day, year] = match;

  // Pad with zeros
  const mm = month.padStart(2, '0');
  const dd = day.padStart(2, '0');

  return `${year}-${mm}-${dd}`;
}

/**
 * Extract starting score and points gained from text
 * Input: "Your starting score was 635. You added +178 pts so far!"
 * Output: { startingScore: 635, pointsGained: 178 }
 */
function parseScoreProgress(text) {
  if (!text) return { startingScore: null, pointsGained: null };

  const startingMatch = text.match(/starting score was\s+(\d+)/i);
  const pointsMatch = text.match(/added\s+\+?(\d+)\s+pts/i);

  return {
    startingScore: startingMatch ? parseInt(startingMatch[1]) : null,
    pointsGained: pointsMatch ? parseInt(pointsMatch[1]) : null,
  };
}

/**
 * Extract boost potential from text
 * Input: "Taking action can increase your score +34 pts."
 * Output: 34
 */
function parseBoostPotential(text) {
  if (!text) return null;

  const match = text.match(/\+(\d+)\s+pts/i);
  return match ? parseInt(match[1]) : null;
}

/**
 * Extract payment boost and negative impact from ScoreBoost section
 * Input: "Payments can increase your score +0 pts. Spending can decrease your score -168 pts."
 * Output: { paymentBoost: 0, negativeImpact: -168 }
 */
function parseScoreBoost(text) {
  if (!text) return { paymentBoost: null, negativeImpact: null };

  const paymentMatch = text.match(/increase.*?\+?(\d+)\s+pts/i);
  const negativeMatch = text.match(/decrease.*?-(\d+)\s+pts/i);

  return {
    paymentBoost: paymentMatch ? parseInt(paymentMatch[1]) : null,
    negativeImpact: negativeMatch ? -parseInt(negativeMatch[1]) : null,
  };
}

/**
 * Structure the final JSON output
 */
function buildCreditScoreData(rawData) {
  return {
    credit_score_info: {
      current_score: rawData.currentScore ?? null,
      score_date: rawData.scoreDate ?? null,
      starting_score: rawData.startingScore ?? null,
      points_gained: rawData.pointsGained ?? null,
    },
    score_tracker: {
      current_score: rawData.currentScore ?? null,
      starting_score: rawData.startingScore ?? null,
      points_added: rawData.pointsGained ?? null,
    },
    score_builder: {
      potential_boost: rawData.scoreBuilderBoost ?? null,
      description: 'Taking action directly with the source',
    },
    score_boost: {
      payment_boost: rawData.paymentBoost ?? null,
      negative_impact: rawData.negativeImpact ?? null,
      description: rawData.scoreBoostDescription || 'Payment and spending impact',
    },
    future_score: rawData.futureScore ?? null,
    scraped_at: new Date().toISOString(),
  };
}

/**
 * Clean text by removing extra whitespace and dashes
 * Examples:
 *   "  Some text  " -> "Some text"
 *   "--" -> null
 */
function cleanText(text) {
  if (!text) return null;
  const cleaned = text.trim();
  return cleaned === '--' || cleaned === '' ? null : cleaned;
}

/**
 * Parse 3B credit scores from raw data
 * Input: { transunion: "770", experian: "790", equifax: "789" }
 * Output: { transunion: 770, experian: 790, equifax: 789 }
 */
function parse3BScores(rawScores) {
  return {
    transunion: extractNumber(rawScores.transunion),
    experian: extractNumber(rawScores.experian),
    equifax: extractNumber(rawScores.equifax),
  };
}

/**
 * Parse personal information for a single bureau
 * Input: raw text data from DOM
 * Output: structured personal info object
 */
function parsePersonalInfo(rawData) {
  return {
    credit_report_date: cleanText(rawData.reportDate),
    name: cleanText(rawData.name),
    date_of_birth: cleanText(rawData.dob),
    current_address: cleanText(rawData.currentAddress),
    previous_address: cleanText(rawData.previousAddress),
    employer: cleanText(rawData.employer),
  };
}

/**
 * Parse all three bureaus' personal information
 */
function parse3BPersonalInfo(rawData) {
  return {
    transunion: parsePersonalInfo(rawData.transunion),
    experian: parsePersonalInfo(rawData.experian),
    equifax: parsePersonalInfo(rawData.equifax),
  };
}

/**
 * Parse summary data for a single bureau
 * Input: raw text data from DOM
 * Output: structured summary object
 */
function parseSummary(rawData) {
  return {
    // Support both camelCase and snake_case (FASE 5)
    total_accounts: extractNumber(rawData.total_accounts || rawData.totalAccounts),
    open_accounts: extractNumber(rawData.open_accounts || rawData.openAccounts),
    closed_accounts: extractNumber(rawData.closed_accounts || rawData.closedAccounts),
    delinquent: extractNumber(rawData.delinquent),
    derogatory: extractNumber(rawData.derogatory),
    balances: cleanText(rawData.balances), // Keep as string with $ formatting
    payments: cleanText(rawData.payments), // Keep as string with $ formatting
    public_records: extractNumber(rawData.publicRecords),
    inquiries_2years: extractNumber(rawData.inquiries),
  };
}

/**
 * Parse all three bureaus' summary data
 */
function parse3BSummary(rawData) {
  return {
    transunion: parseSummary(rawData.transunion),
    experian: parseSummary(rawData.experian),
    equifax: parseSummary(rawData.equifax),
  };
}

/**
 * Build complete credit report combining dashboard + 3B Report data
 */
function buildFullCreditReport(dashboardData, report3BData) {
  return {
    dashboard_summary: dashboardData.credit_score_info || null,
    credit_scores_3b: report3BData.scores || null,
    personal_information: report3BData.personalInfo || null,
    summary: report3BData.summary || null,
    scraped_at: new Date().toISOString(),
  };
}

module.exports = {
  extractNumber,
  parseScoreDate,
  parseScoreProgress,
  parseBoostPotential,
  parseScoreBoost,
  buildCreditScoreData,
  cleanText,
  parse3BScores,
  parsePersonalInfo,
  parse3BPersonalInfo,
  parseSummary,
  parse3BSummary,
  buildFullCreditReport,
};
