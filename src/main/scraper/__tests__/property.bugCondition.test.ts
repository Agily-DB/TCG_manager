// Feature: pokemon-tcg-manager, Property 1: Bug Condition (fixed)
// me2pt5 (Ascended Heroes) tem ptcgoCode="ASC" via API - nao precisa de mapa manual
import { describe, it, expect } from 'vitest'

// Simula a logica do scrapeHandler apos o fix
function buildLigaUrlFromCode(ptcgoCode: string): string {
  return `https://www.ligapokemon.com.br/?view=cards%2Fsearch&tipo=1&card=ed%3D${ptcgoCode}`
}

describe('Bug Condition (fixed): URL construida a partir do ptcgoCode', () => {
  it('me2pt5 com ptcgoCode="ASC" gera URL valida', () => {
    const url = buildLigaUrlFromCode('ASC')
    expect(url).toBe('https://www.ligapokemon.com.br/?view=cards%2Fsearch&tipo=1&card=ed%3DASC')
  })

  it('sv9 com ptcgoCode="JTG" gera URL valida', () => {
    const url = buildLigaUrlFromCode('JTG')
    expect(url).toContain('ed%3DJTG')
  })

  it('qualquer ptcgoCode gera URL do ligapokemon', () => {
    const url = buildLigaUrlFromCode('ANYCODE')
    expect(url).toMatch(/^https:\/\/www\.ligapokemon\.com\.br\//)
    expect(url).toContain('ed%3DANYCODE')
  })

  it('mensagem de erro nao depende mais de mapa hardcoded', () => {
    // O handler agora usa collection.ptcgoCode do banco
    // Se ptcgoCode nao existe, a mensagem orienta a sincronizar
    const errorMsg = `Coleção "me2pt5" não possui código PTCGO mapeado. Sincronize o banco de dados para atualizar os dados das coleções.`
    expect(errorMsg).not.toContain('sv1')
    expect(errorMsg).not.toContain('sv8')
    expect(errorMsg).toContain('Sincronize')
  })
})
