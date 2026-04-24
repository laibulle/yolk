export interface HttpSpec {
  get(url: string): Promise<string>
}
