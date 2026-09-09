/**
 * Warning entry attached to a change outcome. The taxonomy of codes is open
 * (see the IKG spec, specs/868-improve-graph-error-reporting-user-actions/prompt.md);
 * unknown codes must be tolerated and rendered generically.
 */
export interface ChangeWarningFields {
  code: string
  message: string
  context?: Record<string, unknown>
}

/**
 * Outcome of a user action applied by the graph (IKG), received on
 * `event.changes.change.{applied|failed}.interactive`. Field names are
 * snake_case as emitted by the IKG.
 */
export interface AMQPChangeEventMessage {
  type: 'change'
  event: 'applied' | 'failed'
  fields: {
    uid: string
    id: string
    application: string
    person_uid: string
    target_type: string
    target_uid: string
    path: string | null
    action_type: string
    status: 'applied' | 'failed'
    error_message: string | null
    warnings?: ChangeWarningFields[]
    timestamp: string
  }
}
