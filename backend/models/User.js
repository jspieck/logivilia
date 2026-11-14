const Promise = require('bluebird');
const bcrypt = Promise.promisifyAll(require('bcryptjs'));

function hashPassword (user, options) {
  const SALT_FACTOR = 8;
  if (!user.changed('password')) {
    return;
  }

  return bcrypt.genSalt(SALT_FACTOR)
    .then(salt => bcrypt.hash(user.password, salt))
    .then(hash => {
      user.setDataValue('password', hash);
    });
}

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: {
      type: DataTypes.STRING,
      unique: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true
    },
    role: DataTypes.STRING,
    gender: DataTypes.STRING,
    bio: DataTypes.TEXT,
    birthyear: DataTypes.INTEGER,
    userImageId: DataTypes.INTEGER,
    city: DataTypes.STRING,
    joined: DataTypes.DATE,
    // The old solved*/created* JSON columns may still exist in older
    // databases; they are unused since solves moved to PuzzleSolves.
    password: DataTypes.STRING,
    resetPasswordToken: DataTypes.STRING,
    // Unix seconds
    resetPasswordExpires: DataTypes.BIGINT,
    // Set when the user opens the link from the verification e-mail.
    // Unverified users cannot comment or publish puzzles.
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // SHA-256 of the token in the verification link
    emailVerificationToken: DataTypes.STRING
  }, {
    hooks: {
      beforeSave: hashPassword,
    }
  });

  User.associate = function(models) {
    User.hasMany(models.Puzzle, { foreignKey: 'UserId' });
    User.hasMany(models.PuzzleSolve, { foreignKey: 'UserId' });
    User.hasMany(models.PuzzleRating, { foreignKey: 'UserId' });
  };

  User.prototype.comparePassword = function (password) {
    return bcrypt.compareAsync(password, this.password);
  };

  return User;
};