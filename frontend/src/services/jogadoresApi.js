import axios from 'axios'

export function listarJogadores() {
  return axios.get('/api/jogadores')
}

export function atualizarNotas(id, notas) {
  return axios.put(`/api/jogadores/${id}`, notas)
}