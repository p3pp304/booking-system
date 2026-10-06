import Booking from '../models/Booking.js';

export const getAdminRevenue = async (req, res) => {
  try {
    const { period = 'month', year, month, date } = req.query;

    // 1. Trova la data del primo booking assoluto per sapere da quale anno partire
    const firstBooking = await Booking.findOne({ 
      status: { $in: ['confirmed', 'confermato'] } 
    }).sort({ date: 1 }).select('date');

    const startYear = firstBooking?.date 
      ? new Date(firstBooking.date).getFullYear() 
      : new Date().getFullYear();

    // 2. Calcola l'intervallo temporale
    let startDate, endDate;
    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const targetMonth = parseInt(month, 10) || (new Date().getMonth() + 1); // 1-12

    if (period === 'day') {
      const dayStr = date || new Date().toISOString().split('T')[0];
      startDate = new Date(`${dayStr}T00:00:00.000Z`);
      endDate = new Date(`${dayStr}T23:59:59.999Z`);
    } else if (period === 'month') {
      startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));
    } else if (period === 'year') {
      startDate = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
    }

    // 3. Aggregazione sul DB
    const matchFilter = {
      status: { $in: ['confirmed', 'confermato'] },
      type: { $ne: 'block' },
      date: {
        $gte: startDate.toISOString().split('T')[0],$lte: endDate.toISOString().split('T')[0]
      }
    };

    const stats = await Booking.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$workerName',
          totalRevenue: { $sum: { $ifNull: ['$price', 25] } },
          totalBookings: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = stats.reduce((acc, curr) => acc + curr.totalRevenue, 0);
    const totalCount = stats.reduce((acc, curr) => acc + curr.totalBookings, 0);

    return res.status(200).json({
      startYear,
      currentYear: targetYear,
      currentMonth: targetMonth,
      totalRevenue,
      totalCount,
      averageTicket: totalCount > 0 ? (totalRevenue / totalCount).toFixed(2) : 0,
      breakdown: stats.map(s => ({
        name: s._id || 'Non assegnato',
        total: s.totalRevenue,
        count: s.totalBookings,
        percentage: totalRevenue > 0 ? Math.round((s.totalRevenue / totalRevenue) * 100) : 0
      }))
    });
  } catch (error) {
    console.error('Errore revenue API:', error);
    return res.status(500).json({ message: 'Errore nel recupero degli incassi' });
  }
};