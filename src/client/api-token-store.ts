import { ApiTokenInfo } from "../types/auth-token"
import { ZswLishiClientError } from "../types/error"

// These modules will be replaced by empty modules for an UMD build (Browser), check rollup.config.js `umdBuild`
import crypto from "crypto"
import fs from "fs"
import os from "os"
import path from "path"

/**
 * A simple API token store interface supporting async operations. This
 * interface is used to store the API token when it has been refreshed
 * as well as retrieving a token from the store.
 *
 * By providing your own [[ApiTokenStore]] implementation, you can for
 * example easily store the token in the `localStorage` ([[LocalStorageApiTokenStore]]),
 * under `~/.zswlishi/<sha256-api-key>/token.json` file ([[OnDiskApiTokenStore]]) or
 * more generically at any path ([[FileApiTokenStore]]).
 *
 * **Note** The [[OnDiskApiTokenStore]] and [[FileApiTokenStore]] are available
 * only on a Node.js environment.
 *
 * @kind Interfaces
 */
export interface ApiTokenStore {
  /**
   * Release any resources hold by this [[ApiTokenStore]] instance. Must
   * be tolerant to being called multiple times.
   *
   * Once called, the instance is assumed unsuable and should never
   * be invoked anymore.
   */
  release(): void

  set: (apiTokenInfo: ApiTokenInfo) => Promise<void>
  get: () => Promise<ApiTokenInfo | undefined>
}

/**
 * Represents an in-memory token storage concrete implementation of
 * a . This simply keep the token in variable and serves
 * it from there.
 *
 * It is **never** persisted and will be reset upon restart of the Browser tab
 * or process, leading to a new token being issued.
 *
 * You should try hard to use a persistent solution so that you re-use the
 * same token as long as it's valid.
 */
export class InMemoryApiTokenStore {
  private apiTokenInfo?: ApiTokenInfo

  public release(): void {
    return
  }

  public async get(): Promise<ApiTokenInfo | undefined> {
    return this.apiTokenInfo
  }

  public async set(apiTokenInfo: ApiTokenInfo): Promise<void> {
    this.apiTokenInfo = apiTokenInfo
  }
}

/**
 * Represents an [[ApiTokenStore]] that saves the token as a JSON string
 * in the `localStorage` of the Browser.
 *
 * Trying to use this class when `window.localStorage` is not a function
 * (like in a Node.js environment) will throw an error at construction
 * time. Use another implementation. If this error is thrown nonetheless
 * in your Browser, local storage is probably not supported there.
 *
 * It is persisted in the local storage of the Browser it will be picked up
 * upon restart of the Browser tab.
 */
export class LocalStorageApiTokenStore implements ApiTokenStore {
  private key: string
  private apiTokenInfo?: ApiTokenInfo

  constructor(key: string) {
    this.key = key

    if (typeof localStorage !== "object") {
      const messages = [
        "This environment does not contain a valid `localStorage` object in the global scope to use.",
        "",
        "You are most likely in a Node.js environment where a global `localStorage` is not available by default.",
        "This API token store concrete impelementation is not usable in your environment. You should be",
        "providing a different implementation of ApiTokenInfo.",
        "",
        "If this error occurred when you did not provide yourself the instance, it means our auto-detection",
        "mechanism incorrectly thought it could use `LocalStorageApiTokenStore` instance while it should",
        "have not. Please report a bug about this issue so we can fix it.",
        "",
        "If you provided the instance yourself, you should read our documentation to better",
        "understand what you should provide here.",
        "",
      ]

      throw new ZswLishiClientError(messages.join("\n"))
    }
  }

  public release(): void {
    return
  }

  public async get(): Promise<ApiTokenInfo | undefined> {
    if (this.apiTokenInfo !== undefined) {
      return this.apiTokenInfo
    }

    const raw = localStorage.getItem(this.key)
    if (raw == null) {
      return undefined
    }

    this.apiTokenInfo = JSON.parse(raw)

    return this.apiTokenInfo
  }

  public async set(apiTokenInfo: ApiTokenInfo): Promise<void> {
    this.apiTokenInfo = apiTokenInfo
    localStorage.setItem(this.key, JSON.stringify(apiTokenInfo))
  }
}

/**
 * Represents an [[ApiTokenStore]] implementation that will save
 * as a JSON string in plain text in the given file.
 *
 * The directory structure is created when it does not exists.
 *
 * **Note** This cannot be used in a browser environment
 */
export class FileApiTokenStore implements ApiTokenStore {
  private filePath: string
  private apiTokenInfo?: ApiTokenInfo

  constructor(filePath: string) {
    this.filePath = filePath
  }

  public release(): void {
    return
  }

  public async get(): Promise<ApiTokenInfo | undefined> {
    if (this.apiTokenInfo !== undefined) {
      return this.apiTokenInfo
    }

    const data = await readData(this.filePath)
    if (data === undefined) {
      return undefined
    }

    this.apiTokenInfo = JSON.parse(data)

    return this.apiTokenInfo
  }

  public async set(apiTokenInfo: ApiTokenInfo): Promise<void> {
    this.apiTokenInfo = apiTokenInfo

    await writeData(this.filePath, JSON.stringify(apiTokenInfo))
  }
}

/**
 * Represents an [[ApiTokenStore]] implementation that will save
 * as a JSON string in a file located at
 * `~/.zswlishi/<sha256-api-key>/token.json`.
 *
 * The directory structure is created when it does not exists.
 *
 * **Note** This cannot be used in a browser environment.
 */
export class OnDiskApiTokenStore extends FileApiTokenStore {
  constructor(apiKey: string) {
    const homeDirectory = os.homedir()
    const sha256sum = crypto.createHash("sha256")

    super(`${homeDirectory}/.中数文历史/${sha256sum.update(apiKey).digest("hex")}/token.json`)
  }
}

async function readData(filePath: string): Promise<string | undefined> {
  return new Promise<string | undefined>((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      resolve(undefined)
      return
    }

    fs.readFile(filePath, (error: any, data: any) => {
      error ? reject(error) : resolve(data)
    })
  })
}

async function writeData(filePath: string, data: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      mkdirpSync(path.dirname(filePath))
    } catch (error) {
      reject(error)
      return
    }

    fs.writeFile(filePath, data, (error: any) => {
      error ? reject(error) : resolve()
    })
  })
}

async function mkdirpSync(directory: string): Promise<void> {
  if (!path.isAbsolute(directory)) {
    return
  }

  const parent = path.join(directory, "..")
  if (parent !== path.join("/") && !fs.existsSync(parent)) {
    mkdirpSync(parent)
  }

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory)
  }
}

/**
 * Represents an no-op token storage concrete implementation. All operations
 * are no-op and this should be used when no authentication is required for a given
 * instance.
 */
export class NoOpApiTokenStore {
  public release(): void {
    return
  }

  public async get(): Promise<ApiTokenInfo | undefined> {
    return undefined
  }

  public async set(): Promise<void> {
    return
  }
}
