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
    age: DataTypes.INTEGER,
    userImageId: DataTypes.INTEGER,
    city: DataTypes.STRING,
    joined: DataTypes.DATE,
    solvedLogicals: DataTypes.JSON,
    solvedNonograms: DataTypes.JSON,
    solvedLinelogs: DataTypes.JSON,
    createdLogicals: DataTypes.JSON,
    createdNonograms: DataTypes.JSON,
    createdLinelogs: DataTypes.JSON,
    password: DataTypes.STRING,
    resetPasswordToken: DataTypes.STRING,
    resetPasswordExpires: DataTypes.INTEGER
  }, {
    hooks: {
      beforeSave: hashPassword,
    }
  });

  User.prototype.comparePassword = function (password) {
    return bcrypt.compareAsync(password, this.password)
  };

  return User;
};