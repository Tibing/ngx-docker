import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask, RunSchematicTask } from '@angular-devkit/schematics/tasks';

import { Schema } from './schema';
import { addDevDependencyToPackageJson, getPeerDependencyVersionFromPackageJson, getProjectName, getVersion } from '../util';

export default function(options: Schema): Rule {
  return runSetupSchematics(options);
}

function runSetupSchematics(options: Schema) {
  return (tree: Tree, context: SchematicContext) => {
    const version = getVersion();
    const angularCoreVersion = getPeerDependencyVersionFromPackageJson('@angular/core');
    const angularCdkVersion = getPeerDependencyVersionFromPackageJson('@angular/cdk');

    addDevDependencyToPackageJson(tree, getProjectName(), version);
    addDevDependencyToPackageJson(tree, '@angular/cdk', angularCdkVersion);
    addDevDependencyToPackageJson(tree, '@schematics/angular', angularCoreVersion);

    const installTaskId = context.addTask(new NodePackageInstallTask());
    context.addTask(new RunSchematicTask('setup', options), [installTaskId]);
  };
}
