import { changeWarningMessage } from '@/lib/websocket/changeWarningMessages'

describe('changeWarningMessage', () => {
  it('maps a known code to its message with interpolated context', () => {
    const element = changeWarningMessage({
      code: 'UNRESOLVABLE_PERSON',
      message: 'Skipping contribution with unresolvable person',
      context: { display_name: 'Claire Durand' },
    })

    expect(element.props.id).toBe('user_action_warning_unresolvable_person')
    expect(element.props.values).toEqual({ displayName: 'Claire Durand' })
  })

  it('maps affiliation conflicts with the organization uid', () => {
    const element = changeWarningMessage({
      code: 'AFFILIATION_CONFLICT',
      message: 'Conflict error while resolving affiliation',
      context: { source_organization_uid: 'org-1', error: 'boom' },
    })

    expect(element.props.id).toBe('user_action_warning_affiliation_conflict')
    expect(element.props.values).toEqual({ organizationUid: 'org-1' })
  })

  it('tolerates a missing context', () => {
    const element = changeWarningMessage({
      code: 'UNRESOLVABLE_PERSON',
      message: 'Skipping contribution with unresolvable person',
    })

    expect(element.props.values).toEqual({ displayName: '' })
  })

  it('falls back to a generic message for unknown codes', () => {
    const element = changeWarningMessage({
      code: 'SOME_FUTURE_CODE',
      message: 'Something new was skipped',
    })

    expect(element.props.id).toBe('user_action_warning_unknown')
  })
})
