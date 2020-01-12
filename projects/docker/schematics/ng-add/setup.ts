import { WorkspaceProject, WorkspaceTool } from '@angular-devkit/core/src/experimental/workspace';
import { Tree } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/config';
import { getProjectFromWorkspace } from '@angular/cdk/schematics';

import { Schema } from './schema';
import { getProjectName, writeJSON } from '../util';


export default function(options: Schema) {
  return (tree: Tree) => {

    const workspace = getWorkspace(tree);
    const project: WorkspaceProject = getProjectFromWorkspace(workspace, options.project);

    installBuildersForProject(project);

    writeJSON(tree, 'angular.json', workspace);

    return tree;
  };
}

function installBuildersForProject(project: WorkspaceProject): void {
  const builders = ['build-image', 'run'];
  // @ts-ignore
  const architect: WorkspaceTool = project.architect;
  const projectName: string = getProjectName();

  for (const builder of builders) {
    architect[builder] = { builder: `${projectName}:${builder}` };
  }
}
