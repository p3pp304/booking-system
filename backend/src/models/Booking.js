// models/Booking.js
import mongoose from 'mongoose';
import crypto from 'crypto'; // modulo di Node.js fornisce crittografia avanzata

const bookingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['appointment', 'block', 'vacation'],
      default: 'appointment'
    },

    // workerId: SEMPRE OBBLIGATORIO (ogni blocco o appuntamento ha un barbiere assegnato)
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: [true, 'Il barbiere/operatore è obbligatorio.']
    },

    // serviceId: Obbligatorio SOLO per i clienti reali
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: function () {
        return this.type === 'appointment';
      }
    },

    // clientName: Obbligatorio SOLO per i clienti reali (per i blocchi puoi usare note o reason)
    clientName: {
      type: String,
      trim: true,
      required: function () {
        return this.type === 'appointment';
      }
    },

    // clientPhone: Obbligatorio SOLO per i clienti reali
    clientPhone: {
      type: String,
      trim: true,
      required: function () {
        return this.type === 'appointment';
      }
    },
    price: {
      type: Number,
      min: 0,
    },
    startTime: { 
      type: Date, 
      required: true 
    },
    endTime: { 
      type: Date, 
      required: true 
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: { 
      type: String, 
      enum: ['confirmed', 'completed', 'cancelled', 'blocked'], 
      default: 'confirmed' 
    },
    // Token univoco casuale generato per il link di cancellazione WhatsApp
    cancellationCode: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(16).toString('hex')
    },
    // Flag per evitare invii doppi di messaggi WhatsApp
    whatsappNotification: {
      confirmationSent: { type: Boolean, default: false },
      reminderSent24hSent: { type: Boolean, default: false },
      reminder2hSent:   { type: Boolean, default: false }
    }
  }, 
  { timestamps: true }
);

// Indice per velocizzare il calcolo sovrapposizioni e disponibilità slot
bookingSchema.index({ workerId: 1, startTime: 1, endTime: 1 });

// Indice per storico cliente, login passwordless e aggregazione statistiche
bookingSchema.index({ clientPhone: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;