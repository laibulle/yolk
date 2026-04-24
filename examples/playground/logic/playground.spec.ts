export interface PlaygroundState {
  count: number
  canIncrement: boolean
  canDecrement: boolean
  activity: string
}

export interface PlaygroundSpec {
  increment(step: number): Promise<PlaygroundState>
  decrement(step: number): Promise<PlaygroundState>
  reset(): Promise<PlaygroundState>
  getState(): Promise<PlaygroundState>
  fetchActivity(): Promise<PlaygroundState>
  
  /**
   * Register a callback to be notified of state changes.
   */
  subscribe(): Promise<void>

  /**
   * Demonstrate zero-copy binary transfer by inverting bytes in a large buffer.
   */
  processBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer>
}
