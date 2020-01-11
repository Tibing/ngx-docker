import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { Observable, of } from 'rxjs';
import { catchError, mapTo, tap } from 'rxjs/operators';

import { DockerBuildSchema } from './schema';
import { Docker } from '../docker';


export default createBuilder<json.JsonObject & DockerBuildSchema>(
  (schema: DockerBuildSchema, context: BuilderContext): Observable<BuilderOutput> => {
    const docker = new Docker();
    const imageName = resolveProject(schema, context);

    return docker.buildImage({ imageName }).pipe(
      tap(out => context.logger.info(out.stream)),
      mapTo({ success: true }),
      catchError((error) => {
        context.logger.error(`Error: ${error}`);
        return of({ success: false });
      }),
    );
  },
);

function resolveProject(schema: DockerBuildSchema, context: BuilderContext): string {
  if (schema.project) {
    return schema.project;
  }

  if (context.target) {
    return context.target.project;
  }

  throw new Error(`Please, provide project name for the builder.`);
}
