import { ReactElement } from 'react'
import { Trans, TransProps } from '@lingui/react'
import { ChangeWarningFields } from '@/types/AMQPChangeEventMessage'

type WarningContext = Record<string, unknown>

const str = (context: WarningContext, key: string) => String(context[key] ?? '')

/**
 * User-facing message for each change warning code emitted by the graph.
 *
 * The taxonomy is open (see the IKG spec §B): to support a new code, add an
 * entry here with a static `<Trans id>` (dynamic ids are not extracted — see
 * CLAUDE.md), run `npm run i18n:extract` and translate the new key. Codes
 * without an entry fall back to a generic message.
 */
const warningRenderers: Record<
  string,
  (context: WarningContext) => ReactElement<TransProps>
> = {
  UNRESOLVABLE_PERSON: (context) => (
    <Trans
      id='user_action_warning_unresolvable_person'
      values={{ displayName: str(context, 'display_name') }}
    />
  ),
  EXTERNAL_PERSON_CREATION_FAILED: (context) => (
    <Trans
      id='user_action_warning_external_person_creation_failed'
      values={{ displayName: str(context, 'display_name') }}
    />
  ),
  MISSING_DISPLAY_NAME: () => (
    <Trans id='user_action_warning_missing_display_name' />
  ),
  AFFILIATION_CONFLICT: (context) => (
    <Trans
      id='user_action_warning_affiliation_conflict'
      values={{ organizationUid: str(context, 'source_organization_uid') }}
    />
  ),
  AFFILIATION_WITHOUT_IDENTIFIER: () => (
    <Trans id='user_action_warning_affiliation_without_identifier' />
  ),
}

export const changeWarningMessage = (
  warning: ChangeWarningFields,
): ReactElement<TransProps> => {
  const renderer = warningRenderers[warning.code]
  if (!renderer) {
    return <Trans id='user_action_warning_unknown' />
  }
  return renderer(warning.context ?? {})
}
