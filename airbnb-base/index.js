const _ = require("lodash");
const path = require("path");
const {
  json,
  packageJson,
  lines,
  install,
  uninstall,
  getExtsFromCommand,
} = require("mrm-core");

const getConfigName = (configName, scope, prefix) => {
  if (!scope && !configName.startsWith(prefix)) {
    return `${prefix}-${configName}`;
  } else if (scope && !configName) {
    return prefix;
  } else {
    return configName;
  }
};

const normalizeExtendsPackageName = (extendsName) => {
  const prefix = "eslint-config";
  const extendsNameRegex = /^(?:(@[^/]+)\/?)?((?:eslint-config-)?[^/]*)(?:\/[^/]+)?$/;
  const match = extendsName.match(extendsNameRegex);

  if (!match) {
    throw new Error(
      `Invalid extends name is passed to the eslint task: ${extendsName}`
    );
  }

  const [, scope = "", configNameRaw] = match;
  const configName = getConfigName(configNameRaw, scope, prefix);

  const packageName = `${scope ? `${scope}/` : ""}${configName}`;

  return packageName;
};

module.exports = function task({ eslintExtends }) {
  let exts = "";
  const legacyConfigFile = ".eslintrc";
  const configFile = ".eslintrc.json";
  const ignores = ["node_modules/"];
  const ignoresToRemove = ["node_modules"];
  const gitIgnores = [".eslintcache"];
  const packages = ["eslint"];
  const packagesToRemove = ["jslint", "jshint"];
  const ctCfgFileName = path.join(__dirname, "config.json");

  // custom config.json
  const ctCfgFile = json(ctCfgFileName);
  const eslintPeerDependencies = ctCfgFile.get("eslintPeerDependencies", []);
  const eslintObsoleteDependencies = ctCfgFile.get(
    "eslintObsoleteDependencies",
    []
  );
  const eslintRules = ctCfgFile.get("eslintRules", []);
  const eslintGlobals = ctCfgFile.get("eslintGlobals", []);
  const eslintOverrides = ctCfgFile.get("eslintOverrides", []);
  const eslintParserOptions = ctCfgFile.get("eslintParserOptions", []);

  // Extends
  if (eslintExtends !== "airbnb-base") {
    packages.push(normalizeExtendsPackageName(eslintExtends));
  }
  // Peer dependencies
  packages.push(...eslintPeerDependencies);

  // Migrate legacy config
  const legacyEslintrc = json(legacyConfigFile);
  const legacyConfig = legacyEslintrc.get();
  legacyEslintrc.delete();

  // .eslintrc.json
  const eslintrc = json(configFile, legacyConfig);
  const hasCustomExtends = _.castArray(eslintrc.get("extends", [])).find((x) =>
    x.startsWith(eslintExtends)
  );
  if (!hasCustomExtends) {
    const customExtends = eslintrc.get("extends");
    if (!customExtends) {
      eslintrc.set("extends", eslintExtends);
    } else {
      eslintrc.set("extends", [..._.castArray(customExtends), eslintExtends]);
    }
  }

  if (eslintRules) {
    eslintrc.merge({
      rules: eslintRules,
    });
  }
  if (eslintGlobals) {
    eslintrc.merge({
      globals: eslintGlobals,
    });
  }
  let overrides = _.castArray(eslintrc.get("overrides", []));
  if (eslintOverrides) {
    eslintrc.set("overrides", [...overrides, ...eslintOverrides]);
  }

  if (eslintParserOptions) {
    eslintrc.merge({
      parserOptions: eslintParserOptions,
    });
  }
  const pkg = packageJson();

  // TODO: Babel
  // Not sure how to detect that we need it, checking for babel-core is not enough because
  // babel-eslint is only needed for experimental features and Flow (this one is easy to test)
  // Flow also needs this: https://github.com/gajus/eslint-plugin-flowtype
  // if (pkg.get('devDependencies.babel-core')) {
  // 	packages.push('babel-eslint');
  // 	eslintrc.set('parser', 'babel-eslint');
  // }
  eslintrc.set("parser", "babel-eslint");

  if (pkg.get("devDependencies.prettier")) {
    packages.push("eslint-config-prettier");
    const extensions = eslintrc.get("extends", []);
    eslintrc.merge({
      extends: [
        ...(Array.isArray(extensions) ? extensions : [extensions]),
        "prettier",
        "prettier/@typescript-eslint",
      ],
    });
  }

  // TypeScript
  // if (pkg.get("devDependencies.typescript")) {
  //   const parser = "@typescript-eslint/parser";
  //   const plugin = "@typescript-eslint/eslint-plugin";
  //   packages.push(parser, plugin);
  //   eslintrc.merge({
  //     parser,
  //     plugins: [plugin],
  //     parserOptions: {
  //       // If using React, turn on JSX support in the TypeScript parser.
  //       ...(pkg.get("dependencies.react") && {
  //         ecmaFeatures: {
  //           jsx: true,
  //         },
  //       }),
  //       project: "./tsconfig.json",
  //     },
  //     rules: eslintRules || {},
  //   });
  //   exts = " --ext .ts,.tsx";

  //   if (pkg.get("devDependencies.prettier")) {
  //     packages.push("eslint-config-prettier");
  //     const extensions = eslintrc.get("extends", []);
  //     eslintrc.merge({
  //       extends: [
  //         ...(Array.isArray(extensions) ? extensions : [extensions]),
  //         "prettier",
  //         "prettier/@typescript-eslint",
  //       ],
  //     });
  //   }
  // }

  eslintrc.save();

  // .eslintignore
  lines(".eslintignore").remove(ignoresToRemove).add(ignores).save();

  // .gitignore
  lines(".gitignore").add(gitIgnores).save();

  // Keep custom extensions
  const lintScript =
    pkg.getScript("lint", "eslint") || pkg.getScript("test", "eslint");
  if (lintScript) {
    const lintExts = getExtsFromCommand(lintScript, "ext");
    if (lintExts && lintExts.toString() !== "js") {
      const extsPattern = lintExts.map((x) => `.${x}`).join(",");
      exts = ` --ext ${extsPattern}`;
    }
  }

  pkg
    // Remove existing JS linters
    .removeScript(/^(lint:js|eslint|jshint|jslint)$/)
    .removeScript("test", / (lint|lint:js|eslint|jshint|jslint)( |$)/) // npm run jest && npm run lint
    .removeScript("test", /\beslint|jshint|jslint\b/) // jest && eslint
    // Add lint script
    .setScript("lint", "eslint . --cache --fix" + exts)
    // Add pretest script
    .prependScript("pretest", "npm run lint")
    .save();

  // Dependencies
  uninstall([...packagesToRemove, ...eslintObsoleteDependencies]);
  install(packages);
};

module.exports.description = "Adds ESLint";
module.exports.parameters = {
  eslintExtends: {
    type: "input",
    message: "Enter ESlint extends name",
    default: "airbnb-base",
  },
};
