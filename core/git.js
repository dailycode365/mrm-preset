const { file } = require('mrm-core');
const execCommand = require('mrm-core/src/util/execCommand');

function hasGit() {
  return file('.git/config').exists();
}
function initGit() {
  if (!hasGit()) {
    execCommand(undefined, 'git', ['init']);
  }
}

module.exports = {
  hasGit,
  initGit,
};
