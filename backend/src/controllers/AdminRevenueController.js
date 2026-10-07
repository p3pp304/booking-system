import Booking from '../models/Booking.js';

export const getAdminRevenue = async (req, res) => {
  try {
    const { period = 'month', year, month, date } = req.query;

    // 1. Trova la data del primo booking assoluto per sapere da quale anno partire
    const firstBooking = await Booking.findOne({
      status: { $in: ['confirmed', 'completed', 'confermato'] },
      type: { $ne: 'block' },
    }).sort({ startTime: 1 }).select('startTime');

    const startYear = firstBooking?.startTime
      ? new Date(firstBooking.startTime).getFullYear()
      : new Date().getFullYear();

    // 2. Calcola l'intervallo temporale
    let startDate, endDate;
    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const targetMonth = parseInt(month, 10) || (new Date().getMonth() + 1); // 1-12

    if (period === 'day') {
      const dayStr = date || new Date().toISOString().split('T')[0];
      const [dayYear, dayMonth, dayOfMonth] = dayStr.split('-').map(Number);
      startDate = new Date(dayYear, dayMonth - 1, dayOfMonth, 0, 0, 0, 0);
      endDate = new Date(dayYear, dayMonth - 1, dayOfMonth, 23, 59, 59, 999);
    } else if (period === 'month') {
      startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));
    } else if (period === 'year') {
      startDate = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
    } else {
      return res.status(400).json({ error: 'Periodo non valido.' });
    }

    // 3. Aggregazione: usa lo snapshot prezzo e fallback ai dati servizio per i record legacy.
    const matchFilter = {
      status: { $in: ['confirmed', 'completed', 'confermato'] },
      type: { $ne: 'block' },
      startTime: { $gte: startDate, $lte: endDate },
    };

    const stats = await Booking.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      {
        $lookup: {
          from: 'workers',
          localField: 'workerId',
          foreignField: '_id',
          as: 'worker',
        },
      },
      {
        $group: {
          _id: { $ifNull: [{ $arrayElemAt: ['$worker.name', 0] }, 'Non assegnato'] },
          totalRevenue: {
            $sum: {
              $ifNull: [
                '$price',
                { $ifNull: [{ $arrayElemAt: ['$service.price', 0] }, 25] },
              ],
            },
          },
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