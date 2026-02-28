import mongoose from 'mongoose';

const logSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      required: true
    },
    endpoint: {
      type: String,
      required: true
    },
    statusCode: {
      type: Number,
      required: true
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    responseTime: {
      type: Number // in milliseconds
    },
    errorMessage: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes
logSchema.index({ user: 1 });
logSchema.index({ createdAt: -1 });
logSchema.index({ statusCode: 1 });
logSchema.index({ action: 1 });

// Auto-delete logs older than 90 days
logSchema.statics.cleanupOldLogs = async function () {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  await this.deleteMany({
    createdAt: { $lt: ninetyDaysAgo }
  });
};

const Log = mongoose.model('Log', logSchema);

export default Log;
