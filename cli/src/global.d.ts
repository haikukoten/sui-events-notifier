declare module 'commander' {
  export class Command {
    name(name: string): this;
    description(description: string): this;
    version(version: string): this;
    command(name: string): Command;
    argument(name: string, description: string): this;
    option(flags: string, description: string, defaultValue?: any): this;
    action(callback: (...args: any[]) => void | Promise<void>): this;
    parse(args: string[]): this;
    outputHelp(): void;
  }
}

declare module 'chalk' {
  interface ChalkFunction {
    (text: string): string;
    red: ChalkFunction;
    green: ChalkFunction;
    blue: ChalkFunction;
    yellow: ChalkFunction;
    cyan: ChalkFunction;
    gray: ChalkFunction;
    bgBlue: ChalkFunction;
    white: ChalkFunction;
    bold: ChalkFunction;
  }
  const chalk: ChalkFunction;
  export = chalk;
}

declare module 'ora' {
  interface Ora {
    start(text?: string): Ora;
    succeed(text?: string): Ora;
    fail(text?: string): Ora;
    stop(): Ora;
    text: string;
  }
  
  function ora(options: string | { text?: string }): Ora;
  export = ora;
} 