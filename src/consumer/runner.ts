// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'EventEmitt... Remove this comment to see the full error message
const { EventEmitter } = require('events')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'Long'.
const Long = require('../utils/long')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'createRetr... Remove this comment to see the full error message
const createRetry = require('../retry')
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const limitConcurrency = require('../utils/concurrency')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'KafkaJSErr... Remove this comment to see the full error message
const { KafkaJSError } = require('../errors')
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const barrier = require('./barrier')

const {
  events: { FETCH, FETCH_START, START_BATCH_PROCESS, END_BATCH_PROCESS, REBALANCING },
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
} = require('./instrumentationEvents')

// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'isRebalanc... Remove this comment to see the full error message
const isRebalancing = (e: any) => e.type === 'REBALANCE_IN_PROGRESS' || e.type === 'NOT_COORDINATOR_FOR_GROUP'

const isKafkaJSError = (e: any) => e instanceof KafkaJSError
const isSameOffset = (offsetA: any, offsetB: any) => Long.fromValue(offsetA).equals(Long.fromValue(offsetB))
const CONSUMING_START = 'consuming-start'
const CONSUMING_STOP = 'consuming-stop'

// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = class Runner extends EventEmitter {
  _consuming: any;
  autoCommit: any;
  consumerGroup: any;
  eachBatch: any;
  eachBatchAutoResolve: any;
  eachMessage: any;
  emit: any;
  heartbeatInterval: any;
  instrumentationEmitter: any;
  logger: any;
  onCrash: any;
  once: any;
  partitionsConsumedConcurrently: any;
  retrier: any;
  running: any;
  /**
   * @param {object} options
   * @param {import("../../types").Logger} options.logger
   * @param {import("./consumerGroup")} options.consumerGroup
   * @param {import("../instrumentation/emitter")} options.instrumentationEmitter
   * @param {boolean} [options.eachBatchAutoResolve=true]
   * @param {number} [options.partitionsConsumedConcurrently]
   * @param {(payload: import("../../types").EachBatchPayload) => Promise<void>} options.eachBatch
   * @param {(payload: import("../../types").EachMessagePayload) => Promise<void>} options.eachMessage
   * @param {number} [options.heartbeatInterval]
   * @param {(reason: Error) => void} options.onCrash
   * @param {import("../../types").RetryOptions} [options.retry]
   * @param {boolean} [options.autoCommit=true]
   */
  constructor({
    logger,
    consumerGroup,
    instrumentationEmitter,
    eachBatchAutoResolve = true,
    partitionsConsumedConcurrently,
    eachBatch,
    eachMessage,
    heartbeatInterval,
    onCrash,
    retry,
    autoCommit = true
  }: any) {
    super()
    this.logger = logger.namespace('Runner')
    this.consumerGroup = consumerGroup
    this.instrumentationEmitter = instrumentationEmitter
    this.eachBatchAutoResolve = eachBatchAutoResolve
    this.eachBatch = eachBatch
    this.eachMessage = eachMessage
    this.heartbeatInterval = heartbeatInterval
    // @ts-expect-error ts-migrate(2550) FIXME: Property 'assign' does not exist on type 'ObjectCo... Remove this comment to see the full error message
    this.retrier = createRetry(Object.assign({}, retry))
    this.onCrash = onCrash
    this.autoCommit = autoCommit
    this.partitionsConsumedConcurrently = partitionsConsumedConcurrently

    this.running = false
    this.consuming = false
  }

  get consuming() {
    return this._consuming
  }

  set consuming(value) {
    if (this._consuming !== value) {
      this._consuming = value
      this.emit(value ? CONSUMING_START : CONSUMING_STOP)
    }
  }

  // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
  async join() {
    await this.consumerGroup.joinAndSync()
    this.running = true
  }

  async scheduleJoin() {
    if (!this.running) {
      this.logger.debug('consumer not running, exiting', {
        groupId: this.consumerGroup.groupId,
        memberId: this.consumerGroup.memberId,
      })
      return
    }

    return this.join().catch(this.onCrash)
  }

  // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
  async start() {
    if (this.running) {
      return
    }

    try {
      await this.consumerGroup.connect()
      await this.join()

      this.running = true
      this.scheduleFetch()
    } catch (e) {
      this.onCrash(e)
    }
  }

  // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
  async stop() {
    if (!this.running) {
      return
    }

    this.logger.debug('stop consumer group', {
      groupId: this.consumerGroup.groupId,
      memberId: this.consumerGroup.memberId,
    })

    this.running = false

    try {
      await this.waitForConsumer()
      await this.consumerGroup.leave()
    } catch (e) {}
  }

  waitForConsumer() {
    // @ts-expect-error ts-migrate(2585) FIXME: 'Promise' only refers to a type, but is being used... Remove this comment to see the full error message
    return new Promise((resolve: any) => {
      if (!this.consuming) {
        return resolve()
      }

      this.logger.debug('waiting for consumer to finish...', {
        groupId: this.consumerGroup.groupId,
        memberId: this.consumerGroup.memberId,
      })

      this.once(CONSUMING_STOP, () => resolve())
    });
  }

  // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
  async processEachMessage(batch: any) {
    const { topic, partition } = batch

    for (const message of batch.messages) {
      if (!this.running || this.consumerGroup.hasSeekOffset({ topic, partition })) {
        break
      }

      try {
        await this.eachMessage({ topic, partition, message })
      } catch (e) {
        if (!isKafkaJSError(e)) {
          this.logger.error(`Error when calling eachMessage`, {
            topic,
            partition,
            offset: message.offset,
            stack: e.stack,
            error: e,
          })
        }

        // In case of errors, commit the previously consumed offsets unless autoCommit is disabled
        await this.autoCommitOffsets()
        throw e
      }

      this.consumerGroup.resolveOffset({ topic, partition, offset: message.offset })
      await this.consumerGroup.heartbeat({ interval: this.heartbeatInterval })
      await this.autoCommitOffsetsIfNecessary()
    }
  }

  // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
  async processEachBatch(batch: any) {
    const { topic, partition } = batch
    const lastFilteredMessage = batch.messages[batch.messages.length - 1]

    try {
      await this.eachBatch({
        batch,
        resolveOffset: (offset: any) => {
          /**
           * The transactional producer generates a control record after committing the transaction.
           * The control record is the last record on the RecordBatch, and it is filtered before it
           * reaches the eachBatch callback. When disabling auto-resolve, the user-land code won't
           * be able to resolve the control record offset, since it never reaches the callback,
           * causing stuck consumers as the consumer will never move the offset marker.
           *
           * When the last offset of the batch is resolved, we should automatically resolve
           * the control record offset as this entry doesn't have any meaning to the user-land code,
           * and won't interfere with the stream processing.
           *
           * @see https://github.com/apache/kafka/blob/9aa660786e46c1efbf5605a6a69136a1dac6edb9/clients/src/main/java/org/apache/kafka/clients/consumer/internals/Fetcher.java#L1499-L1505
           */
          const offsetToResolve =
            lastFilteredMessage && isSameOffset(offset, lastFilteredMessage.offset)
              ? batch.lastOffset()
              : offset

          this.consumerGroup.resolveOffset({ topic, partition, offset: offsetToResolve })
        },
        // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
        heartbeat: async () => {
          await this.consumerGroup.heartbeat({ interval: this.heartbeatInterval })
        },
        /**
         * Commit offsets if provided. Otherwise commit most recent resolved offsets
         * if the autoCommit conditions are met.
         *
         * @param {OffsetsByTopicPartition} [offsets] Optional.
         */
        commitOffsetsIfNecessary: async (offsets: any) => {
          return offsets
            ? this.consumerGroup.commitOffsets(offsets)
            : this.consumerGroup.commitOffsetsIfNecessary()
        },
        uncommittedOffsets: () => this.consumerGroup.uncommittedOffsets(),
        isRunning: () => this.running,
        isStale: () => this.consumerGroup.hasSeekOffset({ topic, partition }),
      })
    } catch (e) {
      if (!isKafkaJSError(e)) {
        this.logger.error(`Error when calling eachBatch`, {
          topic,
          partition,
          offset: batch.firstOffset(),
          stack: e.stack,
          error: e,
        })
      }

      // eachBatch has a special resolveOffset which can be used
      // to keep track of the messages
      await this.autoCommitOffsets()
      throw e
    }

    // resolveOffset for the last offset can be disabled to allow the users of eachBatch to
    // stop their consumers without resolving unprocessed offsets (issues/18)
    if (this.eachBatchAutoResolve) {
      this.consumerGroup.resolveOffset({ topic, partition, offset: batch.lastOffset() })
    }
  }

  // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
  async fetch() {
    const startFetch = Date.now()

    this.instrumentationEmitter.emit(FETCH_START, {})

    const iterator = await this.consumerGroup.fetch()

    this.instrumentationEmitter.emit(FETCH, {
      /**
       * PR #570 removed support for the number of batches in this instrumentation event;
       * The new implementation uses an async generation to deliver the batches, which makes
       * this number impossible to get. The number is set to 0 to keep the event backward
       * compatible until we bump KafkaJS to version 2, following the end of node 8 LTS.
       *
       * @since 2019-11-29
       */
      numberOfBatches: 0,
      duration: Date.now() - startFetch,
    })

    // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
    const onBatch = async (batch: any) => {
      const startBatchProcess = Date.now()
      const payload = {
        topic: batch.topic,
        partition: batch.partition,
        highWatermark: batch.highWatermark,
        offsetLag: batch.offsetLag(),
        /**
         * @since 2019-06-24 (>= 1.8.0)
         *
         * offsetLag returns the lag based on the latest offset in the batch, to
         * keep the event backward compatible we just introduced "offsetLagLow"
         * which calculates the lag based on the first offset in the batch
         */
        offsetLagLow: batch.offsetLagLow(),
        batchSize: batch.messages.length,
        firstOffset: batch.firstOffset(),
        lastOffset: batch.lastOffset(),
      }

      this.instrumentationEmitter.emit(START_BATCH_PROCESS, payload)

      if (this.eachMessage) {
        await this.processEachMessage(batch)
      } else if (this.eachBatch) {
        await this.processEachBatch(batch)
      }

      this.instrumentationEmitter.emit(END_BATCH_PROCESS, {
        ...payload,
        duration: Date.now() - startBatchProcess,
      })
    }

    const { lock, unlock, unlockWithError } = barrier()
    const concurrently = limitConcurrency({ limit: this.partitionsConsumedConcurrently })

    let requestsCompleted = false
    let numberOfExecutions = 0
    let expectedNumberOfExecutions = 0
    const enqueuedTasks = []

    while (true) {
      const result = iterator.next()

      if (result.done) {
        break
      }

      if (!this.running) {
        result.value.catch((error: any) => {
          this.logger.debug('Ignoring error in fetch request while stopping runner', {
            error: error.message || error,
            stack: error.stack,
          })
        })

        continue
      }

      // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
      enqueuedTasks.push(async () => {
        const batches = await result.value
        expectedNumberOfExecutions += batches.length

        // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
        batches.map((batch: any) => concurrently(async () => {
          try {
            if (!this.running) {
              return
            }

            if (batch.isEmpty()) {
              return
            }

            await onBatch(batch)
            await this.consumerGroup.heartbeat({ interval: this.heartbeatInterval })
          } catch (e) {
            unlockWithError(e)
          } finally {
            numberOfExecutions++
            if (requestsCompleted && numberOfExecutions === expectedNumberOfExecutions) {
              unlock()
            }
          }
        }).catch(unlockWithError)
        )
      })
    }

    // @ts-expect-error ts-migrate(2585) FIXME: 'Promise' only refers to a type, but is being used... Remove this comment to see the full error message
    await Promise.all(enqueuedTasks.map(fn => fn()))
    requestsCompleted = true

    if (expectedNumberOfExecutions === numberOfExecutions) {
      unlock()
    }

    const error = await lock
    if (error) {
      throw error
    }

    await this.autoCommitOffsets()
    await this.consumerGroup.heartbeat({ interval: this.heartbeatInterval })
  }

  async scheduleFetch() {
    if (!this.running) {
      this.logger.debug('consumer not running, exiting', {
        groupId: this.consumerGroup.groupId,
        memberId: this.consumerGroup.memberId,
      })

      return
    }

    return this.retrier(async (bail: any, retryCount: any, retryTime: any) => {
      try {
        this.consuming = true
        await this.fetch()
        this.consuming = false

        if (this.running) {
          // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'setImmediate'.
          setImmediate(() => this.scheduleFetch())
        }
      } catch (e) {
        if (!this.running) {
          this.logger.debug('consumer not running, exiting', {
            error: e.message,
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
          })
          return
        }

        if (isRebalancing(e)) {
          this.logger.error('The group is rebalancing, re-joining', {
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
            error: e.message,
            retryCount,
            retryTime,
          })

          this.instrumentationEmitter.emit(REBALANCING, {
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
          })

          await this.join()
          // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'setImmediate'.
          setImmediate(() => this.scheduleFetch())
          return
        }

        if (e.type === 'UNKNOWN_MEMBER_ID') {
          this.logger.error('The coordinator is not aware of this member, re-joining the group', {
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
            error: e.message,
            retryCount,
            retryTime,
          })

          this.consumerGroup.memberId = null
          await this.join()
          // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'setImmediate'.
          setImmediate(() => this.scheduleFetch())
          return
        }

        if (e.name === 'KafkaJSOffsetOutOfRange') {
          // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'setImmediate'.
          setImmediate(() => this.scheduleFetch())
          return
        }

        if (e.name === 'KafkaJSNotImplemented') {
          return bail(e)
        }

        this.logger.debug('Error while fetching data, trying again...', {
          groupId: this.consumerGroup.groupId,
          memberId: this.consumerGroup.memberId,
          error: e.message,
          stack: e.stack,
          retryCount,
          retryTime,
        })

        throw e
      } finally {
        this.consuming = false
      }
    }).catch(this.onCrash);
  }

  autoCommitOffsets() {
    if (this.autoCommit) {
      return this.consumerGroup.commitOffsets()
    }
  }

  autoCommitOffsetsIfNecessary() {
    if (this.autoCommit) {
      return this.consumerGroup.commitOffsetsIfNecessary()
    }
  }

  commitOffsets(offsets: any) {
    if (!this.running) {
      this.logger.debug('consumer not running, exiting', {
        groupId: this.consumerGroup.groupId,
        memberId: this.consumerGroup.memberId,
        offsets,
      })
      return
    }

    return this.retrier(async (bail: any, retryCount: any, retryTime: any) => {
      try {
        await this.consumerGroup.commitOffsets(offsets)
      } catch (e) {
        if (!this.running) {
          this.logger.debug('consumer not running, exiting', {
            error: e.message,
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
            offsets,
          })
          return
        }

        if (isRebalancing(e)) {
          this.logger.error('The group is rebalancing, re-joining', {
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
            error: e.message,
            retryCount,
            retryTime,
          })

          this.instrumentationEmitter.emit(REBALANCING, {
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
          })

          // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'setImmediate'.
          setImmediate(() => this.scheduleJoin())

          bail(new KafkaJSError(e))
        }

        if (e.type === 'UNKNOWN_MEMBER_ID') {
          this.logger.error('The coordinator is not aware of this member, re-joining the group', {
            groupId: this.consumerGroup.groupId,
            memberId: this.consumerGroup.memberId,
            error: e.message,
            retryCount,
            retryTime,
          })

          this.consumerGroup.memberId = null
          // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'setImmediate'.
          setImmediate(() => this.scheduleJoin())

          bail(new KafkaJSError(e))
        }

        if (e.name === 'KafkaJSNotImplemented') {
          return bail(e)
        }

        this.logger.debug('Error while committing offsets, trying again...', {
          groupId: this.consumerGroup.groupId,
          memberId: this.consumerGroup.memberId,
          error: e.message,
          stack: e.stack,
          retryCount,
          retryTime,
          offsets,
        })

        throw e
      }
    });
  }
}
