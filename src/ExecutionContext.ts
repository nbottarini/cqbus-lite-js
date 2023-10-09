export class ExecutionContext {
    private data: { [key:string]: any } = {}

    with(key: string, value) {
        this.set(key, value)
        return this
    }

    set(key: string, value) {
        this.data[key] = value
    }

    get(key: string): any {
        return this.data[key]
    }

    static empty() {
        return new ExecutionContext()
    }
}
