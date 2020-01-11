import { bindNodeCallback } from 'rxjs';
import { writeFile as writeFileAsync } from 'fs';

export const writeFile = bindNodeCallback(writeFileAsync);
