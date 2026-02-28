import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    password: {
      type: String,
      required: function() {
        return this.provider === 'local';
      },
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't return password in queries by default
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true
    },
    role: {
      type: String,
      enum: {
        values: ['volunteer', 'organizer', 'admin'],
        message: 'Role must be either volunteer, organizer, or admin'
      },
      default: 'volunteer'
    },
    skills: {
      type: [String],
      default: []
    },
    interests: {
      type: [String],
      default: []
    },
    availability: {
      type: String,
      enum: ['weekdays', 'weekends', 'both', 'flexible'],
      default: 'flexible'
    },
    phone: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    profileImage: {
      type: String,
      default: ''
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    refreshToken: {
      type: String,
      select: false
    },
    // Volunteering impact metrics
    totalVolunteerHours: {
      type: Number,
      default: 0,
      min: 0
    },
    impactScore: {
      type: Number,
      default: 0,
      min: 0
    },
    // Total number of events where the volunteer has
    // completed attendance and received a certificate
    completedEventsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    // Certificates earned by the volunteer
    certificates: [
      {
        // Legacy/internal key
        event: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Event',
          required: false
        },
        // API-friendly key
        eventId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Event',
          required: false
        },
        // Legacy/internal key
        eventTitle: {
          type: String,
          required: false,
          trim: true,
          maxlength: [200, 'Event title on certificate cannot exceed 200 characters']
        },
        // API-friendly key
        eventName: {
          type: String,
          required: false,
          trim: true,
          maxlength: [200, 'Event name on certificate cannot exceed 200 characters']
        },
        // Legacy/internal key
        url: {
          type: String
        },
        // API-friendly key
        certificateURL: {
          type: String
        },
        // Legacy/internal key
        workDuration: {
          type: String,
          trim: true,
          default: ''
        },
        // API-friendly key
        workTime: {
          type: String,
          trim: true,
          default: ''
        },
        // Organizer rating given to this volunteer for this event
        rating: {
          type: Number,
          min: 1,
          max: 5
        },
        issuedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ skills: 1 });
userSchema.index({ isBlocked: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.__v;
  return user;
};

// Virtual for events participated (if needed)
userSchema.virtual('eventsParticipated', {
  ref: 'Event',
  localField: '_id',
  foreignField: 'volunteers'
});

const User = mongoose.model('User', userSchema);

export default User;
