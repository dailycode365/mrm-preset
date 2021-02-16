const { install, packageJson, file, json } = require("mrm-core");
const execCommand = require("mrm-core/src/util/execCommand");
const PKG_NAME = "package.json";

module.exports = function task({ devDependencies }) {
	json(".versionrc.json").save();
	install(devDependencies);
	if (!file(PKG_NAME).exists()) {
		execCommand(undefined, "npm", ["init", "-y"]);
	}
	const pkg = packageJson();
	if (!pkg.get("version")) {
		pkg.set("version", "1.0.0").save();
	}
	pkg.setScript("sv-release", "standard-version -n -r patch").save();
	pkg
		.merge({
			"standard-version": {
				scripts: {
					// posttag: "git push --follow-tags origin master",
				},
			},
		})
		.save();
};

module.exports.description = "Adds Standard-Version";
module.exports.parameters = {
	devDependencies: {
		type: "config",
		default: ["standard-version"],
	},
};
