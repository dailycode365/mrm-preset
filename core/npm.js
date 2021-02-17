const { file, packageJson } = require('mrm-core');

function hasPkgJson() {
  return file('package.json').exists();
}

module.exports = {
  hasPkgJson,
};
