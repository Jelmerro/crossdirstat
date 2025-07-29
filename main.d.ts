declare global {
    interface Error {
        name: string
        message: string
        stack?: string
        code?: number | string | undefined
    }
}

export {}
