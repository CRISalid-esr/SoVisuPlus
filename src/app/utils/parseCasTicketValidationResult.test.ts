import { parseCasTicketValidationResult } from './parseCasTicketValidationResult'

describe('parseCasTicketValidationResult', () => {
  it('parses CAS XML and returns normalized attribute keys', () => {
    const xml = `
<cas:serviceResponse xmlns:cas='http://www.yale.edu/tp/cas'>
    <cas:authenticationSuccess>
        <cas:user>jdorn</cas:user>
        <cas:attributes>
                    <cas:UID>526893</cas:UID>
                    <cas:LASTNAME>Dupont</cas:LASTNAME>
                    <cas:FIRSTNAME>Jacques</cas:FIRSTNAME>
                    <cas:EMAIL>jacques.dupont@myuniv.edu</cas:EMAIL>
                    <cas:username>jdupont</cas:username>
        </cas:attributes>
    </cas:authenticationSuccess>
</cas:serviceResponse>
`.trim()

    expect(parseCasTicketValidationResult(xml)).toEqual({
      success: true,
      user: 'jdorn',
      attributes: {
        uid: '526893',
        lastName: 'Dupont',
        firstName: 'Jacques',
        email: 'jacques.dupont@myuniv.edu',
        userName: 'jdupont',
      },
    })
  })

  it('parses CAS authenticationFailure XML', () => {
    const xml = `
<cas:serviceResponse xmlns:cas='http://www.yale.edu/tp/cas'>
     <cas:authenticationFailure code='ServiceManagement: Unauthorized 
Service Access. Service [https://sovisuplus-dev.univ-paris1.fr/] is not 
found in service registry.'>
         ServiceManagement: Unauthorized Service Access. Service 
[https://sovisuplus-dev.univ-paris1.fr/] is not found in service registry.
     </cas:authenticationFailure>
</cas:serviceResponse>
`.trim()

    expect(parseCasTicketValidationResult(xml)).toEqual({
      success: false,
      failureCode:
        'ServiceManagement: Unauthorized \nService Access. Service [https://sovisuplus-dev.univ-paris1.fr/] is not \nfound in service registry.',
      failureMessage:
        'ServiceManagement: Unauthorized Service Access. Service \n[https://sovisuplus-dev.univ-paris1.fr/] is not found in service registry.',
    })
  })
})
