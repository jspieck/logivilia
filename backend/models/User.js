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

  User.associate = function(models) {
    // Associations for solved puzzles with renamed aliases
    User.belongsToMany(models.Logical, {
      through: 'UserSolvedLogicals',
      as: 'solvedLogicalsRel',
      foreignKey: 'userId'
    });
    User.belongsToMany(models.Nonogram, {
      through: 'UserSolvedNonograms',
      as: 'solvedNonogramsRel',
      foreignKey: 'userId'
    });
    User.belongsToMany(models.Linelog, {
      through: 'UserSolvedLinelogs',
      as: 'solvedLinelogsRel',
      foreignKey: 'userId'
    });

    // Associations for created puzzles with renamed aliases
    User.hasMany(models.Logical, {
      as: 'createdLogicalsRel',
      foreignKey: 'userId'
    });
    User.hasMany(models.Nonogram, {
      as: 'createdNonogramsRel',
      foreignKey: 'userId'
    });
    User.hasMany(models.Linelog, {
      as: 'createdLinelogsRel',
      foreignKey: 'userId'
    });
  };

  User.prototype.comparePassword = function (password) {
    return bcrypt.compareAsync(password, this.password);
  };

  return User;
};