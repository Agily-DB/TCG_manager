// Feature: pokemon-tcg-manager, Property 2: Preservation
// URLs geradas a partir do ptcgoCode seguem o formato correto do LigaPokemon
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

function buildLigaUrlFromCode(ptcgoCode: string): string {
  return `https://www.ligapokemon.com.br/?view=cards%2Fsearch&tipo=1&card=ed%3D${ptcgoCode}`
}

// ptcgoCodes conhecidos da API para as colecoes SV
const KNOWN_PTCGO_CODES = ['ASCTR', 'PAL', 'OBF', 'MEW', 'PAR', 'PAF', 'TEF', 'TWM', 'SFA', 'SSP', 'PRE', 'JTG', 'ASC']

describe('Preservation: URLs geradas a partir do ptcgoCode', () => {
  it('para qualquer ptcgoCode, URL comeca com ligapokemon.com.br', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KNOWN_PTCGO_CODES), (code) => {
        const url = buildLigaUrlFromCode(code)
        return url.startsWith('https://www.ligapokemon.com.br/')
      })
    )
  })

  it('para qualquer ptcgoCode, URL contem ed%3D seguido do codigo', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KNOWN_PTCGO_CODES), (code) => {
        const url = buildLigaUrlFromCode(code)
        return url.includes(`ed%3D${code}`)
      })
    )
  })

  it('me2pt5 (ASC) gera URL correta', () => {
    expect(buildLigaUrlFromCode('ASC')).toBe(
      'https://www.ligapokemon.com.br/?view=cards%2Fsearch&tipo=1&card=ed%3DASC'
    )
  })

  it('sv9 (JTG) gera URL correta', () => {
    expect(buildLigaUrlFromCode('JTG')).toBe(
      'https://www.ligapokemon.com.br/?view=cards%2Fsearch&tipo=1&card=ed%3DJTG'
    )
  })

  it('variantes pt5 com seus ptcgoCodes corretos', () => {
    expect(buildLigaUrlFromCode('MEW')).toContain('ed%3DMEW')   // sv3pt5
    expect(buildLigaUrlFromCode('PAF')).toContain('ed%3DPAF')   // sv4pt5
    expect(buildLigaUrlFromCode('PRE')).toContain('ed%3DPRE')   // sv8pt5
  })
})
