const { install, packageJson, file, json } = require("mrm-core");
const { initGit } = require("../core/git");

module.exports = function task({ devDependencies }) {
	json(".commitlintrc.json", {
		extends: ["@commitlint/config-conventional"],
	}).save();
	install(devDependencies);
	initGit();
	const pkg = packageJson();
	if (!pkg.get("devDependencies.husky")) {
		install("husky@4");
	}
	pkg
		.merge({
			husky: {
				hooks: {
					"commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
				},
			},
		})
		.save();
};

module.exports.description = "Adds Commitlint";
module.exports.parameters = {
	devDependencies: {
		type: "config",
		default: ["@commitlint/config-conventional", "@commitlint/cli"],
	},
};
