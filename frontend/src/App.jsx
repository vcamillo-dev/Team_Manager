import { useEffect, useState  } from "react";
import axios from "axios";

function App() {
  const [jogadores, setJogadores ] = useState([])
  const [erro, setErro] = useState('');

  useEffect(() => {
    axios.get("/api/jogadores")
    .then((resposta) => setJogadores(resposta.data))
    .catch(() => setErro("Não foi possivel carregar os jogadores."))
  }, [])

  return (
    <main>
      <h1>Diretoria</h1>

      {erro && <p> {erro} </p>}
       <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Nota de Marcelinho</th>
            <th>Nota de Camillo</th>
            <th>NOta do Convidado</th>
            <th>Média</th>
            <th>Goleiro</th>
          </tr>
        </thead>

        <tbody>
          {jogadores.map((jogador) => (
            <tr key={jogador.id}>
              <td>{jogador.nome}</td>
              <td>{jogador.notaMarcelinho}</td>
              <td>{jogador.notaCamilinho}</td>
              <td>{jogador.notaConvidado}</td>
              <td>{jogador.mediaTotal}</td>
              <td>{jogador.isGoleiro ? 'Sim' : 'Não'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}

export default App;