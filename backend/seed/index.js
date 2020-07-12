const {
  sequelize,
  Logical,
  User,
  LogicalRating
} = require('../models');

const Promise = require('bluebird');
const logicals = require('./logicals.json');
const users = require('./users.json');
const logicalRatings = require('./logicalRatings.json');

sequelize.sync({force: true})
  .then( async () => {
    console.log();
    await Promise.all(
      users.map(user => 
        User.create(user)
      )
    );
    await Promise.all(
      logicals.map(logical => 
        Logical.create(logical)
      )
    );
    await Promise.all(
      logicalRatings.map(logicalRating => 
        LogicalRating.create(logicalRating)
      )
    );
  });