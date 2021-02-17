const { install, packageJson } = require('mrm-core');
const { initGit } = require('../core/git');

module.exports = function task({ devDependencies }) {
  initGit();
  const pkg = packageJson();
  pkg
    .merge({
      config: {
        commitizen: {
          path: './node_modules/cz-conventional-changelog',
        },
      },
    })
    .save();
  pkg.setScript('git-cz', 'cz').save();
  install(devDependencies);
};

module.exports.description = 'Adds Commitizen, cz-conventional-changelog';
module.exports.parameters = {
  devDependencies: {
    type: 'config',
    default: ['commitizen', 'cz-conventional-changelog'],
  },
};
