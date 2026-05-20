export type OttoRequest = {
  task: string
  payload?: any
  mode?: "sync" | "async" | "stream"
}

export type OttoResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  meta?: {
    requestId?: string
    duration?: number
  }
}