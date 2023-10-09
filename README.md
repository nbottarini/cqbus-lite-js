[![npm](https://img.shields.io/npm/v/@nbottarini/cqbus-lite.svg)](https://www.npmjs.com/package/@nbottarini/cqbus-lite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI Status](https://github.com/nbottarini/cqbus-lite-js/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/nbottarini/cqbus-lite-js/actions)

# CQBus lite
Simple javascript/typescript command &amp; query bus. For use in CQRS and Clean Architecture / Hexagonal projects. Lightweight alternative to @nbottarini/cqbus to use in frontend environments

## Installation

Npm:
```
$ npm install --save @nbottarini/cqbus-lite
```

Yarn:
```
$ yarn add @nbottarini/cqbus-lite
```

## Usage

### Commands
```typescript
class CreateFullName extends Command<string> {
    constructor(public firstName: string, public lastName: string) { super(); }
}

class CreateFullNameHandler implements RequestHandler<CreateFullName, string> {
    async handle(command: CreateFullName): Promise<string> {
        return command.firstName + ' ' + command.lastName;
    }
}

const cqBus = new CQBus();
cqBus.registerHandler(CreateFullName, () => new CreateFullNameHandler());

const result = await cqBus.execute(new CreateFullName('John', 'Doe')); // returns 'John Doe'
```

### Queries
```typescript
class GetNews extends Query<string[]> {}

class GetNewsHandler implements RequestHandler<GetNews, string[]> {
    async handle(command: GetNews): Promise<string[]> {
        return ['news 1', 'news 2'];
    }
}

const cqBus = new CQBus();
cqBus.registerHandler(GetNews, () => new GetNewsHandler());

const result = await cqBus.execute(new GetNews()); // returns 'news 1', 'news 2'
```

### Context-aware handlers

```typescript
class MyCommand extends Command<string> {}

class MyCommandHandler implements ContextAwareRequestHandler<MyCommand, string> {
    async handle(command: MyCommand, context: ExecutionContext): Promise<string> {
        return context.get('some-key');
    }
}

const cqBus = new CQBus();
cqBus.registerContextAwareHandler(MyCommand, () => new MyCommandHandler());

const context = ExecutionContext.empty().with('some-key', 'some-value');
const result = await cqBus.execute(new MyCommand(), context); // returns 'some-value'
```

### Middlewares

```typescript
class MyCommand extends Command<string> {}

class MyCommandHandler implements ContextAwareRequestHandler<MyCommand, string> {
    async handle(command: MyCommand, context: ExecutionContext): Promise<string> {
        return 'handler';
    }
}

class LoggingMiddleware implements Middleware {
    constructor(private log, private suffix = '') {}
    
    async exec<T extends Request<R>, R>(request: T, next: (T) => Promise<R>, context: ExecutionContext): Promise<R> {
        this.log.push('before' + this.suffix)
        const result = await next(request);
        this.log.push('after' + this.suffix)
        return result;
    }
}

const log = [];
const cqBus = new CQBus();
cqBus.registerHandler(MyCommand, () => new MyCommandHandler());
cqBus.registerMiddleware(new LoggingMiddleware(log, '1'));
cqBus.registerMiddleware(new LoggingMiddleware(log, '2'));

const result = await cqBus.execute(new MyCommand(), context);

// log contains 'before2', 'before1', 'handler', 'after1', 'after2'
```
