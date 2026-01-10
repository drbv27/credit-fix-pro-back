const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    smartcreditCredentials: {
      email: {
        type: String,
        required: [true, 'SmartCredit email is required'],
        trim: true,
      },
      password: {
        type: String,
        required: [true, 'SmartCredit password is required'],
      },
    },
    lastReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreditReport',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  // Only hash if password is modified or new
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to get user without sensitive data
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.smartcreditCredentials.password; // Remove SmartCredit password from responses
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
