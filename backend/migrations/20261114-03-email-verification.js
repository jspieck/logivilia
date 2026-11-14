// E-mail verification (audit B15, GDPR), and a wider reset-expiry column.
//
// Accounts that exist before this migration count as verified: they were
// created before verification existed, and blocking them now would lock
// long-time users out of commenting.

const { ensureColumn } = require('./helpers');

module.exports = {
  async up (qi, Sequelize) {
    const columns = await qi.describeTable('Users');
    if (!columns.emailVerified) {
      await qi.addColumn('Users', 'emailVerified', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
      await qi.bulkUpdate('Users', { emailVerified: true }, {});
    }
    // SHA-256 of the token in the verification link (like reset tokens).
    await ensureColumn(qi, 'Users', 'emailVerificationToken', { type: Sequelize.STRING, allowNull: true });

    // Unix seconds; INT would overflow in 2038. SQLite integers are 64-bit
    // already, and changing a column there rebuilds the whole table.
    if (qi.sequelize.getDialect() !== 'sqlite') {
      await qi.changeColumn('Users', 'resetPasswordExpires', { type: Sequelize.BIGINT, allowNull: true });
    }
  },

  async down (qi) {
    await qi.removeColumn('Users', 'emailVerificationToken');
    await qi.removeColumn('Users', 'emailVerified');
  }
};
