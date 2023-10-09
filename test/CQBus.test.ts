import { CQBus } from '../src/CQBus'
import { Command } from '../src/requests/Command'
import { RequestHandler } from '../src/requests/handlers/RequestHandler'
import { ContextAwareRequestHandler } from '../src/requests/handlers/ContextAwareRequestHandler'
import { ExecutionContext } from '../src/ExecutionContext'
import { RequestHandlerNotRegisteredError } from '../src/RequestHandlerNotRegisteredError'
import { expectThrows } from './expectThrows'
import { Middleware } from '../src/Middleware'
import { Request } from '../src/requests/Request'

it('executes request with registered handler and returns result', async () => {
    cqBus.registerHandler(CreateFullName, () => new CreateFullNameHandler())

    const result = await cqBus.execute(new CreateFullName('John', 'Doe'))

    expect(result).toEqual('John Doe')
})

it('context-aware handlers can receive data via execution context', async () => {
    cqBus.registerContextAwareHandler(MyCommand, () => new MyCommandAwareHandler())

    const result = await cqBus.execute(new MyCommand(), ExecutionContext.empty().with('sample-key', 'some-value'))

    expect(result).toEqual('some-value')
})

it('fails if request handler is not registered', async () => {
    await expectThrows(() => cqBus.execute(new MyCommand()), RequestHandlerNotRegisteredError)
})

describe('middlewares', () => {
    it('executes middleware', async () => {
        cqBus.registerHandler(CreateFullName, () => new CreateFullNameLoggingHandler(log))
        cqBus.registerMiddleware(new LoggingMiddleware(log))

        await cqBus.execute(new CreateFullName('John', 'Doe'))

        expect(log).toEqual(['before', 'John Doe', 'after'])
    })

    it('executes multiple middlewares in reverse registration order', async () => {
        cqBus.registerHandler(CreateFullName, () => new CreateFullNameLoggingHandler(log))
        cqBus.registerMiddleware(new LoggingMiddleware(log, '1'))
        cqBus.registerMiddleware(new LoggingMiddleware(log, '2'))

        await cqBus.execute(new CreateFullName('John', 'Doe'))

        expect(log).toEqual(['before2', 'before1', 'John Doe', 'after1', 'after2'])
    })

    it('middlewares can pass data between each other via the execution context', async () => {
        let receivedValue = ''
        cqBus.registerHandler(CreateFullName, () => new CreateFullNameLoggingHandler(log))
        cqBus.registerMiddleware({
            exec<T extends Request<R>, R>(request: T, next: (T) => Promise<R>, context: ExecutionContext): Promise<R> {
                receivedValue = context.get('sample-key')
                return next(request)
            }
        })
        cqBus.registerMiddleware({
            exec<T extends Request<R>, R>(request: T, next: (T) => Promise<R>, context: ExecutionContext): Promise<R> {
                context.set('sample-key', 'some-value')
                return next(request)
            }
        })

        await cqBus.execute(new CreateFullName('John', 'Doe'))

        expect(receivedValue).toEqual('some-value')
    })
})

beforeEach(() => {
    cqBus = new CQBus()
    log = []
})

let cqBus: CQBus
let log: string[]

class CreateFullName extends Command<string> {
    constructor(readonly firstName: string, readonly lastName: string) { super() }
}

class CreateFullNameHandler implements RequestHandler<CreateFullName, string> {
    async handle(command: CreateFullName): Promise<string> {
        return command.firstName + ' ' + command.lastName
    }
}

class MyCommand extends Command<string> {}

class MyCommandAwareHandler implements ContextAwareRequestHandler<MyCommand, string> {
    async handle(request: MyCommand, context: ExecutionContext): Promise<string> {
        return context.get('sample-key')
    }
}

class CreateFullNameLoggingHandler implements RequestHandler<CreateFullName, String> {
    constructor(private log) {}

    async handle(request: CreateFullName): Promise<String> {
        const result = request.firstName + ' ' + request.lastName
        this.log.push(result)
        return result
    }
}

class LoggingMiddleware implements Middleware {
    constructor(private log, private suffix = '') {
    }

    async exec<T extends Request<R>, R>(request: T, next: (T) => Promise<R>, context: ExecutionContext): Promise<R> {
        this.log.push('before' + this.suffix)
        const result = await next(request)
        this.log.push('after' + this.suffix)
        return result
    }
}
