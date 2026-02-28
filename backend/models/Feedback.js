import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event is required']
    },
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Volunteer is required']
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    isApproved: {
      type: Boolean,
      default: true
    },
    flaggedAsInappropriate: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to prevent duplicate feedback
// One volunteer can only give one feedback per event
feedbackSchema.index({ volunteer: 1, event: 1 }, { unique: true });

// Additional indexes
feedbackSchema.index({ event: 1 });
feedbackSchema.index({ volunteer: 1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ createdAt: -1 });

// Static method to calculate average rating for an event
feedbackSchema.statics.calculateAverageRating = async function (eventId) {
  const result = await this.aggregate([
    {
      $match: { 
        event: eventId,
        isApproved: true,
        flaggedAsInappropriate: false
      }
    },
    {
      $group: {
        _id: '$event',
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    await mongoose.model('Event').findByIdAndUpdate(eventId, {
      averageRating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
      totalRatings: result[0].totalRatings
    });
  } else {
    await mongoose.model('Event').findByIdAndUpdate(eventId, {
      averageRating: 0,
      totalRatings: 0
    });
  }
};

// Update event rating after feedback is saved
feedbackSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.event);
});

// Update event rating after feedback is deleted
feedbackSchema.post('remove', async function () {
  await this.constructor.calculateAverageRating(this.event);
});

// Update event rating after feedback is updated
feedbackSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) {
    await doc.constructor.calculateAverageRating(doc.event);
  }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
