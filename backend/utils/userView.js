// Fields of a user that may be sent to the logged-in user themself.
// Never include password, resetPasswordToken or resetPasswordExpires.
const PRIVATE_FIELDS = [
  'id', 'email', 'username', 'role', 'gender', 'bio', 'birthyear',
  'userImageId', 'city', 'joined'
];

// Fields of a user that anyone may see on a public profile.
const PUBLIC_FIELDS = PRIVATE_FIELDS.filter(f => f !== 'email');

function pick (user, fields) {
  const source = typeof user.toJSON === 'function' ? user.toJSON() : user;
  const result = {};
  for (const field of fields) {
    result[field] = source[field];
  }
  return result;
}

module.exports = {
  ownUser: user => pick(user, PRIVATE_FIELDS),
  publicUser: user => pick(user, PUBLIC_FIELDS)
};
