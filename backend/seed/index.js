const {
  sequelize,
  Logical,
  Nonogram,
  Linelog,
  User,
  LogicalRating,
  NonogramRating,
  LinelogRating,
  Comment,
  CommentUpvotes
} = require('../models');

const Promise = require('bluebird');
const logicals = require('./logicals.json');
const nonograms = require('./nonograms.json');
const linelogs = require('./linelogs.json');
const users = require('./users.json');
const logicalRatings = require('./logicalRatings.json');
const nonogramRatings = require('./nonogramRatings.json');
const linelogRatings = require('./linelogRatings.json');
const comments = require('./comments.json');
const commentUpvotes = require('./commentsUpvotes.json');

sequelize.sync({force: true})
  .then( async () => {
    console.log();
    await Promise.all(
      users.map(user => 
        User.create(user)
      )
    );
    await Promise.all(
      comments.map(comment => 
        Comment.create(comment)
      )
    );
    await Promise.all(
      commentUpvotes.map(upvote => 
        CommentUpvotes.create(upvote)
      )
    ); 
    await Promise.all(
      logicals.map(logical => 
        Logical.create(logical)
      )
    );
    await Promise.all(
      nonograms.map(nonogram => 
        Nonogram.create(nonogram)
      )
    );
    await Promise.all(
      linelogs.map(linelog => 
        Linelog.create(linelog)
      )
    );
    await Promise.all(
      logicalRatings.map(logicalRating => 
        LogicalRating.create(logicalRating)
      )
    );
    await Promise.all(
      nonogramRatings.map(nonogramRating => 
        NonogramRating.create(nonogramRating)
      )
    );
    await Promise.all(
      linelogRatings.map(linelogRating => 
        LinelogRating.create(linelogRating)
      )
    );
  });