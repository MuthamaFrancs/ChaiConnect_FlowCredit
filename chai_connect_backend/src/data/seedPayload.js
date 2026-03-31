/** Mirrors frontend seed for API responses (sandbox demo). */
const FARMERS = [
  { id: 'wanjiku', name: 'Wanjiku Kamau', phone: '0769892579', memberNo: 'WK001', factory: 'Kiambu Tea Factory', zone: 'North Ridge', cooperative: 'Kiambu Tea Growers SACCO', creditScore: 82, creditTier: 'A', loanFlow: 'active', gradeTrend: 'A', activeSince: '2019-03-01', totalKg: 12840, totalEarned: 385200 },
  { id: 'grace', name: 'Grace Njeri', phone: '0756789012', memberNo: 'GN002', factory: 'Kiambu Tea Factory', zone: 'South Fields', cooperative: 'Kiambu Tea Growers SACCO', creditScore: 91, creditTier: 'A', loanFlow: 'eligible', gradeTrend: 'A', activeSince: '2018-07-12', totalKg: 15220, totalEarned: 456600 },
  { id: 'james', name: 'James Mutua', phone: '0723456789', memberNo: 'JM003', factory: 'Meru Coffee Factory', zone: 'Upper Zone', cooperative: 'Meru Highlands SACCO', creditScore: 67, creditTier: 'B', loanFlow: 'pending', gradeTrend: 'B', activeSince: '2020-01-20', totalKg: 8920, totalEarned: 223000 },
  { id: 'achieng', name: 'Achieng Otieno', phone: '0734567890', memberNo: 'AO004', factory: 'Kisumu Dairy Cooperative', zone: 'Lake View', cooperative: 'Kisumu Dairy Union', creditScore: 78, creditTier: 'A', loanFlow: 'active', gradeTrend: 'A', activeSince: '2017-11-05', totalKg: 10100, totalEarned: 303000 },
  { id: 'peter', name: 'Peter Mwangi', phone: '0745678901', memberNo: 'PM005', factory: 'Nakuru Collection', zone: 'Rift West', cooperative: 'Nakuru Farmers SACCO', creditScore: 45, creditTier: 'C', loanFlow: 'active_overdue', gradeTrend: 'C', activeSince: '2021-04-18', totalKg: 4100, totalEarned: 73800 },
  { id: 'samuel', name: 'Samuel Kipchoge', phone: '0767890123', memberNo: 'SK006', factory: 'Eldoret Depot', zone: 'Timberline', cooperative: 'Eldoret Cooperative', creditScore: 73, creditTier: 'B', loanFlow: 'active', gradeTrend: 'B', activeSince: '2016-09-22', totalKg: 9640, totalEarned: 240200 },
]

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const RECENT_PAYMENTS = [
  { id: 'P1', farmerId: 'wanjiku', farmer: 'Wanjiku Kamau', phone: '0712345678', amount: 18500, deductions: 4200, net: 14300, status: 'Paid', time: `${daysAgo(1)} 14:22`, mpesaRef: 'SLQ1ABCDEF' },
  { id: 'P2', farmerId: 'grace', farmer: 'Grace Njeri', phone: '0756789012', amount: 21200, deductions: 3100, net: 18100, status: 'Pending', time: `${daysAgo(0)} 09:05` },
]

const CHART_DELIVERY_ACTIVITY = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  kg: 1200 + ((i * 37) % 900),
  payments: 180 + ((i * 11) % 80),
}))

const DELIVERIES = []
FARMERS.forEach((f, fi) => {
  ;[0, 7, 14, 21, 28, 35].forEach((offset, i) => {
    const g = ['A', 'B', 'A', 'A', 'C', 'B'][(fi + i) % 6]
    const rates = { A: 30, B: 25, C: 18 }
    const kg = 28 + ((fi * 3 + i * 5) % 25)
    const rate = rates[g]
    const gross = Math.round(kg * rate)
    const deductions = Math.round(gross * 0.12)
    DELIVERIES.push({
      id: `${f.id}-d${i}`,
      farmerId: f.id,
      date: daysAgo(offset + fi),
      kg,
      grade: g,
      rate,
      gross,
      deductions,
      net: gross - deductions,
      status: i === 0 ? 'Pending' : 'Paid',
    })
  })
})

const LOANS = [
  { id: 'L1', farmerId: 'wanjiku', farmerName: 'Wanjiku Kamau', amount: 25000, interestPct: 8, status: 'Active', disbursedAt: '2025-03-05', repaidFraction: 0.67, nextDue: '2025-04-01', instalments: 3 },
  { id: 'L4', farmerId: 'peter', farmerName: 'Peter Mwangi', amount: 12000, interestPct: 12, status: 'Overdue', disbursedAt: '2024-11-01', repaidFraction: 0.25, nextDue: '2025-03-20', instalments: 4 },
  { id: 'L5', farmerId: 'grace', farmerName: 'Grace Njeri', amount: 0, interestPct: 8, status: 'Completed', disbursedAt: '2024-06-01', repaidFraction: 1, instalments: 3 },
]

const MPESA_FEED = [
  { id: 'TX1', type: 'B2C', farmer: 'Grace Njeri', phone: '0756789012', amount: 15000, direction: 'out', code: '0', ts: `${daysAgo(0)} 08:02`, raw: { CommandID: 'BusinessPayment' } },
]

const COMPLAINTS = [
  { id: 'C-201', farmer: 'James Mutua', issue: 'Delayed factory weighbridge slip', status: 'Open', date: daysAgo(4) },
]

module.exports = {
  FARMERS,
  RECENT_PAYMENTS,
  CHART_DELIVERY_ACTIVITY,
  DELIVERIES,
  LOANS,
  MPESA_FEED,
  COMPLAINTS,
}
