import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Il nome del servizio è obbligatorio'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    price: {
      type: Number,
      required: [true, 'Il prezzo è obbligatorio'],
      min: [0, 'Il prezzo non può essere negativo']
    },
    // Durata in minuti fondamentale per calcolare gli slot sul calendario
    durationMinutes: {
      type: Number,
      required: [true, 'La durata in minuti è obbligatoria'],
      min: [5, 'La durata minima è di 5 minuti'],
      default: 30
    },
    category: {
      type: String,
      trim: true,
      default: 'Generale' // es. "Capelli", "Barba", "Viso", "Unghie"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Service = mongoose.model('Service', serviceSchema);
export default Service;