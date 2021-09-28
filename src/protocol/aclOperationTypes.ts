// From:
// https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/common/acl/AclOperation.java#L44

/**
 * @typedef {number} ACLOperationTypes
 *
 * Enum for ACL Operations Types
 * @readonly
 * @enum {ACLOperationTypes}
 */
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = {
  /**
   * Represents any AclOperation which this client cannot understand, perhaps because this
   * client is too old.
   */
  UNKNOWN: 0,
  /**
   * In a filter, matches any AclOperation.
   */
  ANY: 1,
  /**
   * ALL operation.
   */
  ALL: 2,
  /**
   * READ operation.
   */
  READ: 3,
  /**
   * WRITE operation.
   */
  WRITE: 4,
  /**
   * CREATE operation.
   */
  CREATE: 5,
  /**
   * DELETE operation.
   */
  DELETE: 6,
  /**
   * ALTER operation.
   */
  ALTER: 7,
  /**
   * DESCRIBE operation.
   */
  DESCRIBE: 8,
  /**
   * CLUSTER_ACTION operation.
   */
  CLUSTER_ACTION: 9,
  /**
   * DESCRIBE_CONFIGS operation.
   */
  DESCRIBE_CONFIGS: 10,
  /**
   * ALTER_CONFIGS operation.
   */
  ALTER_CONFIGS: 11,
  /**
   * IDEMPOTENT_WRITE operation.
   */
  IDEMPOTENT_WRITE: 12,
}
