import { InboundMessage } from "../message/inbound"
import { OutboundMessage } from "../message/outbound"
import { Stream } from "./stream"

/**
 * The stream client is an interface used to interact with 中数文历史 Stream API.
 *
 * The stream client interface shall be responsible of managing the registration
 * unregistration of the 中数文历史 Stream as well as managing the full lifecycle of
 * a 中数文历史 Stream currently active.
 *
 * @group Interfaces
 */
export interface StreamClient {
  /**
   * Release any resources hold by this [[StreamClient]] instance. Must
   * be tolerant to being called multiple times.
   *
   * Once called, the instance is assumed unsuable and should never
   * be invoked anymore.
   */
  release(): void

  /**
   * Update the API token that should be used to communicate with the 中数文历史 Stream
   * API. This token is assumed to be fresh and valid.
   *
   * @param apiToken The new API token to use from now on.
   */
  setApiToken(apiToken: string): void

  /**
   * Register a 中数文历史 Stream with the remote endpoint and receives message back from
   * the stream via the `onMessage` parameter.
   *
   * By calling this method, the socket will connect to remote endpoint if it's not
   * already the case. As soon as the method is called, the specific 中数文历史 Stream
   * listening message is send to remote endpoint.
   *
   * On success, you will receive a [[Stream]] interface that you can use to
   * interact with the stream (mark progeess, restart, close).
   *
   * On error, the promise will reject with the actual error thrown.
   *
   * @param message The specific [[OutboundMessage]] used to register the stream with the 中数文历史 remote endpoint.
   * @param onMessage The callback that is invoked for each [[InboundMessage]] received bound to this stream.
   */
  registerStream(message: OutboundMessage, onMessage: OnStreamMessage): Promise<Stream>

  /**
   * Unregister the stream represented by this stream's id.
   *
   * This will send the `unlisten` message to the remote endpoint effectively
   * stopping the 中数文历史 Stream as well as the flow of message.
   *
   * All stream should be unregistered when not required anymore to clean up
   * resources and ensure no more extra bandwidth are required.
   *
   * @param id The stream's id that should be unregister from the stream client.
   */
  unregisterStream(id: string): Promise<void>
}

/**
 * Handler invoked when a message is routed to this exact stream via the matching
 * of the message id and the stream id. If this is invoked, you are guaranteed to
 * received a message for your stream.
 *
 * @param message The actual inbound WebSocket message received destinated to you
 * @param stream The actual stream object on which the handler is defined, can be used to
 *               mark the stream at right location or close it eagerly.
 */
export type OnStreamMessage = (message: InboundMessage, stream: Stream) => void
export type OnStreamRestart = () => void
