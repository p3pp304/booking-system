import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Il nome dell'operatore è obbligatorio"],
      trim: true
    },
    // Colore distintivo (badge o blocco sul calendario admin)
    color: {
      type: String,
      default: '#3b82f6' // Blu standard Tailwind
    },
    // Se è false (es. in ferie o assente), non viene conteggiato per gli slot
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default:false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const Worker = mongoose.model('Worker', workerSchema);

export default Worker;