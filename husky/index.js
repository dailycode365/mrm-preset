const { install, packageJson } = require('mrm-core');

module.exports = function task({ devDependencies }) {
  install(devDependencies);
  const pkg = packageJson();
  pkg
    .merge({
      husky: {
        hooks: {},
      },
    })
    .save();
};

module.exports.description = 'Add Husky';
module.exports.parameters = {
  devDependencies: {
    type: 'config',
    default: ['husky@4'],
  },
};
