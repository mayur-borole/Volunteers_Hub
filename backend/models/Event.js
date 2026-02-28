import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    address: {
      street: String,
      city: String,
      area: String,
      state: String,
      zipCode: String,
      country: String
    },
    googleMapsLink: {
      type: String,
      trim: true
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: 'Event date must be in the future'
      }
    },
    // Start and end timestamps are stored as Date objects so we can
    // accurately compute volunteer hours when the event is completed.
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    registrationDeadline: {
      type: Date,
      validate: {
        validator: function(value) {
          if (!value) return true;
          return value < this.date;
        },
        message: 'Registration deadline must be before event date'
      }
    },
    instructionsForVolunteers: {
      type: String,
      trim: true,
      maxlength: [2000, 'Instructions cannot exceed 2000 characters'],
      default: ''
    },
    maxVolunteers: {
      type: Number,
      required: [true, 'Maximum volunteers limit is required'],
      min: [1, 'Must allow at least 1 volunteer'],
      max: [1000, 'Cannot exceed 1000 volunteers']
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    volunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    approvedVolunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    registrations: [
      {
        volunteerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Name cannot exceed 100 characters']
        },
        age: {
          type: Number,
          required: true,
          min: [1, 'Age must be at least 1'],
          max: [120, 'Age cannot exceed 120']
        },
        gender: {
          type: String,
          required: true,
          trim: true,
          enum: ['male', 'female', 'other', 'prefer-not-to-say']
        },
        phone: {
          type: String,
          required: true,
          trim: true,
          maxlength: [20, 'Phone cannot exceed 20 characters']
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'cancelled'],
          default: 'pending'
        },
        cancellationReason: {
          type: String,
          trim: true,
          maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
          default: ''
        },
        reviewedAt: {
          type: Date,
          default: null
        },
        rejectionReason: {
          type: String,
          trim: true,
          maxlength: [300, 'Rejection reason cannot exceed 300 characters'],
          default: ''
        },
        // Attendance fields (per volunteer registration)
        present: {
          type: Boolean,
          default: false
        },
        attendanceMarkedAt: {
          type: Date,
          default: null
        },
        // Free‑form text entered by organizer, e.g. "3 hours", "2.5 hrs"
        workDuration: {
          type: String,
          trim: true,
          maxlength: [100, 'Work duration description cannot exceed 100 characters'],
          default: ''
        },
        certificateGenerated: {
          type: Boolean,
          default: false
        },
        // Rating given by organizer to this volunteer for this event
        organizerRating: {
          type: Number,
          min: 1,
          max: 5
        },
        // Feedback and rating given by volunteer about this event
        volunteerFeedback: {
          type: String,
          trim: true,
          maxlength: [1000, 'Feedback cannot exceed 1000 characters']
        },
        volunteerRatingForEvent: {
          type: Number,
          min: 1,
          max: 5
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    approved: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: {
        values: ['upcoming', 'completed', 'cancelled'],
        message: 'Status must be upcoming, completed, or cancelled'
      },
      default: 'upcoming'
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function(value) {
          return value.length <= 10;
        },
        message: 'Cannot upload more than 10 images'
      }
    },
    imageUrl: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      enum: ['education', 'healthcare', 'environment', 'social welfare', 'disaster relief', 'other'],
      default: 'other'
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    totalRegistrations: {
      type: Number,
      default: 0
    },
    // Attendance and impact metrics
    attendance: [
      {
        volunteerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        present: {
          type: Boolean,
          default: false
        }
      }
    ],
    totalVolunteerHours: {
      type: Number,
      default: 0,
      min: 0
    },
    // Soft delete flag so we don't lose historical data
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Once true, attendance and workDuration can no longer be edited
    attendanceLocked: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance and queries
eventSchema.index({ location: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ approved: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ 'attendance.volunteerId': 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });
eventSchema.index({ 'registrations.volunteerId': 1, 'registrations.status': 1 });
eventSchema.index({ approvedVolunteers: 1 });

// Compound index for common queries
eventSchema.index({ approved: 1, status: 1, date: 1 });

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function () {
  return this.maxVolunteers - this.approvedVolunteers.length;
});

// Virtual for is event full
eventSchema.virtual('isFull').get(function () {
  return this.approvedVolunteers.length >= this.maxVolunteers;
});

// Virtual for feedback
eventSchema.virtual('feedbacks', {
  ref: 'Feedback',
  localField: '_id',
  foreignField: 'event'
});

// Update status automatically based on date
eventSchema.pre('save', function (next) {
  const now = new Date();
  if (this.date < now && this.status === 'upcoming') {
    this.status = 'completed';
  }

  if (!Array.isArray(this.approvedVolunteers)) {
    this.approvedVolunteers = [];
  }

  if (!Array.isArray(this.volunteers)) {
    this.volunteers = [];
  }

  const approvedSet = new Set(this.approvedVolunteers.map((id) => id.toString()));
  this.volunteers = this.volunteers.filter((id) => approvedSet.has(id.toString()));

  const volunteerSet = new Set(this.volunteers.map((id) => id.toString()));
  this.approvedVolunteers = this.approvedVolunteers.filter((id) => volunteerSet.has(id.toString()));

  next();
});

// Increment totalRegistrations when volunteer is added
eventSchema.methods.addVolunteer = function (volunteerId) {
  const volunteerIdStr = volunteerId.toString();
  const isInVolunteers = this.volunteers.some((id) => id.toString() === volunteerIdStr);
  const isInApprovedVolunteers = this.approvedVolunteers.some((id) => id.toString() === volunteerIdStr);

  if (!isInVolunteers) {
    this.volunteers.push(volunteerId);
  }

  if (!isInApprovedVolunteers) {
    this.approvedVolunteers.push(volunteerId);
    this.totalRegistrations += 1;
  }
};

// Decrement when volunteer is removed
eventSchema.methods.removeVolunteer = function (volunteerId) {
  const volunteerIdStr = volunteerId.toString();
  const wasApproved = this.approvedVolunteers.some((id) => id.toString() === volunteerIdStr);
  this.volunteers = this.volunteers.filter((id) => id.toString() !== volunteerIdStr);
  this.approvedVolunteers = this.approvedVolunteers.filter((id) => id.toString() !== volunteerIdStr);

  if (wasApproved && this.totalRegistrations > 0) {
    this.totalRegistrations -= 1;
  }
};

const Event = mongoose.model('Event', eventSchema);

export default Event;
