const debug = require('debug')('app.users.model')
const validators = require('validator')
const mongoose = require('mongoose')
const crypto = require('crypto')
const Schema = mongoose.Schema

debug('loaded')

const UserSchema = new Schema({
    name : {
      type: String,
      unique: true
    },
    email : {
      type: String,
      unique: true,
      index: true,
      required: [true, 'Only valid email addresses are accepted.'],
      validate: {
        validator: (email) => validators.isEmail(email),
        message: '{VALUE} does not appear to be a valid email address.'
       }
    },
    biography: { type: String },
    password_hash: { type: Buffer, required: true },
    password_salt: { type: Buffer, default: getFreshSalt },
    session_key: { type: String, default: getFreshSalt64 },
    image_name: { type: String }
}, {
  timestamps: true
});

UserSchema.pre('save', beforeSave)
function beforeSave(next) {
  //debug('Modifying user', this.name);
  if (!this.name) {
    this.name = this.email.replace(/@.*/,'');
  }
  next();
};

UserSchema.methods.getImageAsResource = function() {
  var path = this.image_name;
  return path;
};

UserSchema.methods.hasImageResource = function() {
  var hasResource = this.image_name ? this.image_name.length > 0 : false;
  return hasResource;
};

/**
* Returns an object with **only** the required data meant to reside in client cookies.
*/
UserSchema.methods.public = function() {
  var public = {
    _id: this._id,
    session_key: this.session_key
  };
  return public;
}

UserSchema.methods.resetSession = function() {
  this.session_key = getFreshSalt64()
  return this.save()
}

UserSchema.methods.hashPassword = function(raw_password) {
  const iterations = 10000;
  const bit_length = 64;

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(raw_password, this.password_salt, iterations, bit_length, 'sha512', (e, hash) => {
      if (e) return reject(e)
      return resolve(hash)
    });
  })
}

function getFreshSalt() {
  return crypto.randomBytes(16)
}

function getFreshSalt64() {
  return getFreshSalt().toString('base64')
}

const UserModel = mongoose.model('User', UserSchema);
module.exports.UserModel = UserModel;
