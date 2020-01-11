import { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import { catchError, finalize, mapTo, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';


export interface CommandExecutionProgress {
  stream: string;
}

export interface Command<T> {

  execute(schema: T, context: BuilderContext): Observable<CommandExecutionProgress>;

  cleanup(): void;
}

export interface DockerCommandRunnerOptions<T> {
  schema: T;
  context: BuilderContext;
  command: Command<T>;
}

export function runCommand<T>(options: DockerCommandRunnerOptions<T>): Observable<BuilderOutput> {
  const { schema, context, command } = options;

  return command.execute(schema, context).pipe(
    tap(writeLog(context)),
    mapTo({ success: true }),
    catchError(logError(context)),
    finalize(() => command.cleanup()),
  );
}

function writeLog(context: BuilderContext): (output: CommandExecutionProgress) => void {
  return (output: CommandExecutionProgress) => context.logger.info(output.stream || '');
}

function logError(context: BuilderContext): (error: string) => Observable<BuilderOutput> {
  return (error: string) => {
    context.logger.error(`Error: ${error}`);
    return of({ success: false });
  };
}
