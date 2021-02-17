const {
  packageJson, install, lines, file,
} = require('mrm-core');
const execCommand = require('mrm-core/src/util/execCommand');
const fs = require('fs');
const { initGit } = require('../core/git');

const PKG_NAME = 'package.json';

module.exports = function task({ mrmPreset, devDependencies }) {
  // 初始化git
  initGit();
  if (!file(PKG_NAME).exists()) {
    execCommand(undefined, 'npm', ['init', '-y']);
  }

  const pkg = packageJson();
  if (!pkg.get('version')) {
    pkg.set('version', '1.0.0').save();
  }
  pkg
    .setScript('mrm', `mrm --preset ${mrmPreset}`)
    .setScript('all', 'npm run mrm all');
  pkg.save();
  install(devDependencies);

  // 加入gitignore
  const remove = ['node_modules'];
  const add = [
    'node_modules/',
    '.DS_Store',
    'Thumbs.db',
    '.idea/',
    '.vscode/',
    '*.sublime-project',
    '*.sublime-workspace',
    '*.log',
  ];

  // If project uses npm, ignore yarn.lock
  if (fs.existsSync('package-lock.json')) {
    add.push('yarn.lock');
    remove.push('package-lock.json');
  }

  // If project uses Yarn, ignore package-lock.json
  if (fs.existsSync('yarn.lock')) {
    remove.push('yarn.lock');
    add.push('package-lock.json');
  }

  // .gitignore
  lines('.gitignore').remove(remove).add(add).save();
};

module.exports.description = 'Init a new project.';
module.exports.parameters = {
  mrmPreset: {
    type: 'config',
    default: '@zpf518518/mrm-preset',
  },
  devDependencies: {
    type: 'config',
    default: ['mrm', '@zpf518518/mrm-preset'],
  },
};
