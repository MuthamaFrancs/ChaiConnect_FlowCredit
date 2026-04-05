/**
 * FlowCredit Credit Scoring Engine
 * 
 * Calculates a 0–100 score from 5 real factors using delivery + payment data:
 *   1. Delivery consistency (regular deliveries = reliable farmer)
 *   2. Buyer relationship length (how long they've been active)
 *   3. Payment volume trend (increasing = growing business)
 *   4. Repayment history (past loans repaid on time)
 *   5. Transaction frequency (M-Pesa activity = financial engagement)
 *
 * Score → Grade:  A (75+), B (50-74), C (<50)
 */

class CreditScoringService {
  /**
   * Calculate credit score for a farmer
   * @param {object} params
   * @param {object} params.farmer       - Farmer record from DB
   * @param {Array}  params.deliveries   - All deliveries for this farmer
   * @param {Array}  params.loans        - All loans for this farmer
   * @param {Array}  params.payments     - All payments for this farmer
   * @returns {{ score: number, grade: string, factors: object }}
   */
  calculate({ farmer, deliveries = [], loans = [], payments = [] }) {
    const factors = {};

    // ── Factor 1: Delivery Consistency (0–20 pts) ──────────────
    // How regularly does the farmer deliver? Score based on unique delivery months
    const deliveryMonths = new Set(deliveries.map(d => {
      const date = d.date || d.createdAt;
      return date ? String(date).slice(0, 7) : null;
    }).filter(Boolean));
    const monthsSinceActive = this._monthsSince(farmer.activeSince);
    const consistencyRatio = monthsSinceActive > 0
      ? Math.min(deliveryMonths.size / Math.max(monthsSinceActive, 1), 1)
      : 0;
    factors.deliveryConsistency = {
      score: Math.round(consistencyRatio * 20),
      max: 20,
      detail: `${deliveryMonths.size} delivery months / ${monthsSinceActive} months active`,
    };

    // ── Factor 2: Buyer Relationship Length (0–20 pts) ─────────
    // Longer relationship = more trust
    const yearsActive = monthsSinceActive / 12;
    const relationshipScore = Math.min(yearsActive / 5, 1); // 5+ years = max
    factors.buyerRelationship = {
      score: Math.round(relationshipScore * 20),
      max: 20,
      detail: `${yearsActive.toFixed(1)} years with cooperative`,
    };

    // ── Factor 3: Payment Volume Trend (0–20 pts) ─────────────
    // Are earnings increasing over time?
    const totalKg = Number(farmer.totalKg || 0);
    const totalEarned = Number(farmer.totalEarned || 0);
    const volumeScore = Math.min(totalKg / 15000, 1); // 15,000 kg lifetime = max
    factors.paymentVolume = {
      score: Math.round(volumeScore * 20),
      max: 20,
      detail: `${totalKg.toLocaleString()} kg delivered, KSh ${totalEarned.toLocaleString()} earned`,
    };

    // ── Factor 4: Repayment History (0–25 pts) ────────────────
    // Past loans — repaid on time?
    const completedLoans = loans.filter(l => l.status === 'Completed');
    const overdueLoans = loans.filter(l => l.status === 'Overdue');
    const activeLoans = loans.filter(l => l.status === 'Active');
    let repaymentScore = 0;
    if (loans.length === 0) {
      repaymentScore = 15; // No history = neutral (not penalized, not rewarded)
    } else {
      const goodRatio = completedLoans.length / loans.length;
      const overduePenalty = overdueLoans.length * 5;
      repaymentScore = Math.max(0, Math.round(goodRatio * 25) - overduePenalty);
    }
    factors.repaymentHistory = {
      score: Math.min(repaymentScore, 25),
      max: 25,
      detail: `${completedLoans.length} completed, ${activeLoans.length} active, ${overdueLoans.length} overdue`,
    };

    // ── Factor 5: Transaction Frequency (0–15 pts) ────────────
    // More payments received = more financially active
    const txCount = payments.length + deliveries.length;
    const txScore = Math.min(txCount / 30, 1); // 30+ transactions = max
    factors.transactionFrequency = {
      score: Math.round(txScore * 15),
      max: 15,
      detail: `${txCount} total transactions`,
    };

    // ── Aggregate ──────────────────────────────────────────────
    const score = Math.min(100, Object.values(factors).reduce((s, f) => s + f.score, 0));
    const grade = score >= 75 ? 'A' : score >= 50 ? 'B' : 'C';

    return { score, grade, factors };
  }

  _monthsSince(dateStr) {
    if (!dateStr) return 0;
    const then = new Date(dateStr);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth()));
  }

  /**
   * Determine max loan amount based on credit grade
   */
  maxLoanAmount(grade) {
    const limits = { A: 50000, B: 25000, C: 10000 };
    return limits[grade] || 10000;
  }
}

module.exports = new CreditScoringService();
