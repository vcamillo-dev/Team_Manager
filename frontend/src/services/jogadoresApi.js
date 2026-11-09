import axios from 'axios'

export function listarJogadores() {
  // Busca a lista que aparece na Administração e no dashboard.
  return axios.get('/api/jogadores')
}

export function atualizarNotas(id, notas) {
  // Salva o nome e as notas de um jogador pelo id.
  return axios.put(`/api/jogadores/${id}`, notas)
}

export function listarHistoricoNotas() {
  // Busca as notas antigas para calcular a evolução.
  return axios.get('/api/historico-notas')
}
