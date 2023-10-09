import { Request } from '../Request'

export interface RequestHandler<T extends Request<TResult>, TResult = void> {
    handle(request: T): Promise<TResult>
}
